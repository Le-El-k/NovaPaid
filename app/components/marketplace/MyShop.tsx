"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/app/lib/i18n";
import {
  ArrowLeft, Check, ChevronRight, Copy, Edit3, Eye, EyeOff, Key,
  Loader2, Package, Plus, RefreshCw, Save, Settings, ShoppingBag,
  Store, Trash2, Upload, X,
} from "lucide-react";

type Shop = {
  id: number; name: string; slug: string; description: string; logo: string; banner: string;
  phone: string; email: string; address: string; status: string; is_active: number;
  commission_rate: number; rejection_reason: string | null; created_at: string;
};
type Product = {
  id: number; name: string; slug: string; description: string; product_type: string;
  price: number; currency: string; image: string; stock: number | null; unlimited_stock: number;
  is_active: number; is_featured: number; auto_deliver: number; available_credentials: number;
  digital_file: string; digital_link: string; credential_format: string; created_at: string;
};

type ShopTab = "overview" | "products" | "orders" | "settings";

const fmtPrice = (p: number) => `${Math.round(p).toLocaleString("fr-FR")} FCFA`;
const productTypeKeys: Record<string, string> = {
  physical: "myshop_ptype_physical", digital_file: "myshop_ptype_digital_file",
  digital_link: "myshop_ptype_digital_link", digital_account: "myshop_ptype_digital_account",
};

export function MyShop() {
  const { t } = useLanguage();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ShopTab>("overview");
  const [notification, setNotification] = useState<string | null>(null);

  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

  const loadShop = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shops?section=my_shop");
      const data = await res.json();
      if (data.success) setShop(data.shop);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadShop(); }, []);

  if (loading) return <div className="np-marketplace-loading"><Loader2 size={20} className="animate-spin" /> {t("myshop_loading")}</div>;

  if (!shop) return <CreateShopForm onCreated={loadShop} notify={notify} />;

  return (
    <div className="np-myshop">
      {notification && <div className="np-marketplace-toast">{notification}</div>}

      <div className="np-myshop-header">
        <div className="np-myshop-header-info">
          {shop.logo && <img src={shop.logo} alt="" className="np-myshop-logo" />}
          <div>
            <h2>{shop.name}</h2>
            <div className="np-myshop-status-row">
              <span className={`np-myshop-status np-myshop-status--${shop.status}`}>
                {shop.status === "approved" ? t("myshop_status_approved") : shop.status === "pending" ? t("myshop_status_pending") : t("myshop_status_rejected")}
              </span>
              {shop.status === "approved" && (
                <span className={`np-myshop-active ${shop.is_active ? "on" : "off"}`}>
                  {shop.is_active ? t("myshop_active") : t("myshop_inactive")}
                </span>
              )}
            </div>
          </div>
        </div>
        <button type="button" className="np-admin-fees-refresh" onClick={loadShop}><RefreshCw size={14} /></button>
      </div>

      {shop.status === "rejected" && shop.rejection_reason && (
        <div className="np-myshop-alert np-myshop-alert--danger">
          <strong>{t("myshop_rejection_label")}</strong> {shop.rejection_reason}
        </div>
      )}
      {shop.status === "pending" && (
        <div className="np-myshop-alert np-myshop-alert--warning">
          {t("myshop_pending_notice")}
        </div>
      )}

      <div className="np-myshop-tabs">
        {(["overview", "products", "orders", "settings"] as ShopTab[]).map(tx => (
          <button key={tx} type="button" className={tab === tx ? "active" : ""} onClick={() => setTab(tx)}>
            {tx === "overview" && <><Store size={14} /> {t("myshop_tab_overview")}</>}
            {tx === "products" && <><Package size={14} /> {t("myshop_tab_products")}</>}
            {tx === "orders" && <><ShoppingBag size={14} /> {t("myshop_tab_orders")}</>}
            {tx === "settings" && <><Settings size={14} /> {t("myshop_tab_settings")}</>}
          </button>
        ))}
      </div>

      {tab === "overview" && <ShopOverview shop={shop} />}
      {tab === "products" && <ShopProducts shop={shop} notify={notify} />}
      {tab === "orders" && <ShopOrders shop={shop} notify={notify} />}
      {tab === "settings" && <ShopSettings shop={shop} onUpdated={loadShop} notify={notify} />}
    </div>
  );
}

