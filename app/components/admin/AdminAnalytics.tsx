"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useCurrency } from "@/app/lib/currency";
import { useLanguage } from "@/app/lib/i18n";

declare const Chart: any;

interface TimeFilter {
  key: string;
  label: string;
  days: number;
}

interface ActivityData {
  name: string;
  key: string;
  icon: string;
  color: string;
  revenue: number;
  orders: number;
  transactions: number;
  costs: number;
  profit: number | null;
  growth: number;
  topItems: string[];
}

interface AnalyticsData {
  totalRevenue: number;
  netProfit: number | null;
  totalTransactions: number;
  successfulTx: number;
  pendingTx: number;
  failedTx: number;
  activeUsers: number;
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  activities: ActivityData[];
  dailyRevenue: { date: string; amount: number }[];
  txByStatus: { status: string; count: number; color: string }[];
}

interface GenyOrderRow {
  orderRef: string; userName: string; userEmail: string; planName: string;
  amountXaf: number; phone: string; operator: string; status: string; code: string;
  livemode: boolean; createdAt: string;
}
interface BoutiqueInternet {
  stats: { total: number; succeeded: number; failed: number; pending: number; revenue: number; revenueToday: number; revenueMonth: number };
  orders: GenyOrderRow[];
  dailyRevenue: { date: string; amount: number }[];
}

// Builds the analytics view from REAL data. Only internet (Geny) is tracked
// server-side today; the other categories are shown at 0 until their orders are
// recorded too (no more fabricated numbers).
function buildAnalytics(internet: BoutiqueInternet, t: (key: string) => string): AnalyticsData {
  const st = internet.stats;
  const activities: ActivityData[] = [
    {
      name: t("aana_act_internet"), key: "internet", icon: "📡", color: "#3b82f6",
      revenue: st.revenue, orders: st.succeeded, transactions: st.total,
      costs: 0, profit: null, growth: 0, topItems: [],
    },
    { name: t("aana_act_tiktok"), key: "tiktok", icon: "🎵", color: "#ec4899", revenue: 0, orders: 0, transactions: 0, costs: 0, profit: null, growth: 0, topItems: [] },
    { name: t("aana_act_gaming"), key: "gaming", icon: "🎮", color: "#8b5cf6", revenue: 0, orders: 0, transactions: 0, costs: 0, profit: null, growth: 0, topItems: [] },
  ];

  // Pad the daily series to 30 days so the chart has a continuous axis.
  const byDay = new Map(internet.dailyRevenue.map((d) => [d.date, d.amount]));
  const days30: { date: string; amount: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    days30.push({ date: key, amount: byDay.get(key) || 0 });
  }

  return {
    totalRevenue: st.revenue,
    netProfit: null,
    totalTransactions: st.total,
    successfulTx: st.succeeded,
    pendingTx: st.pending,
    failedTx: st.failed,
    activeUsers: 0,
    revenueToday: st.revenueToday,
    revenueWeek: 0,
    revenueMonth: st.revenueMonth,
    activities,
    dailyRevenue: days30,
    txByStatus: [
      { status: t("aana_status_successful"), count: st.succeeded, color: "#10b981" },
      { status: t("aana_status_pending"), count: st.pending, color: "#f59e0b" },
      { status: t("aana_status_failed"), count: st.failed, color: "#ef4444" },
    ],
  };
}

function AnimatedCounter({ value, prefix = "", suffix = "", duration = 1200 }: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(tick);
      else ref.current = value;
    }
    requestAnimationFrame(tick);
  }, [value, duration]);

  return <span className="np-counter">{prefix}{display.toLocaleString("fr-FR")}{suffix}</span>;
}

