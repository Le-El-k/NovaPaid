"use client";

import { useEffect, useState } from "react";
import { Check, Globe, LockKeyhole, Moon, Palette, Save, ShieldCheck, User } from "lucide-react";
import { LanguageSelector, useLanguage } from "@/app/lib/i18n";
import { ThemeToggleButton } from "@/app/lib/theme";

interface SettingsProfile {
  name: string;
  email: string;
  phone: string | null;
  role: string;
  kycStatus: string;
  hasPin?: boolean;
}

export function SettingsSection({
  user,
  onProfileUpdated,
  onOpenSupport,
}: {
  user: SettingsProfile;
  onProfileUpdated?: (profile: SettingsProfile) => void;
  onOpenSupport?: () => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNext, setPasswordNext] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycMessage, setKycMessage] = useState("");
  const [kycDocType, setKycDocType] = useState("identity_card");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [hasPin, setHasPin] = useState(Boolean(user.hasPin));
  const [pinValue, setPinValue] = useState("");
  const [pinPassword, setPinPassword] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const [pinMessage, setPinMessage] = useState("");
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    setName(user.name);
    setPhone(user.phone || "");
    setHasPin(Boolean(user.hasPin));
  }, [user.name, user.phone]);

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPin(true);
    setPinMessage("");
    setPinError("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_pin", currentPassword: pinPassword, pin: pinValue }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || t("set_pin_save_failed"));
      setHasPin(true);
      setPinValue("");
      setPinPassword("");
      setPinMessage(t("set_pin_configured"));
    } catch (err: any) {
      setPinError(err?.message || t("set_pin_config_error"));
    } finally {
      setSavingPin(false);
    }
  };

  const handleRemovePin = async () => {
    const pwd = window.prompt(t("set_pin_remove_prompt"));
    if (!pwd) return;
    setSavingPin(true);
    setPinMessage("");
    setPinError("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_pin", currentPassword: pwd }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || t("set_remove_failed"));
      setHasPin(false);
      setPinMessage(t("set_pin_removed"));
    } catch (err: any) {
      setPinError(err?.message || t("set_pin_remove_error"));
    } finally {
      setSavingPin(false);
    }
  };

  const handleSubmitKyc = async () => {
    setKycSubmitting(true);
    setKycMessage("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_kyc", documentType: kycDocType }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || t("set_request_failed"));
      setKycMessage(t("set_kyc_submitted"));
    } catch (error: any) {
      setKycMessage(t("set_error_prefix") + (error?.message || t("set_request_failed")));
    } finally {
      setKycSubmitting(false);
    }
  };

  const kycStatus = {
    approved: { label: t("set_kyc_approved"), style: "success" },
    pending: { label: t("set_kyc_pending"), style: "warning" },
    under_review: { label: t("set_kyc_under_review"), style: "warning" },
    rejected: { label: t("set_kyc_rejected"), style: "danger" },
    not_started: { label: t("set_kyc_not_started"), style: "default" },
  }[user.kycStatus] || { label: user.kycStatus, style: "default" };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_profile", name, phone, currentPassword }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success || !data.profile) throw new Error(data?.error || t("set_save_failed"));
      const updated = { ...data.profile, role: user.role } as SettingsProfile;
      setName(updated.name);
      setPhone(updated.phone || "");
      setCurrentPassword("");
      onProfileUpdated?.(updated);
      setMessage(t("set_profile_saved"));
    } catch (cause: any) {
      setError(cause?.message || t("set_save_failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeOtherSessions = async () => {
    setRevoking(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke_other_sessions" }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.error || t("set_sessions_close_failed"));
      setMessage(data.revokedCount ? t("set_sessions_closed").replace("{n}", String(data.revokedCount)) : t("set_no_other_session"));
    } catch (cause: any) {
      setError(cause?.message || t("set_sessions_close_failed"));
    } finally {
      setRevoking(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");
    if (passwordNext.length < 10 || passwordNext.length > 200) {
      setPasswordError(t("set_pwd_length_rule"));
      return;
    }
    if (passwordNext !== passwordConfirm) {
      setPasswordError(t("set_pwd_mismatch"));
      return;
    }
    setChangingPassword(true);
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_password", currentPassword: passwordCurrent, newPassword: passwordNext }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.error || t("set_pwd_change_failed"));
      setPasswordCurrent("");
      setPasswordNext("");
      setPasswordConfirm("");
      setPasswordMessage(t("set_pwd_changed").replace("{n}", String(data.revokedCount || 0)));
    } catch (cause: any) {
      setPasswordError(cause?.message || t("set_pwd_change_failed"));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="np-settings-view-container">
      <section className="np-panel np-profile-overview-card">
        <div className="np-profile-avatar-large"><span>{name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span></div>
        <div className="np-profile-overview-info">
          <div className="np-profile-name-row">
            <h2>{name}</h2>
            <span className={`np-badge ${kycStatus.style}`}><ShieldCheck size={14} /> {kycStatus.label}</span>
          </div>
          <p className="np-profile-sub">{user.email} · {t("set_wallet_in_xaf")}</p>
          <div className="np-kyc-perks-row"><span>{user.role === "customer" ? t("set_account_customer") : t("set_account_prefix") + user.role}</span><span>{t("set_dossier_status")} {kycStatus.label}</span></div>
        </div>
      </section>

      <section className="np-panel np-settings-card np-preferences-card">
        <div className="np-panel-heading">
          <div><span className="np-overline">{t("set_preferences")}</span><h3>{t("set_appearance_language")}</h3></div>
          <Palette size={18} className="np-icon-accent" />
        </div>
        <div className="np-pref-row">
          <div className="np-pref-item">
            <span className="np-pref-label"><Moon size={15} className="np-pref-icon" />{t("set_theme")}</span>
            <ThemeToggleButton />
          </div>
          <div className="np-pref-item">
            <span className="np-pref-label"><Globe size={15} className="np-pref-icon" />{t("set_language")}</span>
            <LanguageSelector />
          </div>
        </div>
      </section>

      <section className="np-panel np-settings-card np-account-data-compact">
        <div className="np-panel-heading">
          <div><span className="np-overline">{t("set_account_data")}</span><h3>{t("set_personal_info")}</h3></div>
          <User size={18} className="np-icon-accent" />
        </div>
        <form onSubmit={handleSaveProfile} className="np-settings-form np-compact-form">
          <div className="np-form-row-grid">
            <div className="np-form-group">
              <label className="np-form-label" htmlFor="profile-name">{t("set_full_name")}</label>
              <input id="profile-name" type="text" className="np-text-input" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="np-form-group">
              <label className="np-form-label" htmlFor="profile-email">{t("set_email")}</label>
              <input id="profile-email" type="email" className="np-text-input" value={user.email} readOnly />
              <small className="np-form-hint">{t("set_not_editable")}</small>
            </div>
            <div className="np-form-group">
              <label className="np-form-label" htmlFor="profile-phone">{t("set_phone")}</label>
              <input id="profile-phone" type="tel" className="np-text-input" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
            {phone !== (user.phone || "") && (
              <div className="np-form-group">
                <label className="np-form-label" htmlFor="profile-current-password">{t("set_current_password")}</label>
                <input id="profile-current-password" type="password" className="np-text-input" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required />
              </div>
            )}
          </div>
          <div className="np-compact-form-actions">
            <button type="submit" className="np-primary-button np-save-btn" disabled={saving}>
              {saving ? <><Save size={16} /><span>{t("set_saving")}</span></> : <><Check size={16} /><span>{t("set_save")}</span></>}
            </button>
            {message && <p role="status" className="np-msg-success">{message}</p>}
            {error && <p role="alert" className="np-msg-error">{error}</p>}
          </div>
        </form>
      </section>

      <div className="np-settings-columns">
        <div className="np-settings-col">
          <section className="np-panel np-settings-card">
            <div className="np-panel-heading">
              <div>
                <span className="np-overline">{t("set_quick_lock")}</span>
                <h3>{t("set_pin_title")}</h3>
              </div>
              <span className={"np-badge " + (hasPin ? "success" : "default")}>
                {hasPin ? t("set_enabled") : t("set_not_configured")}
              </span>
            </div>
            <p className="np-form-hint">
              {t("set_pin_hint")}
            </p>
            {hasPin ? (
              <div className="np-pin-active-row">
                <div className="np-pin-active-label">
                  <strong>{t("set_pin_active")}</strong> (••••)
                </div>
                <button type="button" className="np-btn-sm danger" onClick={handleRemovePin} disabled={savingPin}>
                  {t("set_disable")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSavePin} className="np-settings-form mt-3">
                <div className="np-form-group">
                  <label className="np-form-label">{t("set_new_pin")}</label>
                  <input type="password" maxLength={4} pattern="\d{4}" inputMode="numeric" className="np-text-input" style={{ letterSpacing: "8px", fontWeight: "bold", fontSize: "16px" }} placeholder="••••" value={pinValue} onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))} required />
                </div>
                <div className="np-form-group">
                  <label className="np-form-label">{t("set_current_password")}</label>
                  <input type="password" className="np-text-input" value={pinPassword} onChange={(e) => setPinPassword(e.target.value)} required />
                </div>
                <button type="submit" className="np-outline-button" disabled={savingPin || pinValue.length !== 4}>
                  {savingPin ? t("set_saving") : t("set_enable_pin")}
                </button>
              </form>
            )}
            {pinMessage && <p className="np-msg-success">{pinMessage}</p>}
            {pinError && <p className="np-msg-error">{pinError}</p>}
          </section>
        </div>

        <div className="np-settings-col">
          <section className="np-panel np-settings-card">
            <div className="np-panel-heading"><div><span className="np-overline">{t("set_credentials")}</span><h3>{t("set_change_password")}</h3></div><LockKeyhole size={18} className="np-icon-accent" /></div>
            <form onSubmit={handleChangePassword} className="np-settings-form">
              <div className="np-form-group"><label className="np-form-label" htmlFor="password-current">{t("set_current_password")}</label><input id="password-current" className="np-text-input" type="password" autoComplete="current-password" value={passwordCurrent} onChange={(event) => setPasswordCurrent(event.target.value)} required /></div>
              <div className="np-form-group"><label className="np-form-label" htmlFor="password-next">{t("set_new_password")}</label><input id="password-next" className="np-text-input" type="password" autoComplete="new-password" minLength={10} maxLength={200} value={passwordNext} onChange={(event) => setPasswordNext(event.target.value)} required /><small className="np-form-hint">{t("set_min_10_chars")}</small></div>
              <div className="np-form-group"><label className="np-form-label" htmlFor="password-confirm">{t("set_confirm")}</label><input id="password-confirm" className="np-text-input" type="password" autoComplete="new-password" minLength={10} maxLength={200} value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} required /></div>
              <button type="submit" className="np-outline-button" disabled={changingPassword}>{changingPassword ? t("set_modifying") : t("set_change_password_btn")}</button>
              {passwordMessage && <p role="status" className="np-msg-success">{passwordMessage}</p>}
              {passwordError && <p role="alert" className="np-msg-error">{passwordError}</p>}
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
