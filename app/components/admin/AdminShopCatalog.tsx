"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, Pencil, Plus, Save, Search, ShoppingBag, Trash2, X } from "lucide-react";
import type { ShopProduct, ShopSection } from "@/app/lib/shop-catalog";
import { useLanguage } from "@/app/lib/i18n";

type Props = {
  sections: ShopSection[];
  onRefresh: () => Promise<void>;
  onNotify: (message: string) => void;
};

type SectionForm = { name: string; description: string; icon: string; sortOrder: string };
type ProductForm = {
  sectionId: string;
  name: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  badge: string;
  customerLabel: string;
  requiresPassword: boolean;
  sortOrder: string;
  offers: string;
};

const emptySection: SectionForm = { name: "", description: "", icon: "shopping-bag", sortOrder: "30" };
const emptyProduct: ProductForm = {
  sectionId: "",
  name: "",
  subtitle: "",
  description: "",
  imageUrl: "",
  badge: "",
  customerLabel: "Identifiant du compte",
  requiresPassword: false,
  sortOrder: "10",
  offers: "",
};

function formatPrice(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

function offersToText(product: ShopProduct) {
  return product.offers.map((offer) => [offer.name, offer.priceXaf, offer.quantity ?? "", offer.bonus ?? ""].join(" | ")).join("\n");
}

function parseOffers(source: string) {
  return source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const [nameRaw, priceRaw, quantityRaw, bonusRaw] = line.split("|").map((part) => part.trim());
    const priceDigits = (priceRaw || "").replace(/\D/g, "");
    const quantityDigits = (quantityRaw || "").replace(/\D/g, "");
    return {
      id: `${nameRaw || "offre"}-${index + 1}`,
      name: nameRaw || "",
      priceXaf: Number(priceDigits),
      ...(quantityDigits ? { quantity: Number(quantityDigits) } : {}),
      ...(bonusRaw ? { bonus: bonusRaw } : {}),
    };
  });
}

