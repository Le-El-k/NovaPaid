import { NovaDbService } from "../../../lib/db/service.ts";
import { isSameOriginRequest } from "../../../lib/auth/session.ts";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ success: false, error: "Origine de requête refusée." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = String(body?.action || "");

    if (action === "request") {
      const email = String(body?.email || "").trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return Response.json({ success: false, error: "Adresse email invalide." }, { status: 400 });
      }
      const result = NovaDbService.createPasswordResetToken(email);
      // NOTE: en production, envoyer l'email avec le token via le service email
      // Ici on retourne un message générique pour ne pas révéler si le compte existe
      return Response.json({ success: true, message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." });
    }

    if (action === "reset") {
      const token = String(body?.token || "");
      const password = String(body?.password || "");
      if (!token) {
        return Response.json({ success: false, error: "Token de réinitialisation manquant." }, { status: 400 });
      }
      if (password.length < 10 || password.length > 200) {
        return Response.json({ success: false, error: "Le mot de passe doit contenir entre 10 et 200 caractères." }, { status: 400 });
      }
      const result = NovaDbService.resetPassword(token, password);
      return Response.json(result);
    }

    return Response.json({ success: false, error: "Action non reconnue (request ou reset attendu)." }, { status: 400 });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Erreur lors de la réinitialisation." }, { status: 400 });
  }
}
