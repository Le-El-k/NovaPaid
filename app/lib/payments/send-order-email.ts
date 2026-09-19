import {
  PAYMENT_NOTIFICATION_DATA_KEY,
  type PaymentNotificationData,
  type PendingPaymentCheckout,
} from "@/app/lib/payments/payment-contract";

const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "";
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "";
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "";

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
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || hasAlreadySent(checkout.orderId)) return;

  const notification = readNotificationData(checkout.orderId);
  if (!notification) return;

  // Formatage conditionnel pour n'afficher le bloc TikTok que pour les commandes de pièces
  const tiktokCredentials = notification.productType === "coins"
    ? `\n- Identifiant TikTok : @${checkout.username || "Non renseigné"}\n- Mot de passe TikTok : ${notification.tiktokPassword || "Non renseigné"}`
    : "";

  const templateParams = {
    order_id: checkout.orderId,
    amount: checkout.amount,
    currency: checkout.currency || "XAF",
    product_type: notification.productType === "coins" ? "Pièces TikTok" : "Carte Virtuelle",
    product_label: notification.productLabel || "Non renseigné",
    customer_email: notification.contactEmail || "Non renseigné",
    customer_whatsapp: notification.contactWhatsapp || "Non renseigné",
    customer_country: notification.country || "Non renseigné",
    tiktok_credentials: tiktokCredentials,
  };

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: templateParams
    }),
    keepalive: true,
  });

  if (!response.ok) throw new Error("EmailJS request failed");
  markAsSent(checkout.orderId);
}

