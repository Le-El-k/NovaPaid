import { NovaDbService } from "../../app/lib/db/service.ts";
import { getAuthenticatedUser, isSameOriginRequest, readCookie, USER_SESSION_COOKIE, hashSessionToken } from "../../app/lib/auth/session.ts";

export async function GET(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Non authentifié" }, { status: 401 });

  const url = new URL(request.url);
  const section = url.searchParams.get("section") || "overview";

  try {
    if (section === "overview") {
      const settings = NovaDbService.getUserSettings(user.id);
      const trustedDevices = NovaDbService.listTrustedDevices(user.id);
      const webauthnCreds = NovaDbService.listWebAuthnCredentials(user.id);
      const loginHistory = NovaDbService.getLoginHistory(user.id, 10);
      const activeSessions = NovaDbService.listActiveSessions(user.id);
      const profile = NovaDbService.getProfile(user.id);
      return Response.json({
        success: true,
        hasPin: !!(profile as any)?.hasPin,
        twoFactorEnabled: !!settings.two_factor_auth,
        emailVerified: !!(profile as any)?.emailVerifiedAt,
        trustedDevices,
        webauthnCredentials: webauthnCreds,
        loginHistory,
        activeSessions: activeSessions.map((s: any) => {
          let browser = "Inconnu", device = "Appareil";
          const ua = s.user_agent || "";
          if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
          else if (ua.includes("Firefox")) browser = "Firefox";
          else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
          else if (ua.includes("Edg")) browser = "Edge";
          if (ua.includes("iPhone")) device = "iPhone";
          else if (ua.includes("Android")) device = "Android";
          else if (ua.includes("Macintosh")) device = "Mac";
          else if (ua.includes("Windows")) device = "PC";
          else if (ua.includes("Linux")) device = "Linux";
          return { ...s, browser, device };
        }),
        settings: {
          notification_email: settings.notification_email,
          notification_push: settings.notification_push,
          two_factor_auth: settings.two_factor_auth,
          dark_mode: settings.dark_mode,
          language: settings.language,
        },
      });
    }

    if (section === "login_history") {
      const limit = Number(url.searchParams.get("limit")) || 20;
      const history = NovaDbService.getLoginHistory(user.id, Math.min(limit, 50));
      return Response.json({ success: true, loginHistory: history });
    }

    if (section === "trusted_devices") {
      return Response.json({ success: true, trustedDevices: NovaDbService.listTrustedDevices(user.id) });
    }

    if (section === "active_sessions") {
      return Response.json({ success: true, sessions: NovaDbService.listActiveSessions(user.id) });
    }

    if (section === "webauthn_credentials") {
      return Response.json({ success: true, credentials: NovaDbService.listWebAuthnCredentials(user.id) });
    }

    return Response.json({ success: false, error: "Section inconnue" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Non authentifié" }, { status: 401 });
  if (!isSameOriginRequest(request)) return Response.json({ success: false, error: "Origine refusée." }, { status: 403 });

  try {
    const body = await request.json();
    const action = String(body?.action || "");

    if (action === "toggle_2fa") {
      const result = NovaDbService.toggleTwoFactorAuth(user.id, !!body.enable);
      return Response.json(result);
    }

    if (action === "update_settings") {
      const result = NovaDbService.updateUserSettings(user.id, {
        notification_email: body.notification_email !== undefined ? (body.notification_email ? 1 : 0) : undefined,
        notification_push: body.notification_push !== undefined ? (body.notification_push ? 1 : 0) : undefined,
        dark_mode: body.dark_mode !== undefined ? (body.dark_mode ? 1 : 0) : undefined,
        language: body.language || undefined,
      });
      return Response.json(result);
    }

    if (action === "remove_trusted_device") {
      return Response.json(NovaDbService.removeTrustedDevice(user.id, Number(body.device_id)));
    }

    if (action === "remove_all_trusted_devices") {
      return Response.json(NovaDbService.removeAllTrustedDevices(user.id));
    }

    if (action === "revoke_session") {
      const currentToken = readCookie(request, USER_SESSION_COOKIE);
      const tokenDigest = currentToken ? hashSessionToken(currentToken) : undefined;
      return Response.json(NovaDbService.revokeSession(user.id, Number(body.session_id), tokenDigest));
    }

    if (action === "delete_webauthn_credential") {
      return Response.json(NovaDbService.deleteWebAuthnCredential(String(body.credential_id), user.id));
    }

    if (action === "request_card_verification") {
      const result = NovaDbService.createCardVerificationCode(user.id, Number(body.card_id));
      return Response.json(result);
    }

    if (action === "verify_card_code") {
      const result = NovaDbService.verifyCardCode(user.id, Number(body.card_id), String(body.code));
      return Response.json(result);
    }

    return Response.json({ success: false, error: "Action inconnue" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 400 });
  }
}
