// Inbound SoleasPay payment notifications (collection / top-up confirmations).
//
// SoleasPay V4 posts a JSON body like:
//   { transaction_reference, invoice_reference, provider_reference,
//     operation: "COLLECTION", status: "COMPLETED", amount, currency, updated_at }
// `invoice_reference` echoes the `orderId` we sent to the hosted checkout.
// Success statuses: COMPLETED | SUCCESS. Failure: FAILED | CANCELLED.
// The endpoint must reply HTTP 200 `{ "received": true }`.
//
// Authenticity (docs are sparse): SoleasPay sends an `x-private-key` header that
// equals the sha256 of the merchant webhook token. We verify it when
// SOLEASPAY_WEBHOOK_TOKEN is set. For sensitive credits we additionally re-check
// the transaction against the Collection Status API when a gateway token is set
// (SOLEASPAY_GATEWAY_TOKEN). With neither configured we only fulfil outside
// production, mirroring the Maplerad webhook's sandbox tolerance.

import { createHash, timingSafeEqual } from "node:crypto";
import { getConfigValue } from "../../../app/lib/config/runtime-config.ts";
import {
  completeSoleaspayOrder,
  getSoleaspayOrder,
  markSoleaspayOrderFailed,
} from "../../../app/lib/payments/soleaspay/orders.ts";

const SUCCESS_STATUSES = new Set(["COMPLETED", "SUCCESS"]);
const FAILURE_STATUSES = new Set(["FAILED", "CANCELLED", "REFUNDED"]);
const STATUS_API_URL = "https://api.mysoleas.com/collection/status";

function constantTimeEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length || ba.length === 0) return false;
  return timingSafeEqual(ba, bb);
}

/** Verify the x-private-key header against sha256(webhook token). */
function verifyPrivateKey(request: Request): boolean {
  const token = getConfigValue("soleaspay_webhook_token").trim();
  if (!token) return process.env.NODE_ENV !== "production"; // sandbox tolerance
  const header = (request.headers.get("x-private-key") || "").trim();
  if (!header) return false;
  const hex = createHash("sha256").update(token).digest("hex");
  const b64 = createHash("sha256").update(token).digest("base64");
  return constantTimeEquals(header, hex) || constantTimeEquals(header, b64);
}

/** Optional authoritative re-check via the Collection Status API. */
async function statusApiConfirms(transactionReference: string, expectedXaf: number): Promise<boolean | null> {
  const gatewayToken = getConfigValue("soleaspay_gateway_token").trim();
  if (!gatewayToken || !transactionReference) return null; // not configured → skip
  try {
    const res = await fetch(STATUS_API_URL, {
      method: "POST",
      headers: {
        "x-sp-auth-token": gatewayToken.startsWith("Bearer ") ? gatewayToken : `Bearer ${gatewayToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ transaction_reference: transactionReference }),
    });
    const data: any = await res.json().catch(() => null);
    const d = data?.data ?? data;
    const status = String(d?.status || "").toUpperCase();
    const amount = Number(d?.amount);
    if (!SUCCESS_STATUSES.has(status)) return false;
    if (Number.isFinite(amount) && Math.abs(amount - expectedXaf) > 1) return false;
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifyPrivateKey(request)) {
    return Response.json({ received: false, error: "Signature invalide." }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ received: false, error: "Corps JSON invalide." }, { status: 400 });
  }

  const orderRef = String(event.invoice_reference || event.orderId || "");
  const status = String(event.status || "").toUpperCase();
  const transactionReference = String(event.transaction_reference || event.reference || "");
  const amount = Number(event.amount);
  const currency = String(event.currency || "XAF").toUpperCase();

  // Acknowledge unknown/irrelevant events so SoleasPay stops retrying.
  if (!orderRef) return Response.json({ received: true });

  const order = getSoleaspayOrder(orderRef);
  if (!order) return Response.json({ received: true });
  if (order.status === "completed") return Response.json({ received: true });

  if (FAILURE_STATUSES.has(status)) {
    markSoleaspayOrderFailed(orderRef, rawBody);
    return Response.json({ received: true });
  }

  if (!SUCCESS_STATUSES.has(status)) {
    // Non-final (PENDING/PROCESSING/…): acknowledge, wait for a final event.
    return Response.json({ received: true });
  }

  // Amount / currency guard against tampered or mismatched notifications.
  if (currency !== "XAF" || (Number.isFinite(amount) && Math.abs(amount - order.amount_xaf) > 1)) {
    return Response.json({ received: true, matched: false });
  }

  // Strongest check when a gateway token is configured.
  const confirmed = await statusApiConfirms(transactionReference, order.amount_xaf);
  if (confirmed === false) {
    return Response.json({ received: true, matched: false });
  }

  const result = completeSoleaspayOrder(orderRef, { transactionReference, rawPayload: rawBody });
  return Response.json({ received: true, fulfilled: result.ok, alreadyDone: result.alreadyDone });
}
