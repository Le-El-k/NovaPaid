"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/app/lib/i18n";
import { useCurrency } from "@/app/lib/currency";
import {
  Check, ChevronDown, Edit2, Eye, EyeOff, Filter, Loader2,
  MessageSquare, Package, Plus, RefreshCw, Search, Tag, Trash2,
  X, ToggleLeft, ToggleRight, Settings, List,
} from "lucide-react";

type MktSubTab = "categories" | "articles" | "commandes";

const SUB_TABS: { key: MktSubTab; labelKey: string; icon: any }[] = [
  { key: "categories", labelKey: "amkt_tab_categories", icon: Tag },
  { key: "articles", labelKey: "amkt_tab_articles", icon: Package },
  { key: "commandes", labelKey: "amkt_tab_commandes", icon: List },
];

export function AdminMarketplace({ adminId }: { adminId: number }) {
  const { t } = useLanguage();
  const [subTab, setSubTab] = useState<MktSubTab>("categories");
  const [notification, setNotification] = useState<string | null>(null);
  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

  return (
    <div className="np-admin-fees">
      {notification && <div className="np-admin-fees-toast"><Check size={14} /> {notification}</div>}
      <div className="np-admin-fees-tabs">
        {SUB_TABS.map(({ key, labelKey, icon: Icon }) => (
          <button key={key} type="button" className={`np-admin-fees-tab ${subTab === key ? "active" : ""}`} onClick={() => setSubTab(key)}>
            <Icon size={15} /> <span>{t(labelKey)}</span>
          </button>
        ))}
      </div>
      <div className="np-admin-fees-content">
        {subTab === "categories" && <CategoriesPanel notify={notify} />}
        {subTab === "articles" && <ArticlesPanel notify={notify} adminId={adminId} />}
        {subTab === "commandes" && <CommandesPanel notify={notify} />}
      </div>
    </div>
  );
}

async function adminAction(action: string, payload: any = {}) {
  const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Erreur");
  return json;
}
async function adminGet(section: string, params?: Record<string, string>) {
  const p = new URLSearchParams({ section, ...params });
  const res = await fetch(`/api/admin?${p}`);
  return res.json();
}

// ══════════════════════════════════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════════════════════════════════

