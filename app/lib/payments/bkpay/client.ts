// BKApay HTTP client — SERVER-SIDE ONLY.
// Uses the "Secured Payment Sessions" method (v1.6): the amount is locked
// server-side, the customer pays on BKApay's hosted page, and we confirm via
// webhook + an authoritative status re-check. Authenticated with the secret
// pay-in key (sk_payin_live_...); never expose it to the browser.

import { getConfigValue } from "../../config/runtime-config.ts";

const BASE_URL = "https://bkapay.com/api/v1";

function secretKey(): string {
  return getConfigValue("bkpay_secret_key").trim();
}

export function isBkpayConfigured(): boolean {
  return secretKey().startsWith("sk_");
}

export interface CreateSessionInput {
  amount: number; // real units (e.g. XAF), not minor
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  callbackUrl: string;
  orderId: string;
  expiresInMinutes?: number;
}

export interface CreateSessionResult {
  ok: boolean;
  paymentUrl?: string;
  sessionId?: string;
  error?: string;
  status?: number;
}

export async function createPaymentSession(input: CreateSessionInput): Promise<CreateSessionResult> {
  const key = secretKey();
  if (!key) return { ok: false, error: "BKApay n'est pas configuré (BKPAY_SECRET_KEY manquant).", status: 503 };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${BASE_URL}/payment-sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        callback_url: input.callbackUrl,
        order_id: input.orderId,
        expires_in: input.expiresInMinutes ?? 30,
      }),
      signal: controller.signal,
    });
    const data: any = await res.json().catch(() => null);
    if (!res.ok || !data || data.success === false || !data.payment_url) {
      return { ok: false, error: data?.message || data?.error || `BKApay a refusé la session (HTTP ${res.status}).`, status: res.status };
    }
    return { ok: true, paymentUrl: String(data.payment_url), sessionId: data.session_id ? String(data.session_id) : undefined };
  } catch (err: any) {
    const aborted = err?.name === "AbortError";
    return { ok: false, error: aborted ? "Délai dépassé en contactant BKApay." : `Erreur réseau BKApay: ${err?.message || err}`, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

export interface SessionStatus {
  status: "pending" | "completed" | "failed" | "expired" | string;
  transactionId?: string;
  amount?: number;
  currency?: string;
}

/** Authoritative server-side status check (uses the secret pay-in key). */
export async function getSessionStatus(sessionId: string): Promise<SessionStatus | null> {
  const key = secretKey();
  if (!key || !sessionId) return null;
  try {
    const res = await fetch(`${BASE_URL}/payment-sessions/${encodeURIComponent(sessionId)}/status`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    const data: any = await res.json().catch(() => null);
    if (!res.ok || !data) return null;
    return {
      status: String(data.status || data.data?.status || ""),
      transactionId: data.transactionId || data.data?.transactionId,
      amount: Number(data.amount ?? data.data?.amount),
      currency: data.currency || data.data?.currency,
    };
  } catch {
    return null;
  }
}
