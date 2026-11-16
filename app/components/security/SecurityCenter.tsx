"use client";

import { useEffect, useState, useCallback } from "react";
import { Shield, Smartphone, Key, Clock, Fingerprint, Monitor, Trash2, LogOut, AlertTriangle, CheckCircle2, XCircle, RefreshCw, ChevronRight } from "lucide-react";
import { useLanguage } from "@/app/lib/i18n";

interface SecurityData {
  hasPin: boolean;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  trustedDevices: any[];
  webauthnCredentials: any[];
  loginHistory: any[];
  activeSessions: any[];
  settings: {
    notification_email: number;
    notification_push: number;
    two_factor_auth: number;
    dark_mode: number;
    language: string;
  };
}

export function SecurityCenter() {
  const { t } = useLanguage();
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "devices" | "sessions" | "history">("overview");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/security?section=overview");
      const json = await res.json();
      if (json.success) setData(json);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const doAction = async (action: string, body: Record<string, any> = {}) => {
    setActing(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || t("sec_error_generic"));
      setMessage(json.message || t("sec_action_success"));
      fetchData();
    } catch (e: any) {
      setError(e.message || t("sec_error_generic"));
    } finally {
      setActing(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    try {
      return new Date(d.replace(" ", "T") + (d.includes("Z") ? "" : "Z")).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return d; }
  };

  const relativeTime = (d: string) => {
    if (!d) return "";
    try {
      const ms = Date.now() - new Date(d.replace(" ", "T") + (d.includes("Z") ? "" : "Z")).getTime();
      if (ms < 60_000) return t("sec_just_now");
      if (ms < 3_600_000) return t("sec_time_min_ago").replace("{n}", String(Math.floor(ms / 60_000)));
      if (ms < 86_400_000) return t("sec_time_hours_ago").replace("{n}", String(Math.floor(ms / 3_600_000)));
      return t("sec_time_days_ago").replace("{n}", String(Math.floor(ms / 86_400_000)));
    } catch { return ""; }
  };

  if (loading) return <div className="np-security-loading"><RefreshCw size={24} className="np-spin" /><span>{t("sec_loading")}</span></div>;
  if (!data) return <div className="np-security-error"><AlertTriangle size={24} /><p>{t("sec_load_error")}</p></div>;

  const securityScore = [data.hasPin, data.twoFactorEnabled, data.emailVerified, data.webauthnCredentials.length > 0].filter(Boolean).length;
  const scoreLabel = securityScore <= 1 ? t("sec_score_low") : securityScore <= 2 ? t("sec_score_medium") : securityScore <= 3 ? t("sec_score_good") : t("sec_score_excellent");
  const scoreColor = securityScore <= 1 ? "danger" : securityScore <= 2 ? "warning" : "success";

  return (
    <div className="np-security-center">
      {(message || error) && (
        <div className={`np-security-alert ${error ? "danger" : "success"}`}>
          {error ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{error || message}</span>
          <button onClick={() => { setMessage(""); setError(""); }}>×</button>
        </div>
      )}

      <div className="np-security-header">
        <div className="np-security-title-row">
          <Shield size={24} />
          <div>
            <h2>{t("sec_center_title")}</h2>
            <p>{t("sec_center_subtitle")}</p>
          </div>
        </div>
        <div className={`np-security-score ${scoreColor}`}>
          <div className="np-security-score-ring">
            <svg viewBox="0 0 36 36">
              <path className="np-score-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="np-score-fill" strokeDasharray={`${securityScore * 25}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span>{securityScore}/4</span>
          </div>
          <div className="np-security-score-label">{scoreLabel}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="np-security-tabs">
        {([["overview", t("sec_tab_overview"), Shield], ["devices", t("sec_tab_devices"), Smartphone], ["sessions", t("sec_tab_sessions"), Monitor], ["history", t("sec_tab_history"), Clock]] as const).map(([key, label, Icon]) => (
          <button key={key} className={`np-security-tab ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key as any)}>
            <Icon size={16} /><span>{label}</span>
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="np-security-grid">
          <div className="np-security-card">
            <div className="np-security-card-header">
              <Key size={20} />
              <h3>{t("sec_2fa_title")}</h3>
              <span className={`np-badge ${data.twoFactorEnabled ? "success" : "default"}`}>{data.twoFactorEnabled ? t("sec_enabled") : t("sec_disabled")}</span>
            </div>
            <p>{t("sec_2fa_desc")}</p>
            <button className={`np-security-btn ${data.twoFactorEnabled ? "danger" : "primary"}`} disabled={acting} onClick={() => doAction("toggle_2fa", { enable: !data.twoFactorEnabled })}>
              {data.twoFactorEnabled ? t("sec_2fa_disable") : t("sec_2fa_enable")}
            </button>
          </div>

          <div className="np-security-card">
            <div className="np-security-card-header">
              <Shield size={20} />
              <h3>{t("sec_pin_title")}</h3>
              <span className={`np-badge ${data.hasPin ? "success" : "default"}`}>{data.hasPin ? t("sec_configured") : t("sec_not_configured")}</span>
            </div>
            <p>{t("sec_pin_desc")}</p>
            <a href="/settings" className="np-security-link">{t("sec_pin_manage")} <ChevronRight size={14} /></a>
          </div>

          <div className="np-security-card">
            <div className="np-security-card-header">
              <Fingerprint size={20} />
              <h3>{t("sec_biometric_title")}</h3>
              <span className={`np-badge ${data.webauthnCredentials.length > 0 ? "success" : "default"}`}>
                {data.webauthnCredentials.length > 0 ? t("sec_devices_count").replace("{n}", String(data.webauthnCredentials.length)) : t("sec_not_configured_fem")}
              </span>
            </div>
            <p>{t("sec_biometric_desc")}</p>
            {data.webauthnCredentials.length > 0 && (
              <div className="np-security-items-compact">
                {data.webauthnCredentials.map((c: any) => (
                  <div key={c.id} className="np-security-item-row">
                    <Fingerprint size={14} />
                    <span>{c.name}</span>
                    <small>{formatDate(c.created_at)}</small>
                    <button className="np-icon-btn danger" title={t("sec_delete")} disabled={acting} onClick={() => { if (confirm(t("sec_confirm_delete_biometric"))) doAction("delete_webauthn_credential", { credential_id: c.id }); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="np-security-card">
            <div className="np-security-card-header">
              <CheckCircle2 size={20} />
              <h3>{t("sec_email_title")}</h3>
              <span className={`np-badge ${data.emailVerified ? "success" : "warning"}`}>{data.emailVerified ? t("sec_verified") : t("sec_not_verified")}</span>
            </div>
            <p>{t("sec_email_desc")}</p>
          </div>

          {/* Notification Preferences */}
          <div className="np-security-card np-security-card-wide">
            <div className="np-security-card-header">
              <AlertTriangle size={20} />
              <h3>{t("sec_notif_prefs_title")}</h3>
            </div>
            <div className="np-security-toggles">
              <label className="np-security-toggle-row">
                <div>
                  <strong>{t("sec_notif_email_title")}</strong>
                  <small>{t("sec_notif_email_desc")}</small>
                </div>
                <div className="np-toggle">
                  <input type="checkbox" checked={!!data.settings.notification_email} onChange={(e) => doAction("update_settings", { notification_email: e.target.checked })} />
                  <span className="np-toggle-slider" />
                </div>
              </label>
              <label className="np-security-toggle-row">
                <div>
                  <strong>{t("sec_notif_push_title")}</strong>
                  <small>{t("sec_notif_push_desc")}</small>
                </div>
                <div className="np-toggle">
                  <input type="checkbox" checked={!!data.settings.notification_push} onChange={(e) => doAction("update_settings", { notification_push: e.target.checked })} />
                  <span className="np-toggle-slider" />
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Trusted Devices */}
      {activeTab === "devices" && (
        <div className="np-security-section">
          <div className="np-security-section-header">
            <div><h3>{t("sec_trusted_title")}</h3><p>{t("sec_trusted_desc")}</p></div>
            {data.trustedDevices.length > 1 && (
              <button className="np-security-btn danger" disabled={acting} onClick={() => { if (confirm(t("sec_confirm_remove_all_devices"))) doAction("remove_all_trusted_devices"); }}>
                <Trash2 size={14} /> {t("sec_remove_all")}
              </button>
            )}
          </div>
          {data.trustedDevices.length === 0 ? (
            <div className="np-security-empty">
              <Smartphone size={40} />
              <p>{t("sec_no_trusted_devices")}</p>
              <small>{t("sec_no_trusted_devices_hint")}</small>
            </div>
          ) : (
            <div className="np-security-device-list">
              {data.trustedDevices.map((d: any) => (
                <div key={d.id} className="np-security-device-card">
                  <div className="np-security-device-icon">
                    <Smartphone size={20} />
                  </div>
                  <div className="np-security-device-info">
                    <strong>{d.device_name || t("sec_unknown_device")}</strong>
                    <div className="np-security-device-meta">
                      {d.browser && <span>{d.browser}</span>}
                      {d.os && <span>{d.os}</span>}
                      {d.ip_address && <span>IP: {d.ip_address}</span>}
                    </div>
                    <small>{t("sec_last_used")} {relativeTime(d.last_used_at)}</small>
                  </div>
                  <button className="np-icon-btn danger" title={t("sec_delete")} disabled={acting} onClick={() => { if (confirm(t("sec_confirm_delete_device"))) doAction("remove_trusted_device", { device_id: d.id }); }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="np-security-info-box">
            <Shield size={16} />
            <p>{t("sec_devices_info")}</p>
          </div>
        </div>
      )}

      {/* Active Sessions */}
      {activeTab === "sessions" && (
        <div className="np-security-section">
          <div className="np-security-section-header">
            <div><h3>{t("sec_sessions_title")}</h3><p>{t("sec_sessions_desc")}</p></div>
          </div>
          {data.activeSessions.length === 0 ? (
            <div className="np-security-empty">
              <Monitor size={40} />
              <p>{t("sec_no_sessions")}</p>
            </div>
          ) : (
            <div className="np-security-device-list">
              {data.activeSessions.map((s: any, i: number) => (
                <div key={s.id} className="np-security-device-card">
                  <div className="np-security-device-icon">
                    <Monitor size={20} />
                  </div>
                  <div className="np-security-device-info">
                    <div className="np-security-device-name-row">
                      <strong>{s.device || t("sec_device")} — {s.browser || t("sec_browser")}</strong>
                      {i === 0 && <span className="np-badge success">{t("sec_current_session")}</span>}
                    </div>
                    <div className="np-security-device-meta">
                      {s.ip_address && <span>IP: {s.ip_address}</span>}
                      <span>{t("sec_connected")} {relativeTime(s.created_at)}</span>
                    </div>
                  </div>
                  {i > 0 && (
                    <button className="np-icon-btn danger" title={t("sec_revoke")} disabled={acting} onClick={() => doAction("revoke_session", { session_id: s.id })}>
                      <LogOut size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Login History */}
      {activeTab === "history" && (
        <div className="np-security-section">
          <div className="np-security-section-header">
            <div><h3>{t("sec_history_title")}</h3><p>{t("sec_history_desc")}</p></div>
          </div>
          {data.loginHistory.length === 0 ? (
            <div className="np-security-empty">
              <Clock size={40} />
              <p>{t("sec_no_history")}</p>
            </div>
          ) : (
            <div className="np-security-history-list">
              {data.loginHistory.map((h: any) => (
                <div key={h.id} className={`np-security-history-item ${h.status === "failed" ? "failed" : ""}`}>
                  <div className="np-security-history-status">
                    {h.status === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  </div>
                  <div className="np-security-history-info">
                    <strong>{h.method === "biometric" ? t("sec_method_biometric") : h.method === "pin" ? t("sec_method_pin") : t("sec_method_password")}</strong>
                    <div className="np-security-device-meta">
                      <span>{h.device_name}</span>
                      <span>{h.browser} / {h.os}</span>
                      {h.ip_address && <span>IP: {h.ip_address}</span>}
                    </div>
                    {h.failure_reason && <small className="np-security-failure">{h.failure_reason}</small>}
                  </div>
                  <div className="np-security-history-time">
                    {relativeTime(h.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
