"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, Coins, Download, Eye, EyeOff, FileText, Gamepad2, Gauge, Laptop, LoaderCircle, Lock, Mail, PackageOpen, Phone, Search, ShieldCheck, ShoppingBag, Smartphone, Sparkles, User, Wifi, X } from "lucide-react";
import { SoleasPayCheckoutV3 } from "@/app/components/payments/SoleasPayCheckoutV3";
import { LanguageSelector, useLanguage } from "@/app/lib/i18n";
import { getAssetPath } from "@/app/lib/asset-path";
import type { ShopOffer, ShopProduct, ShopSection } from "@/app/lib/shop-catalog";

type CatalogResponse = { success?: boolean; sections?: ShopSection[]; error?: string };

function formatPrice(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

const TIKTOK_COIN_UNIT_PRICE_XAF = 11.24;

function sectionIcon(icon: string, size = 20) {
  if (icon === "coins") return <Coins size={size} />;
  if (icon === "gamepad-2") return <Gamepad2 size={size} />;
  if (icon === "wifi") return <Wifi size={size} />;
  if (icon === "sparkles") return <Sparkles size={size} />;
  return <ShoppingBag size={size} />;
}

function productAccent(slug: string) {
  if (slug === "forfaits-courte-duree") return "#1684d5";
  if (slug === "forfaits-hebdomadaires") return "#18a84a";
  if (slug === "forfaits-mensuels") return "#7938d1";
  if (slug.startsWith("forfaits-")) return "#1684d5";
  if (slug.startsWith("fortnite")) return "#7b61ff";
  if (slug.startsWith("free-fire")) return "#ff703f";
  if (slug.startsWith("pubg")) return "#f2aa3d";
  if (slug.startsWith("cod")) return "#52c989";
  if (slug.startsWith("blood")) return "#ed5574";
  if (slug.startsWith("ea-fc")) return "#31b991";
  if (slug.includes("tiktok")) return "#ed4fa1";
  return "#5b73ed";
}

function makeOrderId() {
  return `NOVA-${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

function normalizeCameroonMobile(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("237") ? digits.slice(3) : digits;
}

export function Shopfront({ embedded = false, sectionSlug }: { embedded?: boolean; sectionSlug?: string }) {
  const { t, language } = useLanguage();
  const [sections, setSections] = useState<ShopSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [embeddedSectionSelected, setEmbeddedSectionSelected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [dialogStep, setDialogStep] = useState<"offers" | "details">("offers");
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [credentialsConfirmed, setCredentialsConfirmed] = useState(false);
  const [secondFactorConfirmed, setSecondFactorConfirmed] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [internetPhone, setInternetPhone] = useState("");
  const [mobileMoneyOperator, setMobileMoneyOperator] = useState<"mtn" | "orange">("mtn");
  const [orderId, setOrderId] = useState("");
  const [customTikTokCoins, setCustomTikTokCoins] = useState(0);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/shop-catalog", { cache: "no-store" });
      const data = await response.json() as CatalogResponse;
      if (!response.ok || !data.success) throw new Error(data.error || "Le catalogue ne peut pas être chargé.");
      const nextSections = data.sections || [];
      setSections(nextSections);
      setSelectedSectionId((current) => {
        const routeSection = sectionSlug ? nextSections.find((section) => section.slug === sectionSlug) : null;
        if (routeSection) return routeSection.id;
        return current && nextSections.some((section) => section.id === current)
          ? current
          : nextSections[0]?.id ?? null;
      });
    } catch (loadError: any) {
      setError(loadError?.message || "Connexion au catalogue impossible.");
    } finally {
      setLoading(false);
    }
  }, [sectionSlug]);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  useEffect(() => {
    if (!embedded || !sections.length) return;
    const selectFromHash = () => {
      const rawHash = window.location.hash.replace(/^#/, "").split(/[?&]/)[0].toLowerCase();
      if (!rawHash) {
        setEmbeddedSectionSelected(false);
        return;
      }
      const aliases = rawHash === "games" || rawHash.startsWith("game") || rawHash.startsWith("jeux")
        ? ["jeux-video", "jeux", "games"]
        : rawHash === "coins" || rawHash.startsWith("tiktok") || rawHash.startsWith("packs")
          ? ["pieces-tiktok", "tiktok", "coins"]
          : [rawHash];
      const match = sections.find((section) => aliases.some((alias) => section.slug === alias || section.slug.startsWith(alias)));
      if (match) {
        setSelectedSectionId(match.id);
        setEmbeddedSectionSelected(true);
      } else {
        setEmbeddedSectionSelected(false);
      }
    };
    selectFromHash();
    window.addEventListener("hashchange", selectFromHash);
    return () => window.removeEventListener("hashchange", selectFromHash);
  }, [embedded, sections]);

  useEffect(() => {
    if (!embedded) return;
    window.addEventListener("nova-paid-shop-home", returnToCategories);
    return () => window.removeEventListener("nova-paid-shop-home", returnToCategories);
  }, [embedded]);

  useEffect(() => {
    document.body.style.overflow = selectedProduct ? "hidden" : "";
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") closeProduct(); };
    window.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEscape);
    };
  }, [selectedProduct]);

  const selectedSection = (sectionSlug ? sections.find((section) => section.slug === sectionSlug) : null)
    || sections.find((section) => section.id === selectedSectionId)
    || sections[0]
    || null;
  const categoryOrder = ["jeux-video", "pieces-tiktok", "connexion-internet"];
  const categorySections = [...sections].sort((left, right) => {
    const leftIndex = categoryOrder.indexOf(left.slug);
    const rightIndex = categoryOrder.indexOf(right.slug);
    const leftRank = leftIndex < 0 ? categoryOrder.length : leftIndex;
    const rightRank = rightIndex < 0 ? categoryOrder.length : rightIndex;
    return leftRank - rightRank || left.sortOrder - right.sortOrder;
  });
  const categoryLanding = !sectionSlug && !(embedded && embeddedSectionSelected);
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return (selectedSection?.products || []).filter((product) =>
      !query || `${product.name} ${product.subtitle} ${product.description} ${product.offers.map((offer) => offer.name).join(" ")}`.toLocaleLowerCase("fr").includes(query),
    );
  }, [search, selectedSection]);
  const customTikTokOffer: ShopOffer | null = customTikTokCoins >= 70 ? {
    id: "custom-tiktok",
    name: `${new Intl.NumberFormat("fr-FR").format(customTikTokCoins)} pièces personnalisées`,
    priceXaf: Math.round(customTikTokCoins * TIKTOK_COIN_UNIT_PRICE_XAF),
    quantity: customTikTokCoins,
  } : null;
  const selectedOffer: ShopOffer | null = selectedProduct?.offers.find((offer) => offer.id === selectedOfferId)
    || (selectedOfferId === "custom-tiktok" ? customTikTokOffer : null);
  const productSection = selectedProduct
    ? sections.find((section) => section.id === selectedProduct.sectionId) || selectedSection
    : selectedSection;
  const purchaseKind = productSection?.slug === "pieces-tiktok"
    ? "coins"
    : productSection?.slug === "connexion-internet"
      ? "internet"
      : "game";
  const normalizedInternetPhone = normalizeCameroonMobile(internetPhone);
  const validInternetPhone = /^6\d{8}$/.test(normalizedInternetPhone);
  const validContact = Boolean(selectedOffer) && (purchaseKind === "internet"
    ? validInternetPhone
    : accountId.trim().length >= 2
      && whatsapp.replace(/\D/g, "").length >= 6
      && (!selectedProduct?.requiresPassword || (password.trim().length >= 4 && credentialsConfirmed && secondFactorConfirmed)));
  const missingSteps = useMemo(() => {
    const steps = [];
    if (purchaseKind === "internet") {
      if (!validInternetPhone) steps.push("Numéro Mobile Money");
      return steps;
    }
    if (!accountId.trim() || accountId.trim().length < 2) {
      const label = selectedProduct?.customerLabel || "Identifiant";
      steps.push(label.length > 22 ? "Identifiant / Email" : label);
    }
    if (selectedProduct?.requiresPassword) {
      if (!password.trim() || password.trim().length < 4) {
        steps.push("Mot de passe");
      }
      if (!credentialsConfirmed || !secondFactorConfirmed) {
        steps.push("Confirmations");
      }
    }
    if (whatsapp.replace(/\D/g, "").length < 6) {
      steps.push("Numéro WhatsApp");
    }
    return steps;
  }, [accountId, selectedProduct, password, credentialsConfirmed, secondFactorConfirmed, whatsapp, purchaseKind, validInternetPhone]);

  function closeProduct() {
    setSelectedProduct(null);
    setDialogStep("offers");
    setSelectedOfferId("");
    setAccountId("");
    setPassword("");
    setShowPassword(false);
    setCredentialsConfirmed(false);
    setSecondFactorConfirmed(false);
    setWhatsapp("");
    setInternetPhone("");
    setMobileMoneyOperator("mtn");
    setOrderId("");
  }

  function returnToCategories() {
    setEmbeddedSectionSelected(false);
    setSearch("");
    setSelectedProduct(null);
    setSelectedOfferId("");
    setDialogStep("offers");
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  function openProduct(product: ShopProduct) {
    setSelectedProduct(product);
    setDialogStep("offers");
    setSelectedOfferId("");
    setAccountId("");
    setPassword("");
    setShowPassword(false);
    setCredentialsConfirmed(false);
    setSecondFactorConfirmed(false);
    setWhatsapp("");
    setInternetPhone("");
    setMobileMoneyOperator("mtn");
    setOrderId("");
  }

  function openTikTokOffer(product: ShopProduct, offer: ShopOffer) {
    openProduct(product);
    setSelectedOfferId(offer.id);
    setOrderId(makeOrderId());
    setDialogStep("details");
  }

  function openInternetOffer(product: ShopProduct, offer: ShopOffer) {
    openProduct(product);
    setSelectedOfferId(offer.id);
    setOrderId(makeOrderId());
    setDialogStep("details");
  }

  function chooseOffer(offer: ShopOffer) {
    setSelectedOfferId(offer.id);
    setOrderId(makeOrderId());
    setShowPassword(false);
    setDialogStep("details");
  }

  const Root = embedded ? "div" : "main";

  return (
    <Root className={`np-storefront${embedded ? " is-embedded" : ""}${selectedSection?.slug === "connexion-internet" ? " is-internet" : ""}`} id="boutique">
      {!embedded && <header className="np-storefront-topbar">
        <a className="np-storefront-brand" href="/" aria-label="NovaPaid, accueil">
          <img src={getAssetPath("/novapaid-logo-96.png")} alt="NovaPaid" width={32} height={32} className="np-storefront-brand-logo" />
          <span>Nova<span>Paid</span></span>
        </a>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
          <LanguageSelector />
          <a className="np-storefront-account" href="/dashboard">{t("my_account")} <ArrowRight size={15} /></a>
        </div>
      </header>}

      <section className={`np-storefront-catalogue${categoryLanding ? " np-storefront-categories-page" : ""}`} aria-labelledby="np-storefront-section-title">
        {categoryLanding ? <>
          <div className="np-storefront-catalogue-top np-storefront-category-heading">
            <div><h2 id="np-storefront-section-title">La boutique</h2><p>Choisissez une catégorie pour découvrir ses offres.</p></div>
          </div>
          {loading ? <div className="np-storefront-state"><LoaderCircle size={23} className="np-storefront-spin" /><span>Chargement des catégories…</span></div> : error ? (
            <div className="np-storefront-state is-error"><PackageOpen size={26} /><strong>{error}</strong><button type="button" onClick={() => void loadCatalog()}>Réessayer</button></div>
          ) : categorySections.length === 0 ? (
            <div className="np-storefront-state"><PackageOpen size={28} /><strong>La boutique se prépare</strong><span>Les catégories seront bientôt disponibles.</span></div>
          ) : <div className="np-storefront-category-grid">
            {categorySections.map((section) => <a href={embedded ? `/dashboard/boutique#${section.slug}` : `/boutique/${section.slug}`} className="np-storefront-category-card" key={section.id} style={{ "--np-category-accent": section.slug === "pieces-tiktok" ? "#ed4fa1" : section.slug === "connexion-internet" ? "#1684d5" : "#5b73ed" } as CSSProperties}>
              <span className="np-storefront-category-icon">{sectionIcon(section.icon, 24)}</span>
              <span className="np-storefront-category-copy"><small>BOUTIQUE NOVAPAID</small><strong>{section.name}</strong><em>{section.description}</em><span>{section.products.length} produit{section.products.length === 1 ? "" : "s"}</span></span>
              <span className="np-storefront-category-arrow"><ArrowUpRight size={19} /></span>
            </a>)}
          </div>}
        </> : <>
          {selectedSection?.slug !== "connexion-internet" && <div className="np-storefront-catalogue-top np-storefront-detail-heading">
            <div>
              {embedded && <button type="button" className="np-internet-back np-storefront-category-back" onClick={returnToCategories}><ArrowLeft size={14} /> Toutes les catégories</button>}
              {!embedded && <a className="np-storefront-back-link" href="/boutique"><ArrowLeft size={15} /> Retour aux catégories</a>}
              <h2 id="np-storefront-section-title">{selectedSection?.name || "La boutique"}</h2>
              {selectedSection && <p>{selectedSection.description}</p>}
            </div>
            {!embedded && selectedSection && <span className="np-storefront-detail-count">{selectedSection.products.length} produit{selectedSection.products.length === 1 ? "" : "s"}</span>}
            {embedded && <label className="np-storefront-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un produit" aria-label="Rechercher un produit" />{search && <button type="button" onClick={() => setSearch("")} aria-label="Effacer la recherche"><X size={14} /></button>}</label>}
          </div>}

          {loading ? <div className="np-storefront-state"><LoaderCircle size={23} className="np-storefront-spin" /><span>Chargement des produits…</span></div> : error ? (
            <div className="np-storefront-state is-error"><PackageOpen size={26} /><strong>{error}</strong><button type="button" onClick={() => void loadCatalog()}>Réessayer</button></div>
          ) : !selectedSection ? (
            <div className="np-storefront-state"><PackageOpen size={28} /><strong>Cette catégorie est indisponible</strong><a href={embedded ? "/dashboard/boutique" : "/boutique"}>Retour à la boutique</a></div>
          ) : selectedSection.slug === "connexion-internet" ? <div className="np-internet-experience">
            <aside className="np-internet-intro">
              {embedded
                ? <button type="button" className="np-internet-back" onClick={returnToCategories}><ArrowLeft size={14} /> Toutes les catégories</button>
                : <a className="np-internet-back" href="/boutique"><ArrowLeft size={14} /> Toutes les catégories</a>}
              <h1>Votre internet.<br />Sans <em>BullShit.</em></h1>
              <p>Un forfait simple, activé en un geste, sur votre téléphone Android ou votre PC Windows.</p>
              <div className="np-internet-install-list">
                <a href="https://geny.payool.net/api/v1/app/android.apk">
                  <span className="np-internet-install-icon is-android"><Smartphone size={19} /></span><span><strong>Android</strong><small>Télécharger l’application Geny pour Android</small></span><Download size={16} />
                </a>
                <a href="https://geny.payool.net/api/v1/app/windows.exe">
                  <span className="np-internet-install-icon is-windows"><Laptop size={19} /></span><span><strong>PC Windows</strong><small>Télécharger l’application Geny pour PC</small></span><Download size={16} />
                </a>
                <details className="np-internet-guide">
                  <summary><span className="np-internet-install-icon is-guide"><BookOpen size={18} /></span><span><strong>Guide d’utilisation</strong><small>Comment activer votre forfait</small></span><FileText size={16} /></summary>
                  <ol><li>Choisissez votre forfait et votre opérateur.</li><li>Entrez le numéro qui recevra la demande Mobile Money.</li><li>Validez la demande sur votre téléphone pour activer le forfait.</li></ol>
                </details>
              </div>
              <div className="np-internet-steps" aria-label="Étapes d’activation"><span>1&nbsp; Payez par Mobile Money</span><span>2&nbsp; Validez la demande</span><span>3&nbsp; Activez et connectez-vous</span></div>
            </aside>
            <section className="np-internet-plans" aria-labelledby="np-internet-plans-title">
              <div className="np-internet-plans-heading"><h2 id="np-internet-plans-title">Nos forfaits</h2><p>Touchez un forfait pour le payer par Mobile Money et recevoir votre code instantanément.</p><small>* Forfaits illimités · Usage raisonnable : 30 Go/jour à pleine vitesse, puis 2 Mbit/s jusqu'à minuit</small></div>
              {visibleProducts.length ? <div className="np-internet-plan-grid">{visibleProducts.flatMap((product) => product.offers.map((offer) => <button type="button" className="np-internet-plan" key={`${product.id}-${offer.id}`} onClick={() => openInternetOffer(product, offer)} aria-label={`Acheter ${offer.name}, ${formatPrice(offer.priceXaf)}`}>
                <span className="np-internet-plan-group">{product.subtitle || product.name}</span>
                <strong className="np-internet-plan-name">{offer.name.split("·")[0].trim()}</strong>
                <span className="np-internet-plan-volume">{offer.name.includes("·") ? offer.name.split("·").slice(1).join("·").trim() : product.name}</span>
                <span className="np-internet-plan-bottom"><span className={offer.priceXaf === 0 ? "is-free" : ""}>{offer.priceXaf === 0 ? "Gratuit" : <>{new Intl.NumberFormat("fr-FR").format(offer.priceXaf)}<small> FCFA</small></>}</span><i>{offer.priceXaf === 0 ? "Obtenir" : "Acheter"} <ArrowRight size={12} /></i></span>
              </button>))}</div> : <div className="np-storefront-state np-storefront-empty"><PackageOpen size={30} /><strong>{search ? "Aucun résultat" : "Les offres arrivent bientôt"}</strong><span>{search ? "Modifiez votre recherche pour voir d’autres offres." : "Cette catégorie sera remplie depuis l’administration."}</span></div>}
            </section>
          </div> : selectedSection.slug === "pieces-tiktok" ? <div className="np-tiktok-catalog">
            {visibleProducts.some((product) => product.offers.length > 0) ? <div className="np-tiktok-pack-grid">
              {visibleProducts.flatMap((product) => product.offers.map((offer) => <button type="button" className="np-tiktok-pack-card" key={`${product.id}-${offer.id}`} onClick={() => openTikTokOffer(product, offer)}>
                <span className="np-tiktok-pack-icon"><Coins size={21} /></span>
                <span className="np-tiktok-pack-quantity">{offer.name}</span>
                {offer.bonus && <span className="np-tiktok-pack-bonus">{offer.bonus}</span>}
                <strong>{formatPrice(offer.priceXaf)}</strong>
                <span className="np-tiktok-pack-action">Choisir ce pack <ArrowRight size={14} /></span>
              </button>))}
            </div> : <div className="np-storefront-state np-storefront-empty"><PackageOpen size={30} /><strong>{search ? "Aucun pack trouvé" : "Les offres arrivent bientôt"}</strong><span>{search ? "Essayez un autre nom ou une autre quantité." : "Les packs TikTok seront bientôt disponibles."}</span></div>}

            {selectedSection.products[0] && <section className="np-tiktok-custom-card" aria-labelledby="np-tiktok-custom-title">
              <div className="np-tiktok-custom-heading">
                <span className="np-tiktok-pack-icon"><Coins size={21} /></span>
                <span><strong id="np-tiktok-custom-title">Montant personnalisé</strong><small>Choisissez vous-même le nombre de pièces</small></span>
              </div>
              <div className="np-tiktok-custom-input-wrap">
                <label htmlFor="np-tiktok-custom-coins">Nombre de pièces <span>Minimum : 70 pièces</span></label>
                <div className="np-tiktok-custom-input"><input id="np-tiktok-custom-coins" type="number" inputMode="numeric" min={70} max={1000000} step={1} value={customTikTokCoins || ""} onChange={(event) => setCustomTikTokCoins(Math.min(1000000, Math.max(0, Number.parseInt(event.target.value.replace(/\D/g, "") || "0", 10))))} placeholder="Ex. 700" /><span>pièces</span></div>
                <small>Prix unitaire : {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(TIKTOK_COIN_UNIT_PRICE_XAF)} FCFA par pièce</small>
              </div>
              <div className="np-tiktok-quick-add"><span>Ajouter rapidement</span>{[70, 350, 700, 1400, 3500].map((amount) => <button type="button" key={amount} onClick={() => setCustomTikTokCoins((current) => Math.min(1000000, current + amount))}>+{new Intl.NumberFormat("fr-FR").format(amount)}</button>)}</div>
              <div className="np-tiktok-custom-total"><span>Total estimé</span><strong>{customTikTokOffer ? formatPrice(customTikTokOffer.priceXaf) : "—"}</strong></div>
              <button type="button" className="np-tiktok-custom-buy" disabled={!customTikTokOffer} onClick={() => { const product = selectedSection.products[0]; if (product && customTikTokOffer) openTikTokOffer(product, customTikTokOffer); }}>Acheter ce montant <ArrowRight size={16} /></button>
            </section>}
          </div> : <>
            {visibleProducts.length ? <div className="np-storefront-product-grid">
              {visibleProducts.map((product) => {
                const minPrice = Math.min(...product.offers.map((offer) => offer.priceXaf));
                const isInternetProduct = selectedSection.slug === "connexion-internet";
                return <article className={`np-storefront-product${isInternetProduct ? " np-storefront-product--internet" : ""}`} key={product.id}>
                  <button type="button" className="np-storefront-product-open" style={{ "--np-product-accent": productAccent(product.slug) } as CSSProperties} onClick={() => openProduct(product)} aria-label={`Voir les packs ${product.name}`}>
                    <div className="np-storefront-product-image">
                      {product.badge && <span className="np-storefront-product-badge">{product.badge}</span>}
                      {product.imageUrl && <img src={getAssetPath(product.imageUrl)} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; const fallback = event.currentTarget.nextElementSibling as HTMLElement | null; if (fallback) fallback.style.display = "grid"; }} />}
                      <span className={`np-storefront-product-fallback${product.imageUrl ? "" : " is-visible"}`}>{sectionIcon(selectedSection.icon || "shopping-bag", 32)}</span>
                      <span className="np-storefront-product-image-overlay" />
                      <span className="np-storefront-product-open-icon" aria-hidden="true"><ArrowUpRight size={18} /></span>
                    </div>
                    <div className="np-storefront-product-details">
                      <span className="np-storefront-product-kicker"><i />{product.subtitle || selectedSection.name}</span>
                      <h4>{product.name}</h4>
                      <p>{product.description || "Choisissez un pack pour continuer."}</p>
                      {isInternetProduct && <span className="np-storefront-internet-offers" aria-label={`${product.offers.length} forfaits disponibles`}>
                        {product.offers.map((offer) => <span className="np-storefront-internet-offer" key={offer.id}>
                          <span>{offer.name}</span><strong>{formatPrice(offer.priceXaf)}</strong>
                        </span>)}
                      </span>}
                      <div className="np-storefront-product-footer"><span className="np-storefront-price"><small>À PARTIR DE</small><strong>{formatPrice(Number.isFinite(minPrice) ? minPrice : 0)}</strong></span><span className="np-storefront-product-cta">{isInternetProduct ? "Choisir un forfait" : "Voir les packs"} <ArrowRight size={15} /></span></div>
                    </div>
                  </button>
                </article>;
              })}
            </div> : <div className="np-storefront-state np-storefront-empty"><PackageOpen size={30} /><strong>{search ? "Aucun résultat" : "Les offres arrivent bientôt"}</strong><span>{search ? "Modifiez votre recherche pour voir d’autres produits." : "Cette catégorie sera remplie depuis l’administration."}</span></div>}
          </>}
        </>}
      </section>

      {!categoryLanding && selectedSection?.slug !== "connexion-internet" && <section className="np-storefront-bottom-note"><div><ShieldCheck size={18} /><span><strong>Un paiement accompagné</strong><small>Suivez les étapes de votre commande et contactez le support si besoin.</small></span></div><a href="/support">Besoin d’aide ? <ArrowRight size={14} /></a></section>}
      {selectedProduct && <div className="np-storefront-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeProduct(); }}>
        <section className={`np-storefront-modal np-storefront-modal--${dialogStep}${purchaseKind === "internet" ? " np-storefront-modal--internet" : ""}`} style={{ "--np-product-accent": productAccent(selectedProduct.slug) } as CSSProperties} role="dialog" aria-modal="true" aria-labelledby="np-storefront-modal-title">
          <header className="np-storefront-modal-header">
            {purchaseKind === "internet" ? <div className="np-internet-checkout-heading">
              <span className="np-internet-secure-label"><Lock size={12} /> PAIEMENT SÉCURISÉ</span>
              <h2 id="np-storefront-modal-title">Acheter un forfait</h2>
              <div className="np-internet-payment-steps" aria-label="Étape 1 : paiement, étape 2 : validation, étape 3 : réception de votre code">
                <span className="active"><i>1</i>Paiement</span><span><i>2</i>Validation</span><span><i>3</i>Votre code</span>
              </div>
            </div> : <div className="np-storefront-modal-heading">
              <div className="np-storefront-modal-progress" aria-label={dialogStep === "offers" ? "Étape 1 sur 2 : choix du pack" : "Étape 2 sur 2 : informations"}>
                <button
                  type="button"
                  className={`np-storefront-progress-step ${dialogStep === "offers" ? "active" : "complete"}`}
                  onClick={dialogStep === "details" ? () => setDialogStep("offers") : undefined}
                  title={dialogStep === "details" ? "Modifier le pack" : undefined}
                >
                  <span className="np-storefront-step-num">{dialogStep === "offers" ? "01" : <Check size={12} strokeWidth={3} />}</span>
                  <span className="np-storefront-step-title">Pack</span>
                </button>
                <i className={`np-storefront-progress-line ${dialogStep === "details" ? "complete" : ""}`} />
                <span className={`np-storefront-progress-step ${dialogStep === "details" ? "active" : ""}`}>
                  <span className="np-storefront-step-num">02</span>
                  <span className="np-storefront-step-title">Informations</span>
                </span>
              </div>
              <h2 id="np-storefront-modal-title">{dialogStep === "offers" ? selectedProduct.name : (purchaseKind as string) === "internet" ? "Finaliser votre commande" : "Finaliser votre recharge"}</h2>
              <p>{dialogStep === "offers" ? selectedProduct.subtitle || selectedProduct.description : "Renseignez les coordonnées pour préparer votre commande."}</p>
            </div>}
            <button type="button" onClick={closeProduct} aria-label="Fermer"><X size={18} /></button>
          </header>
          <div className="np-storefront-modal-body">
            {purchaseKind === "internet" && dialogStep === "details" && selectedOffer ? <div className="np-internet-checkout">
              <div className="np-internet-checkout-summary">
                <span><small>FORFAIT CHOISI</small><strong>{selectedOffer.name}</strong><i>{selectedProduct.name}</i><em><span>{selectedOffer.name.split("·")[0].trim()}</span><span>{selectedOffer.name.includes("·") ? selectedOffer.name.split("·").slice(1).join("·").trim() : "Forfait internet"}</span></em></span>
                <strong>{formatPrice(selectedOffer.priceXaf).replace(" FCFA", "")}<small>FCFA</small></strong>
              </div>
              <fieldset className="np-internet-operator-fieldset">
                <legend>Opérateur Mobile Money</legend>
                <div className="np-internet-operator-options">
                  <button type="button" className={`np-internet-operator${mobileMoneyOperator === "mtn" ? " selected" : ""}`} aria-pressed={mobileMoneyOperator === "mtn"} onClick={() => setMobileMoneyOperator("mtn")}>
                    <span className="np-internet-operator-logo is-mtn">MTN</span><span><strong>MTN MoMo</strong><small>Mobile Money</small></span><i aria-hidden="true" />
                  </button>
                  <button type="button" className={`np-internet-operator${mobileMoneyOperator === "orange" ? " selected" : ""}`} aria-pressed={mobileMoneyOperator === "orange"} onClick={() => setMobileMoneyOperator("orange")}>
                    <span className="np-internet-operator-logo is-orange">orange</span><span><strong>Orange Money</strong><small>Mobile Money</small></span><i aria-hidden="true" />
                  </button>
                </div>
              </fieldset>
              <div className="np-internet-phone-field">
                <label htmlFor="np-internet-mobile-number">Numéro Mobile Money</label>
                <div className={`np-internet-phone-input${internetPhone ? validInternetPhone ? " is-valid" : " is-invalid" : ""}`}>
                  <span><b aria-hidden="true">🇨🇲</b> +237</span>
                  <input id="np-internet-mobile-number" type="tel" inputMode="numeric" autoComplete="tel-national" value={internetPhone} onChange={(event) => setInternetPhone(event.target.value.replace(/[^\d\s]/g, ""))} placeholder="6XX XX XX XX" aria-invalid={Boolean(internetPhone) && !validInternetPhone} aria-describedby="np-internet-mobile-help" />
                </div>
                <small id="np-internet-mobile-help">{internetPhone && !validInternetPhone ? "Entrez un numéro camerounais valide à 9 chiffres." : "Le numéro qui recevra la demande de paiement."}</small>
              </div>
              {validContact ? <div className="np-internet-submit-wrap">
                <SoleasPayCheckoutV3
                  language="fr"
                  amount={selectedOffer.priceXaf}
                  orderId={orderId || makeOrderId()}
                  description={`${selectedProduct.name} - ${selectedOffer.name} - ${mobileMoneyOperator === "mtn" ? "MTN MoMo" : "Orange Money"}`}
                  username={normalizedInternetPhone}
                  whatsapp={`+237${normalizedInternetPhone}`}
                  coins={1}
                  productType="internet"
                  productLabel={`${selectedProduct.name} - ${selectedOffer.name} - ${mobileMoneyOperator === "mtn" ? "MTN MoMo" : "Orange Money"}`}
                  loginMethod={mobileMoneyOperator === "mtn" ? "MTN MoMo" : "Orange Money"}
                  buttonLabel={`Payer ${formatPrice(selectedOffer.priceXaf)}`}
                />
              </div> : <button type="button" className="np-internet-pay-locked" disabled><Lock size={15} />Payer {formatPrice(selectedOffer.priceXaf)}</button>}
              <p className="np-internet-payment-note"><ShieldCheck size={14} /> Votre code secret Mobile Money ne vous sera jamais demandé ici.</p>
            </div> : dialogStep === "offers" ? <>
              <div className="np-storefront-offer-intro">
                {selectedProduct.imageUrl && <img src={getAssetPath(selectedProduct.imageUrl)} alt="" />}
                <span className="np-storefront-offer-intro-shade" />
                <span className="np-storefront-offer-intro-copy"><small>{selectedProduct.offers.length} {purchaseKind === "internet" ? "FORFAITS" : "PACKS"} DISPONIBLES</small><strong>{selectedProduct.name}</strong><em>{selectedProduct.subtitle || selectedSection?.name}</em></span>
                <span className="np-storefront-offer-intro-icon">{sectionIcon(selectedSection?.icon || "shopping-bag", 21)}</span>
              </div>
              <div className="np-storefront-offer-list">
                <div className="np-storefront-offer-list-heading"><span><small>{purchaseKind === "internet" ? "CHOISISSEZ VOTRE FORFAIT" : "CHOISISSEZ VOTRE PACK"}</small><h3>{purchaseKind === "internet" ? "Quel forfait vous intéresse ?" : "Quel pack vous intéresse ?"}</h3></span><span>{selectedProduct.offers.length} options</span></div>
                <div className="np-storefront-offer-grid">{selectedProduct.offers.map((offer, index) => <button type="button" key={offer.id} className={`np-storefront-offer-card${offer.id === selectedOfferId ? " selected" : ""}`} aria-label={`Choisir ${offer.name} à ${formatPrice(offer.priceXaf)}`} onClick={() => chooseOffer(offer)}>
                  <span className="np-storefront-offer-card-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="np-storefront-offer-card-copy"><strong>{offer.name}</strong>{offer.bonus && <small>{offer.bonus}</small>}</span>
                  <span className="np-storefront-offer-card-price"><strong>{formatPrice(offer.priceXaf)}</strong><i><ArrowRight size={15} /></i></span>
                </button>)}</div>
              </div>
              <p className="np-storefront-offer-hint"><ShieldCheck size={15} /> Vos informations seront demandées après le choix du pack.</p>
            </> : selectedOffer && <>
              <div className="np-storefront-selected-pack">
                <span className="np-storefront-selected-pack-image">
                  {selectedProduct.imageUrl ? <img src={getAssetPath(selectedProduct.imageUrl)} alt={selectedProduct.name} /> : sectionIcon(selectedSection?.icon || "shopping-bag", 24)}
                </span>
                <span className="np-storefront-selected-pack-copy">
                  <span className="np-storefront-selected-pack-tag"><Sparkles size={11} /> Pack sélectionné</span>
                  <strong>{selectedOffer.name}</strong>
                  <em>{selectedProduct.name}{selectedOffer.bonus ? ` • ${selectedOffer.bonus}` : ""}</em>
                </span>
                <div className="np-storefront-selected-pack-pricing">
                  <small>Montant total</small>
                  <strong className="np-storefront-selected-pack-price">{formatPrice(selectedOffer.priceXaf)}</strong>
                  <button type="button" className="np-storefront-change-pack-btn" onClick={() => setDialogStep("offers")}>
                    Modifier
                  </button>
                </div>
              </div>

              <div className="np-storefront-order-form">
                <div className="np-storefront-form-heading">
                  <span className="np-storefront-heading-icon">{sectionIcon(selectedSection?.icon || "shopping-bag", 19)}</span>
                  <div className="np-storefront-heading-text">
                    <h3>Coordonnées de livraison</h3>
                    <p>Ces informations sécurisées servent à livrer directement votre pack.</p>
                  </div>
                  <div className="np-storefront-secure-chip">
                    <ShieldCheck size={13} />
                    <span>Chiffrement SSL</span>
                  </div>
                </div>

                <div className="np-storefront-field np-storefront-field--full">
                  <div className="np-storefront-field-header">
                    <label htmlFor="np-field-account">{selectedProduct.customerLabel}</label>
                    {accountId.trim().length >= 2 && (
                      <span className="np-storefront-field-status is-valid"><Check size={11} strokeWidth={3} /> Renseigné</span>
                    )}
                  </div>
                  <div className={`np-storefront-input-box ${accountId.trim().length >= 2 ? "has-value" : ""}`}>
                    <span className="np-storefront-input-icon">
                      {selectedProduct.customerLabel.toLowerCase().includes("mail") ? <Mail size={16} /> : <User size={16} />}
                    </span>
                    <input
                      id="np-field-account"
                      autoComplete="username"
                      value={accountId}
                      onChange={(event) => setAccountId(event.target.value)}
                      placeholder={`Entrez votre ${selectedProduct.customerLabel.toLowerCase()}`}
                    />
                  </div>
                </div>

                {selectedProduct.requiresPassword && <>
                  <div className="np-storefront-field np-storefront-field--full">
                    <div className="np-storefront-field-header">
                      <label htmlFor="np-field-password">Mot de passe du compte</label>
                      <span className="np-storefront-field-note"><Lock size={11} /> 100% confidentiel</span>
                    </div>
                    <div className={`np-storefront-input-box ${password.length >= 4 ? "has-value" : ""}`}>
                      <span className="np-storefront-input-icon"><Lock size={16} /></span>
                      <input
                        id="np-field-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Saisissez le mot de passe de votre compte"
                      />
                      <button
                        type="button"
                        className="np-storefront-password-toggle"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <small className="np-storefront-input-hint">Requis pour connecter la session et injecter le pack sans intermédiaire.</small>
                  </div>

                  <div className="np-storefront-consents-group">
                    <label className={`np-storefront-consent-card ${credentialsConfirmed ? "is-checked" : ""}`}>
                      <span className="np-storefront-custom-check">
                        <input type="checkbox" checked={credentialsConfirmed} onChange={(event) => setCredentialsConfirmed(event.target.checked)} />
                        <span className="np-storefront-check-box">{credentialsConfirmed && <Check size={12} strokeWidth={3} />}</span>
                      </span>
                      <span className="np-storefront-consent-text">
                        Je confirme que ces identifiants correspondent bien à <strong>mon compte</strong> et j’autorise cette recharge.
                      </span>
                    </label>
                    <label className={`np-storefront-consent-card ${secondFactorConfirmed ? "is-checked" : ""}`}>
                      <span className="np-storefront-custom-check">
                        <input type="checkbox" checked={secondFactorConfirmed} onChange={(event) => setSecondFactorConfirmed(event.target.checked)} />
                        <span className="np-storefront-check-box">{secondFactorConfirmed && <Check size={12} strokeWidth={3} />}</span>
                      </span>
                      <span className="np-storefront-consent-text">
                        J’ai pris connaissance des consignes et je comprends que l’authentification à deux facteurs (2FA) peut nécessiter ma validation.
                      </span>
                    </label>
                  </div>
                </>}

                <div className="np-storefront-field np-storefront-field--full">
                  <div className="np-storefront-field-header">
                    <label htmlFor="np-field-whatsapp">Numéro WhatsApp avec indicatif</label>
                    {whatsapp.replace(/\D/g, "").length >= 6 ? (
                      <span className="np-storefront-field-status is-valid"><Check size={11} strokeWidth={3} /> Valide</span>
                    ) : (
                      <span className="np-storefront-field-badge">Suivi en direct</span>
                    )}
                  </div>
                  <div className={`np-storefront-input-box ${whatsapp.replace(/\D/g, "").length >= 6 ? "has-value" : ""}`}>
                    <span className="np-storefront-input-icon"><Phone size={16} /></span>
                    <input
                      id="np-field-whatsapp"
                      type="tel"
                      autoComplete="tel"
                      value={whatsapp}
                      onChange={(event) => setWhatsapp(event.target.value)}
                      placeholder="Ex. +237 6 00 00 00 00"
                    />
                  </div>
                  <div className="np-storefront-delivery-pill">
                    <ShieldCheck size={13} />
                    <span>Notification et confirmation de livraison envoyées sur ce WhatsApp.</span>
                  </div>
                </div>
              </div>

              {validContact ? (
                <div className="np-storefront-checkout-active">
                  <SoleasPayCheckoutV3
                    language="fr"
                    amount={selectedOffer.priceXaf}
                    orderId={orderId || makeOrderId()}
                    description={`${selectedProduct.name} - ${selectedOffer.name}`}
                    username={accountId.trim()}
                    password={selectedProduct.requiresPassword ? password : undefined}
                    whatsapp={whatsapp}
                    coins={purchaseKind === "coins" ? selectedOffer.quantity || 0 : purchaseKind === "internet" ? 1 : 0}
                    productType={purchaseKind}
                    productLabel={`${selectedProduct.name} - ${selectedOffer.name}`}
                  />
                  <div className="np-storefront-checkout-guarantee">
                    <span>Mobile Money & Carte bancaire</span>
                    <em>•</em>
                    <span>Paiement sécurisé et instantané</span>
                  </div>
                </div>
              ) : (
                <div className="np-storefront-pay-pending-wrapper">
                  <button type="button" className="np-storefront-pay-disabled" disabled>
                    <Lock size={15} />
                    <span>Complétez les informations pour débloquer le paiement</span>
                  </button>
                  {missingSteps.length > 0 && (
                    <div className="np-storefront-missing-steps">
                      <span>À renseigner :</span>
                      {missingSteps.map((step, idx) => (
                        <span key={idx} className="np-storefront-step-tag">{step}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>}
          </div>
          <div className="np-storefront-modal-footer">
            <span className="np-storefront-footer-security">
              <ShieldCheck size={15} />
              <span>{dialogStep === "offers" ? "Sélection sans paiement immédiat" : "Paiement sécurisé par SoleasPay • Chiffré SSL"}</span>
            </span>
            <button type="button" className="np-storefront-footer-action" onClick={dialogStep === "details" ? () => setDialogStep("offers") : closeProduct}>
              {dialogStep === "details" ? <><ArrowLeft size={14} /> Changer de pack</> : <><X size={14} /> Retour à la boutique</>}
            </button>
          </div>
        </section>
      </div>}
    </Root>
  );
}
