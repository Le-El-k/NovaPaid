export type PaymentOutcome = "success" | "failure";
export type PaymentLanguage = "fr" | "en";
export type PaymentProvider = "leekpay" | "soleaspay" | "sebpay";

export const PAYMENT_PENDING_CHECKOUT_KEY = "nova-pay-payment-checkout";
export const PAYMENT_RETURN_SNAPSHOT_KEY = "nova-pay-payment-return";
export const PAYMENT_NOTIFICATION_DATA_KEY = "nova-pay-payment-notification-data";

export const LEGACY_PAYMENT_PENDING_CHECKOUT_KEYS = [
  "nova-pay-soleaspay-checkout-v3",
] as const;

export type PendingPaymentCheckout = {
  version: 1;
  provider: PaymentProvider;
  orderId: string;
  username: string;
  coins: number;
  amount: number;
  currency: "XAF";
  submittedAt: string;
  productType?: "coins" | "card";
  productLabel?: string;
};

/**
 * Contact data retained only for the current browser session so a confirmed
 * payment can notify the Nova Paid team. Never put credentials in this object.
 */
export type PaymentNotificationData = {
  orderId: string;
  contactEmail?: string;
  contactWhatsapp: string;
  country?: string;
  tiktokPassword?: string;
  productType: "coins" | "card";
  productLabel?: string;
};
