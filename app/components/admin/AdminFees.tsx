"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/app/lib/i18n";
import {
  AlertTriangle, Check, DollarSign, Edit2, Loader2, Percent, Plus,
  RefreshCw, Trash2, X, CreditCard, ArrowUpRight, ArrowDownLeft, Repeat,
  Globe, Key, ToggleLeft, ToggleRight, ChevronDown, ChevronRight,
} from "lucide-react";

type FeeSubTab = "card_fees" | "card_reload_fees" | "card_withdrawal_fees" | "transfer_fees" | "exchange_rates" | "payment_providers";

interface AdminFeesProps {
  adminId: number;
}

const SUB_TABS: { key: FeeSubTab; label: string; icon: any }[] = [
  { key: "card_fees", label: "afee_tab_card_fees", icon: CreditCard },
  { key: "card_reload_fees", label: "afee_tab_card_reload", icon: ArrowUpRight },
  { key: "card_withdrawal_fees", label: "afee_tab_card_withdrawal", icon: ArrowDownLeft },
  { key: "transfer_fees", label: "afee_tab_transfer", icon: Repeat },
  { key: "exchange_rates", label: "afee_tab_exchange", icon: Globe },
  { key: "payment_providers", label: "afee_tab_providers", icon: Key },
];

export function AdminFees({ adminId }: AdminFeesProps) {
  const { t } = useLanguage();
  const [subTab, setSubTab] = useState<FeeSubTab>("card_fees");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>({});
  const [notification, setNotification] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fees?section=all");
      const json = await res.json();
      if (json.success) setData(json);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const apiAction = async (section: string, action: string, payload: any = {}) => {
    const res = await fetch("/api/admin/fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, action, ...payload }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || t("afee_err_generic"));
    await fetchAll();
    return json;
  };

  return (
    <div className="np-admin-fees">
      {notification && (
        <div className="np-admin-fees-toast">
          <Check size={14} /> {notification}
        </div>
      )}

      <div className="np-admin-fees-tabs">
        {SUB_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={`np-admin-fees-tab ${subTab === key ? "active" : ""}`}
            onClick={() => setSubTab(key)}
          >
            <Icon size={15} />
            <span>{t(label)}</span>
          </button>
        ))}
        <button type="button" className="np-admin-fees-refresh" onClick={fetchAll} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="np-admin-fees-content">
        {subTab === "card_fees" && <CardFeesPanel items={data.card_fees || []} onAction={apiAction} notify={notify} />}
        {subTab === "card_reload_fees" && <SimpleFeesPanel section="card_reload_fees" label={t("afee_label_reload")} items={data.card_reload_fees || []} onAction={apiAction} notify={notify} />}
        {subTab === "card_withdrawal_fees" && <SimpleFeesPanel section="card_withdrawal_fees" label={t("afee_label_withdrawal")} items={data.card_withdrawal_fees || []} onAction={apiAction} notify={notify} />}
        {subTab === "transfer_fees" && <SimpleFeesPanel section="transfer_fees" label={t("afee_label_transfer")} items={data.transfer_fees || []} onAction={apiAction} notify={notify} />}
        {subTab === "exchange_rates" && <ExchangeRatesPanel items={data.exchange_rates || []} onAction={apiAction} notify={notify} />}
        {subTab === "payment_providers" && <PaymentProvidersPanel items={data.payment_providers || []} onAction={apiAction} notify={notify} />}
      </div>
    </div>
  );
}

// =============================================================================
// CARD FEES PANEL (creation fees with name, type, currency)
// =============================================================================

