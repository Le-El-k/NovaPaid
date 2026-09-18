import type {
  PaymentProvider,
  PendingPaymentCheckout,
} from "@/app/lib/payments/payment-contract";

const MAX_CALLBACK_LENGTH = 100_000;
const SUCCESS_STATUSES = new Set([
  "SUCCESS",
  "COMPLETED",
  "PAID",
  "APPROVED",
  "ACCEPTED",
  "CONFIRMED",
]);
const FAILURE_STATUSES = new Set([
  "FAILED",
  "FAILURE",
  "CANCELED",
  "CANCELLED",
  "DECLINED",
  "REJECTED",
  "ERROR",
  "EXPIRED",
]);

export type NormalizedPaymentReturn = {
  reference: string | null;
  status: string | null;
  successful: boolean | null;
  orderId: string | null;
};

export type ParsedPaymentReturn =
  | { phase: "missing"; data: null }
  | { phase: "invalid"; data: null }
  | { phase: "received"; data: NormalizedPaymentReturn };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown, maximumLength = 180): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned && cleaned.length <= maximumLength ? cleaned : null;
}

function readString(
  sources: Record<string, unknown>[],
  fields: string[],
  maximumLength?: number,
): string | null {
  for (const source of sources) {
    for (const field of fields) {
      const value = cleanString(source[field], maximumLength);
      if (value) return value;
    }
  }

  return null;
}

function readBoolean(sources: Record<string, unknown>[], fields: string[]): boolean | null {
  for (const source of sources) {
    for (const field of fields) {
      const value = source[field];
      if (typeof value === "boolean") return value;
      if (value === 1 || value === "1" || value === "true") return true;
      if (value === 0 || value === "0" || value === "false") return false;
    }
  }

  return null;
}

export function parsePendingPaymentCheckout(rawValue: string | null): PendingPaymentCheckout | null {
  if (!rawValue) return null;

  try {
    const value: unknown = JSON.parse(rawValue);
    if (!isRecord(value)) return null;

    // Returns from disabled processors must never be treated as SoleasPay.
    if (value.provider !== "soleaspay") return null;
    const provider: PaymentProvider = "soleaspay";

    if (
      value.version !== 1 ||
      typeof value.orderId !== "string" ||
      !value.orderId.trim() ||
      value.orderId.length > 120 ||
      typeof value.username !== "string" ||
      !value.username.trim() ||
      value.username.length > 120 ||
      typeof value.coins !== "number" ||
      !Number.isFinite(value.coins) ||
      value.coins <= 0 ||
      typeof value.amount !== "number" ||
      !Number.isFinite(value.amount) ||
      value.amount <= 0 ||
      value.currency !== "XAF" ||
      typeof value.submittedAt !== "string" ||
      !Number.isFinite(Date.parse(value.submittedAt))
    ) {
      return null;
    }

    return {
      version: 1,
      provider,
      orderId: value.orderId.trim(),
      username: value.username.trim().replace(/^@/, ""),
      coins: value.coins,
      amount: value.amount,
      currency: "XAF",
      submittedAt: value.submittedAt,
      productType: value.productType === "card" ? "card" : "coins",
      productLabel: typeof value.productLabel === "string" && value.productLabel.length <= 160
        ? value.productLabel.trim()
        : undefined,
    };
  } catch {
    return null;
  }
}

export function parsePaymentReturn(rawValue: string | null): ParsedPaymentReturn {
  if (!rawValue) return { phase: "missing", data: null };
  if (rawValue.length > MAX_CALLBACK_LENGTH) return { phase: "invalid", data: null };

  try {
    const payload: unknown = JSON.parse(rawValue);
    if (!isRecord(payload)) return { phase: "invalid", data: null };

    const nestedData = isRecord(payload.data) ? payload.data : null;
    const sources = nestedData ? [payload, nestedData] : [payload];
    const status = readString(
      sources,
      ["status", "payment_status", "paymentStatus", "state"],
      64,
    );

    return {
      phase: "received",
      data: {
        reference: readString(sources, [
          "transaction_reference",
          "transactionReference",
          "reference",
          "provider_reference",
          "providerReference",
          "payment_id",
        ]),
        status,
        successful: readBoolean(sources, ["success", "successful"]),
        orderId: readString(
          sources,
          ["order_id", "orderId", "invoice_reference", "invoiceReference"],
          120,
        ),
      },
    };
  } catch {
    return { phase: "invalid", data: null };
  }
}

export function isConfirmedPayment(data: NormalizedPaymentReturn | null): boolean {
  if (!data) return false;
  return data.successful === true || (data.status !== null && SUCCESS_STATUSES.has(data.status.toUpperCase()));
}

export function isRejectedPayment(data: NormalizedPaymentReturn | null): boolean {
  if (!data) return false;
  return data.successful === false || (data.status !== null && FAILURE_STATUSES.has(data.status.toUpperCase()));
}
