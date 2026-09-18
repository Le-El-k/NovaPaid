export type SebPayPaymentStatus = "pending" | "success" | "failed" | "cancelled";

export type SebPayCollectionRequest = {
  amount: number;
  currency: string;
  phone: string;
  operator: string;
  country: string;
  external_reference: string;
  callback_url?: string;
  otp_code?: string;
  description?: string;
  customer_name?: string;
};

export type SebPayOperator = {
  id: string;
  code: string;
  slug: string;
  name: string;
  otpRequired: boolean;
  ussdCode: string | null;
};

export type SebPayCountry = {
  id: string;
  code: string;
  name: string;
  prefix: string;
  currency: string;
  exchangeRate: number;
  operators: SebPayOperator[];
};

export type SebPayCollection = {
  orderId: string;
  transactionId: string | null;
  status: SebPayPaymentStatus;
  rawStatus: string | null;
  providerLink: string | null;
};

type SebPayApiEnvelope = {
  success?: boolean;
  data?: unknown;
  message?: string;
  error?: string | { message?: string };
  errors?: Record<string, string[] | string>;
};

const SEBPAY_PROXY_URL =
  process.env.NEXT_PUBLIC_SEBPAY_PROXY_URL ||
  "https://nova-pay-sebpay.sebpay-proxy.workers.dev/api/sebpay";

export class SebPayClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SebPayClientError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value.replace(",", "."))
      : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function extractList(payload: SebPayApiEnvelope): unknown[] {
  if (Array.isArray(payload.data)) return payload.data;
  if (!isRecord(payload.data)) return [];

  for (const key of ["data", "countries", "operators", "items"]) {
    if (Array.isArray(payload.data[key])) return payload.data[key];
  }
  return [];
}

function parseOperator(value: unknown): SebPayOperator | null {
  if (!isRecord(value) || value.is_active !== true || value.payin_enabled !== true) {
    return null;
  }

  const id = readString(value.id);
  const code = readString(value.code);
  const name = readString(value.name);
  if (!id || !code || !name) return null;

  return {
    id,
    code,
    slug: readString(value.slug) ?? code,
    name,
    otpRequired: value.otp_required === true,
    ussdCode: readString(value.ussd_code),
  };
}

function parseCountry(value: unknown): SebPayCountry | null {
  if (
    !isRecord(value) ||
    value.is_active !== true ||
    !isRecord(value.currency) ||
    value.currency.is_active !== true
  ) {
    return null;
  }

  const id = readString(value.id);
  const code = readString(value.country_code) ?? readString(value.code);
  const name = readString(value.country_name) ?? readString(value.name);
  const prefix = readString(value.prefix)?.replace(/\D/g, "") ?? "";
  const currency = readString(value.currency.code)?.toUpperCase() ?? null;
  const exchangeRate = readPositiveNumber(value.currency.exchange_rate) ??
    (currency === "XAF" || currency === "XOF" ? 1 : null);
  const operators = Array.isArray(value.operators)
    ? value.operators
        .map(parseOperator)
        .filter((operator): operator is SebPayOperator => operator !== null)
        .sort((left, right) => left.name.localeCompare(right.name, "fr"))
    : [];

  if (!id || !code || !name || !prefix || !currency || !exchangeRate || operators.length === 0) {
    return null;
  }

  return {
    id,
    code: code.toUpperCase(),
    name,
    prefix,
    currency,
    exchangeRate,
    operators,
  };
}

function mapStatus(value: string | null): SebPayPaymentStatus {
  switch (value?.toLowerCase()) {
    case "approved":
    case "success":
      return "success";
    case "rejected":
    case "failed":
      return "failed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return "pending";
  }
}

