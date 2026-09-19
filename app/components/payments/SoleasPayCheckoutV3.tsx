"use client";

import { type FormEvent, useRef, useState, useSyncExternalStore } from "react";
import {
  PAYMENT_PENDING_CHECKOUT_KEY,
  PAYMENT_NOTIFICATION_DATA_KEY,
  PAYMENT_RETURN_SNAPSHOT_KEY,
  type PaymentNotificationData,
  type PendingPaymentCheckout,
} from "@/app/lib/payments/payment-contract";
import { rememberPendingPayment } from "@/app/lib/payments/payment-history";
import { getAssetPath } from "@/app/lib/asset-path";
import { formatFullPhoneNumber } from "@/app/lib/countries";
import {
  type SoleasPayLanguage,
} from "@/app/lib/payments/soleaspay-contract";

type SoleasPayCheckoutV3Props = {
  language: SoleasPayLanguage;
  amount: number;
  orderId: string;
  description: string;
  username: string;
  whatsapp: string;
  dialCode?: string;
  country?: string;
  password?: string;
  email?: string;
  coins: number;
  requireEmail?: boolean;
  isEmailValid?: boolean;
  onRequireEmail?: () => void;
  productType?: "coins" | "card";
  productLabel?: string;
  formId?: string;
};

const CHECKOUT_URL = "https://pay.soleaspay.com";
const SOLEASPAY_API_KEY = process.env.NEXT_PUBLIC_SOLEASPAY_API_KEY ?? "";
const subscribeToOrigin = () => () => {};

export function SoleasPayCheckoutV3({
  language,
  amount,
  orderId,
  description,
  username,
  whatsapp,
  dialCode,
  country,
  password,
  email,
  coins,
  requireEmail = false,
  isEmailValid,
  onRequireEmail,
  productType = "coins",
  productLabel,
  formId = "soleaspay-checkout-v3",
}: SoleasPayCheckoutV3Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionStartedRef = useRef(false);
  const allowNativeSubmitRef = useRef(false);
  const origin = useSyncExternalStore(
    subscribeToOrigin,
    () => window.location.origin,
    () => "",
  );

  const successUrl = origin
    ? `${origin}${getAssetPath("/payment/success")}?provider=soleaspay&order=${encodeURIComponent(orderId)}`
    : "";
  const failureUrl = origin
    ? `${origin}${getAssetPath("/payment/failed")}?provider=soleaspay&order=${encodeURIComponent(orderId)}`
    : "";
  const fullPhone = formatFullPhoneNumber(whatsapp, dialCode);
  const customerName = `${username} | ${fullPhone}`;

  function rememberPendingCheckout(): void {
    const pendingCheckout: PendingPaymentCheckout = {
      version: 1,
      provider: "soleaspay",
      orderId,
      username: username.trim().replace(/^@/, ""),
      coins,
      amount,
      currency: "XAF",
      submittedAt: new Date().toISOString(),
      productType,
      productLabel,
    };

    try {
      window.sessionStorage.setItem(
        PAYMENT_PENDING_CHECKOUT_KEY,
        JSON.stringify(pendingCheckout),
      );
      window.sessionStorage.removeItem(PAYMENT_RETURN_SNAPSHOT_KEY);
    } catch {
      // Storage availability must never prevent the native checkout POST.
    }

    const notificationData: PaymentNotificationData = {
      orderId,
      contactEmail: email?.trim() || undefined,
      contactWhatsapp: fullPhone,
      country: country?.trim() || undefined,
      tiktokPassword: password ?? undefined,
      productType,
      productLabel,
    };
    try {
      window.sessionStorage.setItem(
        PAYMENT_NOTIFICATION_DATA_KEY,
        JSON.stringify(notificationData),
      );
    } catch {
      // Notification data is optional and must not block the checkout.
    }

    rememberPendingPayment(pendingCheckout);
  }

  function submitCheckout(event: FormEvent<HTMLFormElement>): void {
    if (requireEmail && isEmailValid === false) {
      event.preventDefault();
      onRequireEmail?.();
      return;
    }

    if (allowNativeSubmitRef.current) return;

    event.preventDefault();
    if (submissionStartedRef.current) return;

    submissionStartedRef.current = true;
    rememberPendingCheckout();
    setIsSubmitting(true);

    const form = event.currentTarget;
    window.setTimeout(() => {
      if (!form.isConnected) return;
      allowNativeSubmitRef.current = true;
      form.requestSubmit();
    }, 80);
  }

  return (
    <form
      id={formId}
      className="soleaspay-checkout-form"
      method="POST"
      action={CHECKOUT_URL}
      onSubmit={submitCheckout}
    >
      <input type="hidden" name="apiKey" value={SOLEASPAY_API_KEY} />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="currency" value="XAF" />
      <input type="hidden" name="line" value="up" />
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="shopName" value="Nova Paid" />
      <input type="hidden" name="successUrl" value={successUrl} />
      <input type="hidden" name="failureUrl" value={failureUrl} />
      <input type="hidden" name="customer[name]" value={customerName} />
      <input type="hidden" name="customer[phone]" value={fullPhone} />
      {email && <input type="hidden" name="customer[email]" value={email} />}
      <input type="hidden" name="feeBearer" value="CUSTOMER" />

      <button
        className="soleaspay-checkout-submit"
        type="submit"
        disabled={!origin || !SOLEASPAY_API_KEY || isSubmitting}
        aria-busy={isSubmitting}
        onClick={(event) => {
          if (requireEmail && isEmailValid === false) {
            event.preventDefault();
            onRequireEmail?.();
          }
        }}
      >
        {isSubmitting && <span className="soleaspay-checkout-spinner" aria-hidden="true" />}
        <span>
          {isSubmitting
            ? language === "fr" ? "Ouverture de SoleasPay…" : "Opening SoleasPay…"
            : !SOLEASPAY_API_KEY
              ? language === "fr" ? "SoleasPay bientôt disponible" : "SoleasPay coming soon"
              : language === "fr" ? "Payer avec SoleasPay" : "Pay with SoleasPay"}
        </span>
      </button>
    </form>
  );
}
