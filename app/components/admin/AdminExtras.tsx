"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, TrendingUp, Globe, Webhook, CreditCard, HelpCircle, Megaphone, Banknote, Search, Plus, Trash2, CheckCircle2, XCircle, RefreshCw, Edit, Eye } from "lucide-react";
import { useLanguage } from "@/app/lib/i18n";
import { useCurrency } from "@/app/lib/currency";

type ExtrasTab = "kyc" | "revenue" | "landing" | "webhooks" | "cards" | "help" | "marketing" | "deposit";

const TABS: { key: ExtrasTab; label: string; icon: any; tKey?: string }[] = [
  { key: "kyc", label: "KYC", icon: ShieldCheck },
  { key: "revenue", label: "Revenus", icon: TrendingUp, tKey: "aext_tab_revenue" },
  { key: "landing", label: "Landing CMS", icon: Globe },
  { key: "webhooks", label: "Webhooks", icon: Webhook },
  { key: "cards", label: "Cartes", icon: CreditCard, tKey: "aext_tab_cards" },
  { key: "help", label: "Aide", icon: HelpCircle, tKey: "aext_tab_help" },
  { key: "marketing", label: "Marketing", icon: Megaphone },
  { key: "deposit", label: "Dépôt", icon: Banknote, tKey: "aext_tab_deposit" },
];