// ── Create Shop Form ──

function CreateShopForm({ onCreated, notify }: { onCreated: () => void; notify: (m: string) => void }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", description: "", phone: "", email: "", address: "", logo: "", banner: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.phone.trim()) { notify(t("myshop_name_phone_required")); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/shops", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_shop", ...form }),
      });
      const data = await res.json();
      if (data.success) { notify(t("myshop_shop_created")); onCreated(); }
      else notify(data.error || t("myshop_error"));
    } catch { notify(t("myshop_network_error")); }
    setSubmitting(false);
  };

  return (
    <div className="np-myshop-create">
      <div className="np-myshop-create-header">
        <Store size={32} />
        <h2>{t("myshop_create_title")}</h2>
        <p>{t("myshop_create_subtitle")}</p>
      </div>
      <div className="np-myshop-create-form">
        <div className="np-form-group">
          <label>{t("myshop_shop_name_label")}</label>
          <input className="np-text-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t("myshop_shop_name_ph")} />
        </div>
        <div className="np-form-group">
          <label>{t("myshop_description")}</label>
          <textarea className="np-text-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder={t("myshop_shop_desc_ph")} />
        </div>
        <div className="np-form-row">
          <div className="np-form-group">
            <label>{t("myshop_phone_required")}</label>
            <input className="np-text-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+237..." />
          </div>
          <div className="np-form-group">
            <label>Email</label>
            <input className="np-text-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@..." />
          </div>
        </div>
        <div className="np-form-group">
          <label>{t("myshop_address")}</label>
          <input className="np-text-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder={t("myshop_address_ph")} />
        </div>
        <div className="np-form-row">
          <div className="np-form-group">
            <label>{t("myshop_logo_url")}</label>
            <input className="np-text-input" value={form.logo} onChange={e => setForm(f => ({ ...f, logo: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="np-form-group">
            <label>{t("myshop_banner_url")}</label>
            <input className="np-text-input" value={form.banner} onChange={e => setForm(f => ({ ...f, banner: e.target.value }))} placeholder="https://..." />
          </div>
        </div>
        <button type="button" className="np-primary-button" onClick={handleCreate} disabled={submitting}>
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Store size={14} />} {t("myshop_create_button")}
        </button>
      </div>
    </div>
  );
}

// ── Shop Overview ──

function ShopOverview({ shop }: { shop: Shop }) {
  const { t } = useLanguage();
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/boutique/${shop.slug}`;

  return (
    <div className="np-myshop-overview">
      {shop.banner && <img src={shop.banner} alt="" className="np-myshop-banner" />}
      <div className="np-myshop-overview-grid">
        <div className="np-myshop-info-card"><small>Slug</small><strong>/{shop.slug}</strong></div>
        <div className="np-myshop-info-card"><small>{t("myshop_phone")}</small><strong>{shop.phone || "—"}</strong></div>
        <div className="np-myshop-info-card"><small>Email</small><strong>{shop.email || "—"}</strong></div>
        <div className="np-myshop-info-card"><small>{t("myshop_address")}</small><strong>{shop.address || "—"}</strong></div>
        <div className="np-myshop-info-card"><small>Commission</small><strong>{shop.commission_rate}%</strong></div>
        <div className="np-myshop-info-card"><small>{t("myshop_created_on")}</small><strong>{new Date(shop.created_at).toLocaleDateString("fr-FR")}</strong></div>
      </div>
      {shop.status === "approved" && (
        <div className="np-myshop-share">
          <label>{t("myshop_public_link_label")}</label>
          <div className="np-myshop-share-row">
            <input className="np-text-input" value={shareUrl} readOnly />
            <button type="button" className="np-secondary-button" onClick={() => { navigator.clipboard.writeText(shareUrl).catch(() => {}); }}>
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}
      {shop.description && <div className="np-myshop-desc"><strong>{t("myshop_description")}</strong><p>{shop.description}</p></div>}
    </div>
  );
}

// ── Shop Products ──

function ShopProducts({ shop, notify }: { shop: Shop; notify: (m: string) => void }) {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [credentialProduct, setCredentialProduct] = useState<Product | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shops?section=my_products");
      const data = await res.json();
      if (data.success) setProducts(data.products || []);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (credentialProduct) {
    return <CredentialManager product={credentialProduct} onBack={() => { setCredentialProduct(null); load(); }} notify={notify} />;
  }

  if (creating || editing) {
    return <ProductForm product={editing} shopId={shop.id} onDone={() => { setCreating(false); setEditing(null); load(); }} notify={notify} />;
  }

  return (
    <div className="np-myshop-products">
      <div className="np-marketplace-header">
        <h3>{t("myshop_my_products")} ({products.length})</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="np-admin-fees-refresh" onClick={load}><RefreshCw size={14} /></button>
          {shop.status === "approved" && (
            <button type="button" className="np-primary-button" onClick={() => setCreating(true)}><Plus size={14} /> {t("myshop_add")}</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="np-marketplace-loading"><Loader2 size={20} className="animate-spin" /></div>
      ) : products.length === 0 ? (
        <div className="np-marketplace-empty"><Package size={32} /><p>{t("myshop_no_products")}</p></div>
      ) : (
        <div className="np-myshop-product-list">
          {products.map(p => (
            <div key={p.id} className="np-myshop-product-row">
              {p.image && <img src={p.image} alt="" className="np-myshop-product-img" />}
              <div className="np-myshop-product-info">
                <strong>{p.name}</strong>
                <span className="np-myshop-product-meta">
                  {(productTypeKeys[p.product_type] ? t(productTypeKeys[p.product_type]) : p.product_type)} · {fmtPrice(p.price)}
                  {p.unlimited_stock ? t("myshop_stock_unlimited") : p.stock !== null ? t("myshop_stock_count").replace("{n}", String(p.stock)) : ""}
                  {p.product_type === "digital_account" && ` · Credentials: ${p.available_credentials}`}
                </span>
              </div>
              <div className="np-myshop-product-actions">
                <span className={`np-myshop-active ${p.is_active ? "on" : "off"}`}>
                  {p.is_active ? t("myshop_product_active") : t("myshop_product_inactive")}
                </span>
                {p.product_type === "digital_account" && (
                  <button type="button" title="Credentials" className="np-icon-btn" onClick={() => setCredentialProduct(p)}><Key size={14} /></button>
                )}
                <button type="button" title={t("myshop_edit_title")} className="np-icon-btn" onClick={() => setEditing(p)}><Edit3 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Product Form ──

function ProductForm({ product, shopId, onDone, notify }: { product: Product | null; shopId: number; onDone: () => void; notify: (m: string) => void }) {
  const { t } = useLanguage();
  const isEdit = Boolean(product);
  const [form, setForm] = useState({
    name: product?.name || "", description: product?.description || "",
    product_type: product?.product_type || "physical",
    price: product?.price?.toString() || "", image: product?.image || "",
    stock: product?.stock?.toString() || "0",
    unlimited_stock: Boolean(product?.unlimited_stock),
    auto_deliver: Boolean(product?.auto_deliver),
    is_featured: Boolean(product?.is_featured),
    is_active: product ? Boolean(product.is_active) : true,
    digital_file: product?.digital_file || "",
    digital_link: product?.digital_link || "",
    credential_format: product?.credential_format || "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.price) { notify(t("myshop_name_price_required")); return; }
    setSubmitting(true);
    try {
      const payload: any = {
        action: isEdit ? "update_product" : "create_product",
        data: { ...form, price: Number(form.price), stock: form.unlimited_stock ? null : Number(form.stock) },
      };
      if (isEdit) payload.product_id = product!.id;
      const res = await fetch("/api/shops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) { notify(isEdit ? t("myshop_product_updated") : t("myshop_product_created")); onDone(); }
      else notify(data.error || t("myshop_error"));
    } catch { notify(t("myshop_network_error")); }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!product) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/shops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_product", product_id: product.id }) });
      const data = await res.json();
      if (data.success) { notify(t("myshop_product_deleted")); onDone(); } else notify(data.error || t("myshop_error"));
    } catch { notify(t("myshop_error")); }
    setSubmitting(false);
  };

  return (
    <div className="np-myshop-product-form">
      <button type="button" className="np-marketplace-back" onClick={onDone}><ArrowLeft size={16} /> {t("myshop_back")}</button>
      <h3>{isEdit ? t("myshop_edit_product") : t("myshop_new_product")}</h3>

      <div className="np-form-group">
        <label>{t("myshop_name_required")}</label>
        <input className="np-text-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="np-form-group">
        <label>{t("myshop_product_type")}</label>
        <select className="np-text-input" value={form.product_type} onChange={e => setForm(f => ({ ...f, product_type: e.target.value }))}>
          <option value="physical">{t("myshop_ptype_physical")}</option>
          <option value="digital_file">{t("myshop_ptype_digital_file")}</option>
          <option value="digital_link">{t("myshop_ptype_digital_link")}</option>
          <option value="digital_account">{t("myshop_ptype_digital_account")}</option>
        </select>
      </div>
      <div className="np-form-group">
        <label>{t("myshop_description")}</label>
        <textarea className="np-text-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
      </div>
      <div className="np-form-row">
        <div className="np-form-group">
          <label>{t("myshop_price_label")}</label>
          <input className="np-text-input" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
        </div>
        <div className="np-form-group">
          <label>{t("myshop_image_url")}</label>
          <input className="np-text-input" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} />
        </div>
      </div>

      {form.product_type === "physical" && (
        <div className="np-form-row">
          <div className="np-form-group">
            <label>{t("myshop_stock")}</label>
            <input className="np-text-input" type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} disabled={form.unlimited_stock} />
          </div>
          <div className="np-form-group np-checkbox-group">
            <label><input type="checkbox" checked={form.unlimited_stock} onChange={e => setForm(f => ({ ...f, unlimited_stock: e.target.checked }))} /> {t("myshop_unlimited_stock")}</label>
          </div>
        </div>
      )}

      {form.product_type === "digital_file" && (
        <div className="np-form-group">
          <label>{t("myshop_digital_file_url")}</label>
          <input className="np-text-input" value={form.digital_file} onChange={e => setForm(f => ({ ...f, digital_file: e.target.value }))} placeholder="https://..." />
        </div>
      )}

      {form.product_type === "digital_link" && (
        <div className="np-form-group">
          <label>{t("myshop_digital_link")}</label>
          <input className="np-text-input" value={form.digital_link} onChange={e => setForm(f => ({ ...f, digital_link: e.target.value }))} placeholder="https://..." />
        </div>
      )}

      {form.product_type === "digital_account" && (
        <div className="np-form-group">
          <label>{t("myshop_credential_format_label")}</label>
          <input className="np-text-input" value={form.credential_format} onChange={e => setForm(f => ({ ...f, credential_format: e.target.value }))} placeholder="email,password" />
        </div>
      )}

      {(form.product_type !== "physical") && (
        <div className="np-form-group np-checkbox-group">
          <label><input type="checkbox" checked={form.auto_deliver} onChange={e => setForm(f => ({ ...f, auto_deliver: e.target.checked }))} /> {t("myshop_auto_deliver")}</label>
        </div>
      )}

      <div className="np-form-row">
        <div className="np-form-group np-checkbox-group">
          <label><input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} /> {t("myshop_featured")}</label>
        </div>
        {isEdit && (
          <div className="np-form-group np-checkbox-group">
            <label><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> {t("myshop_product_active")}</label>
          </div>
        )}
      </div>

      <div className="np-myshop-form-actions">
        <button type="button" className="np-primary-button" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {isEdit ? t("myshop_save") : t("myshop_create")}
        </button>
        {isEdit && (
          <button type="button" className="np-danger-button" onClick={handleDelete} disabled={submitting}>
            <Trash2 size={14} /> {t("myshop_delete")}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Credential Manager ──

function CredentialManager({ product, onBack, notify }: { product: Product; onBack: () => void; notify: (m: string) => void }) {
  const { t } = useLanguage();
  const [credentials, setCredentials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkInput, setBulkInput] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shops?section=product_credentials&product_id=${product.id}`);
      const data = await res.json();
      if (data.success) setCredentials(data.credentials || []);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleBulkAdd = async () => {
    if (!bulkInput.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/shops", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_credentials", product_id: product.id, credentials: bulkInput }),
      });
      const data = await res.json();
      if (data.success) { notify(t("myshop_credentials_added").replace("{n}", String(data.count))); setBulkInput(""); load(); }
      else notify(data.error || t("myshop_error"));
    } catch { notify(t("myshop_error")); }
    setAdding(false);
  };

  const handleDelete = async (credId: number) => {
    try {
      const res = await fetch("/api/shops", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_credential", credential_id: credId, product_id: product.id }),
      });
      const data = await res.json();
      if (data.success) { load(); notify(t("myshop_deleted")); }
    } catch { }
  };

  const available = credentials.filter(c => c.status === "available").length;
  const sold = credentials.filter(c => c.status === "sold").length;

  return (
    <div className="np-myshop-credentials">
      <button type="button" className="np-marketplace-back" onClick={onBack}><ArrowLeft size={16} /> {t("myshop_back_to_products")}</button>
      <h3><Key size={16} /> Credentials — {product.name}</h3>
      {product.credential_format && <p className="np-myshop-cred-format">{t("myshop_format_label")} <code>{product.credential_format}</code></p>}

      <div className="np-myshop-cred-stats">
        <span className="np-myshop-cred-stat available">{t("myshop_cred_available").replace("{n}", String(available))}</span>
        <span className="np-myshop-cred-stat sold">{t("myshop_cred_sold").replace("{n}", String(sold))}</span>
        <span className="np-myshop-cred-stat total">{t("myshop_cred_total").replace("{n}", String(credentials.length))}</span>
      </div>

      <div className="np-myshop-cred-bulk">
        <label>{t("myshop_bulk_add_label")}</label>
        <textarea className="np-text-input" value={bulkInput} onChange={e => setBulkInput(e.target.value)} rows={5} placeholder={"email1@test.com,pass1\nemail2@test.com,pass2"} />
        <button type="button" className="np-primary-button" onClick={handleBulkAdd} disabled={adding}>
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {t("myshop_add")}
        </button>
      </div>

      {loading ? (
        <div className="np-marketplace-loading"><Loader2 size={20} className="animate-spin" /></div>
      ) : (
        <div className="np-myshop-cred-list">
          {credentials.map(c => (
            <div key={c.id} className={`np-myshop-cred-row np-myshop-cred-row--${c.status}`}>
              <code>{c.credential_data}</code>
              <div className="np-myshop-cred-row-right">
                <span className={`np-marketplace-badge np-cred-badge--${c.status}`}>{c.status}</span>
                {c.status === "available" && (
                  <button type="button" className="np-icon-btn np-icon-btn--danger" onClick={() => handleDelete(c.id)}><Trash2 size={12} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shop Orders ──

function ShopOrders({ shop, notify }: { shop: Shop; notify: (m: string) => void }) {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const q = filter ? `&status=${filter}` : "";
      const res = await fetch(`/api/shops?section=my_shop_orders${q}`);
      const data = await res.json();
      if (data.success) setOrders(data.orders || []);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: t("myshop_order_pending"), color: "#f59e0b" },
    paid: { label: t("myshop_order_paid"), color: "#3b82f6" },
    processing: { label: t("myshop_order_processing"), color: "#8b5cf6" },
    completed: { label: t("myshop_order_completed"), color: "#10b981" },
    refunded: { label: t("myshop_order_refunded"), color: "#ef4444" },
    cancelled: { label: t("myshop_order_cancelled"), color: "#6b7280" },
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      const res = await fetch("/api/shops", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_order_status", order_id: orderId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) { notify(t("myshop_status_updated")); load(); setSelected(null); }
      else notify(data.error || t("myshop_error"));
    } catch { notify(t("myshop_error")); }
  };

  const handleValidateItem = async (itemId: number) => {
    try {
      const res = await fetch("/api/shops", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate_item", order_item_id: itemId }),
      });
      const data = await res.json();
      if (data.success) { notify(t("myshop_item_validated")); if (selected) { const detail = await fetch(`/api/shops?section=shop_order_detail&id=${selected.id}`).then(r => r.json()); if (detail.success) setSelected(detail.order); } }
      else notify(data.error || t("myshop_error"));
    } catch { notify(t("myshop_error")); }
  };

  if (selected) {
    const st = statusMap[selected.status] || statusMap.pending;
    return (
      <div className="np-myshop-order-detail">
        <button type="button" className="np-marketplace-back" onClick={() => setSelected(null)}><ArrowLeft size={16} /> {t("myshop_back")}</button>
        <div className="np-commande-detail-header">
          <div>
            <h3>{t("myshop_order_number").replace("{n}", String(selected.reference))}</h3>
            <span className="np-marketplace-badge" style={{ borderColor: st.color, color: st.color }}>{st.label}</span>
          </div>
        </div>
        <div className="np-commande-detail-grid">
          <div><small>{t("myshop_client")}</small><strong>{selected.buyer_name || selected.guest_name || t("myshop_guest")}</strong></div>
          <div><small>Email</small><strong>{selected.buyer_email || selected.guest_email || "—"}</strong></div>
          <div><small>Total</small><strong>{fmtPrice(selected.total_amount)}</strong></div>
          <div><small>Commission</small><strong>{fmtPrice(selected.commission_amount)}</strong></div>
          <div><small>{t("myshop_your_earnings")}</small><strong>{fmtPrice(selected.seller_amount)}</strong></div>
          <div><small>Date</small><strong>{new Date(selected.created_at).toLocaleDateString("fr-FR")}</strong></div>
        </div>

        {selected.items && (
          <div className="np-myshop-order-items">
            <h4>{t("myshop_items")}</h4>
            {selected.items.map((item: any) => (
              <div key={item.id} className="np-myshop-order-item-row">
                {item.product_image && <img src={item.product_image} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover" }} />}
                <div className="np-myshop-order-item-info">
                  <strong>{item.product_name}</strong>
                  <span>{item.quantity} × {fmtPrice(item.unit_price)}</span>
                </div>
                <div className="np-myshop-order-item-actions">
                  <span className={`np-marketplace-badge np-item-status--${item.status}`}>{item.status}</span>
                  {(selected.status === "paid" || selected.status === "processing") && item.status === "pending" && (
                    <button type="button" className="np-primary-button" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => handleValidateItem(item.id)}>
                      <Check size={12} /> {t("myshop_validate")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="np-myshop-order-actions">
          {selected.status === "paid" && <button type="button" className="np-primary-button" onClick={() => handleStatusChange(selected.id, "processing")}>{t("myshop_mark_processing")}</button>}
          {selected.status === "processing" && <button type="button" className="np-primary-button" onClick={() => handleStatusChange(selected.id, "completed")}>{t("myshop_mark_completed")}</button>}
          {(selected.status === "pending" || selected.status === "paid") && <button type="button" className="np-danger-button" onClick={() => handleStatusChange(selected.id, "cancelled")}>{t("myshop_cancel")}</button>}
          {selected.status === "paid" && <button type="button" className="np-danger-button" onClick={() => handleStatusChange(selected.id, "refunded")}>{t("myshop_refund")}</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="np-myshop-orders">
      <div className="np-marketplace-header">
        <h3>{t("myshop_orders_received")}</h3>
        <button type="button" className="np-admin-fees-refresh" onClick={load}><RefreshCw size={14} /></button>
      </div>
      <div className="np-marketplace-filters">
        {["", "pending", "paid", "processing", "completed", "cancelled", "refunded"].map(s => (
          <button key={s} type="button" className={`np-marketplace-filter-btn ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>
            {s === "" ? t("myshop_all") : (statusMap[s]?.label || s)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="np-marketplace-loading"><Loader2 size={20} className="animate-spin" /></div>
      ) : orders.length === 0 ? (
        <div className="np-marketplace-empty"><ShoppingBag size={32} /><p>{t("myshop_no_orders")}</p></div>
      ) : (
        <div className="np-commandes-list">
          {orders.map(o => {
            const st = statusMap[o.status] || statusMap.pending;
            return (
              <button key={o.id} type="button" className="np-commande-row" onClick={async () => {
                const detail = await fetch(`/api/shops?section=shop_order_detail&id=${o.id}`).then(r => r.json());
                if (detail.success) setSelected(detail.order);
              }}>
                <div className="np-commande-row-info">
                  <strong>{o.reference}</strong>
                  <span style={{ fontSize: 11, opacity: 0.4 }}>{o.buyer_name || o.guest_name || t("myshop_guest")} · {new Date(o.created_at).toLocaleDateString("fr-FR")}</span>
                </div>
                <div className="np-commande-row-right">
                  <span className="np-marketplace-badge" style={{ borderColor: st.color, color: st.color }}>{st.label}</span>
                  <span className="np-commande-row-price">{fmtPrice(o.total_amount)}</span>
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

function ShopSettings({ shop, onUpdated, notify }: { shop: Shop; onUpdated: () => void; notify: (m: string) => void }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: shop.name, description: shop.description || "", phone: shop.phone || "",
    email: shop.email || "", address: shop.address || "", logo: shop.logo || "", banner: shop.banner || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/shops", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_shop", data: form }),
      });
      const data = await res.json();
      if (data.success) { notify(t("myshop_shop_updated")); onUpdated(); } else notify(data.error || t("myshop_error"));
    } catch { notify(t("myshop_error")); }
    setSaving(false);
  };

  return (
    <div className="np-myshop-settings">
      <h3>{t("myshop_settings_title")}</h3>
      <div className="np-form-group"><label>{t("myshop_name")}</label><input className="np-text-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
      <div className="np-form-group"><label>{t("myshop_description")}</label><textarea className="np-text-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
      <div className="np-form-row">
        <div className="np-form-group"><label>{t("myshop_phone")}</label><input className="np-text-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
        <div className="np-form-group"><label>Email</label><input className="np-text-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
      </div>
      <div className="np-form-group"><label>{t("myshop_address")}</label><input className="np-text-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
      <div className="np-form-row">
        <div className="np-form-group"><label>{t("myshop_logo_url")}</label><input className="np-text-input" value={form.logo} onChange={e => setForm(f => ({ ...f, logo: e.target.value }))} /></div>
        <div className="np-form-group"><label>{t("myshop_banner_url")}</label><input className="np-text-input" value={form.banner} onChange={e => setForm(f => ({ ...f, banner: e.target.value }))} /></div>
      </div>
      <button type="button" className="np-primary-button" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {t("myshop_save")}
      </button>
    </div>
  );
}
