import { NovaDbService } from "../../app/lib/db/service.ts";
import { getAuthenticatedUser } from "../../app/lib/auth/session.ts";

export async function GET(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Connexion requise." }, { status: 401 });
  try {
    const transactions = NovaDbService.getTransactions(user.id);
    const summary = NovaDbService.getMonthlyTransactionSummary(user.id);
    return Response.json({
      success: true,
      transactions,
      summary,
    });
  } catch (error: any) {
    return Response.json(
      { success: false, error: error?.message || "Erreur récupération transactions" },
      { status: 500 }
    );
  }
}
