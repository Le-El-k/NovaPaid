import { NovaDbService } from "../../../app/lib/db/service.ts";
import { getAuthenticatedUser, isSameOriginRequest } from "../../../app/lib/auth/session.ts";
import { sendVerificationCodeEmail } from "../../../app/lib/email/mailjet.ts";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ success: false, error: "Origine de requête refusée." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = String(body?.action || "");

    // Vérification d'email via OTP
    if (action === "send_email_code") {
      const user = getAuthenticatedUser(request);
      if (!user) return Response.json({ success: false, error: "Session invalide." }, { status: 401 });
      if (NovaDbService.isEmailVerified(user.id)) {
        return Response.json({ success: true, message: "Email déjà vérifié." });
      }
      const created = NovaDbService.createVerificationCode(user.id, "registration", "email");
      const sent = await sendVerificationCodeEmail(user.email, user.name, created.code, "registration");
      if (!sent.ok) return Response.json({ success: false, error: "Impossible d'envoyer le code. Réessayez dans un instant." }, { status: 502 });
      return Response.json({ success: true, message: "Code de vérification envoyé par email." });
    }

    if (action === "verify_email") {
      const user = getAuthenticatedUser(request);
      if (!user) return Response.json({ success: false, error: "Session invalide." }, { status: 401 });
      const code = String(body?.code || "");
      NovaDbService.verifyCode(user.id, code, "registration");
      NovaDbService.verifyEmail(user.id);
      return Response.json({ success: true, message: "Email vérifié avec succès." });
    }

    // Vérification OTP pour login (2FA)
    if (action === "send_login_code") {
      const userId = Number(body?.userId);
      if (!userId) return Response.json({ success: false, error: "Utilisateur non identifié." }, { status: 400 });
      let profile;
      try { profile = NovaDbService.getProfile(userId); } catch { return Response.json({ success: false, error: "Utilisateur introuvable." }, { status: 404 }); }
      const created = NovaDbService.createVerificationCode(userId, "login", "email");
      const sent = await sendVerificationCodeEmail(profile.email, profile.name, created.code, "login");
      if (!sent.ok) return Response.json({ success: false, error: "Impossible d'envoyer le code. Réessayez dans un instant." }, { status: 502 });
      return Response.json({ success: true, message: "Code de vérification envoyé." });
    }

    if (action === "verify_login_code") {
      const userId = Number(body?.userId);
      const code = String(body?.code || "");
      if (!userId) return Response.json({ success: false, error: "Utilisateur non identifié." }, { status: 400 });
      const result = NovaDbService.verifyCode(userId, code, "login");
      return Response.json(result);
    }

    // Vérification PIN
    if (action === "verify_pin") {
      const user = getAuthenticatedUser(request);
      if (!user) return Response.json({ success: false, error: "Session invalide." }, { status: 401 });
      const pin = String(body?.pin || "");
      NovaDbService.verifyUserPin(user.id, pin);
      return Response.json({ success: true, message: "PIN vérifié." });
    }

    // Trusted devices
    if (action === "list_trusted_devices") {
      const user = getAuthenticatedUser(request);
      if (!user) return Response.json({ success: false, error: "Session invalide." }, { status: 401 });
      const devices = NovaDbService.listTrustedDevices(user.id);
      return Response.json({ success: true, devices });
    }

    if (action === "remove_trusted_device") {
      const user = getAuthenticatedUser(request);
      if (!user) return Response.json({ success: false, error: "Session invalide." }, { status: 401 });
      const deviceId = Number(body?.deviceId);
      if (!deviceId) return Response.json({ success: false, error: "ID de l'appareil manquant." }, { status: 400 });
      NovaDbService.removeTrustedDevice(user.id, deviceId);
      return Response.json({ success: true, message: "Appareil de confiance supprimé." });
    }

    if (action === "remove_all_trusted_devices") {
      const user = getAuthenticatedUser(request);
      if (!user) return Response.json({ success: false, error: "Session invalide." }, { status: 401 });
      NovaDbService.removeAllTrustedDevices(user.id);
      return Response.json({ success: true, message: "Tous les appareils de confiance supprimés." });
    }

    return Response.json({ success: false, error: "Action non reconnue." }, { status: 400 });
  } catch (error: any) {
    const retryAfter = error?.retryAfter;
    return Response.json(
      { success: false, error: error?.message || "Erreur de vérification.", ...(retryAfter ? { retryAfter } : {}) },
      retryAfter ? { status: 429, headers: { "Retry-After": String(retryAfter) } } : { status: 400 },
    );
  }
}