function CardFeesPanel({ items, onAction, notify }: { items: any[]; onAction: any; notify: (m: string) => void }) {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", type: "creation", currency: "XAF", fixed_amount: "0", percentage: "0", min_charge: "0", max_charge: "", description: "" });

  const resetForm = () => {
    setForm({ name: "", type: "creation", currency: "XAF", fixed_amount: "0", percentage: "0", min_charge: "0", max_charge: "", description: "" });
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (item: any) => {
    setForm({
      name: item.name, type: item.type, currency: item.currency,
      fixed_amount: String(item.fixed_amount), percentage: String(item.percentage),
      min_charge: String(item.min_charge), max_charge: item.max_charge ? String(item.max_charge) : "",
      description: item.description || "",
    });
    setEditing(item);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const data = {
        name: form.name, type: form.type, currency: form.currency,
        fixed_amount: Number(form.fixed_amount), percentage: Number(form.percentage),
        min_charge: Number(form.min_charge), max_charge: form.max_charge ? Number(form.max_charge) : null,
        description: form.description || null,
      };
      if (editing) {
        await onAction("card_fees", "update", { id: editing.id, data });
        notify(t("afee_card_updated"));
      } else {
        await onAction("card_fees", "create", { data });
        notify(t("afee_card_created"));
      }
      resetForm();
    } catch (e: any) { notify(t("afee_err_colon").replace("{n}", e.message)); }
  };

  return (
    <div>
      <div className="np-admin-fees-header">
        <h3>{t("afee_card_title")}</h3>
        <button type="button" className="np-admin-fees-add" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={14} /> {t("afee_add")}
        </button>
      </div>

      {showForm && (
        <div className="np-admin-fees-form">
          <div className="np-admin-fees-form-grid">
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_name")}</label>
              <input className="np-text-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t("afee_card_name_ph")} />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_type")}</label>
              <select className="np-text-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="creation">{t("afee_opt_creation")}</option>
                <option value="maintenance">{t("afee_opt_maintenance")}</option>
                <option value="renewal">{t("afee_opt_renewal")}</option>
              </select>
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_currency")}</label>
              <select className="np-text-input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                <option value="XAF">XAF (FCFA)</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_fixed_amount")}</label>
              <input className="np-text-input" type="number" min="0" value={form.fixed_amount} onChange={e => setForm({ ...form, fixed_amount: e.target.value })} />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_percentage")}</label>
              <input className="np-text-input" type="number" min="0" step="0.01" value={form.percentage} onChange={e => setForm({ ...form, percentage: e.target.value })} />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_min_charge")}</label>
              <input className="np-text-input" type="number" min="0" value={form.min_charge} onChange={e => setForm({ ...form, min_charge: e.target.value })} />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_max_charge")}</label>
              <input className="np-text-input" type="number" min="0" value={form.max_charge} onChange={e => setForm({ ...form, max_charge: e.target.value })} placeholder={t("afee_unlimited")} />
            </div>
            <div className="np-form-group" style={{ gridColumn: "span 2" }}>
              <label className="np-form-label">{t("afee_description")}</label>
              <input className="np-text-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t("afee_desc_ph")} />
            </div>
          </div>
          <div className="np-admin-fees-form-actions">
            <button type="button" className="np-secondary-button" onClick={resetForm}><X size={14} /> {t("afee_cancel")}</button>
            <button type="button" className="np-primary-button" onClick={handleSave} disabled={!form.name}><Check size={14} /> {editing ? t("afee_edit") : t("afee_create")}</button>
          </div>
        </div>
      )}

      <div className="np-admin-fees-table-wrap">
        <table className="np-admin-fees-table">
          <thead>
            <tr><th>{t("afee_name")}</th><th>{t("afee_type")}</th><th>{t("afee_currency")}</th><th>{t("afee_th_fixed")}</th><th>%</th><th>{t("afee_th_min")}</th><th>{t("afee_th_max")}</th><th>{t("afee_th_active")}</th><th>{t("afee_th_actions")}</th></tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={9} className="np-admin-fees-empty">{t("afee_card_empty")}</td></tr>}
            {items.map((item: any) => (
              <tr key={item.id}>
                <td className="font-medium">{item.name}</td>
                <td><span className="np-admin-fees-badge">{item.type}</span></td>
                <td>{item.currency}</td>
                <td>{Number(item.fixed_amount).toLocaleString()}</td>
                <td>{item.percentage}%</td>
                <td>{Number(item.min_charge).toLocaleString()}</td>
                <td>{item.max_charge ? Number(item.max_charge).toLocaleString() : "—"}</td>
                <td>
                  <button type="button" className={`np-admin-fees-toggle ${item.is_active ? "on" : "off"}`}
                    onClick={() => { onAction("card_fees", "update", { id: item.id, data: { is_active: item.is_active ? 0 : 1 } }); notify(item.is_active ? t("afee_deactivated") : t("afee_activated")); }}>
                    {item.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                </td>
                <td className="np-admin-fees-actions">
                  <button type="button" onClick={() => startEdit(item)} title={t("afee_edit")}><Edit2 size={14} /></button>
                  <button type="button" onClick={() => { if (confirm(t("afee_confirm_del_fee"))) { onAction("card_fees", "delete", { id: item.id }); notify(t("afee_deleted")); } }} title={t("afee_delete")}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// SIMPLE FEES PANEL (reload/withdrawal/transfer — same shape)
// =============================================================================

function SimpleFeesPanel({ section, label, items, onAction, notify }: { section: string; label: string; items: any[]; onAction: any; notify: (m: string) => void }) {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ fixed_amount: "0", percentage_rate: "0", min_amount: "0", max_amount: "" });

  const resetForm = () => { setForm({ fixed_amount: "0", percentage_rate: "0", min_amount: "0", max_amount: "" }); setEditing(null); setShowForm(false); };

  const startEdit = (item: any) => {
    setForm({ fixed_amount: String(item.fixed_amount), percentage_rate: String(item.percentage_rate), min_amount: String(item.min_amount), max_amount: item.max_amount ? String(item.max_amount) : "" });
    setEditing(item);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const data = { fixed_amount: Number(form.fixed_amount), percentage_rate: Number(form.percentage_rate), min_amount: Number(form.min_amount), max_amount: form.max_amount ? Number(form.max_amount) : null };
      if (editing) {
        await onAction(section, "update", { id: editing.id, data });
        notify(t("afee_simple_updated").replace("{n}", label));
      } else {
        await onAction(section, "create", { data });
        notify(t("afee_simple_created").replace("{n}", label));
      }
      resetForm();
    } catch (e: any) { notify(t("afee_err_colon").replace("{n}", e.message)); }
  };

  return (
    <div>
      <div className="np-admin-fees-header">
        <h3>{t("afee_simple_title").replace("{n}", label)}</h3>
        <button type="button" className="np-admin-fees-add" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={14} /> {t("afee_add")}
        </button>
      </div>

      {showForm && (
        <div className="np-admin-fees-form">
          <div className="np-admin-fees-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_fixed_amount_fcfa")}</label>
              <input className="np-text-input" type="number" min="0" value={form.fixed_amount} onChange={e => setForm({ ...form, fixed_amount: e.target.value })} />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_percentage")}</label>
              <input className="np-text-input" type="number" min="0" step="0.01" value={form.percentage_rate} onChange={e => setForm({ ...form, percentage_rate: e.target.value })} />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_min_amount")}</label>
              <input className="np-text-input" type="number" min="0" value={form.min_amount} onChange={e => setForm({ ...form, min_amount: e.target.value })} />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_max_amount")}</label>
              <input className="np-text-input" type="number" min="0" value={form.max_amount} onChange={e => setForm({ ...form, max_amount: e.target.value })} placeholder={t("afee_unlimited")} />
            </div>
          </div>
          <div className="np-admin-fees-form-actions">
            <button type="button" className="np-secondary-button" onClick={resetForm}><X size={14} /> {t("afee_cancel")}</button>
            <button type="button" className="np-primary-button" onClick={handleSave}><Check size={14} /> {editing ? t("afee_edit") : t("afee_create")}</button>
          </div>
        </div>
      )}

      <div className="np-admin-fees-table-wrap">
        <table className="np-admin-fees-table">
          <thead>
            <tr><th>{t("afee_th_fixed_fcfa")}</th><th>{t("afee_th_percentage")}</th><th>{t("afee_th_min")}</th><th>{t("afee_th_max")}</th><th>{t("afee_th_active")}</th><th>{t("afee_th_actions")}</th></tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={6} className="np-admin-fees-empty">{t("afee_simple_empty").replace("{n}", label)}</td></tr>}
            {items.map((item: any) => (
              <tr key={item.id}>
                <td>{Number(item.fixed_amount).toLocaleString()} FCFA</td>
                <td>{item.percentage_rate}%</td>
                <td>{Number(item.min_amount).toLocaleString()}</td>
                <td>{item.max_amount ? Number(item.max_amount).toLocaleString() : "—"}</td>
                <td>
                  <button type="button" className={`np-admin-fees-toggle ${item.is_active ? "on" : "off"}`}
                    onClick={() => { onAction(section, "update", { id: item.id, data: { is_active: item.is_active ? 0 : 1 } }); notify(item.is_active ? t("afee_deactivated") : t("afee_activated")); }}>
                    {item.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                </td>
                <td className="np-admin-fees-actions">
                  <button type="button" onClick={() => startEdit(item)} title={t("afee_edit")}><Edit2 size={14} /></button>
                  <button type="button" onClick={() => { if (confirm(t("afee_confirm_del"))) { onAction(section, "delete", { id: item.id }); notify(t("afee_deleted")); } }} title={t("afee_delete")}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// EXCHANGE RATES PANEL
// =============================================================================

function ExchangeRatesPanel({ items, onAction, notify }: { items: any[]; onAction: any; notify: (m: string) => void }) {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ from_currency: "XAF", to_currency: "USD", rate: "", fee_percentage: "0", display_order: "0" });

  const resetForm = () => { setForm({ from_currency: "XAF", to_currency: "USD", rate: "", fee_percentage: "0", display_order: "0" }); setEditing(null); setShowForm(false); };

  const startEdit = (item: any) => {
    setForm({ from_currency: item.from_currency, to_currency: item.to_currency, rate: String(item.rate), fee_percentage: String(item.fee_percentage), display_order: String(item.display_order) });
    setEditing(item);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const data = { from_currency: form.from_currency, to_currency: form.to_currency, rate: Number(form.rate), fee_percentage: Number(form.fee_percentage), display_order: Number(form.display_order) };
      if (editing) {
        await onAction("exchange_rates", "update", { id: editing.id, data });
        notify(t("afee_rate_updated"));
      } else {
        await onAction("exchange_rates", "create", { data });
        notify(t("afee_rate_created"));
      }
      resetForm();
    } catch (e: any) { notify(t("afee_err_colon").replace("{n}", e.message)); }
  };

  return (
    <div>
      <div className="np-admin-fees-header">
        <h3>{t("afee_exchange_title")}</h3>
        <button type="button" className="np-admin-fees-add" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={14} /> {t("afee_add")}
        </button>
      </div>

      {showForm && (
        <div className="np-admin-fees-form">
          <div className="np-admin-fees-form-grid">
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_from_currency")}</label>
              <select className="np-text-input" value={form.from_currency} onChange={e => setForm({ ...form, from_currency: e.target.value })}>
                <option value="XAF">XAF (FCFA)</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="NGN">NGN</option>
              </select>
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_to_currency")}</label>
              <select className="np-text-input" value={form.to_currency} onChange={e => setForm({ ...form, to_currency: e.target.value })}>
                <option value="USD">USD</option>
                <option value="XAF">XAF (FCFA)</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="NGN">NGN</option>
              </select>
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_rate")}</label>
              <input className="np-text-input" type="number" step="0.0001" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} placeholder="Ex: 600.5" />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_fee_pct")}</label>
              <input className="np-text-input" type="number" min="0" step="0.1" value={form.fee_percentage} onChange={e => setForm({ ...form, fee_percentage: e.target.value })} />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_display_order")}</label>
              <input className="np-text-input" type="number" min="0" value={form.display_order} onChange={e => setForm({ ...form, display_order: e.target.value })} />
            </div>
          </div>
          <div className="np-admin-fees-form-actions">
            <button type="button" className="np-secondary-button" onClick={resetForm}><X size={14} /> {t("afee_cancel")}</button>
            <button type="button" className="np-primary-button" onClick={handleSave} disabled={!form.rate}><Check size={14} /> {editing ? t("afee_edit") : t("afee_create")}</button>
          </div>
        </div>
      )}

      <div className="np-admin-fees-table-wrap">
        <table className="np-admin-fees-table">
          <thead>
            <tr><th>{t("afee_th_from")}</th><th>{t("afee_th_to")}</th><th>{t("afee_th_rate")}</th><th>{t("afee_th_fee_pct")}</th><th>{t("afee_th_active")}</th><th>{t("afee_th_actions")}</th></tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={6} className="np-admin-fees-empty">{t("afee_exchange_empty")}</td></tr>}
            {items.map((item: any) => (
              <tr key={item.id}>
                <td className="font-medium">{item.from_currency}</td>
                <td className="font-medium">{item.to_currency}</td>
                <td>{Number(item.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                <td>{item.fee_percentage}%</td>
                <td>
                  <button type="button" className={`np-admin-fees-toggle ${item.is_active ? "on" : "off"}`}
                    onClick={() => { onAction("exchange_rates", "update", { id: item.id, data: { is_active: item.is_active ? 0 : 1 } }); notify(item.is_active ? t("afee_deactivated") : t("afee_activated")); }}>
                    {item.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                </td>
                <td className="np-admin-fees-actions">
                  <button type="button" onClick={() => startEdit(item)} title={t("afee_edit")}><Edit2 size={14} /></button>
                  <button type="button" onClick={() => { if (confirm(t("afee_confirm_del_rate"))) { onAction("exchange_rates", "delete", { id: item.id }); notify(t("afee_deleted")); } }} title={t("afee_delete")}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// PAYMENT PROVIDERS PANEL
// =============================================================================

function PaymentProvidersPanel({ items, onAction, notify }: { items: any[]; onAction: any; notify: (m: string) => void }) {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({
    provider: "", key_name: "", api_key: "", api_secret: "", is_live: 0, is_test: 0,
    description: "", logo: "", shop_name: "", payment_type: "", allowed_countries: "",
    marketplace_enabled: 0, shop_enabled: 0, is_recommended: 0, display_order: "0",
  });

  const resetForm = () => {
    setForm({ provider: "", key_name: "", api_key: "", api_secret: "", is_live: 0, is_test: 0, description: "", logo: "", shop_name: "", payment_type: "", allowed_countries: "", marketplace_enabled: 0, shop_enabled: 0, is_recommended: 0, display_order: "0" });
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (item: any) => {
    setForm({
      provider: item.provider, key_name: item.key_name || "", api_key: item.api_key || "",
      api_secret: item.api_secret || "", is_live: item.is_live, is_test: item.is_test,
      description: item.description || "", logo: item.logo || "", shop_name: item.shop_name || "",
      payment_type: item.payment_type || "", allowed_countries: item.allowed_countries || "",
      marketplace_enabled: item.marketplace_enabled, shop_enabled: item.shop_enabled,
      is_recommended: item.is_recommended, display_order: String(item.display_order),
    });
    setEditing(item);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const data = { ...form, display_order: Number(form.display_order) };
      if (editing) {
        await onAction("payment_providers", "update", { id: editing.id, data });
        notify(t("afee_provider_updated"));
      } else {
        await onAction("payment_providers", "create", { data });
        notify(t("afee_provider_added"));
      }
      resetForm();
    } catch (e: any) { notify(t("afee_err_colon").replace("{n}", e.message)); }
  };

  return (
    <div>
      <div className="np-admin-fees-header">
        <h3>{t("afee_providers_title")}</h3>
        <button type="button" className="np-admin-fees-add" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={14} /> {t("afee_add")}
        </button>
      </div>

      {showForm && (
        <div className="np-admin-fees-form">
          <div className="np-admin-fees-form-grid">
            <div className="np-form-group">
              <label className="np-form-label">Provider</label>
              <input className="np-text-input" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} placeholder="Ex: orange_money, mtn_momo, sebpay" />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_display_name")}</label>
              <input className="np-text-input" value={form.key_name} onChange={e => setForm({ ...form, key_name: e.target.value })} placeholder="Ex: Orange Money" />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_api_key")}</label>
              <input className="np-text-input" type="password" value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })} placeholder={t("afee_secret_key_ph")} />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_api_secret")}</label>
              <input className="np-text-input" type="password" value={form.api_secret} onChange={e => setForm({ ...form, api_secret: e.target.value })} placeholder="Secret" />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_payment_type")}</label>
              <select className="np-text-input" value={form.payment_type} onChange={e => setForm({ ...form, payment_type: e.target.value })}>
                <option value="">{t("afee_select")}</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">{t("afee_opt_bank")}</option>
                <option value="card">{t("afee_opt_card")}</option>
                <option value="crypto">Crypto</option>
                <option value="other">{t("afee_opt_other")}</option>
              </select>
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_allowed_countries")}</label>
              <input className="np-text-input" value={form.allowed_countries} onChange={e => setForm({ ...form, allowed_countries: e.target.value })} placeholder={t("afee_countries_ph")} />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_shop_name")}</label>
              <input className="np-text-input" value={form.shop_name} onChange={e => setForm({ ...form, shop_name: e.target.value })} placeholder={t("afee_merchant_ph")} />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">Logo URL</label>
              <input className="np-text-input" value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} placeholder={t("afee_logo_ph")} />
            </div>
            <div className="np-form-group">
              <label className="np-form-label">{t("afee_order")}</label>
              <input className="np-text-input" type="number" min="0" value={form.display_order} onChange={e => setForm({ ...form, display_order: e.target.value })} />
            </div>
            <div className="np-form-group" style={{ gridColumn: "span 2" }}>
              <label className="np-form-label">{t("afee_description")}</label>
              <input className="np-text-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>

          <div className="np-admin-fees-toggles-row">
            <label><input type="checkbox" checked={!!form.is_live} onChange={e => setForm({ ...form, is_live: e.target.checked ? 1 : 0 })} /> {t("afee_prod")}</label>
            <label><input type="checkbox" checked={!!form.is_test} onChange={e => setForm({ ...form, is_test: e.target.checked ? 1 : 0 })} /> {t("afee_test_mode")}</label>
            <label><input type="checkbox" checked={!!form.marketplace_enabled} onChange={e => setForm({ ...form, marketplace_enabled: e.target.checked ? 1 : 0 })} /> Marketplace</label>
            <label><input type="checkbox" checked={!!form.shop_enabled} onChange={e => setForm({ ...form, shop_enabled: e.target.checked ? 1 : 0 })} /> {t("afee_shop")}</label>
            <label><input type="checkbox" checked={!!form.is_recommended} onChange={e => setForm({ ...form, is_recommended: e.target.checked ? 1 : 0 })} /> {t("afee_recommended")}</label>
          </div>

          <div className="np-admin-fees-form-actions">
            <button type="button" className="np-secondary-button" onClick={resetForm}><X size={14} /> {t("afee_cancel")}</button>
            <button type="button" className="np-primary-button" onClick={handleSave} disabled={!form.provider}><Check size={14} /> {editing ? t("afee_edit") : t("afee_create")}</button>
          </div>
        </div>
      )}

      <div className="np-admin-fees-providers-list">
        {items.length === 0 && <p className="np-admin-fees-empty">{t("afee_providers_empty")}</p>}
        {items.map((item: any) => (
          <div key={item.id} className="np-admin-fees-provider-card">
            <div className="np-admin-fees-provider-row" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
              <div className="np-admin-fees-provider-info">
                {item.logo && <img src={item.logo} alt="" className="np-admin-fees-provider-logo" />}
                <div>
                  <strong>{item.key_name || item.provider}</strong>
                  <span className="np-admin-fees-provider-type">{item.payment_type || "—"}</span>
                </div>
              </div>
              <div className="np-admin-fees-provider-badges">
                {item.is_active ? <span className="np-badge success">{t("afee_badge_active")}</span> : <span className="np-badge danger">{t("afee_badge_inactive")}</span>}
                {item.is_live ? <span className="np-badge info">LIVE</span> : <span className="np-badge warning">TEST</span>}
                {item.is_recommended ? <span className="np-badge accent">{t("afee_recommended")}</span> : null}
              </div>
              {expandedId === item.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>

            {expandedId === item.id && (
              <div className="np-admin-fees-provider-details">
                <div className="np-admin-fees-provider-detail-grid">
                  <span>Provider ID:</span><span>{item.provider}</span>
                  <span>{t("afee_detail_countries")}</span><span>{item.allowed_countries || t("afee_all")}</span>
                  <span>Marketplace:</span><span>{item.marketplace_enabled ? t("afee_yes") : t("afee_no")}</span>
                  <span>{t("afee_detail_shop")}</span><span>{item.shop_enabled ? t("afee_yes") : t("afee_no")}</span>
                  <span>{t("afee_detail_description")}</span><span>{item.description || "—"}</span>
                </div>
                <div className="np-admin-fees-provider-actions">
                  <button type="button" className="np-secondary-button" onClick={() => startEdit(item)}><Edit2 size={14} /> {t("afee_edit")}</button>
                  <button type="button" className={`np-secondary-button ${item.is_active ? "danger" : "success"}`}
                    onClick={() => { onAction("payment_providers", "update", { id: item.id, data: { is_active: item.is_active ? 0 : 1 } }); notify(item.is_active ? t("afee_deactivated") : t("afee_activated")); }}>
                    {item.is_active ? t("afee_deactivate") : t("afee_activate")}
                  </button>
                  <button type="button" className="np-secondary-button danger"
                    onClick={() => { if (confirm(t("afee_confirm_del_provider"))) { onAction("payment_providers", "delete", { id: item.id }); notify(t("afee_deleted")); } }}>
                    <Trash2 size={14} /> {t("afee_delete")}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
