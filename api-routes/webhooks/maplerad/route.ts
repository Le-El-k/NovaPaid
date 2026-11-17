// Inbound Maplerad webhooks (card issuing + account creation lifecycle).
//
// Maplerad signs webhooks with Svix-style HMAC-SHA256 (see docs "Verifying
// Webhooks"). Three headers are sent: svix-id, svix-timestamp, svix-signature.
// signedContent = `${svix-id}.${svix-timestamp}.${rawBody}`. The signing secret
// is `whsec_<base64>`; the HMAC key is the base64-decoded part after `whsec_`.
// The digest is base64 and compared (constant-time) against each `v1,<base64>`
// entry in svix-signature. Configure MAPLERAD_WEBHOOK_SECRET before production.

import { createHmac, timingSafeEqual } from "node:crypto";
import { handleMapleradWebhook } from "../../../app/lib/payments/maplerad/service.ts";
import { getMapleradConfig } from "../../../app/lib/payments/maplerad/config.ts";

const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

function secretKeyBytes(secret: string): Buffer {
  const trimmed = secret.trim();
  const b64 = trimmed.includes("_") ? trimmed.split("_").pop()! : trimmed;
  return Buffer.from(b64, "base64");
}

function constantTimeEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length || ba.length === 0) return false;
  return timingSafeEqual(ba, bb);
}

function verifySvixSignature(request: Request, rawBody: string): boolean {
  const cfg = getMapleradConfig();
  const secret = (cfg?.webhookSecret || "").trim();
  if (!secret) {
    // No secret configured: only tolerate this in sandbox so local/dev testing works.
    return cfg?.environment !== "production";
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Reject stale timestamps to prevent replay.
  const ts = Number(svixTimestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > TIMESTAMP_TOLERANCE_SECONDS) return false;

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  let expected: string;
  try {
    expected = createHmac("sha256", secretKeyBytes(secret)).update(signedContent, "utf8").digest("base64");
  } catch {
    return false;
  }

  // svix-signature is a space-delimited list of `v1,<base64>` entries.
  for (const entry of svixSignature.split(/\s+/)) {
    const value = entry.includes(",") ? entry.split(",").pop()! : entry;
    if (value && constantTimeEquals(expected, value)) return true;
  }
  return false;
}

export async function POST(request: Request) {
  if (!getMapleradConfig()) {
    return Response.json({ success: false, error: "Maplerad non configuré." }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifySvixSignature(request, rawBody)) {
    return Response.json({ success: false, error: "Signature de webhook invalide." }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ success: false, error: "Corps JSON invalide." }, { status: 400 });
  }

  try {
    const result = handleMapleradWebhook(event);
    // Always 200 so Maplerad does not retry a payload we understood but did not match.
    return Response.json({ success: true, handled: result.handled, matched: result.matched });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Erreur de traitement du webhook." }, { status: 500 });
  }
}
