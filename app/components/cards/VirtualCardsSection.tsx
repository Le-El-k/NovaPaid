"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  CircleX,
  Clock3,
  CreditCard,
  Info,
  LockKeyhole,
  Mail,
  MessageCircle,
  Monitor,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { playError, playModalClose, playModalOpen, playStep, playTap } from "@/app/lib/sound";
import { getAssetPath } from "@/app/lib/asset-path";
import { SoleasPayCheckoutV3 } from "@/app/components/payments/SoleasPayCheckoutV3";

import {
  ALL_COUNTRIES,
  POPULAR_COUNTRIES,
  detectUserCountry,
  dialCodes,
  formatFullPhoneNumber,
} from "@/app/lib/countries";

type Language = "fr" | "en";
type CardBrand = "visa" | "mastercard";

type VirtualCard = {
  id: string;
  brand: CardBrand;
  name: { fr: string; en: string };
  description: { fr: string; en: string };
  price: number;
  recommended?: boolean;
  tone: "blue" | "teal" | "green" | "slate";
  features: Array<{ kind: "positive" | "negative"; fr: string; en: string }>;
};

const cards: VirtualCard[] = [
  {
    id: "visa-basic",
    brand: "visa",
    name: { fr: "VISA BASIQUE", en: "BASIC VISA" },
    description: {
      fr: "Parfait pour commencer - Carte virtuelle prépayée sans frais mensuels",
      en: "Perfect to get started — prepaid virtual card with no monthly fees",
    },
    price: 5000,
    tone: "blue",
    features: [
      { kind: "positive", fr: "Carte prépayée", en: "Prepaid card" },
      { kind: "positive", fr: "3D Secure", en: "3D Secure" },
      { kind: "positive", fr: "Sans vérification KYC", en: "No KYC verification" },
      { kind: "positive", fr: "Sans frais mensuels", en: "No monthly fees" },
      { kind: "positive", fr: "3 années de validité", en: "3-year validity" },
      { kind: "positive", fr: "Idéal pour les achats en ligne", en: "Ideal for online purchases" },
    ],
  },
  {
    id: "mastercard-basic",
    brand: "mastercard",
    name: { fr: "MASTERCARD BASIQUE", en: "BASIC MASTERCARD" },
    description: {
      fr: "Notre recommandation - Offre le meilleur rapport qualité/prix",
      en: "Our recommendation — the best value for money",
    },
    price: 6000,
    recommended: true,
    tone: "teal",
    features: [
      { kind: "positive", fr: "Carte prépayée", en: "Prepaid card" },
      { kind: "positive", fr: "3D Secure", en: "3D Secure" },
      { kind: "positive", fr: "Sans vérification KYC", en: "No KYC verification" },
      { kind: "positive", fr: "Sans frais mensuels", en: "No monthly fees" },
      { kind: "positive", fr: "3 années de validité", en: "3-year validity" },
      { kind: "positive", fr: "Acceptée partout", en: "Accepted everywhere" },
    ],
  },
  {
    id: "mastercard-premium",
    brand: "mastercard",
    name: { fr: "MASTERCARD PREMIUM", en: "PREMIUM MASTERCARD" },
    description: {
      fr: "Fonctionnalités avancées - Idéal pour des achats plus importants",
      en: "Advanced features — ideal for larger purchases",
    },
    price: 8500,
    tone: "green",
    features: [
      { kind: "positive", fr: "Carte de débit", en: "Debit card" },
      { kind: "positive", fr: "3D Secure", en: "3D Secure" },
      { kind: "positive", fr: "Achats sur Amazon", en: "Amazon purchases" },
      { kind: "positive", fr: "Achats sur Alibaba", en: "Alibaba purchases" },
      { kind: "positive", fr: "Retraits possibles (Cameroun uniquement)", en: "Withdrawals available (Cameroon only)" },
      { kind: "positive", fr: "Compatible PayPal", en: "PayPal compatible" },
      { kind: "negative", fr: "Ne prend pas en charge les retraits PayPal", en: "PayPal withdrawals are not supported" },
    ],
  },
  {
    id: "mastercard-platinum",
    brand: "mastercard",
    name: { fr: "MASTERCARD PLATINIUM", en: "PLATINUM MASTERCARD" },
    description: {
      fr: "Expérience premium - Sans limite avec des avantages exclusifs",
      en: "Premium experience — generous limits and exclusive benefits",
    },
    price: 15000,
    tone: "slate",
    features: [
      { kind: "positive", fr: "Carte de débit", en: "Debit card" },
      { kind: "positive", fr: "3D Secure", en: "3D Secure" },
      { kind: "positive", fr: "Aucun plafond sur les recharges", en: "No top-up limit" },
      { kind: "positive", fr: "Compatible Google Pay", en: "Google Pay compatible" },
      { kind: "positive", fr: "Compatible Apple Pay", en: "Apple Pay compatible" },
      { kind: "positive", fr: "🎁 Bonus de $5 offert", en: "🎁 $5 bonus included" },
    ],
  },
];

