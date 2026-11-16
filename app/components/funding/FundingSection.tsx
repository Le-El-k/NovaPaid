"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/app/lib/i18n";
import { SoleasPayCheckoutV3 } from "@/app/components/payments/SoleasPayCheckoutV3";
import { payWithBkpay } from "@/app/lib/payments/pay-with-bkpay";
import { NovaProgressLoader } from "@/app/components/shared/NovaProgressLoader";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";

interface FundingSectionProps {
  currentBalance?: number;
  onBalanceUpdated?: (newBalance: number) => void;
}

type Mode = "deposit" | "withdraw";

interface ProviderOption {
  id: string;
  name: string;
  nameKey?: string;
  subtext: string;
  icon: string;
  badge?: string;
  feePercent: number;
  minAmount: number;
  maxAmount: number;
  currency: string;
}

// Opérateurs retirés : les passerelles de paiement seront ajoutées ultérieurement.
const DEPOSIT_PROVIDERS: ProviderOption[] = [];

const WITHDRAW_PROVIDERS: ProviderOption[] = [];

const PRESET_AMOUNTS = [5000, 10000, 25000, 50000, 100000];

export function FundingSection({ currentBalance = 250000, onBalanceUpdated }: FundingSectionProps) {
  const { t, language } = useLanguage();
  const requestKeyRef = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d.user) {
          setProfileName(d.user.name || "");
          if (d.user.phone) setPhone(d.user.phone);
        }
      })
      .catch(() => {});
  }, []);
  const [mode, setMode] = useState<Mode>("deposit");
  const [spOrder, setSpOrder] = useState<{ orderRef: string; amountXaf: number; description: string } | null>(null);
  const [profileName, setProfileName] = useState("");
  const [bkLoading, setBkLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [amount, setAmount] = useState<string>("25000");
  const [phone, setPhone] = useState<string>("+237 690 12 34 56");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawLoader, setWithdrawLoader] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<{
    ref: string;
    amount: number;
    fee: number;
    netAmount: number;
    provider: string;
    phone: string;
    type: Mode;
    date: string;
  } | null>(null);

  const providers = mode === "deposit" ? DEPOSIT_PROVIDERS : WITHDRAW_PROVIDERS;
  const provider = providers.find((p) => p.id === selectedProvider) ?? providers[0] ?? null;
  const providerName = (p: ProviderOption | null) => (p ? (p.nameKey ? t(p.nameKey) : p.name) : "—");

  const parsedAmount = Math.max(0, parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0);
  const feePercent = provider?.feePercent ?? 0;
  const feeAmount = Math.round((parsedAmount * feePercent) / 100);
  const netAmount = mode === "deposit" ? parsedAmount - feeAmount : parsedAmount + feeAmount;

  const handleSelectPreset = (val: number) => {
    setAmount(val.toString());
    setErrorMsg(null);
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setSelectedProvider("");
    setErrorMsg(null);
    setSuccessReceipt(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Deposits are collected through SoleasPay — the operator (Orange, MTN, Wave…)
    // is chosen on SoleasPay's page, so no local provider is required here.
    if (mode === "deposit") {
      if (parsedAmount < 100) {
        setErrorMsg(t("fund_err_min").replace("{n}", "100"));
        return;
      }
      if (parsedAmount > 5_000_000) {
        setErrorMsg(t("fund_err_max").replace("{n}", "5 000 000"));
        return;
      }
      await initDepositPayment();
      return;
    }

    // Withdrawals still use the configured payout provider.
    if (!provider) {
      setErrorMsg(t("fund_no_provider_text"));
      return;
    }
    if (parsedAmount < provider.minAmount) {
      setErrorMsg(t("fund_err_min").replace("{n}", provider.minAmount.toLocaleString("fr-FR")));
      return;
    }
    if (parsedAmount > provider.maxAmount) {
      setErrorMsg(t("fund_err_max").replace("{n}", provider.maxAmount.toLocaleString("fr-FR")));
      return;
    }
    if (parsedAmount > currentBalance) {
      setErrorMsg(t("fund_err_insufficient").replace("{n}", currentBalance.toLocaleString("fr-FR")));
      return;
    }

    // Pour un retrait, on affiche d'abord le loader NovaPaid puis on exécute.
    setWithdrawLoader(true);
  };

  const initDepositPayment = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/payments/soleaspay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "wallet_deposit", amountXaf: parsedAmount }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || t("fund_err_generic"));
      setSpOrder({ orderRef: data.orderRef, amountXaf: data.amountXaf, description: data.description });
    } catch (e: any) {
      setErrorMsg(e?.message || t("fund_err_generic"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeFunding = async () => {
    if (!provider) return;
    setIsSubmitting(true);

    try {
      if (!requestKeyRef.current) requestKeyRef.current = crypto.randomUUID();
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          amount: parsedAmount,
          provider: provider.id,
          phone: phone.trim(),
          idempotencyKey: requestKeyRef.current,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || t("fund_err_generic"));
      }

      const receipt = {
        ref: data.publicRef,
        amount: data.amountXaf,
        fee: data.feeXaf,
        netAmount: mode === "deposit" ? data.netAmountXaf : data.totalDebitXaf,
        provider: providerName(provider),
        phone,
        type: mode,
        date: new Date().toLocaleString("fr-FR"),
      };

      setSuccessReceipt(receipt);
      requestKeyRef.current = null;

      if (data.newBalanceXaf !== undefined) {
        onBalanceUpdated?.(data.newBalanceXaf);
        window.dispatchEvent(
          new CustomEvent("novapay:balance-changed", { detail: { balance: data.newBalanceXaf } })
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || t("fund_err_failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="np-funding-container">
      {spOrder && (
        <div className="npvc-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setSpOrder(null); }}>
          <div className="npvc-confirm-dialog" style={{ maxWidth: "420px" }}>
            <div className="npvc-confirm-icon is-info"><Smartphone size={26} /></div>
            <h3>Dépôt via SoleasPay</h3>
            <p>Payez <strong>{spOrder.amountXaf.toLocaleString("fr-FR")} FCFA</strong> par Mobile Money. Votre portefeuille sera crédité automatiquement après confirmation du paiement.</p>
            <p className="npvc-pay-choice-label">Choisissez votre moyen de paiement</p>
            <div className="npvc-soleaspay-wrap">
              <SoleasPayCheckoutV3
                language={language}
                amount={spOrder.amountXaf}
                orderId={spOrder.orderRef}
                description={spOrder.description}
                username={profileName || "Client"}
                whatsapp={phone}
                coins={0}
                productType="coins"
                buttonLabel="Payer avec SoleasPay"
              />
            </div>
            <button
              type="button"
              className="npvc-bkpay-btn"
              disabled={bkLoading}
              onClick={async () => {
                setBkLoading(true);
                setErrorMsg(null);
                try { await payWithBkpay({ type: "wallet_deposit", amountXaf: parsedAmount }); }
                catch (e: any) { setErrorMsg(e?.message || "BKApay indisponible."); setBkLoading(false); }
              }}
            >
              {bkLoading ? "Redirection…" : "Payer avec BKApay"}
            </button>
            <button type="button" className="npvc-confirm-cancel" style={{ width: "100%", marginTop: "10px" }} onClick={() => setSpOrder(null)}>Retour</button>
          </div>
        </div>
      )}

      {/* Sélecteur de mode */}
      <div className="np-funding-toggle-bar">
        <button
          type="button"
          className={`np-funding-toggle-btn ${mode === "deposit" ? "active" : ""}`}
          onClick={() => handleModeChange("deposit")}
        >
          <ArrowDownLeft size={18} />
          <span>{t("fund_toggle_deposit")}</span>
        </button>
        <button
          type="button"
          className={`np-funding-toggle-btn ${mode === "withdraw" ? "active" : ""}`}
          onClick={() => handleModeChange("withdraw")}
        >
          <ArrowUpRight size={18} />
          <span>{t("fund_toggle_withdraw")}</span>
        </button>
      </div>

      {successReceipt ? (
        <div className="np-panel np-receipt-card">
          <div className="np-receipt-header">
            <span className="np-receipt-icon success">
              <CheckCircle2 size={36} />
            </span>
            <h3>{successReceipt.type === "deposit" ? t("fund_receipt_title_deposit") : t("fund_receipt_title_withdraw")}</h3>
            <p className="np-receipt-sub">
              {successReceipt.type === "deposit"
                ? t("fund_receipt_sub_deposit")
                : t("fund_receipt_sub_withdraw")}
            </p>
          </div>

          <div className="np-receipt-body">
            <div className="np-receipt-row">
              <span>{t("fund_receipt_ref")}</span>
              <strong>{successReceipt.ref}</strong>
            </div>
            <div className="np-receipt-row">
              <span>{t("fund_receipt_amount")}</span>
              <strong>{successReceipt.amount.toLocaleString("fr-FR")} FCFA</strong>
            </div>
            <div className="np-receipt-row">
              <span>{t("fund_receipt_fee").replace("{n}", String(feePercent))}</span>
              <span>{successReceipt.fee.toLocaleString("fr-FR")} FCFA</span>
            </div>
            <div className="np-receipt-row highlight">
              <span>{successReceipt.type === "deposit" ? t("fund_receipt_net_deposit") : t("fund_receipt_net_withdraw")}</span>
              <strong>{successReceipt.netAmount.toLocaleString("fr-FR")} FCFA</strong>
            </div>
            <div className="np-receipt-row">
              <span>{t("fund_receipt_status_label")}</span>
              <strong>{t("fund_receipt_status_pending")}</strong>
            </div>
            <div className="np-receipt-row">
              <span>{t("fund_receipt_operator")}</span>
              <span>{successReceipt.provider}</span>
            </div>
            <div className="np-receipt-row">
              <span>{t("fund_receipt_destination")}</span>
              <span>{successReceipt.phone}</span>
            </div>
            <div className="np-receipt-row">
              <span>{t("fund_receipt_datetime")}</span>
              <span>{successReceipt.date}</span>
            </div>
          </div>

          <div className="np-receipt-actions">
            <button
              type="button"
              className="np-primary-button"
              onClick={() => {
                setSuccessReceipt(null);
                setAmount("25000");
              }}
            >
              <RefreshCw size={16} />
              <span>{t("fund_receipt_new_operation")}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="np-funding-grid">
          {/* Colonne formulaire */}
          <form className="np-panel np-funding-form" onSubmit={handleSubmit}>
            <div className="np-panel-heading">
              <div>
                <h2>{mode === "deposit" ? t("fund_title_deposit") : t("fund_title_withdraw")}</h2>
              </div>
              <div className="np-funding-balance-badge">
                <Wallet size={14} />
                <span>{t("fund_available_label")} <b>{currentBalance.toLocaleString("fr-FR")} FCFA</b></span>
              </div>
            </div>

            {errorMsg && (
              <div className="np-alert-banner danger">
                <Info size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Choix du prestataire */}
            <div className="np-form-group">
              <label className="np-form-label">{t("fund_choose_operator")}</label>
              {providers.length === 0 ? (
                <div className="np-provider-empty">
                  <Info size={16} />
                  <span>{t("fund_no_provider_text")}</span>
                </div>
              ) : (
                <div className="np-provider-grid">
                  {providers.map((p) => {
                    const isSelected = p.id === selectedProvider;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`np-provider-chip ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedProvider(p.id)}
                      >
                        <span className="np-provider-icon">{p.icon}</span>
                        <div className="np-provider-meta">
                          <strong>{providerName(p)}</strong>
                          <small>{t(p.subtext)}</small>
                        </div>
                        {p.badge && <span className="np-provider-badge">{t(p.badge)}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Saisie montant */}
            <div className="np-form-group">
              <label className="np-form-label" htmlFor="funding-amount">
                {mode === "deposit" ? t("fund_amount_label_deposit") : t("fund_amount_label_withdraw")}
              </label>
              <div className="np-input-wrapper">
                <input
                  id="funding-amount"
                  type="text"
                  className="np-text-input amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder={t("fund_amount_placeholder")}
                  required
                />
                <span className="np-input-suffix">FCFA</span>
              </div>

              {/* Raccourcis montants */}
              <div className="np-preset-chips">
                {PRESET_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={`np-preset-chip ${parsedAmount === val ? "active" : ""}`}
                    onClick={() => handleSelectPreset(val)}
                  >
                    {val >= 1000 ? `${val / 1000}k` : val}
                  </button>
                ))}
              </div>
            </div>

            {/* Numéro de téléphone / compte */}
            <div className="np-form-group">
              <label className="np-form-label" htmlFor="funding-phone">
                {mode === "withdraw" && provider?.id === "bank" ? t("fund_phone_label_iban") : t("fund_phone_label_account").replace("{n}", providerName(provider))}
              </label>
              <div className="np-input-wrapper">
                <span className="np-input-prefix">
                  <Smartphone size={16} />
                </span>
                <input
                  id="funding-phone"
                  type="text"
                  className="np-text-input with-prefix"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={mode === "withdraw" && provider?.id === "bank" ? t("fund_phone_placeholder_iban") : t("fund_phone_placeholder_phone")}
                  required
                />
              </div>
              <small className="np-form-hint">
                {mode === "deposit"
                  ? t("fund_phone_hint_deposit")
                  : t("fund_phone_hint_withdraw")}
              </small>
            </div>

            <button type="submit" className="np-primary-button np-submit-btn" disabled={isSubmitting || (mode === "withdraw" && !provider)}>
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{t("fund_submitting")}</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>
                    {mode === "deposit"
                      ? t("fund_submit_deposit").replace("{n}", parsedAmount.toLocaleString("fr-FR"))
                      : t("fund_submit_withdraw").replace("{n}", parsedAmount.toLocaleString("fr-FR"))}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Colonne récapitulatif & sécurité */}
          <aside className="np-funding-summary-col">
            <div className="np-panel np-summary-card">
              <div className="np-summary-header">
                <span className="np-overline">{t("fund_summary_overline")}</span>
                <h3>{t("fund_summary_title")}</h3>
              </div>

              <div className="np-summary-list">
                <div className="np-summary-item">
                  <span>{t("fund_summary_operation_label")}</span>
                  <strong>{mode === "deposit" ? t("fund_summary_operation_deposit") : t("fund_summary_operation_withdraw")}</strong>
                </div>
                <div className="np-summary-item">
                  <span>{t("fund_summary_provider")}</span>
                  <strong>{providerName(provider)}</strong>
                </div>
                <div className="np-summary-item">
                  <span>{t("fund_summary_gross")}</span>
                  <strong>{parsedAmount.toLocaleString("fr-FR")} FCFA</strong>
                </div>
                <div className="np-summary-item">
                  <span>{t("fund_summary_network_fee").replace("{n}", String(feePercent))}</span>
                  <span>{feeAmount.toLocaleString("fr-FR")} FCFA</span>
                </div>
                <div className="np-summary-divider" />
                <div className="np-summary-total">
                  <span>{mode === "deposit" ? t("fund_summary_total_deposit") : t("fund_summary_total_withdraw")}</span>
                  <div className="np-total-val">
                    <strong>{netAmount.toLocaleString("fr-FR")}</strong>
                    <small>FCFA</small>
                  </div>
                </div>
              </div>

              <div className="np-funding-guarantee">
                <ShieldCheck size={20} className="np-guar-icon" />
                <div>
                  <strong>{t("fund_guarantee_title")}</strong>
                  <span>{t("fund_guarantee_text")}</span>
                </div>
              </div>
            </div>

            <div className="np-panel np-faq-snippet">
              <h4>{t("fund_faq_title")}</h4>
              <details className="np-faq-item">
                <summary>{t("fund_faq_q1")}</summary>
                <p>{t("fund_faq_a1")}</p>
              </details>
              <details className="np-faq-item">
                <summary>{t("fund_faq_q2")}</summary>
                <p>{t("fund_faq_a2")}</p>
              </details>
            </div>
          </aside>
        </div>
      )}

      <NovaProgressLoader
        active={withdrawLoader}
        label={t("fund_withdraw_processing")}
        onComplete={async () => { setWithdrawLoader(false); await executeFunding(); }}
      />
    </div>
  );
}