export function AdminExtras() {
  const { t } = useLanguage();
  const { currency, convertAmount } = useCurrency();
  const [tab, setTab] = useState<ExtrasTab>("kyc");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [acting, setActing] = useState(false);

  const load = async (section: string, params = "") => {
    setLoading(true); setMsg(""); setErr(""); setData(null);
    try {
      const res = await fetch(`/api/admin?section=${section}${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || t("aext_error"));
      setData(json);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  };

  const post = async (action: string, body: Record<string, any> = {}) => {
    setActing(true); setMsg(""); setErr("");
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...body }) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || t("aext_error"));
      setMsg(json.message || t("aext_action_done"));
      return json;
    } catch (e: any) { setErr(e.message); return null; } finally { setActing(false); }
  };

  useEffect(() => {
    const sectionMap: Record<ExtrasTab, string> = {
      kyc: "identity_verifications", revenue: "revenue_analytics", landing: "landing_cms",
      webhooks: "webhook_relays", cards: "card_issuing", help: "help_articles",
      marketing: "marketing_settings", deposit: "deposit_help",
    };
    load(sectionMap[tab]);
  }, [tab]);

  return (
    <div className="np-admin-extras">
      <div className="np-admin-extras-tabs">
        {TABS.map(tx => (
          <button key={tx.key} className={`np-admin-extras-tab ${tab === tx.key ? "active" : ""}`} onClick={() => setTab(tx.key)}>
            <tx.icon size={14} /> <span>{tx.tKey ? t(tx.tKey) : tx.label}</span>
          </button>
        ))}
      </div>

      {(msg || err) && (
        <div className={`np-security-alert ${err ? "danger" : "success"}`}>
          {err ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{err || msg}</span>
          <button onClick={() => { setMsg(""); setErr(""); }}>×</button>
        </div>
      )}

      {loading && <div className="np-security-loading"><RefreshCw size={18} className="np-spin" /> {t("aext_loading")}</div>}

      {!loading && data && tab === "kyc" && <KycPanel data={data} post={post} acting={acting} reload={() => load("identity_verifications")} />}
      {!loading && data && tab === "revenue" && <RevenuePanel data={data} />}
      {!loading && data && tab === "landing" && <LandingPanel data={data} post={post} acting={acting} />}
      {!loading && data && tab === "webhooks" && <WebhooksPanel data={data} post={post} acting={acting} reload={() => load("webhook_relays")} />}
      {!loading && data && tab === "cards" && <CardsPanel data={data} post={post} acting={acting} reload={() => load("card_issuing")} />}
      {!loading && data && tab === "help" && <HelpPanel data={data} post={post} acting={acting} reload={() => load("help_articles")} />}
      {!loading && data && tab === "marketing" && <MarketingPanel data={data} post={post} acting={acting} />}
      {!loading && data && tab === "deposit" && <DepositPanel data={data} post={post} acting={acting} />}
    </div>
  );
}

function KycPanel({ data, post, acting, reload }: any) {
  const { t } = useLanguage();
  const [reason, setReason] = useState("");
  const items = data.verifications || [];
  return (
    <div className="np-admin-extras-section">
      <h3><ShieldCheck size={16} /> {t("aext_kyc_title").replace("{n}", String(items.length))}</h3>
      {items.length === 0 && <p className="np-admin-extras-empty">{t("aext_no_verification")}</p>}
      <div className="np-admin-extras-list">
        {items.map((v: any) => (
          <div key={v.id} className="np-admin-extras-card">
            <div className="np-admin-extras-card-row">
              <strong>{v.user_name || `#${v.user_id}`}</strong>
              <span className={`np-badge ${v.status === "approved" ? "success" : v.status === "rejected" ? "danger" : ""}`}>{v.status}</span>
            </div>
            <div className="np-admin-extras-card-meta">{v.document_type} · {v.user_email} · {v.submitted_at?.slice(0, 10)}</div>
            {v.status === "pending" && (
              <div className="np-admin-extras-card-actions">
                <input className="np-text-input" placeholder={t("aext_reason_optional")} value={reason} onChange={e => setReason(e.target.value)} style={{ maxWidth: 200 }} />
                <button className="np-btn-sm success" disabled={acting} onClick={async () => { await post("review_identity", { id: v.id, status: "approved", reason }); setReason(""); reload(); }}>
                  <CheckCircle2 size={12} /> {t("aext_approve")}
                </button>
                <button className="np-btn-sm danger" disabled={acting} onClick={async () => { await post("review_identity", { id: v.id, status: "rejected", reason }); setReason(""); reload(); }}>
                  <XCircle size={12} /> {t("aext_reject")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenuePanel({ data }: any) {
  const { t } = useLanguage();
  const { currency, convertAmount } = useCurrency();
  const a = data.analytics || {};
  const fmt = (v: number) => {
    const c = convertAmount((v || 0) / 100, "XAF", currency);
    return currency === "XAF"
      ? `${new Intl.NumberFormat("fr-FR").format(Math.round(c))} FCFA`
      : `${c.toFixed(2)} $`;
  };
  return (
    <div className="np-admin-extras-section">
      <h3><TrendingUp size={16} /> {t("aext_revenue_title").replace("{n}", String(a.days || 30))}</h3>
      <div className="np-admin-extras-stat-row">
        <div className="np-admin-extras-stat"><strong>{fmt(a.total)}</strong><small>{t("aext_total")}</small></div>
        <div className="np-admin-extras-stat"><strong>{a.count || 0}</strong><small>{t("aext_operations")}</small></div>
      </div>
      {a.bySource?.length > 0 && (
        <>
          <h4>{t("aext_by_source")}</h4>
          <table className="np-admin-extras-table">
            <thead><tr><th>{t("aext_source")}</th><th>{t("aext_total")}</th><th>{t("aext_count_short")}</th></tr></thead>
            <tbody>{a.bySource.map((r: any) => <tr key={r.source}><td>{r.source}</td><td>{fmt(r.total)}</td><td>{r.count}</td></tr>)}</tbody>
          </table>
        </>
      )}
      {a.byDay?.length > 0 && (
        <>
          <h4>{t("aext_by_day")}</h4>
          <table className="np-admin-extras-table">
            <thead><tr><th>{t("aext_day")}</th><th>{t("aext_total")}</th><th>{t("aext_count_short")}</th></tr></thead>
            <tbody>{a.byDay.map((r: any) => <tr key={r.day}><td>{r.day}</td><td>{fmt(r.total)}</td><td>{r.count}</td></tr>)}</tbody>
          </table>
        </>
      )}
    </div>
  );
}

function LandingPanel({ data, post, acting }: any) {
  const { t } = useLanguage();
  const init = data.sections || data.settings || {};
  const [form, setForm] = useState<any>({
    hero_title: init.hero_title || "", hero_subtitle: init.hero_subtitle || "",
    hero_cta_text: init.hero_cta_text || "", contact_email: init.contact_email || "",
    contact_phone: init.contact_phone || "", primary_color: init.primary_color || "#6366f1",
    secondary_color: init.secondary_color || "#8b5cf6",
  });
  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));
  return (
    <div className="np-admin-extras-section">
      <h3><Globe size={16} /> Landing Page CMS</h3>
      <div className="np-admin-extras-form">
        <label>{t("aext_hero_title_label")}<input className="np-text-input" value={form.hero_title} onChange={e => set("hero_title", e.target.value)} /></label>
        <label>{t("aext_hero_subtitle_label")}<input className="np-text-input" value={form.hero_subtitle} onChange={e => set("hero_subtitle", e.target.value)} /></label>
        <label>{t("aext_cta_text_label")}<input className="np-text-input" value={form.hero_cta_text} onChange={e => set("hero_cta_text", e.target.value)} /></label>
        <label>{t("aext_contact_email_label")}<input className="np-text-input" value={form.contact_email} onChange={e => set("contact_email", e.target.value)} /></label>
        <label>{t("aext_phone_label")}<input className="np-text-input" value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)} /></label>
        <div className="np-admin-extras-color-row">
          <label>{t("aext_primary_color_label")}<input type="color" value={form.primary_color} onChange={e => set("primary_color", e.target.value)} /></label>
          <label>{t("aext_secondary_color_label")}<input type="color" value={form.secondary_color} onChange={e => set("secondary_color", e.target.value)} /></label>
        </div>
        <button className="np-primary-button" disabled={acting} onClick={() => post("update_landing_cms", form)}>{t("aext_save")}</button>
      </div>
    </div>
  );
}

function WebhooksPanel({ data, post, acting, reload }: any) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [destUrl, setDestUrl] = useState("");
  const [destRelayId, setDestRelayId] = useState<number | null>(null);
  const relays = data.relays || [];
  return (
    <div className="np-admin-extras-section">
      <h3><Webhook size={16} /> Webhook Relays ({relays.length})</h3>
      <div className="np-admin-extras-inline-form">
        <input className="np-text-input" placeholder={t("aext_relay_name_ph")} value={name} onChange={e => setName(e.target.value)} />
        <button className="np-primary-button" disabled={acting || !name.trim()} onClick={async () => { await post("create_webhook_relay", { name }); setName(""); reload(); }}>
          <Plus size={14} /> {t("aext_create")}
        </button>
      </div>
      <div className="np-admin-extras-list">
        {relays.map((r: any) => (
          <div key={r.id} className="np-admin-extras-card">
            <div className="np-admin-extras-card-row">
              <strong>{r.name}</strong>
              <span className={`np-badge ${r.is_active ? "success" : ""}`}>{r.is_active ? t("aext_active") : t("aext_inactive")}</span>
              <button className="np-btn-sm danger" disabled={acting} onClick={async () => { if (confirm(t("aext_confirm_delete_relay"))) { await post("delete_webhook_relay", { id: r.id }); reload(); } }}>
                <Trash2 size={12} />
              </button>
            </div>
            <div className="np-admin-extras-card-meta">ID: {r.public_id} · Token: {r.token?.slice(0, 8)}…</div>
            {destRelayId === r.id ? (
              <div className="np-admin-extras-inline-form">
                <input className="np-text-input" placeholder={t("aext_dest_url_ph")} value={destUrl} onChange={e => setDestUrl(e.target.value)} />
                <button className="np-btn-sm success" disabled={acting || !destUrl.trim()} onClick={async () => { await post("add_webhook_destination", { relay_id: r.id, url: destUrl }); setDestUrl(""); setDestRelayId(null); reload(); }}>{t("aext_add")}</button>
                <button className="np-btn-sm" onClick={() => setDestRelayId(null)}>{t("aext_cancel")}</button>
              </div>
            ) : (
              <button className="np-outline-button" style={{ marginTop: 6, fontSize: 12 }} onClick={() => setDestRelayId(r.id)}><Plus size={12} /> {t("aext_destination")}</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CardsPanel({ data, post, acting, reload }: any) {
  const { t } = useLanguage();
  const settings = data.settings || {};
  const [provider, setProvider] = useState(settings.active_provider || "sandbox");
  const [maxCards, setMaxCards] = useState(settings.max_cards_per_user || 3);
  const [terms, setTerms] = useState<any[]>([]);
  const [termsLoaded, setTermsLoaded] = useState(false);

  const loadTerminations = async () => {
    try {
      const res = await fetch("/api/admin?section=card_terminations");
      const json = await res.json();
      if (json.success) { setTerms(json.requests || []); setTermsLoaded(true); }
    } catch {}
  };

  useEffect(() => { loadTerminations(); }, []);

  return (
    <div className="np-admin-extras-section">
      <h3><CreditCard size={16} /> {t("aext_card_issuing_title")}</h3>
      <div className="np-admin-extras-form">
        <label>{t("aext_active_provider")}
          <select className="np-text-input" value={provider} onChange={e => setProvider(e.target.value)}>
            <option value="sandbox">Sandbox</option><option value="maplerad">Maplerad</option><option value="ziiropay">ZiiroPay</option>
          </select>
        </label>
        <label>{t("aext_max_cards_label")}<input type="number" className="np-text-input" value={maxCards} onChange={e => setMaxCards(Number(e.target.value))} min={1} max={10} /></label>
        <button className="np-primary-button" disabled={acting} onClick={() => post("update_card_issuing", { active_provider: provider, max_cards_per_user: maxCards })}>{t("aext_save")}</button>
      </div>

      <h3 style={{ marginTop: 24 }}>{t("aext_termination_title").replace("{n}", String(terms.length))}</h3>
      {terms.length === 0 && <p className="np-admin-extras-empty">{t("aext_no_request")}</p>}
      <div className="np-admin-extras-list">
        {terms.map((tx: any) => (
          <div key={tx.id} className="np-admin-extras-card">
            <div className="np-admin-extras-card-row">
              <strong>{tx.user_name || `#${tx.user_id}`}</strong>
              <span className={`np-badge ${tx.status === "approved" ? "success" : tx.status === "rejected" ? "danger" : ""}`}>{tx.status}</span>
            </div>
            <div className="np-admin-extras-card-meta">{t("aext_card_word")} {tx.card_number || `#${tx.card_id}`} · {tx.reason || "—"}</div>
            {tx.status === "pending" && (
              <div className="np-admin-extras-card-actions">
                <button className="np-btn-sm success" disabled={acting} onClick={async () => { await post("review_card_termination", { id: tx.id, status: "approved" }); loadTerminations(); }}>
                  <CheckCircle2 size={12} /> {t("aext_approve")}
                </button>
                <button className="np-btn-sm danger" disabled={acting} onClick={async () => { await post("review_card_termination", { id: tx.id, status: "rejected" }); loadTerminations(); }}>
                  <XCircle size={12} /> {t("aext_reject")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HelpPanel({ data, post, acting, reload }: any) {
  const { t } = useLanguage();
  const articles = data.articles || [];
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", slug: "", category: "general", content: "", excerpt: "", is_active: 1 as number });

  const startEdit = (a?: any) => {
    if (a) {
      setForm({ title: a.title, slug: a.slug, category: a.category, content: a.content, excerpt: a.excerpt || "", is_active: a.is_active });
      setEditing(a);
    } else {
      setForm({ title: "", slug: "", category: "general", content: "", excerpt: "", is_active: 1 });
      setEditing({ id: 0 });
    }
  };

  const save = async () => {
    const payload = editing?.id ? { ...form, id: editing.id } : form;
    await post("save_help_article", payload);
    setEditing(null);
    reload();
  };

  if (editing) {
    return (
      <div className="np-admin-extras-section">
        <h3><HelpCircle size={16} /> {editing.id ? t("aext_modify") : t("aext_new_m")} {t("aext_article_word")}</h3>
        <div className="np-admin-extras-form">
          <label>{t("aext_title_label")}<input className="np-text-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></label>
          <label>Slug<input className="np-text-input" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} /></label>
          <label>{t("aext_category_label")}<input className="np-text-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></label>
          <label>{t("aext_excerpt_label")}<input className="np-text-input" value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} /></label>
          <label>{t("aext_content_label")}<textarea className="np-text-input" rows={6} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} /></label>
          <label className="np-admin-extras-toggle"><input type="checkbox" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked ? 1 : 0 }))} /> {t("aext_active")}</label>
          <div className="np-admin-extras-card-actions">
            <button className="np-primary-button" disabled={acting || !form.title || !form.slug || !form.content} onClick={save}>{t("aext_save")}</button>
            <button className="np-outline-button" onClick={() => setEditing(null)}>{t("aext_cancel")}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="np-admin-extras-section">
      <div className="np-admin-extras-section-header">
        <h3><HelpCircle size={16} /> {t("aext_help_articles_title").replace("{n}", String(articles.length))}</h3>
        <button className="np-primary-button" onClick={() => startEdit()}><Plus size={14} /> {t("aext_new")}</button>
      </div>
      <div className="np-admin-extras-list">
        {articles.map((a: any) => (
          <div key={a.id} className="np-admin-extras-card">
            <div className="np-admin-extras-card-row">
              <strong>{a.title}</strong>
              <span className="np-badge">{a.category}</span>
              <span className={`np-badge ${a.is_active ? "success" : "danger"}`}>{a.is_active ? t("aext_active") : t("aext_inactive")}</span>
              <button className="np-btn-sm" onClick={() => startEdit(a)}><Edit size={12} /></button>
              <button className="np-btn-sm danger" disabled={acting} onClick={async () => { if (confirm(t("aext_confirm_delete"))) { await post("delete_help_article", { id: a.id }); reload(); } }}>
                <Trash2 size={12} />
              </button>
            </div>
            <div className="np-admin-extras-card-meta">{a.slug} · {t("aext_views_count").replace("{n}", String(a.views))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketingPanel({ data, post, acting }: any) {
  const { t } = useLanguage();
  const s = data.settings || {};
  const [form, setForm] = useState({
    facebook_pixel_id: s.facebook_pixel_id || "", google_analytics_id: s.google_analytics_id || "",
    google_tag_manager_id: s.google_tag_manager_id || "", tiktok_pixel_id: s.tiktok_pixel_id || "",
    is_active: s.is_active || 0,
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="np-admin-extras-section">
      <h3><Megaphone size={16} /> {t("aext_marketing_title")}</h3>
      <div className="np-admin-extras-form">
        <label>Facebook Pixel ID<input className="np-text-input" value={form.facebook_pixel_id} onChange={e => set("facebook_pixel_id", e.target.value)} /></label>
        <label>Google Analytics ID<input className="np-text-input" value={form.google_analytics_id} onChange={e => set("google_analytics_id", e.target.value)} /></label>
        <label>Google Tag Manager ID<input className="np-text-input" value={form.google_tag_manager_id} onChange={e => set("google_tag_manager_id", e.target.value)} /></label>
        <label>TikTok Pixel ID<input className="np-text-input" value={form.tiktok_pixel_id} onChange={e => set("tiktok_pixel_id", e.target.value)} /></label>
        <label className="np-admin-extras-toggle"><input type="checkbox" checked={!!form.is_active} onChange={e => set("is_active", e.target.checked ? 1 : 0)} /> {t("aext_active")}</label>
        <button className="np-primary-button" disabled={acting} onClick={() => post("update_marketing", form)}>{t("aext_save")}</button>
      </div>
    </div>
  );
}

function DepositPanel({ data, post, acting }: any) {
  const { t } = useLanguage();
  const s = data.settings || {};
  const [form, setForm] = useState({
    title: s.title || "", message: s.message || "", video_url: s.video_url || "",
    is_active: s.is_active || 0, show_after_seconds: s.show_after_seconds || 30,
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="np-admin-extras-section">
      <h3><Banknote size={16} /> {t("aext_deposit_title")}</h3>
      <div className="np-admin-extras-form">
        <label>{t("aext_title_label")}<input className="np-text-input" value={form.title} onChange={e => set("title", e.target.value)} /></label>
        <label>{t("aext_message_label")}<textarea className="np-text-input" rows={3} value={form.message} onChange={e => set("message", e.target.value)} /></label>
        <label>{t("aext_video_url_label")}<input className="np-text-input" value={form.video_url} onChange={e => set("video_url", e.target.value)} /></label>
        <label>{t("aext_delay_label")}<input type="number" className="np-text-input" value={form.show_after_seconds} onChange={e => set("show_after_seconds", Number(e.target.value))} min={0} /></label>
        <label className="np-admin-extras-toggle"><input type="checkbox" checked={!!form.is_active} onChange={e => set("is_active", e.target.checked ? 1 : 0)} /> {t("aext_active")}</label>
        <button className="np-primary-button" disabled={acting} onClick={() => post("update_deposit_help", form)}>{t("aext_save")}</button>
      </div>
    </div>
  );
}
