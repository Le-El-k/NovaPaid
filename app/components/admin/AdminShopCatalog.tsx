"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, Pencil, Plus, Save, Search, ShoppingBag, Trash2, X } from "lucide-react";
import type { ShopProduct, ShopSection } from "@/app/lib/shop-catalog";

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
    if (!response.ok || !result?.success) throw new Error(result?.error || "Enregistrement impossible.");
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
      onNotify(editingSectionId ? "Section boutique mise à jour." : "Section boutique créée.");
      resetSectionForm();
      await onRefresh();
    } catch (error: any) {
      onNotify(error?.message || "Impossible d’enregistrer la section.");
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
        throw new Error("Chaque offre doit respecter le format : nom | prix FCFA | quantité | bonus.");
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
      onNotify(editingProductId ? "Élément boutique mis à jour." : "Élément ajouté à la boutique.");
      resetProductForm();
      await onRefresh();
    } catch (error: any) {
      onNotify(error?.message || "Impossible d’enregistrer l’élément.");
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
      onNotify(section.isActive ? "Section masquée dans la boutique." : "Section publiée dans la boutique.");
      await onRefresh();
    } catch (error: any) { onNotify(error?.message || "Mise à jour impossible."); }
  };

  const deleteSection = async (section: ShopSection) => {
    if (!window.confirm(`Supprimer la section « ${section.name} » ?`)) return;
    try {
      await postAction({ action: "delete_shop_section", sectionId: section.id });
      onNotify("Section supprimée.");
      await onRefresh();
    } catch (error: any) { onNotify(error?.message || "Suppression impossible."); }
  };

  const toggleProduct = async (product: ShopProduct) => {
    try {
      await postAction({ action: "set_shop_product_status", productId: product.id, isActive: !product.isActive });
      onNotify(product.isActive ? "Élément masqué dans la boutique." : "Élément publié dans la boutique.");
      await onRefresh();
    } catch (error: any) { onNotify(error?.message || "Mise à jour impossible."); }
  };

  const deleteProduct = async (product: ShopProduct) => {
    if (!window.confirm(`Supprimer « ${product.name} » et ses offres ?`)) return;
    try {
      await postAction({ action: "delete_shop_product", productId: product.id });
      onNotify("Élément supprimé de la boutique.");
      await onRefresh();
    } catch (error: any) { onNotify(error?.message || "Suppression impossible."); }
  };

  return (
    <div className="np-admin-shop-layout">
      <section className="np-panel np-admin-shop-intro">
        <div className="np-admin-shop-intro-icon"><ShoppingBag size={22} /></div>
        <div>
          <span className="np-overline">CATALOGUE CLIENT</span>
          <h2>La boutique NovaPaid</h2>
          <p>Retrouvez chaque catégorie, gérez ses produits et publiez vos modifications dans l’espace client.</p>
        </div>
        <div className="np-admin-shop-counts"><strong>{sections.length}</strong><span>catégories</span><i /><strong>{productsCount}</strong><span>produits</span></div>
        <div className="np-admin-shop-primary-actions">
          <button className="np-btn-sm outline" type="button" onClick={startSectionCreation}><Plus size={15} />Nouvelle catégorie</button>
          <button className="np-btn-sm success" type="button" onClick={startProductCreation} disabled={!sections.length}><Plus size={15} />Nouveau produit</button>
        </div>
      </section>

      {showSectionForm && <section className="np-panel np-admin-shop-form-panel" id="admin-shop-section-form">
        <div className="np-panel-heading">
          <div><span className="np-overline">ORGANISATION</span><h2>{editingSectionId ? "Modifier une catégorie" : "Créer une catégorie"}</h2></div>
          <button type="button" className="np-admin-shop-close-form" onClick={resetSectionForm} aria-label="Fermer le formulaire"><X size={18} /></button>
        </div>
        <form className="np-admin-shop-form" onSubmit={submitSection}>
          <label>Nom de la catégorie<input required minLength={2} maxLength={80} value={sectionForm.name} onChange={(event) => setSectionForm({ ...sectionForm, name: event.target.value })} placeholder="Ex. Pièces TikTok" /></label>
          <label>Description<input maxLength={240} value={sectionForm.description} onChange={(event) => setSectionForm({ ...sectionForm, description: event.target.value })} placeholder="Courte phrase affichée dans la boutique" /></label>
          <label>Icône<select value={sectionForm.icon} onChange={(event) => setSectionForm({ ...sectionForm, icon: event.target.value })}><option value="coins">Pièces</option><option value="gamepad-2">Jeux vidéo</option><option value="wifi">Connexion internet</option><option value="sparkles">Services numériques</option><option value="shopping-bag">Autre</option></select></label>
          <label>Position<input type="number" min={0} max={100000} value={sectionForm.sortOrder} onChange={(event) => setSectionForm({ ...sectionForm, sortOrder: event.target.value })} /></label>
          <div className="np-admin-shop-form-actions"><button className="np-btn-sm success" type="submit" disabled={savingSection}><Save size={15} />{savingSection ? "Enregistrement…" : editingSectionId ? "Enregistrer la catégorie" : "Créer la catégorie"}</button><button className="np-btn-sm outline" type="button" onClick={resetSectionForm}>Annuler</button></div>
        </form>
      </section>}

      {showProductForm && <section className="np-panel np-admin-shop-form-panel" id="admin-shop-product-form">
        <div className="np-panel-heading">
          <div><span className="np-overline">CONTENU DE LA BOUTIQUE</span><h2>{isInternetSection ? (editingProductId ? "Modifier un forfait internet" : "Ajouter un forfait internet") : editingProductId ? "Modifier un élément" : "Ajouter un élément"}</h2></div>
          <button type="button" className="np-admin-shop-close-form" onClick={resetProductForm} aria-label="Fermer le formulaire"><X size={18} /></button>
        </div>
        {sections.length === 0 ? <p className="np-admin-shop-empty">Créez d’abord une section pour y ajouter des éléments.</p> : (
          <form className="np-admin-shop-form" onSubmit={submitProduct}>
            <label>Section<select required value={productForm.sectionId || firstSectionId} onChange={(event) => changeProductSection(event.target.value)}>{sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></label>
            <label>{isInternetSection ? "Nom du forfait" : "Nom de l’élément"}<input required minLength={2} maxLength={80} value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} placeholder={isInternetSection ? "Ex. Forfaits hebdomadaires" : "Ex. Free Fire"} /></label>
            <label>Sous-titre<input maxLength={120} value={productForm.subtitle} onChange={(event) => setProductForm({ ...productForm, subtitle: event.target.value })} placeholder="Ex. Diamants · Garena" /></label>
            <label>Image (chemin du site ou HTTPS)<input maxLength={500} value={productForm.imageUrl} onChange={(event) => setProductForm({ ...productForm, imageUrl: event.target.value })} placeholder="/images/free-fire.png" /></label>
            <label>Badge<input maxLength={40} value={productForm.badge} onChange={(event) => setProductForm({ ...productForm, badge: event.target.value })} placeholder="Populaire (facultatif)" /></label>
            <label>Nom du champ client<input maxLength={60} value={productForm.customerLabel} onChange={(event) => setProductForm({ ...productForm, customerLabel: event.target.value })} placeholder="ID joueur" /></label>
            <label className="wide">Description<input maxLength={500} value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} placeholder="Informations utiles avant la commande" /></label>
            <label className="wide">{isInternetSection ? "Forfaits internet et tarifs — un forfait par ligne" : "Forfaits et tarifs — un forfait par ligne"}<textarea id="admin-shop-offers" required rows={5} value={productForm.offers} onChange={(event) => setProductForm({ ...productForm, offers: event.target.value })} placeholder={isInternetSection ? "1 Go · 24 heures | 250\n10 Go · 7 jours | 1600\nIllimité · 14 jours | 7000" : "Nom du forfait | prix FCFA | quantité | bonus\n10 Go · 7 jours | 1600\n520 diamants | 5100 | 520 | +20 offerts"} /><small>Modifiez un prix directement sur sa ligne. Ajoutez une nouvelle ligne pour créer un forfait. Format : nom | prix en FCFA | quantité facultative | bonus facultatif. Enregistrez pour publier.</small></label>
            <label>Position<input type="number" min={0} max={100000} value={productForm.sortOrder} onChange={(event) => setProductForm({ ...productForm, sortOrder: event.target.value })} /></label>
            <label className="np-admin-shop-check"><input type="checkbox" checked={productForm.requiresPassword} onChange={(event) => setProductForm({ ...productForm, requiresPassword: event.target.checked })} />Le compte client exige un mot de passe</label>
            <div className="np-admin-shop-form-actions"><button className="np-btn-sm success" type="submit" disabled={savingProduct}><Save size={15} />{savingProduct ? "Enregistrement…" : editingProductId ? isInternetSection ? "Enregistrer les modifications" : "Enregistrer les modifications" : isInternetSection ? "Ajouter le forfait" : "Ajouter le produit"}</button><button className="np-btn-sm outline" type="button" onClick={resetProductForm}>Annuler</button></div>
          </form>
        )}
      </section>}

      <section className="np-admin-shop-catalogue" aria-label="Produits de la boutique">
        <div className="np-panel np-admin-shop-toolbar">
          <label className="np-admin-shop-search"><Search size={17} /><input type="search" value={catalogSearch} onChange={(event) => { setCatalogSearch(event.target.value); setVisibleProductCounts({}); }} placeholder="Rechercher un produit, un forfait ou une catégorie" aria-label="Rechercher dans le catalogue boutique" />{catalogSearch && <button type="button" onClick={() => setCatalogSearch("")} aria-label="Effacer la recherche"><X size={15} /></button>}</label>
          <label className="np-admin-shop-filter"><span>Catégorie</span><select value={sectionFilter} onChange={(event) => { setSectionFilter(event.target.value); setVisibleProductCounts({}); }}><option value="all">Toutes les catégories</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></label>
          <label className="np-admin-shop-filter"><span>Visibilité</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setVisibleProductCounts({}); }}><option value="all">Toutes</option><option value="published">Publiées</option><option value="hidden">Masquées</option></select></label>
          <div className="np-admin-shop-result-count"><strong>{filteredProductCount}</strong> produit{filteredProductCount === 1 ? "" : "s"}</div>
        </div>

        {filteredSections.length === 0 ? <div className="np-panel np-admin-shop-no-results"><Search size={22} /><strong>Aucun résultat</strong><span>Essayez un autre nom ou choisissez une autre catégorie.</span><button type="button" className="np-btn-sm outline" onClick={() => { setCatalogSearch(""); setSectionFilter("all"); setStatusFilter("all"); }}>Effacer les filtres</button></div> : <div className="np-admin-shop-sections">
          {filteredSections.map(({ section, products }) => {
            const isExpanded = expandedSections[section.id] ?? Boolean(normalizedCatalogSearch || sectionFilter !== "all" || statusFilter !== "all");
            const visibleCount = visibleProductCounts[section.id] ?? 6;
            const displayedProducts = products.slice(0, visibleCount);
            return <article className={`np-panel np-admin-shop-section${isExpanded ? " is-expanded" : ""}`} key={section.id}>
              <header>
                <button type="button" className="np-admin-shop-section-summary" aria-expanded={isExpanded} onClick={() => setExpandedSections((current) => ({ ...current, [section.id]: !isExpanded }))}>
                  <span className={`np-admin-shop-status ${section.isActive ? "is-published" : "is-hidden"}`}>{section.isActive ? "Publiée" : "Masquée"}</span>
                  <span className="np-admin-shop-section-copy"><strong>{section.name}</strong>{section.description && <small>{section.description}</small>}</span>
                  <span className="np-admin-shop-section-count">{products.length} produit{products.length === 1 ? "" : "s"}</span>
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                <div className="np-admin-shop-actions np-admin-shop-section-actions">
                  <button type="button" className="np-btn-sm success" onClick={() => addProductToSection(section)}><Plus size={14} /><span>Ajouter un produit</span></button>
                  <button type="button" className="np-btn-sm outline" onClick={() => editSection(section)} aria-label={`Modifier ${section.name}`}><Pencil size={14} /><span>Modifier</span></button>
                  <button type="button" className="np-btn-sm outline" onClick={() => void toggleSection(section)} aria-label={section.isActive ? `Masquer ${section.name}` : `Publier ${section.name}`}>{section.isActive ? <EyeOff size={14} /> : <Eye size={14} />}<span>{section.isActive ? "Masquer" : "Publier"}</span></button>
                  <button type="button" className="np-btn-sm danger" onClick={() => void deleteSection(section)} aria-label={`Supprimer ${section.name}`}><Trash2 size={14} /><span>Supprimer</span></button>
                </div>
              </header>
              {isExpanded && <div className="np-admin-shop-product-list">
                {displayedProducts.map((product) => {
                  const lowestPrice = Math.min(...product.offers.map((offer) => offer.priceXaf));
                  const previewOffers = product.offers.slice(0, 3);
                  return <div className={`np-admin-shop-product${product.isActive ? "" : " is-hidden"}`} key={product.id}>
                    <div className="np-admin-shop-product-mark">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <ShoppingBag size={19} />}</div>
                    <div className="np-admin-shop-product-info"><strong>{product.name}</strong><small>{product.subtitle || product.description || "Aucune description"}</small><span>{product.offers.length} offre{product.offers.length === 1 ? "" : "s"} · dès {Number.isFinite(lowestPrice) ? formatPrice(lowestPrice) : "—"} · {product.isActive ? "Publié" : "Masqué"}</span>{section.slug === "connexion-internet" && <span className="np-admin-shop-offer-summary">{previewOffers.map((offer) => <span key={offer.id}>{offer.name} <strong>{formatPrice(offer.priceXaf)}</strong></span>)}{product.offers.length > previewOffers.length && <span className="np-admin-shop-more-offers">+{product.offers.length - previewOffers.length} autres</span>}</span>}</div>
                    <div className="np-admin-shop-actions np-admin-shop-product-actions">{section.slug === "connexion-internet" && <button type="button" className="np-btn-sm outline np-admin-shop-add-offer" onClick={() => addOfferToProduct(product)}><Plus size={14} /><span>Ajouter un forfait</span></button>}<button type="button" className="np-btn-sm outline np-admin-shop-edit-offers" onClick={() => editProduct(product)} aria-label={`Modifier ${section.slug === "connexion-internet" ? "les tarifs de " : ""}${product.name}`}><Pencil size={14} /><span>Modifier</span></button><button type="button" className="np-btn-sm outline" onClick={() => void toggleProduct(product)} aria-label={product.isActive ? `Masquer ${product.name}` : `Publier ${product.name}`}>{product.isActive ? <EyeOff size={14} /> : <Eye size={14} />}<span>{product.isActive ? "Masquer" : "Publier"}</span></button><button type="button" className="np-btn-sm danger" onClick={() => void deleteProduct(product)} aria-label={`Supprimer ${product.name}`}><Trash2 size={14} /><span>Supprimer</span></button></div>
                  </div>;
                })}
                {products.length === 0 && <p className="np-admin-shop-empty">Aucun produit ne correspond aux filtres de cette catégorie.</p>}
                {products.length > visibleCount && <button type="button" className="np-admin-shop-load-more" onClick={() => setVisibleProductCounts((current) => ({ ...current, [section.id]: visibleCount + 6 }))}>Afficher les 6 produits suivants</button>}
                {visibleCount > 6 && products.length > 6 && <button type="button" className="np-admin-shop-show-less" onClick={() => setVisibleProductCounts((current) => ({ ...current, [section.id]: 6 }))}>Réduire la liste</button>}
              </div>}
            </article>;
          })}
        </div>}
      </section>
    </div>
  );
}
