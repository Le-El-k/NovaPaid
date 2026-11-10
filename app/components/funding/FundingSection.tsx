"use client";

import { useRef, useState } from "react";
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
  subtext: string;
  icon: string;
  badge?: string;
  feePercent: number;
  minAmount: number;
  maxAmount: number;
  currency: string;
}

const DEPOSIT_PROVIDERS: ProviderOption[] = [
  {
    id: "orange",
    name: "Orange Money",
    subtext: "Vérification manuelle du paiement",
    icon: "OM",
    badge: "Populaire",
    feePercent: 1.0,
    minAmount: 1000,
    maxAmount: 500000,
    currency: "FCFA",
  },
  {
    id: "mtn",
    name: "MTN Mobile Money",
    subtext: "Vérification manuelle du paiement",
    icon: "MTN",
    feePercent: 1.0,
    minAmount: 1000,
    maxAmount: 500000,
    currency: "FCFA",
  },
  {
    id: "wave",
    name: "Wave Mobile",
    subtext: "Vérification manuelle du paiement",
    icon: "WV",
    feePercent: 0.5,
    minAmount: 500,
    maxAmount: 300000,
    currency: "FCFA",
  },
  {
    id: "card",
    name: "Carte Bancaire",
    subtext: "Vérification manuelle du paiement",
    icon: "CB",
    feePercent: 1.8,
    minAmount: 2500,
    maxAmount: 1000000,
    currency: "FCFA",
  },
];

const WITHDRAW_PROVIDERS: ProviderOption[] = [
  {
    id: "orange",
    name: "Orange Money",
    subtext: "Règlement manuel après validation",
    icon: "OM",
    badge: "Recommandé",
    feePercent: 1.0,
    minAmount: 2000,
    maxAmount: 350000,
    currency: "FCFA",
  },
  {
    id: "mtn",
    name: "MTN Mobile Money",
    subtext: "Règlement manuel après validation",
    icon: "MTN",
    feePercent: 1.0,
    minAmount: 2000,
    maxAmount: 350000,
    currency: "FCFA",
  },
  {
    id: "bank",
    name: "Virement Bancaire (CEMAC)",
    subtext: "Règlement manuel après validation",
    icon: "RIB",
    feePercent: 0.8,
    minAmount: 10000,
    maxAmount: 2500000,
    currency: "FCFA",
  },
];

const PRESET_AMOUNTS = [5000, 10000, 25000, 50000, 100000];

