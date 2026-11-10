"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft, ChevronRight, Loader2, Package, ShoppingBag, ShoppingCart, Star, Store,
} from "lucide-react";

const fmtPrice = (p: number) => `${Math.round(p).toLocaleString("fr-FR")} FCFA`;
const productTypeLabels: Record<string, string> = {
  physical: "Physique", digital_file: "Fichier", digital_link: "Lien", digital_account: "Compte",
};

export function PublicShop({ slug }: { slug: string }) {
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [orderForm, setOrderForm] = useState({ quantity: 1, guest_name: "", guest_email: "", guest_phone: "" });
  const [ordering, setOrdering] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<any>(null);
  const [isAuth, setIsAuth] = useState(false);

  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 4000); };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [shopRes, authRes] = await Promise.all([
          fetch(`/api/shops?section=public_shop&slug=${encodeURIComponent(slug)}`),
          fetch("/api/shops?section=my_shop"),
        ]);
        const shopData = await shopRes.json();
        if (shopData.success) { setShop(shopData.shop); setProducts(shopData.products || []); }
        const authData = await authRes.json();
        if (authData.success && authData.shop !== undefined) setIsAuth(true);
      } catch { }
      setLoading(false);
    })();
  }, [slug]);

  const handleOrder = async () => {
    if (!selectedProduct) return;
    setOrdering(true);
    try {
      const payload: any = {
        items: [{ productId: selectedProduct.id, quantity: orderForm.quantity }],
        shop_id: shop.id,
      };
      if (isAuth) {
        payload.action = "place_order";
        payload.payment_method = "wallet";
      } else {
        payload.action = "guest_checkout";
        payload.guest_name = orderForm.guest_name;
        payload.guest_email = orderForm.guest_email;
        payload.guest_phone = orderForm.guest_phone;
      }
      const res = await fetch("/api/shops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        setOrderResult(data);
        notify("Commande passée avec succès !");
      } else notify(data.error || "Erreur");
    } catch { notify("Erreur réseau"); }
    setOrdering(false);
  };

  if (loading) return <div className="np-marketplace-loading"><Loader2 size={20} className="animate-spin" /> Chargement...</div>;
  if (!shop) return <div className="np-marketplace-empty"><Store size={32} /><p>Boutique introuvable.</p></div>;

  if (orderResult) {
    return (
      <div className="np-public-shop-order-success">
        <div className="np-public-shop-success-card">
          <ShoppingBag size={40} style={{ color: "#10b981" }} />
          <h2>Commande confirmée !</h2>
          <p>Référence : <strong>{orderResult.reference}</strong></p>
          {orderResult.guestToken && <p style={{ fontSize: 12, opacity: 0.5 }}>Conservez cette référence pour suivre votre commande.</p>}
          <button type="button" className="np-primary-button" onClick={() => { setOrderResult(null); setSelectedProduct(null); }}>
            Continuer les achats
          </button>
        </div>
      </div>
    );
  }

  if (selectedProduct) {
    const p = selectedProduct;
    const total = p.price * orderForm.quantity;
    return (
      <div className="np-public-shop-product-detail">
        {notification && <div className="np-marketplace-toast">{notification}</div>}
        <button type="button" className="np-marketplace-back" onClick={() => setSelectedProduct(null)}>
          <ArrowLeft size={16} /> Retour à la boutique
        </button>
        <div className="np-public-shop-product-card">
          {p.image && <img src={p.image} alt="" className="np-public-shop-product-image" />}
          <div className="np-public-shop-product-info">
            <h2>{p.name}</h2>
            <div className="np-public-shop-product-badges">
              <span className="np-marketplace-badge">{productTypeLabels[p.product_type] || p.product_type}</span>
              {p.is_featured ? <span className="np-marketplace-badge" style={{ borderColor: "#f59e0b", color: "#f59e0b" }}><Star size={10} /> Vedette</span> : null}
            </div>
            <p className="np-public-shop-product-price">{fmtPrice(p.price)}</p>
            {p.description && <p className="np-public-shop-product-desc">{p.description}</p>}
            {!p.unlimited_stock && p.stock !== null && <p style={{ fontSize: 12, opacity: 0.5 }}>Stock : {p.stock}</p>}
          </div>
        </div>

        <div className="np-public-shop-order-form">
          <h3><ShoppingCart size={16} /> Commander</h3>
          <div className="np-form-group">
            <label>Quantité</label>
            <input className="np-text-input" type="number" min={1} max={p.unlimited_stock ? 999 : p.stock || 1} value={orderForm.quantity} onChange={e => setOrderForm(f => ({ ...f, quantity: Number(e.target.value) || 1 }))} />
          </div>

          {!isAuth && (
            <>
              <div className="np-form-group"><label>Nom *</label><input className="np-text-input" value={orderForm.guest_name} onChange={e => setOrderForm(f => ({ ...f, guest_name: e.target.value }))} /></div>
              <div className="np-form-group"><label>Email *</label><input className="np-text-input" type="email" value={orderForm.guest_email} onChange={e => setOrderForm(f => ({ ...f, guest_email: e.target.value }))} /></div>
              <div className="np-form-group"><label>Téléphone</label><input className="np-text-input" value={orderForm.guest_phone} onChange={e => setOrderForm(f => ({ ...f, guest_phone: e.target.value }))} /></div>
            </>
          )}

          <div className="np-public-shop-total">
            <span>Total</span><strong>{fmtPrice(total)}</strong>
          </div>
          <button type="button" className="np-primary-button" onClick={handleOrder} disabled={ordering || (!isAuth && (!orderForm.guest_name || !orderForm.guest_email))}>
            {ordering ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
            {isAuth ? "Payer avec mon portefeuille" : "Commander en tant qu'invité"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="np-public-shop">
      {notification && <div className="np-marketplace-toast">{notification}</div>}
      {shop.banner && <img src={shop.banner} alt="" className="np-public-shop-banner" />}
      <div className="np-public-shop-header">
        {shop.logo && <img src={shop.logo} alt="" className="np-public-shop-logo" />}
        <div>
          <h1>{shop.name}</h1>
          {shop.description && <p>{shop.description}</p>}
        </div>
      </div>

      <h2 className="np-public-shop-section-title"><Package size={18} /> Produits ({products.length})</h2>

      {products.length === 0 ? (
        <div className="np-marketplace-empty"><Package size={32} /><p>Aucun produit disponible.</p></div>
      ) : (
        <div className="np-marketplace-grid">
          {products.map((p: any) => (
            <button key={p.id} type="button" className="np-marketplace-card" onClick={() => { setSelectedProduct(p); setOrderForm(f => ({ ...f, quantity: 1 })); }}>
              {p.image && <img src={p.image} alt="" className="np-marketplace-card-image" />}
              <div className="np-marketplace-card-body">
                <h3>{p.name}</h3>
                <div className="np-marketplace-card-meta">
                  <span className="np-marketplace-badge">{productTypeLabels[p.product_type] || p.product_type}</span>
                </div>
                <p className="np-marketplace-card-price">{fmtPrice(p.price)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
