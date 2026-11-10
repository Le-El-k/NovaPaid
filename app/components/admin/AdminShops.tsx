"use client";

import { useEffect, useState } from "react";
import {
  Check, ChevronRight, Edit3, Eye, EyeOff, Loader2, RefreshCw,
  Settings, ShoppingBag, Store, Trash2, X,
} from "lucide-react";

function adminGet(section: string, params?: Record<string, string>) {
  const q = new URLSearchParams({ section, ...params });
  return fetch(`/api/admin?${q}`).then(r => r.json());
}

function adminAction(action: string, data?: any) {
  return fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  }).then(r => r.json());
}

type ShopSubTab = "shops" | "settings";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "#f59e0b" },
  approved: { label: "Approuvée", color: "#10b981" },
  rejected: { label: "Rejetée", color: "#ef4444" },
};

export function AdminShops() {
  const [subTab, setSubTab] = useState<ShopSubTab>("shops");

  return (
    <div className="np-admin-shops">
      <div className="np-admin-fees-tabs">
        <button type="button" className={subTab === "shops" ? "active" : ""} onClick={() => setSubTab("shops")}><Store size={14} /> Boutiques</button>
        <button type="button" className={subTab === "settings" ? "active" : ""} onClick={() => setSubTab("settings")}><Settings size={14} /> Paramètres</button>
      </div>
      {subTab === "shops" && <ShopsPanel />}
      {subTab === "settings" && <ShopSettingsPanel />}
    </div>
  );
}

// ── Shops List & Management ──

