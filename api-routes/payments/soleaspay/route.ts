import { getAuthenticatedUser, isSameOriginRequest } from "../../../app/lib/auth/session.ts";
import { NovaDbService } from "../../../app/lib/db/service.ts";
import { createSoleaspayOrder, getUsdXafRate } from "../../../app/lib/payments/soleaspay/orders.ts";

// Frais de création, en FCFA par réseau. Maplerad facture l'émission 2 USD (≈ 1 220 FCFA à 610) ;
// le reste est le revenu NovaPaid. Visa 4 500 (revenu 3 280), Mastercard 6 000 (revenu 4 780).
const CARD_CREATION_FEE_XAF: Record<string, number> = { visa: 4500, mastercard: 6000 };

// Initialise a SoleasPay payment: creates a pending order server-side and
// returns the reference the hosted checkout form must POST, so the webhook can
// reconcile and credit the account after payment.
export async function POST(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Connexion requise." }, { status: 401 });
  if (!isSameOriginRequest(request)) return Response.json({ success: false, error: "Origine de requête refusée." }, { status: 403 });

  try {
    const body = await request.json();
    const type = String(body.type || "");

    if (type === "card_recharge") {
      // La recharge directe de carte par Mobile Money est désactivée : on passe
      // obligatoirement par le solde principal (rechargez le portefeuille, puis
      // alimentez la carte depuis ce solde — sans frais supplémentaire).
      return Response.json({
        success: false,
        error: "Rechargez d'abord votre solde principal, puis alimentez la carte depuis ce solde.",
      }, { status: 400 });
    }

    if (type === "wallet_deposit") {
      const amountXaf = Math.round(Number(body.amountXaf));
      if (!Number.isFinite(amountXaf) || amountXaf < 100 || amountXaf > 5_000_000) {
        return Response.json({ success: false, error: "Montant de dépôt invalide (100 - 5 000 000 FCFA)." }, { status: 400 });
      }
      const order = createSoleaspayOrder({ userId: user.id, type, amountXaf });
      return Response.json({ success: true, ...order });
    }

    if (type === "card_creation") {
      const brand = String(body.brand || "");
      const amountUsd = Number(body.amountUsd ?? 10);
      if (!["visa", "mastercard"].includes(brand)) {
        return Response.json({ success: false, error: "Marque invalide (visa ou mastercard)." }, { status: 400 });
      }
      if (!Number.isFinite(amountUsd) || amountUsd < 1 || amountUsd > 100) {
        return Response.json({ success: false, error: "Montant initial invalide (1 - 100 USD)." }, { status: 400 });
      }
      const amountXaf = CARD_CREATION_FEE_XAF[brand] + Math.ceil(amountUsd * getUsdXafRate());
      const order = createSoleaspayOrder({
        userId: user.id,
        type,
        amountXaf,
        amountUsd,
        meta: { brand, amountUsd, label: typeof body.label === "string" ? body.label.slice(0, 60) : undefined },
      });
      return Response.json({ success: true, ...order });
    }

    return Response.json({ success: false, error: "Type de paiement inconnu." }, { status: 400 });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Erreur initialisation du paiement." }, { status: 400 });
  }
}