const labels = {
  fr: {
    title: "Cartes virtuelles Nova Paid",
    chooseTitle: "Choisissez votre carte",
    subtitle: "Choisissez la carte qui correspond à vos besoins et commencez à payer en ligne en toute sécurité.",
    noticeTitle: "Note importante",
    notice: "Les cartes ne sont pas acceptées sur les sites de cryptomonnaies, les plateformes de paris sportifs comme Bet9ja, Wise et les sites pour adultes.",
    features: "Caractéristiques",
    validity: "Validité : 3 ans",
    buy: "Acheter maintenant",
    recommended: "Populaire",
    secure: "Paiement sécurisé",
    instant: "Livraison instantanée",
    support: "Support 24/7",
    usageTitle: "Notes d’utilisation",
    usageIntro: "Veuillez lire attentivement avant de continuer.",
    cardInfo: "CARTES VIRTUELLES",
    usageDescription: "Nous émettons des cartes virtuelles Mastercard et Visa (USD) qui fonctionnent sur toutes les plateformes à l’exception des plateformes de paris sportifs, de crypto monnaie, Wise et des films pour adulte.",
    transactionLimit: "Limite par transaction",
    balanceLimit: "Limite du solde",
    failureFee: "Frais d’échec",
    threeYears: "3 ans",
    tenThousand: "10 000 $",
    oneHundredThousand: "100 000 $",
    thirtyCents: "0.3 $ par transaction",
    warningOne: "Les cartes sont résiliées après 3 à 5 refus successifs",
    warningTwo: "Les cartes sont résiliées si elles ne sont pas rechargées 3 semaines après leur achat",
    refuse: "Refuser",
    accept: "Accepter et continuer",
    coordinates: "Vos coordonnées",
    coordinatesIntro: "Renseignez votre e-mail et votre numéro WhatsApp.",
    email: "Adresse e-mail",
    whatsapp: "Numéro WhatsApp",
    emailPlaceholder: "vous@exemple.com",
    whatsappPlaceholder: "+237 6 00 00 00 00",
    previous: "Précédent",
    back: "Retour",
    continue: "Continuer",
    next: "Suivant",
    chooseProvider: "Choisir un provider",
    chooseProviderIntro: "Sélectionnez le service qui traitera votre paiement.",
    selectedCard: "Carte sélectionnée",
    providerLabel: "Choisir un prestataire",
    pay: "Payer",
    invalid: "Renseignez un e-mail et un numéro WhatsApp valides.",
    emailRequiredWarning: "Veuillez renseigner une adresse e-mail valide.",
    whatsappRequiredWarning: "Veuillez renseigner votre numéro WhatsApp (au moins 6 chiffres).",
    whatsappHint: "Pour vous contacter en cas de besoin",
    popularCountries: "Pays populaires",
    allCountries: "Tous les pays (A-Z)",
    paymentNotice: "Le paiement sécurisé est traité par SoleasPay.",
    contactSupport: "Contacter le support",
    close: "Fermer",
    choose: "Choisir",
    obtain: "Obtenir ma carte",
    creationFee: "Frais de création",
    included: "Tout ce qui est inclus",
    cardType: "CARTE VIRTUELLE",
    usd: "Visa - USD",
    helpCard: "Besoin d'aide pour votre carte virtuelle ?",
    watchTutorial: "Regardez ce tutoriel",
    secureWith: "Paiement sécurisé avec",
  },
  en: {
    title: "Nova Paid virtual cards",
    chooseTitle: "Choose your card",
    subtitle: "Choose the card that fits your needs and start paying online securely.",
    noticeTitle: "Important note",
    notice: "Cards are not accepted on cryptocurrency websites, sports betting platforms such as Bet9ja, Wise or adult websites.",
    features: "Features",
    validity: "Validity: 3 years",
    buy: "Buy now",
    recommended: "Popular",
    secure: "Secure payment",
    instant: "Instant delivery",
    support: "24/7 support",
    usageTitle: "Usage notes",
    usageIntro: "Please read carefully before continuing.",
    cardInfo: "VIRTUAL CARDS",
    usageDescription: "We issue Mastercard and Visa (USD) virtual cards that work on most platforms except sports betting, cryptocurrency, Wise and adult websites.",
    transactionLimit: "Transaction limit",
    balanceLimit: "Balance limit",
    failureFee: "Failure fee",
    threeYears: "3 years",
    tenThousand: "$10,000",
    oneHundredThousand: "$100,000",
    thirtyCents: "$0.3 per transaction",
    warningOne: "Cards are terminated after 3 to 5 consecutive declines",
    warningTwo: "Cards are terminated if they are not topped up for 3 weeks after purchase",
    refuse: "Decline",
    accept: "Accept and continue",
    coordinates: "Your details",
    coordinatesIntro: "Enter your email and WhatsApp number.",
    email: "Email address",
    whatsapp: "WhatsApp number",
    emailPlaceholder: "you@example.com",
    whatsappPlaceholder: "+237 6 00 00 00 00",
    previous: "Back",
    back: "Back",
    continue: "Continue",
    next: "Next",
    chooseProvider: "Choose a provider",
    chooseProviderIntro: "Select the service that will process your payment.",
    selectedCard: "Selected card",
    providerLabel: "Choose a provider",
    pay: "Pay",
    invalid: "Enter a valid email and WhatsApp number.",
    emailRequiredWarning: "Please enter a valid email address.",
    whatsappRequiredWarning: "Please enter your WhatsApp number (at least 6 digits).",
    whatsappHint: "So we can contact you about the order",
    popularCountries: "Popular countries",
    allCountries: "All countries (A-Z)",
    paymentNotice: "Secure payment is processed by SoleasPay.",
    contactSupport: "Contact support",
    close: "Close",
    choose: "Choose",
    obtain: "Get my card",
    creationFee: "Creation fee",
    included: "Everything included",
    cardType: "VIRTUAL CARD",
    usd: "Visa - USD",
    helpCard: "Need help with your virtual card?",
    watchTutorial: "Watch this tutorial",
    secureWith: "Secure payment with",
  },
} as const;

