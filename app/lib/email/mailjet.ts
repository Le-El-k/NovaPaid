// Server-side Mailjet transactional email sender.
//
// Credentials live only in process.env (loaded from .env.mailjet.local, which is
// git-ignored). Never import this from client code — the secret key must stay on
// the server. Uses the Mailjet Send API v3.1.
//
// Docs: https://dev.mailjet.com/email/guides/send-api-v31/

const MAILJET_SEND_URL = "https://api.mailjet.com/v3.1/send";

type SendResult = { ok: true } | { ok: false; error: string };

function mailjetConfig() {
  const apiKey = (process.env.MAILJET_API_KEY || "").trim();
  const secretKey = (process.env.MAILJET_SECRET_KEY || "").trim();
  const fromEmail = (process.env.MAILJET_FROM_EMAIL || "support@novapaid.net").trim();
  const fromName = (process.env.MAILJET_FROM_NAME || "NovaPaid").trim();
  // Validated fallback sender: used only if the primary sender is rejected, so a
  // misconfigured branded sender can never block logins / registrations.
  const fallbackEmail = (process.env.MAILJET_FALLBACK_FROM_EMAIL || "").trim();
  return { apiKey, secretKey, fromEmail, fromName, fallbackEmail };
}

export function isMailjetConfigured(): boolean {
  const { apiKey, secretKey } = mailjetConfig();
  return Boolean(apiKey && secretKey);
}

async function sendFrom(auth: string, fromEmail: string, fromName: string, params: {
  toEmail: string; toName?: string; subject: string; textPart: string; htmlPart: string;
}): Promise<SendResult> {
  const payload = {
    Messages: [
      {
        From: { Email: fromEmail, Name: fromName },
        To: [{ Email: params.toEmail, Name: params.toName || params.toEmail }],
        Subject: params.subject,
        TextPart: params.textPart,
        HTMLPart: params.htmlPart,
      },
    ],
  };
  try {
    const res = await fetch(MAILJET_SEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let detail = "";
      try {
        const data = await res.json();
        detail = data?.ErrorMessage || data?.Messages?.[0]?.Errors?.[0]?.ErrorMessage || "";
      } catch { /* ignore parse errors */ }
      return { ok: false, error: `Échec de l'envoi de l'email (${res.status}).${detail ? " " + detail : ""}` };
    }
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Échec de l'envoi de l'email." };
  }
}

async function sendMail(params: {
  toEmail: string;
  toName?: string;
  subject: string;
  textPart: string;
  htmlPart: string;
}): Promise<SendResult> {
  const { apiKey, secretKey, fromEmail, fromName, fallbackEmail } = mailjetConfig();
  if (!apiKey || !secretKey) {
    return { ok: false, error: "Service d'email non configuré." };
  }

  const auth = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");
  const primary = await sendFrom(auth, fromEmail, fromName, params);
  if (primary.ok) return primary;
  // The branded sender was rejected — fall back to a validated sender so the user
  // still receives their code instead of being locked out.
  if (fallbackEmail && fallbackEmail.toLowerCase() !== fromEmail.toLowerCase()) {
    const fallback = await sendFrom(auth, fallbackEmail, fromName, params);
    if (fallback.ok) return fallback;
  }
  return primary;
}

const PURPOSE_COPY: Record<string, { title: string; intro: string }> = {
  login: {
    title: "Connexion à votre compte",
    intro: "Utilisez ce code pour confirmer votre connexion à NovaPaid.",
  },
  registration: {
    title: "Vérification de votre email",
    intro: "Utilisez ce code pour vérifier votre adresse email et activer votre compte NovaPaid.",
  },
  password_reset: {
    title: "Réinitialisation de mot de passe",
    intro: "Utilisez ce code pour réinitialiser le mot de passe de votre compte NovaPaid.",
  },
};

function codeEmailHtml(code: string, purpose: string): string {
  const copy = PURPOSE_COPY[purpose] || PURPOSE_COPY.login;
  const spaced = code.split("").join("&nbsp;&nbsp;");
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f1f4f9;padding:24px;font-family:'Segoe UI',Arial,sans-serif;color:#1b2439;">
  <div style="max-width:460px;margin:0 auto;background:#ffffff;border:1px solid #e6e9f2;border-radius:18px;overflow:hidden;">
    <div style="background:linear-gradient(120deg,#2f6fed,#6f55e9);padding:22px 26px;">
      <span style="color:#fff;font-size:18px;font-weight:800;letter-spacing:-.4px;">Nova<span style="color:#d7e3ff;">Paid</span></span>
    </div>
    <div style="padding:28px 26px;">
      <h1 style="margin:0 0 8px;font-size:19px;font-weight:800;color:#141c30;">${copy.title}</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#5b6578;">${copy.intro}</p>
      <div style="text-align:center;background:#f5f7fc;border:1px solid #e3e8f3;border-radius:14px;padding:18px 0;margin-bottom:20px;">
        <span style="font-size:30px;font-weight:800;letter-spacing:6px;color:#2f4bd1;">${spaced}</span>
      </div>
      <p style="margin:0 0 6px;font-size:12.5px;line-height:1.6;color:#7a8498;">Ce code expire dans <strong>10 minutes</strong>. Ne le partagez avec personne.</p>
      <p style="margin:0;font-size:12.5px;line-height:1.6;color:#7a8498;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    </div>
    <div style="padding:16px 26px;border-top:1px solid #eef1f7;font-size:11px;color:#9aa3b5;">© NovaPaid — Paiements numériques au Cameroun.</div>
  </div>
</body></html>`;
}

// Sends a 6-digit verification code for the given purpose (login | registration | password_reset).
export async function sendVerificationCodeEmail(
  toEmail: string,
  toName: string,
  code: string,
  purpose: "login" | "registration" | "password_reset",
): Promise<SendResult> {
  const copy = PURPOSE_COPY[purpose] || PURPOSE_COPY.login;
  return sendMail({
    toEmail,
    toName,
    subject: `${copy.title} — Code ${code}`,
    textPart: `${copy.intro}\n\nVotre code de vérification NovaPaid : ${code}\n\nCe code expire dans 10 minutes. Ne le partagez avec personne.`,
    htmlPart: codeEmailHtml(code, purpose),
  });
}
