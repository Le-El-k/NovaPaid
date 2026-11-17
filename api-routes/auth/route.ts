import { NovaDbService } from "../../app/lib/db/service.ts";
import { clientContext, expiredSessionCookie, getAuthenticatedUser, isSameOriginRequest, readCookie, sessionCookie, USER_SESSION_COOKIE } from "../../app/lib/auth/session.ts";
import { sendVerificationCodeEmail } from "../../app/lib/email/mailjet.ts";

// Masks an email for display, e.g. "jo****@gmail.com".
function maskEmail(email: string): string {
  const [local, domain] = String(email).split("@");
  if (!domain) return email;
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(2, local.length - 2))}@${domain}`;
}

function ipKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function GET(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Session invalide ou expirée." }, { status: 401 });
  try {
    return Response.json({ success: true, user, wallet: NovaDbService.getWallet(user.id) });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Session invalide" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body?.action || "");
    const context = clientContext(request);

    if (action === "logout") {
      if (!isSameOriginRequest(request)) return Response.json({ success: false, error: "Origine de requête refusée." }, { status: 403 });
      NovaDbService.logoutUser(readCookie(request, USER_SESSION_COOKIE));
      return Response.json(
        { success: true, message: "Déconnexion réussie" },
        { headers: { "Set-Cookie": expiredSessionCookie(USER_SESSION_COOKIE) } }
      );
    }

    if (action === "register") {
      const name = String(body?.name || "").trim();
      const email = String(body?.email || "").trim();
      const phone = String(body?.phone || "").trim();
      const password = String(body?.password || "");
      if (!name || !email || !password) {
        return Response.json({ success: false, error: "Nom, email et mot de passe sont obligatoires." }, { status: 400 });
      }
      if (name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return Response.json({ success: false, error: "Vérifiez le nom et l’adresse email." }, { status: 400 });
      }
      if (phone.length > 32) return Response.json({ success: false, error: "Numéro de téléphone trop long." }, { status: 400 });
      if (password.length < 10 || password.length > 200) {
        return Response.json({ success: false, error: "Le mot de passe doit contenir entre 10 et 200 caractères." }, { status: 400 });
      }
      const retryAfter = NovaDbService.checkAuthRateLimit(`register:${ipKey(request)}`, 5, 60 * 60 * 1000, 60 * 60 * 1000);
      if (retryAfter) return Response.json({ success: false, error: "Trop de tentatives d’inscription. Réessayez plus tard." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });

      const result = NovaDbService.registerUser(name, email, phone, password, context);
      NovaDbService.clearAuthRateLimit(`register:${ipKey(request)}`);
      // Send a 6-digit email verification code so the new user can confirm the address.
      try {
        const created = NovaDbService.createVerificationCode(result.user.id, "registration");
        await sendVerificationCodeEmail(result.user.email, result.user.name, created.code, "registration");
      } catch { /* email best-effort; the client can resend from the verification step */ }
      const { sessionToken, ...payload } = result;
      return Response.json(
        { ...payload, requiresEmailVerification: true, emailMasked: maskEmail(result.user.email) },
        { status: 201, headers: { "Set-Cookie": sessionCookie(USER_SESSION_COOKIE, sessionToken, 30 * 24 * 60 * 60) } }
      );
    }

    // Step 1 of email-2FA login: validate the password and email a 6-digit code.
    if (action === "login") {
      const identifier = String(body?.emailOrPhone || body?.email || "").trim();
      const password = String(body?.password || "");
      if (!identifier || !password) {
        return Response.json({ success: false, error: "Identifiant (email ou téléphone) et mot de passe requis." }, { status: 400 });
      }
      const rateKey = `login:${ipKey(request)}:${identifier.toLowerCase()}`;
      // Mot de passe raté plus de 5 fois → verrou de 5 min (avec décompte côté client).
      const retryAfter = NovaDbService.checkAuthRateLimit(rateKey, 6, 15 * 60 * 1000, 5 * 60 * 1000);
      if (retryAfter) return Response.json({ success: false, error: "Trop de tentatives de connexion. Réessayez plus tard.", retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });

      const begun = NovaDbService.beginLogin(identifier, password);
      NovaDbService.clearAuthRateLimit(rateKey);
      const created = NovaDbService.createVerificationCode(begun.userId, "login");
      const sent = await sendVerificationCodeEmail(begun.email, begun.name, created.code, "login");
      if (!sent.ok) {
        return Response.json({ success: false, error: "Impossible d'envoyer le code de vérification. Réessayez dans un instant." }, { status: 502 });
      }
      return Response.json({ success: true, requiresCode: true, userId: begun.userId, emailMasked: maskEmail(begun.email) });
    }

    // Step 2 of email-2FA login: verify the code and open the session.
    if (action === "login_verify") {
      const userId = Number(body?.userId);
      const code = String(body?.code || "").trim();
      if (!userId || !/^\d{6}$/.test(code)) {
        return Response.json({ success: false, error: "Code à 6 chiffres requis." }, { status: 400 });
      }
      const rateKey = `login_verify:${ipKey(request)}:${userId}`;
      const retryAfter = NovaDbService.checkAuthRateLimit(rateKey);
      if (retryAfter) return Response.json({ success: false, error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });

      const result = NovaDbService.completeLogin(userId, code, context);
      NovaDbService.clearAuthRateLimit(rateKey);
      const { sessionToken, ...payload } = result;
      return Response.json(payload, { headers: { "Set-Cookie": sessionCookie(USER_SESSION_COOKIE, sessionToken, 30 * 24 * 60 * 60) } });
    }

    return Response.json({ success: false, error: "Action non reconnue (register, login, login_verify ou logout attendu)." }, { status: 400 });
  } catch (error: any) {
    const retryAfter = error?.retryAfter;
    return Response.json(
      { success: false, error: error?.message || "Erreur d'authentification", ...(retryAfter ? { retryAfter } : {}) },
      retryAfter ? { status: 429, headers: { "Retry-After": String(retryAfter) } } : { status: 400 },
    );
  }
}