function CategoriesPanel({ notify }: { notify: (m: string) => void }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", is_active: 1 });
  const [editing, setEditing] = useState<any>(null);
  const [expandedCat, setExpandedCat] = useState<number | null>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [fieldForm, setFieldForm] = useState({ field_name: "", field_type: "text", field_label: "", is_required: 0, options: "", sort_order: "0" });
  const [showFieldForm, setShowFieldForm] = useState(false);

  const refresh = async () => { setLoading(true); const r = await adminGet("marketplace_categories"); if (r.success) setItems(r.categories); setLoading(false); };
  useEffect(() => { refresh(); }, []);

  const resetForm = () => { setForm({ name: "", description: "", is_active: 1 }); setEditing(null); setShowForm(false); };

  const startEdit = (item: any) => {
    setForm({ name: item.name, description: item.description || "", is_active: item.is_active });
    setEditing(item);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (editing) await adminAction("update_category", { id: editing.id, data: form });
      else await adminAction("create_category", { data: form });
      notify(editing ? t("amkt_cat_updated") : t("amkt_cat_created"));
      resetForm();
      refresh();
    } catch (e: any) { notify(t("amkt_error_prefix") + e.message); }
  };

  const loadFields = async (catId: number) => {
    if (expandedCat === catId) { setExpandedCat(null); return; }
    setExpandedCat(catId);
    try {
      const r = await adminGet("marketplace_categories");
      // fields are loaded via a separate call if needed
      // For now we fetch all categories — fields are part of article detail
    } catch {}
  };

  return (
    <div>
      <div className="np-admin-fees-header">
        <h3>{t("amkt_cat_title")}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="np-admin-fees-refresh" onClick={refresh}><RefreshCw size={14} /></button>
          <button type="button" className="np-admin-fees-add" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={14} /> {t("amkt_add")}</button>
        </div>
      </div>

      {showForm && (
        <div className="np-admin-fees-form">
          <div className="np-admin-fees-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="np-form-group"><label className="np-form-label">{t("amkt_name")}</label><input className="np-text-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="np-form-group"><label className="np-form-label">{t("amkt_description")}</label><input className="np-text-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="np-form-group"><label className="np-form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={!!form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} style={{ accentColor: "#00d4aa" }} /> {t("amkt_active")}</label></div>
          </div>
          <div className="np-admin-fees-form-actions">
            <button type="button" className="np-secondary-button" onClick={resetForm}><X size={14} /> {t("amkt_cancel")}</button>
            <button type="button" className="np-primary-button" onClick={handleSave} disabled={!form.name}><Check size={14} /> {editing ? t("amkt_edit") : t("amkt_create")}</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ opacity: 0.5 }}>{t("amkt_loading")}</p> : (
        <div className="np-admin-fees-table-wrap">
          <table className="np-admin-fees-table">
            <thead><tr><th>{t("amkt_name")}</th><th>{t("amkt_description")}</th><th>{t("amkt_active")}</th><th>{t("amkt_th_actions")}</th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={4} className="np-admin-fees-empty">{t("amkt_no_categories")}</td></tr>}
              {items.map((item: any) => (
                <tr key={item.id}>
                  <td className="font-medium">{item.name}</td>
                  <td style={{ opacity: 0.5 }}>{item.description || "—"}</td>
                  <td>{item.is_active ? <Eye size={14} style={{ color: "#00d4aa" }} /> : <EyeOff size={14} style={{ opacity: 0.3 }} />}</td>
                  <td className="np-admin-fees-actions">
                    <button type="button" onClick={() => startEdit(item)}><Edit2 size={14} /></button>
                    <button type="button" onClick={() => { if (confirm(t("amkt_confirm_delete"))) { adminAction("delete_category", { id: item.id }).then(refresh); notify(t("amkt_deleted_f")); } }}><Trash2 size={14} /></button>
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

// ══════════════════════════════════════════════════════════════════
// ARTICLES
// ══════════════════════════════════════════════════════════════════

function ArticlesPanel({ notify, adminId }: { notify: (m: string) => void; adminId: number }) {
  const { t } = useLanguage();
  const { currency, convertAmount } = useCurrency();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", description: "", plan_name: "", plan_description: "",
    price: "0", image: "", quantity: "0", categorie_id: "", sort_order: "0",
    offer_is_active: 0,
  });

  const refresh = async () => {
    setLoading(true);
    const [artRes, catRes] = await Promise.all([adminGet("marketplace_articles"), adminGet("marketplace_categories")]);
    if (artRes.success) setItems(artRes.articles);
    if (catRes.success) setCategories(catRes.categories);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const resetForm = () => {
    setForm({ title: "", description: "", plan_name: "", plan_description: "", price: "0", image: "", quantity: "0", categorie_id: "", sort_order: "0", offer_is_active: 0 });
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (item: any) => {
    setForm({
      title: item.title, description: item.description || "", plan_name: item.plan_name || "",
      plan_description: item.plan_description || "", price: String(item.price), image: item.image || "",
      quantity: String(item.quantity), categorie_id: item.categorie_id ? String(item.categorie_id) : "",
      sort_order: String(item.sort_order), offer_is_active: item.offer_is_active,
    });
    setEditing(item);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const data = {
        ...form, price: Number(form.price), quantity: Number(form.quantity),
        quantity_remaining: editing ? undefined : Number(form.quantity),
        categorie_id: form.categorie_id ? Number(form.categorie_id) : null,
        sort_order: Number(form.sort_order),
      };
      if (editing) await adminAction("update_article", { id: editing.id, data });
      else await adminAction("create_article", { data });
      notify(editing ? t("amkt_article_updated") : t("amkt_article_created"));
      resetForm();
      refresh();
    } catch (e: any) { notify(t("amkt_error_prefix") + e.message); }
  };

  const fmtPrice = (p: number) => {
    const c = convertAmount(p || 0, "XAF", currency);
    return currency === "XAF"
      ? `${Math.round(c).toLocaleString("fr-FR")} FCFA`
      : `${c.toFixed(2)} $`;
  };

  return (
    <div>
      <div className="np-admin-fees-header">
        <h3>{t("amkt_articles_title")}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="np-admin-fees-refresh" onClick={refresh}><RefreshCw size={14} /></button>
          <button type="button" className="np-admin-fees-add" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={14} /> {t("amkt_add")}</button>
        </div>
      </div>

      {showForm && (
        <div className="np-admin-fees-form">
          <div className="np-admin-fees-form-grid">
            <div className="np-form-group"><label className="np-form-label">{t("amkt_title_label")}</label><input className="np-text-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="np-form-group"><label className="np-form-label">{t("amkt_category")}</label>
              <select className="np-text-input" value={form.categorie_id} onChange={e => setForm({ ...form, categorie_id: e.target.value })}>
                <option value="">{t("amkt_none")}</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="np-form-group"><label className="np-form-label">{t("amkt_price_fcfa")}</label><input className="np-text-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
            <div className="np-form-group"><label className="np-form-label">{t("amkt_quantity")}</label><input className="np-text-input" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
            <div className="np-form-group"><label className="np-form-label">{t("amkt_plan_name")}</label><input className="np-text-input" value={form.plan_name} onChange={e => setForm({ ...form, plan_name: e.target.value })} placeholder={t("amkt_optional")} /></div>
            <div className="np-form-group"><label className="np-form-label">{t("amkt_image_url")}</label><input className="np-text-input" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} /></div>
            <div className="np-form-group" style={{ gridColumn: "span 2" }}><label className="np-form-label">{t("amkt_description")}</label><textarea className="np-text-input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: "vertical" }} /></div>
            <div className="np-form-group"><label className="np-form-label">{t("amkt_sort_order")}</label><input className="np-text-input" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} /></div>
            <div className="np-form-group"><label className="np-form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={!!form.offer_is_active} onChange={e => setForm({ ...form, offer_is_active: e.target.checked ? 1 : 0 })} style={{ accentColor: "#00d4aa" }} /> {t("amkt_on_promo")}</label></div>
          </div>
          <div className="np-admin-fees-form-actions">
            <button type="button" className="np-secondary-button" onClick={resetForm}><X size={14} /> {t("amkt_cancel")}</button>
            <button type="button" className="np-primary-button" onClick={handleSave} disabled={!form.title || Number(form.price) <= 0}><Check size={14} /> {editing ? t("amkt_edit") : t("amkt_create")}</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ opacity: 0.5 }}>{t("amkt_loading")}</p> : (
        <div className="np-admin-fees-table-wrap">
          <table className="np-admin-fees-table">
            <thead><tr><th>{t("amkt_th_image")}</th><th>{t("amkt_title_label")}</th><th>{t("amkt_category")}</th><th>{t("amkt_th_price")}</th><th>{t("amkt_th_stock")}</th><th>{t("amkt_th_active")}</th><th>{t("amkt_th_promo")}</th><th>{t("amkt_th_actions")}</th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={8} className="np-admin-fees-empty">{t("amkt_no_articles")}</td></tr>}
              {items.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.image ? <img src={item.image} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} /> : "—"}</td>
                  <td className="font-medium">{item.title}</td>
                  <td><span className="np-admin-fees-badge">{item.category_name || "—"}</span></td>
                  <td>{fmtPrice(item.price)}</td>
                  <td>{item.quantity > 0 ? `${item.quantity_remaining}/${item.quantity}` : "∞"}</td>
                  <td>
                    <button type="button" className={`np-admin-fees-toggle ${item.is_active ? "on" : "off"}`}
                      onClick={() => { adminAction("update_article", { id: item.id, data: { is_active: item.is_active ? 0 : 1 } }).then(refresh); }}>
                      {item.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                  </td>
                  <td>{item.offer_is_active ? "✓" : ""}</td>
                  <td className="np-admin-fees-actions">
                    <button type="button" onClick={() => startEdit(item)}><Edit2 size={14} /></button>
                    <button type="button" onClick={() => { if (confirm(t("amkt_confirm_delete_article"))) { adminAction("delete_article", { id: item.id }).then(refresh); notify(t("amkt_deleted_m")); } }}><Trash2 size={14} /></button>
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

// ══════════════════════════════════════════════════════════════════
// COMMANDES
// ══════════════════════════════════════════════════════════════════

function CommandesPanel({ notify }: { notify: (m: string) => void }) {
  const { t } = useLanguage();
  const { currency, convertAmount } = useCurrency();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [total, setTotal] = useState(0);

  const refresh = async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filterStatus) params.status = filterStatus;
    const r = await adminGet("marketplace_commandes", params);
    if (r.success) { setItems(r.items); setTotal(r.total); }
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [filterStatus]);

  const fmtPrice = (p: number) => {
    const c = convertAmount(p || 0, "XAF", currency);
    return currency === "XAF"
      ? `${Math.round(c).toLocaleString("fr-FR")} FCFA`
      : `${c.toFixed(2)} $`;
  };

  const statusColors: Record<string, string> = {
    pending: "#f59e0b", paid: "#3b82f6", processing: "#8b5cf6",
    delivered: "#10b981", completed: "#00d4aa", refunded: "#ef4444", cancelled: "#6b7280",
  };
  const statusLabels: Record<string, string> = {
    pending: t("amkt_status_pending"), paid: t("amkt_status_paid"), processing: t("amkt_status_processing"),
    delivered: t("amkt_status_delivered"), completed: t("amkt_status_completed"), refunded: t("amkt_status_refunded"), cancelled: t("amkt_status_cancelled"),
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await adminAction("update_commande_status", { id, status });
      notify(`${t("amkt_order_notif").replace("{n}", String(id))} ${statusLabels[status] || status}`);
      refresh();
    } catch (e: any) { notify(t("amkt_error_prefix") + e.message); }
  };

  return (
    <div>
      <div className="np-admin-fees-header">
        <h3>{t("amkt_orders_title")} ({total})</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select className="np-text-input" style={{ width: 140, fontSize: 12 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">{t("amkt_all_statuses")}</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button type="button" className="np-admin-fees-refresh" onClick={refresh}><RefreshCw size={14} /></button>
        </div>
      </div>

      {loading ? <p style={{ opacity: 0.5 }}>{t("amkt_loading")}</p> : (
        <div className="np-admin-fees-table-wrap">
          <table className="np-admin-fees-table">
            <thead><tr><th>#</th><th>{t("amkt_th_client")}</th><th>{t("amkt_th_article")}</th><th>{t("amkt_th_qty")}</th><th>{t("amkt_th_total")}</th><th>{t("amkt_th_payment")}</th><th>{t("amkt_th_status")}</th><th>{t("amkt_th_date")}</th><th>{t("amkt_th_actions")}</th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={9} className="np-admin-fees-empty">{t("amkt_no_commandes")}</td></tr>}
              {items.map((cmd: any) => (
                <tr key={cmd.id}>
                  <td>#{cmd.id}</td>
                  <td style={{ fontSize: 12 }}>{cmd.user_name || "—"}<br /><span style={{ opacity: 0.4 }}>{cmd.user_email}</span></td>
                  <td className="font-medium" style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cmd.article_title_snapshot || cmd.article_title_live || "—"}</td>
                  <td>{cmd.quantity}</td>
                  <td>{fmtPrice(cmd.unit_price * cmd.quantity)}</td>
                  <td><span className="np-admin-fees-badge">{cmd.payment_method || "—"}</span></td>
                  <td>
                    <span className="np-admin-fees-badge" style={{ borderColor: statusColors[cmd.status], color: statusColors[cmd.status] }}>
                      {statusLabels[cmd.status] || cmd.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, whiteSpace: "nowrap" }}>{new Date(cmd.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="np-admin-fees-actions">
                    {cmd.status === "pending" && <button type="button" onClick={() => updateStatus(cmd.id, "paid")} title={t("amkt_confirm_payment")} style={{ color: "#3b82f6" }}>✓</button>}
                    {(cmd.status === "paid" || cmd.status === "processing") && <button type="button" onClick={() => updateStatus(cmd.id, "delivered")} title={t("amkt_mark_delivered")} style={{ color: "#10b981" }}>📦</button>}
                    {cmd.status !== "refunded" && cmd.status !== "cancelled" && <button type="button" onClick={() => { if (confirm(t("amkt_confirm_refund"))) updateStatus(cmd.id, "refunded"); }} title={t("amkt_refund")} style={{ color: "#ef4444" }}>↩</button>}
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
