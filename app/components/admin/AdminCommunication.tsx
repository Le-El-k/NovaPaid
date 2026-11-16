"use client";

import { useState, useEffect } from "react";
import { Bell, Mail, Settings, Send, Trash2, Plus, RefreshCw, CheckCircle2, XCircle, Users } from "lucide-react";
import { useLanguage } from "@/app/lib/i18n";

type CommTab = "announcements" | "campaigns" | "email_config";

export function AdminCommunication() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<CommTab>("announcements");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);

  // Announcements
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annMsg, setAnnMsg] = useState("");
  const [annTarget, setAnnTarget] = useState("all");
  const [showAnnForm, setShowAnnForm] = useState(false);

  // Campaigns
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campSubject, setCampSubject] = useState("");
  const [campMsg, setCampMsg] = useState("");
  const [showCampForm, setShowCampForm] = useState(false);

  // Email settings
  const [emailSettings, setEmailSettings] = useState<any[]>([]);
  const [emailForm, setEmailForm] = useState<any>(null);

  const clearAlert = () => { setMessage(""); setError(""); };

  const fetchTab = async (tx?: CommTab) => {
    const current = tx || tab;
    try {
      if (current === "announcements") {
        const res = await fetch("/api/admin?section=push_announcements");
        const j = await res.json();
        if (j.success) setAnnouncements(j.announcements || []);
      } else if (current === "campaigns") {
        const res = await fetch("/api/admin?section=email_campaigns");
        const j = await res.json();
        if (j.success) setCampaigns(j.campaigns || []);
      } else {
        const res = await fetch("/api/admin?section=email_settings");
        const j = await res.json();
        if (j.success) setEmailSettings(j.settings || []);
      }
    } catch {}
  };

  useEffect(() => { fetchTab(); }, [tab]);

  const doAction = async (action: string, body: Record<string, any> = {}) => {
    setActing(true); clearAlert();
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...body }) });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || t("acom_error"));
      setMessage(j.message || t("acom_action_done"));
      fetchTab();
    } catch (e: any) { setError(e.message); }
    finally { setActing(false); }
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    try { return new Date(d.replace(" ", "T") + (d.includes("Z") ? "" : "Z")).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return d; }
  };

  return (
    <div className="np-admin-comm">
      <div className="np-admin-comm-tabs">
        <button className={`np-admin-comm-tab ${tab === "announcements" ? "active" : ""}`} onClick={() => setTab("announcements")}><Bell size={14} /> {t("acom_tab_announcements")}</button>
        <button className={`np-admin-comm-tab ${tab === "campaigns" ? "active" : ""}`} onClick={() => setTab("campaigns")}><Mail size={14} /> {t("acom_tab_campaigns")}</button>
        <button className={`np-admin-comm-tab ${tab === "email_config" ? "active" : ""}`} onClick={() => setTab("email_config")}><Settings size={14} /> {t("acom_tab_email_config")}</button>
      </div>

      {(message || error) && (
        <div className={`np-security-alert ${error ? "danger" : "success"}`}>
          {error ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{error || message}</span>
          <button onClick={clearAlert}>×</button>
        </div>
      )}

      {tab === "announcements" && (
        <div className="np-admin-comm-section">
          <div className="np-admin-comm-header">
            <h3><Bell size={18} /> {t("acom_announcements_push")}</h3>
            <button className="np-primary-button" onClick={() => setShowAnnForm(!showAnnForm)}><Plus size={14} /> {t("acom_new")}</button>
          </div>
          {showAnnForm && (
            <div className="np-admin-comm-form">
              <input className="np-text-input" placeholder={t("acom_ph_title")} value={annTitle} onChange={e => setAnnTitle(e.target.value)} />
              <textarea className="np-text-input" placeholder={t("acom_ph_message")} rows={3} value={annMsg} onChange={e => setAnnMsg(e.target.value)} />
              <select className="np-text-input" value={annTarget} onChange={e => setAnnTarget(e.target.value)}>
                <option value="all">{t("acom_target_all")}</option>
                <option value="verified">{t("acom_target_verified")}</option>
                <option value="with_cards">{t("acom_target_with_cards")}</option>
                <option value="active">{t("acom_target_active")}</option>
              </select>
              <div className="np-admin-comm-form-actions">
                <button className="np-primary-button" disabled={acting || !annTitle.trim() || !annMsg.trim()} onClick={() => { doAction("create_announcement", { title: annTitle, message: annMsg, target_audience: annTarget }); setAnnTitle(""); setAnnMsg(""); setShowAnnForm(false); }}>
                  <Send size={14} /> {t("acom_create_send")}
                </button>
                <button className="np-outline-button" onClick={() => setShowAnnForm(false)}>{t("acom_cancel")}</button>
              </div>
            </div>
          )}
          <div className="np-admin-comm-list">
            {announcements.length === 0 && <p className="np-admin-comm-empty">{t("acom_no_announcement")}</p>}
            {announcements.map((a: any) => (
              <div key={a.id} className="np-admin-comm-item">
                <div className="np-admin-comm-item-info">
                  <strong>{a.title}</strong>
                  <p>{a.message}</p>
                  <small><Users size={10} /> {a.target_audience || "all"} · <span className={`np-badge ${a.status === "sent" ? "success" : ""}`}>{a.status}</span> · {t("acom_sent_count").replace("{n}", String(a.sent_count))} · {formatDate(a.created_at)}</small>
                </div>
                <div className="np-admin-comm-item-actions">
                  {a.status === "draft" && <button className="np-btn-sm" disabled={acting} onClick={() => doAction("send_announcement", { id: a.id })}><Send size={12} /></button>}
                  <button className="np-btn-sm danger" disabled={acting} onClick={() => { if (confirm(t("acom_confirm_delete_announcement"))) doAction("delete_announcement", { id: a.id }); }}><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "campaigns" && (
        <div className="np-admin-comm-section">
          <div className="np-admin-comm-header">
            <h3><Mail size={18} /> {t("acom_campaigns_email")}</h3>
            <button className="np-primary-button" onClick={() => setShowCampForm(!showCampForm)}><Plus size={14} /> {t("acom_new")}</button>
          </div>
          {showCampForm && (
            <div className="np-admin-comm-form">
              <input className="np-text-input" placeholder={t("acom_ph_subject")} value={campSubject} onChange={e => setCampSubject(e.target.value)} />
              <textarea className="np-text-input" placeholder={t("acom_ph_html_content")} rows={5} value={campMsg} onChange={e => setCampMsg(e.target.value)} />
              <div className="np-admin-comm-form-actions">
                <button className="np-primary-button" disabled={acting || !campSubject.trim() || !campMsg.trim()} onClick={() => { doAction("send_email_campaign", { subject: campSubject, message: campMsg }); setCampSubject(""); setCampMsg(""); setShowCampForm(false); }}>
                  <Send size={14} /> {t("acom_create_send")}
                </button>
                <button className="np-outline-button" onClick={() => setShowCampForm(false)}>{t("acom_cancel")}</button>
              </div>
            </div>
          )}
          <div className="np-admin-comm-list">
            {campaigns.length === 0 && <p className="np-admin-comm-empty">{t("acom_no_campaign")}</p>}
            {campaigns.map((c: any) => (
              <div key={c.id} className="np-admin-comm-item">
                <div className="np-admin-comm-item-info">
                  <strong>{c.subject}</strong>
                  <small><span className={`np-badge ${c.status === "completed" ? "success" : ""}`}>{c.status}</span> · {t("acom_sent_ratio").replace("{sent}", String(c.sent_count)).replace("{total}", String(c.total_recipients))} · {formatDate(c.created_at)}</small>
                </div>
                <div className="np-admin-comm-item-actions">
                  {c.status === "draft" && <button className="np-btn-sm" disabled={acting} onClick={() => doAction("send_email_campaign", { id: c.id })}><Send size={12} /></button>}
                  <button className="np-btn-sm danger" disabled={acting} onClick={() => { if (confirm(t("acom_confirm_delete"))) doAction("delete_email_campaign", { id: c.id }); }}><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "email_config" && (
        <div className="np-admin-comm-section">
          <div className="np-admin-comm-header">
            <h3><Settings size={18} /> {t("acom_smtp_config")}</h3>
            <button className="np-primary-button" onClick={() => setEmailForm(emailForm ? null : { mail_host: "", mail_port: 587, mail_username: "", mail_password: "", mail_encryption: "tls", mail_from_address: "", mail_from_name: "", is_active: 1 })}><Plus size={14} /> {emailForm ? t("acom_cancel") : t("acom_add")}</button>
          </div>
          {emailForm && (
            <div className="np-admin-comm-form">
              <div className="np-admin-comm-form-row">
                <input className="np-text-input" placeholder={t("acom_ph_smtp_host")} value={emailForm.mail_host} onChange={e => setEmailForm({ ...emailForm, mail_host: e.target.value })} />
                <input className="np-text-input" type="number" placeholder={t("acom_ph_port")} value={emailForm.mail_port} onChange={e => setEmailForm({ ...emailForm, mail_port: Number(e.target.value) })} style={{ maxWidth: 100 }} />
              </div>
              <div className="np-admin-comm-form-row">
                <input className="np-text-input" placeholder={t("acom_ph_username")} value={emailForm.mail_username} onChange={e => setEmailForm({ ...emailForm, mail_username: e.target.value })} />
                <input className="np-text-input" type="password" placeholder={t("acom_ph_password")} value={emailForm.mail_password} onChange={e => setEmailForm({ ...emailForm, mail_password: e.target.value })} />
              </div>
              <div className="np-admin-comm-form-row">
                <input className="np-text-input" placeholder={t("acom_ph_from_email")} value={emailForm.mail_from_address} onChange={e => setEmailForm({ ...emailForm, mail_from_address: e.target.value })} />
                <input className="np-text-input" placeholder={t("acom_ph_from_name")} value={emailForm.mail_from_name} onChange={e => setEmailForm({ ...emailForm, mail_from_name: e.target.value })} />
              </div>
              <div className="np-admin-comm-form-row">
                <select className="np-text-input" value={emailForm.mail_encryption} onChange={e => setEmailForm({ ...emailForm, mail_encryption: e.target.value })}>
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                  <option value="">{t("acom_encryption_none")}</option>
                </select>
                <label className="np-admin-comm-toggle"><input type="checkbox" checked={!!emailForm.is_active} onChange={e => setEmailForm({ ...emailForm, is_active: e.target.checked ? 1 : 0 })} /> {t("acom_active")}</label>
              </div>
              <button className="np-primary-button" disabled={acting || !emailForm.mail_host} onClick={() => { doAction("save_email_setting", emailForm); setEmailForm(null); }}>
                <CheckCircle2 size={14} /> {t("acom_save")}
              </button>
            </div>
          )}
          <div className="np-admin-comm-list">
            {emailSettings.length === 0 && <p className="np-admin-comm-empty">{t("acom_no_smtp_config")}</p>}
            {emailSettings.map((s: any) => (
              <div key={s.id} className="np-admin-comm-item">
                <div className="np-admin-comm-item-info">
                  <strong>{s.mail_host}:{s.mail_port}</strong>
                  <small>{s.mail_from_address} ({s.mail_from_name}) · {s.mail_encryption || "plain"} · <span className={`np-badge ${s.is_active ? "success" : ""}`}>{s.is_active ? t("acom_active") : t("acom_inactive")}</span></small>
                </div>
                <div className="np-admin-comm-item-actions">
                  <button className="np-btn-sm" onClick={() => setEmailForm(s)}><Settings size={12} /></button>
                  <button className="np-btn-sm danger" disabled={acting} onClick={() => { if (confirm(t("acom_confirm_delete"))) doAction("delete_email_setting", { id: s.id }); }}><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
