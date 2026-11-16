import { getIntegrationValue } from "../../../app/lib/integrations.ts";
import { getAuthenticatedUser, isSameOriginRequest } from "../../../app/lib/auth/session.ts";
import { NovaDbService } from "../../../app/lib/db/service.ts";
import { createSoleaspayOrder, attachProviderSession, markSoleaspayOrderFailed, USD_XAF_RATE } from "../../../app/lib/payments/soleaspay/orders.ts";
import { createPaymentSession, isBkpayConfigured } from "../../../app/lib/payments/bkpay/client.ts";

const CARD_CREATION_FEE_USD = 9;

// Initialise a BKApay payment: create a pending order, then a BKApay hosted
// "secured session" (amount locked server-side). Returns payment_url to redirect to.
export async function POST(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Connexion requise." }, { status: 401 });
  if (!isSameOriginRequest(request)) return Response.json({ success: false, error: "Origine de requête refusée." }, { status: 403 });
  if (!isBkpayConfigured()) return Response.json({ success: false, error: "BKApay n'est pas configuré." }, { status: 503 });

  try {
    const body = await request.json();
    const type = String(body.type || "");

    let amountXaf = 0;
    let amountUsd: number | undefined;
    let cardId: number | undefined;
    let meta: Record<string, unknown> | undefined;
    let description = "";

    if (type === "card_recharge") {
      cardId = Number(body.cardId);
      amountUsd = Number(body.amountUsd);
      if (!Number.isSafeInteger(cardId) || cardId < 1) return Response.json({ success: false, error: "Identifiant de carte invalide." }, { status: 400 });
      if (!Number.isFinite(amountUsd) || amountUsd < 1 || amountUsd > 1000) return Response.json({ success: false, error: "Montant de recharge invalide (1 - 1 000 USD)." }, { status: 400 });
      const info = NovaDbService.getCardProviderInfo(user.id, cardId);
      if (!info) return Response.json({ success: false, error: "Carte introuvable." }, { status: 404 });
      if (info.status !== "active") return Response.json({ success: false, error: "Réactivez la carte avant de la recharger." }, { status: 409 });
      amountXaf = Math.ceil(amountUsd * USD_XAF_RATE);
      description = `Recharge carte (+${amountUsd.toFixed(2)} USD)`;
    } else if (type === "wallet_deposit") {
      amountXaf = Math.round(Number(body.amountXaf));
      if (!Number.isFinite(amountXaf) || amountXaf < 100 || amountXaf > 5_000_000) return Response.json({ success: false, error: "Montant de dépôt invalide (100 - 5 000 000 FCFA)." }, { status: 400 });
      description = `Dépôt portefeuille NovaPaid (${amountXaf.toLocaleString("fr-FR")} FCFA)`;
    } else if (type === "card_creation") {
      const brand = String(body.brand || "");
      amountUsd = Number(body.amountUsd ?? 10);
      if (!["visa", "mastercard"].includes(brand)) return Response.json({ success: false, error: "Marque invalide (visa ou mastercard)." }, { status: 400 });
      if (!Number.isFinite(amountUsd) || amountUsd < 1 || amountUsd > 100) return Response.json({ success: false, error: "Montant initial invalide (1 - 100 USD)." }, { status: 400 });
      amountXaf = Math.ceil((CARD_CREATION_FEE_USD + amountUsd) * USD_XAF_RATE);
      meta = { brand, amountUsd, label: typeof body.label === "string" ? body.label.slice(0, 60) : undefined };
      description = "Création carte virtuelle NovaPaid";
    } else {
      return Response.json({ success: false, error: "Type de paiement inconnu." }, { status: 400 });
    }

    const order = createSoleaspayOrder({ userId: user.id, type: type as any, amountXaf, amountUsd, cardId, meta });

    const base = (getIntegrationValue("site", "public_base_url") || new URL(request.url).origin).replace(/\/$/, "");
    const session = await createPaymentSession({
      amount: order.amountXaf,
      currency: "XAF",
      description,
      successUrl: `${base}/payment/success?provider=bkpay&order=${encodeURIComponent(order.orderRef)}`,
      cancelUrl: `${base}/payment/failed?provider=bkpay&order=${encodeURIComponent(order.orderRef)}`,
      callbackUrl: `${base}/api/webhooks/bkpay`,
      orderId: order.orderRef,
    });

    if (!session.ok || !session.paymentUrl) {
      markSoleaspayOrderFailed(order.orderRef, JSON.stringify({ initError: session.error }));
      return Response.json({ success: false, error: session.error || "Échec de la création de la session BKApay." }, { status: session.status && session.status >= 400 ? session.status : 502 });
    }

    attachProviderSession(order.orderRef, "bkpay", session.sessionId);
    return Response.json({ success: true, orderRef: order.orderRef, amountXaf: order.amountXaf, paymentUrl: session.paymentUrl });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Erreur initialisation du paiement BKApay." }, { status: 400 });
  }
}
