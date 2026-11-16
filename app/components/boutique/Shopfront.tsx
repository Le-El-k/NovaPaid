"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, Coins, Download, Eye, EyeOff, FileText, Gamepad2, Gauge, Laptop, LoaderCircle, Lock, Mail, MapPin, PackageOpen, Phone, Search, ShieldCheck, ShoppingBag, Smartphone, Sparkles, User, Wifi, X } from "lucide-react";
import { SoleasPayCheckoutV3 } from "@/app/components/payments/SoleasPayCheckoutV3";
import { GenyInternetCheckout } from "@/app/components/boutique/GenyInternetCheckout";
import { LanguageSelector, useLanguage } from "@/app/lib/i18n";
import { getAssetPath } from "@/app/lib/asset-path";
import type { ShopOffer, ShopProduct, ShopSection } from "@/app/lib/shop-catalog";
import type { GenyPlanView } from "@/app/lib/geny/types.ts";

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

// Clé localStorage pour l'acquittement des conditions internet : une fois par
// mois et par utilisateur. "YYYY-MM" borne l'acquittement au mois courant.
function internetGateStorageKey() {
  let uid = "guest";
  try {
    const raw = localStorage.getItem("novapaid_current_user");
    if (raw) { const u = JSON.parse(raw); if (u?.id) uid = String(u.id); }
  } catch { /* localStorage indisponible */ }
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `novapaid_internet_gate_ack:${uid}:${month}`;
}

function hasAckedInternetGateThisMonth() {
  try { return localStorage.getItem(internetGateStorageKey()) === "1"; } catch { return false; }
}