export function FundingSection({ currentBalance = 250000, onBalanceUpdated }: FundingSectionProps) {
  const requestKeyRef = useRef<string | null>(null);
  const [mode, setMode] = useState<Mode>("deposit");
  const [selectedProvider, setSelectedProvider] = useState<string>("orange");
  const [amount, setAmount] = useState<string>("25000");
  const [phone, setPhone] = useState<string>("+237 690 12 34 56");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const provider = providers.find((p) => p.id === selectedProvider) ?? providers[0];

  const parsedAmount = Math.max(0, parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0);
  const feeAmount = Math.round((parsedAmount * provider.feePercent) / 100);
  const netAmount = mode === "deposit" ? parsedAmount - feeAmount : parsedAmount + feeAmount;

  const handleSelectPreset = (val: number) => {
    setAmount(val.toString());
    setErrorMsg(null);
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setSelectedProvider(newMode === "deposit" ? "orange" : "orange");
    setErrorMsg(null);
    setSuccessReceipt(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (parsedAmount < provider.minAmount) {
      setErrorMsg(`Le montant minimum pour ce mode est de ${provider.minAmount.toLocaleString("fr-FR")} FCFA.`);
      return;
    }
    if (parsedAmount > provider.maxAmount) {
      setErrorMsg(`Le montant maximum autorisé est de ${provider.maxAmount.toLocaleString("fr-FR")} FCFA.`);
      return;
    }

    if (mode === "withdraw" && parsedAmount > currentBalance) {
      setErrorMsg(`Solde insuffisant (${currentBalance.toLocaleString("fr-FR")} FCFA disponible).`);
      return;
    }

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
        throw new Error(data.error || "Une erreur est survenue.");
      }

      const receipt = {
        ref: data.publicRef,
        amount: data.amountXaf,
        fee: data.feeXaf,
        netAmount: mode === "deposit" ? data.netAmountXaf : data.totalDebitXaf,
        provider: provider.name,
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
      setErrorMsg(err?.message || "Échec de l'opération.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="np-funding-container">
      {/* Sélecteur de mode */}
      <div className="np-funding-toggle-bar">
        <button
          type="button"
          className={`np-funding-toggle-btn ${mode === "deposit" ? "active" : ""}`}
          onClick={() => handleModeChange("deposit")}
        >
          <ArrowDownLeft size={18} />
          <span>Ajouter de l’argent (Dépôt)</span>
        </button>
        <button
          type="button"
          className={`np-funding-toggle-btn ${mode === "withdraw" ? "active" : ""}`}
          onClick={() => handleModeChange("withdraw")}
        >
          <ArrowUpRight size={18} />
          <span>Retirer des fonds</span>
        </button>
      </div>

      {successReceipt ? (
        <div className="np-panel np-receipt-card">
          <div className="np-receipt-header">
            <span className="np-receipt-icon success">
              <CheckCircle2 size={36} />
            </span>
            <h3>{successReceipt.type === "deposit" ? "Demande de dépôt enregistrée" : "Demande de retrait enregistrée"}</h3>
            <p className="np-receipt-sub">
              {successReceipt.type === "deposit"
                ? "Le portefeuille sera crédité après vérification du paiement par l’équipe NovaPaid. Aucun paiement n’a été lancé depuis cette page."
                : "Le montant et les frais sont réservés. Le paiement sera traité après validation administrative."}
            </p>
          </div>

          <div className="np-receipt-body">
            <div className="np-receipt-row">
              <span>Référence d'opération</span>
              <strong>{successReceipt.ref}</strong>
            </div>
            <div className="np-receipt-row">
              <span>Montant demandé</span>
              <strong>{successReceipt.amount.toLocaleString("fr-FR")} FCFA</strong>
            </div>
            <div className="np-receipt-row">
              <span>Frais de service ({provider.feePercent}%)</span>
              <span>{successReceipt.fee.toLocaleString("fr-FR")} FCFA</span>
            </div>
            <div className="np-receipt-row highlight">
              <span>{successReceipt.type === "deposit" ? "Montant net à créditer après contrôle" : "Montant total réservé"}</span>
              <strong>{successReceipt.netAmount.toLocaleString("fr-FR")} FCFA</strong>
            </div>
            <div className="np-receipt-row">
              <span>Statut</span>
              <strong>En attente de vérification</strong>
            </div>
            <div className="np-receipt-row">
              <span>Opérateur / Moyen</span>
              <span>{successReceipt.provider}</span>
            </div>
            <div className="np-receipt-row">
              <span>Numéro / Destination</span>
              <span>{successReceipt.phone}</span>
            </div>
            <div className="np-receipt-row">
              <span>Date et heure</span>
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
              <span>Effectuer une autre opération</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="np-funding-grid">
          {/* Colonne formulaire */}
          <form className="np-panel np-funding-form" onSubmit={handleSubmit}>
            <div className="np-panel-heading">
              <div>
                <span className="np-overline">
                  {mode === "deposit" ? "APPROVISIONNEMENT EN LIGNE" : "SORTIE DE FONDS SÉCURISÉE"}
                </span>
                <h2>{mode === "deposit" ? "Recharger mon portefeuille" : "Retirer vers Mobile Money"}</h2>
              </div>
              <div className="np-funding-balance-badge">
                <Wallet size={14} />
                <span>Dispo: <b>{currentBalance.toLocaleString("fr-FR")} FCFA</b></span>
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
              <label className="np-form-label">Choisissez un opérateur</label>
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
                        <strong>{p.name}</strong>
                        <small>{p.subtext}</small>
                      </div>
                      {p.badge && <span className="np-provider-badge">{p.badge}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Saisie montant */}
            <div className="np-form-group">
              <label className="np-form-label" htmlFor="funding-amount">
                Montant à {mode === "deposit" ? "déposer" : "retirer"} (FCFA)
              </label>
              <div className="np-input-wrapper">
                <input
                  id="funding-amount"
                  type="text"
                  className="np-text-input amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Ex: 25000"
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
                {mode === "withdraw" && provider.id === "bank" ? "IBAN ou compte bancaire destination" : `Numéro de compte (${provider.name})`}
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
                  placeholder={mode === "withdraw" && provider.id === "bank" ? "Ex. CM21 1000 1000 0000 0000 0000 0000" : "+237 6XX XX XX XX"}
                  required
                />
              </div>
              <small className="np-form-hint">
                {mode === "deposit"
                  ? "Ce numéro aide l’équipe à vérifier le paiement externe. Ce formulaire ne lance pas de paiement auprès de l’opérateur."
                  : "Vérifiez le numéro : le retrait sera envoyé manuellement après validation de la demande."}
              </small>
            </div>

            <button type="submit" className="np-primary-button np-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Traitement en cours...</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>
                    {mode === "deposit"
                      ? `Demander un dépôt de ${parsedAmount.toLocaleString("fr-FR")} FCFA`
                      : `Demander un retrait de ${parsedAmount.toLocaleString("fr-FR")} FCFA`}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Colonne récapitulatif & sécurité */}
          <aside className="np-funding-summary-col">
            <div className="np-panel np-summary-card">
              <div className="np-summary-header">
                <span className="np-overline">DÉTAIL DU PAIEMENT</span>
                <h3>Récapitulatif transparent</h3>
              </div>

              <div className="np-summary-list">
                <div className="np-summary-item">
                  <span>Opération</span>
                  <strong>{mode === "deposit" ? "Dépôt soumis à vérification" : "Retrait soumis à validation"}</strong>
                </div>
                <div className="np-summary-item">
                  <span>Prestataire</span>
                  <strong>{provider.name}</strong>
                </div>
                <div className="np-summary-item">
                  <span>Montant brut</span>
                  <strong>{parsedAmount.toLocaleString("fr-FR")} FCFA</strong>
                </div>
                <div className="np-summary-item">
                  <span>Frais de réseau ({provider.feePercent}%)</span>
                  <span>{feeAmount.toLocaleString("fr-FR")} FCFA</span>
                </div>
                <div className="np-summary-divider" />
                <div className="np-summary-total">
                  <span>{mode === "deposit" ? "Crédit estimé après validation" : "Total réservé"}</span>
                  <div className="np-total-val">
                    <strong>{netAmount.toLocaleString("fr-FR")}</strong>
                    <small>FCFA</small>
                  </div>
                </div>
              </div>

              <div className="np-funding-guarantee">
                <ShieldCheck size={20} className="np-guar-icon" />
                <div>
                  <strong>Sécurité bancaire 256-bit</strong>
                  <span>Toutes les transactions sont chiffrées de bout en bout et protégées contre la fraude.</span>
                </div>
              </div>
            </div>

            <div className="np-panel np-faq-snippet">
              <h4>Questions fréquentes</h4>
              <details className="np-faq-item">
                <summary>Combien de temps prend un dépôt Mobile Money ?</summary>
                <p>Les dépôts Orange Money et MTN MoMo sont crédités immédiatement une fois le code PIN validé.</p>
              </details>
              <details className="np-faq-item">
                <summary>Quels sont les plafonds applicables ?</summary>
                <p>En compte vérifié (Niveau 2), le plafond journalier est de 500 000 FCFA et le plafond mensuel de 2 500 000 FCFA.</p>
              </details>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
