/**
 * Minimal Cloudflare proxy for LeekPay.
 * The secret key stays in Worker secrets and the public surface is limited to
 * the checkout route used by Nova Paid.
 */
const MAX_BODY_BYTES = 128 * 1024;

export default {
  async fetch(request, env) {
    if (!isAllowedOrigin(request, env)) return jsonResponse({ error: "Origin not allowed" }, 403);
    if (request.method === "OPTIONS") return handleCors(request, env);

    try {
      const url = new URL(request.url);
      if (url.pathname !== "/api/leekpay/checkout" || request.method !== "POST") {
        return withCors(jsonResponse({ error: "Not found" }, 404), request, env);
      }
      if (!hasAcceptableBodySize(request)) {
        return withCors(jsonResponse({ error: "Request too large" }, 413), request, env);
      }
      return withCors(await handleLeekPay(request, env), request, env);
    } catch (error) {
      console.error("LeekPay proxy error", error instanceof Error ? error.message : "unknown error");
      return withCors(jsonResponse({ error: "Proxy error" }, 502), request, env);
    }
  },
};

async function handleLeekPay(request, env) {
  if (!env.LEEKPAY_SECRET_KEY) {
    return jsonResponse({ error: "LeekPay credentials not configured" }, 503);
  }

  const url = new URL(request.url);
  const headers = new Headers({
    Authorization: `Bearer ${env.LEEKPAY_SECRET_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  });
  const upstream = await fetch(new Request(`https://leekpay.fr/api/v1/checkout${url.search}`, {
    method: "POST",
    headers,
    body: request.body,
  }));
  return new Response(upstream.body, upstream);
}

function hasAcceptableBodySize(request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  return !Number.isFinite(contentLength) || contentLength <= MAX_BODY_BYTES;
}

function getAllowedOrigins(env) {
  return String(env.ALLOWED_ORIGIN ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  return getAllowedOrigins(env).includes(origin);
}

function handleCors(request, env) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders(request, env)).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, { status: response.status, headers });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = getAllowedOrigins(env);
  return {
    "Access-Control-Allow-Origin": origin && allowed.includes(origin) ? origin : "null",
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
