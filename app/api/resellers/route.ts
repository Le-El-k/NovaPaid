import { NovaDbService } from "../../lib/db/service.ts";
import { getAuthenticatedUser, isSameOriginRequest } from "../../lib/auth/session.ts";

export async function GET(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Connexion requise." }, { status: 401 });
  try {
    const data = NovaDbService.getResellerDashboard(user.id);
    return Response.json(data);
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Erreur programme revendeur" }, { status: 500 });
  }
}