export function AdminShopCatalog({ sections, onRefresh, onNotify }: Props) {
  const { t } = useLanguage();
  const [sectionForm, setSectionForm] = useState<SectionForm>(emptySection);
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProduct);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [savingSection, setSavingSection] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "hidden">("all");
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const [visibleProductCounts, setVisibleProductCounts] = useState<Record<number, number>>({});

  const productsCount = useMemo(() => sections.reduce((total, section) => total + section.products.length, 0), [sections]);
  const firstSectionId = sections[0]?.id ? String(sections[0].id) : "";
  const isInternetSection = sections.find((section) => section.id === Number(productForm.sectionId || firstSectionId))?.slug === "connexion-internet";
  const normalizedCatalogSearch = catalogSearch.trim().toLocaleLowerCase("fr");
  const filteredSections = useMemo(() => sections.map((section) => {
    const sectionMatches = `${section.name} ${section.description}`.toLocaleLowerCase("fr").includes(normalizedCatalogSearch);
    const statusMatches = statusFilter === "all"
      || (statusFilter === "published" ? section.isActive : !section.isActive || section.products.some((product) => !product.isActive));
    const products = section.products.filter((product) => {
      const productStatusMatches = statusFilter === "all"
        || (statusFilter === "published" ? section.isActive && product.isActive : !section.isActive || !product.isActive);
      const productMatches = `${product.name} ${product.subtitle} ${product.description} ${product.offers.map((offer) => `${offer.name} ${offer.priceXaf} ${offer.bonus || ""}`).join(" ")}`.toLocaleLowerCase("fr").includes(normalizedCatalogSearch);
      return productStatusMatches && (!normalizedCatalogSearch || sectionMatches || productMatches);
    });
    return { section, products, statusMatches, sectionMatches };
  }).filter(({ section, products, statusMatches }) =>
    statusMatches
    && (sectionFilter === "all" || sectionFilter === String(section.id))
    && (!normalizedCatalogSearch || products.length > 0 || `${section.name} ${section.description}`.toLocaleLowerCase("fr").includes(normalizedCatalogSearch)),
  ), [normalizedCatalogSearch, sectionFilter, sections, statusFilter]);
  const filteredProductCount = filteredSections.reduce((total, entry) => total + entry.products.length, 0);

  const postAction = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok || !result?.success) throw new Error(result?.error || t("acat_save_failed"));
    return result;
  };

  const resetSectionForm = () => {
    setSectionForm(emptySection);
    setEditingSectionId(null);
    setShowSectionForm(false);
  };

  const resetProductForm = () => {
    setProductForm({ ...emptyProduct, sectionId: firstSectionId });
    setEditingProductId(null);
    setShowProductForm(false);
  };

  const changeProductSection = (sectionId: string) => {
    const nextSection = sections.find((section) => section.id === Number(sectionId));
    setProductForm((current) => ({
      ...current,
      sectionId,
      customerLabel: nextSection?.slug === "connexion-internet"
        ? "Numéro à recharger"
        : current.customerLabel === "Numéro à recharger"
          ? "Identifiant du compte"
          : current.customerLabel,
    }));
  };

  const submitSection = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingSection(true);
    try {
      await postAction({
        action: "save_shop_section",
        ...(editingSectionId ? { id: editingSectionId } : {}),
        name: sectionForm.name,
        description: sectionForm.description,
        icon: sectionForm.icon,
        sortOrder: Number(sectionForm.sortOrder),
      });
      onNotify(editingSectionId ? t("acat_section_updated") : t("acat_section_created"));
      resetSectionForm();
      await onRefresh();
    } catch (error: any) {
      onNotify(error?.message || t("acat_section_save_failed"));
    } finally {
      setSavingSection(false);
    }
  };

  const submitProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProduct(true);
    try {
      const offers = parseOffers(productForm.offers);
      if (!offers.length || offers.some((offer) => !offer.name || !Number.isSafeInteger(offer.priceXaf) || offer.priceXaf < 1)) {
        throw new Error(t("acat_offer_format_error"));
      }
      await postAction({
        action: "save_shop_product",
        ...(editingProductId ? { id: editingProductId } : {}),
        sectionId: Number(productForm.sectionId || firstSectionId),
        name: productForm.name,
        subtitle: productForm.subtitle,
        description: productForm.description,
        imageUrl: productForm.imageUrl,
        badge: productForm.badge,
        customerLabel: productForm.customerLabel,
        requiresPassword: productForm.requiresPassword,
        sortOrder: Number(productForm.sortOrder),
        offers,
      });
      onNotify(editingProductId ? t("acat_product_updated") : t("acat_product_added"));
      resetProductForm();
      await onRefresh();
    } catch (error: any) {
      onNotify(error?.message || t("acat_product_save_failed"));
    } finally {
      setSavingProduct(false);
    }
  };

  const editSection = (section: ShopSection) => {
    setShowProductForm(false);
    setShowSectionForm(true);
    setEditingSectionId(section.id);
    setSectionForm({ name: section.name, description: section.description, icon: section.icon, sortOrder: String(section.sortOrder) });
    window.setTimeout(() => document.getElementById("admin-shop-section-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const editProduct = (product: ShopProduct) => {
    setShowSectionForm(false);
    setShowProductForm(true);
    setEditingProductId(product.id);
    setProductForm({
      sectionId: String(product.sectionId),
      name: product.name,
      subtitle: product.subtitle,
      description: product.description,
      imageUrl: product.imageUrl,
      badge: product.badge,
      customerLabel: product.customerLabel,
      requiresPassword: product.requiresPassword,
      sortOrder: String(product.sortOrder),
      offers: offersToText(product),
    });
    window.setTimeout(() => document.getElementById("admin-shop-product-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const addProductToSection = (section: ShopSection) => {
    setShowSectionForm(false);
    setShowProductForm(true);
    setEditingProductId(null);
    setProductForm({
      ...emptyProduct,
      sectionId: String(section.id),
      customerLabel: section.slug === "connexion-internet" ? "Numéro à recharger" : emptyProduct.customerLabel,
    });
    window.setTimeout(() => document.getElementById("admin-shop-product-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const startSectionCreation = () => {
    setSectionForm(emptySection);
    setEditingSectionId(null);
    setShowProductForm(false);
    setShowSectionForm(true);
    window.setTimeout(() => document.getElementById("admin-shop-section-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const startProductCreation = () => {
    const section = sections.find((candidate) => candidate.id === Number(sectionFilter)) || sections[0];
    if (!section) {
      startSectionCreation();
      return;
    }
    addProductToSection(section);
  };

  const addOfferToProduct = (product: ShopProduct) => {
    editProduct(product);
    setProductForm((current) => ({ ...current, offers: `${offersToText(product)}\nNouveau forfait | ` }));
    window.setTimeout(() => document.getElementById("admin-shop-offers")?.focus(), 250);
  };

  const toggleSection = async (section: ShopSection) => {
    try {
      await postAction({ action: "set_shop_section_status", sectionId: section.id, isActive: !section.isActive });
      onNotify(section.isActive ? t("acat_section_hidden") : t("acat_section_published"));
      await onRefresh();
    } catch (error: any) { onNotify(error?.message || t("acat_update_failed")); }
  };

  const deleteSection = async (section: ShopSection) => {
    if (!window.confirm(t("acat_confirm_delete_section").replace("{n}", section.name))) return;
    try {
      await postAction({ action: "delete_shop_section", sectionId: section.id });
      onNotify(t("acat_section_deleted"));
      await onRefresh();
    } catch (error: any) { onNotify(error?.message || t("acat_delete_failed")); }
  };

  const toggleProduct = async (product: ShopProduct) => {
    try {
      await postAction({ action: "set_shop_product_status", productId: product.id, isActive: !product.isActive });
      onNotify(product.isActive ? t("acat_item_hidden") : t("acat_item_published"));
      await onRefresh();
    } catch (error: any) { onNotify(error?.message || t("acat_update_failed")); }
  };

  const deleteProduct = async (product: ShopProduct) => {
    if (!window.confirm(t("acat_confirm_delete_product").replace("{n}", product.name))) return;
    try {
      await postAction({ action: "delete_shop_product", productId: product.id });
      onNotify(t("acat_item_deleted"));
      await onRefresh();
    } catch (error: any) { onNotify(error?.message || t("acat_delete_failed")); }
  };

  return (
    <div className="np-admin-shop-layout">
      <section className="np-panel np-admin-shop-intro">
        <div className="np-admin-shop-intro-icon"><ShoppingBag size={22} /></div>
        <div>
          <span className="np-overline">{t("acat_overline_catalog")}</span>
          <h2>{t("acat_shop_title")}</h2>
          <p>{t("acat_shop_intro")}</p>
        </div>
        <div className="np-admin-shop-counts"><strong>{sections.length}</strong><span>{t("acat_categories")}</span><i /><strong>{productsCount}</strong><span>{t("acat_products")}</span></div>
        <div className="np-admin-shop-primary-actions">
          <button className="np-btn-sm outline" type="button" onClick={startSectionCreation}><Plus size={15} />{t("acat_new_category")}</button>
          <button className="np-btn-sm success" type="button" onClick={startProductCreation} disabled={!sections.length}><Plus size={15} />{t("acat_new_product")}</button>
        </div>
      </section>

      {showSectionForm && <section className="np-panel np-admin-shop-form-panel" id="admin-shop-section-form">
        <div className="np-panel-heading">
          <div><span className="np-overline">{t("acat_overline_organization")}</span><h2>{editingSectionId ? t("acat_edit_category") : t("acat_create_category")}</h2></div>
          <button type="button" className="np-admin-shop-close-form" onClick={resetSectionForm} aria-label={t("acat_close_form")}><X size={18} /></button>
        </div>
        <form className="np-admin-shop-form" onSubmit={submitSection}>
          <label>{t("acat_label_category_name")}<input required minLength={2} maxLength={80} value={sectionForm.name} onChange={(event) => setSectionForm({ ...sectionForm, name: event.target.value })} placeholder={t("acat_ph_category_name")} /></label>
          <label>{t("acat_label_description")}<input maxLength={240} value={sectionForm.description} onChange={(event) => setSectionForm({ ...sectionForm, description: event.target.value })} placeholder={t("acat_ph_category_description")} /></label>
          <label>{t("acat_label_icon")}<select value={sectionForm.icon} onChange={(event) => setSectionForm({ ...sectionForm, icon: event.target.value })}><option value="coins">{t("acat_icon_coins")}</option><option value="gamepad-2">{t("acat_icon_games")}</option><option value="wifi">{t("acat_icon_internet")}</option><option value="sparkles">{t("acat_icon_digital")}</option><option value="shopping-bag">{t("acat_icon_other")}</option></select></label>
          <label>{t("acat_label_position")}<input type="number" min={0} max={100000} value={sectionForm.sortOrder} onChange={(event) => setSectionForm({ ...sectionForm, sortOrder: event.target.value })} /></label>
          <div className="np-admin-shop-form-actions"><button className="np-btn-sm success" type="submit" disabled={savingSection}><Save size={15} />{savingSection ? t("acat_saving") : editingSectionId ? t("acat_save_category") : t("acat_create_category_btn")}</button><button className="np-btn-sm outline" type="button" onClick={resetSectionForm}>{t("acat_cancel")}</button></div>
        </form>
      </section>}

      {showProductForm && <section className="np-panel np-admin-shop-form-panel" id="admin-shop-product-form">
        <div className="np-panel-heading">
          <div><span className="np-overline">{t("acat_overline_shop_content")}</span><h2>{isInternetSection ? (editingProductId ? t("acat_edit_internet_plan") : t("acat_add_internet_plan")) : editingProductId ? t("acat_edit_item") : t("acat_add_item")}</h2></div>
          <button type="button" className="np-admin-shop-close-form" onClick={resetProductForm} aria-label={t("acat_close_form")}><X size={18} /></button>
        </div>
        {sections.length === 0 ? <p className="np-admin-shop-empty">{t("acat_create_section_first")}</p> : (
          <form className="np-admin-shop-form" onSubmit={submitProduct}>
            <label>{t("acat_label_section")}<select required value={productForm.sectionId || firstSectionId} onChange={(event) => changeProductSection(event.target.value)}>{sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></label>
            <label>{isInternetSection ? t("acat_label_plan_name") : t("acat_label_item_name")}<input required minLength={2} maxLength={80} value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} placeholder={isInternetSection ? t("acat_ph_plan_name") : t("acat_ph_item_name")} /></label>
            <label>{t("acat_label_subtitle")}<input maxLength={120} value={productForm.subtitle} onChange={(event) => setProductForm({ ...productForm, subtitle: event.target.value })} placeholder={t("acat_ph_subtitle")} /></label>
            <label>{t("acat_label_image")}<input maxLength={500} value={productForm.imageUrl} onChange={(event) => setProductForm({ ...productForm, imageUrl: event.target.value })} placeholder="/images/free-fire.png" /></label>
            <label>{t("acat_label_badge")}<input maxLength={40} value={productForm.badge} onChange={(event) => setProductForm({ ...productForm, badge: event.target.value })} placeholder={t("acat_ph_badge")} /></label>
            <label>{t("acat_label_customer_field")}<input maxLength={60} value={productForm.customerLabel} onChange={(event) => setProductForm({ ...productForm, customerLabel: event.target.value })} placeholder={t("acat_ph_customer_field")} /></label>
            <label className="wide">{t("acat_label_description")}<input maxLength={500} value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} placeholder={t("acat_ph_description")} /></label>
            <label className="wide">{isInternetSection ? t("acat_label_offers_internet") : t("acat_label_offers")}<textarea id="admin-shop-offers" required rows={5} value={productForm.offers} onChange={(event) => setProductForm({ ...productForm, offers: event.target.value })} placeholder={isInternetSection ? t("acat_ph_offers_internet") : t("acat_ph_offers")} /><small>{t("acat_offers_hint")}</small></label>
            <label>{t("acat_label_position")}<input type="number" min={0} max={100000} value={productForm.sortOrder} onChange={(event) => setProductForm({ ...productForm, sortOrder: event.target.value })} /></label>
            <label className="np-admin-shop-check"><input type="checkbox" checked={productForm.requiresPassword} onChange={(event) => setProductForm({ ...productForm, requiresPassword: event.target.checked })} />{t("acat_requires_password")}</label>
            <div className="np-admin-shop-form-actions"><button className="np-btn-sm success" type="submit" disabled={savingProduct}><Save size={15} />{savingProduct ? t("acat_saving") : editingProductId ? t("acat_save_changes") : isInternetSection ? t("acat_add_plan_btn") : t("acat_add_product_btn")}</button><button className="np-btn-sm outline" type="button" onClick={resetProductForm}>{t("acat_cancel")}</button></div>
          </form>
        )}
      </section>}

      <section className="np-admin-shop-catalogue" aria-label={t("acat_aria_shop_products")}>
        <div className="np-panel np-admin-shop-toolbar">
          <label className="np-admin-shop-search"><Search size={17} /><input type="search" value={catalogSearch} onChange={(event) => { setCatalogSearch(event.target.value); setVisibleProductCounts({}); }} placeholder={t("acat_ph_search")} aria-label={t("acat_aria_search")} />{catalogSearch && <button type="button" onClick={() => setCatalogSearch("")} aria-label={t("acat_aria_clear_search")}><X size={15} /></button>}</label>
          <label className="np-admin-shop-filter"><span>{t("acat_filter_category")}</span><select value={sectionFilter} onChange={(event) => { setSectionFilter(event.target.value); setVisibleProductCounts({}); }}><option value="all">{t("acat_all_categories")}</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></label>
          <label className="np-admin-shop-filter"><span>{t("acat_filter_visibility")}</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setVisibleProductCounts({}); }}><option value="all">{t("acat_visibility_all")}</option><option value="published">{t("acat_visibility_published")}</option><option value="hidden">{t("acat_visibility_hidden")}</option></select></label>
          <div className="np-admin-shop-result-count"><strong>{filteredProductCount}</strong> {filteredProductCount === 1 ? t("acat_product_one") : t("acat_product_many")}</div>
        </div>

        {filteredSections.length === 0 ? <div className="np-panel np-admin-shop-no-results"><Search size={22} /><strong>{t("acat_no_results")}</strong><span>{t("acat_no_results_hint")}</span><button type="button" className="np-btn-sm outline" onClick={() => { setCatalogSearch(""); setSectionFilter("all"); setStatusFilter("all"); }}>{t("acat_clear_filters")}</button></div> : <div className="np-admin-shop-sections">
          {filteredSections.map(({ section, products }) => {
            const isExpanded = expandedSections[section.id] ?? Boolean(normalizedCatalogSearch || sectionFilter !== "all" || statusFilter !== "all");
            const visibleCount = visibleProductCounts[section.id] ?? 6;
            const displayedProducts = products.slice(0, visibleCount);
            return <article className={`np-panel np-admin-shop-section${isExpanded ? " is-expanded" : ""}`} key={section.id}>
              <header>
                <button type="button" className="np-admin-shop-section-summary" aria-expanded={isExpanded} onClick={() => setExpandedSections((current) => ({ ...current, [section.id]: !isExpanded }))}>
                  <span className={`np-admin-shop-status ${section.isActive ? "is-published" : "is-hidden"}`}>{section.isActive ? t("acat_status_published_f") : t("acat_status_hidden_f")}</span>
                  <span className="np-admin-shop-section-copy"><strong>{section.name}</strong>{section.description && <small>{section.description}</small>}</span>
                  <span className="np-admin-shop-section-count">{products.length} {products.length === 1 ? t("acat_product_one") : t("acat_product_many")}</span>
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                <div className="np-admin-shop-actions np-admin-shop-section-actions">
                  <button type="button" className="np-btn-sm success" onClick={() => addProductToSection(section)}><Plus size={14} /><span>{t("acat_add_product")}</span></button>
                  <button type="button" className="np-btn-sm outline" onClick={() => editSection(section)} aria-label={t("acat_aria_edit").replace("{n}", section.name)}><Pencil size={14} /><span>{t("acat_edit")}</span></button>
                  <button type="button" className="np-btn-sm outline" onClick={() => void toggleSection(section)} aria-label={section.isActive ? t("acat_aria_hide").replace("{n}", section.name) : t("acat_aria_publish").replace("{n}", section.name)}>{section.isActive ? <EyeOff size={14} /> : <Eye size={14} />}<span>{section.isActive ? t("acat_hide") : t("acat_publish")}</span></button>
                  <button type="button" className="np-btn-sm danger" onClick={() => void deleteSection(section)} aria-label={t("acat_aria_delete").replace("{n}", section.name)}><Trash2 size={14} /><span>{t("acat_delete")}</span></button>
                </div>
              </header>
              {isExpanded && <div className="np-admin-shop-product-list">
                {displayedProducts.map((product) => {
                  const lowestPrice = Math.min(...product.offers.map((offer) => offer.priceXaf));
                  const previewOffers = product.offers.slice(0, 3);
                  return <div className={`np-admin-shop-product${product.isActive ? "" : " is-hidden"}`} key={product.id}>
                    <div className="np-admin-shop-product-mark">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <ShoppingBag size={19} />}</div>
                    <div className="np-admin-shop-product-info"><strong>{product.name}</strong><small>{product.subtitle || product.description || t("acat_no_description")}</small><span>{product.offers.length} {product.offers.length === 1 ? t("acat_offer_one") : t("acat_offer_many")} · {t("acat_from")} {Number.isFinite(lowestPrice) ? formatPrice(lowestPrice) : "—"} · {product.isActive ? t("acat_status_published_m") : t("acat_status_hidden_m")}</span>{section.slug === "connexion-internet" && <span className="np-admin-shop-offer-summary">{previewOffers.map((offer) => <span key={offer.id}>{offer.name} <strong>{formatPrice(offer.priceXaf)}</strong></span>)}{product.offers.length > previewOffers.length && <span className="np-admin-shop-more-offers">{t("acat_more_offers").replace("{n}", String(product.offers.length - previewOffers.length))}</span>}</span>}</div>
                    <div className="np-admin-shop-actions np-admin-shop-product-actions">{section.slug === "connexion-internet" && <button type="button" className="np-btn-sm outline np-admin-shop-add-offer" onClick={() => addOfferToProduct(product)}><Plus size={14} /><span>{t("acat_add_offer")}</span></button>}<button type="button" className="np-btn-sm outline np-admin-shop-edit-offers" onClick={() => editProduct(product)} aria-label={(section.slug === "connexion-internet" ? t("acat_aria_edit_prices") : t("acat_aria_edit")).replace("{n}", product.name)}><Pencil size={14} /><span>{t("acat_edit")}</span></button><button type="button" className="np-btn-sm outline" onClick={() => void toggleProduct(product)} aria-label={product.isActive ? t("acat_aria_hide").replace("{n}", product.name) : t("acat_aria_publish").replace("{n}", product.name)}>{product.isActive ? <EyeOff size={14} /> : <Eye size={14} />}<span>{product.isActive ? t("acat_hide") : t("acat_publish")}</span></button><button type="button" className="np-btn-sm danger" onClick={() => void deleteProduct(product)} aria-label={t("acat_aria_delete").replace("{n}", product.name)}><Trash2 size={14} /><span>{t("acat_delete")}</span></button></div>
                  </div>;
                })}
                {products.length === 0 && <p className="np-admin-shop-empty">{t("acat_no_products_filter")}</p>}
                {products.length > visibleCount && <button type="button" className="np-admin-shop-load-more" onClick={() => setVisibleProductCounts((current) => ({ ...current, [section.id]: visibleCount + 6 }))}>{t("acat_show_next")}</button>}
                {visibleCount > 6 && products.length > 6 && <button type="button" className="np-admin-shop-show-less" onClick={() => setVisibleProductCounts((current) => ({ ...current, [section.id]: 6 }))}>{t("acat_show_less")}</button>}
              </div>}
            </article>;
          })}
        </div>}
      </section>
    </div>
  );
}
