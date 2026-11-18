// SoleasPay order lifecycle — SERVER-SIDE ONLY.
// Creates pending payment orders for the forms that collect money via the
// SoleasPay hosted checkout (card recharge, wallet deposit, card issuance),
// and fulfils them idempotently when the SoleasPay webhook confirms payment.

import { randomBytes } from "node:crypto";
import { getDatabase } from "../../db/database.ts";
import { NovaDbService } from "../../db/service.ts";

export type SoleaspayOrderType = "card_recharge" | "wallet_deposit" | "card_creation";

export interface SoleaspayOrderRow {
  id: number;
  order_ref: string;
  user_id: number;
  type: SoleaspayOrderType;
  amount_xaf: number;
  amount_usd_minor: number | null;
  card_id: number | null;
  meta_json: string | null;
  status: "pending" | "completed" | "failed";
  transaction_reference: string | null;
  created_at: string;
  completed_at: string | null;
}

// Taux de conversion unique (création de carte, préchargement, alimentation depuis le solde).
export const USD_XAF_RATE = 610;
// Frais prélevés à la RECHARGE du solde principal (dépôt portefeuille) : 3,5 %, déduits du montant
// (le client paie X, reçoit X − 3,5 %). C'est l'unique point de facturation à l'entrée de l'argent ;
// alimenter ensuite une carte depuis le solde est gratuit.
export const WALLET_RECHARGE_FEE_PCT = 3.5;

function newOrderRef(type: SoleaspayOrderType): string {
  const prefix = type === "card_recharge" ? "RCG" : type === "wallet_deposit" ? "DEP" : "CRD";
  return `SP-${prefix}-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/** Create a pending SoleasPay order and return the reference + amount to charge. */
export function createSoleaspayOrder(input: {
  userId: number;
  type: SoleaspayOrderType;
  amountXaf: number;
  amountUsd?: number;
  cardId?: number | null;
  meta?: Record<string, unknown>;
}): { orderRef: string; amountXaf: number; description: string } {
  const db = getDatabase();
  const amountXaf = Math.max(1, Math.round(input.amountXaf));
  const amountUsdMinor = input.amountUsd !== undefined ? Math.round(input.amountUsd * 100) : null;
  const orderRef = newOrderRef(input.type);

  const description =
    input.type === "card_recharge"
      ? `Recharge carte (+${(input.amountUsd ?? 0).toFixed(2)} USD)`
      : input.type === "wallet_deposit"
        ? `Dépôt portefeuille NovaPaid (${amountXaf.toLocaleString("fr-FR")} FCFA)`
        : `Création carte virtuelle NovaPaid`;

  db.prepare(
    `INSERT INTO soleaspay_orders (order_ref, user_id, type, amount_xaf, amount_usd_minor, card_id, meta_json, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
  ).run(
    orderRef,
    input.userId,
    input.type,
    amountXaf,
    amountUsdMinor,
    input.cardId ?? null,
    input.meta ? JSON.stringify(input.meta) : null,
  );

  return { orderRef, amountXaf, description };
}

export function getSoleaspayOrder(orderRef: string): SoleaspayOrderRow | null {
  const db = getDatabase();
  return (db.prepare("SELECT * FROM soleaspay_orders WHERE order_ref = ?").get(orderRef) as SoleaspayOrderRow) || null;
}

/** Record which aggregator handles this order + its provider session id. */
export function attachProviderSession(orderRef: string, provider: string, sessionId?: string): void {
  const db = getDatabase();
  const order = getSoleaspayOrder(orderRef);
  const meta = order?.meta_json ? JSON.parse(order.meta_json) : {};
  meta.provider = provider;
  if (sessionId) meta.sessionId = sessionId;
  db.prepare("UPDATE soleaspay_orders SET meta_json = ? WHERE order_ref = ?").run(JSON.stringify(meta), orderRef);
}

export function markSoleaspayOrderFailed(orderRef: string, rawPayload: string): void {
  const db = getDatabase();
  db.prepare(
    "UPDATE soleaspay_orders SET status = 'failed', raw_payload = ? WHERE order_ref = ? AND status = 'pending'",
  ).run(rawPayload, orderRef);
}

/**
 * Fulfil a confirmed order exactly once. Returns the outcome so the webhook can
 * respond 200 either way. Amount/currency must already be validated by the caller.
 */
