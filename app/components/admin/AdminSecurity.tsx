"use client";

import { useState } from "react";
import { Shield, Key, Fingerprint, Smartphone, Monitor, Lock, Unlock, Trash2, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Search } from "lucide-react";
import { useLanguage } from "@/app/lib/i18n";

export function AdminSecurity() {
  const { t } = useLanguage();
  const [userId, setUserId] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const formatDate = (d: string) => {
    if (!d) return "—";
    try {
      return new Date(d.replace(" ", "T") + (d.includes("Z") ? "" : "Z")).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return d; }
  };

  const fetchUser = async () => {
    if (!userId.trim()) return;
    setLoading(true);
    setMessage("");
    setError("");
    setData(null);
    try {
      const res = await fetch(`/api/admin?section=user_security&user_id=${encodeURIComponent(userId.trim())}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || t("asec_error"));
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const doAction = async (action: string, body: Record<string, any> = {}) => {
    if (!data?.user?.id) return;
    setActing(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, user_id: data.user.id, ...body }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || t("asec_error"));
      setMessage(json.message || t("asec_action_done"));
      fetchUser();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="np-admin-security">
      <div className="np-admin-security-search">
        <h3><Shield size={18} /> {t("asec_user_security")}</h3>
        <div className="np-admin-security-search-row">
          <input type="number" className="np-text-input" placeholder={t("asec_user_id_placeholder")} value={userId} onChange={(e) => setUserId(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchUser()} />
          <button className="np-primary-button" onClick={fetchUser} disabled={loading || !userId.trim()}>
            {loading ? <RefreshCw size={14} className="np-spin" /> : <Search size={14} />}
            <span>{t("asec_search")}</span>
          </button>
        </div>
      </div>

      {(message || error) && (
        <div className={`np-security-alert ${error ? "danger" : "success"}`}>
          {error ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{error || message}</span>
          <button onClick={() => { setMessage(""); setError(""); }}>×</button>
        </div>
      )}

      {data && (
        <div className="np-admin-security-detail">
          {/* User Identity */}
          <div className="np-admin-security-user-header">
            <div>
              <h4>{data.user.name}</h4>
              <p>{data.user.email} · {data.user.role} · {data.user.status}</p>
            </div>
            <span className={`np-badge ${data.user.status === "active" ? "success" : "danger"}`}>{data.user.status}</span>
          </div>

          {/* Security Status Grid */}
          <div className="np-admin-security-grid">
            <div className="np-admin-security-stat">
              <Lock size={18} />
              <div>
                <strong>{t("asec_pin_code")}</strong>
                <span className={data.hasPin ? "text-success" : "text-muted"}>
                  {data.hasPin ? (data.isPinLocked ? t("asec_locked") : t("asec_configured")) : t("asec_not_configured")}
                </span>
              </div>
              {data.hasPin && (
                <button className="np-btn-sm danger" disabled={acting} onClick={() => { if (confirm(t("asec_confirm_reset_pin"))) doAction("admin_reset_pin"); }}>
                  <Unlock size={12} /> {t("asec_reset")}
                </button>
              )}
            </div>

            <div className="np-admin-security-stat">
              <Key size={18} />
              <div>
                <strong>2FA</strong>
                <span className={data.twoFactorEnabled ? "text-success" : "text-muted"}>
                  {data.twoFactorEnabled ? t("asec_enabled") : t("asec_disabled")}
                </span>
              </div>
              {data.twoFactorEnabled && (
                <button className="np-btn-sm danger" disabled={acting} onClick={() => { if (confirm(t("asec_confirm_disable_2fa"))) doAction("admin_disable_2fa"); }}>
                  {t("asec_disable")}
                </button>
              )}
            </div>

            <div className="np-admin-security-stat">
              <Smartphone size={18} />
              <div>
                <strong>{t("asec_trusted_devices")}</strong>
                <span>{t("asec_devices_count").replace("{n}", String(data.trustedDeviceCount))}</span>
              </div>
              {data.trustedDeviceCount > 0 && (
                <button className="np-btn-sm danger" disabled={acting} onClick={() => { if (confirm(t("asec_confirm_clear_devices"))) doAction("admin_clear_trusted_devices"); }}>
                  <Trash2 size={12} /> {t("asec_clear")}
                </button>
              )}
            </div>

            <div className="np-admin-security-stat">
              <Fingerprint size={18} />
              <div>
                <strong>WebAuthn</strong>
                <span>{t("asec_credentials_count").replace("{n}", String(data.webauthnCredentialCount))}</span>
              </div>
              {data.webauthnCredentialCount > 0 && (
                <button className="np-btn-sm danger" disabled={acting} onClick={() => { if (confirm(t("asec_confirm_clear_webauthn"))) doAction("admin_clear_webauthn"); }}>
                  <Trash2 size={12} /> {t("asec_clear")}
                </button>
              )}
            </div>

            <div className="np-admin-security-stat">
              <Monitor size={18} />
              <div>
                <strong>{t("asec_active_sessions")}</strong>
                <span>{t("asec_sessions_count").replace("{n}", String(data.activeSessionCount))}</span>
              </div>
              {data.activeSessionCount > 0 && (
                <button className="np-btn-sm danger" disabled={acting} onClick={() => { if (confirm(t("asec_confirm_revoke_sessions"))) doAction("admin_revoke_all_sessions"); }}>
                  {t("asec_disconnect_all")}
                </button>
              )}
            </div>

            <div className="np-admin-security-stat">
              <CheckCircle2 size={18} />
              <div>
                <strong>{t("asec_email_verified")}</strong>
                <span className={data.emailVerified ? "text-success" : "text-muted"}>
                  {data.emailVerified ? t("asec_yes") : t("asec_no")}
                </span>
              </div>
            </div>
          </div>

          {/* Force Reset Password */}
          <div className="np-admin-security-actions">
            <h4><AlertTriangle size={16} /> {t("asec_admin_actions")}</h4>
            {!showPasswordForm ? (
              <button className="np-outline-button" onClick={() => setShowPasswordForm(true)}>
                <Key size={14} /> {t("asec_reset_password")}
              </button>
            ) : (
              <div className="np-admin-security-password-form">
                <input type="password" className="np-text-input" placeholder={t("asec_new_password_placeholder")} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={10} />
                <div className="np-admin-security-password-actions">
                  <button className="np-primary-button" disabled={acting || newPassword.length < 10} onClick={() => { if (confirm(t("asec_confirm_reset_password_user").replace("{n}", String(data.user.name)))) { doAction("admin_force_reset_password", { new_password: newPassword }); setNewPassword(""); setShowPasswordForm(false); } }}>
                    {t("asec_confirm_reset")}
                  </button>
                  <button className="np-outline-button" onClick={() => { setShowPasswordForm(false); setNewPassword(""); }}>{t("asec_cancel")}</button>
                </div>
              </div>
            )}
          </div>

          {/* Recent Login History */}
          {data.recentLogins && data.recentLogins.length > 0 && (
            <div className="np-admin-security-history">
              <h4><Monitor size={16} /> {t("asec_recent_logins")}</h4>
              <div className="np-admin-security-history-list">
                {data.recentLogins.map((h: any) => (
                  <div key={h.id} className={`np-admin-security-history-item ${h.status === "failed" ? "failed" : ""}`}>
                    {h.status === "success" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    <span>{h.method || "password"}</span>
                    <span>{h.device_name} · {h.browser} / {h.os}</span>
                    <span>{h.ip_address}</span>
                    <span>{formatDate(h.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