function formatPrice(value: number, language: Language): string {
  return `${new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-US").format(value)} FCFA`;
}

function BrandMark({ brand }: { brand: CardBrand }) {
  return brand === "visa" ? (
    <span className="virtual-card-brand visa-brand" aria-label="Visa">VISA</span>
  ) : (
    <span className="virtual-card-brand mastercard-brand" aria-label="Mastercard">
      <i /><i />
      <small>mastercard</small>
    </span>
  );
}

function VirtualCardArt({ card, detail = false }: { card: VirtualCard; detail?: boolean }) {
  return (
    <div className={`virtual-card-art tone-${card.tone}${detail ? " detail" : ""}`} aria-hidden="true">
      <span className="virtual-card-art-mark">N</span>
      <span className="virtual-card-art-chip" />
      <span className="virtual-card-art-wave" />
      <span className="virtual-card-art-label">VIRTUAL / USD</span>
      <BrandMark brand={card.brand} />
    </div>
  );
}

export function VirtualCardsSection({ language }: { language: Language }) {
  const t = labels[language];
  const [selectedCard, setSelectedCard] = useState<VirtualCard | null>(null);
  const [detailCard, setDetailCard] = useState<VirtualCard | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [step, setStep] = useState<"notes" | "details" | "provider">("notes");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [countryCode, setCountryCode] = useState("CM");
  const [dialCode, setDialCode] = useState("+237");
  const [provider, setProvider] = useState("soleaspay");
  const [paymentOrderId, setPaymentOrderId] = useState("");
  const [error, setError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [whatsappError, setWhatsappError] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const whatsappInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    void detectUserCountry()
      .then((detected) => {
        if (!isMounted || !detected) return;
        setCountryCode(detected.countryCode);
        setDialCode(detected.dialCode);
      })
      .catch(() => {
        // Geolocation is optional
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedCard && !detailCard) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [selectedCard, detailCard]);

  // Persist card detail view across page refreshes via URL hash & sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    let cardId: string | null = null;
    if (hash.includes("card=")) {
      cardId = hash.split("card=")[1]?.split("&")[0] || null;
    } else if (hash.startsWith("#card-")) {
      cardId = hash.replace("#card-", "");
    }
    if (!cardId) {
      try {
        cardId = window.sessionStorage.getItem("nova_detail_card");
      } catch {}
    }
    if (cardId) {
      const found = cards.find((c) => c.id === cardId);
      if (found && window.matchMedia("(max-width: 700px)").matches) {
        setDetailCard(found);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (detailCard) {
      window.history.replaceState(null, "", "#cards?card=" + detailCard.id);
      try {
        window.sessionStorage.setItem("nova_detail_card", detailCard.id);
      } catch {}
    } else {
      try {
        window.sessionStorage.removeItem("nova_detail_card");
      } catch {}
      if (window.location.hash.includes("card=")) {
        window.history.replaceState(null, "", "#cards");
      }
    }
  }, [detailCard]);

  // Handle browser back button: close card detail view when navigating back
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      if (!hash.includes("card=") && !hash.startsWith("#card-") && detailCard) {
        setDetailCard(null);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [detailCard]);

  const selectedName = useMemo(
    () => selectedCard ? selectedCard.name[language] : "",
    [selectedCard, language],
  );

  const openCard = (card: VirtualCard) => {
    playTap();
    // Mobile keeps the detailed card preview; desktop goes straight to checkout.
    if (window.matchMedia("(max-width: 700px)").matches) {
      setDetailCard(card);
      return;
    }
    openCheckout(card);
  };

  const openCheckout = (card: VirtualCard) => {
    playModalOpen();
    setDetailCard(null);
    setSelectedCard(card);
    setStep("notes");
    setPaymentOrderId("");
    setError(false);
  };

  const close = () => {
    playModalClose();
    setSelectedCard(null);
    setStep("notes");
    setPaymentOrderId("");
    setError(false);
  };

  const closeDetails = () => {
    playTap();
    setDetailCard(null);
  };

  const nextStep = () => {
    if (step === "notes") {
      playStep(true);
      setStep("details");
      return;
    }
    if (step === "details") {
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
      const validWhatsapp = whatsapp.replace(/\D/g, "").length >= 6;
      if (!validEmail || !validWhatsapp) {
        playError();
        setError(true);
        return;
      }
      playStep(true);
      setError(false);
      setPaymentOrderId(createCardOrderId());
      setStep("provider");
    }
  };

  const createCardOrderId = () => `NOVA-CARD-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

  return (
    <section className="virtual-cards-section" id="cards" aria-labelledby="virtual-cards-title">
      {detailCard ? (
        <div className="virtual-card-detail-view">
          <div className="virtual-card-detail-topbar">
            <button type="button" onClick={closeDetails} aria-label={t.previous}><ArrowLeft size={20} /></button>
            <strong>{language === "fr" ? "Votre future carte" : "Your future card"}</strong>
            <span className="virtual-card-detail-device" aria-hidden="true"><Monitor size={16} /></span>
            <span>{language === "fr" ? "FR" : "EN"}</span>
          </div>
          <div className="virtual-card-detail-scroll">
          <VirtualCardArt card={detailCard} detail />
          <div className="virtual-card-detail-copy">
            <span className="virtual-card-detail-kicker">{detailCard.brand === "visa" ? "VISA" : "MASTERCARD"} · {t.cardType}</span>
            <h1>{detailCard.name[language]}</h1>
            <p>{detailCard.description[language]}</p>
          </div>
          <div className="virtual-card-detail-facts">
            <div><span>{t.creationFee}</span><strong>{formatPrice(detailCard.price, language)}</strong></div>
            <div><span>{t.validity}</span><strong>{t.threeYears}</strong></div>
          </div>
          <h2 className="virtual-card-included-title">{t.included}</h2>
          <ul className="virtual-card-detail-features">
            {detailCard.features.map((feature) => (
              <li className={feature.kind === "negative" ? "negative" : ""} key={`detail-${feature.fr}`}>
                {feature.kind === "negative" ? <CircleX size={16} /> : <Check size={16} />}
                <span>{feature[language]}</span>
              </li>
            ))}
          </ul>
          <div className="virtual-card-detail-warning"><Info size={17} /><span>{t.notice} {language === "fr" ? "Les conditions complètes sont présentées à la prochaine étape." : "Full terms are shown at the next step."}</span></div>
          <div className="virtual-card-detail-provider"><LockKeyhole size={14} /> {t.secureWith} SoleasPay</div>
          </div>
          <div className="virtual-card-detail-sticky">
            <div><span>{t.creationFee}</span><strong>{formatPrice(detailCard.price, language)}</strong></div>
            <button type="button" onClick={() => openCheckout(detailCard)}>{t.obtain} <ArrowRight size={17} /></button>
          </div>
        </div>
      ) : (
      <>
      <div className="virtual-cards-heading">
        <div>
          <span className="section-kicker"><CreditCard size={16} /> {t.cardInfo}</span>
          <h1 id="virtual-cards-title">
            <span className="desktop-card-title">{t.title}</span>
            <span className="mobile-card-title">{t.chooseTitle}</span>
          </h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="virtual-cards-security"><ShieldCheck size={18} /> 3D Secure</div>
      </div>

      <div className="virtual-cards-notice">
        <CircleX size={19} aria-hidden="true" />
        <p><strong>{t.noticeTitle} :</strong> {t.notice}</p>
      </div>

      
      <div className="help-video-banner">
        <div className="help-video-banner-left">
          <div className="help-video-title-row">
            <span className="help-video-dot" aria-hidden="true" />
            <h2>{t.helpCard}</h2>
          </div>
          <p>{t.watchTutorial}</p>
        </div>

        <button
          type="button"
          className="help-video-trigger"
          onClick={() => {
            playModalOpen();
            setVideoModalOpen(true);
          }}
          aria-label={t.watchTutorial}
        >
          <Image
            src="https://img.youtube.com/vi/AZgaA8ufCzs/maxresdefault.jpg"
            alt={t.helpCard}
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
            <svg viewBox="0 0 24 24" fill="currentColor" className="help-video-play-icon" width="18" height="18">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      </div>

      <div className="virtual-cards-grid">
        {cards.map((card) => (
          <article className={`virtual-card-card tone-${card.tone}${card.recommended ? " is-recommended" : ""}`} key={card.id} onClick={() => openCard(card)} style={{ cursor: "pointer" }}>
            {card.recommended && <span className="virtual-card-badge"><BadgeCheck size={13} /> {t.recommended}</span>}
            <div className="virtual-card-hero">
              <VirtualCardArt card={card} />
              <div className="virtual-card-topline">
                <h2>{card.name[language]}</h2>
                <BrandMark brand={card.brand} />
              </div>
              <p>{card.description[language]}</p>
              <div className="virtual-card-price-row">
                <div className="virtual-card-mobile-price">
                  <small>{t.creationFee}</small>
                  <strong>{formatPrice(card.price, language)}</strong>
                </div>
                <span><Clock3 size={14} /> {t.validity}</span>
              </div>
            </div>
            <div className="virtual-card-body">
              <h3><ShieldCheck size={15} /> {t.features}</h3>
              <ul>
                {card.features.map((feature) => (
                  <li className={feature.kind === "negative" ? "negative" : ""} key={feature.fr}>
                    {feature.kind === "negative" ? <CircleX size={14} /> : <Check size={14} />}
                    <span>{feature[language]}</span>
                  </li>
                ))}
              </ul>
              <button type="button" className="virtual-card-buy" onClick={() => openCard(card)}>
                <Sparkles size={16} /> <span className="desktop-buy-label">{t.buy}</span><span className="mobile-buy-label">{t.choose}</span> <ArrowRight size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="virtual-cards-benefits" aria-label={t.cardInfo}>
        <span><CheckCircle2 size={18} /> {t.secure}</span>
        <span><Sparkles size={18} /> {t.instant}</span>
        <span><MessageCircle size={18} /> {t.support}</span>
      </div>
      </>
      )}

      {selectedCard && (
        <div
          className="checkout-overlay"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
        >
          <section className="checkout-panel" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
            <button type="button" className="close-checkout" onClick={close} aria-label={t.close}>
              <X />
            </button>

            <div className="checkout-progress" aria-label={step === "notes" ? "1 / 3" : step === "details" ? "2 / 3" : "3 / 3"}>
              <span className="active" />
              <span className={step === "details" || step === "provider" ? "active" : ""} />
              <span className={step === "provider" ? "active" : ""} />
            </div>

            {step === "notes" && (
              <div className="checkout-step step-instructions">
                <div className="instructions-header">
                  <span className="modal-kicker">{language === "fr" ? "ÉTAPE 1 SUR 3" : "STEP 1 OF 3"}</span>
                  <h2 id="checkout-title">{t.usageTitle}</h2>
                  <p className="instructions-intro">{t.usageIntro}</p>
                </div>

                <div className="instruction-cards">
                  <div className="instruction-card">
                    <div className="instruction-card-icon"><CreditCard size={20} /></div>
                    <div>
                      <strong>{t.cardInfo}</strong>
                      <p>{t.usageDescription}</p>
                    </div>
                  </div>

                  <div className="instruction-card warning">
                    <div className="instruction-card-icon"><Info size={20} /></div>
                    <div>
                      <strong>{t.noticeTitle}</strong>
                      <p>{t.notice}</p>
                    </div>
                  </div>
                </div>

                <div className="instructions-actions">
                  <button type="button" className="modal-secondary" onClick={close}>{t.refuse}</button>
                  <button
                    type="button"
                    className="modal-primary"
                    onClick={() => {
                      playStep(true);
                      setStep("details");
                    }}
                  >
                    {t.accept} <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {step === "details" && (
              <div className="checkout-step step-form">
                <button
                  type="button"
                  className="back-button"
                  onClick={() => {
                    playStep(false);
                    setStep("notes");
                  }}
                >
                  <ArrowLeft size={15} /> {t.back}
                </button>

                <div className="form-header">
                  <div>
                    <span className="modal-kicker">{language === "fr" ? "ÉTAPE 2 SUR 3" : "STEP 2 OF 3"}</span>
                    <h2 id="checkout-title">{t.coordinates}</h2>
                  </div>
                  <div className="form-header-pack">
                    <span>{selectedName}</span> · <strong>{formatPrice(selectedCard.price, language)}</strong>
                  </div>
                </div>

                <label className="field-label">
                  <span>
                    {t.email} <span className="required">*</span>
                  </span>
                  <div className={"field" + (emailError ? " field-error" : "")}>
                    <span><Mail size={16} /></span>
                    <input
                      ref={emailInputRef}
                      form="soleaspay-card-checkout"
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (emailError && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(event.target.value.trim())) {
                          setEmailError(false);
                        }
                      }}
                      onBlur={() => {
                        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                          setEmailError(true);
                        }
                      }}
                      placeholder={t.emailPlaceholder}
                      autoComplete="email"
                    />
                  </div>
                  {emailError && (
                    <div className="field-error-notice" role="alert">
                      <AlertCircle size={13} />
                      <span>{t.emailRequiredWarning}</span>
                    </div>
                  )}
                </label>

                <label className="field-label">
                  <span>
                    {t.whatsapp} <span className="required">*</span>{" "}
                    <span className="field-hint">— {t.whatsappHint}</span>
                  </span>
                  <div className={"field country-phone-field" + (whatsappError ? " field-error" : "")}>
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
                      aria-label={language === "fr" ? "Pays" : "Country"}
                    >
                      <optgroup label={t.popularCountries}>
                        {POPULAR_COUNTRIES.map((country) => (
                          <option key={"card-pop-" + country.code} value={country.code}>
                            {country.flag} {country.dialCode} ({country.name})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label={t.allCountries}>
                        {ALL_COUNTRIES.map((country) => (
                          <option key={"card-all-" + country.code} value={country.code}>
                            {country.flag} {country.dialCode} ({country.name})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <input
                      ref={whatsappInputRef}
                      form="soleaspay-card-checkout"
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
                      placeholder="6 00 00 00 00"
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
                  onClick={nextStep}
                >
                  {t.continue} <ArrowRight size={18} />
                </button>
              </div>
            )}

            {step === "provider" && (
              <div className="checkout-step">
                <button
                  type="button"
                  className="back-button"
                  onClick={() => {
                    playStep(false);
                    setStep("details");
                  }}
                >
                  <ArrowLeft size={15} /> {t.back}
                </button>
                <span className="modal-kicker">{language === "fr" ? "ÉTAPE 3 SUR 3" : "STEP 3 OF 3"}</span>
                <h2 id="checkout-title">{t.chooseProvider}</h2>

                <div className="checkout-summary">
                  <div><span>{t.selectedCard}</span><strong>{selectedName}</strong></div>
                  <div><span>{t.creationFee}</span><strong>{formatPrice(selectedCard.price, language)}</strong></div>
                  <div><span>{t.validity}</span><strong>{t.threeYears}</strong></div>
                </div>

                <div className="payment-provider-selector">
                  <span className="payment-provider-selector-label">{t.providerLabel}</span>
                  <div
                    className="payment-provider-options"
                    role="radiogroup"
                    aria-label={t.providerLabel}
                  >
                    <button
                      type="button"
                      className={"payment-provider-option" + (provider === "soleaspay" ? " selected" : "")}
                      role="radio"
                      aria-checked={provider === "soleaspay"}
                      onClick={() => {
                        playTap();
                        setProvider("soleaspay");
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

                <p className="virtual-card-api-notice" style={{ marginTop: "14px" }}>
                  <ShieldCheck size={15} /> {t.paymentNotice}
                </p>

                {selectedCard && (
                  <SoleasPayCheckoutV3
                    formId="soleaspay-card-checkout"
                    language={language}
                    amount={selectedCard.price}
                    orderId={paymentOrderId}
                    description={"Carte " + selectedName + " | Email: " + email + " | " + formatFullPhoneNumber(whatsapp, dialCode).substring(0, 100)}
                    username={selectedName}
                    whatsapp={whatsapp}
                    dialCode={dialCode}
                    country={(() => { const c = ALL_COUNTRIES.find((c) => c.code === countryCode); return c ? (c.flag + " " + c.name + " (" + c.dialCode + ")") : countryCode; })()}
                    email={email}
                    coins={1}
                    requireEmail
                    productType="card"
                    productLabel={selectedName}
                    isEmailValid={/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
                    onRequireEmail={() => setEmailError(true)}
                  />
                )}
              </div>
            )}
          </section>
        </div>
      )}</section>
  );
}