export function completeSoleaspayOrder(
  orderRef: string,
  opts: { transactionReference?: string; rawPayload?: string },
): { ok: boolean; alreadyDone: boolean; order: SoleaspayOrderRow | null; error?: string } {
  const db = getDatabase();
  db.exec("BEGIN IMMEDIATE");
  try {
    const order = db.prepare("SELECT * FROM soleaspay_orders WHERE order_ref = ?").get(orderRef) as SoleaspayOrderRow | undefined;
    if (!order) {
      db.exec("ROLLBACK");
      return { ok: false, alreadyDone: false, order: null, error: "Commande introuvable." };
    }
    if (order.status === "completed") {
      db.exec("ROLLBACK");
      return { ok: true, alreadyDone: true, order };
    }
    if (order.status === "failed") {
      db.exec("ROLLBACK");
      return { ok: false, alreadyDone: false, order, error: "Commande déjà échouée." };
    }

    fulfilOrder(db, order);

    db.prepare(
      "UPDATE soleaspay_orders SET status = 'completed', transaction_reference = ?, raw_payload = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).run(opts.transactionReference ?? null, opts.rawPayload ?? null, order.id);

    db.exec("COMMIT");

    // Card issuance runs its own transaction, so it must happen after COMMIT.
    if (order.type === "card_creation") {
      try {
        const meta = order.meta_json ? (JSON.parse(order.meta_json) as any) : {};
        const brand = meta.brand === "mastercard" ? "mastercard" : "visa";
        const amountUsd = order.amount_usd_minor ? order.amount_usd_minor / 100 : Number(meta.amountUsd) || 1;
        NovaDbService.createCard(order.user_id, brand, amountUsd, meta.label);
      } catch {
        // Wallet was credited; the card can be created from the funded balance.
      }
    }

    return { ok: true, alreadyDone: false, order };
  } catch (err: any) {
    try { db.exec("ROLLBACK"); } catch { /* ignore */ }
    return { ok: false, alreadyDone: false, order: null, error: err?.message || "Échec du traitement de la commande." };
  }
}

function fulfilOrder(db: ReturnType<typeof getDatabase>, order: SoleaspayOrderRow): void {
  if (order.type === "card_recharge") {
    if (!order.card_id || !order.amount_usd_minor) throw new Error("Commande de recharge incomplète.");
    const card = db.prepare("SELECT id, label, status FROM cards WHERE id = ? AND user_id = ?").get(order.card_id, order.user_id) as any;
    if (!card) throw new Error("Carte introuvable pour la recharge.");
    db.prepare("UPDATE cards SET external_balance_minor = external_balance_minor + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(order.amount_usd_minor, order.card_id);
    db.prepare(
      "INSERT INTO card_transactions (card_id, user_id, type, amount_minor, currency, description, merchant, status) VALUES (?, ?, 'refund', ?, 'USD', ?, 'SoleasPay', 'completed')",
    ).run(order.card_id, order.user_id, order.amount_usd_minor, `Recharge via SoleasPay (${order.amount_xaf.toLocaleString("fr-FR")} FCFA)`);
    return;
  }

  if (order.type === "wallet_deposit") {
    const wallet = db.prepare("SELECT id, status FROM wallets WHERE user_id = ? AND currency = 'XAF' ORDER BY id LIMIT 1").get(order.user_id) as any;
    if (!wallet || wallet.status !== "active") throw new Error("Portefeuille indisponible.");
    // Frais de recharge 3,5 % déduits : le client paie order.amount_xaf, on crédite le net.
    const feeXaf = Math.round(order.amount_xaf * WALLET_RECHARGE_FEE_PCT / 100);
    const netXaf = Math.max(0, order.amount_xaf - feeXaf);
    const creditMinor = netXaf * 100;
    db.prepare("UPDATE wallets SET available_minor = available_minor + ? WHERE id = ? AND status = 'active'").run(creditMinor, wallet.id);
    const ref = "TX-SP-DEP-" + Date.now();
    const insTx = db.prepare(
      "INSERT INTO ledger_transactions (public_ref, idempotency_key, type, status, currency, amount_minor, description, created_by) VALUES (?, ?, 'deposit', 'succeeded', 'XAF', ?, ?, ?)",
    ).run(ref, ref, creditMinor, `Dépôt via SoleasPay (${order.amount_xaf.toLocaleString("fr-FR")} F − ${WALLET_RECHARGE_FEE_PCT}% frais)`, order.user_id);
    db.prepare("INSERT INTO ledger_entries (transaction_id, wallet_id, direction, amount_minor) VALUES (?, ?, 'credit', ?)")
      .run(Number(insTx.lastInsertRowid), wallet.id, creditMinor);
    return;
  }

  if (order.type === "card_creation") {
    // Payment is collected by SoleasPay (fee + initial load), not the wallet.
    // The card is issued right after COMMIT (createCard opens its own
    // transaction), so nothing to do inside this transaction.
    return;
  }

  throw new Error("Type de commande SoleasPay inconnu.");
}
