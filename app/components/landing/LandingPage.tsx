"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PwaInstallButton } from "@/app/components/pwa/PwaInstallButton";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  Eye,
  Flame,
  Gamepad2,
  Globe,
  Headphones,
  Lock,
  MessageCircle,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { getAssetPath } from "@/app/lib/asset-path";
import { buildSupportWhatsAppHref, SUPPORT_WHATSAPP_CONTACTS } from "@/app/lib/support-whatsapp";
import { AuthModal } from "../auth/AuthModal";

interface LandingPageProps {
  onOpenDashboard?: () => void;
}

interface ReviewItem {
  id: number;
  authorName: string;
  authorLocation: string;
  rating: number;
  serviceTag: string;
  reviewText: string;
  isVerified?: boolean;
  status?: string;
  createdAt?: string;
}

const RECENT_LIVE_PULSE = [
  { time: "Il y a 2 min", text: "Carte Mastercard USD émise pour un achat publicitaire", city: "Douala" },
  { time: "Il y a 5 min", text: "1 400 Pièces TikTok créditées via Wave", city: "Abidjan" },
  { time: "Il y a 8 min", text: "Abonnement ChatGPT Plus activé avec succès", city: "Yaoundé" },
  { time: "Il y a 12 min", text: "1 080 Diamants Free Fire livrés sur Player ID", city: "Dakar" },
  { time: "Il y a 17 min", text: "Transfert P2P de 85 000 FCFA effectué à 0 FCFA de frais", city: "Libreville" },
  { time: "Il y a 24 min", text: "Recharge Orange Money de 50 000 FCFA validée", city: "Bafoussam" },
];

