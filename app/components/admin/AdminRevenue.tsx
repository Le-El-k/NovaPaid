"use client";

import { useEffect, useState } from "react";
import {
  Activity, ArrowDown, ArrowUp, CreditCard, DollarSign, Loader2,
  RefreshCw, TrendingUp, Users, Wallet, AlertTriangle, Clock, Shield,
} from "lucide-react";

export function AdminRevenue() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin?section=revenue");
      const json = await res.json();
      if (json.success) setStats(json.stats);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const fmtXaf = (minor: number) => `${Math.round(minor / 100).toLocaleString("fr-FR")} FCFA`;

  if (loading || !stats) {
    return (
      <div className="np-admin-revenue-loading">
        <Loader2 size={20} className="animate-spin" />
        <span>Chargement des statistiques...</span>
      </div>
    );
  }

  return (
    <div className="np-admin-revenue">
      <div className="np-admin-revenue-header">
        <h3>Tableau de bord financier</h3>
        <button type="button" className="np-admin-fees-refresh" onClick={fetchStats}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* KPI Grid */}
      <div className="np-admin-revenue-kpi-grid">
        <KpiCard icon={Users} label="Utilisateurs" value={fmt(stats.users.total)}
          sub={`${fmt(stats.users.active)} actifs`}
          change={`+${fmt(stats.users.newToday)} aujourd'hui`} positive />
        <KpiCard icon={CreditCard} label="Cartes" value={fmt(stats.cards.total)}
          sub={`${fmt(stats.cards.active)} actives`} />
        <KpiCard icon={Activity} label="Transactions" value={fmt(stats.transactions.total)}
          sub={`${fmt(stats.transactions.today)} aujourd'hui`}
          change={`${fmt(stats.transactions.week)} cette semaine`} positive />
        <KpiCard icon={Wallet} label="Solde total wallets" value={fmtXaf(stats.walletBalance)} />
        <KpiCard icon={TrendingUp} label="Volume total" value={fmtXaf(stats.volume.total)}
          sub={`${fmtXaf(stats.volume.today)} aujourd'hui`}
          change={`${fmtXaf(stats.volume.week)} cette semaine`} positive />
        <KpiCard icon={DollarSign} label="Nouveaux ce mois" value={fmt(stats.users.newMonth)}
          sub={`${fmt(stats.users.newWeek)} cette semaine`} />
      </div>

      {/* Pending alerts */}
      <div className="np-admin-revenue-alerts">
        {stats.pending.approvals > 0 && (
          <div className="np-admin-revenue-alert warning">
            <Clock size={16} />
            <span><strong>{stats.pending.approvals}</strong> approbations en attente</span>
          </div>
        )}
        {stats.pending.kyc > 0 && (
          <div className="np-admin-revenue-alert info">
            <Shield size={16} />
            <span><strong>{stats.pending.kyc}</strong> vérifications KYC en attente</span>
          </div>
        )}
        {stats.pending.tickets > 0 && (
          <div className="np-admin-revenue-alert danger">
            <AlertTriangle size={16} />
            <span><strong>{stats.pending.tickets}</strong> tickets support ouverts</span>
          </div>
        )}
      </div>

      {/* Daily volume chart (simple bar chart) */}
      {stats.dailyVolume && stats.dailyVolume.length > 0 && (
        <div className="np-admin-revenue-chart-section">
          <h4>Volume journalier (7 derniers jours)</h4>
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
          <h4>Répartition par type</h4>
          <div className="np-admin-revenue-breakdown">
            {stats.typeBreakdown.map((t: any) => (
              <div key={t.type} className="np-admin-revenue-breakdown-row">
                <span className="np-admin-revenue-breakdown-type">{t.type || "Autre"}</span>
                <span className="np-admin-revenue-breakdown-count">{fmt(t.count)} tx</span>
                <span className="np-admin-revenue-breakdown-vol">{fmtXaf(t.volume)}</span>
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
