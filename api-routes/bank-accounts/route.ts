import { NovaDbService } from "../../app/lib/db/service.ts";
import { getAuthenticatedUser, isSameOriginRequest } from "../../app/lib/auth/session.ts";
import { createMapleradBankAccount, isMapleradActive, MapleradError } from "../../app/lib/payments/maplerad/service.ts";

export async function GET(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Connexion requise." }, { status: 401 });
  try {
    const accounts = NovaDbService.listBankAccounts(user.id);
    return Response.json({ success: true, accounts, providerActive: isMapleradActive() });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Erreur récupération comptes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Connexion requise." }, { status: 401 });
  if (!isSameOriginRequest(request)) return Response.json({ success: false, error: "Origine de requête refusée." }, { status: 403 });

  if (!isMapleradActive()) {
    return Response.json({ success: false, error: "La création de comptes bancaires n'est pas disponible actuellement." }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const currency = (body?.currency || "NGN").toString().toUpperCase();
    if (currency !== "NGN") {
      return Response.json({ success: false, error: "Seuls les comptes NGN sont disponibles pour le moment." }, { status: 400 });
    }

    const result = await createMapleradBankAccount(user.id, "NGN");
    return Response.json({ success: true, accountId: result.accountId, status: result.status });
  } catch (err: any) {
    const status = err instanceof MapleradError ? err.status : 400;
    return Response.json({ success: false, error: err?.message || "Échec de la création du compte." }, { status });
  }
}
