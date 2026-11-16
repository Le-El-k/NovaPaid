import { NovaDbService } from "../../app/lib/db/service.ts";
import { getAuthenticatedUser, isSameOriginRequest } from "../../app/lib/auth/session.ts";

export async function GET(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Connexion requise." }, { status: 401 });
  try {
    const beneficiaries = NovaDbService.getBeneficiaries(user.id);
    const transactions = NovaDbService.getTransactions(user.id);
    const transferRecords = NovaDbService.getUserTransferRecords(user.id);
    const wallet = NovaDbService.getWallet(user.id);
    const limits = NovaDbService.getTransferLimits(user.id);
    return Response.json({
      success: true,
      beneficiaries,
      transactions,
      transferRecords,
      wallet,
      limits,
      user: { id: user.id, name: user.name },
    });
  } catch (error: any) {
    return Response.json(
      { success: false, error: error?.message || "Erreur récupération transferts" },
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
    const { action, name, handle, phone, email, beneficiaryId, favorite, recipientUserId, amount, note, idempotencyKey, transactionRef, reason, contact, recipientLast4 } = body;

    if (action === "card_transfer") {
      const check = NovaDbService.verifyCardRecipient(String(contact || ""), String(recipientLast4 || ""));
      if (!check.ok) {
        return Response.json({ success: false, error: check.error || "Destinataire introuvable." }, { status: 404 });
      }
      return Response.json({ success: true, recipientUserId: check.recipientUserId });
    }

    if (action === "add_beneficiary") {
      const beneficiary = NovaDbService.createBeneficiary(user.id, {
        name: String(name || ""),
        handle: handle ? String(handle) : undefined,
        phone: phone ? String(phone) : undefined,
        email: email ? String(email) : undefined,
      });
      return Response.json({ success: true, beneficiary }, { status: 201 });
    }

    if (action === "favorite_beneficiary") {
      const result = NovaDbService.setBeneficiaryFavorite(user.id, Number(beneficiaryId), favorite === true);
      return Response.json(result);
    }

    if (action === "dispute_transfer") {
      const result = NovaDbService.createTransferDispute(user.id, String(transactionRef || ""), String(reason || ""));
      return Response.json(result, { status: 201 });
    }

    if (!recipientUserId || !amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return Response.json(
        { success: false, error: "Bénéficiaire NovaPaid et montant positif requis." },
        { status: 400 }
      );
    }

    const result = NovaDbService.executeTransfer(user.id, Number(recipientUserId), Number(amount), note ? String(note) : undefined, idempotencyKey ? String(idempotencyKey) : undefined);
    return Response.json(result);
  } catch (error: any) {
    return Response.json(
      { success: false, error: error?.message || "Erreur exécution transfert" },
      { status: 400 }
    );
  }
}