function ShopsPanel() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter) params.status = filter;
      const data = await adminGet("user_shops", params);
      if (data.success) setShops(data.shops || []);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleApprove = async (shopId: number) => {
    const data = await adminAction("approve_shop", { shop_id: shopId });
    if (data.success) { notify("Boutique approuvée"); load(); setSelected(null); }
    else notify(data.error || "Erreur");
  };

  const handleReject = async (shopId: number) => {
    if (!rejectReason.trim()) { notify("Motif de rejet requis"); return; }
    const data = await adminAction("reject_shop", { shop_id: shopId, reason: rejectReason });
    if (data.success) { notify("Boutique rejetée"); setRejectReason(""); setShowRejectForm(false); load(); setSelected(null); }
    else notify(data.error || "Erreur");
  };

  const handleToggleActive = async (shopId: number) => {
    const data = await adminAction("toggle_shop_active", { shop_id: shopId });
    if (data.success) { notify("Statut modifié"); load(); }
    else notify(data.error || "Erreur");
  };

  const handleCommissionChange = async (shopId: number, rate: string) => {
    const data = await adminAction("update_shop_commission", { shop_id: shopId, rate: Number(rate) });
    if (data.success) { notify("Commission mise à jour"); load(); }
    else notify(data.error || "Erreur");
  };

  if (selected) {
    const st = statusLabels[selected.status] || statusLabels.pending;
    return (
      <div className="np-admin-shop-detail">
        {notification && <div className="np-marketplace-toast">{notification}</div>}
        <button type="button" className="np-marketplace-back" onClick={() => { setSelected(null); setShowRejectForm(false); }}>
          <X size={14} /> Fermer
        </button>
        <div className="np-admin-shop-detail-header">
          {selected.logo && <img src={selected.logo} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />}
          <div>
            <h3>{selected.name}</h3>
            <span className="np-marketplace-badge" style={{ borderColor: st.color, color: st.color }}>{st.label}</span>
          </div>
        </div>

        <div className="np-commande-detail-grid">
          <div><small>Propriétaire</small><strong>{selected.owner_name || "—"}</strong></div>
          <div><small>Email</small><strong>{selected.owner_email || "—"}</strong></div>
          <div><small>Slug</small><strong>/{selected.slug}</strong></div>
          <div><small>Téléphone</small><strong>{selected.phone || "—"}</strong></div>
          <div><small>Adresse</small><strong>{selected.address || "—"}</strong></div>
          <div><small>Commission</small><strong>{selected.commission_rate}%</strong></div>
          <div><small>Créée le</small><strong>{new Date(selected.created_at).toLocaleDateString("fr-FR")}</strong></div>
          {selected.approved_at && <div><small>Approuvée le</small><strong>{new Date(selected.approved_at).toLocaleDateString("fr-FR")}</strong></div>}
        </div>
        {selected.description && <div style={{ padding: "12px 0", fontSize: 13, opacity: 0.7 }}>{selected.description}</div>}
        {selected.rejection_reason && <div className="np-myshop-alert np-myshop-alert--danger">Motif : {selected.rejection_reason}</div>}

        <div className="np-admin-shop-detail-actions">
          {selected.status === "pending" && (
            <>
              <button type="button" className="np-primary-button" onClick={() => handleApprove(selected.id)}>
                <Check size={14} /> Approuver
              </button>
              <button type="button" className="np-danger-button" onClick={() => setShowRejectForm(true)}>
                <X size={14} /> Rejeter
              </button>
            </>
          )}
          {selected.status === "approved" && (
            <button type="button" className="np-secondary-button" onClick={() => handleToggleActive(selected.id)}>
              {selected.is_active ? <><EyeOff size={14} /> Désactiver</> : <><Eye size={14} /> Activer</>}
            </button>
          )}
          {selected.status === "approved" && (
            <div className="np-admin-shop-commission">
              <label>Commission (%)</label>
              <input className="np-text-input" type="number" min={0} max={100} defaultValue={selected.commission_rate}
                onBlur={e => { if (e.target.value !== String(selected.commission_rate)) handleCommissionChange(selected.id, e.target.value); }} />
            </div>
          )}
        </div>

        {showRejectForm && (
          <div className="np-admin-shop-reject-form">
            <label>Motif du rejet *</label>
            <textarea className="np-text-input" value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Indiquez la raison du rejet..." />
            <button type="button" className="np-danger-button" onClick={() => handleReject(selected.id)}>Confirmer le rejet</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {notification && <div className="np-marketplace-toast">{notification}</div>}
      <div className="np-marketplace-header">
        <h3>Boutiques utilisateur</h3>
        <button type="button" className="np-admin-fees-refresh" onClick={load}><RefreshCw size={14} /></button>
      </div>

      <div className="np-marketplace-filters">
        {["", "pending", "approved", "rejected"].map(s => (
          <button key={s} type="button" className={`np-marketplace-filter-btn ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>
            {s === "" ? "Toutes" : statusLabels[s]?.label || s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="np-marketplace-loading"><Loader2 size={20} className="animate-spin" /></div>
      ) : shops.length === 0 ? (
        <div className="np-marketplace-empty"><Store size={32} /><p>Aucune boutique.</p></div>
      ) : (
        <div className="np-commandes-list">
          {shops.map(s => {
            const st = statusLabels[s.status] || statusLabels.pending;
            return (
              <button key={s.id} type="button" className="np-commande-row" onClick={() => setSelected(s)}>
                {s.logo && <img src={s.logo} alt="" className="np-commande-row-img" />}
                <div className="np-commande-row-info">
                  <strong>{s.name}</strong>
                  <span style={{ fontSize: 11, opacity: 0.4 }}>{s.owner_name || "—"} · /{s.slug}</span>
                </div>
                <div className="np-commande-row-right">
                  <span className="np-marketplace-badge" style={{ borderColor: st.color, color: st.color }}>{st.label}</span>
                  {s.is_active ? <Eye size={12} style={{ color: "#10b981" }} /> : <EyeOff size={12} style={{ opacity: 0.3 }} />}
                </div>
                <ChevronRight size={16} style={{ opacity: 0.3 }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Shop Settings ──

function ShopSettingsPanel() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminGet("shop_global_settings");
      if (data.success) setSettings(data.settings || {});
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpdate = async (key: string, value: string) => {
    const data = await adminAction("update_shop_global_setting", { key, value });
    if (data.success) { notify("Paramètre mis à jour"); load(); }
    else notify(data.error || "Erreur");
  };

  if (loading) return <div className="np-marketplace-loading"><Loader2 size={20} className="animate-spin" /></div>;

  return (
    <div className="np-admin-shop-settings">
      {notification && <div className="np-marketplace-toast">{notification}</div>}
      <h3>Paramètres globaux des boutiques</h3>

      <div className="np-admin-shop-setting-row">
        <div>
          <strong>Boutiques activées</strong>
          <p>Activer/désactiver la fonctionnalité boutiques pour tous les utilisateurs</p>
        </div>
        <label className="np-toggle">
          <input type="checkbox" checked={settings.shop_enabled !== false}
            onChange={e => handleUpdate("shop_enabled", e.target.checked ? "1" : "0")} />
          <span className="np-toggle-slider" />
        </label>
      </div>

      <div className="np-admin-shop-setting-row">
        <div>
          <strong>Commission par défaut (%)</strong>
          <p>Taux appliqué aux nouvelles boutiques</p>
        </div>
        <input className="np-text-input" type="number" min={0} max={100} style={{ width: 80 }}
          defaultValue={settings.shop_default_commission || 5}
          onBlur={e => handleUpdate("shop_default_commission", e.target.value)} />
      </div>

      <div className="np-admin-shop-setting-row">
        <div>
          <strong>Commission minimum (%)</strong>
        </div>
        <input className="np-text-input" type="number" min={0} max={100} style={{ width: 80 }}
          defaultValue={settings.shop_min_commission || 2}
          onBlur={e => handleUpdate("shop_min_commission", e.target.value)} />
      </div>

      <div className="np-admin-shop-setting-row">
        <div>
          <strong>Commission maximum (%)</strong>
        </div>
        <input className="np-text-input" type="number" min={0} max={100} style={{ width: 80 }}
          defaultValue={settings.shop_max_commission || 30}
          onBlur={e => handleUpdate("shop_max_commission", e.target.value)} />
      </div>
    </div>
  );
}
