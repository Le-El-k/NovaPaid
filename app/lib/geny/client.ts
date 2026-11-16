// Server-only Geny partner API client.
//
// SECURITY: this module reads the Geny API key from the database and must
// NEVER be imported into client bundles. It is only used from api-routes/geny.
// The key is sent as a Bearer token, server to server, exactly as the Geny docs
// require ("Call the API from your server only: never put a key in a web page").

import { getIntegrationValue } from "../integrations.ts";
import type { GenyOrder, GenyOperator, GenyPlan } from "./types.ts";

const DEFAULT_BASE = "https://geny.payool.net/api/v1/partner/";

function getBaseUrl(): string {
  const base = (getIntegrationValue("geny", "api_base") || DEFAULT_BASE);
  return base.endsWith("/") ? base : `${base}/`;
}

function getApiKey(): string {
  return getIntegrationValue("geny", "api_key");
}

export function isGenyConfigured(): boolean {
  return /^gk_(live|test)_/.test(getApiKey());
}

export interface GenyFetchResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  errorCode: string | null;
  errorMessage: string | null;
  requestId: string | null;
}

async function genyFetch<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown } = { method: "GET" },
): Promise<GenyFetchResult<T>> {
  const key = getApiKey();
  if (!key) {
    return { ok: false, status: 503, data: null, errorCode: "not_configured", errorMessage: "Service Geny non configuré.", requestId: null };
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
  let bodyText: string | undefined;
  if (init.method === "POST") {
    headers["Content-Type"] = "application/json";
    bodyText = JSON.stringify(init.body ?? {});
  }

  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
      method: init.method,
      headers,
      body: bodyText,
      // Never cache financial calls.
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 503, data: null, errorCode: "service_unavailable", errorMessage: "Geny est injoignable pour le moment.", requestId: null };
  }

  const requestId = response.headers.get("x-request-id");
  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data: (json as T) ?? null,
      errorCode: json?.code || "service_unavailable",
      errorMessage: json?.error || "La requête Geny a échoué.",
      requestId: json?.request_id || requestId,
    };
  }

  return { ok: true, status: response.status, data: json as T, errorCode: null, errorMessage: null, requestId };
}

export interface CreateDirectOrderInput {
  orderRef: string;
  planId: string;
  phone: string;
  operator: GenyOperator;
  customerPrice?: number;
  customerRef?: string;
  customerName?: string;
  topupCode?: string;
}

export const genyClient = {
  getPlans() {
    return genyFetch<{ object: "list"; data: GenyPlan[]; operators: unknown[] }>("plans");
  },

  getAccount() {
    return genyFetch<Record<string, unknown>>("account");
  },

  createDirectOrder(input: CreateDirectOrderInput) {
    const body: Record<string, unknown> = {
      mode: "direct",
      order_ref: input.orderRef,
      plan_id: input.planId,
      customer: {
        phone: input.phone,
        operator: input.operator,
        ...(input.customerName ? { name: input.customerName.slice(0, 80) } : {}),
      },
    };
    if (typeof input.customerPrice === "number" && Number.isFinite(input.customerPrice)) {
      body.customer_price = Math.round(input.customerPrice);
    }
    if (input.customerRef) body.customer_ref = input.customerRef;
    if (input.topupCode) body.topup_code = input.topupCode;
    return genyFetch<GenyOrder>("orders", { method: "POST", body });
  },

  getOrder(orderRef: string) {
    return genyFetch<GenyOrder>(`orders/${encodeURIComponent(orderRef)}`);
  },

  sendOtp(orderRef: string, otp: string) {
    return genyFetch<GenyOrder>(`orders/${encodeURIComponent(orderRef)}/otp`, {
      method: "POST",
      body: { otp },
    });
  },
};
