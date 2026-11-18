import { getDatabase } from "./database.ts";
import { getIntegrationConfigForAdmin, getPublicConfig as readPublicConfig } from "../config/runtime-config.ts";
import { INTEGRATION_CONFIG, CONFIG_PREFIX } from "../config/config-registry.ts";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const USER_SESSION_HOURS = 24 * 30;
const ADMIN_SESSION_HOURS = 8;

function makeSessionToken() {
  return randomBytes(32).toString("base64url");
}

function digestToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizePhone(phone: string) {
  return phone.trim().replace(/[\s().-]/g, "");
}

function sqlDateAfterHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
}

function hashSecret(secret: string) {
  const salt = randomBytes(16);
  const derived = scryptSync(secret, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

function verifySecret(secret: string, stored: string) {
  if (!stored.startsWith("scrypt$")) return stored === secret;
  const [, saltHex, hashHex] = stored.split("$");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(secret, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function verifyLegacyPassword(password: string, stored: string) {
  if (!stored.startsWith("hash_")) return false;
  const encoded = stored.slice("hash_".length);
  if (!encoded || ["sandbox_user", "admin", "admin_master", "compliance", "operator"].includes(encoded)) return false;
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    return decoded === password && Buffer.from(decoded, "utf8").toString("base64") === encoded;
  } catch {
    return false;
  }
}

function writeAdminAudit(db: ReturnType<typeof getDatabase>, adminId: number | null, role: string, action: string, target: string | null, reason: string | null) {
  const currentRole = adminId === null
    ? null
    : (db.prepare("SELECT role FROM admins WHERE id = ?").get(adminId) as any)?.role;
  db.prepare(`
    INSERT INTO admin_audit_logs (admin_id, role, action, target, reason, request_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(adminId, currentRole || role, action, target, reason, randomBytes(16).toString("hex"));
}

function createUserNotification(
  db: ReturnType<typeof getDatabase>,
  userId: number,
  type: "info" | "success" | "warning" | "security",
  title: string,
  message: string,
  actionUrl: string | null = null
) {
  db.prepare(`
    INSERT INTO notifications (user_id, type, title, message, action_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, type, title.slice(0, 120), message.slice(0, 500), actionUrl);
}

function withImmediateTransaction<T>(db: ReturnType<typeof getDatabase>, work: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch {}
    throw error;
  }
}

function shopSlug(value: string) {
  return value.trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}

function cleanShopOffers(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) {
    throw new Error("Ajoutez entre 1 et 50 offres à cet élément.");
  }
  return value.map((offer: any, index) => {
    const name = String(offer?.name || "").trim().replace(/\s+/g, " ").slice(0, 100);
    const priceXaf = Number(offer?.priceXaf);
    const quantity = offer?.quantity === undefined || offer?.quantity === null || offer?.quantity === "" ? undefined : Number(offer.quantity);
    const bonus = String(offer?.bonus || "").trim().slice(0, 80);
    if (!name || !Number.isSafeInteger(priceXaf) || priceXaf < 1 || priceXaf > 100_000_000) {
      throw new Error(`Offre ${index + 1} : nom et prix entier en FCFA requis.`);
    }
    if (quantity !== undefined && (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100_000_000)) {
      throw new Error(`Offre ${index + 1} : quantité invalide.`);
    }
    const id = shopSlug(String(offer?.id || name)) || `offre-${index + 1}`;
    return { id, name, priceXaf, ...(quantity === undefined ? {} : { quantity }), ...(bonus ? { bonus } : {}) };
  });
}

const FUNDING_PROVIDER_LABELS: Record<string, string> = {
  orange: "Orange Money",
  mtn: "MTN Mobile Money",
  wave: "Wave Mobile",
  card: "Carte bancaire",
  bank: "Virement bancaire (CEMAC)",
};

// Pay-in and pay-out (deposit & withdrawal) both charge 1% for every aggregator.
const DEFAULT_FUNDING_FEES: Record<string, number> = {
  orange: 1,
  mtn: 1,
  wave: 1,
  card: 1,
  bank: 1,
};

function validateFinancialRequestKey(value: string) {
  const key = value.trim().slice(0, 100);
  if (!/^[\w.:-]{12,100}$/.test(key)) throw new Error("Clé de requête invalide.");
  return key;
}

function fundingFeePercent(db: ReturnType<typeof getDatabase>, providerId: string) {
  const row = db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'mobile_money_fee_percent'").get() as any;
  let configured: any = {};
  try { configured = JSON.parse(row?.setting_value || "{}"); } catch {}
  const value = Number(configured?.[providerId] ?? DEFAULT_FUNDING_FEES[providerId]);
  return Number.isFinite(value) && value >= 0 && value <= 10 ? value : DEFAULT_FUNDING_FEES[providerId];
}

function createApprovalRequest(db: ReturnType<typeof getDatabase>, userId: number, actionType: string, targetRef: string, reason: string) {
  const requestRef = `APR-${Date.now()}-${randomBytes(6).toString("hex").toUpperCase()}`;
  db.prepare(`
    INSERT INTO admin_approvals (request_ref, requested_by, action_type, target_ref, reason)
    VALUES (?, ?, ?, ?, ?)
  `).run(requestRef, userId, actionType, targetRef, reason.slice(0, 1000));
  return requestRef;
}

function shopRowToProduct(row: any) {
  let offers: any[] = [];
  try {
    const parsed = JSON.parse(String(row.offers_json || "[]"));
    if (Array.isArray(parsed)) offers = parsed;
  } catch {}
  return {
    id: Number(row.id),
    sectionId: Number(row.section_id),
    slug: String(row.slug),
    name: String(row.name),
    subtitle: String(row.subtitle || ""),
    description: String(row.description || ""),
    imageUrl: String(row.image_url || ""),
    badge: String(row.badge || ""),
    customerLabel: String(row.customer_label || "Identifiant du compte"),
    requiresPassword: Boolean(row.requires_password),
    sortOrder: Number(row.sort_order) || 0,
    isActive: Boolean(row.is_active),
    offers,
  };
}

function shopCatalog(db: ReturnType<typeof getDatabase>, includeInactive: boolean) {
  const sections = db.prepare(`
    SELECT id, slug, name, description, icon, sort_order, is_active
    FROM shop_sections ${includeInactive ? "" : "WHERE is_active = 1"}
    ORDER BY sort_order, id
  `).all() as any[];
  const products = db.prepare(`
    SELECT id, section_id, slug, name, subtitle, description, image_url, badge,
           customer_label, requires_password, offers_json, sort_order, is_active
    FROM shop_products ${includeInactive ? "" : "WHERE is_active = 1"}
    ORDER BY sort_order, id
  `).all() as any[];
  return sections.map((section) => ({
    id: Number(section.id),
    slug: String(section.slug),
    name: String(section.name),
    description: String(section.description || ""),
    icon: String(section.icon || "shopping-bag"),
    sortOrder: Number(section.sort_order) || 0,
    isActive: Boolean(section.is_active),
    products: products.filter((product) => Number(product.section_id) === Number(section.id)).map(shopRowToProduct),
  }));
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  kycStatus: string;
  hasPin?: boolean;
}

export interface WalletData {
  id: number;
  accountKey: string;
  currency: string;
  availableMinor: number;
  reservedMinor: number;
  reservedXaf: number;
  balanceXaf: number;
  status: string;
}

export interface CardData {
  id: number;
  label: string;
  maskedPan: string;
  cardType: string;
  status: string;
  balanceUsd: number;
  brand: "visa" | "mastercard";
}

export interface BeneficiaryData {
  id: number;
  recipientUserId: number | null;
  name: string;
  handle: string;
  phone: string;
  email: string;
  avatarColor: string;
  initials: string;
  isVerified: boolean;
  isFavorite: boolean;
}

export interface TransactionData {
  id: number;
  publicRef: string;
  type: string;
  status: string;
  amountMinor: number;
  amountFormatted: string;
  direction: "credit" | "debit";
  description: string;
  createdAt: string;
}

export const NovaDbService = {
  // Internet (Geny) codes purchased by a user.
  saveInternetCode(userId: number, data: { orderRef: string; code: string; planName?: string; amountXaf?: number; phone?: string; operator?: string }) {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO internet_codes (user_id, order_ref, code, plan_name, amount_xaf, phone, operator)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(order_ref) DO UPDATE SET code = excluded.code
    `).run(
      userId,
      String(data.orderRef).slice(0, 64),
      String(data.code).slice(0, 120),
      String(data.planName || "").slice(0, 100),
      Number.isFinite(data.amountXaf) ? Math.round(Number(data.amountXaf)) : 0,
      String(data.phone || "").slice(0, 20),
      String(data.operator || "").slice(0, 16),
    );
  },

  getInternetCodes(userId: number) {
    const rows = getDatabase().prepare(`
      SELECT order_ref, code, plan_name, amount_xaf, phone, operator, created_at
      FROM internet_codes WHERE user_id = ? ORDER BY id DESC LIMIT 200
    `).all(userId) as any[];
    return rows.map((row) => ({
      orderRef: String(row.order_ref),
      code: String(row.code),
      planName: String(row.plan_name || ""),
      amountXaf: Number(row.amount_xaf) || 0,
      phone: String(row.phone || ""),
      operator: String(row.operator || ""),
      createdAt: String(row.created_at || ""),
    }));
  },

  // ---- Geny internet orders (full lifecycle, recorded server-side) ----

  // Record an internet order at creation, attributed to the buyer. Upsert by
  // order_ref so re-sends don't duplicate; never overwrites a delivered code.
  recordGenyOrderCreated(data: {
    orderRef: string; userId?: number | null; userName?: string; userEmail?: string;
    planId?: string; planName?: string; amountXaf?: number; wholesaleXaf?: number; marginXaf?: number;
    phone?: string; operator?: string; status?: string; livemode?: boolean;
  }) {
    const db = getDatabase();
    const amountXaf = Number.isFinite(data.amountXaf) ? Math.round(Number(data.amountXaf)) : 0;
    const wholesaleXaf = Number.isFinite(data.wholesaleXaf) ? Math.round(Number(data.wholesaleXaf)) : 0;
    // La marge (bénéfice NovaPaid) = prix client − prix revendeur (gros).
    const marginXaf = Number.isFinite(data.marginXaf)
      ? Math.round(Number(data.marginXaf))
      : Math.max(0, amountXaf - wholesaleXaf);
    db.prepare(`
      INSERT INTO geny_orders (order_ref, user_id, user_name, user_email, plan_id, plan_name, amount_xaf, wholesale_xaf, margin_xaf, phone, operator, status, livemode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(order_ref) DO UPDATE SET
        user_id = COALESCE(excluded.user_id, geny_orders.user_id),
        user_name = CASE WHEN excluded.user_name <> '' THEN excluded.user_name ELSE geny_orders.user_name END,
        user_email = CASE WHEN excluded.user_email <> '' THEN excluded.user_email ELSE geny_orders.user_email END,
        plan_id = excluded.plan_id, plan_name = excluded.plan_name, amount_xaf = excluded.amount_xaf,
        wholesale_xaf = excluded.wholesale_xaf, margin_xaf = excluded.margin_xaf,
        phone = excluded.phone, operator = excluded.operator, livemode = excluded.livemode,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      String(data.orderRef).slice(0, 64),
      data.userId ?? null,
      String(data.userName || "").slice(0, 120),
      String(data.userEmail || "").slice(0, 254),
      String(data.planId || "").slice(0, 64),
      String(data.planName || "").slice(0, 100),
      amountXaf,
      wholesaleXaf,
      marginXaf,
      String(data.phone || "").slice(0, 20),
      String(data.operator || "").slice(0, 16),
      String(data.status || "pending").slice(0, 24),
      data.livemode ? 1 : 0,
    );
  },

  // Update an order's status (and delivered code) as the Geny flow progresses.
  updateGenyOrderStatus(orderRef: string, data: { status?: string; code?: string; livemode?: boolean }) {
    const db = getDatabase();
    const row = db.prepare("SELECT id FROM geny_orders WHERE order_ref = ?").get(String(orderRef).slice(0, 64)) as any;
    if (!row) return;
    db.prepare(`
      UPDATE geny_orders SET
        status = COALESCE(?, status),
        code = CASE WHEN ? <> '' THEN ? ELSE code END,
        livemode = COALESCE(?, livemode),
        updated_at = CURRENT_TIMESTAMP
      WHERE order_ref = ?
    `).run(
      data.status ? String(data.status).slice(0, 24) : null,
      String(data.code || ""), String(data.code || "").slice(0, 120),
      data.livemode === undefined ? null : (data.livemode ? 1 : 0),
      String(orderRef).slice(0, 64),
    );
  },

  // Real admin analytics for internet (Geny) sales: summary stats, recent orders
  // (with buyer names) and daily revenue for the last `days` days.
  getGenyAnalytics(days = 30) {
    const db = getDatabase();
    const s = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) AS succeeded,
        SUM(CASE WHEN status IN ('failed','expired') THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN status NOT IN ('succeeded','failed','expired') THEN 1 ELSE 0 END) AS pending,
        COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount_xaf ELSE 0 END), 0) AS revenue,
        COALESCE(SUM(CASE WHEN status = 'succeeded' THEN margin_xaf ELSE 0 END), 0) AS profit
      FROM geny_orders
    `).get() as any;
    const today = db.prepare("SELECT COALESCE(SUM(amount_xaf),0) AS r, COALESCE(SUM(margin_xaf),0) AS p FROM geny_orders WHERE status='succeeded' AND date(created_at)=date('now')").get() as any;
    const month = db.prepare("SELECT COALESCE(SUM(amount_xaf),0) AS r, COALESCE(SUM(margin_xaf),0) AS p FROM geny_orders WHERE status='succeeded' AND created_at >= datetime('now','-30 days')").get() as any;
    const orders = db.prepare(`
      SELECT order_ref, user_name, user_email, plan_name, amount_xaf, margin_xaf, phone, operator, status, code, livemode, created_at
      FROM geny_orders ORDER BY id DESC LIMIT 100
    `).all() as any[];
    const daily = db.prepare(`
      SELECT date(created_at) AS day, COALESCE(SUM(CASE WHEN status='succeeded' THEN amount_xaf ELSE 0 END),0) AS amount
      FROM geny_orders WHERE created_at >= datetime('now', ?) GROUP BY day ORDER BY day ASC
    `).all(`-${Math.max(1, Math.min(365, days))} days`) as any[];
    return {
      stats: {
        total: Number(s?.total) || 0,
        succeeded: Number(s?.succeeded) || 0,
        failed: Number(s?.failed) || 0,
        pending: Number(s?.pending) || 0,
        revenue: Number(s?.revenue) || 0,
        revenueToday: Number(today?.r) || 0,
        revenueMonth: Number(month?.r) || 0,
        profit: Number(s?.profit) || 0,
        profitToday: Number(today?.p) || 0,
        profitMonth: Number(month?.p) || 0,
      },
      orders: orders.map((r) => ({
        orderRef: String(r.order_ref), userName: String(r.user_name || ""), userEmail: String(r.user_email || ""),
        planName: String(r.plan_name || ""), amountXaf: Number(r.amount_xaf) || 0, marginXaf: Number(r.margin_xaf) || 0,
        phone: String(r.phone || ""),
        operator: String(r.operator || ""), status: String(r.status || ""), code: String(r.code || ""),
        livemode: Boolean(r.livemode), createdAt: String(r.created_at || ""),
      })),
      dailyRevenue: daily.map((r) => ({ date: String(r.day), amount: Number(r.amount) || 0 })),
    };
  },

  assertWalletActive(userId: number) {
    const wallet = getDatabase().prepare("SELECT status FROM wallets WHERE user_id = ? AND currency = 'XAF' ORDER BY id LIMIT 1").get(userId) as any;
    if (!wallet) throw new Error("Portefeuille introuvable.");
    if (wallet.status !== "active") throw new Error("Votre portefeuille est gelé. Contactez le support.");
  },

  getProfile(userId: number): UserProfile {
    const db = getDatabase();
    const row = db.prepare("SELECT id, name, email, phone, role, status, kyc_status, pin_hash FROM users WHERE id = ?").get(userId) as any;
    if (!row) {
      throw new Error("Utilisateur introuvable");
    }
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      status: row.status,
      kycStatus: row.kyc_status,
      hasPin: Boolean(row.pin_hash),
    };
  },

  getUserNotifications(userId: number) {
    const rows = getDatabase().prepare(`
      SELECT id, type, title, message, is_read, action_url, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY is_read ASC, id DESC
      LIMIT 50
    `).all(userId) as any[];

    return rows.map((row) => ({
      id: Number(row.id),
      type: String(row.type || "info"),
      title: String(row.title),
      message: String(row.message),
      isRead: Boolean(row.is_read),
      actionUrl: row.action_url ? String(row.action_url) : null,
      createdAt: String(row.created_at),
    }));
  },

  markUserNotificationsRead(userId: number, notificationId?: number) {
    const db = getDatabase();
    if (notificationId !== undefined) {
      if (!Number.isSafeInteger(notificationId) || notificationId < 1) throw new Error("Notification invalide.");
      db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?").run(notificationId, userId);
    } else {
      db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0").run(userId);
    }
    return { success: true };
  },

  getWallet(userId: number): WalletData {
    const db = getDatabase();
    const row = db.prepare("SELECT id, account_key, currency, available_minor, reserved_minor, status FROM wallets WHERE user_id = ? AND currency = 'XAF' ORDER BY id LIMIT 1").get(userId) as any;
    if (!row) {
      throw new Error("Portefeuille introuvable");
    }
    return {
      id: row.id,
      accountKey: row.account_key,
      currency: row.currency,
      availableMinor: Number(row.available_minor),
      reservedMinor: Number(row.reserved_minor || 0),
      reservedXaf: Math.round(Number(row.reserved_minor || 0) / 100),
      balanceXaf: Math.round(Number(row.available_minor) / 100),
      status: row.status,
    };
  },

  getCards(userId: number): CardData[] {
    const db = getDatabase();
    const rows = db.prepare("SELECT id, label, masked_pan, card_type, network, status, external_balance_minor FROM cards WHERE user_id = ? ORDER BY id DESC").all(userId) as any[];
    return rows.map((r) => {
      const isVisa = r.network === "visa" || r.masked_pan.startsWith("4") || r.label.toLowerCase().includes("visa");
      return {
        id: r.id,
        label: r.label,
        maskedPan: r.masked_pan,
        cardType: r.card_type,
        status: r.status,
        balanceUsd: Number(r.external_balance_minor) / 100,
        brand: isVisa ? "visa" : "mastercard",
      };
    });
  },

  // Vérifie qu'un destinataire existe : l'email/téléphone doit correspondre à un
  // compte NovaPaid actif qui possède une carte active se terminant par `last4`.
  verifyCardRecipient(contact: string, last4: string): { ok: boolean; recipientUserId?: number; error?: string } {
    const db = getDatabase();
    const raw = String(contact || "").trim();
    const digits = String(last4 || "").replace(/\D/g, "");
    if (!raw) return { ok: false, error: "Renseignez l'email ou le téléphone du destinataire." };
    if (!/^[0-9]{4}$/.test(digits)) return { ok: false, error: "Les 4 derniers chiffres de la carte sont invalides." };

    const email = raw.toLowerCase();
    const phone = normalizePhone(raw);
    const user = db.prepare(
      `SELECT id FROM users WHERE status = 'active' AND (lower(email) = ? OR (? <> '' AND replace(replace(replace(replace(replace(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '.', '') = ?)) LIMIT 1`
    ).get(email, phone, phone) as any;
    if (!user) return { ok: false, error: "Aucun compte NovaPaid ne correspond à ce contact." };

    const card = db.prepare(
      `SELECT id FROM cards WHERE user_id = ? AND status = 'active' AND replace(masked_pan, ' ', '') LIKE ? LIMIT 1`
    ).get(user.id, `%${digits}`) as any;
    if (!card) return { ok: false, error: "Les 4 derniers chiffres ne correspondent à aucune carte de ce destinataire." };

    return { ok: true, recipientUserId: Number(user.id) };
  },

  getCardProviderInfo(userId: number, cardId: number): { provider: string; providerCardRef: string | null; status: string } | null {
    const db = getDatabase();
    const row = db.prepare("SELECT provider, provider_card_ref, status FROM cards WHERE id = ? AND user_id = ?").get(cardId, userId) as any;
    if (!row) return null;
    return {
      provider: String(row.provider || "sandbox"),
      providerCardRef: row.provider_card_ref || null,
      status: String(row.status),
    };
  },

  getCardTransactions(userId: number, cardId: number) {
    const db = getDatabase();
    const card = db.prepare("SELECT id FROM cards WHERE id = ? AND user_id = ?").get(cardId, userId) as any;
    if (!card) throw new Error("Carte introuvable ou acces refusee.");
    const rows = db.prepare(
      "SELECT id, type, amount_minor, currency, description, merchant, status, external_ref, created_at FROM card_transactions WHERE card_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 50"
    ).all(cardId, userId) as any[];
    return rows.map((r) => ({
      id: r.id,
      type: String(r.type),
      amountUsd: Number(r.amount_minor) / 100,
      currency: String(r.currency),
      description: String(r.description),
      merchant: (r.merchant != null ? String(r.merchant) : null),
      status: String(r.status),
      externalRef: (r.external_ref != null ? String(r.external_ref) : null),
      createdAt: String(r.created_at),
    }));
  },

  createCard(userId: number, brand: "visa" | "mastercard", amountUsd: number, label?: string): CardData {
    const db = getDatabase();
    return withImmediateTransaction(db, () => {
      this.assertWalletActive(userId);
    const activeOrFrozenCount = (db.prepare("SELECT count(*) as c FROM cards WHERE user_id = ? AND status != 'cancelled'").get(userId) as any)?.c || 0;
    if (activeOrFrozenCount >= 3) {
      throw new Error("Vous avez atteint la limite maximale de 3 cartes autorisées sur votre compte.");
    }
    const prefix = brand === "visa" ? "4532" : "5412";
    const randLast4 = Math.floor(1000 + Math.random() * 9000);
    const maskedPan = `${prefix} •••• •••• ${randLast4}`;
    const cardLabel = label || (brand === "visa" ? "Carte Virtuelle Visa" : "Carte Virtuelle Mastercard");
    const amountMinor = Math.round(amountUsd * 100);

    const result = db.prepare(`
      INSERT INTO cards (user_id, provider, label, masked_pan, card_type, network, status, external_balance_minor)
      VALUES (?, ?, ?, ?, 'virtual', ?, 'active', ?)
    `).run(userId, brand === "visa" ? "visa-direct" : "mastercard-pay", cardLabel, maskedPan, brand, amountMinor);

    createUserNotification(
      db,
      userId,
      "success",
      "Carte virtuelle créée",
      `${cardLabel} est maintenant active. Votre carte se termine par ${randLast4}.`,
      "/cards"
    );

    return {
      id: Number(result.lastInsertRowid),
      label: cardLabel,
      maskedPan,
      cardType: "virtual",
      status: "active",
      balanceUsd: amountUsd,
      brand,
    };
    });
  },

  userToggleCardFreeze(userId: number, cardId: number): CardData {
    const db = getDatabase();
    return withImmediateTransaction(db, () => {
      const card = db.prepare("SELECT id, user_id, label, masked_pan, card_type, network, status, external_balance_minor FROM cards WHERE id = ? AND user_id = ?").get(cardId, userId) as any;
    if (!card) throw new Error("Carte introuvable ou non autorisée.");
    if (!["active", "frozen"].includes(card.status)) throw new Error("Cette carte ne peut pas être modifiée.");
    
    const newStatus = card.status === "frozen" ? "active" : "frozen";
    db.prepare("UPDATE cards SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?").run(newStatus, cardId, userId);
    
    createUserNotification(
      db,
      userId,
      newStatus === "frozen" ? "warning" : "success",
      newStatus === "frozen" ? "Carte temporairement gelée" : "Carte réactivée",
      newStatus === "frozen"
        ? card.label + " (" + card.masked_pan.slice(-4) + ") est maintenant gelée. Vos paiements en ligne sont suspendus."
        : card.label + " (" + card.masked_pan.slice(-4) + ") est à nouveau active pour vos paiements en ligne.",
      "/cards"
    );

    const isVisa = card.network === "visa" || card.masked_pan.startsWith("4") || card.label.toLowerCase().includes("visa");
    return {
      id: card.id,
      label: card.label,
      maskedPan: card.masked_pan,
      cardType: card.card_type,
      status: newStatus,
      balanceUsd: Number(card.external_balance_minor) / 100,
      brand: isVisa ? "visa" : "mastercard",
    };
    });
  },

  fundCard(userId: number, cardId: number, amountUsd: number): { success: boolean; card: CardData; newWalletBalanceXaf: number } {
    const db = getDatabase();
    if (!Number.isFinite(amountUsd) || amountUsd < 1 || amountUsd > 1000) {
      throw new Error("Le montant de recharge doit être compris entre 1 et 1 000 USD.");
    }
    return withImmediateTransaction(db, () => {
      this.assertWalletActive(userId);
      const card = db.prepare("SELECT id, user_id, label, masked_pan, card_type, network, status, external_balance_minor FROM cards WHERE id = ? AND user_id = ?").get(cardId, userId) as any;
      if (!card) throw new Error("Carte introuvable ou non autorisée.");
      if (card.status !== "active") throw new Error("Impossible de recharger une carte gelée ou fermée. Réactivez-la d'abord.");

      const wallet = db.prepare("SELECT id, available_minor, status FROM wallets WHERE user_id = ? AND currency = 'XAF' ORDER BY id LIMIT 1").get(userId) as any;
      if (!wallet || wallet.status !== "active") throw new Error("Portefeuille indisponible ou gelé.");

      // Alimenter la carte depuis le solde principal = GRATUIT, au taux normal 610 (pas de frais
      // supplémentaire : les frais ont déjà été prélevés à la recharge du solde principal).
      const rate = 610.0;
      const costXaf = Math.ceil(amountUsd * rate);
      const costMinor = costXaf * 100;
      if (Number(wallet.available_minor) < costMinor) {
        throw new Error("Solde insuffisant dans votre portefeuille. Montant requis : " + costXaf.toLocaleString("fr-FR") + " FCFA.");
      }

      const debit = db.prepare("UPDATE wallets SET available_minor = available_minor - ? WHERE id = ? AND available_minor >= ?").run(costMinor, wallet.id, costMinor);
      if (Number(debit.changes) !== 1) throw new Error("Solde insuffisant.");

      const amountUsdMinor = Math.round(amountUsd * 100);
      db.prepare("UPDATE cards SET external_balance_minor = external_balance_minor + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(amountUsdMinor, cardId);

      const txRef = "TX-CRD-FUND-" + Date.now();
      const desc = "Recharge carte " + card.label + " (+" + amountUsd.toFixed(2) + " USD)";
      const insTx = db.prepare("INSERT INTO ledger_transactions (public_ref, idempotency_key, type, status, currency, amount_minor, description, created_by) VALUES (?, ?, 'card_funding', 'succeeded', 'XAF', ?, ?, ?)").run(txRef, txRef, costMinor, desc, userId);
      db.prepare("INSERT INTO ledger_entries (transaction_id, wallet_id, direction, amount_minor) VALUES (?, ?, 'debit', ?)").run(Number(insTx.lastInsertRowid), wallet.id, costMinor);

      db.prepare("INSERT INTO card_transactions (card_id, user_id, type, amount_minor, currency, description, merchant, status) VALUES (?, ?, 'refund', ?, 'USD', ?, 'Recharge Portefeuille NovaPaid', 'completed')").run(cardId, userId, amountUsdMinor, "Recharge depuis portefeuille (" + costXaf.toLocaleString("fr-FR") + " FCFA)");

      createUserNotification(
        db,
        userId,
        "success",
        "Carte rechargée avec succès",
        "+" + amountUsd.toFixed(2) + " USD ajoutés sur votre " + card.label + " (" + costXaf.toLocaleString("fr-FR") + " FCFA débités).",
        "/cards"
      );

      const updatedBalanceUsd = (Number(card.external_balance_minor) + amountUsdMinor) / 100;
      const isVisa = card.network === "visa" || card.masked_pan.startsWith("4") || card.label.toLowerCase().includes("visa");
      return {
        success: true,
        card: {
          id: card.id,
          label: card.label,
          maskedPan: card.masked_pan,
          cardType: card.card_type,
          status: card.status,
          balanceUsd: updatedBalanceUsd,
          brand: isVisa ? "visa" : "mastercard",
        },
        newWalletBalanceXaf: Math.round((Number(wallet.available_minor) - costMinor) / 100),
      };
    });
  },

  withdrawFromCard(userId: number, cardId: number, amountUsd: number): { success: boolean; card: CardData; newWalletBalanceXaf: number } {
    const db = getDatabase();
    if (!Number.isFinite(amountUsd) || amountUsd < 1 || amountUsd > 1000) {
      throw new Error("Le montant de retrait doit être compris entre 1 et 1 000 USD.");
    }
    return withImmediateTransaction(db, () => {
      this.assertWalletActive(userId);
      const card = db.prepare("SELECT id, user_id, label, masked_pan, card_type, network, status, external_balance_minor FROM cards WHERE id = ? AND user_id = ?").get(cardId, userId) as any;
      if (!card) throw new Error("Carte introuvable ou non autorisée.");
      if (card.status !== "active") throw new Error("Impossible de retirer des fonds d'une carte gelée ou fermée.");

      const amountUsdMinor = Math.round(amountUsd * 100);
      if (Number(card.external_balance_minor) < amountUsdMinor) {
        throw new Error("Solde insuffisant sur la carte. Solde actuel : $" + (Number(card.external_balance_minor) / 100).toFixed(2) + " USD.");
      }

      const wallet = db.prepare("SELECT id, available_minor, status FROM wallets WHERE user_id = ? AND currency = 'XAF' ORDER BY id LIMIT 1").get(userId) as any;
      if (!wallet || wallet.status !== "active") throw new Error("Portefeuille indisponible ou gelé.");

      const rate = 610.0;
      const creditXaf = Math.floor(amountUsd * rate);
      const creditMinor = creditXaf * 100;

      const debitCard = db.prepare("UPDATE cards SET external_balance_minor = external_balance_minor - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND external_balance_minor >= ?").run(amountUsdMinor, cardId, amountUsdMinor);
      if (Number(debitCard.changes) !== 1) throw new Error("Solde carte insuffisant.");

      db.prepare("UPDATE wallets SET available_minor = available_minor + ? WHERE id = ? AND status = 'active'").run(creditMinor, wallet.id);

      const txRef = "TX-CRD-WTH-" + Date.now();
      const desc = "Retrait carte " + card.label + " (-" + amountUsd.toFixed(2) + " USD vers solde principal)";
      const insTx = db.prepare("INSERT INTO ledger_transactions (public_ref, idempotency_key, type, status, currency, amount_minor, description, created_by) VALUES (?, ?, 'card_withdrawal', 'succeeded', 'XAF', ?, ?, ?)").run(txRef, txRef, creditMinor, desc, userId);
      db.prepare("INSERT INTO ledger_entries (transaction_id, wallet_id, direction, amount_minor) VALUES (?, ?, 'credit', ?)").run(Number(insTx.lastInsertRowid), wallet.id, creditMinor);

      db.prepare("INSERT INTO card_transactions (card_id, user_id, type, amount_minor, currency, description, merchant, status) VALUES (?, ?, 'purchase', ?, 'USD', ?, 'Rapatriement vers Portefeuille NovaPaid', 'completed')").run(cardId, userId, amountUsdMinor, "Rapatriement vers solde principal (+" + creditXaf.toLocaleString("fr-FR") + " FCFA)");

      createUserNotification(
        db,
        userId,
        "success",
        "Rapatriement de carte réussi",
        "$" + amountUsd.toFixed(2) + " USD rapatriés vers votre portefeuille (" + creditXaf.toLocaleString("fr-FR") + " FCFA crédités).",
        "/wallet"
      );

      const updatedBalanceUsd = (Number(card.external_balance_minor) - amountUsdMinor) / 100;
      const isVisa = card.network === "visa" || card.masked_pan.startsWith("4") || card.label.toLowerCase().includes("visa");
      return {
        success: true,
        card: {
          id: card.id,
          label: card.label,
          maskedPan: card.masked_pan,
          cardType: card.card_type,
          status: card.status,
          balanceUsd: updatedBalanceUsd,
          brand: isVisa ? "visa" : "mastercard",
        },
        newWalletBalanceXaf: Math.round((Number(wallet.available_minor) + creditMinor) / 100),
      };
    });
  },

  // =====================================================================
  // INTÉGRATION PRESTATAIRE DE CARTES / COMPTES (Maplerad, etc.)
  // =====================================================================

  /** Profil minimal nécessaire à l'enrôlement d'un client chez le prestataire. */
  getUserForProviderEnrollment(userId: number): {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postalCode: string | null;
    kycData: string | null;
  } | null {
    const db = getDatabase();
    const u = db.prepare(
      `SELECT id, name, first_name, last_name, email, phone, date_of_birth,
              address, city, state, country, postal_code, kyc_data
         FROM users WHERE id = ? AND deleted_at IS NULL`
    ).get(userId) as any;
    if (!u) return null;
    const nameParts = String(u.name || "").trim().split(/\s+/);
    return {
      id: u.id,
      firstName: (u.first_name || nameParts[0] || "").trim(),
      lastName: (u.last_name || nameParts.slice(1).join(" ") || "").trim(),
      email: String(u.email || "").trim(),
      phone: String(u.phone || "").trim(),
      dateOfBirth: u.date_of_birth || null,
      address: u.address || null,
      city: u.city || null,
      state: u.state || null,
      country: u.country || null,
      postalCode: u.postal_code || null,
      kycData: u.kyc_data || null,
    };
  },

  /** Identifiant client du prestataire pour un (user, provider, environment). */
  getProviderCustomerId(userId: number, provider: string, environment: string): string | null {
    const db = getDatabase();
    const row = db.prepare(
      "SELECT provider_customer_id FROM card_provider_customers WHERE user_id = ? AND provider = ? AND environment = ?"
    ).get(userId, provider, environment) as any;
    return row?.provider_customer_id || null;
  },

  /** Persiste l'identifiant client du prestataire (upsert idempotent). */
  saveProviderCustomer(
    userId: number,
    provider: string,
    environment: string,
    providerCustomerId: string,
    metadata?: Record<string, unknown>
  ): void {
    const db = getDatabase();
    db.prepare(
      `INSERT INTO card_provider_customers (user_id, provider, provider_customer_id, environment, metadata)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, provider, environment)
       DO UPDATE SET provider_customer_id = excluded.provider_customer_id,
                     metadata = excluded.metadata`
    ).run(userId, provider, providerCustomerId, environment, metadata ? JSON.stringify(metadata) : null);
  },

  /**
   * Débite le portefeuille XAF et insère une carte « en attente » liée à la
   * référence d'émission Maplerad. Les détails (PAN, statut actif) sont complétés
   * plus tard par le webhook issuing.created.successful.
   */
  createPendingMapleradCard(
    userId: number,
    opts: { brand: "visa" | "mastercard"; label: string; amountUsd: number; reference: string; environment: string; mapleradCustomerId: string }
  ): { cardId: number; costXaf: number; newWalletBalanceXaf: number } {
    const db = getDatabase();
    const RATE = 610.0;
    return withImmediateTransaction(db, () => {
      this.assertWalletActive(userId);
      const activeOrFrozenCount = (db.prepare(
        "SELECT count(*) as c FROM cards WHERE user_id = ? AND status NOT IN ('cancelled','rejected')"
      ).get(userId) as any)?.c || 0;
      if (activeOrFrozenCount >= 3) {
        throw new Error("Vous avez atteint la limite maximale de 3 cartes autorisées sur votre compte.");
      }

      const wallet = db.prepare(
        "SELECT id, available_minor, status FROM wallets WHERE user_id = ? AND currency = 'XAF' ORDER BY id LIMIT 1"
      ).get(userId) as any;
      if (!wallet || wallet.status !== "active") throw new Error("Portefeuille indisponible ou gelé.");

      const costXaf = Math.ceil(opts.amountUsd * RATE);
      const costMinor = costXaf * 100;
      if (Number(wallet.available_minor) < costMinor) {
        throw new Error("Solde insuffisant dans votre portefeuille. Montant requis : " + costXaf.toLocaleString("fr-FR") + " FCFA.");
      }

      const debit = db.prepare(
        "UPDATE wallets SET available_minor = available_minor - ? WHERE id = ? AND available_minor >= ?"
      ).run(costMinor, wallet.id, costMinor);
      if (Number(debit.changes) !== 1) throw new Error("Solde insuffisant.");

      const txRef = "TX-CRD-NEW-" + Date.now();
      const desc = "Émission carte " + opts.label + " (" + opts.amountUsd.toFixed(2) + " USD)";
      const insTx = db.prepare(
        "INSERT INTO ledger_transactions (public_ref, idempotency_key, type, status, currency, amount_minor, description, created_by) VALUES (?, ?, 'card_creation', 'succeeded', 'XAF', ?, ?, ?)"
      ).run(txRef, txRef, costMinor, desc, userId);
      db.prepare(
        "INSERT INTO ledger_entries (transaction_id, wallet_id, direction, amount_minor) VALUES (?, ?, 'debit', ?)"
      ).run(Number(insTx.lastInsertRowid), wallet.id, costMinor);

      const amountMinor = Math.round(opts.amountUsd * 100);
      const metadata = JSON.stringify({ debitMinor: costMinor, walletId: wallet.id, reference: opts.reference, mapleradCustomerId: opts.mapleradCustomerId, ledgerTxRef: txRef });
      const result = db.prepare(
        `INSERT INTO cards (user_id, provider, provider_card_ref, label, masked_pan, card_type, network, status, external_balance_minor, maplerad_id, api_environment, metadata)
         VALUES (?, 'maplerad', ?, ?, ?, 'virtual', ?, 'pending', ?, NULL, ?, ?)`
      ).run(userId, opts.reference, opts.label, "•••• •••• •••• ••••", opts.brand, amountMinor, opts.environment, metadata);

      createUserNotification(
        db,
        userId,
        "info",
        "Carte en cours d'émission",
        opts.label + " est en cours de création. Elle sera active dès validation par notre prestataire.",
        "/cards"
      );

      return {
        cardId: Number(result.lastInsertRowid),
        costXaf,
        newWalletBalanceXaf: Math.round((Number(wallet.available_minor) - costMinor) / 100),
      };
    });
  },

  /** Applique un webhook d'émission de carte Maplerad (succès ou échec). */
  applyMapleradCardWebhook(payload: {
    reference?: string;
    event: string;
    card?: { id?: string; name?: string; masked_pan?: string; issuer?: string; status?: string; balance?: number; expiry?: string };
    reason?: string;
  }): { matched: boolean; cardId?: number } {
    const db = getDatabase();
    const ref = payload.reference || payload.card?.id;
    if (!ref) return { matched: false };

    return withImmediateTransaction(db, () => {
      const card = db.prepare(
        "SELECT * FROM cards WHERE provider = 'maplerad' AND (provider_card_ref = ? OR maplerad_id = ?) LIMIT 1"
      ).get(ref, ref) as any;
      if (!card) return { matched: false };

      const success = /successful|success/i.test(payload.event) && payload.card;
      if (success && payload.card) {
        const c = payload.card;
        const network = (c.issuer || card.network || "visa").toLowerCase() === "mastercard" ? "mastercard" : "visa";
        const balanceMinor = Number.isFinite(c.balance) ? Number(c.balance) : card.external_balance_minor;
        db.prepare(
          `UPDATE cards SET maplerad_id = ?, masked_pan = ?, card_holder = ?, network = ?, status = 'active',
                  external_balance_minor = ?, synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).run(
          c.id || card.maplerad_id || null,
          this.formatMaskedPan(c.masked_pan) || card.masked_pan,
          c.name || card.card_holder || null,
          network,
          balanceMinor,
          card.id
        );
        createUserNotification(
          db,
          card.user_id,
          "success",
          "Carte virtuelle activée",
          card.label + " est maintenant active et prête à être utilisée.",
          "/cards"
        );
        return { matched: true, cardId: card.id };
      }

      // Échec : marquer rejetée et rembourser le portefeuille débité.
      if (card.status !== "cancelled" && card.status !== "rejected") {
        let meta: any = {};
        try { meta = card.metadata ? JSON.parse(card.metadata) : {}; } catch { meta = {}; }
        const debitMinor = Number(meta.debitMinor || 0);
        const walletId = Number(meta.walletId || 0);
        if (debitMinor > 0 && walletId > 0) {
          const refunded = db.prepare(
            "UPDATE wallets SET available_minor = available_minor + ? WHERE id = ?"
          ).run(debitMinor, walletId);
          if (Number(refunded.changes) === 1) {
            const txRef = "TX-CRD-REFUND-" + Date.now();
            const insTx = db.prepare(
              "INSERT INTO ledger_transactions (public_ref, idempotency_key, type, status, currency, amount_minor, description, created_by) VALUES (?, ?, 'card_creation_refund', 'succeeded', 'XAF', ?, ?, ?)"
            ).run(txRef, txRef, debitMinor, "Remboursement émission carte échouée: " + card.label, card.user_id);
            db.prepare(
              "INSERT INTO ledger_entries (transaction_id, wallet_id, direction, amount_minor) VALUES (?, ?, 'credit', ?)"
            ).run(Number(insTx.lastInsertRowid), walletId, debitMinor);
          }
        }
        db.prepare(
          "UPDATE cards SET status = 'rejected', freeze_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run((payload.reason || "Émission refusée par le prestataire.").slice(0, 300), card.id);
        createUserNotification(
          db,
          card.user_id,
          "error",
          "Échec de l'émission de la carte",
          "La création de " + card.label + " a échoué" + (payload.reason ? " (" + payload.reason + ")" : "") + ". Le montant débité a été remboursé.",
          "/cards"
        );
      }
      return { matched: true, cardId: card.id };
    });
  },

  formatMaskedPan(pan?: string): string | null {
    if (!pan) return null;
    const digits = pan.replace(/[^0-9*]/g, "");
    if (digits.length < 8) return pan;
    const first = digits.slice(0, 6).replace(/[0-9]/g, (d) => d);
    const last4 = digits.slice(-4);
    return `${first.slice(0, 4)} ${first.slice(4)}•• •••• ${last4}`;
  },

  // ---- Comptes bancaires virtuels (Maplerad) --------------------------

  listBankAccounts(userId: number): Array<{
    id: number; currency: string; accountNumber: string | null; accountName: string | null;
    bankName: string | null; routingNumber: string | null; status: string; createdAt: string;
  }> {
    const db = getDatabase();
    const rows = db.prepare(
      "SELECT id, currency, account_number, account_name, bank_name, routing_number, status, created_at FROM bank_accounts WHERE user_id = ? ORDER BY id DESC"
    ).all(userId) as any[];
    return rows.map((r) => ({
      id: r.id,
      currency: r.currency,
      accountNumber: r.account_number,
      accountName: r.account_name,
      bankName: r.bank_name,
      routingNumber: r.routing_number,
      status: r.status,
      createdAt: r.created_at,
    }));
  },

  insertBankAccount(
    userId: number,
    data: {
      provider?: string; environment: string; currency: string; status: string;
      providerAccountId?: string | null; providerReference?: string | null;
      accountNumber?: string | null; accountName?: string | null; bankName?: string | null;
      routingNumber?: string | null; metadata?: Record<string, unknown>;
    }
  ): number {
    const db = getDatabase();
    const result = db.prepare(
      `INSERT INTO bank_accounts (user_id, provider, environment, provider_account_id, provider_reference, currency, account_number, account_name, bank_name, routing_number, status, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      data.provider || "maplerad",
      data.environment,
      data.providerAccountId || null,
      data.providerReference || null,
      data.currency,
      data.accountNumber || null,
      data.accountName || null,
      data.bankName || null,
      data.routingNumber || null,
      data.status,
      data.metadata ? JSON.stringify(data.metadata) : null
    );
    createUserNotification(
      db,
      userId,
      data.status === "active" || data.status === "open" ? "success" : "info",
      "Compte bancaire virtuel",
      data.status === "active" || data.status === "open"
        ? "Votre compte " + data.currency + " est prêt à recevoir des paiements."
        : "Votre demande de compte " + data.currency + " est en cours de traitement.",
      "/wallet"
    );
    return Number(result.lastInsertRowid);
  },

  applyMapleradAccountWebhook(payload: {
    event: string; id?: string; reference?: string;
    account_number?: string; account_name?: string; bank_name?: string; status?: string; reason?: string;
  }): { matched: boolean } {
    const db = getDatabase();
    const ref = payload.reference || payload.id;
    if (!ref) return { matched: false };
    const acct = db.prepare(
      "SELECT * FROM bank_accounts WHERE provider_reference = ? OR provider_account_id = ? LIMIT 1"
    ).get(ref, ref) as any;
    if (!acct) return { matched: false };

    const success = /successful|success|open/i.test(payload.event);
    if (success) {
      db.prepare(
        `UPDATE bank_accounts SET provider_account_id = COALESCE(?, provider_account_id),
                account_number = COALESCE(?, account_number), account_name = COALESCE(?, account_name),
                bank_name = COALESCE(?, bank_name), status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(payload.id || null, payload.account_number || null, payload.account_name || null, payload.bank_name || null, acct.id);
      createUserNotification(db, acct.user_id, "success", "Compte bancaire virtuel actif", "Votre compte " + acct.currency + " est maintenant actif.", "/wallet");
    } else {
      db.prepare(
        "UPDATE bank_accounts SET status = 'failed', failure_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run((payload.reason || "Création refusée.").slice(0, 300), acct.id);
      createUserNotification(db, acct.user_id, "error", "Échec création du compte", "La création de votre compte " + acct.currency + " a échoué.", "/wallet");
    }
    return { matched: true };
  },

  getBeneficiaries(userId: number): BeneficiaryData[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT b.*, u.status AS recipient_status, u.name AS recipient_name,
             u.email AS recipient_email, u.phone AS recipient_phone,
             (SELECT w.status FROM wallets w WHERE w.user_id = u.id AND w.currency = 'XAF' ORDER BY w.id LIMIT 1) AS recipient_wallet_status
      FROM beneficiaries b
      LEFT JOIN users u ON u.id = b.recipient_user_id
      WHERE b.user_id = ? AND b.recipient_user_id IS NOT NULL
      ORDER BY b.is_favorite DESC, b.id ASC
    `).all(userId) as any[];
    return rows.map((r) => ({
      id: r.id,
      recipientUserId: r.recipient_user_id === null ? null : Number(r.recipient_user_id),
      name: r.recipient_name || r.label,
      handle: r.recipient_email ? `@${String(r.recipient_email).split("@")[0]}` : "",
      phone: r.recipient_phone || "",
      email: r.recipient_email || "",
      avatarColor: r.avatar_color || "from-blue-600 to-indigo-700",
      initials: r.initials || r.label.slice(0, 2).toUpperCase(),
      isVerified: r.recipient_status === "active" && r.recipient_wallet_status === "active",
      isFavorite: Boolean(r.is_favorite),
    }));
  },

  createBeneficiary(userId: number, data: { name: string; handle?: string; phone?: string; email?: string }) {
    const db = getDatabase();
    const email = (data.email || "").trim().toLowerCase();
    const phone = (data.phone || "").trim();
    const normalizedPhone = phone.replace(/[\s().-]/g, "");
    if (!email && !normalizedPhone) throw new Error("Email ou numéro du compte NovaPaid requis.");
    const recipient = db.prepare(`
      SELECT id, name, email, phone FROM users
      WHERE status = 'active' AND id <> ?
        AND (? = '' OR lower(email) = ?)
        AND (? = '' OR replace(replace(replace(replace(replace(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '.', '') = ?)
        AND EXISTS (SELECT 1 FROM wallets WHERE wallets.user_id = users.id AND wallets.currency = 'XAF' AND wallets.status = 'active')
      LIMIT 1
    `).get(userId, email, email, normalizedPhone, normalizedPhone) as any;
    if (!recipient) throw new Error("Aucun compte NovaPaid actif ne correspond à ces coordonnées.");
    const alreadySaved = db.prepare("SELECT id FROM beneficiaries WHERE user_id = ? AND recipient_user_id = ?").get(userId, recipient.id);
    if (alreadySaved) throw new Error("Ce bénéficiaire est déjà enregistré.");
    const initials = String(recipient.name).split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase();
    const handle = `@${String(recipient.email).split("@")[0]}`;
    const result = db.prepare(`
      INSERT INTO beneficiaries (user_id, label, handle, recipient_user_id, phone, email, avatar_color, initials, is_verified, is_favorite, account_number)
      VALUES (?, ?, ?, ?, ?, ?, 'from-blue-600 to-indigo-700', ?, 1, 0, NULL)
    `).run(userId, recipient.name, handle, recipient.id, recipient.phone || null, recipient.email, initials || "NP");
    return this.getBeneficiaries(userId).find((beneficiary) => beneficiary.id === Number(result.lastInsertRowid));
  },

  setBeneficiaryFavorite(userId: number, beneficiaryId: number, favorite: boolean) {
    const db = getDatabase();
    const result = db.prepare("UPDATE beneficiaries SET is_favorite = ? WHERE id = ? AND user_id = ?")
      .run(favorite ? 1 : 0, beneficiaryId, userId);
    if (Number(result.changes) !== 1) throw new Error("Bénéficiaire introuvable.");
    return { success: true, isFavorite: favorite };
  },

  getTransactions(userId: number): TransactionData[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT t.id, t.public_ref, t.type, t.status,
             COALESCE(e.amount_minor, CASE WHEN t.type = 'withdrawal' THEN t.amount_minor + t.fee_minor ELSE t.amount_minor END) AS amount_minor,
             t.description, t.created_at,
             COALESCE(e.direction, CASE WHEN t.type = 'deposit' OR t.recipient_user_id = ? THEN 'credit' ELSE 'debit' END) AS direction
      FROM ledger_transactions t
      LEFT JOIN ledger_entries e ON e.transaction_id = t.id
        AND e.wallet_id IN (SELECT id FROM wallets WHERE user_id = ? AND currency = 'XAF')
      WHERE t.created_by = ? OR e.id IS NOT NULL
      ORDER BY t.id DESC
      LIMIT 100
    `).all(userId, userId, userId) as any[];

    return rows.map((r) => {
      const isCredit = r.direction === "credit";
      const amountXaf = Math.round(Number(r.amount_minor) / 100);
      return {
        id: r.id,
        publicRef: r.public_ref,
        type: r.type,
        status: r.status,
        amountMinor: Number(r.amount_minor),
        amountFormatted: `${isCredit ? "+" : "−"} ${amountXaf.toLocaleString("fr-FR")} FCFA`,
        direction: isCredit ? "credit" : "debit",
        description: r.description,
        createdAt: r.created_at,
      };
    });
  },

  getMonthlyTransactionSummary(userId: number) {
    const rows = getDatabase().prepare(`
      SELECT direction, COUNT(*) AS operation_count, COALESCE(SUM(amount_minor), 0) AS total_minor
      FROM (
        SELECT t.id, t.status, date(t.created_at) AS operation_date,
               COALESCE(e.direction, CASE WHEN t.type = 'deposit' OR t.recipient_user_id = ? THEN 'credit' ELSE 'debit' END) AS direction,
               COALESCE(e.amount_minor, CASE WHEN t.type = 'withdrawal' THEN t.amount_minor + t.fee_minor ELSE t.amount_minor END) AS amount_minor
        FROM ledger_transactions t
        LEFT JOIN ledger_entries e ON e.transaction_id = t.id
          AND e.wallet_id IN (SELECT id FROM wallets WHERE user_id = ? AND currency = 'XAF')
        WHERE t.created_by = ? OR e.id IS NOT NULL
      )
      WHERE status = 'succeeded' AND operation_date >= date('now', 'start of month')
      GROUP BY direction
    `).all(userId, userId, userId) as any[];
    const summary = { incomingXaf: 0, outgoingXaf: 0, incomingCount: 0, outgoingCount: 0 };
    for (const row of rows) {
      if (row.direction === "credit") {
        summary.incomingXaf = Math.round(Number(row.total_minor) / 100);
        summary.incomingCount = Number(row.operation_count);
      } else {
        summary.outgoingXaf = Math.round(Number(row.total_minor) / 100);
        summary.outgoingCount = Number(row.operation_count);
      }
    }
    return summary;
  },

  executeTransfer(userId: number, recipientUserId: number, amountXaf: number, note?: string, requestKey?: string) {
    const db = getDatabase();
    if (!Number.isSafeInteger(amountXaf) || amountXaf < 500 || amountXaf > 250000) throw new Error("Le montant doit être un nombre entier compris entre 500 et 250 000 FCFA.");
    const amountMinor = amountXaf * 100;
    if (!Number.isSafeInteger(recipientUserId) || recipientUserId < 1 || recipientUserId === userId) throw new Error("Bénéficiaire NovaPaid invalide.");
    const idempotencyKey = requestKey?.trim().slice(0, 100) || `transfer_${randomBytes(20).toString("hex")}`;
    if (!/^[\w.:-]{12,100}$/.test(idempotencyKey)) throw new Error("Clé de requête invalide.");
    return withImmediateTransaction(db, () => {
      const previous = db.prepare(`
        SELECT public_ref, description, amount_minor, recipient_user_id FROM ledger_transactions WHERE idempotency_key = ? AND created_by = ? AND type = 'transfer'
      `).get(idempotencyKey, userId) as any;
      if (previous) {
        if (Number(previous.amount_minor) !== amountMinor || Number(previous.recipient_user_id) !== recipientUserId) {
          throw new Error("Cette clé de requête a déjà servi à un autre transfert.");
        }
        const wallet = this.getWallet(userId);
        return { success: true, duplicate: true, publicRef: previous.public_ref, amountXaf, newBalanceXaf: wallet.balanceXaf, description: previous.description };
      }
      if (db.prepare("SELECT id FROM ledger_transactions WHERE idempotency_key = ?").get(idempotencyKey)) throw new Error("Clé de requête déjà utilisée.");
      this.assertWalletActive(userId);
      const limitSetting = db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'daily_transfer_limit_level2'").get() as any;
      let dailyLimitXaf = 500000;
      try { dailyLimitXaf = Number(JSON.parse(limitSetting?.setting_value || "{}").limitXaf) || dailyLimitXaf; } catch {}
      const usedTodayMinor = Number((db.prepare(`
        SELECT COALESCE(sum(amount_minor), 0) AS total FROM ledger_transactions
        WHERE created_by = ? AND type = 'transfer' AND status = 'succeeded' AND date(created_at) = date('now')
      `).get(userId) as any)?.total || 0);
      if (usedTodayMinor + amountMinor > dailyLimitXaf * 100) throw new Error("Le plafond journalier de transfert serait dépassé.");
      const monthlyLimitXaf = 2500000;
      const usedThisMonthMinor = Number((db.prepare(`
        SELECT COALESCE(sum(amount_minor), 0) AS total FROM ledger_transactions
        WHERE created_by = ? AND type = 'transfer' AND status = 'succeeded'
          AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      `).get(userId) as any)?.total || 0);
      if (usedThisMonthMinor + amountMinor > monthlyLimitXaf * 100) throw new Error("Le plafond mensuel de transfert serait dépassé.");
      const recipient = db.prepare(`
        SELECT u.name, w.id AS wallet_id FROM users u
        JOIN wallets w ON w.user_id = u.id AND w.currency = 'XAF'
        WHERE u.id = ? AND u.status = 'active' AND w.status = 'active'
        ORDER BY w.id LIMIT 1
      `).get(recipientUserId) as any;
      if (!recipient) throw new Error("Le compte du bénéficiaire est indisponible.");
      const senderWallet = db.prepare("SELECT id, available_minor FROM wallets WHERE user_id = ? AND currency = 'XAF' ORDER BY id LIMIT 1").get(userId) as any;
      if (!senderWallet) throw new Error("Portefeuille introuvable.");
      // Frais de transfert entre utilisateurs de la plateforme (2% par défaut, configurable
      // via transfer_fees). L'émetteur règle le montant + les frais, le bénéficiaire reçoit le montant.
      const feeXaf = this.calculateTransferFee(amountXaf);
      const feeMinor = feeXaf * 100;
      const totalDebitMinor = amountMinor + feeMinor;
      const newBalanceMinor = Number(senderWallet.available_minor) - totalDebitMinor;
      if (newBalanceMinor < 0) throw new Error(`Solde insuffisant pour couvrir le transfert et ses frais (${feeXaf.toLocaleString("fr-FR")} FCFA). Disponible: ${this.getWallet(userId).balanceXaf.toLocaleString()} FCFA`);
      const debit = db.prepare("UPDATE wallets SET available_minor = available_minor - ? WHERE id = ? AND status = 'active' AND available_minor >= ?")
        .run(totalDebitMinor, senderWallet.id, totalDebitMinor);
      if (Number(debit.changes) !== 1) throw new Error("Solde insuffisant ou portefeuille gelé.");
      const credit = db.prepare("UPDATE wallets SET available_minor = available_minor + ? WHERE id = ? AND status = 'active'")
        .run(amountMinor, recipient.wallet_id);
      if (Number(credit.changes) !== 1) throw new Error("Le portefeuille du bénéficiaire est indisponible.");
      const publicRef = `TRF-${Date.now()}-${randomBytes(5).toString("hex").toUpperCase()}`;
      const desc = `Transfert à ${String(recipient.name).slice(0, 120)}${note?.trim() ? ` · ${note.trim().slice(0, 180)}` : ""}`;
      const inserted = db.prepare(`
        INSERT INTO ledger_transactions (public_ref, idempotency_key, type, status, currency, amount_minor, fee_minor, description, created_by, recipient_user_id)
        VALUES (?, ?, 'transfer', 'succeeded', 'XAF', ?, ?, ?, ?, ?)
      `).run(publicRef, idempotencyKey, amountMinor, feeMinor, desc, userId, recipientUserId);
      const transactionId = Number(inserted.lastInsertRowid);
      const entry = db.prepare("INSERT INTO ledger_entries (transaction_id, wallet_id, direction, amount_minor) VALUES (?, ?, ?, ?)");
      entry.run(transactionId, senderWallet.id, "debit", amountMinor);
      entry.run(transactionId, recipient.wallet_id, "credit", amountMinor);
      if (feeMinor > 0) entry.run(transactionId, senderWallet.id, "debit", feeMinor);

      return { success: true, publicRef, amountXaf, feeXaf, totalDebitXaf: amountXaf + feeXaf, newBalanceXaf: Math.round(newBalanceMinor / 100), description: desc, recipientName: recipient.name };
    });
  },

  getUserTransferRecords(userId: number) {
    const rows = getDatabase().prepare(`
      SELECT t.id, t.public_ref, t.status, t.amount_minor, t.currency, t.description, t.created_at,
             t.created_by, t.recipient_user_id,
             sender.name AS sender_name, sender.email AS sender_email,
             recipient.name AS recipient_name, recipient.email AS recipient_email,
             CASE WHEN t.created_by = ? THEN 'sent' ELSE 'received' END AS direction
      FROM ledger_transactions t
      LEFT JOIN users sender ON sender.id = t.created_by
      LEFT JOIN users recipient ON recipient.id = t.recipient_user_id
      WHERE t.type = 'transfer' AND (t.created_by = ? OR t.recipient_user_id = ?)
      ORDER BY t.id DESC LIMIT 100
    `).all(userId, userId, userId) as any[];
    return rows.map((row) => ({
      id: row.id,
      publicRef: row.public_ref,
      status: row.status,
      amount: Math.round(Number(row.amount_minor) / 100),
      currency: row.currency,
      description: row.description,
      direction: row.direction,
      counterpartyUserId: Number(row.direction === "sent" ? row.recipient_user_id : row.created_by),
      counterpartyName: (row.direction === "sent" ? row.recipient_name : row.sender_name) || "Compte NovaPaid",
      counterpartyEmail: (row.direction === "sent" ? row.recipient_email : row.sender_email) || "",
      createdAt: row.created_at,
    }));
  },

  getTransferLimits(userId: number) {
    const db = getDatabase();
    const row = db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'daily_transfer_limit_level2'").get() as any;
    let dailyLimit = 500000;
    try { dailyLimit = Number(JSON.parse(row?.setting_value || "{}").limitXaf) || dailyLimit; } catch {}
    const dailyUsed = Number((db.prepare(`
      SELECT COALESCE(sum(amount_minor), 0) AS total FROM ledger_transactions
      WHERE created_by = ? AND type = 'transfer' AND status = 'succeeded' AND date(created_at) = date('now')
    `).get(userId) as any)?.total || 0) / 100;
    const monthlyUsed = Number((db.prepare(`
      SELECT COALESCE(sum(amount_minor), 0) AS total FROM ledger_transactions
      WHERE created_by = ? AND type = 'transfer' AND status = 'succeeded'
        AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get(userId) as any)?.total || 0) / 100;
    const user = db.prepare("SELECT kyc_status FROM users WHERE id = ?").get(userId) as any;
    return {
      dailyLimit,
      dailyUsed,
      monthlyLimit: 2500000,
      monthlyUsed,
      singleMax: 250000,
      singleMin: 500,
      kycLevel: user?.kyc_status === "approved" ? 2 : 1,
    };
  },

  executeDeposit(userId: number, amountXaf: number, providerId: string, payerPhone: string, requestKey: string) {
    const db = getDatabase();
    const allowedProviders = ["orange", "mtn", "wave", "card"];
    if (!allowedProviders.includes(providerId)) throw new Error("Moyen de dépôt indisponible.");
    const limits: Record<string, [number, number]> = {
      orange: [1000, 500000], mtn: [1000, 500000], wave: [500, 300000], card: [2500, 1000000],
    };
    const [minimum, maximum] = limits[providerId];
    if (!Number.isSafeInteger(amountXaf) || amountXaf < minimum || amountXaf > maximum) {
      throw new Error(`Le montant doit être compris entre ${minimum.toLocaleString("fr-FR")} et ${maximum.toLocaleString("fr-FR")} FCFA.`);
    }
    const cleanPhone = payerPhone.trim().replace(/\s+/g, " ").slice(0, 32);
    if (!/^[+0-9(). -]{6,32}$/.test(cleanPhone) || cleanPhone.replace(/\D/g, "").length < 6) {
      throw new Error("Numéro de compte invalide.");
    }
    const idempotencyKey = validateFinancialRequestKey(requestKey);
    const feePercent = fundingFeePercent(db, providerId);
    const feeXaf = Math.round(amountXaf * feePercent / 100);
    const netAmountXaf = amountXaf - feeXaf;
    if (netAmountXaf < 1) throw new Error("Le montant est insuffisant après déduction des frais.");
    const amountMinor = amountXaf * 100;
    const feeMinor = feeXaf * 100;
    const netAmountMinor = netAmountXaf * 100;
    const provider = FUNDING_PROVIDER_LABELS[providerId];

    return withImmediateTransaction(db, () => {
      const previous = db.prepare(`
        SELECT public_ref, provider, payer_phone, amount_minor, fee_minor, status
        FROM funding_orders WHERE idempotency_key = ? AND user_id = ?
      `).get(idempotencyKey, userId) as any;
      if (previous) {
        if (previous.provider !== providerId || previous.payer_phone !== cleanPhone || Number(previous.amount_minor) !== amountMinor) {
          throw new Error("Cette clé de requête correspond déjà à une autre opération.");
        }
        return {
          success: true,
          duplicate: true,
          status: previous.status,
          publicRef: previous.public_ref,
          amountXaf,
          feeXaf: Math.round(Number(previous.fee_minor) / 100),
          netAmountXaf: amountXaf - Math.round(Number(previous.fee_minor) / 100),
          newBalanceXaf: this.getWallet(userId).balanceXaf,
        };
      }
      if (db.prepare("SELECT id FROM ledger_transactions WHERE idempotency_key = ?").get(idempotencyKey)) {
        throw new Error("Cette clé de requête a déjà été utilisée.");
      }
      this.assertWalletActive(userId);

      const publicRef = `DEP-${Date.now()}-${randomBytes(5).toString("hex").toUpperCase()}`;
      const description = `Dépôt demandé via ${provider}`;
      db.prepare(`
        INSERT INTO funding_orders (public_ref, user_id, provider, payer_phone, idempotency_key, amount_minor, fee_minor, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(publicRef, userId, providerId, cleanPhone, idempotencyKey, amountMinor, feeMinor);
      db.prepare(`
        INSERT INTO ledger_transactions (public_ref, idempotency_key, type, status, currency, amount_minor, fee_minor, description, created_by, related_ref)
        VALUES (?, ?, 'deposit', 'pending', 'XAF', ?, ?, ?, ?, ?)
      `).run(publicRef, idempotencyKey, netAmountMinor, feeMinor, description, userId, publicRef);
      createApprovalRequest(
        db,
        userId,
        "deposit_funding",
        publicRef,
        `Vérifier le paiement externe · ${provider} · ${amountXaf.toLocaleString("fr-FR")} FCFA · compte ${cleanPhone}`
      );
      createUserNotification(
        db,
        userId,
        "info",
        "Dépôt en cours de vérification",
        `Votre demande ${publicRef} sera créditée après vérification du paiement externe.`,
        "/history"
      );
      return {
        success: true,
        status: "pending",
        publicRef,
        amountXaf,
        feeXaf,
        netAmountXaf,
        newBalanceXaf: this.getWallet(userId).balanceXaf,
        description,
      };
    });
  },

  executeWithdrawal(userId: number, amountXaf: number, providerId: string, beneficiaryPhone: string, requestKey: string) {
    const db = getDatabase();
    const allowedProviders = ["orange", "mtn", "bank"];
    if (!allowedProviders.includes(providerId)) throw new Error("Moyen de retrait indisponible.");
    const limits: Record<string, [number, number]> = {
      orange: [2000, 350000], mtn: [2000, 350000], bank: [10000, 2500000],
    };
    const [minimum, maximum] = limits[providerId];
    if (!Number.isSafeInteger(amountXaf) || amountXaf < minimum || amountXaf > maximum) {
      throw new Error(`Le montant doit être compris entre ${minimum.toLocaleString("fr-FR")} et ${maximum.toLocaleString("fr-FR")} FCFA.`);
    }
    const cleanPhone = beneficiaryPhone.trim().replace(/\s+/g, " ").slice(0, 32);
    if (!/^[A-Za-z0-9+(). -]{6,32}$/.test(cleanPhone) || cleanPhone.replace(/\D/g, "").length < 6) {
      throw new Error("Numéro ou compte de destination invalide.");
    }
    const idempotencyKey = validateFinancialRequestKey(requestKey);
    const feeXaf = Math.round(amountXaf * fundingFeePercent(db, providerId) / 100);
    const amountMinor = amountXaf * 100;
    const feeMinor = feeXaf * 100;
    const totalDebitMinor = amountMinor + feeMinor;
    const provider = FUNDING_PROVIDER_LABELS[providerId];

    return withImmediateTransaction(db, () => {
      const previous = db.prepare(`
        SELECT o.public_ref, o.provider, o.amount_minor, o.fee_minor, o.status, b.phone
        FROM withdrawal_orders o JOIN beneficiaries b ON b.id = o.beneficiary_id
        WHERE o.idempotency_key = ? AND o.user_id = ?
      `).get(idempotencyKey, userId) as any;
      if (previous) {
        if (previous.provider !== providerId || previous.phone !== cleanPhone || Number(previous.amount_minor) !== amountMinor) {
          throw new Error("Cette clé de requête correspond déjà à une autre opération.");
        }
        return {
          success: true,
          duplicate: true,
          status: previous.status,
          publicRef: previous.public_ref,
          amountXaf,
          feeXaf: Math.round(Number(previous.fee_minor) / 100),
          totalDebitXaf: amountXaf + Math.round(Number(previous.fee_minor) / 100),
          newBalanceXaf: this.getWallet(userId).balanceXaf,
        };
      }
      if (db.prepare("SELECT id FROM ledger_transactions WHERE idempotency_key = ?").get(idempotencyKey)) {
        throw new Error("Cette clé de requête a déjà été utilisée.");
      }
      this.assertWalletActive(userId);
      const wallet = db.prepare(`
        SELECT id, available_minor FROM wallets WHERE user_id = ? AND currency = 'XAF' AND status = 'active' ORDER BY id LIMIT 1
      `).get(userId) as any;
      if (!wallet) throw new Error("Portefeuille introuvable ou gelé.");

      let beneficiary = db.prepare(`
        SELECT id FROM beneficiaries WHERE user_id = ? AND recipient_user_id IS NULL AND phone = ? AND account_number = ?
        ORDER BY id LIMIT 1
      `).get(userId, cleanPhone, `${providerId}:${cleanPhone}`) as any;
      if (!beneficiary) {
        const inserted = db.prepare(`
          INSERT INTO beneficiaries (user_id, label, phone, account_number, is_verified, status)
          VALUES (?, ?, ?, ?, 0, 'active')
        `).run(userId, `${provider} · ${cleanPhone}`, cleanPhone, `${providerId}:${cleanPhone}`);
        beneficiary = { id: Number(inserted.lastInsertRowid) };
      }

      const reserve = db.prepare(`
        UPDATE wallets SET available_minor = available_minor - ?, reserved_minor = reserved_minor + ?
        WHERE id = ? AND status = 'active' AND available_minor >= ?
      `).run(totalDebitMinor, totalDebitMinor, wallet.id, totalDebitMinor);
      if (Number(reserve.changes) !== 1) {
        throw new Error(`Solde insuffisant pour couvrir le retrait et ses frais. Disponible : ${this.getWallet(userId).balanceXaf.toLocaleString("fr-FR")} FCFA.`);
      }

      const publicRef = `WTH-${Date.now()}-${randomBytes(5).toString("hex").toUpperCase()}`;
      const description = `Retrait demandé vers ${provider} (${cleanPhone})`;
      db.prepare(`
        INSERT INTO withdrawal_orders (public_ref, user_id, beneficiary_id, provider, idempotency_key, amount_minor, fee_minor, status, risk_decision)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'manual_review')
      `).run(publicRef, userId, beneficiary.id, providerId, idempotencyKey, amountMinor, feeMinor);
      db.prepare(`
        INSERT INTO ledger_transactions (public_ref, idempotency_key, type, status, currency, amount_minor, fee_minor, description, created_by, related_ref)
        VALUES (?, ?, 'withdrawal', 'pending', 'XAF', ?, ?, ?, ?, ?)
      `).run(publicRef, idempotencyKey, amountMinor, feeMinor, description, userId, publicRef);
      createApprovalRequest(
        db,
        userId,
        "withdrawal_payout",
        publicRef,
        `Règlement manuel requis · ${provider} · ${amountXaf.toLocaleString("fr-FR")} FCFA + ${feeXaf.toLocaleString("fr-FR")} FCFA de frais · destination ${cleanPhone}`
      );
      createUserNotification(
        db,
        userId,
        "info",
        "Retrait en cours de validation",
        `Votre demande ${publicRef} est en attente. Le montant et les frais sont réservés jusqu’à son règlement ou son rejet.`,
        "/history"
      );
      return {
        success: true,
        status: "pending",
        publicRef,
        amountXaf,
        feeXaf,
        totalDebitXaf: amountXaf + feeXaf,
        newBalanceXaf: this.getWallet(userId).balanceXaf,
        description,
      };
    });
  },

  // ==========================================
  // AUTHENTIFICATION & COMPTES UTILISATEURS
  // ==========================================

  registerUser(name: string, email: string, phone: string, password: string, context: { ipAddress?: string | null; userAgent?: string | null } = {}) {
    const db = getDatabase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim().replace(/\s+/g, " ");
    const cleanPhone = normalizePhone(phone);
    if (cleanName.length < 2 || cleanName.length > 100) throw new Error("Le nom doit contenir entre 2 et 100 caractères.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) throw new Error("Adresse email invalide.");
    if (cleanPhone && !/^\+?[0-9]{8,20}$/.test(cleanPhone)) throw new Error("Entrez un numéro de téléphone valide avec son indicatif.");
    const passwordHash = hashSecret(password);
    const sessionToken = makeSessionToken();
    let userId = 0;
    let accountKey = "";

    try {
      db.exec("BEGIN IMMEDIATE");
      const duplicate = db.prepare(`
        SELECT id FROM users WHERE lower(email) = ? OR (? <> '' AND replace(replace(replace(replace(replace(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '.', '') = ?) LIMIT 1
      `).get(cleanEmail, cleanPhone, cleanPhone) as any;
      if (duplicate) throw new Error("Cette adresse email ou ce téléphone est déjà associé à un compte NovaPaid.");

      const inserted = db.prepare(`
        INSERT INTO users (name, email, phone, password_hash, role, status, kyc_status)
        VALUES (?, ?, ?, ?, 'customer', 'active', 'not_started')
      `).run(cleanName, cleanEmail, cleanPhone || null, passwordHash);
      userId = Number(inserted.lastInsertRowid);

      accountKey = `WLT_${userId}_${randomBytes(6).toString("hex").toUpperCase()}`;
      db.prepare(`
        INSERT INTO wallets (account_key, user_id, currency, account_type, label, available_minor, reserved_minor, status)
        VALUES (?, ?, 'XAF', 'customer', 'Compte principal', 0, 0, 'active')
      `).run(accountKey, userId);

      db.prepare(`
        INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, digestToken(sessionToken), context.ipAddress || null, context.userAgent || null, sqlDateAfterHours(USER_SESSION_HOURS));

      db.prepare(`
        INSERT INTO user_activity_logs (user_id, action, details, request_id)
        VALUES (?, 'register_account', 'Création du compte', ?)
      `).run(userId, randomBytes(16).toString("hex"));

      createUserNotification(
        db,
        userId,
        "success",
        "Bienvenue sur NovaPaid",
        "Votre compte et votre portefeuille sont prêts. Vous pouvez maintenant découvrir vos services.",
        "/dashboard"
      );
      db.exec("COMMIT");
    } catch (error) {
      try { db.exec("ROLLBACK"); } catch {}
      throw error;
    }

    return {
      success: true,
      user: { id: userId, name: cleanName, email: cleanEmail, phone: cleanPhone || null, role: "customer", status: "active", kycStatus: "not_started" },
      wallet: { accountKey, currency: "XAF", availableMinor: 0, reservedMinor: 0, reservedXaf: 0, balanceXaf: 0 },
      sessionToken,
    };
  },

  loginUser(emailOrPhone: string, password: string, context: { ipAddress?: string | null; userAgent?: string | null } = {}) {
    const db = getDatabase();
    const identifier = emailOrPhone.trim();
    const normalizedPhone = normalizePhone(identifier);
    const user = db.prepare(`
      SELECT id, name, email, phone, password_hash, role, status, kyc_status
      FROM users
      WHERE lower(email) = ? OR replace(replace(replace(replace(replace(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '.', '') = ?
      LIMIT 1
    `).get(identifier.toLowerCase(), normalizedPhone) as any;

    if (!user) throw new Error("Identifiant ou mot de passe incorrect.");
    if (user.status !== "active") throw new Error("Ce compte est suspendu ou en attente de validation. Contactez le support.");

    const currentHash = String(user.password_hash || "");
    const valid = verifySecret(password, currentHash) || verifyLegacyPassword(password, currentHash);
    if (!valid) throw new Error("Identifiant ou mot de passe incorrect.");
    if (!currentHash.startsWith("scrypt$")) {
      db.prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(hashSecret(password), user.id);
    }

    const sessionToken = makeSessionToken();
    db.prepare(`
      INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(user.id, digestToken(sessionToken), context.ipAddress || null, context.userAgent || null, sqlDateAfterHours(USER_SESSION_HOURS));

    return {
      success: true,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, status: user.status, kycStatus: user.kyc_status },
      wallet: this.getWallet(user.id),
      sessionToken,
    };
  },

  // Step 1 of email-2FA login: validate the password WITHOUT creating a session.
  // Returns the user's id/email so the caller can generate and email a code.
  beginLogin(emailOrPhone: string, password: string) {
    const db = getDatabase();
    const identifier = emailOrPhone.trim();
    const normalizedPhone = normalizePhone(identifier);
    const user = db.prepare(`
      SELECT id, name, email, phone, password_hash, role, status, kyc_status
      FROM users
      WHERE lower(email) = ? OR replace(replace(replace(replace(replace(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '.', '') = ?
      LIMIT 1
    `).get(identifier.toLowerCase(), normalizedPhone) as any;

    if (!user) throw new Error("Identifiant ou mot de passe incorrect.");
    if (user.status !== "active") throw new Error("Ce compte est suspendu ou en attente de validation. Contactez le support.");

    const currentHash = String(user.password_hash || "");
    const valid = verifySecret(password, currentHash) || verifyLegacyPassword(password, currentHash);
    if (!valid) throw new Error("Identifiant ou mot de passe incorrect.");
    if (!currentHash.startsWith("scrypt$")) {
      db.prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(hashSecret(password), user.id);
    }

    return { success: true, userId: Number(user.id), name: String(user.name), email: String(user.email) };
  },

  // Step 2 of email-2FA login: verify the code, then open the session.
  completeLogin(userId: number, code: string, context: { ipAddress?: string | null; userAgent?: string | null } = {}) {
    const db = getDatabase();
    this.verifyCode(userId, code, "login");
    const user = db.prepare(`
      SELECT id, name, email, phone, role, status, kyc_status FROM users WHERE id = ? LIMIT 1
    `).get(userId) as any;
    if (!user) throw new Error("Compte utilisateur introuvable.");
    if (user.status !== "active") throw new Error("Ce compte est suspendu ou en attente de validation. Contactez le support.");

    const sessionToken = makeSessionToken();
    db.prepare(`
      INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(user.id, digestToken(sessionToken), context.ipAddress || null, context.userAgent || null, sqlDateAfterHours(USER_SESSION_HOURS));

    return {
      success: true,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, status: user.status, kycStatus: user.kyc_status },
      wallet: this.getWallet(user.id),
      sessionToken,
    };
  },

  // Password reset by 6-digit email code. Returns the code for the caller to email
  // (never exposed to the client). Returns no code when the email is unknown, so we
  // don't reveal whether an account exists.
  createPasswordResetCode(email: string) {
    const db = getDatabase();
    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare("SELECT id, name, email FROM users WHERE lower(email) = ? AND status = 'active'").get(cleanEmail) as any;
    if (!user) return { success: true as const, sent: false as const };
    const created = this.createVerificationCode(user.id, "password_reset");
    return { success: true as const, sent: true as const, code: created.code, userId: Number(user.id), name: String(user.name), email: String(user.email) };
  },

  resetPasswordWithCode(email: string, code: string, newPassword: string) {
    const db = getDatabase();
    const cleanEmail = email.trim().toLowerCase();
    if (newPassword.length < 10 || newPassword.length > 200) {
      throw new Error("Le mot de passe doit contenir entre 10 et 200 caractères.");
    }
    const user = db.prepare("SELECT id FROM users WHERE lower(email) = ? AND status = 'active'").get(cleanEmail) as any;
    if (!user) throw new Error("Code invalide ou expiré. Demandez un nouveau code.");
    this.verifyCode(user.id, code, "password_reset");
    return withImmediateTransaction(db, () => {
      db.prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(hashSecret(newPassword), user.id);
      db.prepare("DELETE FROM user_sessions WHERE user_id = ?").run(user.id);
      db.prepare(`
        INSERT INTO user_activity_logs (user_id, action, details, request_id)
        VALUES (?, 'password_reset', 'Mot de passe réinitialisé via code email', ?)
      `).run(user.id, randomBytes(16).toString("hex"));
      createUserNotification(db, user.id, "security", "Mot de passe modifié", "Votre mot de passe a été réinitialisé. Si ce n'est pas vous, contactez le support immédiatement.", "/support");
      return { success: true, message: "Mot de passe réinitialisé avec succès. Connectez-vous avec votre nouveau mot de passe." };
    });
  },

  logoutUser(sessionToken: string | null) {
    if (!sessionToken) return;
    getDatabase().prepare("DELETE FROM user_sessions WHERE session_token = ?").run(digestToken(sessionToken));
  },

  updateUserProfile(userId: number, data: { name: string; phone: string; currentPassword?: string }) {
    const db = getDatabase();
    const name = data.name.trim().replace(/\s+/g, " ");
    const phone = normalizePhone(data.phone);
    if (name.length < 2 || name.length > 100) throw new Error("Le nom doit contenir entre 2 et 100 caractères.");
    if (phone && !/^\+?[0-9]{8,20}$/.test(phone)) throw new Error("Entrez un numéro de téléphone valide avec son indicatif.");
    return withImmediateTransaction(db, () => {
      const user = db.prepare("SELECT name, phone, password_hash FROM users WHERE id = ? AND status = 'active'").get(userId) as any;
      if (!user) throw new Error("Compte utilisateur introuvable ou inactif.");
      const oldPhone = normalizePhone(String(user.phone || ""));
      if (phone !== oldPhone) {
        if (!phone) throw new Error("Le numéro de téléphone ne peut pas être supprimé.");
        const currentPassword = data.currentPassword || "";
        const currentHash = String(user.password_hash || "");
        if (!currentPassword || !(verifySecret(currentPassword, currentHash) || verifyLegacyPassword(currentPassword, currentHash))) {
          throw new Error("Confirmez le changement de téléphone avec votre mot de passe actuel.");
        }
        const duplicate = db.prepare(`
          SELECT id FROM users
          WHERE id <> ? AND replace(replace(replace(replace(replace(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '.', '') = ?
          LIMIT 1
        `).get(userId, phone);
        if (duplicate) throw new Error("Ce numéro est déjà associé à un compte NovaPaid.");
        db.prepare("UPDATE users SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(name, phone, userId);
      } else {
        db.prepare("UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(name, userId);
      }
      db.prepare(`
        INSERT INTO user_activity_logs (user_id, action, details, request_id)
        VALUES (?, 'update_profile', 'Mise à jour du profil', ?)
      `).run(userId, randomBytes(16).toString("hex"));
      return { success: true, profile: this.getProfile(userId) };
    });
  },

  revokeOtherUserSessions(userId: number, currentSessionToken: string | null) {
    if (!currentSessionToken) throw new Error("La session actuelle est invalide.");
    const db = getDatabase();
    const currentHash = digestToken(currentSessionToken);
    const activeSession = db.prepare("SELECT id FROM user_sessions WHERE user_id = ? AND session_token = ? AND expires_at > datetime('now')").get(userId, currentHash);
    if (!activeSession) throw new Error("La session actuelle a expiré.");
    const result = db.prepare("DELETE FROM user_sessions WHERE user_id = ? AND session_token <> ?").run(userId, currentHash);
    db.prepare(`
      INSERT INTO user_activity_logs (user_id, action, details, request_id)
      VALUES (?, 'revoke_other_sessions', ?, ?)
    `).run(userId, `${Number(result.changes)} autre(s) session(s) fermée(s)`, randomBytes(16).toString("hex"));
    return { success: true, revokedCount: Number(result.changes) };
  },

  changeUserPassword(userId: number, currentPassword: string, newPassword: string, currentSessionToken: string | null) {
    if (!currentSessionToken) throw new Error("La session actuelle est invalide.");
    if (newPassword.length < 10 || newPassword.length > 200) throw new Error("Le nouveau mot de passe doit contenir entre 10 et 200 caractères.");
    const db = getDatabase();
    const currentHash = digestToken(currentSessionToken);
    return withImmediateTransaction(db, () => {
      const user = db.prepare("SELECT password_hash FROM users WHERE id = ? AND status = 'active'").get(userId) as any;
      if (!user) throw new Error("Compte utilisateur introuvable ou inactif.");
      const savedHash = String(user.password_hash || "");
      if (!currentPassword || !(verifySecret(currentPassword, savedHash) || verifyLegacyPassword(currentPassword, savedHash))) {
        throw new Error("Le mot de passe actuel est incorrect.");
      }
      const activeSession = db.prepare("SELECT id FROM user_sessions WHERE user_id = ? AND session_token = ? AND expires_at > datetime('now')").get(userId, currentHash);
      if (!activeSession) throw new Error("La session actuelle a expiré.");
      db.prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(hashSecret(newPassword), userId);
      const revoked = db.prepare("DELETE FROM user_sessions WHERE user_id = ? AND session_token <> ?").run(userId, currentHash);
      db.prepare(`
        INSERT INTO user_activity_logs (user_id, action, details, request_id)
        VALUES (?, 'change_password', ?, ?)
      `).run(userId, `${Number(revoked.changes)} autre(s) session(s) fermée(s)`, randomBytes(16).toString("hex"));
      return { success: true, revokedCount: Number(revoked.changes) };
    });
  },

  setUserPin(userId: number, currentPassword: string, pin: string) {
    const db = getDatabase();
    if (!/^\d{4}$/.test(pin)) throw new Error("Le code PIN doit comporter exactement 4 chiffres.");
    return withImmediateTransaction(db, () => {
      const user = db.prepare("SELECT password_hash FROM users WHERE id = ? AND status = 'active'").get(userId) as any;
      if (!user) throw new Error("Utilisateur introuvable.");
      const savedHash = String(user.password_hash || "");
      if (!currentPassword || !(verifySecret(currentPassword, savedHash) || verifyLegacyPassword(currentPassword, savedHash))) {
        throw new Error("Le mot de passe actuel est incorrect.");
      }
      const pinHash = hashSecret(pin);
      db.prepare("UPDATE users SET pin_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(pinHash, userId);
      createUserNotification(db, userId, "security", "Code PIN configuré", "Votre code PIN de sécurité à 4 chiffres a été défini avec succès.", "/settings");
      return { success: true, hasPin: true };
    });
  },

  removeUserPin(userId: number, currentPassword: string) {
    const db = getDatabase();
    return withImmediateTransaction(db, () => {
      const user = db.prepare("SELECT password_hash FROM users WHERE id = ? AND status = 'active'").get(userId) as any;
      if (!user) throw new Error("Utilisateur introuvable.");
      const savedHash = String(user.password_hash || "");
      if (!currentPassword || !(verifySecret(currentPassword, savedHash) || verifyLegacyPassword(currentPassword, savedHash))) {
        throw new Error("Le mot de passe actuel est incorrect.");
      }
      db.prepare("UPDATE users SET pin_hash = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(userId);
      createUserNotification(db, userId, "security", "Code PIN désactivé", "Votre code PIN de sécurité a été supprimé.", "/settings");
      return { success: true, hasPin: false };
    });
  },

  // --- PROGRAMME REVENDEURS (Reseller / Affiliation - PrismCard) ---
  getResellerDashboard(userId: number) {
    const db = getDatabase();
    let reseller = db.prepare("SELECT * FROM resellers WHERE user_id = ?").get(userId) as any;
    if (!reseller) {
      const code = "NP" + userId + randomBytes(3).toString("hex").toUpperCase();
      const ins = db.prepare("INSERT INTO resellers (user_id, referral_code, commission_rate, status, subscription_status) VALUES (?, ?, 5.0, 'active', 'active')").run(userId, code);
      reseller = db.prepare("SELECT * FROM resellers WHERE id = ?").get(Number(ins.lastInsertRowid)) as any;
    }
    const referrals = db.prepare("SELECT id, name, email, phone, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC").all(userId) as any[];
    const commissions = db.prepare("SELECT * FROM reseller_commissions WHERE reseller_id = ? ORDER BY created_at DESC LIMIT 50").all(userId) as any[];
    const totalEarnedMinor = (db.prepare("SELECT SUM(commission_minor) as s FROM reseller_commissions WHERE reseller_id = ? AND status = 'paid'").get(userId) as any)?.s || 0;

    return {
      success: true,
      resellerCode: reseller.referral_code,
      commissionRate: reseller.commission_rate,
      status: reseller.status,
      subscriptionStatus: reseller.subscription_status,
      totalEarnedXaf: Math.round(Number(totalEarnedMinor) / 100),
      referralsCount: referrals.length,
      referrals,
      commissions: commissions.map((c: any) => ({
        id: c.id,
        orderType: c.order_type,
        orderRef: c.order_ref,
        amountXaf: Math.round(Number(c.amount_minor) / 100),
        commissionXaf: Math.round(Number(c.commission_minor) / 100),
        status: c.status,
        createdAt: c.created_at,
      })),
    };
  },

  getAdminResellers() {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT r.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
             (SELECT count(*) FROM users WHERE referred_by = r.user_id) as referrals_count
      FROM resellers r
      JOIN users u ON u.id = r.user_id
      ORDER BY r.id DESC
    `).all() as any[];
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      userPhone: r.user_phone,
      referralCode: r.referral_code,
      commissionRate: r.commission_rate,
      status: r.status,
      subscriptionStatus: r.subscription_status,
      referralsCount: r.referrals_count,
      totalEarnedXaf: Math.round(Number(r.total_earned_minor || 0) / 100),
      createdAt: r.created_at,
    }));
  },

  updateResellerRate(resellerId: number, rate: number, adminId: number) {
    const db = getDatabase();
    if (!Number.isFinite(rate) || rate < 0 || rate > 50) throw new Error("Le taux de commission doit être entre 0% et 50%.");
    db.prepare("UPDATE resellers SET commission_rate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(rate, resellerId);
    writeAdminAudit(db, adminId, "super_admin", "update_reseller_rate", `reseller:${resellerId}`, `Nouveau taux : ${rate}%`);
    return { success: true };
  },

  // --- ANNONCES PUSH (Push Announcements - PrismCard) ---
  getAdminPushAnnouncements() {
    const db = getDatabase();
    return db.prepare("SELECT * FROM push_announcements ORDER BY created_at DESC").all();
  },

  createPushAnnouncement(title: string, message: string, targetAudience: string, adminId: number) {
    const db = getDatabase();
    const cleanTitle = title.trim().slice(0, 100);
    const cleanMessage = message.trim().slice(0, 500);
    if (!cleanTitle || !cleanMessage) throw new Error("Le titre et le message de l'annonce sont requis.");

    const users = db.prepare("SELECT id FROM users WHERE status = 'active'").all() as any[];
    for (const u of users) {
      createUserNotification(db, u.id, "info", cleanTitle, cleanMessage, "/dashboard");
    }

    const ins = db.prepare("INSERT INTO push_announcements (title, message, target_audience, status, sent_count, created_by) VALUES (?, ?, ?, 'sent', ?, ?)")
      .run(cleanTitle, cleanMessage, targetAudience || "all", users.length, adminId);
    writeAdminAudit(db, adminId, "operator", "send_push_announcement", `announcement:${ins.lastInsertRowid}`, `Envoyé à ${users.length} utilisateur(s)`);
    return { success: true, id: Number(ins.lastInsertRowid), sentCount: users.length };
  },

  // --- ANNONCES PROMOTIONNELLES / ADS (PrismCard AdController) ---
  getPromotionalAds(activeOnly = true) {
    const db = getDatabase();
    if (activeOnly) {
      return db.prepare("SELECT * FROM promotional_ads WHERE is_active = 1 ORDER BY sort_order ASC, id DESC").all();
    }
    return db.prepare("SELECT * FROM promotional_ads ORDER BY sort_order ASC, id DESC").all();
  },

  savePromotionalAd(data: { id?: number; title: string; description?: string; linkUrl?: string; imageUrl?: string; isActive?: boolean; sortOrder?: number }, adminId: number) {
    const db = getDatabase();
    const cleanTitle = String(data.title || "").trim().slice(0, 120);
    if (!cleanTitle) throw new Error("Le titre de l'annonce est requis.");
    if (data.id) {
      db.prepare("UPDATE promotional_ads SET title = ?, description = ?, link_url = ?, image_url = ?, is_active = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(cleanTitle, String(data.description || ""), String(data.linkUrl || ""), String(data.imageUrl || ""), data.isActive === false ? 0 : 1, Number(data.sortOrder || 0), data.id);
      writeAdminAudit(db, adminId, "operator", "update_ad", `ad:${data.id}`, cleanTitle);
      return { success: true, id: data.id };
    }
    const ins = db.prepare("INSERT INTO promotional_ads (title, description, link_url, image_url, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)")
      .run(cleanTitle, String(data.description || ""), String(data.linkUrl || ""), String(data.imageUrl || ""), data.isActive === false ? 0 : 1, Number(data.sortOrder || 0));
    writeAdminAudit(db, adminId, "operator", "create_ad", `ad:${ins.lastInsertRowid}`, cleanTitle);
    return { success: true, id: Number(ins.lastInsertRowid) };
  },

  deletePromotionalAd(id: number, adminId: number) {
    const db = getDatabase();
    db.prepare("DELETE FROM promotional_ads WHERE id = ?").run(id);
    writeAdminAudit(db, adminId, "operator", "delete_ad", `ad:${id}`, "Annonce publicitaire supprimée");
    return { success: true };
  },

  loginAdmin(email: string, password: string, context: { ipAddress?: string | null } = {}) {
    const db = getDatabase();
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.length > 254 || password.length > 200) throw new Error("Adresse email ou mot de passe administrateur invalide.");
    const admin = db.prepare(`
      SELECT id, name, email, role, permissions, password_hash, status
      FROM admins WHERE lower(email) = ? AND status = 'active' LIMIT 1
    `).get(cleanEmail) as any;
    if (!admin || !String(admin.password_hash || "").startsWith("scrypt$") || !verifySecret(password, String(admin.password_hash))) {
      throw new Error("Adresse email ou mot de passe administrateur invalide.");
    }
    const sessionToken = makeSessionToken();
    db.prepare(`INSERT INTO admin_sessions (admin_id, session_token, ip_address, expires_at) VALUES (?, ?, ?, ?)`)
      .run(admin.id, digestToken(sessionToken), context.ipAddress || null, sqlDateAfterHours(ADMIN_SESSION_HOURS));
    db.prepare("UPDATE admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?").run(admin.id);
    writeAdminAudit(db, admin.id, admin.role, "admin_login", `admin:${admin.id}`, "Session administrateur ouverte");

    return {
      success: true,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, permissions: admin.permissions },
      sessionToken,
    };
  },

  logoutAdmin(sessionToken: string | null) {
    if (!sessionToken) return;
    const db = getDatabase();
    const sessionHash = digestToken(sessionToken);
    const session = db.prepare("SELECT admin_id FROM admin_sessions WHERE session_token = ?").get(sessionHash) as any;
    if (!session) return;
    db.prepare("DELETE FROM admin_sessions WHERE session_token = ?").run(sessionHash);
    writeAdminAudit(db, Number(session.admin_id), "super_admin", "admin_logout", `admin:${session.admin_id}`, "Session administrateur fermée");
  },

  checkAuthRateLimit(key: string, maximumAttempts = 6, windowMs = 15 * 60 * 1000, blockMs = 15 * 60 * 1000) {
    const db = getDatabase();
    const bucket = createHash("sha256").update(key).digest("hex");
    const now = Date.now();
    const entry = db.prepare("SELECT attempts, window_started, blocked_until FROM auth_rate_limits WHERE bucket_hash = ?").get(bucket) as any;
    if (entry?.blocked_until && Number(entry.blocked_until) > now) return Math.ceil((Number(entry.blocked_until) - now) / 1000);

    if (!entry || now - Number(entry.window_started) >= windowMs) {
      db.prepare(`INSERT INTO auth_rate_limits (bucket_hash, attempts, window_started, blocked_until) VALUES (?, 1, ?, NULL)
        ON CONFLICT(bucket_hash) DO UPDATE SET attempts = 1, window_started = excluded.window_started, blocked_until = NULL`).run(bucket, now);
      return 0;
    }

    const attempts = Number(entry.attempts) + 1;
    const blockedUntil = attempts >= maximumAttempts ? now + blockMs : null;
    db.prepare("UPDATE auth_rate_limits SET attempts = ?, blocked_until = ? WHERE bucket_hash = ?").run(attempts, blockedUntil, bucket);
    return blockedUntil ? Math.ceil(blockMs / 1000) : 0;
  },

  clearAuthRateLimit(key: string) {
    const bucket = createHash("sha256").update(key).digest("hex");
    getDatabase().prepare("DELETE FROM auth_rate_limits WHERE bucket_hash = ?").run(bucket);
  },

  // ==========================================
  // MÉTHODES D'ADMINISTRATION
  // ==========================================

  getAdminOverview() {
    const db = getDatabase();
    const usersCount = (db.prepare("SELECT count(*) as c FROM users").get() as any)?.c || 0;
    const cardsCount = (db.prepare("SELECT count(*) as c FROM cards").get() as any)?.c || 0;
    const pendingKyc = (db.prepare("SELECT count(*) as c FROM kyc_cases WHERE status = 'pending'").get() as any)?.c || 0;
    const pendingApprovals = (db.prepare("SELECT count(*) as c FROM admin_approvals WHERE status = 'pending'").get() as any)?.c || 0;
    const openTickets = (db.prepare("SELECT count(*) as c FROM support_tickets WHERE status = 'open'").get() as any)?.c || 0;
    const transactionReviews = (db.prepare("SELECT count(*) as c FROM admin_transaction_reviews WHERE status = 'open'").get() as any)?.c || 0;
    const transactionsCount = (db.prepare("SELECT count(*) as c FROM ledger_transactions").get() as any)?.c || 0;

    const balanceTotalMinor = (db.prepare("SELECT sum(available_minor) as s FROM wallets").get() as any)?.s || 0;
    const volumeTotalMinor = (db.prepare("SELECT sum(amount_minor) as s FROM ledger_transactions WHERE status = 'succeeded'").get() as any)?.s || 0;

    return {
      usersCount,
      cardsCount,
      pendingKyc,
      pendingApprovals,
      openTickets,
      transactionReviews,
      transactionsCount,
      totalBalanceXaf: Math.round(Number(balanceTotalMinor) / 100),
      totalVolumeXaf: Math.round(Number(volumeTotalMinor) / 100),
    };
  },

  getAdminUsers() {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.kyc_status, u.created_at,
             w.available_minor, w.currency, w.status AS wallet_status
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id AND w.account_type = 'customer'
      ORDER BY u.id ASC
    `).all() as any[];

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone || "Non renseigné",
      role: r.role,
      status: r.status,
      kycStatus: r.kyc_status,
      balanceXaf: Math.round(Number(r.available_minor || 0) / 100),
      currency: r.currency || "XAF",
      walletStatus: r.wallet_status || "active",
      createdAt: r.created_at,
    }));
  },

  updateUserStatus(userId: number, status: string, kycStatus: string | undefined, adminId: number) {
    const db = getDatabase();
    if (!Number.isSafeInteger(userId) || userId < 1) throw new Error("Utilisateur invalide.");
    if (!['active', 'suspended', 'pending_verification'].includes(status)) throw new Error("Statut utilisateur invalide.");
    if (kycStatus && !["not_started", "pending", "under_review", "approved", "rejected"].includes(kycStatus)) throw new Error("Statut KYC invalide.");
    const exists = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
    if (!exists) throw new Error("Utilisateur introuvable.");
    if (kycStatus) {
      db.prepare("UPDATE users SET status = ?, kyc_status = ? WHERE id = ?").run(status, kycStatus, userId);
    } else {
      db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, userId);
    }
    if (status !== "active") db.prepare("DELETE FROM user_sessions WHERE user_id = ?").run(userId);
    createUserNotification(
      db,
      userId,
      status === "active" ? "success" : "security",
      status === "active" ? "Compte réactivé" : "Compte suspendu",
      status === "active"
        ? "Votre accès NovaPaid a été rétabli."
        : "Votre compte est temporairement suspendu. Contactez le support si vous pensez qu’il s’agit d’une erreur.",
      status === "active" ? "/dashboard" : "/support"
    );
    writeAdminAudit(db, adminId, "super_admin", "update_user_status", `user:${userId}`, `Statut passé à ${status}${kycStatus ? ` (KYC: ${kycStatus})` : ""}`);

    return { success: true };
  },

  setUserWalletStatus(userId: number, status: "active" | "frozen", adminId: number) {
    const db = getDatabase();
    if (!["active", "frozen"].includes(status)) throw new Error("Statut du portefeuille invalide.");
    if (!Number.isSafeInteger(userId) || userId < 1) throw new Error("Utilisateur invalide.");
    if (!db.prepare("SELECT id FROM users WHERE id = ?").get(userId)) throw new Error("Utilisateur introuvable.");
    const result = db.prepare("UPDATE wallets SET status = ? WHERE user_id = ?").run(status, userId);
    if (Number(result.changes) === 0) throw new Error("Aucun portefeuille pour cet utilisateur.");
    createUserNotification(
      db,
      userId,
      status === "frozen" ? "security" : "success",
      status === "frozen" ? "Portefeuille gelé" : "Portefeuille réactivé",
      status === "frozen"
        ? "Votre portefeuille a été temporairement gelé par l’administration."
        : "Votre portefeuille est de nouveau disponible.",
      "/wallet"
    );
    writeAdminAudit(db, adminId, "super_admin", "set_wallet_status", `user:${userId}`, `Portefeuille ${status === "frozen" ? "gelé" : "réactivé"}`);
    return { success: true, status };
  },

  adjustUserWalletBalance(userId: number, direction: "credit" | "debit", amountXaf: number, reason: string, adminId: number, requestKey: string) {
    const db = getDatabase();
    if (!Number.isSafeInteger(userId) || userId < 1) throw new Error("Utilisateur invalide.");
    if (!Number.isSafeInteger(amountXaf) || amountXaf < 1 || amountXaf > 10_000_000) {
      throw new Error("Le montant doit être un nombre entier entre 1 et 10 000 000 FCFA.");
    }
    if (direction !== "credit" && direction !== "debit") throw new Error("Sens de l’ajustement invalide.");
    const cleanReason = reason.trim().replace(/\s+/g, " ").slice(0, 500);
    if (cleanReason.length < 10) throw new Error("Un motif d’au moins 10 caractères est obligatoire.");
    const idempotencyKey = `admin_adjust_${adminId}_${validateFinancialRequestKey(requestKey)}`;
    const amountMinor = amountXaf * 100;
    const transactionType = direction === "credit" ? "admin_adjustment_credit" : "admin_adjustment_debit";

    return withImmediateTransaction(db, () => {
      const previous = db.prepare(`
        SELECT public_ref, type, amount_minor, description
        FROM ledger_transactions WHERE idempotency_key = ? AND created_by = ?
      `).get(idempotencyKey, userId) as any;
      if (previous) {
        if (previous.type !== transactionType || Number(previous.amount_minor) !== amountMinor || previous.description !== cleanReason) {
          throw new Error("Cette clé de requête correspond déjà à un autre ajustement.");
        }
        return { success: true, duplicate: true, publicRef: previous.public_ref, newBalanceXaf: this.getWallet(userId).balanceXaf };
      }

      this.assertWalletActive(userId);
      const wallet = db.prepare(`
        SELECT id FROM wallets WHERE user_id = ? AND currency = 'XAF' AND status = 'active' ORDER BY id LIMIT 1
      `).get(userId) as any;
      if (!wallet) throw new Error("Portefeuille introuvable ou gelé.");

      const update = direction === "credit"
        ? db.prepare("UPDATE wallets SET available_minor = available_minor + ? WHERE id = ? AND status = 'active'").run(amountMinor, wallet.id)
        : db.prepare("UPDATE wallets SET available_minor = available_minor - ? WHERE id = ? AND status = 'active' AND available_minor >= ?").run(amountMinor, wallet.id, amountMinor);
      if (Number(update.changes) !== 1) throw new Error("Solde disponible insuffisant pour cet ajustement.");

      const publicRef = `ADJ-${Date.now()}-${randomBytes(5).toString("hex").toUpperCase()}`;
      const inserted = db.prepare(`
        INSERT INTO ledger_transactions (public_ref, idempotency_key, type, status, currency, amount_minor, description, created_by)
        VALUES (?, ?, ?, 'succeeded', 'XAF', ?, ?, ?)
      `).run(publicRef, idempotencyKey, transactionType, amountMinor, cleanReason, userId);
      db.prepare("INSERT INTO ledger_entries (transaction_id, wallet_id, direction, amount_minor) VALUES (?, ?, ?, ?)")
        .run(Number(inserted.lastInsertRowid), wallet.id, direction, amountMinor);
      createUserNotification(
        db,
        userId,
        direction === "credit" ? "success" : "warning",
        direction === "credit" ? "Ajustement créditeur du portefeuille" : "Ajustement débiteur du portefeuille",
        `${amountXaf.toLocaleString("fr-FR")} FCFA · Réf. ${publicRef}`,
        "/history"
      );
      writeAdminAudit(db, adminId, "super_admin", `wallet_${direction}_adjustment`, `user:${userId}`, `${amountXaf} XAF · ${cleanReason}`);
      return { success: true, publicRef, newBalanceXaf: this.getWallet(userId).balanceXaf };
    });
  },

  getAdminApprovals() {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT a.id, a.request_ref, a.requested_by, a.approved_by, a.action_type,
             a.target_ref, a.reason, a.status, a.created_at, a.decided_at,
             u.name as requester_name, u.email as requester_email,
             lt.amount_minor as tx_amount_minor, lt.fee_minor as tx_fee_minor
      FROM admin_approvals a
      JOIN users u ON u.id = a.requested_by
      LEFT JOIN ledger_transactions lt ON lt.public_ref = a.target_ref
      ORDER BY CASE WHEN a.status = 'pending' THEN 0 ELSE 1 END, a.id DESC
    `).all() as any[];

    return rows.map((r) => ({
      id: r.id,
      requestRef: r.request_ref,
      requestedBy: r.requested_by,
      requesterName: r.requester_name,
      requesterEmail: r.requester_email,
      actionType: r.action_type,
      targetRef: r.target_ref,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
      decidedAt: r.decided_at,
    }));
  },

  decideApproval(approvalId: number, approve: boolean, adminId: number, note?: string) {
    const db = getDatabase();
    if (!Number.isSafeInteger(approvalId) || approvalId < 1) throw new Error("Demande d’approbation invalide.");
    const cleanNote = String(note || "").trim().slice(0, 500);
    return withImmediateTransaction(db, () => {
      const existing = db.prepare("SELECT status, requested_by, action_type, target_ref FROM admin_approvals WHERE id = ?").get(approvalId) as any;
      if (!existing) throw new Error("Demande d’approbation introuvable.");
      if (existing.status !== "pending") throw new Error("Cette demande a déjà été traitée.");
      if (["deposit_funding", "withdrawal_payout"].includes(existing.action_type) && cleanNote.length < 5) {
        throw new Error("Ajoutez une référence de contrôle ou le motif du rejet pour garder une trace de la décision.");
      }
      const newStatus = approve ? "approved" : "rejected";
      const decidedAt = new Date().toISOString().replace("T", " ").slice(0, 19);

      if (["deposit_funding", "withdrawal_payout"].includes(existing.action_type)) {
        const transaction = db.prepare("SELECT id, status, created_by, amount_minor, fee_minor FROM ledger_transactions WHERE public_ref = ?").get(existing.target_ref) as any;
        if (!transaction || transaction.status !== "pending" || Number(transaction.created_by) !== Number(existing.requested_by)) {
          throw new Error("L’opération liée n’est plus en attente de traitement.");
        }
        const wallet = db.prepare(`
          SELECT id, status, available_minor, reserved_minor
          FROM wallets WHERE user_id = ? AND currency = 'XAF' ORDER BY id LIMIT 1
        `).get(existing.requested_by) as any;
        if (!wallet) throw new Error("Portefeuille introuvable.");

        if (existing.action_type === "deposit_funding") {
          const order = db.prepare(`
            SELECT amount_minor, fee_minor, status FROM funding_orders WHERE public_ref = ? AND user_id = ?
          `).get(existing.target_ref, existing.requested_by) as any;
          if (!order || order.status !== "pending") throw new Error("La demande de dépôt n’est plus en attente.");
          const netAmountMinor = Number(order.amount_minor) - Number(order.fee_minor || 0);
          if (netAmountMinor <= 0) throw new Error("Montant net du dépôt invalide.");
          if (approve) {
            if (wallet.status !== "active") throw new Error("Le portefeuille est gelé. Réactivez-le avant de créditer le dépôt.");
            db.prepare("UPDATE wallets SET available_minor = available_minor + ? WHERE id = ? AND status = 'active'").run(netAmountMinor, wallet.id);
            db.prepare("INSERT INTO ledger_entries (transaction_id, wallet_id, direction, amount_minor) VALUES (?, ?, 'credit', ?)")
              .run(transaction.id, wallet.id, netAmountMinor);
          }
          db.prepare("UPDATE funding_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE public_ref = ? AND status = 'pending'")
            .run(approve ? "succeeded" : "rejected", existing.target_ref);
          db.prepare("UPDATE ledger_transactions SET status = ?, description = ? WHERE id = ? AND status = 'pending'")
            .run(approve ? "succeeded" : "rejected", approve ? "Dépôt vérifié et crédité" : "Dépôt rejeté après vérification", transaction.id);
        } else {
          const order = db.prepare(`
            SELECT amount_minor, fee_minor, status FROM withdrawal_orders WHERE public_ref = ? AND user_id = ?
          `).get(existing.target_ref, existing.requested_by) as any;
          if (!order || order.status !== "pending") throw new Error("La demande de retrait n’est plus en attente.");
          const totalDebitMinor = Number(order.amount_minor) + Number(order.fee_minor || 0);
          if (Number(wallet.reserved_minor) < totalDebitMinor) throw new Error("Le montant réservé ne correspond plus à la demande.");
          if (approve) {
            if (wallet.status !== "active") throw new Error("Le portefeuille est gelé. Réactivez-le avant de régler le retrait.");
            db.prepare("UPDATE wallets SET reserved_minor = reserved_minor - ? WHERE id = ? AND reserved_minor >= ?")
              .run(totalDebitMinor, wallet.id, totalDebitMinor);
            db.prepare("INSERT INTO ledger_entries (transaction_id, wallet_id, direction, amount_minor) VALUES (?, ?, 'debit', ?)")
              .run(transaction.id, wallet.id, totalDebitMinor);
          } else {
            db.prepare(`
              UPDATE wallets SET available_minor = available_minor + ?, reserved_minor = reserved_minor - ?
              WHERE id = ? AND reserved_minor >= ?
            `).run(totalDebitMinor, totalDebitMinor, wallet.id, totalDebitMinor);
          }
          db.prepare("UPDATE withdrawal_orders SET status = ?, risk_decision = ?, updated_at = CURRENT_TIMESTAMP WHERE public_ref = ? AND status = 'pending'")
            .run(approve ? "succeeded" : "rejected", approve ? "manual_paid" : "manual_rejected", existing.target_ref);
          db.prepare("UPDATE ledger_transactions SET status = ?, description = ? WHERE id = ? AND status = 'pending'")
            .run(approve ? "succeeded" : "rejected", approve ? "Retrait réglé" : "Retrait rejeté · fonds libérés", transaction.id);
        }
      }

      const approvalUpdate = db.prepare("UPDATE admin_approvals SET status = ?, approved_by = ?, decided_at = ? WHERE id = ? AND status = 'pending'").run(newStatus, adminId, decidedAt, approvalId);
      if (Number(approvalUpdate.changes) !== 1) throw new Error("Cette demande a déjà été traitée.");

      createUserNotification(
        db,
        Number(existing.requested_by),
        approve ? "success" : "warning",
        approve ? "Demande approuvée" : "Demande refusée",
        `Votre demande ${existing.action_type} liée à ${existing.target_ref} a été ${approve ? "approuvée" : "refusée"}.${cleanNote ? ` Référence : ${cleanNote}` : ""}`,
        "/history"
      );
      writeAdminAudit(db, adminId, "super_admin", "decide_approval", `approval:${approvalId}`, `Décision: ${newStatus}${cleanNote ? ` (${cleanNote})` : ""}`);

      return { success: true, status: newStatus };
    });
  },

  submitKycRequest(userId: number, documentType: string) {
    const db = getDatabase();
    const existing = db.prepare("SELECT id, status FROM kyc_cases WHERE user_id = ? AND status IN ('pending', 'under_review') ORDER BY id DESC LIMIT 1").get(userId) as any;
    if (existing) throw new Error("Un dossier KYC est deja en cours d examen. Patientez ou contactez le support.");
    const user = db.prepare("SELECT kyc_status FROM users WHERE id = ?").get(userId) as any;
    if (user?.kyc_status === "approved") throw new Error("Votre identite est deja verifiee.");
    const publicRef = "KYC-" + Date.now() + "-" + userId;
    db.prepare("INSERT INTO kyc_cases (public_ref, user_id, provider, document_type, status) VALUES (?, ?, 'manual-review', ?, 'pending')").run(publicRef, userId, documentType || "identity_card");
    db.prepare("UPDATE users SET kyc_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(userId);
    return { success: true, publicRef };
  },

  getAdminKycCases() {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT k.id, k.public_ref, k.user_id, k.provider, k.status, k.decision_reason, k.created_at,
             u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM kyc_cases k
      JOIN users u ON u.id = k.user_id
      ORDER BY CASE WHEN k.status = 'pending' THEN 0 ELSE 1 END, k.id DESC
    `).all() as any[];

    return rows.map((r) => ({
      id: r.id,
      publicRef: r.public_ref,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      userPhone: r.user_phone,
      provider: r.provider,
      status: r.status,
      decisionReason: r.decision_reason,
      createdAt: r.created_at,
    }));
  },

  reviewKycCase(caseId: number, approve: boolean, reason: string | undefined, reviewerId: number) {
    const db = getDatabase();
    const newStatus = approve ? "approved" : "rejected";
    const reviewedAt = new Date().toISOString().replace("T", " ").slice(0, 19);

    const kyc = db.prepare("SELECT user_id FROM kyc_cases WHERE id = ?").get(caseId) as any;
    if (!kyc) throw new Error("Dossier KYC introuvable");
    const current = db.prepare("SELECT status FROM kyc_cases WHERE id = ?").get(caseId) as any;
    if (current.status !== "pending") throw new Error("Ce dossier KYC a déjà été traité.");

    db.prepare(`
      UPDATE kyc_cases
      SET status = ?, decision_reason = ?, reviewed_at = ?, reviewed_by = ?
      WHERE id = ?
    `).run(newStatus, reason || (approve ? "Dossier conforme et validé" : "Dossier rejeté"), reviewedAt, reviewerId, caseId);

    db.prepare("UPDATE users SET kyc_status = ? WHERE id = ?").run(newStatus, kyc.user_id);
    createUserNotification(
      db,
      Number(kyc.user_id),
      approve ? "success" : "warning",
      approve ? "Vérification d’identité validée" : "Vérification d’identité à reprendre",
      approve
        ? "Votre vérification d’identité a été validée."
        : `Votre dossier KYC a besoin d’être corrigé. ${reason || "Consultez le support pour plus de détails."}`,
      approve ? "/settings" : "/support"
    );

    writeAdminAudit(db, reviewerId, "compliance", "review_kyc", `kyc:${caseId}`, `KYC ${newStatus} pour user ${kyc.user_id}`);

    return { success: true, status: newStatus };
  },

  getAdminAuditLogs() {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT a.id, a.admin_id AS actor_id, a.role, a.action, a.target, a.reason, a.request_id, a.created_at,
             admins.name AS actor_name
      FROM admin_audit_logs a
      LEFT JOIN admins ON admins.id = a.admin_id
      ORDER BY a.id DESC
      LIMIT 50
    `).all() as any[];

    return rows.map((r) => ({
      id: r.id,
      actorId: r.actor_id,
      actorName: r.actor_name || "Système",
      role: r.role || "system",
      action: r.action,
      target: r.target,
      reason: r.reason,
      requestId: r.request_id,
      createdAt: r.created_at,
    }));
  },

  getAdminCards() {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT c.id, c.user_id, c.label, c.masked_pan, c.card_type, c.status, c.external_balance_minor, c.created_at,
             u.name as user_name, u.email as user_email
      FROM cards c
      JOIN users u ON u.id = c.user_id
      ORDER BY c.id DESC
    `).all() as any[];

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      label: r.label,
      maskedPan: r.masked_pan,
      cardType: r.card_type,
      status: r.status,
      balanceUsd: Number(r.external_balance_minor) / 100,
      createdAt: r.created_at,
    }));
  },

  getAdminTransactions() {
    const rows = getDatabase().prepare(`
      SELECT t.id, t.public_ref, t.type, t.status, t.currency, t.amount_minor, t.fee_minor,
             t.description, t.created_at, u.id AS user_id, u.name AS user_name, u.email AS user_email,
             r.status AS review_status, r.note AS review_note, r.updated_at AS review_updated_at
      FROM ledger_transactions t
      JOIN users u ON u.id = t.created_by
      LEFT JOIN admin_transaction_reviews r ON r.transaction_id = t.id
      ORDER BY t.id DESC
      LIMIT 300
    `).all() as any[];
    return rows.map((row) => ({
      id: Number(row.id),
      publicRef: row.public_ref,
      type: row.type,
      status: row.status,
      currency: row.currency,
      amountMinor: Number(row.amount_minor),
      feeMinor: Number(row.fee_minor || 0),
      description: row.description,
      createdAt: row.created_at,
      userId: Number(row.user_id),
      userName: row.user_name,
      userEmail: row.user_email,
      reviewStatus: row.review_status || "clear",
      reviewNote: row.review_note || "",
      reviewUpdatedAt: row.review_updated_at || null,
    }));
  },

  reviewAdminTransaction(transactionId: number, status: "open" | "resolved", note: string, adminId: number) {
    const db = getDatabase();
    if (!["open", "resolved"].includes(status)) throw new Error("État d’examen invalide.");
    if (!Number.isSafeInteger(transactionId) || transactionId < 1) throw new Error("Transaction invalide.");
    if (!db.prepare("SELECT id FROM ledger_transactions WHERE id = ?").get(transactionId)) throw new Error("Transaction introuvable.");
    const cleanNote = note.trim().slice(0, 500);
    if (status === "open" && !cleanNote) throw new Error("Un motif est requis pour signaler une transaction.");
    db.prepare(`
      INSERT INTO admin_transaction_reviews (transaction_id, status, note, opened_by, resolved_by)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(transaction_id) DO UPDATE SET
        status = excluded.status,
        note = CASE WHEN excluded.note = '' THEN admin_transaction_reviews.note ELSE excluded.note END,
        resolved_by = excluded.resolved_by,
        updated_at = CURRENT_TIMESTAMP
    `).run(transactionId, status, cleanNote, adminId, status === "resolved" ? adminId : null);
    writeAdminAudit(db, adminId, "super_admin", status === "open" ? "flag_transaction" : "resolve_transaction", `transaction:${transactionId}`, cleanNote || "Examen clos");
    return { success: true, status };
  },

  getAdminSupportTickets() {
    const rows = getDatabase().prepare(`
      SELECT t.id, t.public_ref, t.transaction_ref, t.category, t.subject, t.message, t.status,
             t.priority, t.resolution, t.created_at, t.updated_at,
             u.id AS user_id, u.name AS user_name, u.email AS user_email
      FROM support_tickets t
      JOIN users u ON u.id = t.user_id
      ORDER BY CASE WHEN t.status IN ('open', 'in_progress') THEN 0 ELSE 1 END,
               CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
               t.updated_at DESC
      LIMIT 300
    `).all() as any[];
    return rows.map((row) => ({
      id: Number(row.id),
      publicRef: row.public_ref,
      transactionRef: row.transaction_ref,
      category: row.category,
      subject: row.subject,
      message: row.message,
      status: row.status,
      priority: row.priority || "normal",
      resolution: row.resolution || "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userId: Number(row.user_id),
      userName: row.user_name,
      userEmail: row.user_email,
      messages: this.getTicketMessages(Number(row.id), true),
    }));
  },

  getUserSupportTickets(userId: number) {
    const rows = getDatabase().prepare(`
      SELECT id, public_ref, transaction_ref, category, subject, message, status,
             priority, resolution, created_at, updated_at
      FROM support_tickets
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 100
    `).all(userId) as any[];
    return rows.map((row) => ({
      id: Number(row.id),
      publicRef: row.public_ref,
      transactionRef: row.transaction_ref,
      category: row.category,
      subject: row.subject,
      message: row.message,
      status: row.status,
      priority: row.priority || "normal",
      resolution: row.resolution || "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messages: this.getTicketMessages(Number(row.id), false),
    }));
  },

  getTicketMessages(ticketId: number, includeInternal = false) {
    const db = getDatabase();
    const query = includeInternal
      ? "SELECT id, ticket_id, sender_type, sender_id, sender_name, message, is_internal, created_at FROM support_ticket_messages WHERE ticket_id = ? ORDER BY id ASC"
      : "SELECT id, ticket_id, sender_type, sender_id, sender_name, message, is_internal, created_at FROM support_ticket_messages WHERE ticket_id = ? AND is_internal = 0 ORDER BY id ASC";
    const rows = db.prepare(query).all(ticketId) as any[];
    return rows.map((r) => ({
      id: Number(r.id),
      ticketId: Number(r.ticket_id),
      senderType: String(r.sender_type),
      senderId: Number(r.sender_id),
      senderName: String(r.sender_name),
      message: String(r.message),
      isInternal: Boolean(r.is_internal),
      createdAt: String(r.created_at),
    }));
  },

  addUserTicketReply(userId: number, ticketId: number, message: string) {
    const db = getDatabase();
    const ticket = db.prepare("SELECT id, user_id, public_ref, status FROM support_tickets WHERE id = ? AND user_id = ?").get(ticketId, userId) as any;
    if (!ticket) throw new Error("Ticket introuvable ou non autorisé.");
    if (ticket.status === "closed") throw new Error("Ce ticket est clôturé et n’accepte plus de réponses.");
    const cleanMessage = message.trim();
    if (cleanMessage.length < 2 || cleanMessage.length > 3000) throw new Error("Le message doit comporter entre 2 et 3 000 caractères.");
    const user = db.prepare("SELECT name FROM users WHERE id = ?").get(userId) as any;
    db.prepare(`
      INSERT INTO support_ticket_messages (ticket_id, sender_type, sender_id, sender_name, message, is_internal)
      VALUES (?, 'user', ?, ?, ?, 0)
    `).run(ticketId, userId, user?.name || "Client", cleanMessage);
    db.prepare("UPDATE support_tickets SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(ticketId);
    return { success: true };
  },

  addAdminTicketReply(adminId: number, ticketId: number, message: string, isInternal = false, nextStatus?: string, priority?: string) {
    const db = getDatabase();
    const ticket = db.prepare("SELECT id, user_id, public_ref, subject, status FROM support_tickets WHERE id = ?").get(ticketId) as any;
    if (!ticket) throw new Error("Ticket introuvable.");
    const admin = db.prepare("SELECT name, role FROM admins WHERE id = ?").get(adminId) as any;
    const cleanMessage = message.trim();
    if (cleanMessage.length < 2 || cleanMessage.length > 3000) throw new Error("Le message doit comporter entre 2 et 3 000 caractères.");
    db.prepare(`
      INSERT INTO support_ticket_messages (ticket_id, sender_type, sender_id, sender_name, message, is_internal)
      VALUES (?, 'admin', ?, ?, ?, ?)
    `).run(ticketId, adminId, admin?.name || "Support NovaPaid", cleanMessage, isInternal ? 1 : 0);
    const updates = ["updated_at = CURRENT_TIMESTAMP"];
    const params = [];
    if (nextStatus && ["open", "in_progress", "waiting_client", "resolved", "closed"].includes(nextStatus)) {
      updates.push("status = ?");
      params.push(nextStatus);
      if (["resolved", "closed"].includes(nextStatus) && !isInternal) {
        updates.push("resolution = ?");
        params.push(cleanMessage);
      }
    } else if (!isInternal) {
      updates.push("status = 'waiting_client'");
    }
    if (priority && ["low", "normal", "high", "urgent"].includes(priority)) {
      updates.push("priority = ?");
      params.push(priority);
    }
    params.push(ticketId);
    db.prepare("UPDATE support_tickets SET " + updates.join(", ") + " WHERE id = ?").run(...params);
    if (!isInternal) {
      createUserNotification(
        db,
        Number(ticket.user_id),
        "info",
        "Nouvelle réponse du support",
        `Le support a répondu à votre demande « ${ticket.subject} » (${ticket.public_ref}).`,
        "/support"
      );
    }
    writeAdminAudit(
      db,
      adminId,
      admin?.role || "super_admin",
      isInternal ? "ticket_internal_note" : "ticket_reply",
      `ticket:${ticketId}`,
      isInternal ? `Note interne: ${cleanMessage.slice(0, 100)}` : `Réponse envoyée: ${cleanMessage.slice(0, 100)}`
    );
    return { success: true };
  },

  createSupportTicket(userId: number, data: { category: string; subject: string; message: string; transactionRef?: string }) {
    const db = getDatabase();
    const allowedCategories = ["transfer", "funding", "card", "shop", "security", "other", "support"];
    const category = data.category.trim();
    let subject = data.subject.trim().replace(/\s+/g, " ");
    const message = data.message.trim();
    const transactionRef = data.transactionRef?.trim().slice(0, 100) || null;
    if (!allowedCategories.includes(category)) throw new Error("Catégorie de demande invalide.");
    if (message.length < 10 || message.length > 3000) throw new Error("Le message doit contenir entre 10 et 3 000 caractères.");
    // Subject is optional (e.g. from the floating support widget): derive one from
    // the message when empty so the conversation is always created and reaches admin.
    if (!subject) subject = message.slice(0, 60).trim();
    if (subject.length > 150) subject = subject.slice(0, 150);
    if (transactionRef) {
      const ownedTransaction = db.prepare(`
        SELECT id FROM ledger_transactions
        WHERE public_ref = ? AND (created_by = ? OR recipient_user_id = ?)
        LIMIT 1
      `).get(transactionRef, userId, userId);
      const ownedCard = db.prepare(
        "SELECT id FROM cards WHERE user_id = ? AND (masked_pan LIKE ? OR label LIKE ? OR id = ?) LIMIT 1"
      ).get(userId, '%' + transactionRef + '%', '%' + transactionRef + '%', Number(transactionRef) || 0);
      if (!ownedTransaction && !ownedCard && (transactionRef.startsWith('TRF-') || transactionRef.startsWith('TX-'))) {
        throw new Error('Cette référence ne correspond pas à une opération de votre compte.');
      }
    }
    const publicRef = `TCK-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const priority = category === "security" ? "high" : "normal";
    const inserted = db.prepare(`
      INSERT INTO support_tickets (public_ref, user_id, transaction_ref, category, subject, message, status, priority)
      VALUES (?, ?, ?, ?, ?, ?, 'open', ?)
    `).run(publicRef, userId, transactionRef, category, subject, message, priority);
    const newTicketId = Number(inserted.lastInsertRowid);
    const userRow = db.prepare("SELECT name FROM users WHERE id = ?").get(userId) as any;
    db.prepare(`
      INSERT INTO support_ticket_messages (ticket_id, sender_type, sender_id, sender_name, message, is_internal)
      VALUES (?, 'user', ?, ?, ?, 0)
    `).run(newTicketId, userId, userRow?.name || "Client", message);
    return { success: true, ticket: this.getUserSupportTickets(userId).find((ticket) => ticket.id === newTicketId) };
  },

  createTransferDispute(userId: number, transactionRef: string, reason: string) {
    const db = getDatabase();
    const cleanReason = reason.trim().slice(0, 1000);
    if (cleanReason.length < 10) throw new Error("Expliquez le problème en au moins 10 caractères.");
    const transaction = db.prepare(`
      SELECT id, public_ref FROM ledger_transactions
      WHERE public_ref = ? AND (created_by = ? OR recipient_user_id = ?) AND type = 'transfer'
    `).get(transactionRef, userId, userId) as any;
    if (!transaction) throw new Error("Transaction introuvable dans votre compte.");
    const publicRef = `TCK-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const inserted = db.prepare(`
      INSERT INTO support_tickets (public_ref, user_id, transaction_ref, category, subject, message, status, priority)
      VALUES (?, ?, ?, 'transfer', ?, ?, 'open', 'high')
    `).run(publicRef, userId, transaction.public_ref, `Contestation du transfert ${transaction.public_ref}`, cleanReason);
    return { success: true, ticketId: Number(inserted.lastInsertRowid), publicRef };
  },

  updateSupportTicket(ticketId: number, status: "open" | "in_progress" | "waiting_client" | "resolved" | "closed", resolution: string, adminId: number, priority?: "low" | "normal" | "high" | "urgent") {
    const db = getDatabase();
    if (!["open", "in_progress", "waiting_client", "resolved", "closed"].includes(status)) throw new Error("Statut de ticket invalide.");
    if (!Number.isSafeInteger(ticketId) || ticketId < 1) throw new Error("Ticket invalide.");
    const ticket = db.prepare("SELECT id, user_id, public_ref, subject FROM support_tickets WHERE id = ?").get(ticketId) as any;
    if (!ticket) throw new Error("Ticket introuvable.");
    const cleanResolution = resolution.trim().slice(0, 1000);
    if (["resolved", "closed"].includes(status) && !cleanResolution) throw new Error("Ajoutez une note de résolution avant de clôturer le ticket.");
    const updates = ["status = ?", "assigned_to = ?", "updated_at = CURRENT_TIMESTAMP"];
    const params: any[] = [status, adminId];
    if (cleanResolution) { updates.push("resolution = ?"); params.push(cleanResolution); }
    if (priority && ["low", "normal", "high", "urgent"].includes(priority)) { updates.push("priority = ?"); params.push(priority); }
    params.push(ticketId);
    db.prepare("UPDATE support_tickets SET " + updates.join(", ") + " WHERE id = ?").run(...params);
    if (status === "resolved" || status === "closed") {
      createUserNotification(
        db,
        Number(ticket.user_id),
        "success",
        "Réponse du support disponible",
        "Votre demande « " + ticket.subject + " » (" + ticket.public_ref + ") a été traitée.",
        "/support"
      );
    }
    writeAdminAudit(db, adminId, "super_admin", "update_support_ticket", "ticket:" + ticketId, status + (cleanResolution ? " · " + cleanResolution : "") + (priority ? " · priorité: " + priority : ""));
    return { success: true, status, priority };
  },

  toggleCardFreeze(cardId: number, adminId: number) {
    const db = getDatabase();
    const card = db.prepare("SELECT status, user_id, label FROM cards WHERE id = ?").get(cardId) as any;
    if (!card) throw new Error("Carte introuvable");
    if (!["active", "frozen"].includes(card.status)) throw new Error("Cette carte ne peut pas être activée ou gelée.");

    const newStatus = card.status === "frozen" ? "active" : "frozen";
    db.prepare("UPDATE cards SET status = ? WHERE id = ?").run(newStatus, cardId);
    createUserNotification(
      db,
      Number(card.user_id),
      newStatus === "frozen" ? "security" : "success",
      newStatus === "frozen" ? "Carte temporairement gelée" : "Carte réactivée",
      `${card.label} a été ${newStatus === "frozen" ? "gelée par l’administration" : "réactivée"}.`,
      "/cards"
    );

    writeAdminAudit(db, adminId, "super_admin", "toggle_card_status", `card:${cardId}`, `Statut carte modifié en ${newStatus}`);

    return { success: true, status: newStatus };
  },

  getAdminSettings() {
    const db = getDatabase();
    const rows = db.prepare("SELECT setting_key, setting_value, version, updated_at FROM app_settings").all() as any[];
    const settings: Record<string, any> = {};
    for (const r of rows) {
      if (r.setting_key === "admin_master_pin" || r.setting_key === "admin_bootstrap_applied") continue;
      try {
        settings[r.setting_key] = JSON.parse(r.setting_value);
      } catch {
        settings[r.setting_key] = r.setting_value;
      }
    }
    return settings;
  },

  updateAdminSetting(key: string, value: any, adminId: number) {
    const db = getDatabase();
    let valStr = "";
    if (key === "daily_transfer_limit_level2") {
      const limitXaf = Number(value?.limitXaf);
      if (!Number.isSafeInteger(limitXaf) || limitXaf < 5000 || limitXaf > 5000000) {
        throw new Error("Le plafond doit être compris entre 5 000 et 5 000 000 FCFA.");
      }
      valStr = JSON.stringify({ limitXaf });
    } else if (key === "platform_maintenance_mode") {
      const enabled = value?.enabled === true;
      const message = String(value?.message || "Une maintenance est en cours. Merci de réessayer dans quelques instants.").trim().slice(0, 180);
      valStr = JSON.stringify({ enabled, message });
    } else if (key === "mobile_money_fee_percent") {
      const existingRow = db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = ?").get(key) as any;
      let existingFees: any = {};
      try { existingFees = JSON.parse(existingRow?.setting_value || "{}"); } catch {}
      const fees: Record<string, number> = {};
      for (const provider of ["orange", "mtn", "wave", "card", "bank"]) {
        const candidate = Number(value?.[provider] ?? existingFees?.[provider] ?? DEFAULT_FUNDING_FEES[provider]);
        if (!Number.isFinite(candidate) || candidate < 0 || candidate > 10) {
          throw new Error("Chaque commission doit être comprise entre 0 et 10 %.");
        }
        fees[provider] = Math.round(candidate * 100) / 100;
      }
      valStr = JSON.stringify(fees);
    } else {
      throw new Error("Ce paramètre ne peut pas être modifié depuis le panneau admin.");
    }
    db.prepare(`
      INSERT INTO app_settings (setting_key, setting_value, version, updated_by)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, version = version + 1, updated_by = excluded.updated_by
    `).run(key, valStr, adminId);

    writeAdminAudit(db, adminId, "super_admin", "update_setting", `setting:${key}`, `Mise à jour paramètre ${key}`);

    return { success: true };
  },

  // ---- Runtime integration config (API keys, emails, numbers) stored in the DB ----

  // Admin view: non-secret values in clear, secret values masked.
  getIntegrationConfig() {
    return getIntegrationConfigForAdmin();
  },

  // Persist edited config into app_settings (key "cfg.<key>"). Secret fields left
  // blank are kept as-is so the admin never has to re-enter them.
  setIntegrationConfig(updates: Record<string, unknown>, adminId: number) {
    const db = getDatabase();
    const upsert = db.prepare(`
      INSERT INTO app_settings (setting_key, setting_value, version, updated_by)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, version = version + 1, updated_by = excluded.updated_by
    `);
    let changed = 0;
    for (const field of INTEGRATION_CONFIG) {
      if (!(field.key in updates)) continue;
      const raw = updates[field.key];
      const val = raw == null ? "" : String(raw).trim();
      // Keep an existing secret when the admin leaves the field blank.
      if (field.secret && val === "") continue;
      upsert.run(CONFIG_PREFIX + field.key, JSON.stringify(val), adminId);
      changed += 1;
    }
    writeAdminAudit(db, adminId, "super_admin", "update_integration_config", "config:integrations", `Mise à jour de ${changed} paramètre(s) d'intégration`);
    return { success: true, changed };
  },

  // Non-secret config exposed to the browser (contact email/number, public keys).
  getPublicConfig() {
    return readPublicConfig();
  },

  // ==========================================
  // GESTION DES AVIS CLIENTS (REVIEWS)
  // ==========================================
  getApprovedReviews() {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT id, author_name, author_location, rating, service_tag, review_text, is_verified, status, created_at
      FROM customer_reviews
      WHERE status = 'approved'
      ORDER BY id DESC
    `).all() as any[];

    return rows.map((r) => ({
      id: r.id,
      authorName: r.author_name,
      authorLocation: r.author_location,
      rating: Number(r.rating) || 5,
      serviceTag: r.service_tag,
      reviewText: r.review_text,
      isVerified: Boolean(r.is_verified),
      status: r.status,
      createdAt: r.created_at,
    }));
  },

  getAdminReviews() {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT id, author_name, author_location, rating, service_tag, review_text, is_verified, status, created_at
      FROM customer_reviews
      ORDER BY id DESC
    `).all() as any[];

    return rows.map((r) => ({
      id: r.id,
      authorName: r.author_name,
      authorLocation: r.author_location,
      rating: Number(r.rating) || 5,
      serviceTag: r.service_tag,
      reviewText: r.review_text,
      isVerified: Boolean(r.is_verified),
      status: r.status,
      createdAt: r.created_at,
    }));
  },

  addCustomerReview(data: {
    authorName: string;
    authorLocation: string;
    rating: number;
    serviceTag: string;
    reviewText: string;
    isVerified?: boolean;
    status?: string;
  }) {
    const db = getDatabase();
    const isVerified = 0;
    const status = "pending";
    const stmt = db.prepare(`
      INSERT INTO customer_reviews (author_name, author_location, rating, service_tag, review_text, is_verified, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(
      data.authorName.trim(),
      data.authorLocation.trim(),
      Math.max(1, Math.min(5, data.rating)),
      data.serviceTag.trim(),
      data.reviewText.trim(),
      isVerified,
      status
    );
    return { success: true, id: Number(res.lastInsertRowid) };
  },

  updateReviewStatus(reviewId: number, status: "approved" | "rejected" | "pending", adminId: number) {
    const db = getDatabase();
    if (!["approved", "rejected", "pending"].includes(status)) throw new Error("Statut d’avis invalide.");
    db.prepare("UPDATE customer_reviews SET status = ? WHERE id = ?").run(status, reviewId);
    writeAdminAudit(db, adminId, "super_admin", "update_review_status", `review:${reviewId}`, `Avis modéré en ${status}`);
    return { success: true, status };
  },

  deleteReview(reviewId: number, adminId: number) {
    const db = getDatabase();
    db.prepare("DELETE FROM customer_reviews WHERE id = ?").run(reviewId);
    writeAdminAudit(db, adminId, "super_admin", "delete_review", `review:${reviewId}`, `Suppression définitive avis`);
    return { success: true };
  },

  getPublicShopCatalog() {
    return shopCatalog(getDatabase(), false);
  },

  getAdminShopCatalog() {
    return shopCatalog(getDatabase(), true);
  },

  saveShopSection(data: {
    id?: number;
    name: string;
    description?: string;
    icon?: string;
    sortOrder?: number;
  }, adminId: number) {
    const db = getDatabase();
    const name = String(data.name || "").trim().replace(/\s+/g, " ").slice(0, 80);
    const description = String(data.description || "").trim().slice(0, 240);
    const icon = String(data.icon || "shopping-bag").trim().slice(0, 32) || "shopping-bag";
    const sortOrder = Number(data.sortOrder ?? 0);
    if (name.length < 2) throw new Error("Le nom de la section doit contenir au moins 2 caractères.");
    if (!Number.isSafeInteger(sortOrder) || sortOrder < 0 || sortOrder > 100_000) throw new Error("Ordre d’affichage invalide.");

    if (data.id !== undefined) {
      const id = Number(data.id);
      if (!Number.isSafeInteger(id) || id < 1) throw new Error("Section boutique invalide.");
      const existing = db.prepare("SELECT id FROM shop_sections WHERE id = ?").get(id);
      if (!existing) throw new Error("Section boutique introuvable.");
      db.prepare(`
        UPDATE shop_sections SET name = ?, description = ?, icon = ?, sort_order = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name, description, icon, sortOrder, adminId, id);
      writeAdminAudit(db, adminId, "super_admin", "update_shop_section", `shop-section:${id}`, `Section « ${name} » mise à jour`);
      return { success: true, id };
    }

    const slug = shopSlug(name);
    if (!slug) throw new Error("Le nom ne permet pas de créer un identifiant valide.");
    const result = db.prepare(`
      INSERT INTO shop_sections (slug, name, description, icon, sort_order, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(slug, name, description, icon, sortOrder, adminId, adminId);
    const id = Number(result.lastInsertRowid);
    writeAdminAudit(db, adminId, "super_admin", "create_shop_section", `shop-section:${id}`, `Section « ${name} » créée`);
    return { success: true, id };
  },

  setShopSectionStatus(sectionId: number, isActive: boolean, adminId: number) {
    const db = getDatabase();
    if (!Number.isSafeInteger(sectionId) || sectionId < 1) throw new Error("Section boutique invalide.");
    const section = db.prepare("SELECT name FROM shop_sections WHERE id = ?").get(sectionId) as any;
    if (!section) throw new Error("Section boutique introuvable.");
    db.prepare("UPDATE shop_sections SET is_active = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(isActive ? 1 : 0, adminId, sectionId);
    writeAdminAudit(db, adminId, "super_admin", "set_shop_section_status", `shop-section:${sectionId}`, `${section.name} : ${isActive ? "visible" : "masquée"}`);
    return { success: true, isActive };
  },

  deleteShopSection(sectionId: number, adminId: number) {
    const db = getDatabase();
    if (!Number.isSafeInteger(sectionId) || sectionId < 1) throw new Error("Section boutique invalide.");
    const section = db.prepare("SELECT name FROM shop_sections WHERE id = ?").get(sectionId) as any;
    if (!section) throw new Error("Section boutique introuvable.");
    const productCount = Number((db.prepare("SELECT count(*) AS count FROM shop_products WHERE section_id = ?").get(sectionId) as any)?.count || 0);
    if (productCount) throw new Error("Retirez ou déplacez d’abord les éléments de cette section.");
    db.prepare("DELETE FROM shop_sections WHERE id = ?").run(sectionId);
    writeAdminAudit(db, adminId, "super_admin", "delete_shop_section", `shop-section:${sectionId}`, `Section « ${section.name} » supprimée`);
    return { success: true };
  },

  saveShopProduct(data: {
    id?: number;
    sectionId: number;
    name: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string;
    badge?: string;
    customerLabel?: string;
    requiresPassword?: boolean;
    sortOrder?: number;
    offers: unknown;
  }, adminId: number) {
    const db = getDatabase();
    const sectionId = Number(data.sectionId);
    const name = String(data.name || "").trim().replace(/\s+/g, " ").slice(0, 80);
    const subtitle = String(data.subtitle || "").trim().slice(0, 120);
    const description = String(data.description || "").trim().slice(0, 500);
    const imageUrl = String(data.imageUrl || "").trim().slice(0, 500);
    const badge = String(data.badge || "").trim().slice(0, 40);
    const customerLabel = String(data.customerLabel || "Identifiant du compte").trim().slice(0, 60) || "Identifiant du compte";
    const sortOrder = Number(data.sortOrder ?? 0);
    const offers = cleanShopOffers(data.offers);
    if (!Number.isSafeInteger(sectionId) || sectionId < 1 || !db.prepare("SELECT id FROM shop_sections WHERE id = ?").get(sectionId)) {
      throw new Error("Choisissez une section existante.");
    }
    if (name.length < 2) throw new Error("Le nom de l’élément doit contenir au moins 2 caractères.");
    if (!Number.isSafeInteger(sortOrder) || sortOrder < 0 || sortOrder > 100_000) throw new Error("Ordre d’affichage invalide.");
    if (imageUrl && !(imageUrl.startsWith("/") && !imageUrl.startsWith("//") && !imageUrl.includes("..")) && !/^https:\/\/[^\s]+$/i.test(imageUrl)) {
      throw new Error("L’image doit utiliser un chemin du site ou une adresse HTTPS.");
    }

    if (data.id !== undefined) {
      const id = Number(data.id);
      if (!Number.isSafeInteger(id) || id < 1) throw new Error("Élément boutique invalide.");
      const existing = db.prepare("SELECT id, slug FROM shop_products WHERE id = ?").get(id) as any;
      if (!existing) throw new Error("Élément boutique introuvable.");
      const slug = shopSlug(name) || existing.slug;
      db.prepare(`
        UPDATE shop_products SET section_id = ?, slug = ?, name = ?, subtitle = ?, description = ?, image_url = ?, badge = ?,
          customer_label = ?, requires_password = ?, offers_json = ?, sort_order = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(sectionId, slug, name, subtitle, description, imageUrl, badge, customerLabel, data.requiresPassword ? 1 : 0, JSON.stringify(offers), sortOrder, adminId, id);
      writeAdminAudit(db, adminId, "super_admin", "update_shop_product", `shop-product:${id}`, `Élément « ${name} » mis à jour`);
      return { success: true, id };
    }

    const slug = shopSlug(name);
    if (!slug) throw new Error("Le nom ne permet pas de créer un identifiant valide.");
    const result = db.prepare(`
      INSERT INTO shop_products (
        section_id, slug, name, subtitle, description, image_url, badge, customer_label,
        requires_password, offers_json, sort_order, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sectionId, slug, name, subtitle, description, imageUrl, badge, customerLabel, data.requiresPassword ? 1 : 0, JSON.stringify(offers), sortOrder, adminId, adminId);
    const id = Number(result.lastInsertRowid);
    writeAdminAudit(db, adminId, "super_admin", "create_shop_product", `shop-product:${id}`, `Élément « ${name} » créé`);
    return { success: true, id };
  },

  setShopProductStatus(productId: number, isActive: boolean, adminId: number) {
    const db = getDatabase();
    if (!Number.isSafeInteger(productId) || productId < 1) throw new Error("Élément boutique invalide.");
    const product = db.prepare("SELECT name FROM shop_products WHERE id = ?").get(productId) as any;
    if (!product) throw new Error("Élément boutique introuvable.");
    db.prepare("UPDATE shop_products SET is_active = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(isActive ? 1 : 0, adminId, productId);
    writeAdminAudit(db, adminId, "super_admin", "set_shop_product_status", `shop-product:${productId}`, `${product.name} : ${isActive ? "visible" : "masqué"}`);
    return { success: true, isActive };
  },

  deleteShopProduct(productId: number, adminId: number) {
    const db = getDatabase();
    if (!Number.isSafeInteger(productId) || productId < 1) throw new Error("Élément boutique invalide.");
    const product = db.prepare("SELECT name FROM shop_products WHERE id = ?").get(productId) as any;
    if (!product) throw new Error("Élément boutique introuvable.");
    db.prepare("DELETE FROM shop_products WHERE id = ?").run(productId);
    writeAdminAudit(db, adminId, "super_admin", "delete_shop_product", `shop-product:${productId}`, `Élément « ${product.name} » supprimé`);
    return { success: true };
  },

  // ==========================================
  // SÉCURITÉ ADMIN & TABLE DÉDIÉE ADMINS
  // ==========================================
  getAdminAccounts() {
    const db = getDatabase();
    try {
      const rows = db.prepare("SELECT id, name, email, phone, role, permissions, status, last_login_at, created_at FROM admins ORDER BY id ASC").all() as any[];
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone || "Non renseigné",
        role: r.role,
        permissions: r.permissions,
        status: r.status,
        lastLoginAt: r.last_login_at,
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  },

  createAdminAccount(data: { name: string; email: string; phone?: string; role: string; password: string }, actingAdminId: number) {
    const db = getDatabase();
    const allowedRoles = ["super_admin", "compliance", "operator"];
    const name = data.name.trim().replace(/\s+/g, " ").slice(0, 100);
    const email = data.email.trim().toLowerCase();
    const phone = data.phone?.trim().slice(0, 32) || null;
    const password = data.password;
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      throw new Error("Nom ou adresse email invalide.");
    }
    if (!allowedRoles.includes(data.role)) throw new Error("Rôle administrateur invalide.");
    if (password.length < 10 || password.length > 200) throw new Error("Le mot de passe administrateur doit contenir entre 10 et 200 caractères.");
    if (db.prepare("SELECT id FROM admins WHERE lower(email) = ? UNION ALL SELECT id FROM users WHERE lower(email) = ? LIMIT 1").get(email, email)) {
      throw new Error("Cette adresse email est déjà utilisée.");
    }

    const permissions: Record<string, string> = {
      super_admin: "all",
      compliance: "kyc,audit,reviews",
      operator: "reviews,support,approvals",
    };
    const result = withImmediateTransaction(db, () => db.prepare(`
      INSERT INTO admins (name, email, phone, role, password_hash, permissions, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(name, email, phone, data.role, hashSecret(password), permissions[data.role]));
    const adminId = Number(result.lastInsertRowid);
    writeAdminAudit(db, actingAdminId, "super_admin", "create_admin_account", `admin:${adminId}`, `Compte ${data.role} créé`);
    return { success: true, admin: this.getAdminAccounts().find((account) => account.id === adminId) };
  },

  updateAdminAccount(targetAdminId: number, role: string, status: string, actingAdminId: number, newPassword?: string) {
    const db = getDatabase();
    const allowedRoles = ["super_admin", "compliance", "operator"];
    if (!Number.isSafeInteger(targetAdminId) || targetAdminId < 1) throw new Error("Compte administrateur invalide.");
    if (!allowedRoles.includes(role) || !["active", "suspended"].includes(status)) throw new Error("Rôle ou statut invalide.");
    if (targetAdminId === actingAdminId && (role !== "super_admin" || status !== "active")) throw new Error("Vous ne pouvez pas retirer votre propre accès administrateur.");
    const target = db.prepare("SELECT id, role, status FROM admins WHERE id = ?").get(targetAdminId) as any;
    if (!target) throw new Error("Compte administrateur introuvable.");
    const cleanPassword = newPassword;
    if (cleanPassword && (cleanPassword.length < 10 || cleanPassword.length > 200)) throw new Error("Le mot de passe doit contenir entre 10 et 200 caractères.");

    if (target.role === "super_admin" && (role !== "super_admin" || status !== "active")) {
      const alternatives = db.prepare("SELECT count(*) AS c FROM admins WHERE id <> ? AND role = 'super_admin' AND status = 'active'").get(targetAdminId) as any;
      if (Number(alternatives?.c || 0) === 0) throw new Error("Il doit rester au moins un super administrateur actif.");
    }

    const permissions: Record<string, string> = {
      super_admin: "all",
      compliance: "kyc,audit,reviews",
      operator: "reviews,support,approvals",
    };
    if (cleanPassword) {
      db.prepare("UPDATE admins SET role = ?, permissions = ?, status = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(role, permissions[role], status, hashSecret(cleanPassword), targetAdminId);
    } else {
      db.prepare("UPDATE admins SET role = ?, permissions = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(role, permissions[role], status, targetAdminId);
    }
    if (status !== "active" || cleanPassword || target.role !== role) {
      db.prepare("DELETE FROM admin_sessions WHERE admin_id = ?").run(targetAdminId);
    }
    writeAdminAudit(db, actingAdminId, "super_admin", "update_admin_account", `admin:${targetAdminId}`, `Rôle ${role}, statut ${status}`);
    return { success: true, role, status, permissions: permissions[role] };
  },

  // ============================================================
  // PASSWORD RESET (PrismCard parity)
  // ============================================================

  createPasswordResetToken(email: string) {
    const db = getDatabase();
    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare("SELECT id, name, email FROM users WHERE lower(email) = ? AND status = 'active'").get(cleanEmail) as any;
    if (!user) return { success: true, message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." };
    // Invalider les anciens tokens
    db.prepare("UPDATE password_reset_tokens SET used = 1 WHERE email = ? AND used = 0").run(cleanEmail);
    const token = randomBytes(32).toString("base64url");
    const hashedToken = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " "); // 1h
    db.prepare(`
      INSERT INTO password_reset_tokens (email, token, expires_at)
      VALUES (?, ?, ?)
    `).run(cleanEmail, hashedToken, expiresAt);
    return { success: true, token, email: cleanEmail, userName: user.name, message: "Lien de réinitialisation créé." };
  },

  resetPassword(token: string, newPassword: string) {
    const db = getDatabase();
    if (!token || newPassword.length < 10 || newPassword.length > 200) {
      throw new Error("Token invalide ou mot de passe non conforme (10-200 caractères).");
    }
    const hashedToken = createHash("sha256").update(token).digest("hex");
    return withImmediateTransaction(db, () => {
      const row = db.prepare(`
        SELECT id, email FROM password_reset_tokens
        WHERE token = ? AND used = 0 AND expires_at > datetime('now')
      `).get(hashedToken) as any;
      if (!row) throw new Error("Ce lien de réinitialisation est invalide ou a expiré.");
      db.prepare("UPDATE password_reset_tokens SET used = 1 WHERE id = ?").run(row.id);
      const user = db.prepare("SELECT id FROM users WHERE lower(email) = ? AND status = 'active'").get(row.email) as any;
      if (!user) throw new Error("Compte introuvable.");
      db.prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(hashSecret(newPassword), user.id);
      db.prepare("DELETE FROM user_sessions WHERE user_id = ?").run(user.id);
      db.prepare(`
        INSERT INTO user_activity_logs (user_id, action, details, request_id)
        VALUES (?, 'password_reset', 'Mot de passe réinitialisé via lien', ?)
      `).run(user.id, randomBytes(16).toString("hex"));
      createUserNotification(db, user.id, "security", "Mot de passe modifié", "Votre mot de passe a été réinitialisé. Si ce n'est pas vous, contactez le support immédiatement.", "/support");
      return { success: true, message: "Mot de passe réinitialisé avec succès. Connectez-vous avec votre nouveau mot de passe." };
    });
  },

  // ============================================================
  // OTP VERIFICATION CODES (PrismCard parity)
  // ============================================================

  createVerificationCode(userId: number, type: "registration" | "login" | "card_verification" | "email_change" | "password_reset" = "login", channel: "email" | "sms" = "email") {
    const db = getDatabase();
    // Plafond anti-abus : au plus 3 codes envoyés par email pour un même type.
    // À la 4e demande, on verrouille 30 min. checkAuthRateLimit renvoie le temps
    // d'attente restant (en secondes) pour alimenter le décompte affiché au
    // client. Le compteur est remis à zéro dès qu'un code est validé (verifyCode).
    const retryAfter = this.checkAuthRateLimit(`vcode:${type}:${userId}`, 4, 30 * 60 * 1000, 30 * 60 * 1000);
    if (retryAfter) {
      const minutes = Math.max(1, Math.ceil(retryAfter / 60));
      const err: any = new Error(`Limite de 3 codes atteinte. Réessayez dans ${minutes} min.`);
      err.retryAfter = retryAfter;
      throw err;
    }
    // Invalider les anciens codes non utilisés du même type
    db.prepare("UPDATE verification_codes SET used = 1 WHERE user_id = ? AND type = ? AND used = 0").run(userId, type);
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace("T", " "); // 10 min
    db.prepare(`
      INSERT INTO verification_codes (user_id, code, type, channel, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, code, type, channel, expiresAt);
    return { success: true, code, expiresAt };
  },

  verifyCode(userId: number, code: string, type: string) {
    const db = getDatabase();
    const cleanCode = code.trim();
    if (!/^\d{6}$/.test(cleanCode)) throw new Error("Le code de vérification doit contenir 6 chiffres.");
    return withImmediateTransaction(db, () => {
      const row = db.prepare(`
        SELECT id, attempts FROM verification_codes
        WHERE user_id = ? AND type = ? AND used = 0 AND expires_at > datetime('now')
        ORDER BY created_at DESC LIMIT 1
      `).get(userId, type) as any;
      if (!row) throw new Error("Code de vérification expiré ou invalide. Demandez un nouveau code.");
      if (row.attempts >= 5) {
        db.prepare("UPDATE verification_codes SET used = 1 WHERE id = ?").run(row.id);
        throw new Error("Trop de tentatives. Demandez un nouveau code.");
      }
      const stored = db.prepare("SELECT code FROM verification_codes WHERE id = ?").get(row.id) as any;
      if (stored.code !== cleanCode) {
        db.prepare("UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?").run(row.id);
        throw new Error("Code incorrect. Vérifiez et réessayez.");
      }
      db.prepare("UPDATE verification_codes SET used = 1 WHERE id = ?").run(row.id);
      // Code validé : on libère le plafond de 3 codes pour ce type (pas de verrou
      // résiduel pour un utilisateur qui a réussi sa vérification).
      this.clearAuthRateLimit(`vcode:${type}:${userId}`);
      return { success: true, message: "Code vérifié avec succès." };
    });
  },

  // ============================================================
  // EMAIL VERIFICATION (PrismCard parity)
  // ============================================================

  verifyEmail(userId: number) {
    const db = getDatabase();
    db.prepare("UPDATE users SET email_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND email_verified_at IS NULL").run(userId);
    db.prepare(`
      INSERT INTO user_activity_logs (user_id, action, details, request_id)
      VALUES (?, 'email_verified', 'Adresse email vérifiée', ?)
    `).run(userId, randomBytes(16).toString("hex"));
    createUserNotification(db, userId, "success", "Email vérifié", "Votre adresse email a été vérifiée avec succès.");
    return { success: true };
  },

  isEmailVerified(userId: number): boolean {
    const row = getDatabase().prepare("SELECT email_verified_at FROM users WHERE id = ?").get(userId) as any;
    return !!row?.email_verified_at;
  },

  // ============================================================
  // TRUSTED DEVICES (PrismCard parity)
  // ============================================================

  addTrustedDevice(userId: number, fingerprint: string, meta: { name?: string; browser?: string; os?: string; ip?: string }) {
    const db = getDatabase();
    const existing = db.prepare("SELECT id FROM trusted_devices WHERE user_id = ? AND device_fingerprint = ?").get(userId, fingerprint) as any;
    if (existing) {
      db.prepare("UPDATE trusted_devices SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?").run(existing.id);
      return { success: true, deviceId: existing.id, isNew: false };
    }
    const result = db.prepare(`
      INSERT INTO trusted_devices (user_id, device_fingerprint, device_name, browser, os, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, fingerprint, meta.name || null, meta.browser || null, meta.os || null, meta.ip || null);
    return { success: true, deviceId: Number(result.lastInsertRowid), isNew: true };
  },

  isTrustedDevice(userId: number, fingerprint: string): boolean {
    const row = getDatabase().prepare("SELECT id FROM trusted_devices WHERE user_id = ? AND device_fingerprint = ?").get(userId, fingerprint) as any;
    if (row) {
      getDatabase().prepare("UPDATE trusted_devices SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.id);
      return true;
    }
    return false;
  },

  listTrustedDevices(userId: number) {
    return getDatabase().prepare(`
      SELECT id, device_name, browser, os, ip_address, last_used_at, created_at
      FROM trusted_devices WHERE user_id = ? ORDER BY last_used_at DESC
    `).all(userId) as any[];
  },

  removeTrustedDevice(userId: number, deviceId: number) {
    getDatabase().prepare("DELETE FROM trusted_devices WHERE id = ? AND user_id = ?").run(deviceId, userId);
    return { success: true };
  },

  removeAllTrustedDevices(userId: number) {
    getDatabase().prepare("DELETE FROM trusted_devices WHERE user_id = ?").run(userId);
    return { success: true };
  },

  // ============================================================
  // PIN LOCK (PrismCard parity – enrichi)
  // ============================================================

  verifyUserPin(userId: number, pin: string): boolean {
    const db = getDatabase();
    const user = db.prepare("SELECT pin_hash, pin_attempts, pin_locked_until FROM users WHERE id = ?").get(userId) as any;
    if (!user?.pin_hash) throw new Error("Aucun code PIN configuré.");
    if (user.pin_locked_until && new Date(user.pin_locked_until) > new Date()) {
      throw new Error("Compte PIN verrouillé. Réessayez plus tard.");
    }
    if (!verifySecret(pin, user.pin_hash)) {
      const attempts = (user.pin_attempts || 0) + 1;
      if (attempts >= 5) {
        const lockUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
        db.prepare("UPDATE users SET pin_attempts = ?, pin_locked_until = ? WHERE id = ?").run(attempts, lockUntil, userId);
        throw new Error("Trop de tentatives. PIN verrouillé pendant 30 minutes.");
      }
      db.prepare("UPDATE users SET pin_attempts = ? WHERE id = ?").run(attempts, userId);
      throw new Error(`Code PIN incorrect. ${5 - attempts} tentatives restantes.`);
    }
    db.prepare("UPDATE users SET pin_attempts = 0, pin_locked_until = NULL WHERE id = ?").run(userId);
    return true;
  },

  // ============================================================
  // PENDING REGISTRATION (PrismCard parity)
  // ============================================================

  createPendingRegistration(data: { email: string; name: string; phone: string; password: string; referralCode?: string; country?: string; ip?: string }) {
    const db = getDatabase();
    const cleanEmail = data.email.trim().toLowerCase();
    // Vérifier les doublons
    const existing = db.prepare("SELECT id FROM users WHERE lower(email) = ?").get(cleanEmail) as any;
    if (existing) throw new Error("Cette adresse email est déjà associée à un compte.");
    // Supprimer les anciennes inscriptions en attente pour cet email
    db.prepare("DELETE FROM pending_registrations WHERE email = ?").run(cleanEmail);
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " "); // 2h
    db.prepare(`
      INSERT INTO pending_registrations (email, name, phone, password_hash, verification_code, referral_code, country, ip_address, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(cleanEmail, data.name.trim(), normalizePhone(data.phone) || null, hashSecret(data.password), code, data.referralCode || null, data.country || null, data.ip || null, expiresAt);
    return { success: true, code, email: cleanEmail };
  },

  completePendingRegistration(email: string, code: string, context: { ipAddress?: string | null; userAgent?: string | null } = {}) {
    const db = getDatabase();
    const cleanEmail = email.trim().toLowerCase();
    return withImmediateTransaction(db, () => {
      const pending = db.prepare(`
        SELECT * FROM pending_registrations WHERE email = ? AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1
      `).get(cleanEmail) as any;
      if (!pending) throw new Error("Inscription expirée. Veuillez recommencer.");
      if (pending.verification_code !== code.trim()) throw new Error("Code de vérification incorrect.");
      // Créer l'utilisateur
      const inserted = db.prepare(`
        INSERT INTO users (name, email, phone, password_hash, role, status, kyc_status, email_verified_at, referred_by, country)
        VALUES (?, ?, ?, ?, 'customer', 'active', 'not_started', CURRENT_TIMESTAMP, ?, ?)
      `).run(pending.name, pending.email, pending.phone, pending.password_hash,
        pending.referral_code ? (() => {
          const referrer = db.prepare("SELECT user_id FROM resellers WHERE referral_code = ? AND status = 'active'").get(pending.referral_code) as any;
          return referrer?.user_id || null;
        })() : null,
        pending.country);
      const userId = Number(inserted.lastInsertRowid);
      // Créer le wallet
      const accountKey = `WLT_${userId}_${randomBytes(6).toString("hex").toUpperCase()}`;
      db.prepare(`
        INSERT INTO wallets (account_key, user_id, currency, account_type, label, available_minor, reserved_minor, status)
        VALUES (?, ?, 'XAF', 'customer', 'Compte principal', 0, 0, 'active')
      `).run(accountKey, userId);
      // Créer les settings utilisateur
      db.prepare("INSERT INTO user_settings (user_id) VALUES (?)").run(userId);
      // Créer la session
      const sessionToken = makeSessionToken();
      db.prepare(`
        INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, digestToken(sessionToken), context.ipAddress || null, context.userAgent || null, sqlDateAfterHours(USER_SESSION_HOURS));
      // Log + notification
      db.prepare(`
        INSERT INTO user_activity_logs (user_id, action, details, request_id)
        VALUES (?, 'register_account', 'Création du compte avec vérification email', ?)
      `).run(userId, randomBytes(16).toString("hex"));
      createUserNotification(db, userId, "success", "Bienvenue sur NovaPaid", "Votre compte et votre portefeuille sont prêts.", "/dashboard");
      // Supprimer la pending registration
      db.prepare("DELETE FROM pending_registrations WHERE email = ?").run(cleanEmail);
      // Track reseller referral
      if (pending.referral_code) {
        const reseller = db.prepare("SELECT id, user_id FROM resellers WHERE referral_code = ? AND status = 'active'").get(pending.referral_code) as any;
        if (reseller) {
          db.prepare(`
            UPDATE reseller_link_clicks SET converted = 1, converted_user_id = ?
            WHERE reseller_id = ? AND converted = 0 AND ip_address = ?
            ORDER BY created_at DESC LIMIT 1
          `).run(userId, reseller.user_id, pending.ip_address);
        }
      }
      return {
        success: true,
        user: { id: userId, name: pending.name, email: pending.email, phone: pending.phone, role: "customer", status: "active", kycStatus: "not_started" },
        wallet: { accountKey, currency: "XAF", availableMinor: 0, reservedMinor: 0, reservedXaf: 0, balanceXaf: 0 },
        sessionToken,
      };
    });
  },

  cleanExpiredPendingRegistrations() {
    getDatabase().prepare("DELETE FROM pending_registrations WHERE expires_at <= datetime('now')").run();
  },

  // ============================================================
  // IDENTITY VERIFICATION (PrismCard parity)
  // ============================================================

  submitIdentityVerification(userId: number, data: { documentType: string; frontImage: string; backImage?: string; selfieImage?: string }) {
    const db = getDatabase();
    const existing = db.prepare("SELECT id FROM identity_verifications WHERE user_id = ? AND status = 'pending'").get(userId) as any;
    if (existing) throw new Error("Une vérification est déjà en cours.");
    db.prepare(`
      INSERT INTO identity_verifications (user_id, document_type, front_image, back_image, selfie_image, status, submitted_at)
      VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `).run(userId, data.documentType, data.frontImage, data.backImage || null, data.selfieImage || null);
    db.prepare("UPDATE users SET kyc_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(userId);
    createUserNotification(db, userId, "info", "Vérification soumise", "Votre demande de vérification d'identité est en cours d'examen.");
    return { success: true };
  },

  // ============================================================
  // EXCHANGE RATES (PrismCard parity)
  // ============================================================

  getExchangeRates() {
    return getDatabase().prepare("SELECT * FROM exchange_rates WHERE is_active = 1 ORDER BY display_order, id").all() as any[];
  },

  getExchangeRate(fromCurrency: string, toCurrency: string): number | null {
    const row = getDatabase().prepare(
      "SELECT rate FROM exchange_rates WHERE from_currency = ? AND to_currency = ? AND is_active = 1"
    ).get(fromCurrency.toUpperCase(), toCurrency.toUpperCase()) as any;
    return row ? Number(row.rate) : null;
  },

  // ============================================================
  // FEE CALCULATIONS (PrismCard parity)
  // ============================================================

  calculateCardCreationFee(amountMinor: number, currency: string = "XAF") {
    const db = getDatabase();
    const fee = db.prepare("SELECT * FROM card_fees WHERE type = 'creation' AND is_active = 1 AND currency = ? ORDER BY id LIMIT 1").get(currency) as any;
    if (!fee) return 0;
    let total = fee.fixed_amount || 0;
    if (fee.percentage > 0) total += (amountMinor / 100) * fee.percentage;
    if (fee.min_charge && total < fee.min_charge) total = fee.min_charge;
    if (fee.max_charge && total > fee.max_charge) total = fee.max_charge;
    return Math.round(total);
  },

  calculateCardReloadFee(amount: number) {
    const fee = getDatabase().prepare("SELECT * FROM card_reload_fees WHERE is_active = 1 ORDER BY id LIMIT 1").get() as any;
    if (!fee) return 0;
    let total = fee.fixed_amount || 0;
    if (fee.percentage_rate > 0) total += amount * (fee.percentage_rate / 100);
    return Math.round(total);
  },

  calculateCardWithdrawalFee(amount: number) {
    const fee = getDatabase().prepare("SELECT * FROM card_withdrawal_fees WHERE is_active = 1 ORDER BY id LIMIT 1").get() as any;
    if (!fee) return 0;
    let total = fee.fixed_amount || 0;
    if (fee.percentage_rate > 0) total += amount * (fee.percentage_rate / 100);
    return Math.round(total);
  },

  calculateTransferFee(amount: number) {
    const fee = getDatabase().prepare("SELECT * FROM transfer_fees WHERE is_active = 1 ORDER BY id LIMIT 1").get() as any;
    if (!fee) return 0;
    let total = fee.fixed_amount || 0;
    if (fee.percentage_rate > 0) total += amount * (fee.percentage_rate / 100);
    return Math.round(total);
  },

  // ============================================================
  // API KEYS / PAYMENT PROVIDERS (PrismCard parity)
  // ============================================================

  getActivePaymentProviders(type?: string) {
    const db = getDatabase();
    let query = "SELECT * FROM api_keys WHERE is_active = 1";
    if (type === "marketplace") query += " AND marketplace_enabled = 1";
    else if (type === "shop") query += " AND shop_enabled = 1";
    query += " ORDER BY display_order, id";
    return db.prepare(query).all() as any[];
  },

  getPaymentProvider(provider: string) {
    return getDatabase().prepare("SELECT * FROM api_keys WHERE provider = ? AND is_active = 1").get(provider) as any;
  },

  // ============================================================
  // USER SETTINGS (PrismCard parity)
  // ============================================================

  getUserSettings(userId: number) {
    const db = getDatabase();
    let settings = db.prepare("SELECT * FROM user_settings WHERE user_id = ?").get(userId) as any;
    if (!settings) {
      db.prepare("INSERT INTO user_settings (user_id) VALUES (?)").run(userId);
      settings = db.prepare("SELECT * FROM user_settings WHERE user_id = ?").get(userId);
    }
    return settings;
  },

  updateUserSettings(userId: number, data: Partial<{ currency: string; notification_email: number; notification_push: number; two_factor_auth: number; dark_mode: number; language: string }>) {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (["currency", "notification_email", "notification_push", "two_factor_auth", "dark_mode", "language"].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return { success: true };
    values.push(userId);
    // Ensure settings row exists
    this.getUserSettings(userId);
    db.prepare(`UPDATE user_settings SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`).run(...values);
    return { success: true };
  },

  // ============================================================
  // ACTIVITY TRACKING (PrismCard parity)
  // ============================================================

  trackActivity(data: { userId?: number; action: string; details?: string; ip?: string; userAgent?: string; method?: string; url?: string; country?: string }) {
    getDatabase().prepare(`
      INSERT INTO activities (user_id, action, details, ip_address, user_agent, method, url, country)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.userId || null, data.action, data.details || null, data.ip || null, data.userAgent || null, data.method || null, data.url || null, data.country || null);
  },

  getActivities(options: { userId?: number; limit?: number; offset?: number } = {}) {
    const db = getDatabase();
    const limit = Math.min(options.limit || 50, 200);
    const offset = options.offset || 0;
    if (options.userId) {
      return db.prepare("SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?").all(options.userId, limit, offset) as any[];
    }
    return db.prepare("SELECT * FROM activities ORDER BY created_at DESC LIMIT ? OFFSET ?").all(limit, offset) as any[];
  },

  // ============================================================
  // ENRICHED USER PROFILE (PrismCard parity)
  // ============================================================

  updateUserProfileExtended(userId: number, data: Partial<{
    first_name: string; last_name: string; date_of_birth: string;
    address: string; city: string; country: string; postal_code: string;
    profile_photo: string; state: string;
  }>) {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    const allowed = ["first_name", "last_name", "date_of_birth", "address", "city", "country", "postal_code", "profile_photo", "state"];
    for (const [key, value] of Object.entries(data)) {
      if (allowed.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(typeof value === "string" ? value.trim().slice(0, 200) : value);
      }
    }
    if (fields.length === 0) return { success: true };
    values.push(userId);
    db.prepare(`UPDATE users SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    return { success: true };
  },

  getUserProfileExtended(userId: number) {
    return getDatabase().prepare(`
      SELECT id, name, first_name, last_name, email, phone, role, status,
             profile_photo, date_of_birth, address, city, country, postal_code, state,
             email_verified_at, kyc_status, kyc_data, tier_level, mfa_enabled,
             is_reseller, reseller_code, terms_accepted_at, privacy_accepted_at,
             pwa_installed_at, created_at, updated_at
      FROM users WHERE id = ?
    `).get(userId) as any;
  },

  // ============================================================
  // ADMIN CRUD — CARD FEES
  // ============================================================

  getAllCardFees() {
    return getDatabase().prepare("SELECT * FROM card_fees ORDER BY type, id").all() as any[];
  },

  getCardFeeById(id: number) {
    return getDatabase().prepare("SELECT * FROM card_fees WHERE id = ?").get(id) as any;
  },

  createCardFee(data: { name: string; type: string; currency: string; fixed_amount: number; percentage: number; min_charge: number; max_charge?: number; description?: string }) {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO card_fees (name, type, currency, fixed_amount, percentage, min_charge, max_charge, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.name, data.type, data.currency || "XAF", data.fixed_amount || 0, data.percentage || 0, data.min_charge || 0, data.max_charge || null, data.description || null);
    return { success: true };
  },

  updateCardFee(id: number, data: Partial<{ name: string; type: string; currency: string; fixed_amount: number; percentage: number; min_charge: number; max_charge: number; is_active: number; description: string }>) {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    const allowed = ["name", "type", "currency", "fixed_amount", "percentage", "min_charge", "max_charge", "is_active", "description"];
    for (const [key, value] of Object.entries(data)) {
      if (allowed.includes(key)) { fields.push(`${key} = ?`); values.push(value); }
    }
    if (fields.length === 0) return { success: true };
    values.push(id);
    db.prepare(`UPDATE card_fees SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    return { success: true };
  },

  deleteCardFee(id: number) {
    getDatabase().prepare("DELETE FROM card_fees WHERE id = ?").run(id);
    return { success: true };
  },

  // ============================================================
  // ADMIN CRUD — CARD RELOAD FEES
  // ============================================================

  getAllCardReloadFees() {
    return getDatabase().prepare("SELECT * FROM card_reload_fees ORDER BY id").all() as any[];
  },

  createCardReloadFee(data: { fixed_amount: number; percentage_rate: number; min_amount: number; max_amount?: number }, adminId: number) {
    getDatabase().prepare(`
      INSERT INTO card_reload_fees (fixed_amount, percentage_rate, min_amount, max_amount, last_modified_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.fixed_amount || 0, data.percentage_rate || 0, data.min_amount || 0, data.max_amount || null, adminId);
    return { success: true };
  },

  updateCardReloadFee(id: number, data: Partial<{ fixed_amount: number; percentage_rate: number; min_amount: number; max_amount: number; is_active: number }>, adminId: number) {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (["fixed_amount", "percentage_rate", "min_amount", "max_amount", "is_active"].includes(key)) { fields.push(`${key} = ?`); values.push(value); }
    }
    if (fields.length === 0) return { success: true };
    fields.push("last_modified_by = ?");
    values.push(adminId, id);
    db.prepare(`UPDATE card_reload_fees SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    return { success: true };
  },

  deleteCardReloadFee(id: number) {
    getDatabase().prepare("DELETE FROM card_reload_fees WHERE id = ?").run(id);
    return { success: true };
  },

  // ============================================================
  // ADMIN CRUD — CARD WITHDRAWAL FEES
  // ============================================================

  getAllCardWithdrawalFees() {
    return getDatabase().prepare("SELECT * FROM card_withdrawal_fees ORDER BY id").all() as any[];
  },

  createCardWithdrawalFee(data: { fixed_amount: number; percentage_rate: number; min_amount: number; max_amount?: number }, adminId: number) {
    getDatabase().prepare(`
      INSERT INTO card_withdrawal_fees (fixed_amount, percentage_rate, min_amount, max_amount, last_modified_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.fixed_amount || 0, data.percentage_rate || 0, data.min_amount || 0, data.max_amount || null, adminId);
    return { success: true };
  },

  updateCardWithdrawalFee(id: number, data: Partial<{ fixed_amount: number; percentage_rate: number; min_amount: number; max_amount: number; is_active: number }>, adminId: number) {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (["fixed_amount", "percentage_rate", "min_amount", "max_amount", "is_active"].includes(key)) { fields.push(`${key} = ?`); values.push(value); }
    }
    if (fields.length === 0) return { success: true };
    fields.push("last_modified_by = ?");
    values.push(adminId, id);
    db.prepare(`UPDATE card_withdrawal_fees SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    return { success: true };
  },

  deleteCardWithdrawalFee(id: number) {
    getDatabase().prepare("DELETE FROM card_withdrawal_fees WHERE id = ?").run(id);
    return { success: true };
  },

  // ============================================================
  // ADMIN CRUD — TRANSFER FEES
  // ============================================================

  getAllTransferFees() {
    return getDatabase().prepare("SELECT * FROM transfer_fees ORDER BY id").all() as any[];
  },

  createTransferFee(data: { fixed_amount: number; percentage_rate: number; min_amount: number; max_amount?: number }, adminId: number) {
    getDatabase().prepare(`
      INSERT INTO transfer_fees (fixed_amount, percentage_rate, min_amount, max_amount, last_modified_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.fixed_amount || 0, data.percentage_rate || 0, data.min_amount || 0, data.max_amount || null, adminId);
    return { success: true };
  },

  updateTransferFee(id: number, data: Partial<{ fixed_amount: number; percentage_rate: number; min_amount: number; max_amount: number; is_active: number }>, adminId: number) {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (["fixed_amount", "percentage_rate", "min_amount", "max_amount", "is_active"].includes(key)) { fields.push(`${key} = ?`); values.push(value); }
    }
    if (fields.length === 0) return { success: true };
    fields.push("last_modified_by = ?");
    values.push(adminId, id);
    db.prepare(`UPDATE transfer_fees SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    return { success: true };
  },

  deleteTransferFee(id: number) {
    getDatabase().prepare("DELETE FROM transfer_fees WHERE id = ?").run(id);
    return { success: true };
  },

  // ============================================================
  // ADMIN CRUD — EXCHANGE RATES
  // ============================================================

  getAllExchangeRates() {
    return getDatabase().prepare("SELECT * FROM exchange_rates ORDER BY display_order, id").all() as any[];
  },

  getExchangeRateById(id: number) {
    return getDatabase().prepare("SELECT * FROM exchange_rates WHERE id = ?").get(id) as any;
  },

  createExchangeRate(data: { from_currency: string; to_currency: string; rate: number; fee_percentage?: number; display_order?: number }) {
    getDatabase().prepare(`
      INSERT INTO exchange_rates (from_currency, to_currency, rate, fee_percentage, display_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      data.from_currency.toUpperCase(), data.to_currency.toUpperCase(),
      data.rate, data.fee_percentage || 0, data.display_order || 0
    );
    return { success: true };
  },

  updateExchangeRate(id: number, data: Partial<{ from_currency: string; to_currency: string; rate: number; fee_percentage: number; is_active: number; display_order: number }>) {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    const allowed = ["from_currency", "to_currency", "rate", "fee_percentage", "is_active", "display_order"];
    for (const [key, value] of Object.entries(data)) {
      if (allowed.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(key === "from_currency" || key === "to_currency" ? String(value).toUpperCase() : value);
      }
    }
    if (fields.length === 0) return { success: true };
    values.push(id);
    db.prepare(`UPDATE exchange_rates SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    return { success: true };
  },

  deleteExchangeRate(id: number) {
    getDatabase().prepare("DELETE FROM exchange_rates WHERE id = ?").run(id);
    return { success: true };
  },

  // ============================================================
  // ADMIN CRUD — PAYMENT PROVIDERS (api_keys)
  // ============================================================

  getAllPaymentProviders() {
    return getDatabase().prepare("SELECT * FROM api_keys ORDER BY display_order, id").all() as any[];
  },

  getPaymentProviderById(id: number) {
    return getDatabase().prepare("SELECT * FROM api_keys WHERE id = ?").get(id) as any;
  },

  createPaymentProvider(data: {
    provider: string; key_name?: string; api_key?: string; api_secret?: string;
    is_live?: number; is_test?: number; description?: string; logo?: string;
    shop_name?: string; payment_type?: string; allowed_countries?: string;
    marketplace_enabled?: number; shop_enabled?: number; is_recommended?: number;
    display_order?: number; additional_config?: string;
  }) {
    getDatabase().prepare(`
      INSERT INTO api_keys (provider, key_name, api_key, api_secret, is_live, is_test,
        description, logo, shop_name, payment_type, allowed_countries,
        marketplace_enabled, shop_enabled, is_recommended, display_order, additional_config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.provider, data.key_name || "", data.api_key || null, data.api_secret || null,
      data.is_live || 0, data.is_test || 0, data.description || null, data.logo || null,
      data.shop_name || null, data.payment_type || null, data.allowed_countries || null,
      data.marketplace_enabled || 0, data.shop_enabled || 0, data.is_recommended || 0,
      data.display_order || 0, data.additional_config || null
    );
    return { success: true };
  },

  updatePaymentProvider(id: number, data: Partial<{
    provider: string; key_name: string; api_key: string; api_secret: string;
    is_live: number; is_active: number; is_test: number; description: string; logo: string;
    shop_name: string; payment_type: string; allowed_countries: string;
    marketplace_enabled: number; shop_enabled: number; is_recommended: number;
    display_order: number; additional_config: string;
  }>) {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    const allowed = ["provider", "key_name", "api_key", "api_secret", "is_live", "is_active",
      "is_test", "description", "logo", "shop_name", "payment_type", "allowed_countries",
      "marketplace_enabled", "shop_enabled", "is_recommended", "display_order", "additional_config"];
    for (const [key, value] of Object.entries(data)) {
      if (allowed.includes(key)) { fields.push(`${key} = ?`); values.push(value); }
    }
    if (fields.length === 0) return { success: true };
    values.push(id);
    db.prepare(`UPDATE api_keys SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    return { success: true };
  },

  deletePaymentProvider(id: number) {
    getDatabase().prepare("DELETE FROM api_keys WHERE id = ?").run(id);
    return { success: true };
  },

  // ============================================================
  // FEE ESTIMATION — USER-FACING (enriched)
  // ============================================================

  estimateFees(type: string, amount: number, currency: string = "XAF") {
    let fee = 0;
    switch (type) {
      case "card_creation": fee = this.calculateCardCreationFee(amount, currency); break;
      case "card_reload": fee = this.calculateCardReloadFee(amount); break;
      case "card_withdrawal": fee = this.calculateCardWithdrawalFee(amount); break;
      case "transfer": fee = this.calculateTransferFee(amount); break;
      default: fee = 0;
    }
    return { type, amount, fee, total: amount + fee, currency };
  },

  convertCurrency(amount: number, fromCurrency: string, toCurrency: string) {
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return { amount, converted: amount, rate: 1, fee: 0 };
    const row = getDatabase().prepare(
      "SELECT rate, fee_percentage FROM exchange_rates WHERE from_currency = ? AND to_currency = ? AND is_active = 1"
    ).get(fromCurrency.toUpperCase(), toCurrency.toUpperCase()) as any;
    if (!row) return null;
    const feeAmount = amount * (Number(row.fee_percentage) / 100);
    const netAmount = amount - feeAmount;
    const converted = Math.round(netAmount * Number(row.rate));
    return { amount, converted, rate: Number(row.rate), fee: Math.round(feeAmount), feePct: Number(row.fee_percentage) };
  },

  // ============================================================
  // ADMIN — ENRICHED REVENUE DASHBOARD (Phase 3)
  // ============================================================

  getAdminRevenueStats() {
    const db = getDatabase();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);

    const totalUsers = (db.prepare("SELECT count(*) as c FROM users").get() as any).c;
    const activeUsers = (db.prepare("SELECT count(*) as c FROM users WHERE status='active'").get() as any).c;
    const newUsersToday = (db.prepare("SELECT count(*) as c FROM users WHERE date(created_at) = ?").get(todayStr) as any).c;
    const newUsersWeek = (db.prepare("SELECT count(*) as c FROM users WHERE date(created_at) >= ?").get(weekAgo) as any).c;
    const newUsersMonth = (db.prepare("SELECT count(*) as c FROM users WHERE date(created_at) >= ?").get(monthAgo) as any).c;

    const totalCards = (db.prepare("SELECT count(*) as c FROM cards").get() as any).c;
    const activeCards = (db.prepare("SELECT count(*) as c FROM cards WHERE status='active'").get() as any).c;

    const totalTransactions = (db.prepare("SELECT count(*) as c FROM transactions").get() as any).c;
    const todayTransactions = (db.prepare("SELECT count(*) as c FROM transactions WHERE date(created_at) = ?").get(todayStr) as any).c;
    const weekTransactions = (db.prepare("SELECT count(*) as c FROM transactions WHERE date(created_at) >= ?").get(weekAgo) as any).c;

    const totalVolumeXaf = (db.prepare("SELECT coalesce(sum(amount_minor), 0) as s FROM transactions WHERE status IN ('completed','approved')").get() as any).s;
    const todayVolumeXaf = (db.prepare("SELECT coalesce(sum(amount_minor), 0) as s FROM transactions WHERE status IN ('completed','approved') AND date(created_at) = ?").get(todayStr) as any).s;
    const weekVolumeXaf = (db.prepare("SELECT coalesce(sum(amount_minor), 0) as s FROM transactions WHERE status IN ('completed','approved') AND date(created_at) >= ?").get(weekAgo) as any).s;

    const totalWalletBalance = (db.prepare("SELECT coalesce(sum(balance_minor), 0) as s FROM wallets").get() as any).s;

    const pendingApprovals = (db.prepare("SELECT count(*) as c FROM withdrawal_approvals WHERE status='pending'").get() as any).c;
    const pendingKyc = (db.prepare("SELECT count(*) as c FROM identity_verifications WHERE status='pending'").get() as any).c;
    const openTickets = (db.prepare("SELECT count(*) as c FROM support_tickets WHERE status IN ('open','waiting_admin')").get() as any).c;

    // Daily volume for last 7 days
    const dailyVolume = db.prepare(`
      SELECT date(created_at) as day, count(*) as count, coalesce(sum(amount_minor), 0) as volume
      FROM transactions WHERE date(created_at) >= ? GROUP BY date(created_at) ORDER BY day
    `).all(weekAgo) as any[];

    // Transaction type breakdown
    const typeBreakdown = db.prepare(`
      SELECT type, count(*) as count, coalesce(sum(amount_minor), 0) as volume
      FROM transactions WHERE status IN ('completed','approved')
      GROUP BY type ORDER BY volume DESC
    `).all() as any[];

    return {
      users: { total: totalUsers, active: activeUsers, newToday: newUsersToday, newWeek: newUsersWeek, newMonth: newUsersMonth },
      cards: { total: totalCards, active: activeCards },
      transactions: { total: totalTransactions, today: todayTransactions, week: weekTransactions },
      volume: { total: totalVolumeXaf, today: todayVolumeXaf, week: weekVolumeXaf },
      walletBalance: totalWalletBalance,
      pending: { approvals: pendingApprovals, kyc: pendingKyc, tickets: openTickets },
      dailyVolume,
      typeBreakdown,
    };
  },

  // ============================================================
  // ADMIN — IMPERSONATION / LOGIN-AS-USER (Phase 3)
  // ============================================================

  impersonateUser(adminId: number, userId: number, ctx: { ipAddress?: string | null; userAgent?: string | null }) {
    const db = getDatabase();
    const user = db.prepare("SELECT id, name, email, status FROM users WHERE id = ?").get(userId) as any;
    if (!user) throw new Error("Utilisateur introuvable.");
    if (user.status !== "active") throw new Error("Ce compte utilisateur est inactif.");

    const token = makeSessionToken();
    db.prepare(`
      INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at, created_at)
      VALUES (?, ?, ?, ?, datetime('now', '+2 hours'), CURRENT_TIMESTAMP)
    `).run(userId, digestToken(token), ctx.ipAddress || null, ctx.userAgent || null);

    writeAdminAudit(db, adminId, "super_admin", "impersonate_user", `user:${userId}`, `Connexion en tant que ${user.name} (${user.email})`);

    this.trackActivity({
      userId, action: "admin_impersonation",
      details: `Admin #${adminId} connecté en tant que cet utilisateur`,
      ip: ctx.ipAddress || undefined, userAgent: ctx.userAgent || undefined,
    });

    return { success: true, sessionToken: token, user: { id: user.id, name: user.name, email: user.email } };
  },

  // ============================================================
  // ADMIN — LANDING PAGE CMS (Phase 3)
  // ============================================================

  getLandingPageSettings() {
    const db = getDatabase();
    const rows = db.prepare("SELECT * FROM landing_page_settings ORDER BY section_order, id").all() as any[];
    return rows;
  },

  upsertLandingPageSetting(data: { section_key: string; section_title?: string; content?: string; is_visible?: number; section_order?: number; metadata?: string }) {
    const db = getDatabase();
    const existing = db.prepare("SELECT id FROM landing_page_settings WHERE section_key = ?").get(data.section_key) as any;
    if (existing) {
      const fields: string[] = [];
      const values: any[] = [];
      if (data.section_title !== undefined) { fields.push("section_title = ?"); values.push(data.section_title); }
      if (data.content !== undefined) { fields.push("content = ?"); values.push(data.content); }
      if (data.is_visible !== undefined) { fields.push("is_visible = ?"); values.push(data.is_visible); }
      if (data.section_order !== undefined) { fields.push("section_order = ?"); values.push(data.section_order); }
      if (data.metadata !== undefined) { fields.push("metadata = ?"); values.push(data.metadata); }
      if (fields.length > 0) {
        values.push(existing.id);
        db.prepare(`UPDATE landing_page_settings SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
      }
    } else {
      db.prepare(`
        INSERT INTO landing_page_settings (section_key, section_title, content, is_visible, section_order, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(data.section_key, data.section_title || "", data.content || "", data.is_visible ?? 1, data.section_order ?? 0, data.metadata || null);
    }
    return { success: true };
  },

  deleteLandingPageSetting(id: number) {
    getDatabase().prepare("DELETE FROM landing_page_settings WHERE id = ?").run(id);
    return { success: true };
  },

  // ============================================================
  // ADMIN — EMAIL SETTINGS & CAMPAIGNS (Phase 3)
  // ============================================================

  getEmailSettings() {
    return getDatabase().prepare("SELECT * FROM email_settings ORDER BY id").all() as any[];
  },

  upsertEmailSetting(data: { setting_key: string; setting_value: string; description?: string }) {
    const db = getDatabase();
    const existing = db.prepare("SELECT id FROM email_settings WHERE setting_key = ?").get(data.setting_key) as any;
    if (existing) {
      db.prepare("UPDATE email_settings SET setting_value = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(data.setting_value, data.description || null, existing.id);
    } else {
      db.prepare("INSERT INTO email_settings (setting_key, setting_value, description) VALUES (?, ?, ?)")
        .run(data.setting_key, data.setting_value, data.description || null);
    }
    return { success: true };
  },

  getEmailCampaigns() {
    return getDatabase().prepare("SELECT * FROM email_campaigns ORDER BY created_at DESC LIMIT 100").all() as any[];
  },

  createEmailCampaign(data: { name: string; subject: string; body_html: string; target_audience: string; scheduled_at?: string }, adminId: number) {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO email_campaigns (name, subject, body_html, target_audience, status, created_by, scheduled_at)
      VALUES (?, ?, ?, ?, 'draft', ?, ?)
    `).run(data.name, data.subject, data.body_html, data.target_audience || "all", adminId, data.scheduled_at || null);
    return { success: true };
  },

  updateEmailCampaignStatus(id: number, status: string) {
    const db = getDatabase();
    if (status === "sent") {
      db.prepare("UPDATE email_campaigns SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    } else {
      db.prepare("UPDATE email_campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, id);
    }
    return { success: true };
  },

  deleteEmailCampaign(id: number) {
    const db = getDatabase();
    db.prepare("DELETE FROM email_campaign_recipients WHERE campaign_id = ?").run(id);
    db.prepare("DELETE FROM email_campaigns WHERE id = ?").run(id);
    return { success: true };
  },

  // ============================================================
  // ADMIN — WITHDRAWAL CONFIG (Phase 3)
  // ============================================================

  getWithdrawalMethods() {
    return getDatabase().prepare("SELECT * FROM withdrawal_methods ORDER BY display_order, id").all() as any[];
  },

  upsertWithdrawalMethod(data: {
    id?: number; name: string; method_type: string; provider?: string;
    min_amount?: number; max_amount?: number; fee_fixed?: number; fee_percentage?: number;
    processing_time?: string; is_active?: number; display_order?: number; config?: string;
  }) {
    const db = getDatabase();
    if (data.id) {
      const fields: string[] = [];
      const values: any[] = [];
      for (const [k, v] of Object.entries(data)) {
        if (k === "id") continue;
        if (["name", "method_type", "provider", "min_amount", "max_amount", "fee_fixed", "fee_percentage", "processing_time", "is_active", "display_order", "config"].includes(k)) {
          fields.push(`${k} = ?`);
          values.push(v);
        }
      }
      values.push(data.id);
      db.prepare(`UPDATE withdrawal_methods SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    } else {
      db.prepare(`
        INSERT INTO withdrawal_methods (name, method_type, provider, min_amount, max_amount, fee_fixed, fee_percentage, processing_time, is_active, display_order, config)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(data.name, data.method_type, data.provider || null, data.min_amount || 0, data.max_amount || null,
        data.fee_fixed || 0, data.fee_percentage || 0, data.processing_time || null, data.is_active ?? 1, data.display_order || 0, data.config || null);
    }
    return { success: true };
  },

  deleteWithdrawalMethod(id: number) {
    getDatabase().prepare("DELETE FROM withdrawal_methods WHERE id = ?").run(id);
    return { success: true };
  },

  getWithdrawalSettings() {
    return getDatabase().prepare("SELECT * FROM withdrawal_settings ORDER BY id").all() as any[];
  },

  upsertWithdrawalSetting(key: string, value: string) {
    const db = getDatabase();
    const existing = db.prepare("SELECT id FROM withdrawal_settings WHERE setting_key = ?").get(key) as any;
    if (existing) {
      db.prepare("UPDATE withdrawal_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(value, existing.id);
    } else {
      db.prepare("INSERT INTO withdrawal_settings (setting_key, setting_value) VALUES (?, ?)").run(key, value);
    }
    return { success: true };
  },

  // ============================================================
  // ADMIN — MANUAL PAYMENT METHODS (Phase 3)
  // ============================================================

  getManualPaymentApis() {
    return getDatabase().prepare("SELECT * FROM manual_payment_apis ORDER BY display_order, id").all() as any[];
  },

  upsertManualPaymentApi(data: {
    id?: number; name: string; slug: string; instructions?: string;
    is_active?: number; display_order?: number; logo?: string;
  }) {
    const db = getDatabase();
    if (data.id) {
      db.prepare(`
        UPDATE manual_payment_apis SET name=?, slug=?, instructions=?, is_active=?, display_order=?, logo=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
      `).run(data.name, data.slug, data.instructions || null, data.is_active ?? 1, data.display_order || 0, data.logo || null, data.id);
    } else {
      db.prepare(`
        INSERT INTO manual_payment_apis (name, slug, instructions, is_active, display_order, logo) VALUES (?, ?, ?, ?, ?, ?)
      `).run(data.name, data.slug, data.instructions || null, data.is_active ?? 1, data.display_order || 0, data.logo || null);
    }
    return { success: true };
  },

  deleteManualPaymentApi(id: number) {
    const db = getDatabase();
    db.prepare("DELETE FROM manual_payment_fields WHERE manual_payment_api_id = ?").run(id);
    db.prepare("DELETE FROM manual_payment_apis WHERE id = ?").run(id);
    return { success: true };
  },

  getManualPaymentFields(apiId: number) {
    return getDatabase().prepare("SELECT * FROM manual_payment_fields WHERE manual_payment_api_id = ? ORDER BY display_order, id").all(apiId) as any[];
  },

  upsertManualPaymentField(data: {
    id?: number; manual_payment_api_id: number; field_name: string;
    field_type?: string; field_value?: string; is_required?: number; display_order?: number;
  }) {
    const db = getDatabase();
    if (data.id) {
      db.prepare(`
        UPDATE manual_payment_fields SET field_name=?, field_type=?, field_value=?, is_required=?, display_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
      `).run(data.field_name, data.field_type || "text", data.field_value || null, data.is_required ?? 1, data.display_order || 0, data.id);
    } else {
      db.prepare(`
        INSERT INTO manual_payment_fields (manual_payment_api_id, field_name, field_type, field_value, is_required, display_order) VALUES (?, ?, ?, ?, ?, ?)
      `).run(data.manual_payment_api_id, data.field_name, data.field_type || "text", data.field_value || null, data.is_required ?? 1, data.display_order || 0);
    }
    return { success: true };
  },

  deleteManualPaymentField(id: number) {
    getDatabase().prepare("DELETE FROM manual_payment_fields WHERE id = ?").run(id);
    return { success: true };
  },

  // ============================================================
  // ADMIN — MARKETING SETTINGS (Phase 3)
  // ============================================================

  getMarketingSettings() {
    return getDatabase().prepare("SELECT * FROM marketing_settings ORDER BY id").all() as any[];
  },

  upsertMarketingSetting(data: { setting_key: string; setting_value: string; description?: string }) {
    const db = getDatabase();
    const existing = db.prepare("SELECT id FROM marketing_settings WHERE setting_key = ?").get(data.setting_key) as any;
    if (existing) {
      db.prepare("UPDATE marketing_settings SET setting_value = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(data.setting_value, data.description || null, existing.id);
    } else {
      db.prepare("INSERT INTO marketing_settings (setting_key, setting_value, description) VALUES (?, ?, ?)")
        .run(data.setting_key, data.setting_value, data.description || null);
    }
    return { success: true };
  },

  deleteMarketingSetting(id: number) {
    getDatabase().prepare("DELETE FROM marketing_settings WHERE id = ?").run(id);
    return { success: true };
  },

  // ============================================================
  // MARKETPLACE – CATEGORIES
  // ============================================================

  getAllCategories(activeOnly = false) {
    const db = getDatabase();
    const where = activeOnly ? "WHERE is_active = 1" : "";
    return db.prepare(`SELECT * FROM categories ${where} ORDER BY name`).all();
  },

  getCategoryById(id: number) {
    return getDatabase().prepare("SELECT * FROM categories WHERE id = ?").get(id);
  },

  createCategory(data: { name: string; description?: string; is_active?: number }) {
    const db = getDatabase();
    db.prepare("INSERT INTO categories (name, description, is_active) VALUES (?, ?, ?)")
      .run(data.name, data.description || null, data.is_active ?? 1);
    return { success: true };
  },

  updateCategory(id: number, data: { name?: string; description?: string; is_active?: number }) {
    const db = getDatabase();
    const sets: string[] = [];
    const vals: any[] = [];
    if (data.name !== undefined) { sets.push("name = ?"); vals.push(data.name); }
    if (data.description !== undefined) { sets.push("description = ?"); vals.push(data.description); }
    if (data.is_active !== undefined) { sets.push("is_active = ?"); vals.push(data.is_active); }
    sets.push("updated_at = CURRENT_TIMESTAMP");
    vals.push(id);
    db.prepare(`UPDATE categories SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    return { success: true };
  },

  deleteCategory(id: number) {
    getDatabase().prepare("DELETE FROM categories WHERE id = ?").run(id);
    return { success: true };
  },

  getCategoryFields(categoryId: number) {
    return getDatabase().prepare("SELECT * FROM category_fields WHERE category_id = ? ORDER BY sort_order").all(categoryId);
  },

  upsertCategoryField(data: { id?: number; category_id: number; field_name: string; field_type: string; field_label: string; is_required?: number; options?: string; sort_order?: number }) {
    const db = getDatabase();
    if (data.id) {
      db.prepare("UPDATE category_fields SET field_name = ?, field_type = ?, field_label = ?, is_required = ?, options = ?, sort_order = ? WHERE id = ?")
        .run(data.field_name, data.field_type, data.field_label, data.is_required || 0, data.options || null, data.sort_order || 0, data.id);
    } else {
      db.prepare("INSERT INTO category_fields (category_id, field_name, field_type, field_label, is_required, options, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(data.category_id, data.field_name, data.field_type, data.field_label, data.is_required || 0, data.options || null, data.sort_order || 0);
    }
    return { success: true };
  },

  deleteCategoryField(id: number) {
    getDatabase().prepare("DELETE FROM category_fields WHERE id = ?").run(id);
    return { success: true };
  },

  // ============================================================
  // MARKETPLACE – ARTICLES (PRODUITS)
  // ============================================================

  getAllArticles(filters?: { categoryId?: number; activeOnly?: boolean; search?: string }) {
    const db = getDatabase();
    const clauses: string[] = [];
    const vals: any[] = [];
    if (filters?.activeOnly) { clauses.push("a.is_active = 1"); }
    if (filters?.categoryId) { clauses.push("a.categorie_id = ?"); vals.push(filters.categoryId); }
    if (filters?.search) { clauses.push("(a.title LIKE ? OR a.description LIKE ?)"); vals.push(`%${filters.search}%`, `%${filters.search}%`); }
    const where = clauses.length > 0 ? "WHERE " + clauses.join(" AND ") : "";
    return db.prepare(`
      SELECT a.*, c.name AS category_name
      FROM articles a
      LEFT JOIN categories c ON c.id = a.categorie_id
      ${where}
      ORDER BY a.sort_order, a.id DESC
    `).all(...vals);
  },

  getArticleById(id: number) {
    const db = getDatabase();
    const article = db.prepare(`
      SELECT a.*, c.name AS category_name
      FROM articles a LEFT JOIN categories c ON c.id = a.categorie_id
      WHERE a.id = ?
    `).get(id) as any;
    if (!article) return null;
    const comments = db.prepare(`
      SELECT ca.*, u.name AS user_name FROM comentaire_articles ca
      LEFT JOIN users u ON u.id = ca.user_id
      WHERE ca.article_id = ? ORDER BY ca.created_at DESC LIMIT 50
    `).all(id);
    const fields = article.categorie_id
      ? db.prepare("SELECT * FROM category_fields WHERE category_id = ? ORDER BY sort_order").all(article.categorie_id)
      : [];
    return { ...article, comments, fields };
  },

  createArticle(data: { title: string; user_id: number; categorie_id?: number; description?: string; plan_name?: string; plan_description?: string; price: number; image?: string; quantity?: number; sort_order?: number; offer_is_active?: number; parent_article_id?: number }) {
    const db = getDatabase();
    const qty = data.quantity || 0;
    const result = db.prepare(`
      INSERT INTO articles (title, user_id, parent_article_id, plan_name, sort_order, description, plan_description, price, image, is_active, offer_is_active, quantity, quantity_remaining, categorie_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `).run(data.title, data.user_id, data.parent_article_id || null, data.plan_name || null, data.sort_order || 0, data.description || null, data.plan_description || null, data.price, data.image || null, data.offer_is_active || 0, qty, qty, data.categorie_id || null);
    return { success: true, id: Number(result.lastInsertRowid) };
  },

  updateArticle(id: number, data: Record<string, any>) {
    const db = getDatabase();
    const allowed = ["title", "description", "plan_name", "plan_description", "price", "image", "is_active", "offer_is_active", "quantity", "quantity_remaining", "categorie_id", "sort_order", "parent_article_id"];
    const sets: string[] = [];
    const vals: any[] = [];
    for (const key of allowed) {
      if (data[key] !== undefined) { sets.push(`${key} = ?`); vals.push(data[key]); }
    }
    if (sets.length === 0) return { success: true };
    sets.push("updated_at = CURRENT_TIMESTAMP");
    vals.push(id);
    db.prepare(`UPDATE articles SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    return { success: true };
  },

  deleteArticle(id: number) {
    getDatabase().prepare("DELETE FROM articles WHERE id = ?").run(id);
    return { success: true };
  },

  trackArticleView(articleId: number, userId?: number) {
    getDatabase().prepare("INSERT INTO view_articles (article_id, user_id) VALUES (?, ?)").run(articleId, userId || null);
  },

  getArticleViewCount(articleId: number): number {
    return ((getDatabase().prepare("SELECT COUNT(*) as c FROM view_articles WHERE article_id = ?").get(articleId) as any)?.c) || 0;
  },

  addArticleComment(articleId: number, userId: number, content: string, rating?: number) {
    getDatabase().prepare("INSERT INTO comentaire_articles (user_id, article_id, content, rating) VALUES (?, ?, ?, ?)")
      .run(userId, articleId, content, rating || null);
    return { success: true };
  },

  deleteArticleComment(id: number) {
    getDatabase().prepare("DELETE FROM comentaire_articles WHERE id = ?").run(id);
    return { success: true };
  },

  // ============================================================
  // MARKETPLACE – COMMANDES (ORDERS)
  // ============================================================

  createCommande(userId: number, data: { article_id: number; quantity: number; payment_method: string; note?: string; category_fields?: Record<string, string> }) {
    const db = getDatabase();
    const article = db.prepare("SELECT * FROM articles WHERE id = ? AND is_active = 1").get(data.article_id) as any;
    if (!article) throw new Error("Article introuvable ou inactif.");
    if (article.quantity > 0 && article.quantity_remaining < data.quantity) {
      throw new Error("Stock insuffisant.");
    }

    const unitPrice = article.price;
    const totalAmount = unitPrice * data.quantity;

    if (data.payment_method === "wallet") {
      const wallet = db.prepare("SELECT balance_minor FROM wallets WHERE user_id = ? AND currency = 'XAF'").get(userId) as any;
      if (!wallet || wallet.balance_minor < Math.round(totalAmount * 100)) {
        throw new Error("Solde insuffisant.");
      }
      db.prepare("UPDATE wallets SET balance_minor = balance_minor - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND currency = 'XAF'")
        .run(Math.round(totalAmount * 100), userId);
    }

    if (article.quantity > 0) {
      db.prepare("UPDATE articles SET quantity_remaining = quantity_remaining - ? WHERE id = ?").run(data.quantity, article.id);
    }

    const result = db.prepare(`
      INSERT INTO commandes (user_id, article_id, quantity, unit_price, article_title_snapshot, plan_name_snapshot,
        status, payment_method, wallet_amount, note, stock_reserved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(userId, article.id, data.quantity, unitPrice, article.title, article.plan_name || null,
      data.payment_method === "wallet" ? "paid" : "pending",
      data.payment_method, data.payment_method === "wallet" ? totalAmount : 0,
      data.note || null);

    const commandeId = Number(result.lastInsertRowid);

    if (data.payment_method === "wallet") {
      db.prepare("INSERT INTO commande_transactions (commande_id, type, amount, currency, status, provider) VALUES (?, 'payment', ?, 'XAF', 'completed', 'wallet')")
        .run(commandeId, totalAmount);
    }

    if (data.category_fields) {
      const fields = db.prepare("SELECT * FROM category_fields WHERE category_id = ?").all(article.categorie_id) as any[];
      for (const field of fields) {
        const val = data.category_fields[field.field_name] || "";
        db.prepare("INSERT INTO category_field_values (category_field_id, commande_id, field_value) VALUES (?, ?, ?)")
          .run(field.id, commandeId, val);
      }
    }

    return { success: true, commandeId, status: data.payment_method === "wallet" ? "paid" : "pending" };
  },

  getUserCommandes(userId: number) {
    return getDatabase().prepare(`
      SELECT c.*, a.image AS article_image
      FROM commandes c
      LEFT JOIN articles a ON a.id = c.article_id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `).all(userId);
  },

  getCommandeById(id: number) {
    const db = getDatabase();
    const cmd = db.prepare(`
      SELECT c.*, a.image AS article_image, a.title AS article_title_live, u.name AS user_name, u.email AS user_email
      FROM commandes c
      LEFT JOIN articles a ON a.id = c.article_id
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.id = ?
    `).get(id) as any;
    if (!cmd) return null;

    const comments = db.prepare(`
      SELECT cc.*, u.name AS user_name FROM comentaire_commandes cc
      LEFT JOIN users u ON u.id = cc.user_id
      WHERE cc.commande_id = ? ORDER BY cc.created_at ASC
    `).all(id);

    const transactions = db.prepare("SELECT * FROM commande_transactions WHERE commande_id = ? ORDER BY created_at DESC").all(id);

    const fieldValues = db.prepare(`
      SELECT cfv.*, cf.field_name, cf.field_label FROM category_field_values cfv
      LEFT JOIN category_fields cf ON cf.id = cfv.category_field_id
      WHERE cfv.commande_id = ?
    `).all(id);

    return { ...cmd, comments, transactions, fieldValues };
  },

  getAllCommandes(filters?: { status?: string; limit?: number; offset?: number }) {
    const db = getDatabase();
    const clauses: string[] = [];
    const vals: any[] = [];
    if (filters?.status) { clauses.push("c.status = ?"); vals.push(filters.status); }
    const where = clauses.length > 0 ? "WHERE " + clauses.join(" AND ") : "";
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;
    const items = db.prepare(`
      SELECT c.*, u.name AS user_name, u.email AS user_email, a.title AS article_title_live, a.image AS article_image
      FROM commandes c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN articles a ON a.id = c.article_id
      ${where}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...vals, limit, offset);
    const total = ((db.prepare(`SELECT COUNT(*) as c FROM commandes c ${where}`).get(...vals) as any)?.c) || 0;
    return { items, total };
  },

  updateCommandeStatus(id: number, status: string, response?: string) {
    const db = getDatabase();
    const sets = ["status = ?", "updated_at = CURRENT_TIMESTAMP"];
    const vals: any[] = [status];
    if (response !== undefined) { sets.push("response = ?"); vals.push(response); }
    if (status === "delivered" || status === "completed") { sets.push("stock_consumed_at = CURRENT_TIMESTAMP"); }
    vals.push(id);
    db.prepare(`UPDATE commandes SET ${sets.join(", ")} WHERE id = ?`).run(...vals);

    if (status === "refunded") {
      const cmd = db.prepare("SELECT user_id, wallet_amount FROM commandes WHERE id = ?").get(id) as any;
      if (cmd && cmd.wallet_amount > 0) {
        db.prepare("UPDATE wallets SET balance_minor = balance_minor + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND currency = 'XAF'")
          .run(Math.round(cmd.wallet_amount * 100), cmd.user_id);
        db.prepare("INSERT INTO commande_transactions (commande_id, type, amount, currency, status, provider) VALUES (?, 'refund', ?, 'XAF', 'completed', 'wallet')")
          .run(id, cmd.wallet_amount);
      }
    }
    return { success: true };
  },

  addCommandeComment(commandeId: number, userId: number, content: string) {
    getDatabase().prepare("INSERT INTO comentaire_commandes (user_id, commande_id, content) VALUES (?, ?, ?)")
      .run(userId, commandeId, content);
    return { success: true };
  },

  getCommandeComments(commandeId: number) {
    return getDatabase().prepare(`
      SELECT cc.*, u.name AS user_name FROM comentaire_commandes cc
      LEFT JOIN users u ON u.id = cc.user_id WHERE cc.commande_id = ? ORDER BY cc.created_at ASC
    `).all(commandeId);
  },

  // ============================================================
  // PHASE 5 — USER SHOPS
  // ============================================================

  // ── Shop CRUD & Approval ──

  getUserShop(userId: number) {
    return getDatabase().prepare("SELECT * FROM shops WHERE user_id = ? AND deleted_at IS NULL").get(userId) as any;
  },

  getShopById(id: number) {
    const db = getDatabase();
    const shop = db.prepare("SELECT s.*, u.name AS owner_name, u.email AS owner_email FROM shops s LEFT JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.deleted_at IS NULL").get(id) as any;
    return shop;
  },

  getShopBySlug(slug: string) {
    const db = getDatabase();
    const shop = db.prepare("SELECT s.*, u.name AS owner_name FROM shops s LEFT JOIN users u ON u.id = s.user_id WHERE s.slug = ? AND s.deleted_at IS NULL AND s.status = 'approved' AND s.is_active = 1").get(slug) as any;
    return shop;
  },

  createShop(userId: number, data: { name: string; slug: string; description?: string; logo?: string; banner?: string; phone?: string; email?: string; address?: string }) {
    const db = getDatabase();
    const existing = db.prepare("SELECT id FROM shops WHERE user_id = ? AND deleted_at IS NULL").get(userId);
    if (existing) throw new Error("Vous avez déjà une boutique.");
    const slugExists = db.prepare("SELECT id FROM shops WHERE slug = ?").get(data.slug);
    if (slugExists) throw new Error("Ce slug est déjà utilisé.");
    const result = db.prepare(`INSERT INTO shops (user_id, name, slug, description, logo, banner, phone, email, address, status, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`).run(
      userId, data.name, data.slug, data.description || null, data.logo || null, data.banner || null, data.phone || null, data.email || null, data.address || null
    );
    return { success: true, shopId: result.lastInsertRowid };
  },

  updateShop(shopId: number, userId: number, data: { name?: string; description?: string; logo?: string; banner?: string; phone?: string; email?: string; address?: string }) {
    const db = getDatabase();
    const shop = db.prepare("SELECT * FROM shops WHERE id = ? AND user_id = ? AND deleted_at IS NULL").get(shopId, userId) as any;
    if (!shop) throw new Error("Boutique introuvable.");
    const sets: string[] = ["updated_at = CURRENT_TIMESTAMP"];
    const vals: any[] = [];
    for (const key of ["name", "description", "logo", "banner", "phone", "email", "address"] as const) {
      if ((data as any)[key] !== undefined) { sets.push(`${key} = ?`); vals.push((data as any)[key]); }
    }
    vals.push(shopId);
    db.prepare(`UPDATE shops SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    return { success: true };
  },

  adminGetAllShops(filters?: { status?: string; limit?: number; offset?: number }) {
    const db = getDatabase();
    const clauses: string[] = ["s.deleted_at IS NULL"];
    const vals: any[] = [];
    if (filters?.status) { clauses.push("s.status = ?"); vals.push(filters.status); }
    const where = "WHERE " + clauses.join(" AND ");
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;
    const items = db.prepare(`
      SELECT s.*, u.name AS owner_name, u.email AS owner_email
      FROM shops s LEFT JOIN users u ON u.id = s.user_id
      ${where} ORDER BY s.created_at DESC LIMIT ? OFFSET ?
    `).all(...vals, limit, offset);
    const total = ((db.prepare(`SELECT COUNT(*) as c FROM shops s ${where}`).get(...vals) as any)?.c) || 0;
    return { items, total };
  },

  approveShop(shopId: number, adminId: number) {
    const db = getDatabase();
    db.prepare("UPDATE shops SET status = 'approved', is_active = 1, approved_at = CURRENT_TIMESTAMP, approved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(adminId, shopId);
    return { success: true };
  },

  rejectShop(shopId: number, adminId: number, reason: string) {
    const db = getDatabase();
    db.prepare("UPDATE shops SET status = 'rejected', is_active = 0, rejection_reason = ?, approved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(reason, adminId, shopId);
    return { success: true };
  },

  toggleShopActive(shopId: number) {
    const db = getDatabase();
    db.prepare("UPDATE shops SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(shopId);
    return { success: true };
  },

  updateShopCommission(shopId: number, rate: number) {
    const db = getDatabase();
    if (rate < 0 || rate > 100) throw new Error("Taux de commission invalide.");
    db.prepare("UPDATE shops SET commission_rate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(rate, shopId);
    return { success: true };
  },

  // ── Shop Products ──

  getShopProducts(shopId: number, includeInactive?: boolean) {
    const db = getDatabase();
    const where = includeInactive ? "WHERE sp.shop_id = ? AND sp.deleted_at IS NULL" : "WHERE sp.shop_id = ? AND sp.deleted_at IS NULL AND sp.is_active = 1";
    return db.prepare(`SELECT sp.*, (SELECT COUNT(*) FROM product_credentials pc WHERE pc.shop_product_id = sp.id AND pc.status = 'available') AS available_credentials FROM user_shop_products sp ${where} ORDER BY sp.created_at DESC`).all(shopId);
  },

  getShopProductById(id: number) {
    const db = getDatabase();
    const product = db.prepare("SELECT sp.*, s.name AS shop_name, s.slug AS shop_slug FROM user_shop_products sp LEFT JOIN shops s ON s.id = sp.shop_id WHERE sp.id = ? AND sp.deleted_at IS NULL").get(id) as any;
    return product;
  },

  createShopProduct(shopId: number, data: any) {
    const db = getDatabase();
    const slug = (data.slug || data.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `product-${Date.now()}`;
    const existing = db.prepare("SELECT id FROM user_shop_products WHERE shop_id = ? AND slug = ? AND deleted_at IS NULL").get(shopId, slug);
    if (existing) throw new Error("Un produit avec ce slug existe déjà.");
    const result = db.prepare(`INSERT INTO user_shop_products (shop_id, name, slug, description, product_type, digital_file, digital_file_name, digital_link, digital_link_instructions, credential_format, price, currency, image, images, stock, stock_alert, unlimited_stock, sku, is_active, is_featured, auto_deliver, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      shopId, data.name, slug, data.description || null,
      data.product_type || "physical",
      data.digital_file || null, data.digital_file_name || null,
      data.digital_link || null, data.digital_link_instructions || null,
      data.credential_format || null,
      Number(data.price) || 0, data.currency || "XAF",
      data.image || null, data.images ? JSON.stringify(data.images) : null,
      data.unlimited_stock ? null : (Number(data.stock) || 0),
      data.stock_alert != null ? Number(data.stock_alert) : null,
      data.unlimited_stock ? 1 : 0,
      data.sku || null, 1, data.is_featured ? 1 : 0,
      data.auto_deliver ? 1 : 0, data.metadata ? JSON.stringify(data.metadata) : null
    );
    return { success: true, productId: result.lastInsertRowid };
  },

  updateShopProduct(id: number, shopId: number, data: any) {
    const db = getDatabase();
    const product = db.prepare("SELECT * FROM user_shop_products WHERE id = ? AND shop_id = ? AND deleted_at IS NULL").get(id, shopId);
    if (!product) throw new Error("Produit introuvable.");
    const sets: string[] = ["updated_at = CURRENT_TIMESTAMP"];
    const vals: any[] = [];
    for (const key of ["name", "description", "product_type", "digital_file", "digital_file_name", "digital_link", "digital_link_instructions", "credential_format", "price", "currency", "image", "stock", "stock_alert", "sku", "is_active", "is_featured", "auto_deliver"]) {
      if (data[key] !== undefined) {
        sets.push(`${key} = ?`);
        vals.push(key === "is_active" || key === "is_featured" || key === "auto_deliver" ? (data[key] ? 1 : 0) : data[key]);
      }
    }
    if (data.unlimited_stock !== undefined) { sets.push("unlimited_stock = ?"); vals.push(data.unlimited_stock ? 1 : 0); }
    if (data.images !== undefined) { sets.push("images = ?"); vals.push(JSON.stringify(data.images)); }
    if (data.metadata !== undefined) { sets.push("metadata = ?"); vals.push(JSON.stringify(data.metadata)); }
    vals.push(id);
    db.prepare(`UPDATE user_shop_products SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    return { success: true };
  },

  deleteUserShopProduct(productId: number, shopId: number) {
    const db = getDatabase();
    db.prepare("UPDATE user_shop_products SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND shop_id = ?").run(productId, shopId);
    return { success: true };
  },

  // ── Product Credentials ──

  getProductCredentials(productId: number) {
    return getDatabase().prepare("SELECT * FROM product_credentials WHERE shop_product_id = ? ORDER BY created_at DESC").all(productId);
  },

  addProductCredentials(productId: number, credentials: string[]) {
    const db = getDatabase();
    const stmt = db.prepare("INSERT INTO product_credentials (shop_product_id, credential_data) VALUES (?, ?)");
    let count = 0;
    for (const cred of credentials) {
      if (cred.trim()) { stmt.run(productId, cred.trim()); count++; }
    }
    return { success: true, count };
  },

  deleteProductCredential(credentialId: number, productId: number) {
    const db = getDatabase();
    db.prepare("DELETE FROM product_credentials WHERE id = ? AND shop_product_id = ? AND status = 'available'").run(credentialId, productId);
    return { success: true };
  },

  assignCredentialToOrderItem(productId: number, orderItemId: number) {
    const db = getDatabase();
    const cred = db.prepare("SELECT * FROM product_credentials WHERE shop_product_id = ? AND status = 'available' ORDER BY created_at ASC LIMIT 1").get(productId) as any;
    if (!cred) return null;
    db.prepare("UPDATE product_credentials SET status = 'sold', assigned_to_order = ?, assigned_at = CURRENT_TIMESTAMP WHERE id = ?").run(orderItemId, cred.id);
    return cred;
  },

  // ── Shop Orders ──

  generateShopOrderRef() {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `SH-${ts}-${rand}`;
  },

  createShopOrder(data: { shopId: number; buyerId?: number; guestName?: string; guestEmail?: string; guestPhone?: string; items: Array<{ productId: number; quantity: number }>; paymentMethod: string }) {
    const db = getDatabase();
    const shop = db.prepare("SELECT * FROM shops WHERE id = ? AND deleted_at IS NULL AND status = 'approved' AND is_active = 1").get(data.shopId) as any;
    if (!shop) throw new Error("Boutique introuvable ou inactive.");
    const reference = NovaDbService.generateShopOrderRef();

    let subtotal = 0;
    const resolvedItems: any[] = [];
    for (const item of data.items) {
      const product = db.prepare("SELECT * FROM user_shop_products WHERE id = ? AND shop_id = ? AND is_active = 1 AND deleted_at IS NULL").get(item.productId, data.shopId) as any;
      if (!product) throw new Error(`Produit #${item.productId} introuvable.`);
      if (!product.unlimited_stock && product.stock !== null && product.stock < item.quantity) throw new Error(`Stock insuffisant pour "${product.name}".`);
      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;
      resolvedItems.push({ product, quantity: item.quantity, lineTotal });
    }

    const commissionAmount = Math.round(subtotal * shop.commission_rate) / 100;
    const sellerAmount = subtotal - commissionAmount;

    let guestToken: string | null = null;
    if (!data.buyerId) {
      guestToken = randomBytes(32).toString("base64url");
    }

    const orderResult = db.prepare(`INSERT INTO shop_orders (reference, shop_id, buyer_id, guest_name, guest_email, guest_phone, guest_token, subtotal, commission_amount, seller_amount, total_amount, currency, status, payment_status, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'XAF', 'pending', 'pending', ?)`).run(
      reference, data.shopId, data.buyerId || null,
      data.guestName || null, data.guestEmail || null, data.guestPhone || null, guestToken,
      subtotal, commissionAmount, sellerAmount, subtotal,
      data.paymentMethod || "wallet"
    );
    const orderId = orderResult.lastInsertRowid as number;

    for (const item of resolvedItems) {
      db.prepare(`INSERT INTO shop_order_items (shop_order_id, product_id, product_name, product_slug, quantity, unit_price, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`).run(
        orderId, item.product.id, item.product.name, item.product.slug, item.quantity, item.product.price, item.lineTotal
      );
      if (!item.product.unlimited_stock && item.product.stock !== null) {
        db.prepare("UPDATE user_shop_products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(item.quantity, item.product.id);
      }
    }

    if (data.paymentMethod === "wallet" && data.buyerId) {
      const wallet = db.prepare("SELECT balance_minor FROM wallets WHERE user_id = ? AND currency = 'XAF'").get(data.buyerId) as any;
      const balanceFcfa = wallet ? wallet.balance_minor / 100 : 0;
      if (balanceFcfa < subtotal) throw new Error("Solde insuffisant.");
      db.prepare("UPDATE wallets SET balance_minor = balance_minor - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND currency = 'XAF'").run(Math.round(subtotal * 100), data.buyerId);
      db.prepare("UPDATE shop_orders SET payment_status = 'paid', status = 'paid', wallet_amount = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?").run(subtotal, orderId);

      const orderItems = db.prepare("SELECT soi.*, usp.product_type, usp.auto_deliver, usp.digital_file, usp.digital_link, usp.digital_link_instructions FROM shop_order_items soi LEFT JOIN user_shop_products usp ON usp.id = soi.product_id WHERE soi.shop_order_id = ?").all(orderId) as any[];
      for (const oi of orderItems) {
        if (oi.auto_deliver && oi.product_type === "digital_account") {
          const cred = NovaDbService.assignCredentialToOrderItem(oi.product_id, oi.id);
          if (cred) {
            db.prepare("UPDATE shop_order_items SET status = 'delivered', auto_delivered = 1 WHERE id = ?").run(oi.id);
          }
        }
      }
    }

    return { success: true, orderId, reference, guestToken };
  },

  getShopOrders(shopId: number, filters?: { status?: string; limit?: number; offset?: number }) {
    const db = getDatabase();
    const clauses: string[] = ["so.shop_id = ?", "so.deleted_at IS NULL"];
    const vals: any[] = [shopId];
    if (filters?.status) { clauses.push("so.status = ?"); vals.push(filters.status); }
    const where = "WHERE " + clauses.join(" AND ");
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;
    return db.prepare(`
      SELECT so.*, u.name AS buyer_name, u.email AS buyer_email
      FROM shop_orders so LEFT JOIN users u ON u.id = so.buyer_id
      ${where} ORDER BY so.created_at DESC LIMIT ? OFFSET ?
    `).all(...vals, limit, offset);
  },

  getShopOrderById(orderId: number) {
    const db = getDatabase();
    const order = db.prepare(`
      SELECT so.*, u.name AS buyer_name, u.email AS buyer_email, s.name AS shop_name, s.slug AS shop_slug, s.user_id AS shop_owner_id
      FROM shop_orders so LEFT JOIN users u ON u.id = so.buyer_id LEFT JOIN shops s ON s.id = so.shop_id
      WHERE so.id = ? AND so.deleted_at IS NULL
    `).get(orderId) as any;
    if (!order) return null;
    const items = db.prepare(`
      SELECT soi.*, usp.image AS product_image, usp.product_type
      FROM shop_order_items soi LEFT JOIN user_shop_products usp ON usp.id = soi.product_id
      WHERE soi.shop_order_id = ?
    `).all(orderId);
    return { ...order, items };
  },

  getShopOrderByRef(reference: string) {
    const order = getDatabase().prepare("SELECT * FROM shop_orders WHERE reference = ? AND deleted_at IS NULL").get(reference) as any;
    if (!order) return null;
    return NovaDbService.getShopOrderById(order.id);
  },

  getShopOrderByGuestToken(token: string) {
    const order = getDatabase().prepare("SELECT * FROM shop_orders WHERE guest_token = ? AND deleted_at IS NULL").get(token) as any;
    if (!order) return null;
    return NovaDbService.getShopOrderById(order.id);
  },

  getBuyerShopOrders(buyerId: number) {
    return getDatabase().prepare(`
      SELECT so.*, s.name AS shop_name, s.slug AS shop_slug
      FROM shop_orders so LEFT JOIN shops s ON s.id = so.shop_id
      WHERE so.buyer_id = ? AND so.deleted_at IS NULL ORDER BY so.created_at DESC
    `).all(buyerId);
  },

  updateShopOrderStatus(orderId: number, status: string, actorId: number, actorType: "seller" | "admin" | "buyer") {
    const db = getDatabase();
    const order = db.prepare("SELECT * FROM shop_orders WHERE id = ?").get(orderId) as any;
    if (!order) throw new Error("Commande introuvable.");

    const sets = ["status = ?", "updated_at = CURRENT_TIMESTAMP"];
    const vals: any[] = [status];
    if (status === "completed") { sets.push("completed_at = CURRENT_TIMESTAMP"); }
    vals.push(orderId);
    db.prepare(`UPDATE shop_orders SET ${sets.join(", ")} WHERE id = ?`).run(...vals);

    if (status === "refunded" && order.wallet_amount > 0 && order.buyer_id) {
      db.prepare("UPDATE wallets SET balance_minor = balance_minor + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND currency = 'XAF'").run(Math.round(order.wallet_amount * 100), order.buyer_id);
    }

    if (status === "cancelled") {
      const items = db.prepare("SELECT * FROM shop_order_items WHERE shop_order_id = ?").all(orderId) as any[];
      for (const item of items) {
        db.prepare("UPDATE user_shop_products SET stock = stock + ? WHERE id = ? AND unlimited_stock = 0 AND stock IS NOT NULL").run(item.quantity, item.product_id);
      }
    }

    return { success: true };
  },

  validateShopOrderItem(orderItemId: number, sellerId: number) {
    const db = getDatabase();
    const item = db.prepare(`SELECT soi.*, so.shop_id FROM shop_order_items soi LEFT JOIN shop_orders so ON so.id = soi.shop_order_id WHERE soi.id = ?`).get(orderItemId) as any;
    if (!item) throw new Error("Article de commande introuvable.");
    const shop = db.prepare("SELECT * FROM shops WHERE id = ? AND user_id = ?").get(item.shop_id, sellerId) as any;
    if (!shop) throw new Error("Non autorisé.");
    db.prepare("UPDATE shop_order_items SET status = 'validated' WHERE id = ?").run(orderItemId);
    const allItems = db.prepare("SELECT * FROM shop_order_items WHERE shop_order_id = ?").all(item.shop_order_id) as any[];
    const allValidated = allItems.every((i: any) => i.id === orderItemId ? true : i.status === "validated" || i.status === "delivered");
    if (allValidated) {
      db.prepare("UPDATE shop_orders SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(item.shop_order_id);
    }
    return { success: true };
  },

  // ── Shop Global Settings ──

  getShopGlobalSettings() {
    const rows = getDatabase().prepare("SELECT * FROM settings WHERE setting_key LIKE 'shop_%'").all() as any[];
    const map: Record<string, string> = {};
    for (const r of rows) map[r.setting_key] = r.setting_value;
    return {
      shop_enabled: map.shop_enabled !== "0",
      shop_min_commission: Number(map.shop_min_commission || 2),
      shop_max_commission: Number(map.shop_max_commission || 30),
      shop_default_commission: Number(map.shop_default_commission || 5),
    };
  },

  updateShopGlobalSetting(key: string, value: string) {
    const db = getDatabase();
    db.prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP").run(key, value);
    return { success: true };
  },

  // ============================================================
  // PHASE 6 — SÉCURITÉ AVANCÉE (PrismCard parity)
  // ============================================================

  // ── Login History ──

  recordLoginHistory(data: { userId: number; method?: string; ip?: string; userAgent?: string; status?: string; failureReason?: string }) {
    const ua = data.userAgent || "";
    let browser = "Inconnu", os = "Inconnu", deviceName = "Appareil inconnu";
    if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Edg")) browser = "Edge";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac OS") || ua.includes("Macintosh")) os = "macOS";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    else if (ua.includes("Linux")) os = "Linux";
    if (ua.includes("iPhone")) deviceName = "iPhone";
    else if (ua.includes("iPad")) deviceName = "iPad";
    else if (ua.includes("Android")) deviceName = "Android";
    else if (ua.includes("Macintosh")) deviceName = "Mac";
    else if (ua.includes("Windows")) deviceName = "PC Windows";
    else if (ua.includes("Linux")) deviceName = "Linux";
    getDatabase().prepare(`
      INSERT INTO login_history (user_id, method, ip_address, user_agent, device_name, browser, os, status, failure_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.userId, data.method || "password", data.ip || null, ua || null, deviceName, browser, os, data.status || "success", data.failureReason || null);
  },

  getLoginHistory(userId: number, limit = 20) {
    return getDatabase().prepare(
      "SELECT id, method, ip_address, device_name, browser, os, country, status, failure_reason, created_at FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
    ).all(userId, limit) as any[];
  },

  // ── Active Sessions (list, revoke individual) ──

  listActiveSessions(userId: number) {
    return getDatabase().prepare(`
      SELECT id, ip_address, user_agent, expires_at, created_at
      FROM user_sessions WHERE user_id = ? AND expires_at > datetime('now') ORDER BY created_at DESC
    `).all(userId) as any[];
  },

  revokeSession(userId: number, sessionId: number, currentTokenDigest?: string) {
    const session = getDatabase().prepare("SELECT id, session_token FROM user_sessions WHERE id = ? AND user_id = ?").get(sessionId, userId) as any;
    if (!session) throw new Error("Session introuvable.");
    if (currentTokenDigest && session.session_token === currentTokenDigest) throw new Error("Impossible de révoquer la session actuelle.");
    getDatabase().prepare("DELETE FROM user_sessions WHERE id = ?").run(sessionId);
    return { success: true };
  },

  // ── WebAuthn Credentials ──

  listWebAuthnCredentials(userId: number) {
    return getDatabase().prepare(
      "SELECT id, name, sign_count, created_at, updated_at FROM webauthn_credentials WHERE user_id = ? ORDER BY created_at DESC"
    ).all(userId) as any[];
  },

  getWebAuthnCredential(credentialId: string, userId: number) {
    return getDatabase().prepare(
      "SELECT * FROM webauthn_credentials WHERE id = ? AND user_id = ?"
    ).get(credentialId, userId) as any;
  },

  saveWebAuthnCredential(data: { id: string; userId: number; name: string; credentialSource: string; signCount: number }) {
    const db = getDatabase();
    const existing = db.prepare("SELECT id FROM webauthn_credentials WHERE id = ?").get(data.id) as any;
    if (existing) {
      db.prepare("UPDATE webauthn_credentials SET credential_source = ?, sign_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(data.credentialSource, data.signCount, data.id);
    } else {
      db.prepare(`
        INSERT INTO webauthn_credentials (id, user_id, name, credential_source, sign_count)
        VALUES (?, ?, ?, ?, ?)
      `).run(data.id, data.userId, data.name, data.credentialSource, data.signCount);
    }
    return { success: true };
  },

  deleteWebAuthnCredential(credentialId: string, userId: number) {
    const result = getDatabase().prepare("DELETE FROM webauthn_credentials WHERE id = ? AND user_id = ?").run(credentialId, userId);
    if (result.changes === 0) throw new Error("Credential non trouvé.");
    return { success: true };
  },

  hasWebAuthnCredentials(userId: number): boolean {
    const row = getDatabase().prepare("SELECT id FROM webauthn_credentials WHERE user_id = ? LIMIT 1").get(userId) as any;
    return !!row;
  },

  // ── Card Verification (email OTP for card access) ──

  createCardVerificationCode(userId: number, cardId: number) {
    const db = getDatabase();
    db.prepare("UPDATE card_verification_codes SET used = 1 WHERE user_id = ? AND card_id = ? AND used = 0").run(userId, cardId);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
    db.prepare(`
      INSERT INTO card_verification_codes (user_id, card_id, code, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(userId, cardId, code, expiresAt);
    return { success: true, code };
  },

  verifyCardCode(userId: number, cardId: number, code: string) {
    const db = getDatabase();
    const row = db.prepare(
      "SELECT id FROM card_verification_codes WHERE user_id = ? AND card_id = ? AND code = ? AND used = 0 AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1"
    ).get(userId, cardId, code.trim()) as any;
    if (!row) throw new Error("Code de vérification invalide ou expiré.");
    db.prepare("UPDATE card_verification_codes SET used = 1 WHERE id = ?").run(row.id);
    return { success: true };
  },

  // ── Enhanced Settings (notification preferences, 2FA) ──

  toggleTwoFactorAuth(userId: number, enable: boolean) {
    const db = getDatabase();
    this.getUserSettings(userId);
    db.prepare("UPDATE user_settings SET two_factor_auth = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?").run(enable ? 1 : 0, userId);
    db.prepare("UPDATE users SET mfa_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(enable ? 1 : 0, userId);
    db.prepare(`
      INSERT INTO user_activity_logs (user_id, action, details, request_id)
      VALUES (?, ?, ?, ?)
    `).run(userId, enable ? "2fa_enabled" : "2fa_disabled", enable ? "Authentification à deux facteurs activée" : "Authentification à deux facteurs désactivée", randomBytes(16).toString("hex"));
    createUserNotification(db, userId, "security", enable ? "2FA activée" : "2FA désactivée", enable ? "L'authentification à deux facteurs est maintenant active sur votre compte." : "L'authentification à deux facteurs a été désactivée.");
    return { success: true, enabled: enable };
  },

  // ── Admin Security Management ──

  adminGetUserSecurityInfo(userId: number) {
    const db = getDatabase();
    const user = db.prepare(`
      SELECT id, name, email, phone, role, status, mfa_enabled, pin_hash, pin_attempts, pin_locked_until,
             email_verified_at, kyc_status, created_at, updated_at
      FROM users WHERE id = ?
    `).get(userId) as any;
    if (!user) throw new Error("Utilisateur introuvable.");
    const trustedDevices = db.prepare("SELECT COUNT(*) as count FROM trusted_devices WHERE user_id = ?").get(userId) as any;
    const webauthnCreds = db.prepare("SELECT COUNT(*) as count FROM webauthn_credentials WHERE user_id = ?").get(userId) as any;
    const activeSessions = db.prepare("SELECT COUNT(*) as count FROM user_sessions WHERE user_id = ? AND expires_at > datetime('now')").get(userId) as any;
    const recentLogins = db.prepare("SELECT * FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10").all(userId) as any[];
    const settings = this.getUserSettings(userId);
    return {
      user,
      hasPin: !!user.pin_hash,
      isPinLocked: !!(user.pin_locked_until && new Date(user.pin_locked_until) > new Date()),
      trustedDeviceCount: trustedDevices.count,
      webauthnCredentialCount: webauthnCreds.count,
      activeSessionCount: activeSessions.count,
      twoFactorEnabled: !!settings.two_factor_auth,
      emailVerified: !!user.email_verified_at,
      recentLogins,
    };
  },

  adminForceResetPassword(userId: number, adminId: number, newPassword: string) {
    const db = getDatabase();
    const user = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(userId) as any;
    if (!user) throw new Error("Utilisateur introuvable.");
    if (newPassword.length < 10) throw new Error("Le mot de passe doit contenir au moins 10 caractères.");
    return withImmediateTransaction(db, () => {
      db.prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(hashSecret(newPassword), userId);
      db.prepare("DELETE FROM user_sessions WHERE user_id = ?").run(userId);
      db.prepare(`
        INSERT INTO user_activity_logs (user_id, action, details, request_id)
        VALUES (?, 'admin_password_reset', ?, ?)
      `).run(userId, `Mot de passe réinitialisé par admin #${adminId}`, randomBytes(16).toString("hex"));
      createUserNotification(db, userId, "security", "Mot de passe réinitialisé", "Votre mot de passe a été réinitialisé par un administrateur. Si ce n'est pas prévu, contactez le support.");
      return { success: true, message: `Mot de passe de ${user.name} réinitialisé. Toutes les sessions ont été fermées.` };
    });
  },

  adminResetUserPin(userId: number, adminId: number) {
    const db = getDatabase();
    db.prepare("UPDATE users SET pin_hash = NULL, pin_attempts = 0, pin_locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(userId);
    db.prepare(`
      INSERT INTO user_activity_logs (user_id, action, details, request_id)
      VALUES (?, 'admin_pin_reset', ?, ?)
    `).run(userId, `PIN réinitialisé par admin #${adminId}`, randomBytes(16).toString("hex"));
    return { success: true };
  },

  adminRevokeAllUserSessions(userId: number) {
    const result = getDatabase().prepare("DELETE FROM user_sessions WHERE user_id = ?").run(userId);
    return { success: true, revokedCount: result.changes };
  },

  adminClearUserTrustedDevices(userId: number) {
    const result = getDatabase().prepare("DELETE FROM trusted_devices WHERE user_id = ?").run(userId);
    return { success: true, clearedCount: result.changes };
  },

  adminClearUserWebAuthn(userId: number) {
    const result = getDatabase().prepare("DELETE FROM webauthn_credentials WHERE user_id = ?").run(userId);
    return { success: true, clearedCount: result.changes };
  },

  adminDisableUser2FA(userId: number) {
    const db = getDatabase();
    db.prepare("UPDATE user_settings SET two_factor_auth = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?").run(userId);
    db.prepare("UPDATE users SET mfa_enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(userId);
    return { success: true };
  },

  // ================================================================
  // PHASE 7 — COMMUNICATION
  // ================================================================

  // --- Push Announcements ---
  createAnnouncement(data: { title: string; message: string; target_audience?: string; created_by?: number }) {
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO push_announcements (title, message, target_audience, status, created_by) VALUES (?, ?, ?, 'draft', ?)
    `).run(data.title, data.message, data.target_audience || "all", data.created_by || null);
    return { id: result.lastInsertRowid };
  },

  listAnnouncements(limit = 50, offset = 0) {
    return getDatabase().prepare(`SELECT * FROM push_announcements ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(limit, offset);
  },

  getAnnouncement(id: number) {
    return getDatabase().prepare("SELECT * FROM push_announcements WHERE id = ?").get(id);
  },

  sendAnnouncement(id: number) {
    const db = getDatabase();
    const ann = db.prepare("SELECT * FROM push_announcements WHERE id = ?").get(id) as any;
    if (!ann) return { success: false, error: "Annonce introuvable" };
    const users = db.prepare("SELECT id FROM users WHERE status = 'active'").all() as any[];
    const insert = db.prepare("INSERT OR IGNORE INTO push_announcement_recipients (push_announcement_id, user_id, status) VALUES (?, ?, 'delivered')");
    const insertNotif = db.prepare("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'announcement', ?, ?)");
    let sent = 0;
    for (const u of users) {
      insert.run(id, u.id);
      insertNotif.run(u.id, ann.title, ann.message);
      sent++;
    }
    db.prepare("UPDATE push_announcements SET status = 'sent', sent_count = ? WHERE id = ?").run(sent, id);
    return { success: true, sent };
  },

  deleteAnnouncement(id: number) {
    getDatabase().prepare("DELETE FROM push_announcements WHERE id = ?").run(id);
    return { success: true };
  },

  // --- Email Campaigns ---
  createEmailCampaign(data: { subject: string; message: string; scheduled_for?: string }) {
    const result = getDatabase().prepare(`
      INSERT INTO email_campaigns (subject, message, status, scheduled_for) VALUES (?, ?, 'draft', ?)
    `).run(data.subject, data.message, data.scheduled_for || null);
    return { id: result.lastInsertRowid };
  },

  listEmailCampaigns(limit = 50) {
    return getDatabase().prepare("SELECT * FROM email_campaigns ORDER BY created_at DESC LIMIT ?").all(limit);
  },

  getEmailCampaign(id: number) {
    const db = getDatabase();
    const campaign = db.prepare("SELECT * FROM email_campaigns WHERE id = ?").get(id) as any;
    if (!campaign) return null;
    const recipients = db.prepare("SELECT * FROM email_campaign_recipients WHERE email_campaign_id = ? ORDER BY created_at DESC LIMIT 100").all(id);
    return { ...campaign, recipients };
  },

  sendEmailCampaign(id: number) {
    const db = getDatabase();
    const campaign = db.prepare("SELECT * FROM email_campaigns WHERE id = ?").get(id) as any;
    if (!campaign) return { success: false, error: "Campagne introuvable" };
    const users = db.prepare("SELECT id, email FROM users WHERE status = 'active' AND email IS NOT NULL AND email <> ''").all() as any[];
    const insert = db.prepare("INSERT INTO email_campaign_recipients (email_campaign_id, user_id, email, status, sent_at) VALUES (?, ?, ?, 'sent', CURRENT_TIMESTAMP)");
    let sent = 0;
    for (const u of users) { insert.run(id, u.id, u.email); sent++; }
    db.prepare("UPDATE email_campaigns SET status = 'completed', total_recipients = ?, sent_count = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(sent, sent, id);
    return { success: true, sent };
  },

  deleteEmailCampaign(id: number) {
    getDatabase().prepare("DELETE FROM email_campaigns WHERE id = ?").run(id);
    return { success: true };
  },

  // --- Email Settings ---
  listEmailSettings() {
    return getDatabase().prepare("SELECT * FROM email_settings ORDER BY id").all();
  },

  getActiveEmailSetting() {
    return getDatabase().prepare("SELECT * FROM email_settings WHERE is_active = 1 LIMIT 1").get();
  },

  saveEmailSetting(data: { id?: number; mail_host?: string; mail_port?: number; mail_username?: string; mail_password?: string; mail_encryption?: string; mail_from_address?: string; mail_from_name?: string; is_active?: number }) {
    const db = getDatabase();
    if (data.id) {
      db.prepare(`UPDATE email_settings SET mail_host=?, mail_port=?, mail_username=?, mail_password=?, mail_encryption=?, mail_from_address=?, mail_from_name=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .run(data.mail_host, data.mail_port || 587, data.mail_username, data.mail_password, data.mail_encryption || "tls", data.mail_from_address, data.mail_from_name, data.is_active ? 1 : 0, data.id);
      return { id: data.id };
    }
    const r = db.prepare(`INSERT INTO email_settings (mail_host, mail_port, mail_username, mail_password, mail_encryption, mail_from_address, mail_from_name, is_active) VALUES (?,?,?,?,?,?,?,?)`)
      .run(data.mail_host, data.mail_port || 587, data.mail_username, data.mail_password, data.mail_encryption || "tls", data.mail_from_address, data.mail_from_name, data.is_active ? 1 : 0);
    return { id: r.lastInsertRowid };
  },

  deleteEmailSetting(id: number) {
    getDatabase().prepare("DELETE FROM email_settings WHERE id = ?").run(id);
    return { success: true };
  },

  // --- Support Messages (chat) ---
  listSupportMessages(ticketId: number, limit = 100) {
    return getDatabase().prepare("SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC LIMIT ?").all(ticketId, limit);
  },

  createSupportMessage(data: { ticket_id: number; sender_type: string; sender_id?: number; content: string; message_type?: string; attachment_url?: string; attachment_name?: string; attachment_size?: number; attachment_mime?: string; reply_to_id?: number }) {
    const db = getDatabase();
    const r = db.prepare(`
      INSERT INTO support_messages (ticket_id, sender_type, sender_id, content, message_type, attachment_url, attachment_name, attachment_size, attachment_mime, reply_to_id)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(data.ticket_id, data.sender_type, data.sender_id || null, data.content, data.message_type || "text", data.attachment_url || null, data.attachment_name || null, data.attachment_size || null, data.attachment_mime || null, data.reply_to_id || null);
    db.prepare("UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(data.ticket_id);
    return { id: r.lastInsertRowid };
  },

  markSupportMessagesRead(ticketId: number, readerType: string) {
    const opposite = readerType === "user" ? "admin" : "user";
    getDatabase().prepare("UPDATE support_messages SET read_at = CURRENT_TIMESTAMP WHERE ticket_id = ? AND sender_type = ? AND read_at IS NULL").run(ticketId, opposite);
    return { success: true };
  },

  togglePinMessage(messageId: number) {
    const db = getDatabase();
    const msg = db.prepare("SELECT is_pinned FROM support_messages WHERE id = ?").get(messageId) as any;
    if (!msg) return { success: false };
    db.prepare("UPDATE support_messages SET is_pinned = ? WHERE id = ?").run(msg.is_pinned ? 0 : 1, messageId);
    return { success: true, pinned: !msg.is_pinned };
  },

  reactToMessage(messageId: number, emoji: string, userId: number) {
    const db = getDatabase();
    const msg = db.prepare("SELECT reactions FROM support_messages WHERE id = ?").get(messageId) as any;
    if (!msg) return { success: false };
    const reactions = msg.reactions ? JSON.parse(msg.reactions) : {};
    if (!reactions[emoji]) reactions[emoji] = [];
    const idx = reactions[emoji].indexOf(userId);
    if (idx >= 0) reactions[emoji].splice(idx, 1); else reactions[emoji].push(userId);
    if (reactions[emoji].length === 0) delete reactions[emoji];
    db.prepare("UPDATE support_messages SET reactions = ? WHERE id = ?").run(JSON.stringify(reactions), messageId);
    return { success: true, reactions };
  },

  deleteSupportMessage(messageId: number) {
    getDatabase().prepare("DELETE FROM support_messages WHERE id = ?").run(messageId);
    return { success: true };
  },

  // --- Push Subscriptions ---
  savePushSubscription(data: { user_id: number; endpoint: string; p256dh: string; auth_key: string; device_name?: string; browser?: string; os?: string }) {
    const db = getDatabase();
    const existing = db.prepare("SELECT id FROM push_subscriptions WHERE endpoint = ?").get(data.endpoint) as any;
    if (existing) {
      db.prepare("UPDATE push_subscriptions SET user_id=?, p256dh=?, auth_key=?, device_name=?, browser=?, os=?, is_active=1, updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .run(data.user_id, data.p256dh, data.auth_key, data.device_name || null, data.browser || null, data.os || null, existing.id);
      return { id: existing.id };
    }
    const r = db.prepare("INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_key, device_name, browser, os) VALUES (?,?,?,?,?,?,?)")
      .run(data.user_id, data.endpoint, data.p256dh, data.auth_key, data.device_name || null, data.browser || null, data.os || null);
    return { id: r.lastInsertRowid };
  },

  removePushSubscription(endpoint: string) {
    getDatabase().prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
    return { success: true };
  },

  listPushSubscriptions(userId?: number) {
    if (userId) return getDatabase().prepare("SELECT * FROM push_subscriptions WHERE user_id = ? AND is_active = 1").all(userId);
    return getDatabase().prepare("SELECT * FROM push_subscriptions WHERE is_active = 1").all();
  },

  // ================================================================
  // PHASE 8 — FONCTIONNALITÉS SUPPLÉMENTAIRES
  // ================================================================

  // --- Identity Verification / KYC ---
  submitIdentityVerification(data: { user_id: number; document_type: string; front_image?: string; back_image?: string; selfie_image?: string }) {
    const r = getDatabase().prepare(`
      INSERT INTO identity_verifications (user_id, document_type, front_image, back_image, selfie_image, status, submitted_at)
      VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `).run(data.user_id, data.document_type, data.front_image || null, data.back_image || null, data.selfie_image || null);
    return { id: r.lastInsertRowid };
  },

  getUserVerification(userId: number) {
    return getDatabase().prepare("SELECT * FROM identity_verifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(userId);
  },

  listIdentityVerifications(status?: string, limit = 50) {
    if (status) {
      return getDatabase().prepare(`
        SELECT iv.*, u.name as user_name, u.email as user_email FROM identity_verifications iv
        LEFT JOIN users u ON u.id = iv.user_id WHERE iv.status = ? ORDER BY iv.created_at DESC LIMIT ?
      `).all(status, limit);
    }
    return getDatabase().prepare(`
      SELECT iv.*, u.name as user_name, u.email as user_email FROM identity_verifications iv
      LEFT JOIN users u ON u.id = iv.user_id ORDER BY iv.created_at DESC LIMIT ?
    `).all(limit);
  },

  reviewIdentityVerification(id: number, adminId: number, status: string, reason?: string) {
    getDatabase().prepare(`
      UPDATE identity_verifications SET status = ?, decision_reason = ?, decided_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(status, reason || null, adminId, id);
    return { success: true };
  },

  // --- Activity Log ---
  recordActivity(data: { user_id?: number; action: string; details?: string; ip_address?: string; user_agent?: string; method?: string; url?: string }) {
    getDatabase().prepare(`
      INSERT INTO activities (user_id, action, details, ip_address, user_agent, method, url) VALUES (?,?,?,?,?,?,?)
    `).run(data.user_id || null, data.action, data.details || null, data.ip_address || null, data.user_agent || null, data.method || null, data.url || null);
  },

  listActivities(limit = 100, userId?: number) {
    if (userId) {
      return getDatabase().prepare("SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT ?").all(userId, limit);
    }
    return getDatabase().prepare("SELECT * FROM activities ORDER BY created_at DESC LIMIT ?").all(limit);
  },

  // --- Revenue Analytics ---
  recordRevenue(data: { source: string; amount_minor: number; currency?: string; reference_id?: number; reference_type?: string; description?: string }) {
    getDatabase().prepare(`
      INSERT INTO revenue_records (source, amount_minor, currency, reference_id, reference_type, description, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(data.source, data.amount_minor, data.currency || "XAF", data.reference_id || null, data.reference_type || null, data.description || null);
  },

  getRevenueAnalytics(days = 30) {
    const db = getDatabase();
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const bySource = db.prepare(`
      SELECT source, SUM(amount_minor) as total, COUNT(*) as count FROM revenue_records
      WHERE recorded_at >= ? GROUP BY source ORDER BY total DESC
    `).all(since);
    const byDay = db.prepare(`
      SELECT DATE(recorded_at) as day, SUM(amount_minor) as total, COUNT(*) as count
      FROM revenue_records WHERE recorded_at >= ? GROUP BY DATE(recorded_at) ORDER BY day
    `).all(since);
    const totalRow = db.prepare("SELECT SUM(amount_minor) as total, COUNT(*) as count FROM revenue_records WHERE recorded_at >= ?").get(since) as any;
    return { bySource, byDay, total: totalRow?.total || 0, count: totalRow?.count || 0, days };
  },

  // --- Help Articles ---
  listHelpArticles(category?: string) {
    if (category) {
      return getDatabase().prepare("SELECT * FROM help_articles WHERE is_active = 1 AND category = ? ORDER BY sort_order, title").all(category);
    }
    return getDatabase().prepare("SELECT * FROM help_articles WHERE is_active = 1 ORDER BY category, sort_order, title").all();
  },

  getHelpArticle(slug: string) {
    const db = getDatabase();
    const article = db.prepare("SELECT * FROM help_articles WHERE slug = ?").get(slug) as any;
    if (article) db.prepare("UPDATE help_articles SET views = views + 1 WHERE id = ?").run(article.id);
    return article;
  },

  saveHelpArticle(data: { id?: number; category: string; title: string; slug: string; content: string; excerpt?: string; sort_order?: number; is_active?: number }) {
    const db = getDatabase();
    if (data.id) {
      db.prepare(`UPDATE help_articles SET category=?, title=?, slug=?, content=?, excerpt=?, sort_order=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .run(data.category, data.title, data.slug, data.content, data.excerpt || null, data.sort_order || 0, data.is_active ?? 1, data.id);
      return { id: data.id };
    }
    const r = db.prepare("INSERT INTO help_articles (category, title, slug, content, excerpt, sort_order, is_active) VALUES (?,?,?,?,?,?,?)")
      .run(data.category, data.title, data.slug, data.content, data.excerpt || null, data.sort_order || 0, data.is_active ?? 1);
    return { id: r.lastInsertRowid };
  },

  deleteHelpArticle(id: number) {
    getDatabase().prepare("DELETE FROM help_articles WHERE id = ?").run(id);
    return { success: true };
  },

  // --- Landing Page CMS (update) ---
  updateLandingPageSettings(data: Record<string, any>) {
    const db = getDatabase();
    const existing = db.prepare("SELECT id FROM landing_page_settings LIMIT 1").get() as any;
    if (!existing) db.prepare("INSERT INTO landing_page_settings (site_name) VALUES ('NovaPaid')").run();
    const allowed = [
      "site_name", "site_logo", "favicon", "hero_title", "hero_subtitle", "hero_image", "hero_cta_text", "hero_cta_url",
      "stats_json", "features_json", "testimonials_json", "pricing_json", "faq_json",
      "cta_title", "cta_subtitle", "cta_button_text", "cta_button_url",
      "footer_text", "footer_links_json", "social_links_json",
      "contact_email", "contact_phone", "contact_address",
      "seo_title", "seo_description", "seo_keywords", "seo_og_image",
      "font_heading", "font_body", "primary_color", "secondary_color", "marketplace_overlay_enabled",
    ];
    const sets: string[] = [];
    const vals: any[] = [];
    for (const key of allowed) {
      if (key in data) { sets.push(`${key} = ?`); vals.push(data[key]); }
    }
    if (sets.length === 0) return { success: false, error: "Aucun champ valide" };
    sets.push("updated_at = CURRENT_TIMESTAMP");
    db.prepare(`UPDATE landing_page_settings SET ${sets.join(", ")} WHERE id = (SELECT id FROM landing_page_settings LIMIT 1)`).run(...vals);
    return { success: true };
  },

  // --- Webhook Relay ---
  listWebhookRelays() {
    return getDatabase().prepare("SELECT * FROM webhook_relays ORDER BY created_at DESC").all();
  },

  getWebhookRelay(id: number) {
    const db = getDatabase();
    const relay = db.prepare("SELECT * FROM webhook_relays WHERE id = ?").get(id) as any;
    if (!relay) return null;
    const destinations = db.prepare("SELECT * FROM webhook_destinations WHERE webhook_relay_id = ?").all(id);
    const recentEvents = db.prepare("SELECT * FROM webhook_events WHERE webhook_relay_id = ? ORDER BY created_at DESC LIMIT 20").all(id);
    return { ...relay, destinations, recentEvents };
  },

  createWebhookRelay(data: { name: string; api_key_id?: number }) {
    const publicId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const token = crypto.randomUUID();
    const r = getDatabase().prepare("INSERT INTO webhook_relays (name, public_id, token, api_key_id) VALUES (?,?,?,?)")
      .run(data.name, publicId, token, data.api_key_id || null);
    return { id: r.lastInsertRowid, public_id: publicId, token };
  },

  deleteWebhookRelay(id: number) {
    getDatabase().prepare("DELETE FROM webhook_relays WHERE id = ?").run(id);
    return { success: true };
  },

  addWebhookDestination(relayId: number, url: string, secret?: string) {
    const r = getDatabase().prepare("INSERT INTO webhook_destinations (webhook_relay_id, url, secret) VALUES (?,?,?)").run(relayId, url, secret || null);
    return { id: r.lastInsertRowid };
  },

  removeWebhookDestination(id: number) {
    getDatabase().prepare("DELETE FROM webhook_destinations WHERE id = ?").run(id);
    return { success: true };
  },

  // --- Card Issuing Settings ---
  getCardIssuingSettings() {
    const row = getDatabase().prepare("SELECT * FROM card_issuing_settings LIMIT 1").get();
    if (!row) {
      getDatabase().prepare("INSERT INTO card_issuing_settings (active_provider) VALUES ('sandbox')").run();
      return getDatabase().prepare("SELECT * FROM card_issuing_settings LIMIT 1").get();
    }
    return row;
  },

  updateCardIssuingSettings(data: Record<string, any>) {
    const db = getDatabase();
    db.prepare("SELECT * FROM card_issuing_settings LIMIT 1").get() || db.prepare("INSERT INTO card_issuing_settings (active_provider) VALUES ('sandbox')").run();
    const allowed = ["active_provider", "maplerad_environment", "ziiropay_environment", "max_cards_per_user", "card_creation_enabled"];
    const sets: string[] = [];
    const vals: any[] = [];
    for (const k of allowed) { if (k in data) { sets.push(`${k} = ?`); vals.push(data[k]); } }
    if (!sets.length) return { success: false };
    sets.push("updated_at = CURRENT_TIMESTAMP");
    db.prepare(`UPDATE card_issuing_settings SET ${sets.join(", ")} WHERE id = (SELECT id FROM card_issuing_settings LIMIT 1)`).run(...vals);
    return { success: true };
  },

  // --- Card Termination Requests ---
  listCardTerminationRequests(status?: string) {
    if (status) return getDatabase().prepare("SELECT ctr.*, u.name as user_name, c.card_number FROM card_termination_requests ctr LEFT JOIN users u ON u.id = ctr.user_id LEFT JOIN cards c ON c.id = ctr.card_id WHERE ctr.status = ? ORDER BY ctr.created_at DESC").all(status);
    return getDatabase().prepare("SELECT ctr.*, u.name as user_name, c.card_number FROM card_termination_requests ctr LEFT JOIN users u ON u.id = ctr.user_id LEFT JOIN cards c ON c.id = ctr.card_id ORDER BY ctr.created_at DESC").all();
  },

  createCardTerminationRequest(cardId: number, userId: number, reason?: string) {
    const r = getDatabase().prepare("INSERT INTO card_termination_requests (card_id, user_id, reason) VALUES (?,?,?)").run(cardId, userId, reason || null);
    return { id: r.lastInsertRowid };
  },

  reviewCardTermination(id: number, status: string, refundAmount?: number) {
    getDatabase().prepare("UPDATE card_termination_requests SET status = ?, refund_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, refundAmount || null, id);
    return { success: true };
  },

  // --- Deposit Help Popup ---
  getDepositHelpPopup() {
    const row = getDatabase().prepare("SELECT * FROM deposit_help_popup_settings LIMIT 1").get();
    if (!row) {
      getDatabase().prepare("INSERT INTO deposit_help_popup_settings (title) VALUES ('Besoin d''aide pour déposer?')").run();
      return getDatabase().prepare("SELECT * FROM deposit_help_popup_settings LIMIT 1").get();
    }
    return row;
  },

  updateDepositHelpPopup(data: { title?: string; message?: string; video_url?: string; is_active?: number; show_after_seconds?: number }) {
    const db = getDatabase();
    db.prepare("SELECT id FROM deposit_help_popup_settings LIMIT 1").get() || db.prepare("INSERT INTO deposit_help_popup_settings (title) VALUES ('Besoin d''aide?')").run();
    const sets: string[] = [];
    const vals: any[] = [];
    for (const [k, v] of Object.entries(data)) { sets.push(`${k} = ?`); vals.push(v); }
    if (!sets.length) return { success: false };
    sets.push("updated_at = CURRENT_TIMESTAMP");
    db.prepare(`UPDATE deposit_help_popup_settings SET ${sets.join(", ")} WHERE id = (SELECT id FROM deposit_help_popup_settings LIMIT 1)`).run(...vals);
    return { success: true };
  },

  // --- Marketing Settings (update) ---
  updateMarketingSettings(data: Record<string, any>) {
    const db = getDatabase();
    db.prepare("SELECT id FROM marketing_settings LIMIT 1").get() || db.prepare("INSERT INTO marketing_settings (is_active) VALUES (0)").run();
    const allowed = ["facebook_pixel_id", "google_analytics_id", "google_tag_manager_id", "tiktok_pixel_id", "is_active"];
    const sets: string[] = [];
    const vals: any[] = [];
    for (const k of allowed) { if (k in data) { sets.push(`${k} = ?`); vals.push(data[k]); } }
    if (!sets.length) return { success: false };
    sets.push("updated_at = CURRENT_TIMESTAMP");
    db.prepare(`UPDATE marketing_settings SET ${sets.join(", ")} WHERE id = (SELECT id FROM marketing_settings LIMIT 1)`).run(...vals);
    return { success: true };
  },

  // --- Admin Global Search ---
  adminGlobalSearch(query: string) {
    const db = getDatabase();
    const term = `%${query}%`;
    const users = db.prepare("SELECT id, name, email, role, status FROM users WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? LIMIT 10").all(term, term, term);
    const transactions = db.prepare("SELECT id, user_id, type, amount_minor, status, created_at FROM ledger_transactions WHERE reference LIKE ? OR description LIKE ? LIMIT 10").all(term, term);
    const tickets = db.prepare("SELECT id, user_id, subject, status FROM support_tickets WHERE subject LIKE ? OR ticket_number LIKE ? LIMIT 10").all(term, term);
    return { users, transactions, tickets };
  },
};