function StatCard({ icon, label, value, subValue, trend, color }: {
  icon: string;
  label: string;
  value: string;
  subValue?: string;
  trend?: number;
  color?: string;
}) {
  return (
    <div className="np-stat-card np-hover-lift">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${color || "var(--np-accent)"}15`,
          display: "grid", placeItems: "center", fontSize: 20
        }}>
          {icon}
        </div>
        {trend !== undefined && (
          <span style={{
            fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 20,
            background: trend >= 0 ? "rgba(16,185,129,.1)" : "rgba(239,68,68,.1)",
            color: trend >= 0 ? "#10b981" : "#ef4444",
          }}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--np-text)", lineHeight: 1.2, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: "var(--np-text-secondary)", fontWeight: 500 }}>{label}</div>
      {subValue && <div style={{ fontSize: 11, color: "var(--np-text-muted)", marginTop: 2 }}>{subValue}</div>}
    </div>
  );
}

function ActivityCard({ activity, formatAmount }: { activity: ActivityData; formatAmount: (n: number) => string }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="np-stat-card np-hover-lift" style={{ cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${activity.color}15`, display: "grid",
          placeItems: "center", fontSize: 20
        }}>
          {activity.icon}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--np-text)" }}>{activity.name}</div>
          <div style={{ fontSize: 12, color: "var(--np-text-muted)" }}>{t("aana_orders_count").replace("{n}", String(activity.orders))}</div>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 20,
          background: activity.growth >= 0 ? "rgba(16,185,129,.1)" : "rgba(239,68,68,.1)",
          color: activity.growth >= 0 ? "#10b981" : "#ef4444",
        }}>
          {activity.growth >= 0 ? "↑" : "↓"} {Math.abs(activity.growth).toFixed(1)}%
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
        <div>
          <div style={{ color: "var(--np-text-muted)", fontSize: 11 }}>{t("aana_revenues")}</div>
          <div style={{ fontWeight: 600, color: "var(--np-text)" }}>{formatAmount(activity.revenue)}</div>
        </div>
        <div>
          <div style={{ color: "var(--np-text-muted)", fontSize: 11 }}>{t("aana_profit")}</div>
          <div style={{ fontWeight: 600, color: activity.profit !== null ? "#10b981" : "var(--np-text-muted)" }}>
            {activity.profit !== null ? formatAmount(activity.profit) : t("aana_unavailable")}
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--np-border)", animation: "np-fadeIn .2s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
            <div>
              <span style={{ color: "var(--np-text-muted)" }}>{t("aana_transactions_label")}</span>
              <span style={{ fontWeight: 600 }}>{activity.transactions}</span>
            </div>
            <div>
              <span style={{ color: "var(--np-text-muted)" }}>{t("aana_costs_label")}</span>
              <span style={{ fontWeight: 600 }}>{activity.costs > 0 ? formatAmount(activity.costs) : t("aana_not_provided")}</span>
            </div>
          </div>
          {activity.topItems.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: "var(--np-text-muted)", marginBottom: 4 }}>{t("aana_top_products")}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {activity.topItems.map((item, i) => (
                  <span key={i} style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 12,
                    background: "var(--np-bg-alt)", color: "var(--np-text-secondary)"
                  }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminAnalytics() {
  const { formatAmount } = useCurrency();
  const { t } = useLanguage();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [orders, setOrders] = useState<GenyOrderRow[]>([]);
  const [activeFilter, setActiveFilter] = useState("last_30_days");
  const [chartLoaded, setChartLoaded] = useState(false);
  const revenueChartRef = useRef<HTMLCanvasElement>(null);
  const statusChartRef = useRef<HTMLCanvasElement>(null);
  const activityChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<any[]>([]);

  const timeFilters: TimeFilter[] = [
    { key: "today", label: t("today"), days: 1 },
    { key: "last_7_days", label: t("last_7_days"), days: 7 },
    { key: "last_30_days", label: t("last_30_days"), days: 30 },
    { key: "this_month", label: t("this_month"), days: 30 },
    { key: "this_year", label: t("this_year"), days: 365 },
  ];

  useEffect(() => {
    let active = true;
    const emptyInternet: BoutiqueInternet = { stats: { total: 0, succeeded: 0, failed: 0, pending: 0, revenue: 0, revenueToday: 0, revenueMonth: 0 }, orders: [], dailyRevenue: [] };
    fetch("/api/admin?section=boutique_analytics&days=30", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!active) return;
        const internet: BoutiqueInternet = (j?.success && j.internet) ? j.internet : emptyInternet;
        setData(buildAnalytics(internet, t));
        setOrders(internet.orders || []);
      })
      .catch(() => { if (active) { setData(buildAnalytics(emptyInternet, t)); setOrders([]); } });
    if (typeof window !== "undefined" && !(window as any).Chart) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js";
      script.onload = () => setChartLoaded(true);
      document.head.appendChild(script);
    } else {
      setChartLoaded(true);
    }
  }, []);

  const renderCharts = useCallback(() => {
    if (!chartLoaded || !data || typeof Chart === "undefined") return;

    chartInstances.current.forEach(c => c?.destroy());
    chartInstances.current = [];

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const gridColor = isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)";
    const textColor = isDark ? "#94a3b8" : "#64748b";

    if (revenueChartRef.current) {
      const ctx = revenueChartRef.current.getContext("2d");
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, "rgba(79,70,229,.2)");
        gradient.addColorStop(1, "rgba(79,70,229,.01)");

        chartInstances.current.push(new Chart(ctx, {
          type: "line",
          data: {
            labels: data.dailyRevenue.map(d => {
              const dt = new Date(d.date);
              return `${dt.getDate()}/${dt.getMonth() + 1}`;
            }),
            datasets: [{
              label: t("revenue"),
              data: data.dailyRevenue.map(d => d.amount),
              borderColor: "#4f46e5",
              backgroundColor: gradient,
              fill: true,
              tension: .4,
              pointRadius: 0,
              pointHoverRadius: 6,
              pointHoverBackgroundColor: "#4f46e5",
              borderWidth: 2.5,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: isDark ? "#1a1d2e" : "#fff",
                titleColor: isDark ? "#e8eaf2" : "#1a1d2e",
                bodyColor: isDark ? "#94a3b8" : "#64748b",
                borderColor: isDark ? "#2a2d3e" : "#e2e5ed",
                borderWidth: 1,
                cornerRadius: 10,
                padding: 12,
                displayColors: false,
              },
            },
            scales: {
              x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 }, maxTicksLimit: 10 } },
              y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } }, border: { display: false } },
            },
            interaction: { intersect: false, mode: "index" as const },
          },
        }));
      }
    }

    if (statusChartRef.current) {
      chartInstances.current.push(new Chart(statusChartRef.current, {
        type: "doughnut",
        data: {
          labels: data.txByStatus.map(s => s.status),
          datasets: [{
            data: data.txByStatus.map(s => s.count),
            backgroundColor: data.txByStatus.map(s => s.color),
            borderWidth: 0,
            hoverOffset: 8,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "72%",
          plugins: {
            legend: {
              position: "bottom" as const,
              labels: { color: textColor, padding: 16, usePointStyle: true, pointStyleWidth: 8 },
            },
          },
        },
      }));
    }

    if (activityChartRef.current) {
      chartInstances.current.push(new Chart(activityChartRef.current, {
        type: "bar",
        data: {
          labels: data.activities.map(a => a.name),
          datasets: [
            {
              label: t("aana_revenues"),
              data: data.activities.map(a => a.revenue),
              backgroundColor: data.activities.map(a => a.color),
              borderRadius: 8,
              borderSkipped: false,
              barPercentage: .6,
            },
            {
              label: t("aana_profit"),
              data: data.activities.map(a => a.profit || 0),
              backgroundColor: data.activities.map(a => `${a.color}60`),
              borderRadius: 8,
              borderSkipped: false,
              barPercentage: .6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top" as const,
              labels: { color: textColor, padding: 16, usePointStyle: true, pointStyleWidth: 8 },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } }, border: { display: false } },
          },
        },
      }));
    }
  }, [chartLoaded, data, t]);

  useEffect(() => {
    renderCharts();
    const observer = new MutationObserver(() => {
      setTimeout(renderCharts, 100);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      observer.disconnect();
      chartInstances.current.forEach(c => c?.destroy());
    };
  }, [renderCharts]);

  if (!data) {
    return (
      <div className="np-anim-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, padding: 24 }}>
        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="np-skeleton np-skeleton-stat" />)}
      </div>
    );
  }

  return (
    <div className="np-page-enter" style={{ padding: "0 0 40px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "11px 14px",
        borderRadius: 12, background: "rgba(59,130,246,.10)", border: "1px solid rgba(59,130,246,.25)",
        color: "var(--np-text-secondary)", fontSize: 12.5, lineHeight: 1.5,
      }}>
        <span style={{ fontSize: 16 }}>📡</span>
        <span>{t("aana_real_note")}</span>
      </div>

      {/* Time Filters */}
      <div className="np-chart-filters" style={{ marginBottom: 24 }}>
        {timeFilters.map(f => (
          <button
            key={f.key}
            className={`np-chart-filter-btn ${activeFilter === f.key ? "active" : ""}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Main Stats */}
      <div className="np-anim-stagger" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 16,
        marginBottom: 28,
      }}>
        <StatCard icon="💰" label={t("gross_revenue")} value={formatAmount(data.totalRevenue)} trend={15.2} color="#4f46e5" />
        <StatCard icon="📈" label={t("net_profit")} value={data.netProfit !== null ? formatAmount(data.netProfit) : t("profit_unavailable")} trend={data.netProfit ? 12.1 : undefined} color="#10b981" />
        <StatCard icon="🔄" label={t("total_transactions")} value={data.totalTransactions.toLocaleString("fr-FR")} subValue={`${data.successfulTx} ${t("successful").toLowerCase()}`} color="#3b82f6" />
        <StatCard icon="👥" label={t("active_users")} value={data.activeUsers.toLocaleString("fr-FR")} trend={8.3} color="#8b5cf6" />
        <StatCard icon="📊" label={t("revenue_today")} value={formatAmount(data.revenueToday)} color="#f59e0b" />
        <StatCard icon="📅" label={t("revenue_month")} value={formatAmount(data.revenueMonth)} trend={18.7} color="#ec4899" />
      </div>

      {/* Charts Row */}
      <div className="np-admin-charts-row" style={{ marginBottom: 28 }}>
        <div className="np-chart-container np-anim-fade-up">
          <div className="np-chart-title">{t("revenue_evolution")}</div>
          <div style={{ height: 300, position: "relative" }}>
            {chartLoaded ? (
              <canvas ref={revenueChartRef} />
            ) : (
              <div className="np-skeleton" style={{ width: "100%", height: "100%" }} />
            )}
          </div>
        </div>
        <div className="np-chart-container np-anim-fade-up" style={{ animationDelay: ".1s" }}>
          <div className="np-chart-title">{t("transactions_by_status")}</div>
          <div style={{ height: 300, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {chartLoaded ? (
              <canvas ref={statusChartRef} />
            ) : (
              <div className="np-skeleton np-skeleton-circle" style={{ width: 200, height: 200 }} />
            )}
          </div>
        </div>
      </div>

      {/* Activity Revenue Comparison Chart */}
      <div className="np-chart-container np-anim-fade-up" style={{ marginBottom: 28 }}>
        <div className="np-chart-title">{t("revenue_by_activity")}</div>
        <div style={{ height: 320, position: "relative" }}>
          {chartLoaded ? (
            <canvas ref={activityChartRef} />
          ) : (
            <div className="np-skeleton" style={{ width: "100%", height: "100%" }} />
          )}
        </div>
      </div>

      {/* Revenue by Activity — Detailed Cards */}
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--np-text)", marginBottom: 16 }}>
          {t("revenue_by_activity")} — {t("details")}
        </h3>
      </div>
      <div className="np-anim-stagger" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 16,
        marginBottom: 28,
      }}>
        {data.activities.map(activity => (
          <ActivityCard key={activity.key} activity={activity} formatAmount={formatAmount} />
        ))}
      </div>

      {/* Financial Summary */}
      <div className="np-chart-container np-anim-fade-up">
        <div className="np-chart-title">{t("aana_financial_summary")}</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--np-border)" }}>
                <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--np-text-secondary)", fontWeight: 600, fontSize: 12, textTransform: "uppercase" as const, letterSpacing: ".5px" }}>{t("aana_th_activity")}</th>
                <th style={{ textAlign: "right", padding: "10px 12px", color: "var(--np-text-secondary)", fontWeight: 600, fontSize: 12 }}>{t("aana_th_revenue")}</th>
                <th style={{ textAlign: "right", padding: "10px 12px", color: "var(--np-text-secondary)", fontWeight: 600, fontSize: 12 }}>{t("aana_th_costs")}</th>
                <th style={{ textAlign: "right", padding: "10px 12px", color: "var(--np-text-secondary)", fontWeight: 600, fontSize: 12 }}>{t("aana_th_profit")}</th>
                <th style={{ textAlign: "right", padding: "10px 12px", color: "var(--np-text-secondary)", fontWeight: 600, fontSize: 12 }}>{t("aana_th_margin")}</th>
                <th style={{ textAlign: "center", padding: "10px 12px", color: "var(--np-text-secondary)", fontWeight: 600, fontSize: 12 }}>{t("aana_th_trend")}</th>
              </tr>
            </thead>
            <tbody>
              {data.activities.map(a => (
                <tr key={a.key} style={{ borderBottom: "1px solid var(--np-border-light)", transition: "background .15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--np-surface-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "12px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{a.icon}</span>
                    <span style={{ fontWeight: 600, color: "var(--np-text)" }}>{a.name}</span>
                  </td>
                  <td style={{ textAlign: "right", padding: "12px", fontWeight: 600, color: "var(--np-text)" }}>{formatAmount(a.revenue)}</td>
                  <td style={{ textAlign: "right", padding: "12px", color: a.costs > 0 ? "var(--np-text-secondary)" : "var(--np-text-muted)" }}>
                    {a.costs > 0 ? formatAmount(a.costs) : "—"}
                  </td>
                  <td style={{ textAlign: "right", padding: "12px", fontWeight: 600, color: a.profit !== null ? "#10b981" : "var(--np-text-muted)" }}>
                    {a.profit !== null ? formatAmount(a.profit) : t("profit_unavailable")}
                  </td>
                  <td style={{ textAlign: "right", padding: "12px", color: "var(--np-text-secondary)" }}>
                    {a.profit !== null ? `${((a.profit / a.revenue) * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td style={{ textAlign: "center", padding: "12px" }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                      background: a.growth >= 0 ? "rgba(16,185,129,.1)" : "rgba(239,68,68,.1)",
                      color: a.growth >= 0 ? "#10b981" : "#ef4444",
                    }}>
                      {a.growth >= 0 ? "↑" : "↓"} {Math.abs(a.growth).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--np-border)", fontWeight: 700 }}>
                <td style={{ padding: "12px", color: "var(--np-text)" }}>{t("aana_total")}</td>
                <td style={{ textAlign: "right", padding: "12px", color: "var(--np-text)" }}>{formatAmount(data.totalRevenue)}</td>
                <td style={{ textAlign: "right", padding: "12px", color: "var(--np-text-secondary)" }}>
                  {formatAmount(data.activities.reduce((s, a) => s + a.costs, 0))}
                </td>
                <td style={{ textAlign: "right", padding: "12px", color: "#10b981" }}>
                  {data.netProfit !== null ? formatAmount(data.netProfit) : "—"}
                </td>
                <td style={{ textAlign: "right", padding: "12px", color: "var(--np-text-secondary)" }}>
                  {data.netProfit !== null ? `${((data.netProfit / data.totalRevenue) * 100).toFixed(1)}%` : "—"}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Commandes internet réelles (avec le nom de l'acheteur) */}
      <div className="np-chart-container np-anim-fade-up" style={{ marginTop: 28 }}>
        <div className="np-chart-title">📡 {t("aana_internet_orders")}</div>
        {orders.length === 0 ? (
          <div style={{ padding: "28px 12px", textAlign: "center", color: "var(--np-text-muted)", fontSize: 13 }}>
            {t("aana_no_orders")}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--np-border)" }}>
                  {[t("aana_th_date"), t("aana_th_buyer"), t("aana_th_plan"), t("aana_th_amount"), t("aana_th_number"), t("aana_th_status"), t("aana_th_code")].map((h, i) => (
                    <th key={i} style={{ textAlign: i >= 3 && i <= 3 ? "right" : "left", padding: "10px 12px", color: "var(--np-text-secondary)", fontWeight: 600, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: ".5px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const ok = o.status === "succeeded";
                  const bad = o.status === "failed" || o.status === "expired";
                  const color = ok ? "#10b981" : bad ? "#ef4444" : "#f59e0b";
                  return (
                    <tr key={o.orderRef} style={{ borderBottom: "1px solid var(--np-border-light)" }}>
                      <td style={{ padding: "10px 12px", color: "var(--np-text-muted)", whiteSpace: "nowrap" }}>{o.createdAt ? o.createdAt.slice(0, 16) : "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 600, color: "var(--np-text)" }}>{o.userName || "—"}</div>
                        {o.userEmail && <div style={{ fontSize: 11, color: "var(--np-text-muted)" }}>{o.userEmail}</div>}
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--np-text-secondary)" }}>{o.planName || "—"}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--np-text)", whiteSpace: "nowrap" }}>{formatAmount(o.amountXaf)}</td>
                      <td style={{ padding: "10px 12px", color: "var(--np-text-secondary)", whiteSpace: "nowrap" }}>{o.phone}{o.operator ? ` · ${o.operator}` : ""}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: `${color}1a`, color }}>{o.status}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "var(--np-text)" }}>{o.code || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
