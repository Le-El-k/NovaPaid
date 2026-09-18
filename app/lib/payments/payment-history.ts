import { getAssetPath } from "@/app/lib/asset-path";
import type {
  PaymentOutcome,
  PaymentProvider,
  PendingPaymentCheckout,
} from "@/app/lib/payments/payment-contract";

export const PAYMENT_HISTORY_STORAGE_KEY = "nova-pay-payment-history-v1";
export const PAYMENT_HISTORY_CHANGE_EVENT = "nova-pay-payment-history-change";
export const EMPTY_PAYMENT_HISTORY_SNAPSHOT = "[]";

const MAX_HISTORY_ENTRIES = 50;
const MAX_ORDER_ID_LENGTH = 120;
const MAX_USERNAME_LENGTH = 120;
const MAX_REFERENCE_LENGTH = 180;
const MAX_PROVIDER_STATUS_LENGTH = 64;

export type PaymentHistoryStatus = "pending" | "success" | "failure";

export type PaymentHistoryEntry = PendingPaymentCheckout & {
  status: PaymentHistoryStatus;
  transactionReference: string | null;
  providerStatus: string | null;
  confirmed: boolean;
  updatedAt: string;
};

type FinalizePaymentOptions = {
  transactionReference?: string | null;
  providerStatus?: string | null;
  confirmed?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanRequiredString(value: unknown, maximumLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned && cleaned.length <= maximumLength ? cleaned : null;
}

function cleanOptionalString(value: unknown, maximumLength: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  return cleanRequiredString(value, maximumLength);
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function parseEntry(value: unknown): PaymentHistoryEntry | null {
  if (!isRecord(value)) return null;

  const orderId = cleanRequiredString(value.orderId, MAX_ORDER_ID_LENGTH);
  const username = cleanRequiredString(value.username, MAX_USERNAME_LENGTH);
  const transactionReference = cleanOptionalString(
    value.transactionReference,
    MAX_REFERENCE_LENGTH,
  );
  const providerStatus = cleanOptionalString(value.providerStatus, MAX_PROVIDER_STATUS_LENGTH);
  // Ignore legacy records created by providers that are no longer enabled.
  if (value.provider !== "soleaspay") return null;
  const provider: PaymentProvider = "soleaspay";
  const status = value.status;

  if (
    value.version !== 1 ||
    !orderId ||
    !username ||
    typeof value.coins !== "number" ||
    !Number.isFinite(value.coins) ||
    value.coins <= 0 ||
    typeof value.amount !== "number" ||
    !Number.isFinite(value.amount) ||
    value.amount <= 0 ||
    value.currency !== "XAF" ||
    !isValidDate(value.submittedAt) ||
    !isValidDate(value.updatedAt) ||
    (status !== "pending" && status !== "success" && status !== "failure") ||
    typeof value.confirmed !== "boolean"
  ) {
    return null;
  }

  return {
    version: 1,
    provider,
    orderId,
    username: username.replace(/^@/, ""),
    coins: value.coins,
    amount: value.amount,
    currency: "XAF",
    submittedAt: value.submittedAt,
    productType: value.productType === "card" ? "card" : "coins",
    productLabel: typeof value.productLabel === "string" && value.productLabel.length <= 160
      ? value.productLabel.trim()
      : undefined,
    status,
    transactionReference,
    providerStatus,
    confirmed: value.confirmed,
    updatedAt: value.updatedAt,
  };
}

function normalizeEntries(entries: PaymentHistoryEntry[]): PaymentHistoryEntry[] {
  const entriesByOrderId = new Map<string, PaymentHistoryEntry>();

  for (const entry of entries) {
    const existing = entriesByOrderId.get(entry.orderId);
    if (!existing || Date.parse(entry.updatedAt) > Date.parse(existing.updatedAt)) {
      entriesByOrderId.set(entry.orderId, entry);
    }
  }

  return [...entriesByOrderId.values()]
    .sort((left, right) => Date.parse(right.submittedAt) - Date.parse(left.submittedAt))
    .slice(0, MAX_HISTORY_ENTRIES);
}

export function parsePaymentHistory(rawValue: string | null): PaymentHistoryEntry[] {
  if (!rawValue) return [];

  try {
    const value: unknown = JSON.parse(rawValue);
    if (!Array.isArray(value)) return [];

    return normalizeEntries(
      value
        .map(parseEntry)
        .filter((entry): entry is PaymentHistoryEntry => entry !== null),
    );
  } catch {
    return [];
  }
}

export function getPaymentHistorySnapshot(): string {
  try {
    return window.localStorage.getItem(PAYMENT_HISTORY_STORAGE_KEY) ?? EMPTY_PAYMENT_HISTORY_SNAPSHOT;
  } catch {
    return EMPTY_PAYMENT_HISTORY_SNAPSHOT;
  }
}

export function getPaymentHistoryServerSnapshot(): string {
  return EMPTY_PAYMENT_HISTORY_SNAPSHOT;
}

export function subscribeToPaymentHistory(onStoreChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === PAYMENT_HISTORY_STORAGE_KEY) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(PAYMENT_HISTORY_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(PAYMENT_HISTORY_CHANGE_EVENT, onStoreChange);
  };
}

function readPaymentHistory(): PaymentHistoryEntry[] {
  return parsePaymentHistory(getPaymentHistorySnapshot());
}

function writePaymentHistory(entries: PaymentHistoryEntry[]): boolean {
  try {
    window.localStorage.setItem(
      PAYMENT_HISTORY_STORAGE_KEY,
      JSON.stringify(normalizeEntries(entries)),
    );
    window.dispatchEvent(new Event(PAYMENT_HISTORY_CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function findPaymentHistoryEntry(orderId: string): PaymentHistoryEntry | null {
  const cleanedOrderId = cleanRequiredString(orderId, MAX_ORDER_ID_LENGTH);
  if (!cleanedOrderId) return null;
  return readPaymentHistory().find((entry) => entry.orderId === cleanedOrderId) ?? null;
}

export function rememberPendingPayment(
  checkout: PendingPaymentCheckout,
  options: FinalizePaymentOptions = {},
): PaymentHistoryEntry {
  const entries = readPaymentHistory();
  const existing = entries.find((entry) => entry.orderId === checkout.orderId);
  if (existing && existing.status !== "pending") return existing;

  const now = new Date().toISOString();
  const pendingEntry: PaymentHistoryEntry = {
    ...checkout,
    status: "pending",
    transactionReference: cleanOptionalString(
      options.transactionReference ?? existing?.transactionReference,
      MAX_REFERENCE_LENGTH,
    ),
    providerStatus: cleanOptionalString(
      options.providerStatus ?? existing?.providerStatus,
      MAX_PROVIDER_STATUS_LENGTH,
    ),
    confirmed: false,
    updatedAt: now,
  };

  writePaymentHistory([
    pendingEntry,
    ...entries.filter((entry) => entry.orderId !== checkout.orderId),
  ]);
  return pendingEntry;
}

export function finalizePaymentHistory(
  checkout: PendingPaymentCheckout,
  outcome: PaymentOutcome,
  options: FinalizePaymentOptions = {},
): PaymentHistoryEntry {
  const entries = readPaymentHistory();
  const existing = entries.find((entry) => entry.orderId === checkout.orderId);

  if (
    existing &&
    existing.status !== "pending" &&
    existing.status !== outcome
  ) {
    return existing;
  }

  if (existing && existing.status === outcome) {
    const updatedEntry: PaymentHistoryEntry = {
      ...existing,
      transactionReference: cleanOptionalString(
        existing.transactionReference ?? options.transactionReference,
        MAX_REFERENCE_LENGTH,
      ),
      providerStatus: cleanOptionalString(
        existing.providerStatus ?? options.providerStatus,
        MAX_PROVIDER_STATUS_LENGTH,
      ),
      confirmed: existing.confirmed || (outcome === "success" && options.confirmed === true),
      updatedAt: new Date().toISOString(),
    };

    writePaymentHistory([
      updatedEntry,
      ...entries.filter((entry) => entry.orderId !== checkout.orderId),
    ]);
    return updatedEntry;
  }

  const finalizedEntry: PaymentHistoryEntry = {
    ...checkout,
    status: outcome,
    transactionReference: cleanOptionalString(
      options.transactionReference ?? existing?.transactionReference,
      MAX_REFERENCE_LENGTH,
    ),
    providerStatus: cleanOptionalString(
      options.providerStatus ?? existing?.providerStatus,
      MAX_PROVIDER_STATUS_LENGTH,
    ),
    confirmed: outcome === "success" && (options.confirmed ?? existing?.confirmed ?? false),
    updatedAt: new Date().toISOString(),
  };

  writePaymentHistory([
    finalizedEntry,
    ...entries.filter((entry) => entry.orderId !== checkout.orderId),
  ]);
  return finalizedEntry;
}

export function paymentHistoryEntryToCheckout(
  entry: PaymentHistoryEntry,
): PendingPaymentCheckout {
  return {
    version: 1,
    provider: entry.provider,
    orderId: entry.orderId,
    username: entry.username,
    coins: entry.coins,
    amount: entry.amount,
    currency: entry.currency,
    submittedAt: entry.submittedAt,
    productType: entry.productType,
    productLabel: entry.productLabel,
  };
}

export function paymentHistoryHref(entry: PaymentHistoryEntry): string | null {
  const order = encodeURIComponent(entry.orderId);
  const provider = encodeURIComponent(entry.provider);
  if (entry.status === "success") return getAssetPath(`/payment/success?provider=${provider}&order=${order}`);
  if (entry.status === "failure") return getAssetPath(`/payment/failed?provider=${provider}&order=${order}`);
  return null;
}
