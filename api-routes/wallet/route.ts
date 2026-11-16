import { NovaDbService } from "../../app/lib/db/service.ts";
import { getAuthenticatedUser, isSameOriginRequest } from "../../app/lib/auth/session.ts";

export async function GET(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Connexion requise." }, { status: 401 });
  try {
    const profile = NovaDbService.getProfile(user.id);
    const wallet = NovaDbService.getWallet(user.id);
    return Response.json({
      success: true,
      profile,
      wallet,
    });
  } catch (error: any) {
    return Response.json(
      { success: false, error: error?.message || "Erreur serveur" },
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
    const action = String(body?.action || "");
    const amount = Number(body?.amount);
    const provider = String(body?.provider || "");
    const phone = String(body?.phone || "");
    const idempotencyKey = String(body?.idempotencyKey || "");

    if (!Number.isSafeInteger(amount) || amount <= 0 || !idempotencyKey) {
      return Response.json(
        { success: false, error: "Montant entier positif et clé de requête requis." },
        { status: 400 }
      );
    }

    if (action === "deposit") {
      const res = NovaDbService.executeDeposit(user.id, amount, provider, phone, idempotencyKey);
      return Response.json(res, { status: 202 });
    }

    if (action === "withdraw") {
      const res = NovaDbService.executeWithdrawal(user.id, amount, provider, phone, idempotencyKey);
      return Response.json(res, { status: 202 });
    }

    return Response.json(
      { success: false, error: "Action non reconnue (deposit ou withdraw)" },
      { status: 400 }
    );
  } catch (error: any) {
    return Response.json(
      { success: false, error: error?.message || "Erreur de traitement" },
      { status: 400 }
    );
  }
}
