"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  PieChart,
  Plus,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";

interface WalletSectionProps {
  balanceXaf: number;
  reservedXaf?: number;
  onNavigateSection?: (sectionId: string) => void;
  onTriggerAction?: (action: "deposit" | "withdraw" | "transfer") => void;
}

export function WalletSection({
  balanceXaf = 250000,
  reservedXaf = 0,
  onNavigateSection,
  onTriggerAction,
}: WalletSectionProps) {
  const [showBalance, setShowBalance] = useState(true);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const accountNumber = "NP-237-9941-8812";
  const eurEquivalent = (balanceXaf / 655.957).toFixed(2);
  const usdEquivalent = (balanceXaf / 610.0).toFixed(2);

  const dailyUsed = 35000;
  const dailyLimit = 500000;
  const dailyPercent = Math.min(100, Math.round((dailyUsed / dailyLimit) * 100));

  const monthlyUsed = 285000;
  const monthlyLimit = 2500000;
  const monthlyPercent = Math.min(100, Math.round((monthlyUsed / monthlyLimit) * 100));

  const copyAccountNumber = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(accountNumber);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    }
  };

  return (
    <div className="np-wallet-view-container">
      {/* Carte héroïque du compte principal */}
      <section className="np-wallet-hero-card">
        <div className="np-wallet-hero-top">
          <div className="np-wallet-type-tag">
            <span className="np-pulse-dot" />
            <span>Compte Courant Particulier (XAF)</span>
          </div>
          <button
            type="button"
            className="np-wallet-visibility-btn"
            onClick={() => setShowBalance(!showBalance)}
            aria-label={showBalance ? "Masquer le solde" : "Afficher le solde"}
          >
            {showBalance ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>{showBalance ? "Masquer" : "Afficher"}</span>
          </button>
        </div>

        <div className="np-wallet-hero-amount">
          <span className="np-wallet-amount-label">Solde disponible</span>
          <div className="np-wallet-main-number">
            <strong>{showBalance ? balanceXaf.toLocaleString("fr-FR") : "••••••••"}</strong>
            <small>FCFA</small>
          </div>
          <div className="np-wallet-currencies-bar">
            <span>≈ {showBalance ? `${eurEquivalent} € EUR` : "••••"}</span>
            <span className="np-bullet">•</span>
            <span>≈ {showBalance ? `$${usdEquivalent} USD` : "••••"}</span>
          </div>
        </div>

        <div className="np-wallet-hero-bottom">
          <div className="np-wallet-account-info">
            <span className="np-account-label">Identifiant NovaPaid (RIB virtuel)</span>
            <div className="np-account-row">
              <code>{accountNumber}</code>
              <button
                type="button"
                className="np-copy-chip"
                onClick={copyAccountNumber}
                title="Copier le numéro de compte"
              >
                {copiedAccount ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedAccount ? "Copié !" : "Copier"}</span>
              </button>
            </div>
          </div>

          <div className="np-wallet-hero-actions">
            <button
              type="button"
              className="np-wallet-action-btn primary"
              onClick={() => onTriggerAction?.("deposit")}
            >
              <ArrowDownLeft size={17} />
              <span>Recharger</span>
            </button>
            <button
              type="button"
              className="np-wallet-action-btn"
              onClick={() => onTriggerAction?.("withdraw")}
            >
              <ArrowUpRight size={17} />
              <span>Retirer</span>
            </button>
            <button
              type="button"
              className="np-wallet-action-btn"
              onClick={() => onNavigateSection?.("transfers")}
            >
              <ArrowLeftRight size={17} />
              <span>Transférer</span>
            </button>
          </div>
        </div>
      </section>

      {/* Grille des indicateurs & plafonds */}
      <section className="np-wallet-stats-grid">
        {/* Plafonds de dépenses */}
        <article className="np-panel np-limit-card">
          <div className="np-limit-header">
            <div>
              <span className="np-overline">LIMITES D'OPÉRATIONS</span>
              <h3>Plafonds & Sécurité (Niveau 2)</h3>
            </div>
            <span className="np-badge success">
              <ShieldCheck size={14} /> Vérifié
            </span>
          </div>

          <div className="np-limit-bars">
            <div className="np-limit-item">
              <div className="np-limit-meta">
                <span>Plafond journalier</span>
                <b>{dailyUsed.toLocaleString("fr-FR")} / {dailyLimit.toLocaleString("fr-FR")} FCFA</b>
              </div>
              <div className="np-progress-track">
                <div className="np-progress-fill" style={{ width: `${dailyPercent}%` }} />
              </div>
              <small>{100 - dailyPercent}% restant disponible aujourd’hui</small>
            </div>

            <div className="np-limit-item">
              <div className="np-limit-meta">
                <span>Plafond mensuel</span>
                <b>{monthlyUsed.toLocaleString("fr-FR")} / {monthlyLimit.toLocaleString("fr-FR")} FCFA</b>
              </div>
              <div className="np-progress-track">
                <div className="np-progress-fill accent" style={{ width: `${monthlyPercent}%` }} />
              </div>
              <small>{100 - monthlyPercent}% restant disponible ce mois</small>
            </div>
          </div>
        </article>

        {/* Détail de la répartition */}
        <article className="np-panel np-breakdown-card">
          <div className="np-panel-heading">
            <div>
              <span className="np-overline">RÉPARTITION DU PORTEFEUILLE</span>
              <h3>Fonds & Réserves</h3>
            </div>
            <PieChart size={18} className="text-blue-500" />
          </div>

          <div className="np-breakdown-list">
            <div className="np-breakdown-row">
              <div className="np-breakdown-dot active" />
              <div className="np-breakdown-label">
                <strong>Solde actif disponible</strong>
                <small>Immédiatement utilisable</small>
              </div>
              <span className="np-breakdown-value">{balanceXaf.toLocaleString("fr-FR")} FCFA</span>
            </div>

            <div className="np-breakdown-row">
              <div className="np-breakdown-dot reserved" />
              <div className="np-breakdown-label">
                <strong>Fonds réservés cartes</strong>
                <small>Pré-autorisations marchands</small>
              </div>
              <span className="np-breakdown-value">{reservedXaf > 0 ? reservedXaf.toLocaleString("fr-FR") + " FCFA" : "0 FCFA"}</span>
            </div>

            <div className="np-breakdown-row">
              <div className="np-breakdown-dot pending" />
              <div className="np-breakdown-label">
                <strong>En cours de compensation</strong>
                <small>Virements interbancaires</small>
              </div>
              <span className="np-breakdown-value">0 FCFA</span>
            </div>
          </div>

          <div className="np-breakdown-footer">
            <button
              type="button"
              className="np-text-link"
              onClick={() => onNavigateSection?.("history")}
            >
              <span>Consulter l'historique complet</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </article>
      </section>

      {/* Raccourcis cartes connectées au portefeuille */}
      <section className="np-panel np-connected-services">
        <div className="np-connected-header">
          <div className="np-connected-icon">
            <CreditCard size={22} />
          </div>
          <div>
            <h3>Cartes de paiement connectées</h3>
            <p>Vos cartes virtuelles débitent directement ou sont approvisionnées depuis ce portefeuille.</p>
          </div>
          <button
            type="button"
            className="np-outline-button ml-auto"
            onClick={() => onNavigateSection?.("cards")}
          >
            <span>Gérer mes cartes</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}
