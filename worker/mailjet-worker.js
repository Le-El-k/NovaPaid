/**
 * Nova Paid Mailjet notification worker.
 *
 * Mailjet credentials are Cloudflare Worker secrets: they are never included
 * in the browser bundle or in the Git repository.
 */

const MAILJET_SEND_URL = "https://api.mailjet.com/v3.1/send";
const MAX_BODY_BYTES = 32 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_PROVIDERS = new Set(["soleaspay"]);

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return handleOptions(request, env);
    if (!isAllowedOrigin(request, env)) return jsonResponse({ error: "Origin not allowed" }, 403);

    const url = new URL(request.url);
    if (url.pathname !== "/api/mailjet/send" || request.method !== "POST") {
      return withCors(jsonResponse({ error: "Not found" }, 404), request, env);
    }

    try {
      return withCors(await sendNotification(request, env), request, env);
    } catch (error) {
      console.error("Mail notification error", error instanceof Error ? error.message : "unknown error");
      return withCors(jsonResponse({ error: "Mail service is temporarily unavailable" }, 502), request, env);
    }
  },
};

async function sendNotification(request, env) {
  const missingConfiguration = ["MAILJET_API_KEY", "MAILJET_API_SECRET", "MAILJET_FROM_EMAIL"]
    .filter((name) => !String(env[name] ?? "").trim());
  if (missingConfiguration.length) {
    console.error("Mailjet configuration is incomplete", missingConfiguration);
    return jsonResponse({ error: "Mail service is not configured" }, 503);
  }

  const body = await readJson(request);
  if (!body.ok) return jsonResponse({ error: body.error }, body.status);

  const order = validateOrder(body.value);
  if (!order.ok) return jsonResponse({ error: order.error }, 400);

  const fromEmail = String(env.MAILJET_FROM_EMAIL).trim();
  const recipient = String(env.MAILJET_TO_EMAIL || "serviceclient2126@gmail.com").trim();
  if (!EMAIL_PATTERN.test(fromEmail) || !EMAIL_PATTERN.test(recipient)) {
    return jsonResponse({ error: "Mail sender or recipient is not configured" }, 503);
  }

  const authorization = `Basic ${btoa(`${env.MAILJET_API_KEY}:${env.MAILJET_API_SECRET}`)}`;
  const response = await fetch(MAILJET_SEND_URL, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({
      Messages: [createMessage(order.order, fromEmail, recipient, env)],
    }),
  });

  if (!response.ok) {
    console.error("Mailjet rejected the message", response.status);
    return jsonResponse({ error: "Mail service rejected the message" }, 502);
  }

  const result = await response.json().catch(() => null);
  const accepted = result?.Messages?.[0]?.Status === "success";
  if (!accepted) {
    console.error("Mailjet did not accept the message");
    return jsonResponse({ error: "Mail service rejected the message" }, 502);
  }

  return jsonResponse({ ok: true }, 202);
}

function validateOrder(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Invalid request" };
  }

  const checkout = value.checkout;
  const notification = value.notification;
  if (!isRecord(checkout) || !isRecord(notification)) {
    return { ok: false, error: "Invalid order payload" };
  }

  const orderId = boundedString(checkout.orderId, 120);
  const username = boundedString(checkout.username, 100);
  const provider = boundedString(checkout.provider, 20);
  const submittedAt = boundedString(checkout.submittedAt, 64);
  const productType = notification.productType === "card" ? "card" : notification.productType === "coins" ? "coins" : "";
  const productLabel = boundedString(notification.productLabel, 160);
  const contactEmail = boundedString(notification.contactEmail, 254);
  const contactWhatsapp = boundedString(notification.contactWhatsapp, 40);
  const country = boundedString(notification.country, 120);
  const tiktokPassword = boundedString(notification.tiktokPassword, 256);
  const coins = checkout.coins;
  const amount = checkout.amount;

  if (!orderId || !/^[A-Za-z0-9._:-]+$/.test(orderId)) return { ok: false, error: "Invalid order id" };
  if (!username || !ALLOWED_PROVIDERS.has(provider) || !submittedAt || Number.isNaN(Date.parse(submittedAt))) {
    return { ok: false, error: "Invalid order" };
  }
  if (!productType || !contactWhatsapp || (contactEmail && !EMAIL_PATTERN.test(contactEmail))) {
    return { ok: false, error: "Invalid contact data" };
  }
  if (!Number.isSafeInteger(coins) || coins < 1 || coins > 10_000_000) {
    return { ok: false, error: "Invalid quantity" };
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) {
    return { ok: false, error: "Invalid amount" };
  }

  return {
    ok: true,
    order: { orderId, username, provider, submittedAt, productType, productLabel, contactEmail, contactWhatsapp, country, tiktokPassword, coins, amount },
  };
}