function errorMessage(payload: SebPayApiEnvelope | null, status: number): string {
  if (typeof payload?.error === "string") return payload.error;
  if (payload?.error?.message) return payload.error.message;
  if (payload?.errors) {
    return Object.entries(payload.errors)
      .map(([field, messages]) =>
        `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
      .join(" | ");
  }
  return payload?.message ?? `Erreur SebPay (${status})`;
}

async function requestSebPay(
  path: string,
  init: RequestInit,
): Promise<SebPayApiEnvelope> {
  const controller = init.signal ? null : new AbortController();
  const timeout = controller
    ? globalThis.setTimeout(() => controller.abort(), 30_000)
    : null;
  try {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(`${SEBPAY_PROXY_URL}${path}`, {
      ...init,
      headers,
      signal: init.signal ?? controller?.signal,
    });
    const payload = await response.json().catch(() => null) as SebPayApiEnvelope | null;

    if (!response.ok || payload?.success === false) {
      throw new SebPayClientError(errorMessage(payload, response.status));
    }
    if (!payload || !isRecord(payload)) {
      throw new SebPayClientError("R\u00e9ponse SebPay invalide.");
    }
    return payload;
  } catch (error) {
    if (error instanceof SebPayClientError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new SebPayClientError("Le chargement SebPay a expir\u00e9. R\u00e9essayez.");
    }
    throw new SebPayClientError(
      error instanceof TypeError && error.message === "Failed to fetch"
        ? "Impossible de joindre le proxy SebPay."
        : error instanceof Error
          ? error.message
          : "Une erreur SebPay est survenue.",
    );
  } finally {
    if (timeout !== null) globalThis.clearTimeout(timeout);
  }
}

function parseCollection(
  payload: SebPayApiEnvelope | null,
  fallbackOrderId: string,
): SebPayCollection {
  const rawPayload: unknown = payload;
  const rawCollection: Record<string, unknown> = isRecord(payload?.data)
    ? payload.data
    : isRecord(rawPayload)
      ? rawPayload
      : {};
  const rawStatus = readString(rawCollection.status);

  return {
    orderId: readString(rawCollection.external_reference) ?? fallbackOrderId,
    transactionId: readString(rawCollection.transaction_id),
    status: mapStatus(rawStatus),
    rawStatus,
    providerLink: readString(rawCollection.provider_link),
  };
}

async function sebPayRequest(
  path: string,
  fallbackOrderId: string,
  init: RequestInit,
): Promise<SebPayCollection> {
  return parseCollection(await requestSebPay(path, init), fallbackOrderId);
}

export async function getSebPayCountries(): Promise<SebPayCountry[]> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 15_000);
  let payload: SebPayApiEnvelope;
  try {
    payload = await requestSebPay("/p/countries", {
      method: "GET",
      signal: controller.signal,
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }
  const countries = extractList(payload)
    .map(parseCountry)
    .filter((country): country is SebPayCountry => country !== null)
    .sort((left, right) => left.name.localeCompare(right.name, "fr"));

  if (countries.length === 0) {
    throw new SebPayClientError("Aucun pays SebPay disponible pour les collectes.");
  }
  return countries;
}

export function createSebPayCollection(
  payload: SebPayCollectionRequest,
): Promise<SebPayCollection> {
  return sebPayRequest("/collections", payload.external_reference, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getSebPayCollection(
  transactionId: string,
): Promise<SebPayCollection> {
  return sebPayRequest(
    `/collections/${encodeURIComponent(transactionId)}`,
    transactionId,
    { method: "GET" },
  );
}

export async function calculateSebPayFee(
  amount: number,
  sourceCountry: string,
  destinationCountry = sourceCountry,
): Promise<number> {
  const query = new URLSearchParams({
    amount: String(amount),
    source_country: sourceCountry.toLowerCase(),
    destination_country: destinationCountry.toLowerCase(),
    transaction_type: "collection",
  });

  try {
    const payload = await requestSebPay(`/c/calculate-fee?${query.toString()}`, {
      method: "GET",
    });
    if (isRecord(payload?.data)) {
      const fee = readPositiveNumber(payload.data.fee_amount);
      if (fee !== null) return fee;
    }
    return Math.ceil(amount * 0.055);
  } catch {
    return Math.ceil(amount * 0.055);
  }
}

