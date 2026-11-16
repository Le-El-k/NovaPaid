"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/app/lib/i18n";
import {
  Check, ChevronDown, ChevronRight, Edit2, Globe, Loader2, Mail,
  Megaphone, Plus, RefreshCw, Settings, Trash2, ToggleLeft, ToggleRight,
  X, CreditCard, BarChart3, FileText, Send, Eye, EyeOff,
} from "lucide-react";

type AdvancedSubTab = "landing_cms" | "email_settings" | "email_campaigns" | "withdrawal_methods" | "manual_payments" | "marketing";

interface AdminAdvancedProps {
  adminId: number;
}

const SUB_TABS: { key: AdvancedSubTab; icon: any }[] = [
  { key: "landing_cms", icon: Globe },
  { key: "email_settings", icon: Mail },
  { key: "email_campaigns", icon: Megaphone },
  { key: "withdrawal_methods", icon: CreditCard },
  { key: "manual_payments", icon: FileText },
  { key: "marketing", icon: BarChart3 },
];

export function AdminAdvanced({ adminId }: AdminAdvancedProps) {
  const { t } = useLanguage();
  const [subTab, setSubTab] = useState<AdvancedSubTab>("landing_cms");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="np-admin-fees">
      {notification && (
        <div className="np-admin-fees-toast">
          <Check size={14} /> {notification}
        </div>
      )}

      <div className="np-admin-fees-tabs">
        {SUB_TABS.map(({ key, icon: Icon }) => (
          <button key={key} type="button" className={`np-admin-fees-tab ${subTab === key ? "active" : ""}`} onClick={() => setSubTab(key)}>
            <Icon size={15} /> <span>{t(`aadv_tab_${key}`)}</span>
          </button>
        ))}
      </div>

      <div className="np-admin-fees-content">
        {subTab === "landing_cms" && <LandingCmsPanel notify={notify} />}
        {subTab === "email_settings" && <EmailSettingsPanel notify={notify} />}
        {subTab === "email_campaigns" && <EmailCampaignsPanel notify={notify} adminId={adminId} />}
        {subTab === "withdrawal_methods" && <WithdrawalMethodsPanel notify={notify} />}
        {subTab === "manual_payments" && <ManualPaymentsPanel notify={notify} />}
        {subTab === "marketing" && <MarketingPanel notify={notify} />}
      </div>
    </div>
  );
}

// Helper for admin API calls
async function adminAction(action: string, payload: any = {}) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Erreur");
  return json;
}

async function adminGet(section: string) {
  const res = await fetch(`/api/admin?section=${section}`);
  return res.json();
}

// =============================================================================
// LANDING PAGE CMS
// =============================================================================