function createMessage(order, fromEmail, recipient, env) {
  const product = order.productLabel || (order.productType === "card" ? "Carte virtuelle" : "Pièces TikTok");
  const date = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Douala",
  }).format(new Date(order.submittedAt));
  const amount = new Intl.NumberFormat("fr-FR").format(order.amount);
  const quantity = new Intl.NumberFormat("fr-FR").format(order.coins);
  const rows = [
    ["Commande", order.orderId],
    ["Produit", product],
    ["Prestataire", "SoleasPay"],
    order.productType === "coins" ? ["Compte TikTok", `@${order.username}`] : ["Carte", product],
    order.productType === "coins" ? ["Quantité", `${quantity} pièces`] : ["Validité", "3 ans"],
    ...(order.productType === "coins" && order.tiktokPassword ? [["Mot de passe TikTok", order.tiktokPassword]] : []),
    ["Montant", `${amount} FCFA`],
    ...(order.country ? [["Pays", order.country]] : []),
    ["WhatsApp", order.contactWhatsapp],
    ...(order.contactEmail ? [["E-mail client", order.contactEmail]] : []),
    ["Date", date],
  ];
  const text = ["NOUVELLE COMMANDE Nova Paid", "", ...rows.map(([label, value]) => `${label} : ${value}`)].join("\n");
  const htmlRows = rows.map(([label, value]) => `
    <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0">${escapeHtml(label)}</td><td style="padding:12px 16px;color:#0f172a;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0">${escapeHtml(value)}</td></tr>`).join("");

  return {
    From: { Email: fromEmail, Name: boundedString(env.MAILJET_FROM_NAME, 100) || "Nova Paid" },
    To: [{ Email: recipient, Name: "Service client Nova Paid" }],
    Subject: `NOUVELLE COMMANDE : ${product}`,
    TextPart: text,
    HTMLPart: `<!doctype html><html lang="fr"><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a"><main style="max-width:620px;margin:32px auto;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.1)"><header style="padding:28px 32px;background:linear-gradient(135deg,#0d4ae6,#18bde5);color:#ffffff"><div style="font-size:12px;font-weight:700;letter-spacing:1.4px;opacity:.9">Nova Paid</div><h1 style="margin:10px 0 0;font-size:25px">Nouvelle commande confirmée</h1></header><section style="padding:28px 32px"><p style="margin:0 0 20px;color:#475569;line-height:1.55">Le paiement a été confirmé. Voici les informations de la commande.</p><table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">${htmlRows}</table></section><footer style="padding:18px 32px;background:#f8fafc;color:#64748b;font-size:12px">Notification transactionnelle Nova Paid.</footer></main></body></html>`,
    CustomID: order.orderId,
  };
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return { ok: false, error: "Request too large", status: 413 };
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    return { ok: false, error: "Request too large", status: 413 };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: "Invalid JSON", status: 400 };
  }
}

function boundedString(value, maximumLength) {
  return typeof value === "string" && value.length <= maximumLength ? value.trim() : "";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function getAllowedOrigins(env) {
  return String(env.ALLOWED_ORIGIN ?? "").split(",").map((value) => value.trim()).filter(Boolean);
}

function isAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  return Boolean(origin) && getAllowedOrigins(env).includes(origin);
}

function handleOptions(request, env) {
  if (!isAllowedOrigin(request, env)) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders(request, env)).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, { status: response.status, headers });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const permitted = origin && getAllowedOrigins(env).includes(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": permitted,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function jsonResponse(value, status) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
