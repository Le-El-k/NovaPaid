import { NovaDbService } from "../../app/lib/db/service.ts";
import { getAuthenticatedUser, isSameOriginRequest, readCookie, USER_SESSION_COOKIE } from "../../app/lib/auth/session.ts";

export async function GET(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Connexion requise." }, { status: 401 });
  try {
    return Response.json({ success: true, profile: NovaDbService.getProfile(user.id) });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Profil indisponible." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Connexion requise." }, { status: 401 });
  if (!isSameOriginRequest(request)) return Response.json({ success: false, error: "Origine de requête refusée." }, { status: 403 });
  try {
    const body = await request.json();
    if (body?.action === "update_profile") {
      const result = NovaDbService.updateUserProfile(user.id, {
        name: String(body.name || ""),
        phone: String(body.phone || ""),
        currentPassword: String(body.currentPassword || ""),
      });
      return Response.json(result);
    }
    if (body?.action === "revoke_other_sessions") {
      const result = NovaDbService.revokeOtherUserSessions(user.id, readCookie(request, USER_SESSION_COOKIE));
      return Response.json(result);
    }
    if (body?.action === "change_password") {
      const result = NovaDbService.changeUserPassword(
        user.id,
        String(body.currentPassword || ""),
        String(body.newPassword || ""),
        readCookie(request, USER_SESSION_COOKIE),
      );
      return Response.json(result);
    }
    if (body?.action === "submit_kyc") {
      const result = NovaDbService.submitKycRequest(user.id, String(body.documentType || "identity_card"));
      return Response.json(result);
    }
    if (body?.action === "set_pin") {
      const result = NovaDbService.setUserPin(user.id, String(body.currentPassword || ""), String(body.pin || ""));
      return Response.json(result);
    }
    if (body?.action === "remove_pin") {
      const result = NovaDbService.removeUserPin(user.id, String(body.currentPassword || ""));
      return Response.json(result);
    }
    if (body?.action === "verify_pin") {
      const valid = NovaDbService.verifyUserPin(user.id, String(body.pin || ""));
      return Response.json({ success: true, valid });
    }
    return Response.json({ success: false, error: "Action de profil inconnue." }, { status: 400 });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Mise à jour impossible." }, { status: 400 });
  }
}
