"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Info, LoaderCircle, RotateCw, X } from "lucide-react";
import {
  PAYMENT_PENDING_CHECKOUT_KEY,
  PAYMENT_RETURN_SNAPSHOT_KEY,
  type PaymentLanguage,
  type PendingPaymentCheckout,
} from "@/app/lib/payments/payment-contract";
import { rememberPendingPayment } from "@/app/lib/payments/payment-history";
import { getAssetPath } from "@/app/lib/asset-path";
import { playFailure, playSuccess, playTap } from "@/app/lib/sound";
import { formatFullPhoneNumber } from "@/app/lib/countries";
import {
  calculateSebPayFee,
  createSebPayCollection,
  getSebPayCountries,
  getSebPayCollection,
  SebPayClientError,
  type SebPayCollection,
  type SebPayCountry,
} from "@/app/lib/payments/sebpay-contract";

type SebPayCheckoutProps = {
  language: PaymentLanguage;
  orderId: string;
  amount: number;
  coins: number;
  username: string;
  password?: string;
  email: string;
  whatsapp?: string;
  dialCode?: string;
  countryCode?: string;
  onStateChange?: (state: "form" | "processing" | "success" | "failed") => void;
};

const copy = {
  fr: {
    title: "Montant à payer",
    country: "Pays",
    operator: "Op\u00e9rateur",
    phone: "Numéro Mobile Money",
    phoneHint: "Format international, sans le signe +",
    otp: "OTP",
    otpInstructionPrefix: "Composez le code",
    otpInstructionSuffix: "sur votre téléphone pour recevoir le code OTP.",
    copy: "Copier",
    copied: "Copié !",
    clickToCopy: "Cliquer pour copier le code USSD",
    openProvider: "Ouvrir la page de validation de l'opérateur",
    pay: "Payer avec SebPay",
    submitting: "Paiement en cours… Consultez votre téléphone.",
    processingTitle: "Paiement en cours...",
    processingDesc: "Veuillez consulter votre téléphone pour valider le paiement. Cette opération peut prendre quelques instants.",
    processingWarning: "Ne fermez pas cette fenêtre pendant la validation.",
    successTitle: "Paiement réussi !",
    successDesc: "Votre paiement a été validé avec succès. Redirection vers la confirmation...",
    failedTitle: "Échec du paiement",
    failedDesc: "La transaction n'a pas pu être validée. Redirection vers la page d'échec...",
    loadingCatalog: "Chargement des pays et opérateurs SebPay…",
    catalogUnavailable: "Le catalogue SebPay est momentanément indisponible.",
    retry: "Réessayer",
    invalidPhone: "Saisissez un numéro international valide (8 à 15 chiffres).",
    invalidEmail: "Saisissez une adresse e-mail valide.",
    invalidOtp: "Saisissez le code OTP requis.",
    pending: "Le paiement est toujours en attente. Vérifiez votre téléphone puis réessayez.",
  },
  en: {
    title: "Amount to pay",
    country: "Country",
    operator: "Operator",
    phone: "Mobile Money number",
    phoneHint: "International format, without the + sign",
    otp: "OTP",
    otpInstructionPrefix: "Dial the code",
    otpInstructionSuffix: "on your phone to receive the OTP code.",
    copy: "Copy",
    copied: "Copied!",
    clickToCopy: "Click to copy USSD code",
    openProvider: "Open the operator validation page",
    pay: "Pay with SebPay",
    submitting: "Payment in progress… Check your phone.",
    processingTitle: "Payment in progress...",
    processingDesc: "Please check your phone to validate the payment. This operation may take a few moments.",
    processingWarning: "Do not close this window during validation.",
    successTitle: "Payment successful!",
    successDesc: "Your payment has been successfully validated. Redirecting...",
    failedTitle: "Payment failed",
    failedDesc: "The transaction could not be validated. Redirecting...",
    loadingCatalog: "Loading SebPay countries and operators…",
    catalogUnavailable: "The SebPay catalog is temporarily unavailable.",
    retry: "Retry",
    invalidPhone: "Enter a valid international number (8 to 15 digits).",
    invalidEmail: "Enter a valid email address.",
    invalidOtp: "Enter the required OTP code.",
    pending: "The payment is still pending. Check your phone, then try again.",
  },
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 60;

function digitsOnly(value: string, maximumLength = 15): string {
  return value.replace(/\D/g, "").slice(0, maximumLength);
}

function countryFromDialCode(
  countries: SebPayCountry[],
  dialCode?: string,
  countryCode?: string,
): SebPayCountry {
  if (countryCode) {
    const match = countries.find(
      (c) => c.code.toUpperCase() === countryCode.toUpperCase(),
    );
    if (match) return match;
  }
  const prefix = digitsOnly(dialCode ?? "");
  return countries.find((country) => country.prefix === prefix) ??
    countries.find((country) => country.code === "CM") ??
    countries[0];
}

function initialLocalPhone(whatsapp?: string, country?: SebPayCountry): string {
  const digits = digitsOnly(whatsapp ?? "");
  return country && digits.startsWith(country.prefix)
    ? digits.slice(country.prefix.length)
    : digits;
}

function convertBaseAmount(amount: number, currency: string, exchangeRate: number): number {
  const exchangeFee = currency === "XAF" || currency === "XOF" ? 0 : 30;
  return Math.ceil((amount + exchangeFee) / exchangeRate);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function SebPayCheckout({
  language,
  orderId,
  amount,
  coins,
  username,
  password,
  email,
  whatsapp,
  dialCode,
  countryCode: countryCodeProp,
  onStateChange,
}: SebPayCheckoutProps) {
  const t = copy[language];
  const [countries, setCountries] = useState<SebPayCountry[]>([]);
  const [countryCode, setCountryCode] = useState("");
  const [operator, setOperator] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [providerLink, setProviderLink] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feeAmount, setFeeAmount] = useState<number>(0);
  const [copiedUssd, setCopiedUssd] = useState(false);
  const [uiState, setUiState] = useState<"form" | "processing" | "success" | "failed">("form");
  const [error, setError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<{ message: string | null } | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogRevision, setCatalogRevision] = useState(0);

  function updateUiState(nextState: "form" | "processing" | "success" | "failed"): void {
    setUiState(nextState);
    if (nextState === "success") {
      playSuccess();
    } else if (nextState === "failed") {
      playFailure();
    }
    onStateChange?.(nextState);
  }

  async function copyUssdCode(code: string): Promise<void> {
    playTap();
    try {
      await navigator.clipboard.writeText(code);
      setCopiedUssd(true);
      window.setTimeout(() => setCopiedUssd(false), 2000);
    } catch {
      // Fallback
    }
  }

  useEffect(() => {
    let ignore = false;

    void getSebPayCountries()
      .then((availableCountries) => {
        if (ignore) return;
        const initialCountry = countryFromDialCode(availableCountries, dialCode, countryCodeProp);
        setCountries(availableCountries);
        setCountryCode(initialCountry.code);
        setOperator(initialCountry.operators[0]?.code ?? "");
        setPhone(initialLocalPhone(whatsapp, initialCountry));
        setOtpCode("");
        setCatalogError(null);
      })
      .catch((catalogLoadError: unknown) => {
        if (ignore) return;
        setCatalogError({
          message: catalogLoadError instanceof SebPayClientError
            ? catalogLoadError.message
            : null,
        });
      })
      .finally(() => {
        if (!ignore) setIsCatalogLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [catalogRevision, countryCodeProp, dialCode, whatsapp]);

  const selectedCountry = useMemo(
    () => countries.find((country) => country.code === countryCode) ?? null,
    [countries, countryCode],
  );
  const availableOperators = selectedCountry?.operators ?? [];
  const selectedOperator = availableOperators.find(
    (candidate) => candidate.code === operator,
  ) ?? null;

  useEffect(() => {
    if (!selectedCountry) return;
    let ignore = false;
    const baseConverted = convertBaseAmount(
      amount,
      selectedCountry.currency,
      selectedCountry.exchangeRate,
    );

    void calculateSebPayFee(baseConverted, selectedCountry.code, selectedCountry.code)
      .then((fee) => {
        if (ignore) return;
        setFeeAmount(fee);
      })
      .catch(() => {
        if (!ignore) setFeeAmount(Math.ceil(baseConverted * 0.055));
      });

    return () => {
      ignore = true;
    };
  }, [amount, selectedCountry]);

  const baseConvertedAmount = selectedCountry
    ? convertBaseAmount(amount, selectedCountry.currency, selectedCountry.exchangeRate)
    : amount;

  // Calcul exact SebPay : Montant de base + Frais retournés par l'API SebPay
  const displayAmount = baseConvertedAmount + Math.ceil(feeAmount);

  // Exception OTP : Pour les opérateurs avec OTP, le montant soumis à SebPay et saisi dans le code USSD
  // doit correspondre au montant calculé avec frais (displayAmount).
  // Pour les opérateurs standard (push Mobile Money), SebPay déduit ses frais à la source, on soumet le montant de base.
  const collectionAmount = selectedOperator?.otpRequired
    ? displayAmount
    : baseConvertedAmount;

  const otpUssdCode = selectedOperator?.otpRequired && selectedOperator.ussdCode
    ? selectedOperator.ussdCode.replace(/montant/gi, String(displayAmount))
    : null;

  function rememberPendingCheckout(payment: SebPayCollection, submittedPhone?: string): void {
    const pendingCheckout: PendingPaymentCheckout = {
      version: 1,
      provider: "sebpay",
      orderId,
      username: username.trim().replace(/^@/, ""),
      coins,
      amount,
      currency: "XAF",
      submittedAt: new Date().toISOString(),
    };

    try {
      window.sessionStorage.setItem(
        PAYMENT_PENDING_CHECKOUT_KEY,
        JSON.stringify(pendingCheckout),
      );
      window.sessionStorage.removeItem(PAYMENT_RETURN_SNAPSHOT_KEY);
    } catch {
      // Le stockage local ne doit pas bloquer l'appel SebPay.
    }

    rememberPendingPayment(pendingCheckout, {
      transactionReference: payment.transactionId,
      providerStatus: payment.rawStatus ?? "pending",
    });
  }

  function finishPayment(payment: SebPayCollection): void {
    const succeeded = payment.status === "success";
    const paymentData = JSON.stringify({
      success: succeeded,
      status: payment.rawStatus ?? (succeeded ? "SUCCESS" : "FAILED"),
      order_id: orderId,
      transaction_reference: payment.transactionId,
    });
    const path = getAssetPath(succeeded ? "/payment/success" : "/payment/failed");
    window.location.assign(
      `${path}?provider=sebpay&order=${encodeURIComponent(orderId)}` +
      `&payment_data=${encodeURIComponent(paymentData)}`,
    );
  }

  async function waitForFinalStatus(reference: string): Promise<void> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await wait(POLL_INTERVAL_MS);
      const payment = await getSebPayCollection(reference);
      if (payment.status === "success") {
        updateUiState("success");
        await wait(3000);
        finishPayment(payment);
        return;
      }
      if (payment.status === "failed" || payment.status === "cancelled") {
        updateUiState("failed");
        await wait(3000);
        finishPayment(payment);
        return;
      }
    }
    updateUiState("failed");
    await wait(3000);
    const timeoutPayment: SebPayCollection = {
      orderId,
      transactionId: reference,
      status: "failed",
      rawStatus: "TIMEOUT",
      providerLink: null,
    };
    finishPayment(timeoutPayment);
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSubmitting || !selectedCountry || !selectedOperator) return;

    const localPhone = digitsOnly(phone);
    const normalizedPhone = localPhone.startsWith(selectedCountry.prefix)
      ? localPhone
      : `${selectedCountry.prefix}${localPhone}`;
    if (!/^\d{8,15}$/.test(normalizedPhone)) {
      setError(t.invalidPhone);
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setError(t.invalidEmail);
      return;
    }
    if (selectedOperator.otpRequired && !otpCode.trim()) {
      setError(t.invalidOtp);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setProviderLink(null);
    updateUiState("processing");

    const fullPhone = `+${normalizedPhone}`;
    const sebpayDescription = language === "fr"
      ? `Achat de ${coins} pièces TikTok pour ${username} (${fullPhone})`
      : `Purchase of ${coins} TikTok coins for ${username} (${fullPhone})`;
    const sebpayCustomerName = `${username} | ${fullPhone}`;

    try {
      const payment = await createSebPayCollection({
        amount: collectionAmount,
        currency: selectedCountry.currency,
        phone: normalizedPhone,
        operator: selectedOperator.code,
        country: selectedCountry.code,
        external_reference: orderId,
        description: sebpayDescription,
        customer_name: sebpayCustomerName,
        ...(selectedOperator.otpRequired ? { otp_code: otpCode.trim() } : {}),
      });

      rememberPendingCheckout(payment, fullPhone);
      if (payment.providerLink) {
        const providerWindow = window.open(
          payment.providerLink,
          "_blank",
          "noopener,noreferrer",
        );
        if (!providerWindow) setProviderLink(payment.providerLink);
      }
      if (payment.status === "success") {
        updateUiState("success");
        await wait(3000);
        finishPayment(payment);
        return;
      }
      if (payment.status === "failed" || payment.status === "cancelled") {
        updateUiState("failed");
        await wait(3000);
        finishPayment(payment);
        return;
      }
      await waitForFinalStatus(payment.transactionId ?? orderId);
    } catch (submitError) {
      updateUiState("failed");
      await wait(3000);
      const failedPayment: SebPayCollection = {
        orderId,
        transactionId: null,
        status: "failed",
        rawStatus: submitError instanceof SebPayClientError ? submitError.message : "FAILED",
        providerLink: null,
      };
      finishPayment(failedPayment);
    }
  }

  if (uiState === "processing" || uiState === "success" || uiState === "failed") {
    return (
      <div className={`sebpay-status-screen state-${uiState}`} role="status" aria-live="polite">
        <div className="sebpay-status-circle-wrap">
          <div className="sebpay-status-spinner-ring" aria-hidden="true" />
          <div className="sebpay-status-icon-inner" aria-hidden="true">
            {uiState === "processing" && (
              <RotateCw className="sebpay-status-center-icon spin-subtle" size={32} />
            )}
            {uiState === "success" && (
              <Check className="sebpay-status-center-icon success" size={38} strokeWidth={2.8} />
            )}
            {uiState === "failed" && (
              <X className="sebpay-status-center-icon failed" size={38} strokeWidth={2.8} />
            )}
          </div>
        </div>

        <h3 className="sebpay-status-title">
          {uiState === "processing" && t.processingTitle}
          {uiState === "success" && t.successTitle}
          {uiState === "failed" && t.failedTitle}
        </h3>

        <p className="sebpay-status-description">
          {uiState === "processing" && t.processingDesc}
          {uiState === "success" && t.successDesc}
          {uiState === "failed" && t.failedDesc}
        </p>

        {uiState === "processing" && (
          <div className="sebpay-status-warning-badge" role="alert">
            <Info size={14} aria-hidden="true" />
            <span>{t.processingWarning}</span>
          </div>
        )}

        {uiState === "processing" && providerLink && (
          <a
            className="sebpay-provider-link"
            href={providerLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={15} aria-hidden="true" /> {t.openProvider}
          </a>
        )}

        <div className="sebpay-status-dots" aria-hidden="true">
          <span className="sebpay-status-dot dot-1" />
          <span className="sebpay-status-dot dot-2" />
          <span className="sebpay-status-dot dot-3" />
        </div>
      </div>
    );
  }

  if (isCatalogLoading || catalogError || !selectedCountry) {
    return (
      <div className="sebpay-catalog-state" role={catalogError ? "alert" : "status"}>
        {isCatalogLoading ? (
          <>
            <LoaderCircle className="sebpay-spinner" aria-hidden="true" />
            <span>{t.loadingCatalog}</span>
          </>
        ) : (
          <>
            <span>{catalogError?.message ?? t.catalogUnavailable}</span>
            <button
              type="button"
              onClick={() => {
                setIsCatalogLoading(true);
                setCatalogError(null);
                setCatalogRevision((revision) => revision + 1);
              }}
            >
              {t.retry}
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <form className="sebpay-checkout-form" onSubmit={(event) => void submitPayment(event)}>
      <div className="sebpay-country-line">
        <span>{t.title}</span>
        <strong>{displayAmount.toLocaleString()} {selectedCountry.currency}</strong>
      </div>

      {/* 1. Numéro Mobile Money */}
      <label className="field-label">
        <span>{t.phone} <span className="required">*</span></span>
        <div className="field">
          <span>+{selectedCountry.prefix}</span>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{6,12}"
            value={phone}
            onChange={(event) => {
              setPhone(digitsOnly(event.target.value, 12));
              setError(null);
            }}
            placeholder="6XXXXXXXX"
            autoComplete="tel"
            disabled={isSubmitting}
            required
          />
        </div>
        <small className="sebpay-field-help">{t.phoneHint}</small>
      </label>

      {/* 2. OTP (si requis par l'opérateur) */}
      {selectedOperator?.otpRequired && (
        <label className="field-label">
          <span>{t.otp} <span className="required">*</span></span>
          {otpUssdCode && (
            <div className="sebpay-otp-instruction-inline">
              <span>{t.otpInstructionPrefix}</span>
              <button
                type="button"
                className={`sebpay-ussd-inline-btn ${copiedUssd ? "is-copied" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void copyUssdCode(otpUssdCode);
                }}
                title={copiedUssd ? t.copied : t.clickToCopy}
              >
                <code>{otpUssdCode}</code>
                {copiedUssd ? (
                  <Check size={10} aria-hidden="true" />
                ) : (
                  <Copy size={10} aria-hidden="true" />
                )}
                <span>{copiedUssd ? t.copied : t.copy}</span>
              </button>
              <span>{t.otpInstructionSuffix}</span>
            </div>
          )}
          <div className="field">
            <input
              type="text"
              inputMode="numeric"
              value={otpCode}
              onChange={(event) => {
                setOtpCode(event.target.value.slice(0, 64));
                setError(null);
              }}
              placeholder="123456"
              maxLength={64}
              autoComplete="one-time-code"
              disabled={isSubmitting}
              required
            />
          </div>
        </label>
      )}

      {/* 3 & 4. Opérateur et Pays sur la même ligne (desktop et mobile) */}
      <div className="sebpay-fields-row sebpay-operator-country-row">
        <label className="field-label">
          <span>{t.operator} <span className="required">*</span></span>
          <div className="field sebpay-select-field">
            <select
              value={operator}
              onChange={(event) => {
                setOperator(event.target.value);
                setOtpCode("");
                setError(null);
              }}
              disabled={isSubmitting || availableOperators.length === 0}
              required
            >
              {availableOperators.map((candidate) => (
                <option value={candidate.code} key={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="field-label">
          <span>{t.country} <span className="required">*</span></span>
          <div className="field sebpay-select-field">
            <select
              value={countryCode}
              onChange={(event) => {
                const nextCountryCode = event.target.value;
                const nextCountry = countries.find(
                  (country) => country.code === nextCountryCode,
                );
                setCountryCode(nextCountryCode);
                setOperator(nextCountry?.operators[0]?.code ?? "");
                if (whatsapp) {
                  setPhone(initialLocalPhone(whatsapp, nextCountry));
                }
                setOtpCode("");
                setError(null);
              }}
              disabled={isSubmitting}
              required
            >
              {countries.map((country) => (
                <option value={country.code} key={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        </label>
      </div>

      {error && <p className="sebpay-checkout-error" role="alert">{error}</p>}

      {providerLink && (
        <a
          className="sebpay-provider-link"
          href={providerLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={15} aria-hidden="true" /> {t.openProvider}
        </a>
      )}

      <button
        className="soleaspay-checkout-submit sebpay-checkout-submit"
        type="submit"
        disabled={isSubmitting || !EMAIL_PATTERN.test(email) || !selectedOperator}
        aria-busy={isSubmitting}
      >
        <ExternalLink size={18} aria-hidden="true" />
        <span>{t.pay}</span>
      </button>
    </form>
  );
}

