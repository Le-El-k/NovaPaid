// Inbound BKApay webhooks (Secured Payment Sessions, v1.6).
//
// Body: { type: "payment.completed" | "payment.failed" | "payment.expired",
//         data: { sessionId, transactionId, order_id, amount, currency, status, ... } }
// `order_id` echoes the order_ref we sent when creating the session.
// Signature: header `x-bkapay-signature` = HMAC-SHA256(rawBody, BKAPAY_WEBHOOK_SECRET) hex.
// Must reply 2xx `{ received: true }`. BKApay retries every 30 min for 24h → idempotent.
//
// Because we hold the secret pay-in key, we additionally re-check the session
// status via BKApay's authenticated status API before crediting — authoritative
// even if the webhook secret is not configured yet.

import { getIntegrationValue } from "../../../app/lib/integrations.ts";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  completeSoleaspayOrder,
  getSoleaspayOrder,
  markSoleaspayOrderFailed,
} from "../../../app/lib/payments/soleaspay/orders.ts";
import { getSessionStatus, isBkpayConfigured } from "../../../app/lib/payments/bkpay/client.ts";

function constantTimeEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length || ba.length === 0) return false;
  return timingSafeEqual(ba, bb);
}

/** Verify x-bkapay-signature = HMAC-SHA256(rawBody, BKAPAY_WEBHOOK_SECRET). */
function signatureState(request: Request, rawBody: string): "valid" | "invalid" | "no-secret" {
  const secret = getIntegrationValue("bkpay", "webhook_secret");
  if (!secret) return "no-secret";
  const header = (request.headers.get("x-bkapay-signature") || "").trim();
  if (!header) return "invalid";
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return constantTimeEquals(expected, header) ? "valid" : "invalid";
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const sig = signatureState(request, rawBody);
  if (sig === "invalid") {
    return Response.json({ received: false, error: "Signature invalide." }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ received: false, error: "Corps JSON invalide." }, { status: 400 });
  }

  const type = String(event?.type || "");
  const data = event?.data || {};
  const orderRef = String(data.order_id || data.orderId || "");
  const sessionId = String(data.sessionId || data.session_id || "");
  const transactionId = String(data.transactionId || data.transaction_id || "");

  if (!orderRef) return Response.json({ received: true });

  const order = getSoleaspayOrder(orderRef);
  if (!order) return Response.json({ received: true });
  if (order.status === "completed") return Response.json({ received: true });

  if (type === "payment.failed" || type === "payment.expired") {
    markSoleaspayOrderFailed(orderRef, rawBody);
    return Response.json({ received: true });
  }

  if (type !== "payment.completed") {
    return Response.json({ received: true }); // non-final event
  }

  // Authoritative re-check with the secret pay-in key (defence in depth).
  const statusResult = isBkpayConfigured() ? await getSessionStatus(sessionId) : null;
  if (statusResult && statusResult.status !== "completed") {
    return Response.json({ received: true, matched: false });
  }
  if (!statusResult) {
    // Could not confirm via API: require a valid signature, else only in dev.
    if (sig !== "valid" && process.env.NODE_ENV === "production") {
      return Response.json({ received: true, verified: false });
    }
  }

  const result = completeSoleaspayOrder(orderRef, { transactionReference: transactionId, rawPayload: rawBody });
  return Response.json({ received: true, fulfilled: result.ok, alreadyDone: result.alreadyDone });
}
