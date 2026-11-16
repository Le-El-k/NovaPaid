"use client";

import { useEffect, useState } from "react";
import {
  Activity, Clock, Filter, Loader2, RefreshCw, Search, User,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useLanguage } from "@/app/lib/i18n";

export function AdminActivities() {
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const perPage = 50;

  const refresh = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ section: "activities", page: String(page), limit: String(perPage) });
      if (filterType) params.set("type", filterType);
      if (filterUser) params.set("user_id", filterUser);
      const res = await fetch(`/api/admin?${params}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.activities || []);
        setTotal(json.total || 0);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [page, filterType]);

  const typeColors: Record<string, string> = {
    login: "#3b82f6", logout: "#6b7280", transfer: "#8b5cf6",
    card_create: "#10b981", card_reload: "#06b6d4", deposit: "#22c55e",
    withdrawal: "#f59e0b", kyc: "#ec4899", admin: "#ef4444",
    settings: "#6366f1", support: "#f97316",
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="np-admin-activities">
      <div className="np-admin-fees-header">
        <h3>{t("aact_title")}</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select className="np-text-input" style={{ width: 160, fontSize: 12 }} value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1); }}>
            <option value="">{t("aact_type_all")}</option>
            <option value="login">{t("aact_type_login")}</option>
            <option value="logout">{t("aact_type_logout")}</option>
            <option value="transfer">{t("aact_type_transfer")}</option>
            <option value="card_create">{t("aact_type_card_create")}</option>
            <option value="card_reload">{t("aact_type_card_reload")}</option>
            <option value="deposit">{t("aact_type_deposit")}</option>
            <option value="withdrawal">{t("aact_type_withdrawal")}</option>
            <option value="kyc">KYC</option>
            <option value="admin">Admin</option>
            <option value="settings">{t("aact_type_settings")}</option>
          </select>
          <button type="button" className="np-admin-fees-refresh" onClick={refresh}><RefreshCw size={14} /></button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: "center", opacity: 0.5, display: "flex", gap: 8, justifyContent: "center" }}>
          <Loader2 size={16} className="animate-spin" /> {t("aact_loading")}
        </div>
      ) : (
        <>
          <div className="np-admin-fees-table-wrap">
            <table className="np-admin-fees-table">
              <thead>
                <tr>
                  <th>{t("aact_col_date")}</th>
                  <th>{t("aact_col_type")}</th>
                  <th>{t("aact_col_user")}</th>
                  <th>{t("aact_col_description")}</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={5} className="np-admin-fees-empty">{t("aact_empty")}</td></tr>
                )}
                {items.map((item: any, i: number) => (
                  <tr key={item.id || i}>
                    <td style={{ whiteSpace: "nowrap", fontSize: 11 }}>
                      <Clock size={11} style={{ marginRight: 4, opacity: 0.4 }} />
                      {new Date(item.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td>
                      <span className="np-admin-fees-badge" style={{ borderColor: typeColors[item.activity_type] || "#6b7280", color: typeColors[item.activity_type] || "#6b7280" }}>
                        {item.activity_type || "—"}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {item.user_name || item.user_id || t("aact_system")}
                    </td>
                    <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>
                      {item.description || "—"}
                    </td>
                    <td style={{ fontSize: 11, opacity: 0.5, fontFamily: "monospace" }}>
                      {item.ip_address || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, padding: "12px 0" }}>
              <button type="button" className="np-secondary-button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: "4px 8px" }}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 12, opacity: 0.6 }}>{t("aact_pagination").replace("{n}", String(page)).replace("{m}", String(totalPages)).replace("{c}", String(total))}</span>
              <button type="button" className="np-secondary-button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: "4px 8px" }}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
