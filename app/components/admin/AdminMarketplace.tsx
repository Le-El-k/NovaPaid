"use client";

import { useEffect, useState } from "react";
import {
  Check, ChevronDown, Edit2, Eye, EyeOff, Filter, Loader2,
  MessageSquare, Package, Plus, RefreshCw, Search, Tag, Trash2,
  X, ToggleLeft, ToggleRight, Settings, List,
} from "lucide-react";

type MktSubTab = "categories" | "articles" | "commandes";

const SUB_TABS: { key: MktSubTab; label: string; icon: any }[] = [
  { key: "categories", label: "Catégories", icon: Tag },
  { key: "articles", label: "Articles", icon: Package },
  { key: "commandes", label: "Commandes", icon: List },
];

export function AdminMarketplace({ adminId }: { adminId: number }) {
  const [subTab, setSubTab] = useState<MktSubTab>("categories");
  const [notification, setNotification] = useState<string | null>(null);
  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

  return (
    <div className="np-admin-fees">
      {notification && <div className="np-admin-fees-toast"><Check size={14} /> {notification}</div>}
      <div className="np-admin-fees-tabs">
        {SUB_TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" className={`np-admin-fees-tab ${subTab === key ? "active" : ""}`} onClick={() => setSubTab(key)}>
            <Icon size={15} /> <span>{label}</span>
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
      notify(editing ? "Catégorie modifiée" : "Catégorie créée");
      resetForm();
      refresh();
    } catch (e: any) { notify("Erreur: " + e.message); }
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
        <h3>Catégories Marketplace</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="np-admin-fees-refresh" onClick={refresh}><RefreshCw size={14} /></button>
          <button type="button" className="np-admin-fees-add" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={14} /> Ajouter</button>
        </div>
      </div>

      {showForm && (
        <div className="np-admin-fees-form">
          <div className="np-admin-fees-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="np-form-group"><label className="np-form-label">Nom</label><input className="np-text-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="np-form-group"><label className="np-form-label">Description</label><input className="np-text-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="np-form-group"><label className="np-form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={!!form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} style={{ accentColor: "#00d4aa" }} /> Active</label></div>
          </div>
          <div className="np-admin-fees-form-actions">
            <button type="button" className="np-secondary-button" onClick={resetForm}><X size={14} /> Annuler</button>
            <button type="button" className="np-primary-button" onClick={handleSave} disabled={!form.name}><Check size={14} /> {editing ? "Modifier" : "Créer"}</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ opacity: 0.5 }}>Chargement...</p> : (
        <div className="np-admin-fees-table-wrap">
          <table className="np-admin-fees-table">
            <thead><tr><th>Nom</th><th>Description</th><th>Active</th><th>Actions</th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={4} className="np-admin-fees-empty">Aucune catégorie</td></tr>}
              {items.map((item: any) => (
                <tr key={item.id}>
                  <td className="font-medium">{item.name}</td>
                  <td style={{ opacity: 0.5 }}>{item.description || "—"}</td>
                  <td>{item.is_active ? <Eye size={14} style={{ color: "#00d4aa" }} /> : <EyeOff size={14} style={{ opacity: 0.3 }} />}</td>
                  <td className="np-admin-fees-actions">
                    <button type="button" onClick={() => startEdit(item)}><Edit2 size={14} /></button>
                    <button type="button" onClick={() => { if (confirm("Supprimer ?")) { adminAction("delete_category", { id: item.id }).then(refresh); notify("Supprimée"); } }}><Trash2 size={14} /></button>
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
      notify(editing ? "Article modifié" : "Article créé");
      resetForm();
      refresh();
    } catch (e: any) { notify("Erreur: " + e.message); }
  };

  const fmtPrice = (p: number) => `${Math.round(p).toLocaleString("fr-FR")} FCFA`;

  return (
    <div>
      <div className="np-admin-fees-header">
        <h3>Articles Marketplace</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="np-admin-fees-refresh" onClick={refresh}><RefreshCw size={14} /></button>
          <button type="button" className="np-admin-fees-add" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={14} /> Ajouter</button>
        </div>
      </div>

      {showForm && (
        <div className="np-admin-fees-form">
          <div className="np-admin-fees-form-grid">
            <div className="np-form-group"><label className="np-form-label">Titre</label><input className="np-text-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="np-form-group"><label className="np-form-label">Catégorie</label>
              <select className="np-text-input" value={form.categorie_id} onChange={e => setForm({ ...form, categorie_id: e.target.value })}>
                <option value="">Aucune</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="np-form-group"><label className="np-form-label">Prix (FCFA)</label><input className="np-text-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
            <div className="np-form-group"><label className="np-form-label">Quantité (0 = illimité)</label><input className="np-text-input" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
            <div className="np-form-group"><label className="np-form-label">Nom du plan</label><input className="np-text-input" value={form.plan_name} onChange={e => setForm({ ...form, plan_name: e.target.value })} placeholder="Optionnel" /></div>
            <div className="np-form-group"><label className="np-form-label">Image URL</label><input className="np-text-input" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} /></div>
            <div className="np-form-group" style={{ gridColumn: "span 2" }}><label className="np-form-label">Description</label><textarea className="np-text-input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: "vertical" }} /></div>
            <div className="np-form-group"><label className="np-form-label">Ordre d'affichage</label><input className="np-text-input" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} /></div>
            <div className="np-form-group"><label className="np-form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={!!form.offer_is_active} onChange={e => setForm({ ...form, offer_is_active: e.target.checked ? 1 : 0 })} style={{ accentColor: "#00d4aa" }} /> En promotion</label></div>
          </div>
          <div className="np-admin-fees-form-actions">
            <button type="button" className="np-secondary-button" onClick={resetForm}><X size={14} /> Annuler</button>
            <button type="button" className="np-primary-button" onClick={handleSave} disabled={!form.title || Number(form.price) <= 0}><Check size={14} /> {editing ? "Modifier" : "Créer"}</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ opacity: 0.5 }}>Chargement...</p> : (
        <div className="np-admin-fees-table-wrap">
          <table className="np-admin-fees-table">
            <thead><tr><th>Image</th><th>Titre</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>Actif</th><th>Promo</th><th>Actions</th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={8} className="np-admin-fees-empty">Aucun article</td></tr>}
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
                    <button type="button" onClick={() => { if (confirm("Supprimer cet article ?")) { adminAction("delete_article", { id: item.id }).then(refresh); notify("Supprimé"); } }}><Trash2 size={14} /></button>
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

  const fmtPrice = (p: number) => `${Math.round(p).toLocaleString("fr-FR")} FCFA`;

  const statusColors: Record<string, string> = {
    pending: "#f59e0b", paid: "#3b82f6", processing: "#8b5cf6",
    delivered: "#10b981", completed: "#00d4aa", refunded: "#ef4444", cancelled: "#6b7280",
  };
  const statusLabels: Record<string, string> = {
    pending: "En attente", paid: "Payée", processing: "En traitement",
    delivered: "Livrée", completed: "Terminée", refunded: "Remboursée", cancelled: "Annulée",
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await adminAction("update_commande_status", { id, status });
      notify(`Commande #${id} → ${statusLabels[status] || status}`);
      refresh();
    } catch (e: any) { notify("Erreur: " + e.message); }
  };

  return (
    <div>
      <div className="np-admin-fees-header">
        <h3>Commandes Marketplace ({total})</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select className="np-text-input" style={{ width: 140, fontSize: 12 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button type="button" className="np-admin-fees-refresh" onClick={refresh}><RefreshCw size={14} /></button>
        </div>
      </div>

      {loading ? <p style={{ opacity: 0.5 }}>Chargement...</p> : (
        <div className="np-admin-fees-table-wrap">
          <table className="np-admin-fees-table">
            <thead><tr><th>#</th><th>Client</th><th>Article</th><th>Qté</th><th>Total</th><th>Paiement</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={9} className="np-admin-fees-empty">Aucune commande</td></tr>}
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
                    {cmd.status === "pending" && <button type="button" onClick={() => updateStatus(cmd.id, "paid")} title="Confirmer paiement" style={{ color: "#3b82f6" }}>✓</button>}
                    {(cmd.status === "paid" || cmd.status === "processing") && <button type="button" onClick={() => updateStatus(cmd.id, "delivered")} title="Marquer livrée" style={{ color: "#10b981" }}>📦</button>}
                    {cmd.status !== "refunded" && cmd.status !== "cancelled" && <button type="button" onClick={() => { if (confirm("Rembourser cette commande ?")) updateStatus(cmd.id, "refunded"); }} title="Rembourser" style={{ color: "#ef4444" }}>↩</button>}
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
