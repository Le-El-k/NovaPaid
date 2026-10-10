/**
 * Minimal Cloudflare proxy for SebPay.
 * Secret keys stay in Worker secrets. Only the SebPay routes used by the app
 * are exposed.
 */
const MAX_BODY_BYTES = 128 * 1024;

export default {
  async fetch(request, env) {
    if (!isAllowedOrigin(request, env)) return jsonResponse({ error: "Origin not allowed" }, 403);
    if (request.method === "OPTIONS") return handleCors(request, env);

    try {
      const url = new URL(request.url);
      if (!isAllowedRoute(url.pathname, request.method)) {
        return withCors(jsonResponse({ error: "Not found" }, 404), request, env);
      }
      if (!hasAcceptableBodySize(request)) {
        return withCors(jsonResponse({ error: "Request too large" }, 413), request, env);
      }
      return withCors(await handleSebPay(request, env), request, env);
    } catch (error) {
      console.error("SebPay proxy error", error instanceof Error ? error.message : "unknown error");
      return withCors(jsonResponse({ error: "Proxy error" }, 502), request, env);
    }
  },
};

async function handleSebPay(request, env) {
  if (!env.SEBPAY_PUBLIC_KEY || !env.SEBPAY_SECRET_KEY) {
    return jsonResponse({ error: "SebPay credentials not configured" }, 503);
  }

  const url = new URL(request.url);
  const apiPath = url.pathname.replace("/api/sebpay", "");
  const headers = new Headers({
    "X-Public-Key": env.SEBPAY_PUBLIC_KEY,
    "X-Secret-Key": env.SEBPAY_SECRET_KEY,
    Accept: "application/json",
  });
  if (request.method !== "GET") headers.set("Content-Type", "application/json");

  const upstream = await fetch(new Request(`https://newapi.sebpay.bj/api/v1${apiPath}${url.search}`, {
    method: request.method,
    headers,
    body: request.method === "GET" ? undefined : request.body,
  }));
  return new Response(upstream.body, upstream);
}

function isAllowedRoute(pathname, method) {
  if (pathname === "/api/sebpay/p/countries") return method === "GET";
  if (pathname === "/api/sebpay/c/calculate-fee") return method === "GET";
  if (pathname === "/api/sebpay/collections") return method === "POST";
  return /^\/api\/sebpay\/collections\/[A-Za-z0-9._~%-]+$/.test(pathname) && method === "GET";
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