function markInternetGateAcked() {
  try { localStorage.setItem(internetGateStorageKey(), "1"); } catch { /* ignore */ }
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
  const [genyPlans, setGenyPlans] = useState<GenyPlanView[]>([]);
  const [genyPlansLoading, setGenyPlansLoading] = useState(false);
  const [genyPlansError, setGenyPlansError] = useState("");
  const [genyCheckoutStep, setGenyCheckoutStep] = useState<1 | 2 | 3>(1);
  const [internetGateAck, setInternetGateAck] = useState(false);
  const [internetGateChecked, setInternetGateChecked] = useState(false);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/shop-catalog", { cache: "no-store" });
      const data = await response.json() as CatalogResponse;
      if (!response.ok || !data.success) throw new Error(data.error || t("sfront_catalog_load_error"));
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
      setError(loadError?.message || t("sfront_catalog_connect_error"));
    } finally {
      setLoading(false);
    }
  }, [sectionSlug, t]);

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
  const isInternetSection = selectedSection?.slug === "connexion-internet";

  // Lorsqu'on ouvre la section internet, montrer la gate d'éligibilité une seule
  // fois par mois et par utilisateur : si l'utilisateur l'a déjà acceptée ce
  // mois-ci, on la saute directement.
  useEffect(() => {
    if (isInternetSection && !categoryLanding) {
      if (hasAckedInternetGateThisMonth()) {
        setInternetGateAck(true);
      } else {
        setInternetGateAck(false);
        setInternetGateChecked(false);
      }
    }
  }, [isInternetSection, categoryLanding]);

  // The internet forfaits are driven directly from Geny's live plan list, so the
  // offers, prices and plan ids always match what Geny will actually sell.
  useEffect(() => {
    if (!isInternetSection || categoryLanding) return;
    let active = true;
    setGenyPlansLoading(true);
    setGenyPlansError("");
    fetch("/api/geny?action=plans", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data?.ok && Array.isArray(data.plans)) {
          setGenyPlans(data.plans as GenyPlanView[]);
        } else {
          setGenyPlans([]);
          setGenyPlansError(data?.error || t("sfront_offers_coming_soon"));
        }
      })
      .catch(() => { if (active) setGenyPlansError(t("sfront_catalog_connect_error")); })
      .finally(() => { if (active) setGenyPlansLoading(false); });
    return () => { active = false; };
  }, [isInternetSection, categoryLanding, t]);

  const visibleGenyPlans = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return genyPlans.filter((plan) => !query || `${plan.name} ${plan.durationLabel}`.toLocaleLowerCase("fr").includes(query));
  }, [search, genyPlans]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return (selectedSection?.products || []).filter((product) =>
      !query || `${product.name} ${product.subtitle} ${product.description} ${product.offers.map((offer) => offer.name).join(" ")}`.toLocaleLowerCase("fr").includes(query),
    );
  }, [search, selectedSection]);
  const customTikTokOffer: ShopOffer | null = customTikTokCoins >= 70 ? {
    id: "custom-tiktok",
    name: t("sfront_custom_coins_name").replace("{n}", new Intl.NumberFormat("fr-FR").format(customTikTokCoins)),
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
      if (!validInternetPhone) steps.push(t("sfront_step_momo_number"));
      return steps;
    }
    if (!accountId.trim() || accountId.trim().length < 2) {
      const label = selectedProduct?.customerLabel || t("sfront_step_identifier");
      steps.push(label.length > 22 ? t("sfront_step_identifier_email") : label);
    }
    if (selectedProduct?.requiresPassword) {
      if (!password.trim() || password.trim().length < 4) {
        steps.push(t("sfront_step_password"));
      }
      if (!credentialsConfirmed || !secondFactorConfirmed) {
        steps.push(t("sfront_step_confirmations"));
      }
    }
    if (whatsapp.replace(/\D/g, "").length < 6) {
      steps.push(t("sfront_step_whatsapp_number"));
    }
    return steps;
  }, [accountId, selectedProduct, password, credentialsConfirmed, secondFactorConfirmed, whatsapp, purchaseKind, validInternetPhone, t]);

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
    setGenyCheckoutStep(1);
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
    setGenyCheckoutStep(1);
  }

  function openTikTokOffer(product: ShopProduct, offer: ShopOffer) {
    openProduct(product);
    setSelectedOfferId(offer.id);
    setOrderId(makeOrderId());
    setDialogStep("details");
  }

  // Open the internet checkout for a Geny plan. A synthetic product/offer feeds
  // the existing internet modal; the offer id IS the Geny plan id.
  function openGenyPlan(plan: GenyPlanView) {
    const syntheticProduct: ShopProduct = {
      id: -1,
      sectionId: selectedSection?.id ?? -1,
      slug: "forfait-geny",
      name: plan.name,
      subtitle: plan.volumeLabel,
      description: "",
      imageUrl: "",
      badge: "",
      customerLabel: "",
      requiresPassword: false,
      sortOrder: 0,
      isActive: true,
      offers: [{ id: plan.id, name: `${plan.volumeLabel} · ${plan.durationLabel}`, priceXaf: plan.priceXaf, quantity: 1 }],
    };
    openProduct(syntheticProduct);
    setSelectedOfferId(plan.id);
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
        <a className="np-storefront-brand" href="/" aria-label={t("sfront_brand_home_aria")}>
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
            <div><h2 id="np-storefront-section-title">{t("sfront_the_shop")}</h2><p>{t("sfront_choose_category")}</p></div>
          </div>
          {loading ? <div className="np-storefront-state"><LoaderCircle size={23} className="np-storefront-spin" /><span>{t("sfront_loading_categories")}</span></div> : error ? (
            <div className="np-storefront-state is-error"><PackageOpen size={26} /><strong>{error}</strong><button type="button" onClick={() => void loadCatalog()}>{t("sfront_retry")}</button></div>
          ) : categorySections.length === 0 ? (
            <div className="np-storefront-state"><PackageOpen size={28} /><strong>{t("sfront_shop_preparing")}</strong><span>{t("sfront_categories_soon")}</span></div>
          ) : <div className="np-storefront-category-grid">
            {categorySections.map((section) => <a href={embedded ? `/dashboard/boutique#${section.slug}` : `/boutique/${section.slug}`} className="np-storefront-category-card" key={section.id} style={{ "--np-category-accent": section.slug === "pieces-tiktok" ? "#ed4fa1" : section.slug === "connexion-internet" ? "#1684d5" : "#5b73ed" } as CSSProperties}>
              <span className="np-storefront-category-icon">{sectionIcon(section.icon, 24)}</span>
              <span className="np-storefront-category-copy"><small>{t("sfront_shop_novapaid_upper")}</small><strong>{section.name}</strong><em>{section.description}</em><span>{section.products.length} {section.products.length === 1 ? t("sfront_product_one") : t("sfront_product_many")}</span></span>
              <span className="np-storefront-category-arrow"><ArrowUpRight size={19} /></span>
            </a>)}
          </div>}
        </> : <>
          {selectedSection?.slug !== "connexion-internet" && <div className="np-storefront-catalogue-top np-storefront-detail-heading">
            <div>
              {embedded && <button type="button" className="np-internet-back np-storefront-category-back" onClick={returnToCategories}><ArrowLeft size={14} /> {t("sfront_all_categories")}</button>}
              {!embedded && <a className="np-storefront-back-link" href="/boutique"><ArrowLeft size={15} /> {t("sfront_back_to_categories")}</a>}
              <h2 id="np-storefront-section-title">{selectedSection?.name || t("sfront_the_shop")}</h2>
              {selectedSection && <p>{selectedSection.description}</p>}
            </div>
            {!embedded && selectedSection && <span className="np-storefront-detail-count">{selectedSection.products.length} {selectedSection.products.length === 1 ? t("sfront_product_one") : t("sfront_product_many")}</span>}
            {embedded && <label className="np-storefront-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("sfront_search_product")} aria-label={t("sfront_search_product")} />{search && <button type="button" onClick={() => setSearch("")} aria-label={t("sfront_clear_search")}><X size={14} /></button>}</label>}
          </div>}

          {loading ? <div className="np-storefront-state"><LoaderCircle size={23} className="np-storefront-spin" /><span>{t("sfront_loading_products")}</span></div> : error ? (
            <div className="np-storefront-state is-error"><PackageOpen size={26} /><strong>{error}</strong><button type="button" onClick={() => void loadCatalog()}>{t("sfront_retry")}</button></div>
          ) : !selectedSection ? (
            <div className="np-storefront-state"><PackageOpen size={28} /><strong>{t("sfront_category_unavailable")}</strong><a href={embedded ? "/dashboard/boutique" : "/boutique"}>{t("sfront_back_to_shop")}</a></div>
          ) : selectedSection.slug === "connexion-internet" ? <div className="np-internet-experience">
            {!internetGateAck && <div className="np-internet-gate-overlay" role="dialog" aria-modal="true" aria-labelledby="np-internet-gate-title">
              <div className="np-internet-gate">
                <span className="np-internet-gate-overline"><ShieldCheck size={13} /> {t("sfront_gate_overline")}</span>
                <h2 id="np-internet-gate-title">{t("sfront_gate_title")}</h2>
                <p className="np-internet-gate-intro">{t("sfront_gate_intro")}</p>
                <ul className="np-internet-gate-reqs">
                  <li><span className="np-internet-gate-reqicon"><MapPin size={16} /></span>{t("sfront_gate_req_country")}</li>
                  <li><span className="np-internet-gate-reqicon"><Smartphone size={16} /></span>{t("sfront_gate_req_android")}</li>
                  <li><span className="np-internet-gate-reqicon"><Wifi size={16} /></span>{t("sfront_gate_req_sim")}</li>
                </ul>
                <div className="np-internet-gate-warn is-danger">
                  <AlertTriangle size={18} />
                  <div><strong>{t("sfront_gate_iphone_title")}</strong><small>{t("sfront_gate_iphone_desc")}</small></div>
                </div>
                <div className="np-internet-gate-warn is-danger">
                  <AlertTriangle size={18} />
                  <div><strong>{t("sfront_gate_norefund_title")}</strong><small>{t("sfront_gate_norefund_desc")}</small></div>
                </div>
                <label className="np-internet-gate-check">
                  <input type="checkbox" checked={internetGateChecked} onChange={(e) => setInternetGateChecked(e.target.checked)} />
                  <span>{t("sfront_gate_ack")}</span>
                </label>
                <div className="np-internet-gate-actions">
                  {embedded
                    ? <button type="button" className="np-internet-gate-cancel" onClick={returnToCategories}>{t("sfront_gate_back")}</button>
                    : <a className="np-internet-gate-cancel" href="/boutique">{t("sfront_gate_back")}</a>}
                  <button type="button" className="np-internet-gate-continue" disabled={!internetGateChecked} onClick={() => { markInternetGateAcked(); setInternetGateAck(true); }}>
                    <Check size={16} /> {t("sfront_gate_continue")}
                  </button>
                </div>
              </div>
            </div>}
            <aside className="np-internet-intro">
              {embedded
                ? <button type="button" className="np-internet-back" onClick={returnToCategories}><ArrowLeft size={14} /> {t("sfront_all_categories")}</button>
                : <a className="np-internet-back" href="/boutique"><ArrowLeft size={14} /> {t("sfront_all_categories")}</a>}
              <h1>{t("sfront_internet_title")}<br />{t("sfront_internet_without")} <em>BullShit.</em></h1>
              <p>{t("sfront_internet_subtitle")}</p>
              <div className="np-internet-install-list">
                <a href="https://geny.payool.net/api/v1/app/android.apk">
                  <span className="np-internet-install-icon is-android"><Smartphone size={19} /></span><span><strong>Android</strong><small>{t("sfront_download_android")}</small></span><Download size={16} />
                </a>
                <a href="https://geny.payool.net/api/v1/app/windows.exe">
                  <span className="np-internet-install-icon is-windows"><Laptop size={19} /></span><span><strong>PC Windows</strong><small>{t("sfront_download_pc")}</small></span><Download size={16} />
                </a>
                <details className="np-internet-guide">
                  <summary><span className="np-internet-install-icon is-guide"><BookOpen size={18} /></span><span><strong>{t("sfront_usage_guide")}</strong><small>{t("sfront_how_to_activate")}</small></span><FileText size={16} /></summary>
                  <ol><li>{t("sfront_guide_step1")}</li><li>{t("sfront_guide_step2")}</li><li>{t("sfront_guide_step3")}</li></ol>
                </details>
              </div>
              <div className="np-internet-steps" aria-label={t("sfront_activation_steps_aria")}><span>1&nbsp; {t("sfront_internet_step1")}</span><span>2&nbsp; {t("sfront_internet_step2")}</span><span>3&nbsp; {t("sfront_internet_step3")}</span></div>
            </aside>
            <section className="np-internet-plans" aria-labelledby="np-internet-plans-title">
              <div className="np-internet-plans-heading"><h2 id="np-internet-plans-title">{t("sfront_our_plans")}</h2><p>{t("sfront_plans_touch_hint")}</p><small>{t("sfront_plans_fair_use")}</small></div>
              {genyPlansLoading ? <div className="np-storefront-state"><LoaderCircle size={23} className="np-storefront-spin" /><span>{t("sfront_loading_products")}</span></div>
              : visibleGenyPlans.length ? <div className="np-internet-plan-grid">{visibleGenyPlans.map((plan) => <button type="button" className="np-internet-plan" key={plan.id} onClick={() => openGenyPlan(plan)} aria-label={t("sfront_buy_aria").replace("{name}", plan.name).replace("{price}", formatPrice(plan.priceXaf))}>
                <span className="np-internet-plan-group">{plan.volumeLabel}</span>
                <strong className="np-internet-plan-name">{plan.name}</strong>
                <span className="np-internet-plan-volume">{plan.durationLabel}{/nuit/i.test(plan.name) && <em className="np-internet-plan-window">22h - 06h</em>}</span>
                <span className="np-internet-plan-bottom"><span className={plan.priceXaf === 0 ? "is-free" : ""}>{plan.priceXaf === 0 ? t("sfront_free") : <>{new Intl.NumberFormat("fr-FR").format(plan.priceXaf)}<small> FCFA</small></>}</span><i>{plan.priceXaf === 0 ? t("sfront_get") : t("sfront_buy")} <ArrowRight size={12} /></i></span>
              </button>)}</div> : <div className="np-storefront-state np-storefront-empty"><PackageOpen size={30} /><strong>{search ? t("sfront_no_results") : (genyPlansError || t("sfront_offers_coming_soon"))}</strong><span>{search ? t("sfront_refine_search_offers") : t("sfront_category_filled_admin")}</span></div>}
            </section>
          </div> : selectedSection.slug === "pieces-tiktok" ? <div className="np-tiktok-catalog">
            {visibleProducts.some((product) => product.offers.length > 0) ? <div className="np-tiktok-pack-grid">
              {visibleProducts.flatMap((product) => product.offers.map((offer) => <button type="button" className="np-tiktok-pack-card" key={`${product.id}-${offer.id}`} onClick={() => openTikTokOffer(product, offer)}>
                <span className="np-tiktok-pack-icon"><Coins size={21} /></span>
                <span className="np-tiktok-pack-quantity">{offer.name}</span>
                {offer.bonus && <span className="np-tiktok-pack-bonus">{offer.bonus}</span>}
                <strong>{formatPrice(offer.priceXaf)}</strong>
                <span className="np-tiktok-pack-action">{t("sfront_choose_this_pack")} <ArrowRight size={14} /></span>
              </button>))}
            </div> : <div className="np-storefront-state np-storefront-empty"><PackageOpen size={30} /><strong>{search ? t("sfront_no_pack_found") : t("sfront_offers_coming_soon")}</strong><span>{search ? t("sfront_try_other_name_quantity") : t("sfront_tiktok_packs_soon")}</span></div>}

            {selectedSection.products[0] && <section className="np-tiktok-custom-card" aria-labelledby="np-tiktok-custom-title">
              <div className="np-tiktok-custom-heading">
                <span className="np-tiktok-pack-icon"><Coins size={21} /></span>
                <span><strong id="np-tiktok-custom-title">{t("sfront_custom_amount")}</strong><small>{t("sfront_choose_coins_yourself")}</small></span>
              </div>
              <div className="np-tiktok-custom-input-wrap">
                <label htmlFor="np-tiktok-custom-coins">{t("sfront_coins_count")} <span>{t("sfront_coins_minimum")}</span></label>
                <div className="np-tiktok-custom-input"><input id="np-tiktok-custom-coins" type="number" inputMode="numeric" min={70} max={1000000} step={1} value={customTikTokCoins || ""} onChange={(event) => setCustomTikTokCoins(Math.min(1000000, Math.max(0, Number.parseInt(event.target.value.replace(/\D/g, "") || "0", 10))))} placeholder={t("sfront_coins_placeholder")} /><span>{t("sfront_coins_unit")}</span></div>
                <small>{t("sfront_unit_price").replace("{n}", new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(TIKTOK_COIN_UNIT_PRICE_XAF))}</small>
              </div>
              <div className="np-tiktok-quick-add"><span>{t("sfront_quick_add")}</span>{[70, 350, 700, 1400, 3500].map((amount) => <button type="button" key={amount} onClick={() => setCustomTikTokCoins((current) => Math.min(1000000, current + amount))}>+{new Intl.NumberFormat("fr-FR").format(amount)}</button>)}</div>
              <div className="np-tiktok-custom-total"><span>{t("sfront_estimated_total")}</span><strong>{customTikTokOffer ? formatPrice(customTikTokOffer.priceXaf) : "—"}</strong></div>
              <button type="button" className="np-tiktok-custom-buy" disabled={!customTikTokOffer} onClick={() => { const product = selectedSection.products[0]; if (product && customTikTokOffer) openTikTokOffer(product, customTikTokOffer); }}>{t("sfront_buy_this_amount")} <ArrowRight size={16} /></button>
            </section>}
          </div> : <>
            {visibleProducts.length ? <div className="np-storefront-product-grid">
              {visibleProducts.map((product) => {
                const minPrice = Math.min(...product.offers.map((offer) => offer.priceXaf));
                const isInternetProduct = selectedSection.slug === "connexion-internet";
                return <article className={`np-storefront-product${isInternetProduct ? " np-storefront-product--internet" : ""}`} key={product.id}>
                  <button type="button" className="np-storefront-product-open" style={{ "--np-product-accent": productAccent(product.slug) } as CSSProperties} onClick={() => openProduct(product)} aria-label={t("sfront_view_packs_aria").replace("{name}", product.name)}>
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
                      <p>{product.description || t("sfront_choose_pack_continue")}</p>
                      {isInternetProduct && <span className="np-storefront-internet-offers" aria-label={t("sfront_plans_available_aria").replace("{n}", String(product.offers.length))}>
                        {product.offers.map((offer) => <span className="np-storefront-internet-offer" key={offer.id}>
                          <span>{offer.name}</span><strong>{formatPrice(offer.priceXaf)}</strong>
                        </span>)}
                      </span>}
                      <div className="np-storefront-product-footer"><span className="np-storefront-price"><small>{t("sfront_from_price")}</small><strong>{formatPrice(Number.isFinite(minPrice) ? minPrice : 0)}</strong></span><span className="np-storefront-product-cta">{isInternetProduct ? t("sfront_choose_plan") : t("sfront_view_packs")} <ArrowRight size={15} /></span></div>
                    </div>
                  </button>
                </article>;
              })}
            </div> : <div className="np-storefront-state np-storefront-empty"><PackageOpen size={30} /><strong>{search ? t("sfront_no_results") : t("sfront_offers_coming_soon")}</strong><span>{search ? t("sfront_refine_search_products") : t("sfront_category_filled_admin")}</span></div>}
          </>}
        </>}
      </section>

      {!categoryLanding && selectedSection?.slug !== "connexion-internet" && <section className="np-storefront-bottom-note"><div><ShieldCheck size={18} /><span><strong>{t("sfront_accompanied_payment")}</strong><small>{t("sfront_follow_order_steps")}</small></span></div><a href="/support">{t("sfront_need_help")} <ArrowRight size={14} /></a></section>}
      {selectedProduct && <div className="np-storefront-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeProduct(); }}>
        <section className={`np-storefront-modal np-storefront-modal--${dialogStep}${purchaseKind === "internet" ? " np-storefront-modal--internet" : ""}`} style={{ "--np-product-accent": productAccent(selectedProduct.slug) } as CSSProperties} role="dialog" aria-modal="true" aria-labelledby="np-storefront-modal-title">
          <header className="np-storefront-modal-header">
            {purchaseKind === "internet" ? <div className="np-internet-checkout-heading">
              <span className="np-internet-secure-label"><Lock size={12} /> {t("sfront_secure_payment_upper")}</span>
              <h2 id="np-storefront-modal-title">{t("sfront_buy_a_plan")}</h2>
              <div className="np-internet-payment-steps" aria-label={t("sfront_payment_steps_aria")}>
                <span className={genyCheckoutStep >= 1 ? "active" : ""}><i>1</i>{t("sfront_payment")}</span><span className={genyCheckoutStep >= 2 ? "active" : ""}><i>2</i>{t("sfront_validation")}</span><span className={genyCheckoutStep >= 3 ? "active" : ""}><i>3</i>{t("sfront_your_code")}</span>
              </div>
            </div> : <div className="np-storefront-modal-heading">
              <div className="np-storefront-modal-progress" aria-label={dialogStep === "offers" ? t("sfront_step1of2_pack") : t("sfront_step2of2_info")}>
                <button
                  type="button"
                  className={`np-storefront-progress-step ${dialogStep === "offers" ? "active" : "complete"}`}
                  onClick={dialogStep === "details" ? () => setDialogStep("offers") : undefined}
                  title={dialogStep === "details" ? t("sfront_edit_pack_title") : undefined}
                >
                  <span className="np-storefront-step-num">{dialogStep === "offers" ? "01" : <Check size={12} strokeWidth={3} />}</span>
                  <span className="np-storefront-step-title">{t("sfront_pack")}</span>
                </button>
                <i className={`np-storefront-progress-line ${dialogStep === "details" ? "complete" : ""}`} />
                <span className={`np-storefront-progress-step ${dialogStep === "details" ? "active" : ""}`}>
                  <span className="np-storefront-step-num">02</span>
                  <span className="np-storefront-step-title">{t("sfront_information")}</span>
                </span>
              </div>
              <h2 id="np-storefront-modal-title">{dialogStep === "offers" ? selectedProduct.name : (purchaseKind as string) === "internet" ? t("sfront_finalize_order") : t("sfront_finalize_topup")}</h2>
              <p>{dialogStep === "offers" ? selectedProduct.subtitle || selectedProduct.description : t("sfront_fill_details_prepare")}</p>
            </div>}
            <button type="button" onClick={closeProduct} aria-label={t("sfront_close")}><X size={18} /></button>
          </header>
          <div className="np-storefront-modal-body">
            {purchaseKind === "internet" && dialogStep === "details" && selectedOffer ? <div className="np-internet-checkout">
              <div className="np-internet-checkout-summary">
                <span><small>{t("sfront_chosen_plan_upper")}</small><strong>{selectedOffer.name}</strong><i>{selectedProduct.name}</i><em><span>{selectedOffer.name.split("·")[0].trim()}</span><span>{selectedOffer.name.includes("·") ? selectedOffer.name.split("·").slice(1).join("·").trim() : t("sfront_internet_plan")}</span></em></span>
                <strong>{formatPrice(selectedOffer.priceXaf).replace(" FCFA", "")}<small>FCFA</small></strong>
              </div>
              {genyCheckoutStep === 1 && <>
                <fieldset className="np-internet-operator-fieldset">
                  <legend>{t("sfront_momo_operator")}</legend>
                  <div className="np-internet-operator-options">
                    <button type="button" className={`np-internet-operator${mobileMoneyOperator === "mtn" ? " selected" : ""}`} aria-pressed={mobileMoneyOperator === "mtn"} onClick={() => setMobileMoneyOperator("mtn")}>
                      <img className="np-internet-operator-logo" src={getAssetPath("/operators/mtn-momo.svg")} alt="" width={36} height={36} /><span><strong>MTN MoMo</strong><small>Mobile Money</small></span><i aria-hidden="true" />
                    </button>
                    <button type="button" className={`np-internet-operator${mobileMoneyOperator === "orange" ? " selected" : ""}`} aria-pressed={mobileMoneyOperator === "orange"} onClick={() => setMobileMoneyOperator("orange")}>
                      <img className="np-internet-operator-logo" src={getAssetPath("/operators/orange-money.svg")} alt="" width={36} height={36} /><span><strong>Orange Money</strong><small>Mobile Money</small></span><i aria-hidden="true" />
                    </button>
                  </div>
                </fieldset>
                <div className="np-internet-phone-field">
                  <label htmlFor="np-internet-mobile-number">{t("sfront_momo_number")}</label>
                  <div className={`np-internet-phone-input${internetPhone ? validInternetPhone ? " is-valid" : " is-invalid" : ""}`}>
                    <span><b aria-hidden="true">🇨🇲</b> +237</span>
                    <input id="np-internet-mobile-number" type="tel" inputMode="numeric" autoComplete="tel-national" value={internetPhone} onChange={(event) => setInternetPhone(event.target.value.replace(/[^\d\s]/g, ""))} placeholder="6XX XX XX XX" aria-invalid={Boolean(internetPhone) && !validInternetPhone} aria-describedby="np-internet-mobile-help" />
                  </div>
                  <small id="np-internet-mobile-help">{internetPhone && !validInternetPhone ? t("sfront_valid_cm_number") : t("sfront_number_receives_request")}</small>
                </div>
              </>}
              {validContact ? <div className="np-internet-submit-wrap">
                <GenyInternetCheckout
                  key={`${selectedOffer.id}-${orderId}`}
                  planId={selectedOffer.id}
                  orderRef={orderId || makeOrderId()}
                  operator={mobileMoneyOperator}
                  phone={normalizedInternetPhone}
                  buttonLabel={t("sfront_pay").replace("{price}", formatPrice(selectedOffer.priceXaf))}
                  onNewOrderRef={() => { const id = makeOrderId(); setOrderId(id); return id; }}
                  onStepChange={setGenyCheckoutStep}
                />
              </div> : <button type="button" className="np-internet-pay-locked" disabled><Lock size={15} />{t("sfront_pay").replace("{price}", formatPrice(selectedOffer.priceXaf))}</button>}
            </div> : dialogStep === "offers" ? <>
              <div className="np-storefront-offer-intro">
                {selectedProduct.imageUrl && <img src={getAssetPath(selectedProduct.imageUrl)} alt="" />}
                <span className="np-storefront-offer-intro-shade" />
                <span className="np-storefront-offer-intro-copy"><small>{selectedProduct.offers.length} {purchaseKind === "internet" ? t("sfront_plans_upper") : t("sfront_packs_upper")} {t("sfront_available_upper")}</small><strong>{selectedProduct.name}</strong><em>{selectedProduct.subtitle || selectedSection?.name}</em></span>
                <span className="np-storefront-offer-intro-icon">{sectionIcon(selectedSection?.icon || "shopping-bag", 21)}</span>
              </div>
              <div className="np-storefront-offer-list">
                <div className="np-storefront-offer-list-heading"><span><small>{purchaseKind === "internet" ? t("sfront_choose_your_plan_upper") : t("sfront_choose_your_pack_upper")}</small><h3>{purchaseKind === "internet" ? t("sfront_which_plan_interest") : t("sfront_which_pack_interest")}</h3></span><span>{selectedProduct.offers.length} {t("sfront_options")}</span></div>
                <div className="np-storefront-offer-grid">{selectedProduct.offers.map((offer, index) => <button type="button" key={offer.id} className={`np-storefront-offer-card${offer.id === selectedOfferId ? " selected" : ""}`} aria-label={t("sfront_choose_offer_aria").replace("{name}", offer.name).replace("{price}", formatPrice(offer.priceXaf))} onClick={() => chooseOffer(offer)}>
                  <span className="np-storefront-offer-card-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="np-storefront-offer-card-copy"><strong>{offer.name}</strong>{offer.bonus && <small>{offer.bonus}</small>}</span>
                  <span className="np-storefront-offer-card-price"><strong>{formatPrice(offer.priceXaf)}</strong><i><ArrowRight size={15} /></i></span>
                </button>)}</div>
              </div>
              <p className="np-storefront-offer-hint"><ShieldCheck size={15} /> {t("sfront_info_after_pack")}</p>
            </> : selectedOffer && <>
              <div className="np-storefront-selected-pack">
                <span className="np-storefront-selected-pack-image">
                  {selectedProduct.imageUrl ? <img src={getAssetPath(selectedProduct.imageUrl)} alt={selectedProduct.name} /> : sectionIcon(selectedSection?.icon || "shopping-bag", 24)}
                </span>
                <span className="np-storefront-selected-pack-copy">
                  <span className="np-storefront-selected-pack-tag"><Sparkles size={11} /> {t("sfront_selected_pack")}</span>
                  <strong>{selectedOffer.name}</strong>
                  <em>{selectedProduct.name}{selectedOffer.bonus ? ` • ${selectedOffer.bonus}` : ""}</em>
                </span>
                <div className="np-storefront-selected-pack-pricing">
                  <small>{t("sfront_total_amount")}</small>
                  <strong className="np-storefront-selected-pack-price">{formatPrice(selectedOffer.priceXaf)}</strong>
                  <button type="button" className="np-storefront-change-pack-btn" onClick={() => setDialogStep("offers")}>
                    {t("sfront_modify")}
                  </button>
                </div>
              </div>

              <div className="np-storefront-order-form">
                <div className="np-storefront-form-heading">
                  <span className="np-storefront-heading-icon">{sectionIcon(selectedSection?.icon || "shopping-bag", 19)}</span>
                  <div className="np-storefront-heading-text">
                    <h3>{t("sfront_delivery_details")}</h3>
                    <p>{t("sfront_secure_info_deliver")}</p>
                  </div>
                  <div className="np-storefront-secure-chip">
                    <ShieldCheck size={13} />
                    <span>{t("sfront_ssl_encryption")}</span>
                  </div>
                </div>

                <div className="np-storefront-field np-storefront-field--full">
                  <div className="np-storefront-field-header">
                    <label htmlFor="np-field-account">{selectedProduct.customerLabel}</label>
                    {accountId.trim().length >= 2 && (
                      <span className="np-storefront-field-status is-valid"><Check size={11} strokeWidth={3} /> {t("sfront_filled")}</span>
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
                      placeholder={t("sfront_enter_your").replace("{label}", selectedProduct.customerLabel.toLowerCase())}
                    />
                  </div>
                </div>

                {selectedProduct.requiresPassword && <>
                  <div className="np-storefront-field np-storefront-field--full">
                    <div className="np-storefront-field-header">
                      <label htmlFor="np-field-password">{t("sfront_account_password")}</label>
                      <span className="np-storefront-field-note"><Lock size={11} /> {t("sfront_fully_confidential")}</span>
                    </div>
                    <div className={`np-storefront-input-box ${password.length >= 4 ? "has-value" : ""}`}>
                      <span className="np-storefront-input-icon"><Lock size={16} /></span>
                      <input
                        id="np-field-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={t("sfront_enter_account_password")}
                      />
                      <button
                        type="button"
                        className="np-storefront-password-toggle"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? t("sfront_hide_password") : t("sfront_show_password")}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <small className="np-storefront-input-hint">{t("sfront_password_required_hint")}</small>
                  </div>

                  <div className="np-storefront-consents-group">
                    <label className={`np-storefront-consent-card ${credentialsConfirmed ? "is-checked" : ""}`}>
                      <span className="np-storefront-custom-check">
                        <input type="checkbox" checked={credentialsConfirmed} onChange={(event) => setCredentialsConfirmed(event.target.checked)} />
                        <span className="np-storefront-check-box">{credentialsConfirmed && <Check size={12} strokeWidth={3} />}</span>
                      </span>
                      <span className="np-storefront-consent-text">
                        {t("sfront_consent_credentials_a")}<strong>{t("sfront_consent_my_account")}</strong>{t("sfront_consent_credentials_b")}
                      </span>
                    </label>
                    <label className={`np-storefront-consent-card ${secondFactorConfirmed ? "is-checked" : ""}`}>
                      <span className="np-storefront-custom-check">
                        <input type="checkbox" checked={secondFactorConfirmed} onChange={(event) => setSecondFactorConfirmed(event.target.checked)} />
                        <span className="np-storefront-check-box">{secondFactorConfirmed && <Check size={12} strokeWidth={3} />}</span>
                      </span>
                      <span className="np-storefront-consent-text">
                        {t("sfront_consent_2fa")}
                      </span>
                    </label>
                  </div>
                </>}

                <div className="np-storefront-field np-storefront-field--full">
                  <div className="np-storefront-field-header">
                    <label htmlFor="np-field-whatsapp">{t("sfront_whatsapp_with_code")}</label>
                    {whatsapp.replace(/\D/g, "").length >= 6 ? (
                      <span className="np-storefront-field-status is-valid"><Check size={11} strokeWidth={3} /> {t("sfront_valid")}</span>
                    ) : (
                      <span className="np-storefront-field-badge">{t("sfront_live_tracking")}</span>
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
                      placeholder={t("sfront_whatsapp_placeholder")}
                    />
                  </div>
                  <div className="np-storefront-delivery-pill">
                    <ShieldCheck size={13} />
                    <span>{t("sfront_delivery_notification")}</span>
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
                    <span>{t("sfront_momo_and_card")}</span>
                    <em>•</em>
                    <span>{t("sfront_secure_instant_payment")}</span>
                  </div>
                </div>
              ) : (
                <div className="np-storefront-pay-pending-wrapper">
                  <button type="button" className="np-storefront-pay-disabled" disabled>
                    <Lock size={15} />
                    <span>{t("sfront_complete_info_unlock")}</span>
                  </button>
                  {missingSteps.length > 0 && (
                    <div className="np-storefront-missing-steps">
                      <span>{t("sfront_to_fill")}</span>
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
              <span>{dialogStep === "offers" ? t("sfront_selection_no_payment") : t("sfront_secure_soleaspay_ssl")}</span>
            </span>
            <button type="button" className="np-storefront-footer-action" onClick={dialogStep === "details" ? () => setDialogStep("offers") : closeProduct}>
              {dialogStep === "details" ? <><ArrowLeft size={14} /> {t("sfront_change_pack")}</> : <><X size={14} /> {t("sfront_back_to_shop")}</>}
            </button>
          </div>
        </section>
      </div>}
    </Root>
  );
}