export function LandingPage({ onOpenDashboard }: LandingPageProps) {
  // Navigation & FAQ
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authentification Modal
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // Simulateur en direct
  const [calculatorService, setCalculatorService] = useState<"card" | "tiktok" | "gaming">("card");
  const [calculatorAmountXaf, setCalculatorAmountXaf] = useState<number>(25000);
  const exchangeRateUsd = 610.0;
  const calculatedUsd = (calculatorAmountXaf / exchangeRateUsd).toFixed(2);
  const calculatedTiktokCoins = Math.round(calculatorAmountXaf / 11.24);

  // Avis clients réels
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>([]);
  const [reviewsStats, setReviewsStats] = useState({
    total: 0,
    average: "0.0",
    verifiedCount: 0,
  });
  const [selectedTag, setSelectedTag] = useState<string>("Tous");
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkMobile = () => setIsMobileScreen(window.innerWidth <= 768);
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }
  }, []);

  const defaultReviewsCount = isMobileScreen ? 2 : 3;
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  // Formulaire de nouvel avis
  const [newReviewForm, setNewReviewForm] = useState({
    authorName: "",
    authorLocation: "Douala, Cameroun",
    rating: 5,
    serviceTag: "Carte Mastercard USD",
    reviewText: "",
  });

  const contact = SUPPORT_WHATSAPP_CONTACTS[0];
  const whatsappHref = buildSupportWhatsAppHref(
    contact.whatsappNumber,
    "Bonjour NovaPaid, je souhaite des informations sur vos cartes et services."
  );

  // Charger les avis réels depuis l'API
  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/reviews");
      const data = await res.json();
      if (data?.success && Array.isArray(data.reviews)) {
        setReviewsList(data.reviews);
        if (data.stats) {
          setReviewsStats({
            total: Number(data.stats.total) || 0,
            average: data.stats.average || "0.0",
            verifiedCount: Number(data.stats.verifiedCount) || 0,
          });
        }
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Soumission d'un nouvel avis
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewForm.authorName || !newReviewForm.reviewText) return;

    setSubmittingReview(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReviewForm),
      });
      const data = await res.json();
      if (data?.success) {
        setReviewSuccessMsg("Merci ! Votre avis a été enregistré et publié avec succès.");
        const newRev: ReviewItem = {
          id: data.id || Date.now(),
          authorName: newReviewForm.authorName,
          authorLocation: newReviewForm.authorLocation,
          rating: newReviewForm.rating,
          serviceTag: newReviewForm.serviceTag,
          reviewText: newReviewForm.reviewText,
          isVerified: true,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        setReviewsList([newRev, ...reviewsList]);
        setNewReviewForm({
          authorName: "",
          authorLocation: "Douala, Cameroun",
          rating: 5,
          serviceTag: "Carte Mastercard USD",
          reviewText: "",
        });
        setTimeout(() => {
          setReviewSuccessMsg(null);
          setReviewModalOpen(false);
        }, 2000);
      }
    } catch {
      setReviewSuccessMsg("Erreur lors de l'enregistrement. Merci de réessayer.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Filtrage des avis
  const availableTags = [
    "Tous",
    "Carte Mastercard USD",
    "Pièces TikTok",
    "Abonnements & Logiciels",
    "Transferts P2P",
    "Gaming Free Fire",
    "E-Commerce & Amazon",
  ];

  const filteredReviews = reviewsList.filter((rev) => {
    if (selectedTag === "Tous") return true;
    return rev.serviceTag.toLowerCase().includes(selectedTag.toLowerCase()) ||
      selectedTag.toLowerCase().includes(rev.serviceTag.toLowerCase());
  });

  const FAQS = [
    {
      q: "Mes cartes Visa ou Mastercard NovaPaid sont-elles acceptées sur Facebook Ads et ChatGPT ?",
      a: "Oui, à 100%. Nos cartes virtuelles en USD sont émises avec le protocole bancaire international 3D Secure actif. Elles passent sans aucun blocage sur Meta Ads (Facebook/Instagram), Google Ads, ChatGPT Plus, Claude Pro, Netflix, Spotify, Canva, Amazon et Alibaba.",
    },
    {
      q: "Comment s'effectue le rechargement de ma carte ou de mon compte ?",
      a: "Vous réglez directement par Mobile Money depuis votre téléphone : Orange Money, MTN MoMo ou Wave. Le débit est instantané et votre solde en USD ou FCFA est crédité en moins de 30 secondes.",
    },
    {
      q: "Comment transférer des fonds vers une autre carte ou un autre utilisateur ?",
      a: "Depuis votre compte NovaPaid, vous pouvez transférer instantanément vos fonds vers une autre carte ou vers d'autres utilisateurs via leur identifiant ou numéro, sans aucun frais de commission (0 FCFA).",
    },
    {
      q: "Comment sont livrées les recharges gaming et les pièces TikTok ?",
      a: "Pour Free Fire, PUBG ou Blood Strike, la livraison s'effectue directement sur votre Player ID officiel en 1 à 5 minutes. Pour TikTok, les pièces officielles sont créditées directement sur votre identifiant de compte.",
    },
    {
      q: "Comment joindre l'assistance si j'ai un doute lors de ma commande ?",
      a: "Notre service client humain est disponible 24h/24 et 7j/7 directement sur WhatsApp. Vous échangez avec un conseiller qui valide vos transactions en temps réel.",
    },
  ];

  return (
    <div className="np-landing-wrapper">
      {/* =========================================================
          1. HEADER PUBLIC STRICTEMENT SÉCURISÉ (AUCUN LIEN ADMIN PUBLIC)
          ========================================================= */}
      <header className="np-landing-navbar">
        <div className="np-landing-container np-landing-nav-inner">
          <Link href="/" className="np-landing-brand" aria-label="NovaPaid - Accueil">
            <div className="np-landing-logo-box">
              <Image
                src={getAssetPath("/novapaid-logo-96.png")}
                alt="NovaPaid Logo Officiel"
                width={42}
                height={42}
                priority
                className="np-landing-real-logo"
              />
            </div>
            <div className="np-landing-brand-text">
              <strong>Nova<span>Paid</span></strong>
            </div>
          </Link>

          {/* Navigation centrale fluide et sobre */}
          <nav className="np-landing-nav-links" aria-label="Navigation principale">
            <a href="#reviews">Avis Clients</a>
            <a href="#solutions">Nos Solutions</a>
            <a href="#faq">Questions Fréquentes</a>
            <a href="https://wa.me/237657887403" target="_blank" rel="noopener noreferrer">Assistance 24/7</a>
          </nav>

          {/* Actions utilisateur publiques */}
          <div className="np-landing-nav-actions">
            <Link href="/login" className="np-landing-login-btn">
              <Lock size={14} />
              <span>Connexion</span>
            </Link>

            <Link href="/register" className="np-landing-cta-primary">
              <User size={15} />
              <span>Créer un compte</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Bouton MENU Mobile Épuré (Conforme Image 8) */}
          <button
            type="button"
            className={`np-mobile-menu-btn ${mobileMenuOpen ? "open" : ""}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu de navigation"
            aria-expanded={mobileMenuOpen}
          >
            <span>MENU</span>
            <span className="np-menu-bars">
              <span className="bar" />
              <span className="bar" />
            </span>
          </button>
        </div>

        {/* Menu Déroulant Mobile Élégant (Conforme Image 9) */}
        {mobileMenuOpen && (
          <div className="np-mobile-drawer open">
            <nav className="np-mobile-drawer-links" aria-label="Navigation mobile">
              <a href="#reviews" onClick={() => setMobileMenuOpen(false)}>
                <Star size={16} className="text-amber-500 fill-amber-500" />
                <span>Avis Clients</span>
              </a>
              <a href="#solutions" onClick={() => setMobileMenuOpen(false)}>
                <CreditCard size={16} className="text-blue-600" />
                <span>Nos Solutions</span>
              </a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)}>
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>Questions Fréquentes</span>
              </a>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
              >
                <MessageCircle size={16} className="text-emerald-700" />
                <span>Assistance 24/7</span>
              </a>
            </nav>

            <div className="np-mobile-drawer-actions">
              <Link
                href="/login"
                className="np-mobile-login-btn"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Lock size={15} />
                <span>Connexion</span>
              </Link>
            </div>
          </div>
        )}

        {mobileMenuOpen && (
          <div
            className="np-mobile-scrim"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </header>

      {/* =========================================================
          2. HERO SECTION : CENTRÉE SUR LA PREUVE & LA VALEUR RÉELLE
          ========================================================= */}
      <section className="np-landing-hero">
        <div className="np-landing-container np-landing-hero-grid">
          <div className="np-landing-hero-content">
            {/* Badge de réputation vérifiée */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Plébiscité par +15 000 entrepreneurs et créateurs en Afrique</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15] mb-5">
              Les paiements mondiaux sans blocage, validés par{" "}
              <span className="text-blue-600">ceux qui entreprennent</span>.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mb-8">
              Générez des cartes virtuelles Visa &amp; Mastercard en USD pour vos achats et publicités, rechargez vos forfaits digitaux et transférez des fonds instantanément de votre compte vers une autre carte ou vers d'autres utilisateurs. Le tout crédité en direct par <strong>Orange Money</strong>, <strong>MTN MoMo</strong> et <strong>Wave</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-8">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-blue-600/20 text-sm transition-all"
              >
                <User size={17} />
                <span>Créer un compte</span>
                <ArrowRight size={15} />
              </Link>

              <a
                href="#reviews"
                className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-5 py-3.5 rounded-xl text-sm transition-all border border-slate-200"
              >
                <Star size={16} className="fill-amber-400 text-amber-400" />
                <span>Lire les retours clients vérifiés</span>
              </a>

              <PwaInstallButton className="np-pwa-install-btn--hero" />
            </div>
          </div>

          {/* Démonstrateur visuel : L'application NovaPaid vivante */}
          <div className="np-landing-hero-visual">
            <div className="np-hero-card-glow" />
            <div className="np-hero-card-3d">
              <div className="np-hero-card-face">
                {/* Ligne supérieure : Puce dorée + ondes sans contact à gauche, Réseau à droite */}
                <div className="np-hero-card-top">
                  <div className="np-hero-card-chip-group">
                    <div className="np-card-gold-chip" />
                    <div className="np-card-contactless-waves">
                      <span /><span /><span />
                    </div>
                  </div>
                  <span className="np-hero-card-network">MASTERCARD</span>
                </div>

                {/* Numéro masqué */}
                <div className="np-hero-card-number">
                  <span>5412</span>
                  <span>••••</span>
                  <span>••••</span>
                  <span>8800</span>
                </div>

                {/* Détails : Titulaire, Expiration, CVV, Solde USD */}
                <div className="np-hero-card-details">
                  <div>
                    <small>TITULAIRE</small>
                    <strong>MEMBRE NOVAPAID</strong>
                  </div>
                  <div>
                    <small>EXPIRATION</small>
                    <strong>12/30</strong>
                  </div>
                  <div>
                    <small>CVV</small>
                    <strong style={{ letterSpacing: "1px" }}>842</strong>
                  </div>
                  <div>
                    <small>SOLDE USD</small>
                    <strong style={{ color: "#34d399" }}>$150.00</strong>
                  </div>
                </div>
              </div>

              <div className="np-hero-operators-dock">
                <span className="np-op-pill-badge"><span className="np-operator-dot orange" /> Orange Money</span>
                <span className="np-op-pill-badge"><span className="np-operator-dot yellow" /> MTN MoMo</span>
                <span className="np-op-pill-badge"><span className="np-operator-dot cyan" /> Wave Money</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          3. BANDEAU DE FLUX EN DIRECT (LIVE PULSE)
          ========================================================= */}
      <section className="bg-slate-900 text-white py-3 border-y border-slate-800 overflow-hidden">
        <div className="np-landing-container flex items-center gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>EN DIRECT :</span>
          </div>

          <div className="flex items-center gap-6 overflow-x-auto py-1 no-scrollbar text-slate-300">
            {RECENT_LIVE_PULSE.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-slate-500 font-mono text-[11px]">{item.time}</span>
                <span className="text-white">{item.text}</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-medium">{item.city}</span>
                {idx < RECENT_LIVE_PULSE.length - 1 && <span className="text-slate-700">·</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          4. LE CŒUR DU SITE : SECTION AVIS CLIENTS & PREUVE SOCIALE
          ========================================================= */}
      <section className="np-landing-section alt-bg" id="reviews">
        <div className="np-landing-container">
          {/* En-tête compact unifié avec note certifiée et bouton d'avis */}
          <div className="np-reviews-header-compact">
            <div className="np-reviews-header-titles">
              <span className="np-section-kicker">AVIS PUBLIÉS</span>
              <h2>Ce que disent nos utilisateurs</h2>
              <div className="np-reviews-proof-strip">
                <div className="np-reputation-compact-pill">
                  <span className="np-pill-group-score">
                    <span className="gold-stars">★★★★★</span>
                    <strong className="np-score-num">{reviewsStats.average} / 5</strong>
                  </span>
                  <span className="np-pill-sep">·</span>
                  <span className="np-pill-count">{reviewsStats.total} avis publiés</span>
                  <span className="np-pill-sep">·</span>
                  <span className="np-pill-badge">{reviewsStats.verifiedCount} vérifiés</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setReviewModalOpen(true)}
              className="np-landing-cta-primary"
            >
              <MessageSquare size={15} />
              <span>+ Laisser mon avis</span>
            </button>
          </div>

          {/* Filtres par thématique */}
          <div className="np-reviews-filter-bar">
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`np-filter-btn ${selectedTag === tag ? "active" : ""}`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Grille d'avis vivante (2 avis sur mobile, 3 sur desktop par défaut) */}
          <div className="np-reviews-grid-3">
            {(showAllReviews || (selectedTag !== "Tous" && !isMobileScreen) ? filteredReviews : filteredReviews.slice(0, defaultReviewsCount)).map((rev) => (
              <article key={rev.id} className="np-review-card-item">
                <div>
                  <div className="np-review-card-top">
                    <div className="flex items-center gap-1 text-amber-400">
                      {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                        <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="np-verified-badge">
                      <Check size={12} /> Achat Vérifié
                    </span>
                  </div>

                  <p className="np-review-text">
                    « {rev.reviewText} »
                  </p>
                </div>

                <div className="np-review-footer">
                  <div className="np-review-author-wrap">
                    <div className="np-review-avatar-circle">
                      {rev.authorName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="np-review-author-info">
                      <strong>{rev.authorName}</strong>
                      <small>{rev.authorLocation}</small>
                    </div>
                  </div>

                  <span className="np-tag-chip">
                    {rev.serviceTag}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {/* Bouton pour voir plus d'avis sans alourdir la page */}
          {filteredReviews.length > defaultReviewsCount && (
            <div className="np-see-more-reviews-wrap">
              <button
                type="button"
                onClick={() => setShowAllReviews(!showAllReviews)}
                className="np-see-more-reviews-btn"
              >
                <span>{showAllReviews ? "Réduire les avis" : `Afficher plus de témoignages (+${filteredReviews.length - defaultReviewsCount})`}</span>
                <ChevronDown size={14} className={showAllReviews ? "rotate-180" : ""} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================
          5. VALEUR CONCRÈTE — FORMAT BENTO SHOWCASE PERCUTANT
          ========================================================= */}
      <section className="np-landing-section" id="solutions">
        <div className="np-landing-container">
          <div className="np-section-header center mb-8">
            <span className="np-section-kicker">VALEUR CONCRÈTE</span>
            <h2>4 solutions concrètes pour vos paiements</h2>
            <p>Zéro démarche bancaire lourde. Vos opérations validées en moins de 2 minutes.</p>
          </div>

          <div className="np-bento-grid">
            {/* Bento 1 */}
            <div className="np-bento-card">
              <div>
                <div className="np-bento-top">
                  <div className="np-bento-icon-box blue">
                    <CreditCard size={22} />
                  </div>
                  <span className="np-bento-stat emerald">0 rejet</span>
                </div>
                <h3 className="np-bento-title">Publicités Meta &amp; Google</h3>
                <p className="np-bento-text">Cartes Visa &amp; Mastercard USD prépayées avec 3D Secure pour vos campagnes sans blocage.</p>
              </div>
              <span className="np-bento-pill">✓ Recharge Orange &amp; MTN 30s</span>
            </div>

            {/* Bento 2 */}
            <div className="np-bento-card">
              <div>
                <div className="np-bento-top">
                  <div className="np-bento-icon-box purple">
                    <Sparkles size={22} />
                  </div>
                  <span className="np-bento-stat">0 F/mois</span>
                </div>
                <h3 className="np-bento-title">Abonnements Mondiaux &amp; IA</h3>
                <p className="np-bento-text">ChatGPT Plus, Netflix, Spotify et Canva Pro activés instantanément sans compte étranger.</p>
              </div>
              <span className="np-bento-pill">✓ CVV sécurisé immédiat</span>
            </div>

            {/* Bento 3 */}
            <div className="np-bento-card">
              <div>
                <div className="np-bento-top">
                  <div className="np-bento-icon-box amber">
                    <Coins size={22} />
                  </div>
                  <span className="np-bento-stat emerald">-35% coût</span>
                </div>
                <h3 className="np-bento-title">Pièces TikTok &amp; Gaming</h3>
                <p className="np-bento-text">Forfaits TikTok officiels et recharges Free Fire / PUBG réglés directement par Mobile Money.</p>
              </div>
              <span className="np-bento-pill">✓ Livraison directe sur ID</span>
            </div>

            {/* Bento 4 */}
            <div className="np-bento-card">
              <div>
                <div className="np-bento-top">
                  <div className="np-bento-icon-box emerald">
                    <ArrowLeftRight size={22} />
                  </div>
                  <span className="np-bento-stat emerald">0 FCFA</span>
                </div>
                <h3 className="np-bento-title">Transferts vers Cartes &amp; Utilisateurs</h3>
                <p className="np-bento-text">Transférez des fonds en un instant de votre compte vers une autre carte ou vers d'autres utilisateurs.</p>
              </div>
              <span className="np-bento-pill">✓ Transferts instantanés en direct</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          7. SECTION FAQ & SUPPORT WHATSAPP CONCIERGE
          ========================================================= */}
      <section className="np-landing-section" id="faq">
        <div className="np-landing-container max-w-4xl">
          <div className="np-section-header center mb-10">
            <span className="np-section-kicker">AIDE & ASSISTANCE</span>
            <h2>Questions fréquemment posées</h2>
            <p>Tout ce que vous devez savoir pour démarrer avec NovaPaid en toute sérénité.</p>
          </div>

          <div className="np-faq-accordion-landing mb-10">
            {FAQS.map((item, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className={`np-faq-row-item ${isOpen ? "open" : ""}`}>
                  <button
                    type="button"
                    className="np-faq-row-header"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                  >
                    <strong>{item.q}</strong>
                    <ChevronDown size={18} className={`np-faq-caret ${isOpen ? "rotate" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="np-faq-row-body">
                      <p>{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bandeau d'assistance WhatsApp directe */}
          <div className="np-landing-whatsapp-cta">
            <div className="flex items-center gap-4">
              <div className="np-wa-icon-large">
                <MessageCircle size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Besoin d'une assistance en direct ?</h3>
                <p className="text-xs text-slate-300">Notre équipe est à votre écoute 24h/24 et 7j/7 directement sur WhatsApp.</p>
              </div>
            </div>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="np-wa-btn"
            >
              <span>Échanger sur WhatsApp</span>
              <ChevronRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* =========================================================
          9. MODAL : LAISSER UN AVIS VÉRIFIÉ EN DIRECT
          ========================================================= */}
      {reviewModalOpen && (
        <div className="np-modal-backdrop open">
          <div className="np-modal-dialog">
            <button
              type="button"
              onClick={() => setReviewModalOpen(false)}
              className="np-modal-close-btn"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Star size={20} className="fill-amber-400 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight m-0">Partager votre avis d'expérience</h3>
                <p className="text-xs text-slate-500 m-0">Votre témoignage aide la communauté à choisir les meilleurs services.</p>
              </div>
            </div>

            {reviewSuccessMsg ? (
              <div className="py-8 text-center">
                <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-900">{reviewSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview}>
                <div className="np-form-row-2">
                  <div className="np-form-group">
                    <label className="np-form-label" htmlFor="client-author-name">
                      Votre prénom / nom
                    </label>
                    <input
                      id="client-author-name"
                      type="text"
                      required
                      placeholder="Ex: Patrice K."
                      value={newReviewForm.authorName}
                      onChange={(e) => setNewReviewForm({ ...newReviewForm, authorName: e.target.value })}
                      className="np-form-input"
                    />
                  </div>
                  <div className="np-form-group">
                    <label className="np-form-label" htmlFor="client-author-loc">
                      Votre ville &amp; pays
                    </label>
                    <input
                      id="client-author-loc"
                      type="text"
                      required
                      placeholder="Ex: Abidjan, Côte d'Ivoire"
                      value={newReviewForm.authorLocation}
                      onChange={(e) => setNewReviewForm({ ...newReviewForm, authorLocation: e.target.value })}
                      className="np-form-input"
                    />
                  </div>
                </div>

                <div className="np-form-row-2">
                  <div className="np-form-group">
                    <label className="np-form-label" htmlFor="client-rating-sel">
                      Note globale
                    </label>
                    <select
                      id="client-rating-sel"
                      value={newReviewForm.rating}
                      onChange={(e) => setNewReviewForm({ ...newReviewForm, rating: Number(e.target.value) })}
                      className="np-form-select"
                    >
                      <option value={5}>★★★★★ (5/5 Exceptionnel)</option>
                      <option value={4}>★★★★☆ (4/5 Très satisfait)</option>
                      <option value={3}>★★★☆☆ (3/5 Satisfaisant)</option>
                    </select>
                  </div>
                  <div className="np-form-group">
                    <label className="np-form-label" htmlFor="client-service-sel">
                      Service utilisé
                    </label>
                    <select
                      id="client-service-sel"
                      value={newReviewForm.serviceTag}
                      onChange={(e) => setNewReviewForm({ ...newReviewForm, serviceTag: e.target.value })}
                      className="np-form-select"
                    >
                      <option value="Carte Mastercard USD">Carte Mastercard USD</option>
                      <option value="Carte Visa USD">Carte Visa USD</option>
                      <option value="Pièces TikTok">Pièces TikTok</option>
                      <option value="Gaming Free Fire">Gaming Free Fire</option>
                      <option value="Transferts P2P">Transferts P2P</option>
                      <option value="Abonnements & Logiciels">Abonnements & Logiciels</option>
                    </select>
                  </div>
                </div>

                <div className="np-form-group">
                  <label className="np-form-label" htmlFor="client-review-text">
                    Votre retour d'expérience
                  </label>
                  <textarea
                    id="client-review-text"
                    rows={3}
                    required
                    placeholder="Expliquez comment NovaPaid vous a permis de régler vos paiements en ligne..."
                    value={newReviewForm.reviewText}
                    onChange={(e) => setNewReviewForm({ ...newReviewForm, reviewText: e.target.value })}
                    className="np-form-textarea"
                  />
                </div>

                <div className="np-form-actions">
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(false)}
                    className="np-form-btn-secondary"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="np-form-btn-primary flex items-center gap-1.5"
                  >
                    <Send size={13} />
                    <span>{submittingReview ? "Envoi..." : "Publier mon avis"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal d'Authentification client */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          if (onOpenDashboard) onOpenDashboard();
        }}
      />
    </div>
  );
}

export default LandingPage;
