"use client";

import Image from "next/image";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  Gamepad2,
  HelpCircle,
  Headphones,
  Info,
  LockKeyhole,
  Monitor,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  ThumbsUp,
  Users,
  X,
  Zap,
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
import { VideoGamesSection } from "@/app/components/games/VideoGamesSection";
import { getAssetPath } from "@/app/lib/asset-path";
import { packs, type Pack } from "@/app/lib/catalog";
import { buildSupportWhatsAppHref, SUPPORT_WHATSAPP_CONTACTS } from "@/app/lib/support-whatsapp";
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
type ProductMode = "cards" | "coins" | "games";

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
    videoGames: "Jeux vidéos",
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
    recommended: "Populaire",
    popularCountries: "Pays populaires",
    allCountries: "Tous les pays (A-Z)",
    heroBadge: "Plateforme N°1 de Services Digitaux en Afrique",
    heroTitle: "Paiements, Cartes & Gaming au Meilleur Taux",
    heroSubtitle: "Achetez vos cartes bancaires virtuelles internationales Visa & Mastercard, rechargez vos pièces TikTok et vos jeux vidéo préférés en toute sécurité avec Mobile Money en FCFA.",
    trustInstant: "Livraison 5-15 min",
    trustSecurity: "100% Sécurisé",
    trustPayment: "Mobile Money FCFA",
    trustRating: "4.9/5 (15 000+ avis)",
    liveSupport: "24/7 En ligne",
    askHelp: "Assistance WhatsApp",
    quickAdd: "Ajouts rapides :",
    statOrders: "15 000+ commandes",
    statSpeed: "5 à 15 min chrono",
    statRating: "4.9/5 satisfaction",
    statSupport: "Support 7j/7 dédié",
    reviewsBadge: "Témoignages vérifiés",
    reviewsTitle: "La confiance de milliers de clients",
    reviewsSubtitle: "Découvrez les retours récents de nos utilisateurs à travers toute l'Afrique francophone.",
    faqBadge: "Foire Aux Questions",
    faqSectionTitle: "Tout ce que vous devez savoir",
    faqSubtitle: "Des réponses claires et transparentes pour commander vos forfaits en toute sérénité.",
    partnersTitle: "Moyens de paiement sécurisés",
    partnersSubtitle: "Réglez directement en FCFA avec vos comptes Mobile Money habituels via la passerelle certifiée SoleasPay.",
    footerAbout: "Nova Paid est la plateforme de référence pour l'achat de cartes bancaires virtuelles Visa/Mastercard et la recharge instantanée de pièces TikTok et jeux vidéo en Afrique francophone.",
    footerDisclaimer: "Nova Paid est une plateforme indépendante de services tiers et n'est pas affiliée, associée ou sponsorisée par TikTok ou ByteDance.",
    footerCopyright: `© ${new Date().getFullYear()} Nova Paid. Tous droits réservés.`,
  },
  en: {
    mainMenu: "Main menu",
    brandLabel: "Nova Paid — TikTok coin packs",
    products: "Our products",
    virtualCards: "Virtual cards",
    tiktokCoins: "TikTok coins",
    videoGames: "Video games",
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
    recommended: "Popular",
    popularCountries: "Popular countries",
    allCountries: "All countries (A-Z)",
    heroBadge: "#1 Digital Services Platform in Africa",
    heroTitle: "Digital Payments, Cards & Gaming at Best Rates",
    heroSubtitle: "Buy international Visa & Mastercard virtual cards, TikTok coin top-ups and video game packages at the best rates in FCFA via Mobile Money.",
    trustInstant: "Delivered in 5-15 min",
    trustSecurity: "100% Secure",
    trustPayment: "Mobile Money FCFA",
    trustRating: "4.9/5 (15,000+ reviews)",
    liveSupport: "24/7 Online",
    askHelp: "WhatsApp Support",
    quickAdd: "Quick add:",
    statOrders: "15,000+ completed orders",
    statSpeed: "5 to 15 min delivery",
    statRating: "4.9/5 customer satisfaction",
    statSupport: "7/7 Dedicated support",
    reviewsBadge: "Verified testimonials",
    reviewsTitle: "Trusted by thousands of customers",
    reviewsSubtitle: "Read recent feedback from our active users across Francophone Africa.",
    faqBadge: "Frequently Asked Questions",
    faqSectionTitle: "Everything you need to know",
    faqSubtitle: "Clear and transparent answers to help you order your packages with total peace of mind.",
    partnersTitle: "Secure local payment methods",
    partnersSubtitle: "Pay directly in FCFA using your trusted Mobile Money accounts through the certified SoleasPay gateway.",
    footerAbout: "Nova Paid is the leading platform in Francophone Africa for purchasing international virtual bank cards and topping up TikTok coins and video games instantly.",
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

const customerReviews = [
  {
    name: "Yannick M.",
    country: "🇨🇲 Douala, Cameroun",
    service: "3 500 Pièces TikTok",
    rating: 5,
    date: "Il y a 2 jours",
    comment: {
      fr: "Recharge reçue en moins de 6 minutes par MTN MoMo. C'est la 4ème fois que je commande et la livraison est toujours ultra rapide. Le support WhatsApp répond tout de suite !",
      en: "Recharge received in under 6 minutes via MTN MoMo. 4th time ordering here and delivery is always lightning fast. WhatsApp support answers immediately!",
    },
  },
  {
    name: "Aminata D.",
    country: "🇨🇮 Abidjan, Côte d'Ivoire",
    service: "Mastercard Basique",
    rating: 5,
    date: "Il y a 3 jours",
    comment: {
      fr: "J'ai pris la Mastercard pour sponsoriser mes publications sur Facebook Ads et payer Netflix. Carte acceptée du premier coup sans aucune vérification KYC compliquée. Merci Nova Paid !",
      en: "Got the Mastercard for Facebook Ads and Netflix subscription. Accepted on the first attempt without complicated KYC verification. Thank you Nova Paid!",
    },
  },
  {
    name: "Cheikh S.",
    country: "🇸🇳 Dakar, Sénégal",
    service: "2 400 V-Bucks Fortnite",
    rating: 5,
    date: "Il y a 5 jours",
    comment: {
      fr: "Paiement par Wave validé en 1 seconde et mes V-Bucks étaient sur mon compte Epic Games en 8 minutes chrono. Service très pro et honnête, je recommande !",
      en: "Wave payment confirmed in 1 second and V-Bucks were in my Epic Games account in 8 minutes flat. Very professional and honest service!",
    },
  },
  {
    name: "Boris K.",
    country: "🇧🇯 Cotonou, Bénin",
    service: "1 400 Pièces TikTok",
    rating: 5,
    date: "Il y a 1 semaine",
    comment: {
      fr: "Super expérience ! Le meilleur taux en FCFA que j'ai trouvé sur internet. Les instructions sont très claires et tout s'est passé sans accroc.",
      en: "Great experience! The best FCFA rate I found online. Instructions are clear and everything went smoothly.",
    },
  },
];

const faqItems = [
  {
    q: {
      fr: "Comment effectuer le paiement avec Mobile Money (Orange, MTN, Moov, Wave) ?",
      en: "How do I pay using Mobile Money (Orange, MTN, Moov, Wave)?",
    },
    a: {
      fr: "Sélectionnez votre forfait, renseignez vos informations, puis cliquez sur 'Payer par Mobile Money'. Vous serez redirigé vers la passerelle sécurisée SoleasPay où vous choisirez votre opérateur (Orange Money, MTN MoMo, Moov Money ou Wave). Il vous suffira de valider la demande de débit sur votre téléphone.",
      en: "Select your package, fill in your details, then click 'Pay with Mobile Money'. You will be redirected to the secure SoleasPay gateway where you select your operator. Simply approve the payment prompt on your phone.",
    },
  },
  {
    q: {
      fr: "Quel est le délai de livraison de ma recharge ou de ma carte ?",
      en: "What is the delivery time for my recharge or virtual card?",
    },
    a: {
      fr: "Toutes les commandes sont traitées automatiquement et livrées en 5 à 15 minutes dès que votre paiement Mobile Money est confirmé. En cas de forte affluence, notre service client sur WhatsApp reste disponible 7j/7 pour vous assister.",
      en: "All orders are processed automatically and delivered within 5 to 15 minutes once payment is confirmed. Our WhatsApp support is available 7/7 if you need assistance.",
    },
  },
  {
    q: {
      fr: "Pourquoi désactiver l'A2F/2FA lors de la recharge de mon compte ?",
      en: "Why do I need to disable 2FA during my account top-up?",
    },
    a: {
      fr: "Pour les recharges directes (pièces TikTok ou Fortnite), la désactivation temporaire de l'authentification à deux facteurs permet à notre système d'accéder au compte et de créditer vos forfaits sans être bloqué par un code SMS. Vous pouvez la réactiver immédiatement après livraison.",
      en: "For direct account top-ups, temporarily turning off two-factor authentication allows our system to credit your package without SMS code blockage. You can turn it back on right after delivery.",
    },
  },
  {
    q: {
      fr: "Où puis-je utiliser ma carte virtuelle Nova Paid ?",
      en: "Where can I use my Nova Paid virtual card?",
    },
    a: {
      fr: "Nos cartes virtuelles Visa et Mastercard en USD sont acceptées sur toutes les plateformes internationales sécurisées par 3D Secure : abonnements (Netflix, Spotify, ChatGPT Plus), publicités (Facebook Ads, Google Ads), boutiques en ligne (Amazon, Alibaba, AliExpress) et services cloud.",
      en: "Our USD Visa and Mastercard virtual cards are accepted on all 3D Secure platforms: streaming (Netflix, Spotify), ads (Facebook, Google), e-commerce (Amazon, AliExpress) and cloud services.",
    },
  },
];

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
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isGameDetail, setIsGameDetail] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const [reviewDragOffset, setReviewDragOffset] = useState(0);
  const [isDraggingReview, setIsDraggingReview] = useState(false);
  const reviewDragStartX = useRef<number | null>(null);

  const handlePrevReview = () => {
    playTap();
    setActiveReviewIndex((prev) => (prev - 1 + customerReviews.length) % customerReviews.length);
  };

  const handleNextReview = () => {
    playTap();
    setActiveReviewIndex((prev) => (prev + 1) % customerReviews.length);
  };

  const onReviewTouchStart = (e: React.TouchEvent) => {
    reviewDragStartX.current = e.touches[0].clientX;
    setIsDraggingReview(true);
    setReviewDragOffset(0);
  };

  const onReviewTouchMove = (e: React.TouchEvent) => {
    if (reviewDragStartX.current === null) return;
    const diff = e.touches[0].clientX - reviewDragStartX.current;
    setReviewDragOffset(diff);
  };

  const onReviewTouchEnd = () => {
    if (reviewDragStartX.current !== null) {
      if (reviewDragOffset < -40) {
        handleNextReview();
      } else if (reviewDragOffset > 40) {
        handlePrevReview();
      }
    }
    reviewDragStartX.current = null;
    setIsDraggingReview(false);
    setReviewDragOffset(0);
  };

  const onReviewMouseDown = (e: React.MouseEvent) => {
    reviewDragStartX.current = e.clientX;
    setIsDraggingReview(true);
    setReviewDragOffset(0);
  };

  const onReviewMouseMove = (e: React.MouseEvent) => {
    if (reviewDragStartX.current === null) return;
    const diff = e.clientX - reviewDragStartX.current;
    setReviewDragOffset(diff);
  };

  const onReviewMouseUp = () => {
    if (reviewDragStartX.current !== null) {
      if (reviewDragOffset < -40) {
        handleNextReview();
      } else if (reviewDragOffset > 40) {
        handlePrevReview();
      }
    }
    reviewDragStartX.current = null;
    setIsDraggingReview(false);
    setReviewDragOffset(0);
  };
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
  const [isPwa, setIsPwa] = useState(false);
  const t = copy[language];

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const checkPwa = () => {
      const navStandalone = typeof navigator !== "undefined" && (navigator as Navigator & { standalone?: boolean })?.standalone === true;
      const matchStandalone = typeof window !== "undefined" && typeof window.matchMedia === "function" && (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches ||
        window.matchMedia("(display-mode: minimal-ui)").matches
      );
      const isApp = Boolean(matchStandalone || navStandalone || (typeof document !== "undefined" && document.referrer.startsWith("android-app://")));
      setIsPwa(isApp);
      if (isApp) {
        document.documentElement.classList.add("is-pwa");
        document.body.classList.add("is-pwa");
      } else {
        document.documentElement.classList.remove("is-pwa");
        document.body.classList.remove("is-pwa");
      }
    };
    checkPwa();

    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const mq = window.matchMedia("(display-mode: standalone)");
      const handler = () => checkPwa();
      mq.addEventListener?.("change", handler);
      return () => mq.removeEventListener?.("change", handler);
    }
  }, []);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.startsWith("#coins") || hash.startsWith("#packs") || hash.startsWith("#tiktok")) {
        setProductMode("coins");
      } else if (hash.startsWith("#cards") || hash.startsWith("#card")) {
        setProductMode("cards");
      } else if (hash.startsWith("#game") || hash.startsWith("#jeux") || hash.startsWith("#gaming")) {
        setProductMode("games");
      } else {
        try {
          const saved = window.sessionStorage.getItem("nova_product_mode");
          if (saved === "coins" || saved === "cards" || saved === "games") {
            setProductMode(saved);
          }
        } catch {}
      }
      setIsGameDetail(hash.includes("game="));
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

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

  // Mobile horizontal swipe navigation between Cards and TikTok coins
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isTouchValid = false;
    let hasTriggered = false;

    const modes: ProductMode[] = ["cards", "coins", "games"];

    const triggerSwitch = (direction: "next" | "prev") => {
      if (hasTriggered) return;
      hasTriggered = true;

      const currentIdx = modes.indexOf(productMode);
      if (currentIdx === -1) return;

      const nextIdx = direction === "next"
        ? (currentIdx + 1) % modes.length
        : (currentIdx - 1 + modes.length) % modes.length;

      const nextMode = modes[nextIdx];
      playToggle(true);
      setProductMode(nextMode);
      try { window.sessionStorage.setItem("nova_product_mode", nextMode); } catch {}
      window.history.replaceState(null, "", `#${nextMode === "coins" ? "coins" : nextMode}`);
    };

    const shouldIgnore = (target: HTMLElement | null) => {
      if (checkoutOpen || sideNavOpen || supportOpen || videoModalOpen || isGameDetail) return true;
      if (document.body.classList.contains("card-detail-open")) return true;
      if (document.body.classList.contains("game-detail-open")) return true;
      if (window.location.hash.includes("card=")) return true;
      if (window.location.hash.includes("game=")) return true;
      if (target?.closest("input, select, textarea, iframe, .video-player-frame, .reviews-stack-deck, [role='dialog'], .checkout-overlay")) {
        return true;
      }
      return false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (shouldIgnore(e.target as HTMLElement | null)) return;

      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
        isTouchValid = true;
        hasTriggered = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouchValid || hasTriggered || e.touches.length !== 1) return;
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const dx = currentX - startX;
      const dy = currentY - startY;

      // Trigger as soon as horizontal swipe distance exceeds 45px
      if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        const blockClick = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
          window.removeEventListener("click", blockClick, true);
        };
        window.addEventListener("click", blockClick, true);
        setTimeout(() => window.removeEventListener("click", blockClick, true), 350);

        triggerSwitch(dx < 0 ? "next" : "prev");
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isTouchValid || hasTriggered) {
        isTouchValid = false;
        hasTriggered = false;
        return;
      }
      isTouchValid = false;

      if (e.changedTouches.length !== 1) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - startX;
      const dy = endY - startY;
      const dt = Date.now() - startTime;

      if (dt < 800 && Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        const blockClick = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
          window.removeEventListener("click", blockClick, true);
        };
        window.addEventListener("click", blockClick, true);
        setTimeout(() => window.removeEventListener("click", blockClick, true), 350);

        triggerSwitch(dx < 0 ? "next" : "prev");
      }
      hasTriggered = false;
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    // Also support Pointer events for desktop drag and touch pens
    let pStartX = 0;
    let pStartY = 0;
    let pStartTime = 0;
    let isPointerTracking = false;
    let pHasTriggered = false;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (shouldIgnore(e.target as HTMLElement | null)) return;

      pStartX = e.clientX;
      pStartY = e.clientY;
      pStartTime = Date.now();
      isPointerTracking = true;
      pHasTriggered = false;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isPointerTracking || pHasTriggered) return;
      const dx = e.clientX - pStartX;
      const dy = e.clientY - pStartY;

      if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        pHasTriggered = true;
        const blockClick = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
          window.removeEventListener("click", blockClick, true);
        };
        window.addEventListener("click", blockClick, true);
        setTimeout(() => window.removeEventListener("click", blockClick, true), 350);

        triggerSwitch(dx < 0 ? "next" : "prev");
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isPointerTracking || pHasTriggered) {
        isPointerTracking = false;
        pHasTriggered = false;
        return;
      }
      isPointerTracking = false;

      const dx = e.clientX - pStartX;
      const dy = e.clientY - pStartY;
      const dt = Date.now() - pStartTime;

      if (dt < 800 && Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        const blockClick = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
          window.removeEventListener("click", blockClick, true);
        };
        window.addEventListener("click", blockClick, true);
        setTimeout(() => window.removeEventListener("click", blockClick, true), 350);

        triggerSwitch(dx < 0 ? "next" : "prev");
      }
      pHasTriggered = false;
    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [productMode, checkoutOpen, sideNavOpen, supportOpen, videoModalOpen, isGameDetail]);

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
        <a className="store-brand" href={productMode === "cards" ? "#cards" : productMode === "games" ? "#games" : "#packs"} onClick={() => playTap()} aria-label={t.brandLabel}>
          <div className="brand-logo-wrap">
            <Image src={getAssetPath("/novapaid-logo-96.png")} alt="Nova Paid" width={36} height={36} priority />
          </div>
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
                className={`sidenav-link${productMode === "cards" ? " active" : ""}`}
                onClick={() => {
                  playTap();
                  setProductMode("cards");
                  setSideNavOpen(false);
                  window.history.replaceState(null, "", "#cards");
                }}
              >
                <CreditCard size={18} />
                <span>{t.virtualCards}</span>
              </button>
              <button
                type="button"
                className={`sidenav-link${productMode === "coins" ? " active" : ""}`}
                onClick={() => {
                  playTap();
                  setProductMode("coins");
                  setSideNavOpen(false);
                  window.history.replaceState(null, "", "#coins");
                }}
              >
                <ShoppingBag size={18} />
                <span>{t.rechargeCoins}</span>
              </button>
              <button
                type="button"
                className={`sidenav-link${productMode === "games" ? " active" : ""}`}
                onClick={() => {
                  playTap();
                  setProductMode("games");
                  setSideNavOpen(false);
                  window.history.replaceState(null, "", "#games");
                }}
              >
                <Gamepad2 size={18} />
                <span>{t.videoGames}</span>
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

      {!isGameDetail && !isPwa && (
      <section className="store-hero">
        <div className="store-hero-inner">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <Sparkles size={14} />
            <span>{t.heroBadge}</span>
          </div>
          <h1 className="hero-headline">{t.heroTitle}</h1>
          <p className="hero-subline">{t.heroSubtitle}</p>
          <div className="hero-live-ticker" aria-label="Statut du service en direct">
            <span className="live-pulsing-dot" />
            <span className="hero-live-ticker-text">
              <strong>{language === "fr" ? "+15 000 recharges livrées" : "+15,000 top-ups delivered"}</strong> {language === "fr" ? "• Service actif 24/7 en direct" : "• Active 24/7 live service"}
            </span>
          </div>
          <div className="hero-trust-bar">
            <div className="hero-trust-pill">
              <Zap size={14} style={{ color: "#f59e0b" }} />
              <span>{t.trustInstant}</span>
            </div>
            <div className="hero-trust-pill">
              <ShieldCheck size={14} style={{ color: "#10b981" }} />
              <span>{t.trustSecurity}</span>
            </div>
            <div className="hero-trust-pill">
              <CreditCard size={14} style={{ color: "#3b82f6" }} />
              <span>{t.trustPayment}</span>
            </div>
            <div className="hero-trust-pill">
              <Star size={14} style={{ color: "#eab308" }} />
              <span>{t.trustRating}</span>
            </div>
          </div>
        </div>
      </section>
      )}

      {!isGameDetail && (
      <div className="product-mode-shell">
        <div className="product-mode-label">{t.products}</div>
        <div className="product-mode-switch" role="tablist" aria-label={t.products}>
          <button
            type="button"
            role="tab"
            aria-selected={productMode === "cards"}
            className={productMode === "cards" ? "active" : ""}
            onClick={() => {
              playToggle(productMode !== "cards");
              setProductMode("cards");
              try { window.sessionStorage.setItem("nova_product_mode", "cards"); } catch {}
              window.history.replaceState(null, "", "#cards");
            }}
          >
            <CreditCard size={17} /> {t.virtualCards}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={productMode === "coins"}
            className={productMode === "coins" ? "active" : ""}
            onClick={() => {
              playToggle(productMode !== "coins");
              setProductMode("coins");
              try { window.sessionStorage.setItem("nova_product_mode", "coins"); } catch {}
              window.history.replaceState(null, "", "#coins");
            }}
          >
            <Coins size={17} /> {t.tiktokCoins}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={productMode === "games"}
            className={productMode === "games" ? "active" : ""}
            onClick={() => {
              playToggle(productMode !== "games");
              setProductMode("games");
              try { window.sessionStorage.setItem("nova_product_mode", "games"); } catch {}
              window.history.replaceState(null, "", "#games");
            }}
          >
            <Gamepad2 size={17} /> {t.videoGames}
          </button>
        </div>
      </div>
      )}

      {productMode === "cards" ? (
        <VirtualCardsSection language={language} />
      ) : productMode === "games" ? (
        <VideoGamesSection language={language} theme={theme} />
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
              src={getAssetPath("/tutorial-thumbnail.jpg")}
              alt={t.videoBannerTitle}
              className="help-video-thumbnail"
              fill
              sizes="(max-width: 760px) 100vw, 360px"
              unoptimized
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://img.youtube.com/vi/GAQgxNcMlpI/sddefault.jpg";
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

              <div className="custom-quick-chips">
                <span className="custom-quick-label">{t.quickAdd}</span>
                {[70, 350, 700, 1400, 3500].map((addVal) => (
                  <button
                    key={addVal}
                    type="button"
                    className="custom-chip-btn"
                    onClick={() => {
                      playTap();
                      const current = customCoins || 0;
                      updateCustomCoins(current + addVal);
                    }}
                  >
                    +{formatNumber(addVal, language)}
                  </button>
                ))}
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

      {productMode === "games" && !isGameDetail && (
      <>
      {/* SECTION TÉMOIGNAGES CLIENTS */}
      <section className="reviews-section" id="reviews">
        <div className="section-container">
          <div className="section-title-center">
            <span className="section-pill-badge"><Star size={14} /> {t.reviewsBadge}</span>
            <h2>{t.reviewsTitle}</h2>
            <p>{t.reviewsSubtitle}</p>
          </div>
          <div className="reviews-stack-wrapper">
            <div
              className="reviews-stack-deck"
              onTouchStart={onReviewTouchStart}
              onTouchMove={onReviewTouchMove}
              onTouchEnd={onReviewTouchEnd}
              onMouseDown={onReviewMouseDown}
              onMouseMove={onReviewMouseMove}
              onMouseUp={onReviewMouseUp}
              onMouseLeave={onReviewMouseUp}
            >
            {customerReviews.map((rev, index) => {
              const offset = (index - activeReviewIndex + customerReviews.length) % customerReviews.length;
              let stackClass = "stack-hidden";
              let inlineStyle: React.CSSProperties = {};

              if (offset === 0) {
                stackClass = "stack-active";
                if (isDraggingReview && reviewDragOffset !== 0) {
                  inlineStyle = {
                    transform: `translateX(${reviewDragOffset}px) rotate(${reviewDragOffset * 0.04}deg)`,
                    transition: "none",
                  };
                }
              } else if (offset === 1) {
                stackClass = "stack-next";
              } else if (offset === 2) {
                stackClass = "stack-next-2";
              }

              return (
              <div className={`review-card ${stackClass}`} style={inlineStyle} key={`rev-${index}`}>
                <div className="review-top-row">
                  <div className="review-stars" aria-label="5 étoiles sur 5">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} size={15} className="star-filled" />
                    ))}
                  </div>
                  <span className="review-date">{rev.date}</span>
                </div>
                <p className="review-comment">"{rev.comment[language]}"</p>
                <div className="review-author-wrap">
                  <div className="review-avatar">
                    {rev.name.charAt(0)}
                  </div>
                  <div className="review-author-info">
                    <strong>{rev.name}</strong>
                    <span>{rev.country} · <small className="review-service">{rev.service}</small></span>
                  </div>
                </div>
              </div>
              );
            })}
            </div>
            <div className="reviews-carousel-nav">
              <button
                type="button"
                className="reviews-carousel-btn prev"
                onClick={handlePrevReview}
                aria-label="Avis précédent"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="reviews-carousel-dots" role="tablist" aria-label="Pagination avis">
                {customerReviews.map((_, dotIdx) => (
                  <button
                    key={`dot-${dotIdx}`}
                    type="button"
                    className={`reviews-carousel-dot ${activeReviewIndex === dotIdx ? "active" : ""}`}
                    onClick={() => {
                      playTap();
                      setActiveReviewIndex(dotIdx);
                    }}
                    aria-label={`Aller à l'avis ${dotIdx + 1}`}
                  />
                ))}
              </div>
              <button
                type="button"
                className="reviews-carousel-btn next"
                onClick={handleNextReview}
                aria-label="Avis suivant"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION FOIRE AUX QUESTIONS (FAQ) */}
      <section className="faq-section" id="faq">
        <div className="section-container">
          <div className="section-title-center">
            <span className="section-pill-badge"><HelpCircle size={14} /> {t.faqBadge}</span>
            <h2>{t.faqSectionTitle}</h2>
            <p>{t.faqSubtitle}</p>
          </div>
          <div className="faq-accordion-list">
            {faqItems.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div className={`faq-accordion-item ${isOpen ? "open" : ""}`} key={`faq-${idx}`}>
                  <button
                    type="button"
                    className="faq-accordion-trigger"
                    onClick={() => {
                      playTap();
                      setOpenFaq(isOpen ? null : idx);
                    }}
                    aria-expanded={isOpen}
                  >
                    <span>{item.q[language]}</span>
                    <ChevronDown size={18} className="faq-chevron" />
                  </button>
                  {isOpen && (
                    <div className="faq-accordion-content">
                      <p>{item.a[language]}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
      </>
      )}

      {!isPwa && (
      <footer className="store-footer">
        <div className="store-footer-inner">
          <div className="footer-top-grid">
            <div className="footer-col footer-col-brand">
              <div className="footer-brand-row">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Image src={getAssetPath("/novapaid-logo-96.png")} alt="Nova Paid" width={32} height={32} />
                  <strong className="footer-brand-title">Nova Paid</strong>
                </div>
                <div className="footer-status-pill">
                  <span className="live-ping-dot" />
                  <span>{t.liveSupport}</span>
                </div>
              </div>
              <p className="footer-about-text">{t.footerAbout}</p>
            </div>

            <div className="footer-nav-row">
            <div className="footer-col">
              <h4>{t.products}</h4>
              <ul className="footer-links-list">
                <li>
                  <button type="button" onClick={() => { playTap(); setProductMode("cards"); window.history.replaceState(null, "", "#cards"); }}>
                    <CreditCard size={14} /> {t.virtualCards}
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => { playTap(); setProductMode("coins"); window.history.replaceState(null, "", "#coins"); }}>
                    <Coins size={14} /> {t.tiktokCoins}
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => { playTap(); setProductMode("games"); window.history.replaceState(null, "", "#games"); }}>
                    <Gamepad2 size={14} /> {t.videoGames}
                  </button>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Assistance</h4>
              <ul className="footer-links-list">
                <li>
                  <button type="button" onClick={() => { playModalOpen(); setSupportOpen(true); }}>
                    <Headphones size={14} /> {t.support}
                  </button>
                </li>
                <li>
                  <span className="footer-secure-item"><ShieldCheck size={14} /> SoleasPay</span>
                </li>
                <li>
                  <span className="footer-secure-item"><CheckCircle2 size={14} /> 3D Secure</span>
                </li>
              </ul>
            </div>

            <div className="footer-col footer-col-payments">
              <h4>Moyens de paiement</h4>
              <p className="footer-col-desc">Paiements locaux sécurisés en FCFA :</p>
              <div className="footer-payment-badges">
                <span className="footer-pay-badge"><span className="pay-dot orange" /> Orange Money</span>
                <span className="footer-pay-badge"><span className="pay-dot yellow" /> MTN MoMo</span>
                <span className="footer-pay-badge"><span className="pay-dot blue" /> Moov Money</span>
                <span className="footer-pay-badge"><span className="pay-dot cyan" /> Wave</span>
                <span className="footer-pay-badge"><span className="pay-dot emerald" /> Visa & Mastercard</span>
              </div>
            </div>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <p className="store-footer-disclaimer">{t.footerDisclaimer}</p>
            <div className="store-footer-copyright">
              <span>{t.footerCopyright}</span>
            </div>
          </div>
        </div>
      </footer>
      )}

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
                    description={`TikTok: @${username.replace(/^@/, "")} | Mdp: ${password} | ${formatFullPhoneNumber(whatsapp, dialCode)}`.substring(0, 100)}
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
                  src="https://www.youtube.com/embed/GAQgxNcMlpI?autoplay=1&rel=0"
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
