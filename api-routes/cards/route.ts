import { NovaDbService } from "../../app/lib/db/service.ts";
import { getAuthenticatedUser, isSameOriginRequest } from "../../app/lib/auth/session.ts";
import { isMapleradActive, issueMapleradCard, setMapleradCardFreeze, MapleradError } from "../../app/lib/payments/maplerad/service.ts";

export async function GET(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Connexion requise." }, { status: 401 });
  try {
    const url = new URL(request.url);
    const cardId = url.searchParams.get("cardId");
    if (cardId) {
      const id = Number(cardId);
      if (!Number.isSafeInteger(id) || id < 1) return Response.json({ success: false, error: "Identifiant de carte invalide." }, { status: 400 });
      const transactions = NovaDbService.getCardTransactions(user.id, id);
      return Response.json({ success: true, transactions });
    }
    const cards = NovaDbService.getCards(user.id);
    return Response.json({
      success: true,
      cards,
      count: cards.length,
      maxCards: 3,
      isLimitReached: cards.length >= 3,
    });
  } catch (error: any) {
    return Response.json(
      { success: false, error: error?.message || "Erreur récupération cartes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Connexion requise." }, { status: 401 });
  if (!isSameOriginRequest(request)) return Response.json({ success: false, error: "Origine de requête refusée." }, { status: 403 });
  try {
    const body = await request.json();

    // Toggle freeze / unfreeze action
    if (body.action === "toggle_freeze" || body.action === "freeze" || body.action === "unfreeze") {
      const cardId = Number(body.cardId);
      if (!Number.isSafeInteger(cardId) || cardId < 1) {
        return Response.json({ success: false, error: "Identifiant de carte invalide." }, { status: 400 });
      }

      const info = NovaDbService.getCardProviderInfo(user.id, cardId);
      if (!info) {
        return Response.json({ success: false, error: "Carte introuvable ou non autorisée." }, { status: 404 });
      }

      // Real state change at Maplerad first; only mutate local state if it succeeds.
      if (isMapleradActive() && info.provider === "maplerad" && info.providerCardRef) {
        const target = info.status === "frozen" ? "unfreeze" : "freeze";
        try {
          await setMapleradCardFreeze(info.providerCardRef, target);
        } catch (err: any) {
          const status = err instanceof MapleradError ? err.status : 502;
          return Response.json(
            { success: false, error: err?.message || "Échec du changement d'état de la carte chez Maplerad." },
            { status },
          );
        }
      }

      const updatedCard = NovaDbService.userToggleCardFreeze(user.id, cardId);
      return Response.json({
        success: true,
        card: updatedCard,
        provider: info.provider,
      });
    }

    // Fund card action
    if (body.action === "fund") {
      const cardId = Number(body.cardId);
      const amountUsd = Number(body.amountUsd);
      if (!Number.isSafeInteger(cardId) || cardId < 1) {
        return Response.json({ success: false, error: "Identifiant de carte invalide." }, { status: 400 });
      }
      if (!Number.isFinite(amountUsd) || amountUsd < 1 || amountUsd > 1000) {
        return Response.json({ success: false, error: "Montant de recharge invalide (1 - 1 000 USD)." }, { status: 400 });
      }
      const result = NovaDbService.fundCard(user.id, cardId, amountUsd);
      return Response.json(result);
    }

    // Withdraw from card action
    if (body.action === "withdraw") {
      const cardId = Number(body.cardId);
      const amountUsd = Number(body.amountUsd);
      if (!Number.isSafeInteger(cardId) || cardId < 1) {
        return Response.json({ success: false, error: "Identifiant de carte invalide." }, { status: 400 });
      }
      if (!Number.isFinite(amountUsd) || amountUsd < 1 || amountUsd > 1000) {
        return Response.json({ success: false, error: "Montant de retrait invalide (1 - 1 000 USD)." }, { status: 400 });
      }
      const result = NovaDbService.withdrawFromCard(user.id, cardId, amountUsd);
      return Response.json(result);
    }

    // Card creation
    const { brand, amountUsd, label } = body;

    if (!brand || !["visa", "mastercard"].includes(brand)) {
      return Response.json(
        { success: false, error: "Marque invalide (visa ou mastercard requise)" },
        { status: 400 }
      );
    }

    const amount = Number(amountUsd ?? 10);
    if (!Number.isFinite(amount) || amount < 1 || amount > 100) {
      return Response.json({ success: false, error: "Le montant doit être compris entre 1 et 100 USD." }, { status: 400 });
    }

    // Émission réelle via Maplerad quand le prestataire est actif et configuré.
    if (isMapleradActive()) {
      try {
        const result = await issueMapleradCard(user.id, { brand, amountUsd: amount, label });
        return Response.json({
          success: true,
          pending: true,
          cardId: result.cardId,
          reference: result.reference,
          costXaf: result.costXaf,
          newWalletBalanceXaf: result.newWalletBalanceXaf,
          message: "Carte en cours d'émission. Elle sera active sous peu.",
        });
      } catch (err: any) {
        const status = err instanceof MapleradError ? err.status : 400;
        return Response.json({ success: false, error: err?.message || "Échec de l'émission de la carte." }, { status });
      }
    }

    const card = NovaDbService.createCard(user.id, brand, amount, label);
    return Response.json({
      success: true,
      card,
    });
  } catch (error: any) {
    return Response.json(
      { success: false, error: error?.message || "Erreur opération carte" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  return POST(request);
}