function LandingCmsPanel({ notify }: { notify: (m: string) => void }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ section_key: "", section_title: "", content: "", is_visible: 1, section_order: "0" });
  const [editing, setEditing] = useState<any>(null);

  const refresh = async () => { setLoading(true); const r = await adminGet("landing_cms"); if (r.success) setItems(r.sections); setLoading(false); };
  useEffect(() => { refresh(); }, []);

  const resetForm = () => { setForm({ section_key: "", section_title: "", content: "", is_visible: 1, section_order: "0" }); setEditing(null); setShowForm(false); };

  const startEdit = (item: any) => {
    setForm({ section_key: item.section_key, section_title: item.section_title || "", content: item.content || "", is_visible: item.is_visible, section_order: String(item.section_order) });
    setEditing(item);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      await adminAction("upsert_landing_cms", { data: { ...form, is_visible: Number(form.is_visible), section_order: Number(form.section_order) } });
      notify(editing ? t("aadv_landing_section_updated") : t("aadv_landing_section_created"));
      resetForm();
      refresh();
    } catch (e: any) { notify(t("aadv_error_prefix") + e.message); }
  };

  return (
    <div>
      <div className="np-admin-fees-header">
        <h3>{t("aadv_landing_title")}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="np-admin-fees-refresh" onClick={refresh}><RefreshCw size={14} /></button>
          <button type="button" className="np-admin-fees-add" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={14} /> {t("aadv_add")}</button>
        </div>
      </div>

      {showForm && (
        <div className="np-admin-fees-form">
          <div className="np-admin-fees-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="np-form-group">
              <label className="np-form-label">{t("aadv_landing_section_key")}</label>
              <input className="np-text-input" value={form.section_key} onChange={e => setForm({ ...form, section_key: e.target.value })} placeholder="hero, features, pricing..." disabled={!!editing} />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("aadv_title_label")}</label>
              <input className="np-text-input" value={form.section_title} onChange={e => setForm({ ...form, section_title: e.target.value })} />
            </div>
            <div className="np-form-group" style={{ gridColumn: "span 2" }}>
              <label className="np-form-label">{t("aadv_landing_content")}</label>
              <textarea className="np-text-input" rows={5} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} style={{ resize: "vertical", fontFamily: "monospace", fontSize: 12 }} />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("aadv_order")}</label>
              <input className="np-text-input" type="number" value={form.section_order} onChange={e => setForm({ ...form, section_order: e.target.value })} />
            </div>
            <div className="np-form-group">
              <label className="np-form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={!!form.is_visible} onChange={e => setForm({ ...form, is_visible: e.target.checked ? 1 : 0 })} style={{ accentColor: "#00d4aa" }} />
                {t("aadv_visible")}
              </label>
            </div>
          </div>
          <div className="np-admin-fees-form-actions">
            <button type="button" className="np-secondary-button" onClick={resetForm}><X size={14} /> {t("aadv_cancel")}</button>
            <button type="button" className="np-primary-button" onClick={handleSave} disabled={!form.section_key}><Check size={14} /> {editing ? t("aadv_edit") : t("aadv_create")}</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ opacity: 0.5 }}>{t("aadv_loading")}</p> : (
        <div className="np-admin-fees-table-wrap">
          <table className="np-admin-fees-table">
            <thead><tr><th>{t("aadv_key")}</th><th>{t("aadv_title_label")}</th><th>{t("aadv_order")}</th><th>{t("aadv_visible")}</th><th>{t("aadv_actions")}</th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={5} className="np-admin-fees-empty">{t("aadv_landing_empty")}</td></tr>}
              {items.map((item: any) => (
                <tr key={item.id}>
                  <td className="font-medium">{item.section_key}</td>
                  <td>{item.section_title || "—"}</td>
                  <td>{item.section_order}</td>
                  <td>{item.is_visible ? <Eye size={14} style={{ color: "#00d4aa" }} /> : <EyeOff size={14} style={{ opacity: 0.3 }} />}</td>
                  <td className="np-admin-fees-actions">
                    <button type="button" onClick={() => startEdit(item)}><Edit2 size={14} /></button>
                    <button type="button" onClick={() => { if (confirm(t("aadv_delete_confirm"))) { adminAction("delete_landing_cms", { id: item.id }).then(refresh); notify(t("aadv_deleted")); } }}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EMAIL SETTINGS
// =============================================================================

function EmailSettingsPanel({ notify }: { notify: (m: string) => void }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ setting_key: "", setting_value: "", description: "" });

  const refresh = async () => { setLoading(true); const r = await adminGet("email_settings"); if (r.success) setItems(r.settings); setLoading(false); };
  useEffect(() => { refresh(); }, []);

  const handleSave = async () => {
    try {
      await adminAction("upsert_email_setting", { data: form });
      notify(t("aadv_email_saved"));
      setShowForm(false);
      setForm({ setting_key: "", setting_value: "", description: "" });
      refresh();
    } catch (e: any) { notify(t("aadv_error_prefix") + e.message); }
  };

  const presets = [
    { key: "smtp_host", label: t("aadv_email_smtp_host_label"), desc: t("aadv_email_smtp_host_desc") },
    { key: "smtp_port", label: t("aadv_email_smtp_port_label"), desc: t("aadv_email_smtp_port_desc") },
    { key: "smtp_user", label: t("aadv_email_smtp_user_label"), desc: t("aadv_email_smtp_user_desc") },
    { key: "smtp_password", label: t("aadv_email_smtp_password_label"), desc: t("aadv_email_smtp_password_desc") },
    { key: "from_email", label: t("aadv_email_from_email_label"), desc: t("aadv_email_from_email_desc") },
    { key: "from_name", label: t("aadv_email_from_name_label"), desc: t("aadv_email_from_name_desc") },
    { key: "mailjet_api_key", label: t("aadv_email_mailjet_key_label"), desc: t("aadv_email_mailjet_key_desc") },
    { key: "mailjet_secret_key", label: t("aadv_email_mailjet_secret_label"), desc: t("aadv_email_mailjet_secret_desc") },
  ];

  const existingKeys = new Set(items.map((i: any) => i.setting_key));

  return (
    <div>
      <div className="np-admin-fees-header">
        <h3>{t("aadv_email_title")}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="np-admin-fees-refresh" onClick={refresh}><RefreshCw size={14} /></button>
          <button type="button" className="np-admin-fees-add" onClick={() => setShowForm(true)}><Plus size={14} /> {t("aadv_add")}</button>
        </div>
      </div>

      {/* Quick add presets */}
      {presets.filter(p => !existingKeys.has(p.key)).length > 0 && (
        <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {presets.filter(p => !existingKeys.has(p.key)).map(p => (
            <button key={p.key} type="button" className="np-admin-fees-badge" style={{ cursor: "pointer", padding: "4px 10px" }}
              onClick={() => { setForm({ setting_key: p.key, setting_value: "", description: p.desc }); setShowForm(true); }}>
              + {p.label}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <div className="np-admin-fees-form">
          <div className="np-admin-fees-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="np-form-group">
              <label className="np-form-label">{t("aadv_key")}</label>
              <input className="np-text-input" value={form.setting_key} onChange={e => setForm({ ...form, setting_key: e.target.value })} />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("aadv_value")}</label>
              <input className="np-text-input" value={form.setting_value} onChange={e => setForm({ ...form, setting_value: e.target.value })} type={form.setting_key.includes("password") || form.setting_key.includes("secret") ? "password" : "text"} />
            </div>
            <div className="np-form-group" style={{ gridColumn: "span 2" }}>
              <label className="np-form-label">{t("aadv_description")}</label>
              <input className="np-text-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div className="np-admin-fees-form-actions">
            <button type="button" className="np-secondary-button" onClick={() => setShowForm(false)}><X size={14} /> {t("aadv_cancel")}</button>
            <button type="button" className="np-primary-button" onClick={handleSave} disabled={!form.setting_key}><Check size={14} /> {t("aadv_save")}</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ opacity: 0.5 }}>{t("aadv_loading")}</p> : (
        <div className="np-admin-fees-table-wrap">
          <table className="np-admin-fees-table">
            <thead><tr><th>{t("aadv_key")}</th><th>{t("aadv_value")}</th><th>{t("aadv_description")}</th><th>{t("aadv_actions")}</th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={4} className="np-admin-fees-empty">{t("aadv_email_empty")}</td></tr>}
              {items.map((item: any) => (
                <tr key={item.id}>
                  <td className="font-medium">{item.setting_key}</td>
                  <td>{item.setting_key.includes("password") || item.setting_key.includes("secret") ? "••••••" : (item.setting_value || "—")}</td>
                  <td style={{ opacity: 0.5 }}>{item.description || "—"}</td>
                  <td className="np-admin-fees-actions">
                    <button type="button" onClick={() => { setForm({ setting_key: item.setting_key, setting_value: item.setting_value, description: item.description || "" }); setShowForm(true); }}><Edit2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EMAIL CAMPAIGNS
// =============================================================================

function EmailCampaignsPanel({ notify, adminId }: { notify: (m: string) => void; adminId: number }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", body_html: "", target_audience: "all" });

  const refresh = async () => { setLoading(true); const r = await adminGet("email_campaigns"); if (r.success) setItems(r.campaigns); setLoading(false); };
  useEffect(() => { refresh(); }, []);

  const handleCreate = async () => {
    try {
      await adminAction("create_email_campaign", { data: form });
      notify(t("aadv_campaign_created"));
      setShowForm(false);
      setForm({ name: "", subject: "", body_html: "", target_audience: "all" });
      refresh();
    } catch (e: any) { notify(t("aadv_error_prefix") + e.message); }
  };

  const statusColors: Record<string, string> = { draft: "warning", scheduled: "info", sent: "success", cancelled: "danger" };
  const statusLabels: Record<string, string> = { draft: t("aadv_campaign_status_draft"), scheduled: t("aadv_campaign_status_scheduled"), sent: t("aadv_campaign_status_sent"), cancelled: t("aadv_campaign_status_cancelled") };

  return (
    <div>
      <div className="np-admin-fees-header">
        <h3>{t("aadv_campaigns_title")}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="np-admin-fees-refresh" onClick={refresh}><RefreshCw size={14} /></button>
          <button type="button" className="np-admin-fees-add" onClick={() => setShowForm(true)}><Plus size={14} /> {t("aadv_campaign_new")}</button>
        </div>
      </div>

      {showForm && (
        <div className="np-admin-fees-form">
          <div className="np-admin-fees-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="np-form-group">
              <label className="np-form-label">{t("aadv_campaign_name_label")}</label>
              <input className="np-text-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t("aadv_campaign_name_placeholder")} />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("aadv_campaign_audience_label")}</label>
              <select className="np-text-input" value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })}>
                <option value="all">{t("aadv_campaign_audience_all")}</option>
                <option value="active">{t("aadv_campaign_audience_active")}</option>
                <option value="verified">{t("aadv_campaign_audience_verified")}</option>
                <option value="resellers">{t("aadv_campaign_audience_resellers")}</option>
              </select>
            </div>
            <div className="np-form-group" style={{ gridColumn: "span 2" }}>
              <label className="np-form-label">{t("aadv_campaign_subject_label")}</label>
              <input className="np-text-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder={t("aadv_campaign_subject_placeholder")} />
            </div>
            <div className="np-form-group" style={{ gridColumn: "span 2" }}>
              <label className="np-form-label">{t("aadv_campaign_body_label")}</label>
              <textarea className="np-text-input" rows={8} value={form.body_html} onChange={e => setForm({ ...form, body_html: e.target.value })} style={{ resize: "vertical", fontFamily: "monospace", fontSize: 12 }} placeholder={t("aadv_campaign_body_placeholder")} />
            </div>
          </div>
          <div className="np-admin-fees-form-actions">
            <button type="button" className="np-secondary-button" onClick={() => setShowForm(false)}><X size={14} /> {t("aadv_cancel")}</button>
            <button type="button" className="np-primary-button" onClick={handleCreate} disabled={!form.name || !form.subject}><Check size={14} /> {t("aadv_create")}</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ opacity: 0.5 }}>{t("aadv_loading")}</p> : (
        <div className="np-admin-fees-providers-list">
          {items.length === 0 && <p className="np-admin-fees-empty">{t("aadv_campaigns_empty")}</p>}
          {items.map((item: any) => (
            <div key={item.id} className="np-admin-fees-provider-card">
              <div className="np-admin-fees-provider-row">
                <div className="np-admin-fees-provider-info">
                  <div>
                    <strong>{item.name}</strong>
                    <span className="np-admin-fees-provider-type">{item.subject}</span>
                  </div>
                </div>
                <div className="np-admin-fees-provider-badges">
                  <span className={`np-badge ${statusColors[item.status] || "warning"}`}>{statusLabels[item.status] || item.status}</span>
                  <span className="np-admin-fees-badge">{item.target_audience}</span>
                </div>
                <div className="np-admin-fees-actions">
                  {item.status === "draft" && (
                    <button type="button" onClick={() => { if (confirm(t("aadv_campaign_send_confirm"))) { adminAction("update_email_campaign_status", { id: item.id, status: "sent" }).then(refresh); notify(t("aadv_campaign_marked_sent")); } }} title={t("aadv_campaign_send_title")}><Send size={14} /></button>
                  )}
                  <button type="button" onClick={() => { if (confirm(t("aadv_campaign_delete_confirm"))) { adminAction("delete_email_campaign", { id: item.id }).then(refresh); notify(t("aadv_deleted_f")); } }} title={t("aadv_delete_title")}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// WITHDRAWAL METHODS
// =============================================================================

function WithdrawalMethodsPanel({ notify }: { notify: (m: string) => void }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", method_type: "mobile_money", provider: "", min_amount: "0", max_amount: "", fee_fixed: "0", fee_percentage: "0", processing_time: "", display_order: "0" });

  const refresh = async () => { setLoading(true); const r = await adminGet("withdrawal_methods"); if (r.success) setItems(r.methods); setLoading(false); };
  useEffect(() => { refresh(); }, []);

  const resetForm = () => { setForm({ name: "", method_type: "mobile_money", provider: "", min_amount: "0", max_amount: "", fee_fixed: "0", fee_percentage: "0", processing_time: "", display_order: "0" }); setEditing(null); setShowForm(false); };

  const startEdit = (item: any) => {
    setForm({ name: item.name, method_type: item.method_type, provider: item.provider || "", min_amount: String(item.min_amount), max_amount: item.max_amount ? String(item.max_amount) : "", fee_fixed: String(item.fee_fixed), fee_percentage: String(item.fee_percentage), processing_time: item.processing_time || "", display_order: String(item.display_order) });
    setEditing(item);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const data = { ...form, id: editing?.id, min_amount: Number(form.min_amount), max_amount: form.max_amount ? Number(form.max_amount) : null, fee_fixed: Number(form.fee_fixed), fee_percentage: Number(form.fee_percentage), display_order: Number(form.display_order) };
      await adminAction("upsert_withdrawal_method", { data });
      notify(editing ? t("aadv_withdrawal_method_updated") : t("aadv_withdrawal_method_created"));
      resetForm();
      refresh();
    } catch (e: any) { notify(t("aadv_error_prefix") + e.message); }
  };

  return (
    <div>
      <div className="np-admin-fees-header">
        <h3>{t("aadv_withdrawal_title")}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="np-admin-fees-refresh" onClick={refresh}><RefreshCw size={14} /></button>
          <button type="button" className="np-admin-fees-add" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={14} /> {t("aadv_add")}</button>
        </div>
      </div>

      {showForm && (
        <div className="np-admin-fees-form">
          <div className="np-admin-fees-form-grid">
            <div className="np-form-group"><label className="np-form-label">{t("aadv_name")}</label><input className="np-text-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Orange Money" /></div>
            <div className="np-form-group"><label className="np-form-label">Type</label>
              <select className="np-text-input" value={form.method_type} onChange={e => setForm({ ...form, method_type: e.target.value })}>
                <option value="mobile_money">Mobile Money</option><option value="bank_transfer">{t("aadv_withdrawal_type_bank")}</option><option value="crypto">Crypto</option><option value="other">{t("aadv_withdrawal_type_other")}</option>
              </select>
            </div>
            <div className="np-form-group"><label className="np-form-label">Provider</label><input className="np-text-input" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} placeholder="orange_money" /></div>
            <div className="np-form-group"><label className="np-form-label">{t("aadv_withdrawal_min_amount")}</label><input className="np-text-input" type="number" value={form.min_amount} onChange={e => setForm({ ...form, min_amount: e.target.value })} /></div>
            <div className="np-form-group"><label className="np-form-label">{t("aadv_withdrawal_max_amount")}</label><input className="np-text-input" type="number" value={form.max_amount} onChange={e => setForm({ ...form, max_amount: e.target.value })} placeholder={t("aadv_withdrawal_max_placeholder")} /></div>
            <div className="np-form-group"><label className="np-form-label">{t("aadv_withdrawal_fee_fixed")}</label><input className="np-text-input" type="number" value={form.fee_fixed} onChange={e => setForm({ ...form, fee_fixed: e.target.value })} /></div>
            <div className="np-form-group"><label className="np-form-label">{t("aadv_withdrawal_fee_pct")}</label><input className="np-text-input" type="number" step="0.1" value={form.fee_percentage} onChange={e => setForm({ ...form, fee_percentage: e.target.value })} /></div>
            <div className="np-form-group"><label className="np-form-label">{t("aadv_withdrawal_delay")}</label><input className="np-text-input" value={form.processing_time} onChange={e => setForm({ ...form, processing_time: e.target.value })} placeholder="1-24h" /></div>
            <div className="np-form-group"><label className="np-form-label">{t("aadv_order")}</label><input className="np-text-input" type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: e.target.value })} /></div>
          </div>
          <div className="np-admin-fees-form-actions">
            <button type="button" className="np-secondary-button" onClick={resetForm}><X size={14} /> {t("aadv_cancel")}</button>
            <button type="button" className="np-primary-button" onClick={handleSave} disabled={!form.name}><Check size={14} /> {editing ? t("aadv_edit") : t("aadv_create")}</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ opacity: 0.5 }}>{t("aadv_loading")}</p> : (
        <div className="np-admin-fees-table-wrap">
          <table className="np-admin-fees-table">
            <thead><tr><th>{t("aadv_name")}</th><th>Type</th><th>Provider</th><th>Min</th><th>Max</th><th>{t("aadv_withdrawal_fees_th")}</th><th>{t("aadv_withdrawal_delay")}</th><th>{t("aadv_active")}</th><th>{t("aadv_actions")}</th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={9} className="np-admin-fees-empty">{t("aadv_withdrawal_empty")}</td></tr>}
              {items.map((item: any) => (
                <tr key={item.id}>
                  <td className="font-medium">{item.name}</td>
                  <td><span className="np-admin-fees-badge">{item.method_type}</span></td>
                  <td>{item.provider || "—"}</td>
                  <td>{Number(item.min_amount).toLocaleString()}</td>
                  <td>{item.max_amount ? Number(item.max_amount).toLocaleString() : "—"}</td>
                  <td>{item.fee_fixed > 0 ? `${item.fee_fixed} + ` : ""}{item.fee_percentage}%</td>
                  <td>{item.processing_time || "—"}</td>
                  <td>
                    <button type="button" className={`np-admin-fees-toggle ${item.is_active ? "on" : "off"}`}
                      onClick={() => { adminAction("upsert_withdrawal_method", { data: { id: item.id, name: item.name, method_type: item.method_type, is_active: item.is_active ? 0 : 1 } }).then(refresh); }}>
                      {item.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                  </td>
                  <td className="np-admin-fees-actions">
                    <button type="button" onClick={() => startEdit(item)}><Edit2 size={14} /></button>
                    <button type="button" onClick={() => { if (confirm(t("aadv_delete_confirm"))) { adminAction("delete_withdrawal_method", { id: item.id }).then(refresh); notify(t("aadv_deleted")); } }}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MANUAL PAYMENTS
// =============================================================================

function ManualPaymentsPanel({ notify }: { notify: (m: string) => void }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", instructions: "", display_order: "0", logo: "" });
  const [editing, setEditing] = useState<any>(null);

  const refresh = async () => { setLoading(true); const r = await adminGet("manual_payments"); if (r.success) setItems(r.apis); setLoading(false); };
  useEffect(() => { refresh(); }, []);

  const resetForm = () => { setForm({ name: "", slug: "", instructions: "", display_order: "0", logo: "" }); setEditing(null); setShowForm(false); };

  const startEdit = (item: any) => {
    setForm({ name: item.name, slug: item.slug, instructions: item.instructions || "", display_order: String(item.display_order), logo: item.logo || "" });
    setEditing(item);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const data = { ...form, id: editing?.id, display_order: Number(form.display_order) };
      await adminAction("upsert_manual_payment", { data });
      notify(editing ? t("aadv_manual_updated") : t("aadv_manual_created"));
      resetForm();
      refresh();
    } catch (e: any) { notify(t("aadv_error_prefix") + e.message); }
  };

  return (
    <div>
      <div className="np-admin-fees-header">
        <h3>{t("aadv_manual_title")}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="np-admin-fees-refresh" onClick={refresh}><RefreshCw size={14} /></button>
          <button type="button" className="np-admin-fees-add" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={14} /> {t("aadv_add")}</button>
        </div>
      </div>

      {showForm && (
        <div className="np-admin-fees-form">
          <div className="np-admin-fees-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="np-form-group"><label className="np-form-label">{t("aadv_name")}</label><input className="np-text-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t("aadv_manual_name_placeholder")} /></div>
            <div className="np-form-group"><label className="np-form-label">Slug</label><input className="np-text-input" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="virement_bancaire" /></div>
            <div className="np-form-group" style={{ gridColumn: "span 2" }}><label className="np-form-label">Instructions</label><textarea className="np-text-input" rows={4} value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} style={{ resize: "vertical" }} placeholder={t("aadv_manual_instructions_placeholder")} /></div>
            <div className="np-form-group"><label className="np-form-label">Logo URL</label><input className="np-text-input" value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} /></div>
            <div className="np-form-group"><label className="np-form-label">{t("aadv_order")}</label><input className="np-text-input" type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: e.target.value })} /></div>
          </div>
          <div className="np-admin-fees-form-actions">
            <button type="button" className="np-secondary-button" onClick={resetForm}><X size={14} /> {t("aadv_cancel")}</button>
            <button type="button" className="np-primary-button" onClick={handleSave} disabled={!form.name || !form.slug}><Check size={14} /> {editing ? t("aadv_edit") : t("aadv_create")}</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ opacity: 0.5 }}>{t("aadv_loading")}</p> : (
        <div className="np-admin-fees-table-wrap">
          <table className="np-admin-fees-table">
            <thead><tr><th>{t("aadv_name")}</th><th>Slug</th><th>{t("aadv_order")}</th><th>{t("aadv_active")}</th><th>{t("aadv_actions")}</th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={5} className="np-admin-fees-empty">{t("aadv_manual_empty")}</td></tr>}
              {items.map((item: any) => (
                <tr key={item.id}>
                  <td className="font-medium">{item.name}</td>
                  <td>{item.slug}</td>
                  <td>{item.display_order}</td>
                  <td>
                    <button type="button" className={`np-admin-fees-toggle ${item.is_active ? "on" : "off"}`}
                      onClick={() => { adminAction("upsert_manual_payment", { data: { id: item.id, name: item.name, slug: item.slug, is_active: item.is_active ? 0 : 1 } }).then(refresh); }}>
                      {item.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                  </td>
                  <td className="np-admin-fees-actions">
                    <button type="button" onClick={() => startEdit(item)}><Edit2 size={14} /></button>
                    <button type="button" onClick={() => { if (confirm(t("aadv_delete_confirm"))) { adminAction("delete_manual_payment", { id: item.id }).then(refresh); notify(t("aadv_deleted")); } }}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MARKETING SETTINGS
// =============================================================================

function MarketingPanel({ notify }: { notify: (m: string) => void }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ setting_key: "", setting_value: "", description: "" });

  const refresh = async () => { setLoading(true); const r = await adminGet("marketing_settings"); if (r.success) setItems(r.settings); setLoading(false); };
  useEffect(() => { refresh(); }, []);

  const presets = [
    { key: "google_analytics_id", label: "Google Analytics", desc: t("aadv_marketing_ga_desc") },
    { key: "facebook_pixel_id", label: "Facebook Pixel", desc: t("aadv_marketing_fb_desc") },
    { key: "tiktok_pixel_id", label: "TikTok Pixel", desc: t("aadv_marketing_tiktok_desc") },
    { key: "google_tag_manager_id", label: "GTM", desc: t("aadv_marketing_gtm_desc") },
    { key: "meta_description", label: "Meta Description", desc: t("aadv_marketing_meta_desc") },
    { key: "og_image", label: "OG Image", desc: t("aadv_marketing_og_desc") },
  ];

  const existingKeys = new Set(items.map((i: any) => i.setting_key));

  const handleSave = async () => {
    try {
      await adminAction("upsert_marketing_setting", { data: form });
      notify(t("aadv_marketing_saved"));
      setShowForm(false);
      setForm({ setting_key: "", setting_value: "", description: "" });
      refresh();
    } catch (e: any) { notify(t("aadv_error_prefix") + e.message); }
  };

  return (
    <div>
      <div className="np-admin-fees-header">
        <h3>{t("aadv_marketing_title")}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="np-admin-fees-refresh" onClick={refresh}><RefreshCw size={14} /></button>
          <button type="button" className="np-admin-fees-add" onClick={() => setShowForm(true)}><Plus size={14} /> {t("aadv_add")}</button>
        </div>
      </div>

      {presets.filter(p => !existingKeys.has(p.key)).length > 0 && (
        <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {presets.filter(p => !existingKeys.has(p.key)).map(p => (
            <button key={p.key} type="button" className="np-admin-fees-badge" style={{ cursor: "pointer", padding: "4px 10px" }}
              onClick={() => { setForm({ setting_key: p.key, setting_value: "", description: p.desc }); setShowForm(true); }}>
              + {p.label}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <div className="np-admin-fees-form">
          <div className="np-admin-fees-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="np-form-group"><label className="np-form-label">{t("aadv_key")}</label><input className="np-text-input" value={form.setting_key} onChange={e => setForm({ ...form, setting_key: e.target.value })} /></div>
            <div className="np-form-group"><label className="np-form-label">{t("aadv_value")}</label><input className="np-text-input" value={form.setting_value} onChange={e => setForm({ ...form, setting_value: e.target.value })} /></div>
            <div className="np-form-group" style={{ gridColumn: "span 2" }}><label className="np-form-label">{t("aadv_description")}</label><input className="np-text-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <div className="np-admin-fees-form-actions">
            <button type="button" className="np-secondary-button" onClick={() => setShowForm(false)}><X size={14} /> {t("aadv_cancel")}</button>
            <button type="button" className="np-primary-button" onClick={handleSave} disabled={!form.setting_key}><Check size={14} /> {t("aadv_save")}</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ opacity: 0.5 }}>{t("aadv_loading")}</p> : (
        <div className="np-admin-fees-table-wrap">
          <table className="np-admin-fees-table">
            <thead><tr><th>{t("aadv_key")}</th><th>{t("aadv_value")}</th><th>{t("aadv_description")}</th><th>{t("aadv_actions")}</th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={4} className="np-admin-fees-empty">{t("aadv_marketing_empty")}</td></tr>}
              {items.map((item: any) => (
                <tr key={item.id}>
                  <td className="font-medium">{item.setting_key}</td>
                  <td>{item.setting_value || "—"}</td>
                  <td style={{ opacity: 0.5 }}>{item.description || "—"}</td>
                  <td className="np-admin-fees-actions">
                    <button type="button" onClick={() => { setForm({ setting_key: item.setting_key, setting_value: item.setting_value, description: item.description || "" }); setShowForm(true); }}><Edit2 size={14} /></button>
                    <button type="button" onClick={() => { if (confirm(t("aadv_delete_confirm"))) { adminAction("delete_marketing_setting", { id: item.id }).then(refresh); notify(t("aadv_deleted")); } }}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
