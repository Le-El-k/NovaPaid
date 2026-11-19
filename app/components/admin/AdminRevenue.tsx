"use client";

import { useEffect, useState } from "react";
import {
  Activity, ArrowDown, ArrowUp, CreditCard, DollarSign, Loader2,
  RefreshCw, TrendingUp, Users, Wallet, AlertTriangle, Clock, Shield,
} from "lucide-react";
import { useLanguage } from "@/app/lib/i18n";
import { useCurrency } from "@/app/lib/currency";

export function AdminRevenue() {
  const { t } = useLanguage();
  const { currency, convertAmount } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin?section=revenue");
      const json = await res.json();
      if (json.success) setStats(json.stats);
      else setError(json.error || t("arev_loading"));
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
    }
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const fmtXaf = (minor: number) => {
    const v = convertAmount((minor || 0) / 100, "XAF", currency);
    return currency === "XAF"
      ? `${Math.round(v).toLocaleString("fr-FR")} FCFA`
      : `${v.toFixed(2)} $`;
  };

  if (loading) {
    return (
      <div className="np-admin-revenue-loading">
        <Loader2 size={20} className="animate-spin" />
        <span>{t("arev_loading")}</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="np-admin-revenue-loading">
        <AlertTriangle size={20} />
        <span>{error || t("arev_loading")}</span>
        <button type="button" className="np-admin-fees-refresh" onClick={fetchStats}>
          <RefreshCw size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="np-admin-revenue">
      <div className="np-admin-revenue-header">
        <h3>{t("arev_dashboard_title")}</h3>
        <button type="button" className="np-admin-fees-refresh" onClick={fetchStats}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* KPI Grid */}
      <div className="np-admin-revenue-kpi-grid">
        <KpiCard icon={Users} label={t("arev_kpi_users")} value={fmt(stats.users.total)}
          sub={t("arev_users_active_sub").replace("{n}", fmt(stats.users.active))}
          change={t("arev_users_new_today").replace("{n}", fmt(stats.users.newToday))} positive />
        <KpiCard icon={CreditCard} label={t("arev_kpi_cards")} value={fmt(stats.cards.total)}
          sub={t("arev_cards_active_sub").replace("{n}", fmt(stats.cards.active))} />
        <KpiCard icon={Activity} label={t("arev_kpi_transactions")} value={fmt(stats.transactions.total)}
          sub={t("arev_tx_today_sub").replace("{n}", fmt(stats.transactions.today))}
          change={t("arev_tx_week_change").replace("{n}", fmt(stats.transactions.week))} positive />
        <KpiCard icon={Wallet} label={t("arev_kpi_wallet_balance")} value={fmtXaf(stats.walletBalance)} />
        <KpiCard icon={TrendingUp} label={t("arev_kpi_volume_total")} value={fmtXaf(stats.volume.total)}
          sub={t("arev_volume_today_sub").replace("{n}", fmtXaf(stats.volume.today))}
          change={t("arev_volume_week_change").replace("{n}", fmtXaf(stats.volume.week))} positive />
        <KpiCard icon={DollarSign} label={t("arev_kpi_new_month")} value={fmt(stats.users.newMonth)}
          sub={t("arev_users_new_week_sub").replace("{n}", fmt(stats.users.newWeek))} />
      </div>

      {/* Pending alerts */}
      <div className="np-admin-revenue-alerts">
        {stats.pending.approvals > 0 && (
          <div className="np-admin-revenue-alert warning">
            <Clock size={16} />
            <span><strong>{stats.pending.approvals}</strong> {t("arev_pending_approvals")}</span>
          </div>
        )}
        {stats.pending.kyc > 0 && (
          <div className="np-admin-revenue-alert info">
            <Shield size={16} />
            <span><strong>{stats.pending.kyc}</strong> {t("arev_pending_kyc")}</span>
          </div>
        )}
        {stats.pending.tickets > 0 && (
          <div className="np-admin-revenue-alert danger">
            <AlertTriangle size={16} />
            <span><strong>{stats.pending.tickets}</strong> {t("arev_pending_tickets")}</span>
          </div>
        )}
      </div>

      {/* Daily volume chart (simple bar chart) */}
      {stats.dailyVolume && stats.dailyVolume.length > 0 && (
        <div className="np-admin-revenue-chart-section">
          <h4>{t("arev_daily_volume_title")}</h4>
          <div className="np-admin-revenue-bar-chart">
            {(() => {
              const maxVol = Math.max(...stats.dailyVolume.map((d: any) => d.volume), 1);
              return stats.dailyVolume.map((d: any) => (
                <div key={d.day} className="np-admin-revenue-bar-col">
                  <div className="np-admin-revenue-bar-value">{fmtXaf(d.volume)}</div>
                  <div className="np-admin-revenue-bar" style={{ height: `${Math.max(4, (d.volume / maxVol) * 120)}px` }} />
                  <div className="np-admin-revenue-bar-label">{d.day.slice(5)}</div>
                  <div className="np-admin-revenue-bar-count">{d.count} tx</div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Transaction type breakdown */}
      {stats.typeBreakdown && stats.typeBreakdown.length > 0 && (
        <div className="np-admin-revenue-chart-section">
          <h4>{t("arev_breakdown_title")}</h4>
          <div className="np-admin-revenue-breakdown">
            {stats.typeBreakdown.map((tx: any) => (
              <div key={tx.type} className="np-admin-revenue-breakdown-row">
                <span className="np-admin-revenue-breakdown-type">{tx.type || t("arev_type_other")}</span>
                <span className="np-admin-revenue-breakdown-count">{fmt(tx.count)} tx</span>
                <span className="np-admin-revenue-breakdown-vol">{fmtXaf(tx.volume)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, change, positive }: {
  icon: any; label: string; value: string; sub?: string; change?: string; positive?: boolean;
}) {
  return (
    <div className="np-admin-revenue-kpi">
      <div className="np-admin-revenue-kpi-icon"><Icon size={18} /></div>
      <div className="np-admin-revenue-kpi-body">
        <span className="np-admin-revenue-kpi-label">{label}</span>
        <strong className="np-admin-revenue-kpi-value">{value}</strong>
        {sub && <span className="np-admin-revenue-kpi-sub">{sub}</span>}
        {change && (
          <span className={`np-admin-revenue-kpi-change ${positive ? "positive" : ""}`}>
            {positive ? <ArrowUp size={12} /> : <ArrowDown size={12} />} {change}
          </span>
        )}
      </div>
    </div>
  );
}
