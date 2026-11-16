"use client";

import { useState } from "react";
import { useLanguage } from "@/app/lib/i18n";
import { MoneyValue } from "@/app/lib/currency";
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
  const { t } = useLanguage();
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
            <span>{t("wal_account_type_tag")}</span>
          </div>
          <button
            type="button"
            className="np-wallet-visibility-btn"
            onClick={() => setShowBalance(!showBalance)}
            aria-label={showBalance ? t("wal_hide_balance") : t("wal_show_balance")}
          >
            {showBalance ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>{showBalance ? t("wal_hide") : t("wal_show")}</span>
          </button>
        </div>

        <div className="np-wallet-hero-amount">
          <span className="np-wallet-amount-label">{t("wal_available_balance")}</span>
          <div className="np-wallet-main-number">
            <strong><MoneyValue amount={balanceXaf} maskable={false} hidden={!showBalance} /></strong>
          </div>
          <div className="np-wallet-currencies-bar">
            <span>≈ {showBalance ? `${eurEquivalent} € EUR` : "••••"}</span>
            <span className="np-bullet">•</span>
            <span>≈ {showBalance ? `$${usdEquivalent} USD` : "••••"}</span>
          </div>
        </div>

        <div className="np-wallet-hero-bottom">
          <div className="np-wallet-account-info">
            <span className="np-account-label">{t("wal_account_identifier")}</span>
            <div className="np-account-row">
              <code>{accountNumber}</code>
              <button
                type="button"
                className="np-copy-chip"
                onClick={copyAccountNumber}
                title={t("wal_copy_account_number")}
              >
                {copiedAccount ? <Check size={13} className="np-icon-success" /> : <Copy size={13} />}
                <span>{copiedAccount ? t("wal_copied") : t("wal_copy")}</span>
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
              <span>{t("wal_deposit")}</span>
            </button>
            <button
              type="button"
              className="np-wallet-action-btn"
              onClick={() => onTriggerAction?.("withdraw")}
            >
              <ArrowUpRight size={17} />
              <span>{t("wal_withdraw")}</span>
            </button>
            <button
              type="button"
              className="np-wallet-action-btn"
              onClick={() => onNavigateSection?.("transfers")}
            >
              <ArrowLeftRight size={17} />
              <span>{t("wal_transfer")}</span>
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
              <span className="np-overline">{t("wal_operations_limits_overline")}</span>
              <h3>{t("wal_limits_security_title")}</h3>
            </div>
            <span className="np-badge success">
              <ShieldCheck size={14} /> {t("wal_verified")}
            </span>
          </div>

          <div className="np-limit-bars">
            <div className="np-limit-item">
              <div className="np-limit-meta">
                <span>{t("wal_daily_limit")}</span>
                <b>{dailyUsed.toLocaleString("fr-FR")} / {dailyLimit.toLocaleString("fr-FR")} FCFA</b>
              </div>
              <div className="np-progress-track">
                <div className="np-progress-fill" style={{ width: `${dailyPercent}%` }} />
              </div>
              <small>{t("wal_daily_remaining").replace("{n}", String(100 - dailyPercent))}</small>
            </div>

            <div className="np-limit-item">
              <div className="np-limit-meta">
                <span>{t("wal_monthly_limit")}</span>
                <b>{monthlyUsed.toLocaleString("fr-FR")} / {monthlyLimit.toLocaleString("fr-FR")} FCFA</b>
              </div>
              <div className="np-progress-track">
                <div className="np-progress-fill accent" style={{ width: `${monthlyPercent}%` }} />
              </div>
              <small>{t("wal_monthly_remaining").replace("{n}", String(100 - monthlyPercent))}</small>
            </div>
          </div>
        </article>

        {/* Détail de la répartition */}
        <article className="np-panel np-breakdown-card">
          <div className="np-panel-heading">
            <div>
              <span className="np-overline">{t("wal_portfolio_breakdown_overline")}</span>
              <h3>{t("wal_funds_reserves_title")}</h3>
            </div>
            <PieChart size={18} className="np-icon-accent" />
          </div>

          <div className="np-breakdown-list">
            <div className="np-breakdown-row">
              <div className="np-breakdown-dot active" />
              <div className="np-breakdown-label">
                <strong>{t("wal_active_balance")}</strong>
                <small>{t("wal_immediately_usable")}</small>
              </div>
              <span className="np-breakdown-value">{balanceXaf.toLocaleString("fr-FR")} FCFA</span>
            </div>

            <div className="np-breakdown-row">
              <div className="np-breakdown-dot reserved" />
              <div className="np-breakdown-label">
                <strong>{t("wal_reserved_card_funds")}</strong>
                <small>{t("wal_merchant_preauth")}</small>
              </div>
              <span className="np-breakdown-value">{reservedXaf > 0 ? reservedXaf.toLocaleString("fr-FR") + " FCFA" : "0 FCFA"}</span>
            </div>

            <div className="np-breakdown-row">
              <div className="np-breakdown-dot pending" />
              <div className="np-breakdown-label">
                <strong>{t("wal_clearing_in_progress")}</strong>
                <small>{t("wal_interbank_transfers")}</small>
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
              <span>{t("wal_view_full_history")}</span>
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
            <h3>{t("wal_connected_cards_title")}</h3>
            <p>{t("wal_connected_cards_desc")}</p>
          </div>
          <button
            type="button"
            className="np-outline-button ml-auto"
            onClick={() => onNavigateSection?.("cards")}
          >
            <span>{t("wal_manage_cards")}</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}
