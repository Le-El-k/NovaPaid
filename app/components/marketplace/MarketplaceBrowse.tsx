"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/app/lib/i18n";
import {
  ArrowLeft, ChevronRight, Eye, Filter, Grid, List, Loader2,
  MessageSquare, Search, ShoppingCart, Star, Tag, X,
} from "lucide-react";

interface Article {
  id: number;
  title: string;
  description: string;
  price: number;
  image: string | null;
  category_name: string | null;
  categorie_id: number | null;
  quantity: number;
  quantity_remaining: number;
  is_active: number;
  offer_is_active: number;
  plan_name: string | null;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
}

export function MarketplaceBrowse() {
  const { t } = useLanguage();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [articleDetail, setArticleDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [categoryFields, setCategoryFields] = useState<any[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 4000); };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ section: "articles" });
      if (selectedCategory) params.set("category", String(selectedCategory));
      if (search.trim()) params.set("search", search.trim());
      const [artRes, catRes] = await Promise.all([
        fetch(`/api/marketplace?${params}`),
        fetch("/api/marketplace?section=categories"),
      ]);
      const artData = await artRes.json();
      const catData = await catRes.json();
      if (artData.success) setArticles(artData.articles);
      if (catData.success) setCategories(catData.categories);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, [selectedCategory]);

  const handleSearch = () => { fetchArticles(); };

  const openDetail = async (article: Article) => {
    setSelectedArticle(article);
    setLoadingDetail(true);
    setShowOrderForm(false);
    setOrderQuantity(1);
    setFieldValues({});
    try {
      const res = await fetch(`/api/marketplace?section=article&id=${article.id}`);
      const data = await res.json();
      if (data.success) {
        setArticleDetail(data.article);
        setCategoryFields(data.article.fields || []);
        fetch("/api/marketplace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "track_view", article_id: article.id }),
        }).catch(() => {});
      }
    } catch (e) { console.error(e); }
    setLoadingDetail(false);
  };

  const closeDetail = () => { setSelectedArticle(null); setArticleDetail(null); setShowOrderForm(false); };

  const handleOrder = async () => {
    if (!selectedArticle) return;
    setOrdering(true);
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_commande",
          article_id: selectedArticle.id,
          quantity: orderQuantity,
          payment_method: "wallet",
          category_fields: Object.keys(fieldValues).length > 0 ? fieldValues : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify(t("mbrow_order_success"));
        closeDetail();
        fetchArticles();
      } else {
        notify(data.error || t("mbrow_order_error"));
      }
    } catch { notify(t("mbrow_connection_error")); }
    setOrdering(false);
  };

  const fmtPrice = (price: number) => `${Math.round(price).toLocaleString("fr-FR")} FCFA`;

  if (selectedArticle) {
    return (
      <div className="np-marketplace">
        {notification && <div className="np-marketplace-toast">{notification}</div>}

        <button type="button" className="np-marketplace-back" onClick={closeDetail}>
          <ArrowLeft size={16} /> {t("mbrow_back_to_articles")}
        </button>

        {loadingDetail ? (
          <div className="np-marketplace-loading"><Loader2 size={20} className="animate-spin" /> {t("mbrow_loading")}</div>
        ) : articleDetail ? (
          <div className="np-marketplace-detail">
            <div className="np-marketplace-detail-header">
              {articleDetail.image && (
                <div className="np-marketplace-detail-image">
                  <img src={articleDetail.image} alt={articleDetail.title} />
                </div>
              )}
              <div className="np-marketplace-detail-info">
                <div className="np-marketplace-detail-meta">
                  {articleDetail.category_name && <span className="np-marketplace-badge">{articleDetail.category_name}</span>}
                  {articleDetail.plan_name && <span className="np-marketplace-badge accent">{articleDetail.plan_name}</span>}
                  {articleDetail.offer_is_active === 1 && <span className="np-marketplace-badge promo">PROMO</span>}
                </div>
                <h2>{articleDetail.title}</h2>
                <div className="np-marketplace-detail-price">{fmtPrice(articleDetail.price)}</div>
                {articleDetail.quantity > 0 && (
                  <div className="np-marketplace-detail-stock">
                    {t("mbrow_stock_label")} <strong>{articleDetail.quantity_remaining}</strong> / {articleDetail.quantity}
                  </div>
                )}
                {articleDetail.description && (
                  <p className="np-marketplace-detail-desc">{articleDetail.description}</p>
                )}
                {articleDetail.plan_description && (
                  <p className="np-marketplace-detail-desc" style={{ opacity: 0.6, fontSize: 12 }}>{articleDetail.plan_description}</p>
                )}

                {!showOrderForm ? (
                  <button type="button" className="np-marketplace-order-btn" onClick={() => setShowOrderForm(true)}
                    disabled={articleDetail.quantity > 0 && articleDetail.quantity_remaining < 1}>
                    <ShoppingCart size={16} /> {t("mbrow_order_cta")}
                  </button>
                ) : (
                  <div className="np-marketplace-order-form">
                    <h4>{t("mbrow_place_order")}</h4>
                    <div className="np-marketplace-order-field">
                      <label>{t("mbrow_quantity")}</label>
                      <input type="number" min={1} max={articleDetail.quantity > 0 ? articleDetail.quantity_remaining : 99}
                        value={orderQuantity} onChange={e => setOrderQuantity(Number(e.target.value))} className="np-text-input" />
                    </div>

                    {categoryFields.map((field: any) => (
                      <div key={field.id} className="np-marketplace-order-field">
                        <label>{field.field_label} {field.is_required ? "*" : ""}</label>
                        {field.field_type === "select" && field.options ? (
                          <select className="np-text-input" value={fieldValues[field.field_name] || ""}
                            onChange={e => setFieldValues({ ...fieldValues, [field.field_name]: e.target.value })}>
                            <option value="">{t("mbrow_select")}</option>
                            {field.options.split(",").map((opt: string) => (
                              <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                            ))}
                          </select>
                        ) : field.field_type === "textarea" ? (
                          <textarea className="np-text-input" rows={3} value={fieldValues[field.field_name] || ""}
                            onChange={e => setFieldValues({ ...fieldValues, [field.field_name]: e.target.value })} />
                        ) : (
                          <input type={field.field_type || "text"} className="np-text-input" value={fieldValues[field.field_name] || ""}
                            onChange={e => setFieldValues({ ...fieldValues, [field.field_name]: e.target.value })} />
                        )}
                      </div>
                    ))}

                    <div className="np-marketplace-order-total">
                      {t("mbrow_total")} <strong>{fmtPrice(articleDetail.price * orderQuantity)}</strong>
                    </div>
                    <div className="np-marketplace-order-actions">
                      <button type="button" className="np-secondary-button" onClick={() => setShowOrderForm(false)}><X size={14} /> {t("mbrow_cancel")}</button>
                      <button type="button" className="np-primary-button" onClick={handleOrder} disabled={ordering}>
                        {ordering ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                        {ordering ? t("mbrow_in_progress") : t("mbrow_pay_wallet")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {articleDetail.comments && articleDetail.comments.length > 0 && (
              <div className="np-marketplace-comments">
                <h4><MessageSquare size={14} /> {t("mbrow_reviews").replace("{n}", String(articleDetail.comments.length))}</h4>
                {articleDetail.comments.map((c: any) => (
                  <div key={c.id} className="np-marketplace-comment">
                    <strong>{c.user_name || t("mbrow_anonymous")}</strong>
                    {c.rating && <span className="np-marketplace-comment-rating">{"★".repeat(c.rating)}{"☆".repeat(5 - c.rating)}</span>}
                    <p>{c.content}</p>
                    <small>{new Date(c.created_at).toLocaleDateString("fr-FR")}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="np-marketplace">
      {notification && <div className="np-marketplace-toast">{notification}</div>}

      <div className="np-marketplace-header">
        <h2>Marketplace</h2>
        <p>{t("mbrow_subtitle")}</p>
      </div>

      <div className="np-marketplace-toolbar">
        <div className="np-marketplace-search">
          <Search size={15} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder={t("mbrow_search_placeholder")} />
          {search && <button type="button" onClick={() => { setSearch(""); fetchArticles(); }}><X size={14} /></button>}
        </div>

        <div className="np-marketplace-filters">
          <button type="button" className={`np-marketplace-filter-btn ${!selectedCategory ? "active" : ""}`}
            onClick={() => setSelectedCategory(null)}>
            {t("mbrow_all")}
          </button>
          {categories.map(cat => (
            <button key={cat.id} type="button"
              className={`np-marketplace-filter-btn ${selectedCategory === cat.id ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat.id)}>
              {cat.name}
            </button>
          ))}
        </div>

        <div className="np-marketplace-view-toggle">
          <button type="button" className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}><Grid size={15} /></button>
          <button type="button" className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}><List size={15} /></button>
        </div>
      </div>

      {loading ? (
        <div className="np-marketplace-loading"><Loader2 size={20} className="animate-spin" /> {t("mbrow_loading_articles")}</div>
      ) : articles.length === 0 ? (
        <div className="np-marketplace-empty">
          <ShoppingCart size={32} />
          <p>{t("mbrow_no_articles")}</p>
        </div>
      ) : (
        <div className={`np-marketplace-grid ${viewMode}`}>
          {articles.map(article => (
            <button key={article.id} type="button" className="np-marketplace-card" onClick={() => openDetail(article)}>
              {article.image && (
                <div className="np-marketplace-card-image">
                  <img src={article.image} alt={article.title} loading="lazy" />
                  {article.offer_is_active === 1 && <span className="np-marketplace-card-promo">PROMO</span>}
                </div>
              )}
              <div className="np-marketplace-card-body">
                <div className="np-marketplace-card-tags">
                  {article.category_name && <span className="np-marketplace-badge">{article.category_name}</span>}
                  {article.plan_name && <span className="np-marketplace-badge accent">{article.plan_name}</span>}
                </div>
                <h3>{article.title}</h3>
                {article.description && <p className="np-marketplace-card-desc">{article.description}</p>}
                <div className="np-marketplace-card-footer">
                  <span className="np-marketplace-card-price">{fmtPrice(article.price)}</span>
                  {article.quantity > 0 && (
                    <span className="np-marketplace-card-stock">
                      {article.quantity_remaining > 0 ? t("mbrow_in_stock").replace("{n}", String(article.quantity_remaining)) : t("mbrow_sold_out")}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
