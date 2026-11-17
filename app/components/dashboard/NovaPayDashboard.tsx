"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getAssetPath } from "@/app/lib/asset-path";
import { Shopfront } from "../boutique/Shopfront";
import { MyInternetCodes } from "./MyInternetCodes";
import { VirtualCardsSection } from "../cards/VirtualCardsSection";
import { ResellerSection } from "../reseller/ResellerSection";
import { TransferExperience } from "../transfers/TransferExperience";
import { FundingSection } from "../funding/FundingSection";
import { WalletSection } from "../wallet/WalletSection";
import { HistorySection } from "../history/HistorySection";
import { SupportSection } from "../support/SupportSection";
import { SettingsSection } from "../settings/SettingsSection";
import { ServiceUnavailable } from "../common/ServiceUnavailable";
import { SERVICES_LIVE } from "@/app/lib/feature-flags";
import { useLanguage } from "@/app/lib/i18n";
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Bell, ChevronDown,
  ChevronRight, CheckCircle2, CircleHelp, Coins, CreditCard, Eye, Gamepad2, Info,
  History, Home, LoaderCircle, LockKeyhole, LogOut, Menu, Plus, Search, ShieldCheck, ShoppingBag,
  ShieldAlert, Smartphone, Sparkles, Star, Wallet, Wifi, X,
} from "lucide-react";

type Section = "home" | "cards" | "wallet" | "transfers" | "funding" | "shop" | "codes" | "reseller" | "history" | "support" | "settings";
type Action = "deposit" | "withdraw" | null;
type DashboardProfile = { name: string; email: string; phone: string | null; role: string; kycStatus: string };
type UserNotification = {
  id: number;
  type: "info" | "success" | "warning" | "security";
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
};

const navItems: { id: Section; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Tableau de bord", icon: Home },
  { id: "cards", label: "Cartes", icon: CreditCard },
  { id: "wallet", label: "Portefeuille", icon: Wallet },
  { id: "transfers", label: "Transferts", icon: ArrowLeftRight },
  { id: "funding", label: "Dépôts / Retraits", icon: ArrowDownLeft },
  { id: "shop", label: "Boutique", icon: ShoppingBag },
  { id: "codes", label: "Mes codes", icon: Wifi },
  { id: "reseller", label: "Revendeurs", icon: Sparkles },
  { id: "history", label: "Historique", icon: History },
  { id: "support", label: "Support", icon: CircleHelp },
];

const profileNavItem: { id: Section; label: string; icon: typeof Home } = {
  id: "settings",
  label: "Profil",
  icon: LockKeyhole,
};

const navGroups: { label: string; items: { id: Section; label: string; icon: typeof Home }[] }[] = [
  { label: "PRINCIPAL", items: navItems.filter(({ id }) => id === "home" || id === "cards") },
  { label: "PORTEFEUILLE", items: navItems.filter(({ id }) => id === "wallet" || id === "funding" || id === "transfers" || id === "history") },
  { label: "COMMERCE & AFFILIATION", items: navItems.filter(({ id }) => id === "shop" || id === "codes" || id === "reseller") },
  { label: "COMPTE", items: [...navItems.filter(({ id }) => id === "support"), profileNavItem] },
];

const sectionPaths: Record<Section, string> = {
  home: "/dashboard",
  cards: "/cards",
  wallet: "/wallet",
  transfers: "/transfers",
  funding: "/funding",
  shop: "/dashboard/boutique",
  codes: "/dashboard#codes",
  reseller: "/dashboard#reseller",
  history: "/history",
  support: "/support",
  settings: "/settings",
};

const formatAmount = (value: string) => value;
const EMPTY_MONTHLY_SUMMARY = { incomingXaf: 0, outgoingXaf: 0, incomingCount: 0, outgoingCount: 0 };

function SectionHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <div className="np-heading"><span>{eyebrow}</span><h1>{title}</h1><p>{detail}</p></div>;
}

export default function NovaPayDashboard({ initialSection }: { initialSection?: Section } = {}) {
  const router = useRouter();
  const [active, setActive] = useState<Section>(initialSection || "home");
  const [action, setAction] = useState<Action>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [reservedBalance, setReservedBalance] = useState<number>(0);
  const [userCards, setUserCards] = useState<any[]>([]);
  const [promotionalAds, setPromotionalAds] = useState<any[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [transactionsList, setTransactionsList] = useState<any[]>([]);
  const [monthlySummary, setMonthlySummary] = useState(EMPTY_MONTHLY_SUMMARY);
  const [userProfile, setUserProfile] = useState<DashboardProfile>({ name: "", email: "", phone: null, role: "Compte client", kycStatus: "not_started" });
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [authState, setAuthState] = useState<"checking" | "authed">("checking");
  const { t, language } = useLanguage();
  const modalCloseRef = useRef<HTMLButtonElement>(null);
  const current = navItems.find((item) => item.id === active) ?? (active === "settings" ? profileNavItem : navItems[0]);

  const selectSection = (id: Section) => {
    setActive(id);
    setMenuOpen(false);
    if (id === "shop") window.dispatchEvent(new Event("nova-paid-shop-home"));
    router.push(sectionPaths[id], { scroll: false });
  };

  const selectShopCategory = (slug: string) => {
    setActive("shop");
    setMenuOpen(false);
    router.push(`${sectionPaths.shop}#${slug}`, { scroll: false });
  };

  useEffect(() => {
    setActive(initialSection || "home");
    setMenuOpen(false);
  }, [initialSection]);

  const openAction = (value: Action) => setAction(value);

  const fetchDashboardData = () => {
    fetch("/api/wallet")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.wallet) {
          setWalletBalance(data.wallet.balanceXaf);
          setReservedBalance(data.wallet.reservedXaf ?? 0);
          if (data.profile?.name) {
            setUserProfile((currentProfile) => ({ ...currentProfile, ...data.profile }));
          }
        } else {
          setWalletBalance(0);
        }
      })
      .catch(() => {
        setWalletBalance(0);
      });

    fetch("/api/transactions")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.transactions)) {
          const mapped = data.transactions.map((tx: any) => ({
            id: tx.id,
            publicRef: tx.publicRef,
            name: tx.description,
            meta: `Réf: ${tx.publicRef} · ${tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("fr-FR") : "Récent"}`,
            amount: tx.amountFormatted,
            type: tx.direction,
            status: tx.status,
            icon: tx.direction === "credit" ? "↗" : "−",
            createdAt: tx.createdAt,
          }));
          setTransactionsList(mapped);
          setMonthlySummary(data.summary || EMPTY_MONTHLY_SUMMARY);
        } else {
          setTransactionsList([]);
          setMonthlySummary(EMPTY_MONTHLY_SUMMARY);
        }
      })
      .catch(() => {
        setTransactionsList([]);
        setMonthlySummary(EMPTY_MONTHLY_SUMMARY);
      });

    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => setNotifications(data?.success && Array.isArray(data.notifications) ? data.notifications : []))
      .catch(() => setNotifications([]));

    fetch("/api/cards")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.cards)) {
          setUserCards(data.cards);
        } else {
          setUserCards([]);
        }
      })
      .catch(() => setUserCards([]));

    fetch("/api/ads")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.ads)) {
          setPromotionalAds(data.ads);
        }
      })
      .catch(() => null);
  };

  const markNotificationsRead = async () => {
    const unread = notifications.some((item) => !item.isRead);
    if (!unread) return;
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read" }),
    }).catch(() => null);
    if (response?.ok) {
      setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
    }
  };

  const openNotification = (item: UserNotification) => {
    setNotificationsOpen(false);
    if (item.actionUrl) router.push(item.actionUrl);
  };

  useEffect(() => {
    let active = true;
    fetch("/api/auth")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data?.success || !data.user) {
          const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
          window.location.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
          return;
        }
        if (!active) return;
        setUserProfile({
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone || null,
          role: data.user.role === "super_admin" ? "Administrateur" : "Compte client",
          kycStatus: data.user.kycStatus || "not_started",
        });
        localStorage.removeItem("novapaid_current_user");
        setAuthState("authed");
        fetchDashboardData();
      })
      .catch(() => {
        if (active) {
          const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
          window.location.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
        }
      });

    const onBalanceChange = (e: Event) => {
      const custom = e as CustomEvent<{ balance: number }>;
      if (custom.detail?.balance !== undefined) {
        setWalletBalance(custom.detail.balance);
      }
      fetchDashboardData();
    };
    window.addEventListener("novapay:balance-changed", onBalanceChange);
    window.addEventListener("novapay:transfers-updated", fetchDashboardData);
    return () => {
      active = false;
      window.removeEventListener("novapay:balance-changed", onBalanceChange);
      window.removeEventListener("novapay:transfers-updated", fetchDashboardData);
    };
  }, []);

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("novapaid_current_user");
      localStorage.removeItem("novapaid_token");
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      }).catch(() => undefined);
      window.location.href = "/login";
    }
  };

  useEffect(() => {
    if (!action) return;
    modalCloseRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAction(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [action]);

  // Hard auth gate: block all dashboard content until the server session is
  // confirmed, so no protected page ever renders for an unauthenticated visitor.
  if (authState !== "authed") {
    return (
      <div className="np-auth-gate-loading" role="status" aria-live="polite">
        <LoaderCircle size={26} className="np-auth-gate-spin" />
      </div>
    );
  }

  return (
    <main className="np-app">
      <aside className={`np-sidebar ${menuOpen ? "is-open" : ""}`}>
        <Link className="np-brand" href="/dashboard" aria-label="NovaPaid, tableau de bord">
          <Image
            src={getAssetPath("/novapaid-logo-96.png")}
            alt="NovaPaid"
            width={34}
            height={34}
            className="np-brand-real-logo"
            priority
          />
          <span>Nova<span>Paid</span></span>
        </Link>
        <nav className="np-side-nav" aria-label="Navigation principale">
          {navGroups.map(({ label: groupLabel, items }) => (
            <div className="np-nav-group" key={groupLabel}>
              <span className="np-workspace-label">{groupLabel}</span>
              {items.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" className={active === id ? "active" : ""} aria-current={active === id ? "page" : undefined} onClick={() => selectSection(id)}>
                  <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="np-sidebar-bottom">
          <button className="np-profile" type="button" onClick={() => selectSection("settings")}>
            <span className="np-avatar">{userProfile.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</span><span className="np-profile-copy"><strong>{userProfile.name}</strong><small>{userProfile.role}</small></span><ChevronDown size={15} />
          </button>
          <button
            type="button"
            className="np-sidebar-logout"
            onClick={handleLogout}
            title="Se déconnecter et retourner à la page d'accueil"
          >
            <LogOut size={14} />
            <span>Se déconnecter</span>
          </button>
        </div>
      </aside>

      {menuOpen && <button className="np-mobile-scrim" aria-label="Fermer le menu" onClick={() => setMenuOpen(false)} />}

      <div className="np-main">
        <header className="np-topbar">
          <button className="np-menu-button" type="button" aria-label="Ouvrir le menu" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
          <div className="np-breadcrumb"><span>{t("my_account")}</span><ChevronRight size={14} /><strong>{current.label}</strong></div>
          <div className="np-top-actions">
            <button type="button" className="np-top-user" onClick={() => selectSection("settings")}><span className="np-avatar">{userProfile.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</span><ChevronDown size={14} /></button>
          </div>
        </header>

        <div className="np-content">
          {(!SERVICES_LIVE && active !== "shop") ? (
            <ServiceUnavailable embedded />
          ) : active === "home" ? (
            <>
              <section className="np-overview-grid np-dashboard-overview" aria-label="Résumé du compte">
                <div className="np-balance-wrap">
                <article className="np-balance-card">
                  <div className="np-balance-top"><span className="np-balance-heading"><span>Solde disponible</span><span className="np-balance-account"><span className="np-account-dot" /> Compte principal</span></span><button type="button" aria-label={showBalance ? "Masquer le solde" : "Afficher le solde"} onClick={() => setShowBalance(!showBalance)}><Eye size={17} /></button></div>
                  <div className="np-balance-value">{showBalance ? walletBalance.toLocaleString("fr-FR") : "•••••••"} <small>FCFA</small></div>
                  <div className="np-balance-orb np-orb-one" /><div className="np-balance-orb np-orb-two" />
                </article>
                <div className="np-balance-actions">
                  <button type="button" onClick={() => selectSection("funding")}><Plus size={16} /> Recharger</button>
                  <button type="button" onClick={() => selectSection("transfers")}><ArrowUpRight size={16} /> Transférer</button>
                  <button type="button" onClick={() => selectSection("funding")}><ArrowDownLeft size={16} /> Retirer</button>
                </div>
                </div>

                <article className="np-stat-card">
                  <div className="np-stat-icon blue"><ArrowUpRight size={18} /></div><span className="np-stat-label">Entrées ce mois</span><strong>+ {monthlySummary.incomingXaf.toLocaleString("fr-FR")} <small>FCFA</small></strong>
                  <span className="np-stat-foot"><i>↗</i> {monthlySummary.incomingCount} opération(s)</span>
                </article>
                <article className="np-stat-card">
                  <div className="np-stat-icon coral"><ArrowDownLeft size={18} /></div><span className="np-stat-label">Sorties ce mois</span><strong>− {monthlySummary.outgoingXaf.toLocaleString("fr-FR")} <small>FCFA</small></strong>
                  <span className="np-stat-foot">{monthlySummary.outgoingCount} opération(s)</span>
                </article>
              </section>

              {/* Bannière Annonces Promotionnelles (PrismCard Ads) */}
              {promotionalAds.length > 0 && (
                <section className="np-panel p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(79, 70, 229, 0.09) 0%, rgba(14, 165, 233, 0.08) 100%)", border: "1px solid rgba(99, 102, 241, 0.25)" }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="np-overline text-indigo-600 font-bold text-xs">OFFRE SPÉCIALE NOVAPAID</span>
                      <h3 className="text-base sm:text-lg font-bold text-slate-800">{promotionalAds[currentAdIndex].title}</h3>
                      {promotionalAds[currentAdIndex].description && (
                        <p className="text-xs sm:text-sm text-slate-600">{promotionalAds[currentAdIndex].description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {promotionalAds[currentAdIndex].link_url && (
                        <button
                          type="button"
                          onClick={() => {
                            const target = promotionalAds[currentAdIndex].link_url;
                            if (target.startsWith("/")) {
                              const sec = target.replace("/", "") as Section;
                              selectSection(sec);
                            } else {
                              window.open(target, "_blank");
                            }
                          }}
                          className="np-btn-sm success"
                          style={{ padding: "8px 16px", borderRadius: "10px" }}
                        >
                          <span>Découvrir</span>
                          <ArrowUpRight size={14} />
                        </button>
                      )}
                      {promotionalAds.length > 1 && (
                        <div className="flex gap-1.5 ml-2">
                          {promotionalAds.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              className={`w-2 h-2 rounded-full transition-all ${i === currentAdIndex ? "bg-indigo-600 w-4" : "bg-slate-300"}`}
                              onClick={() => setCurrentAdIndex(i)}
                              aria-label={`Afficher l'annonce ${i + 1}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              <section className="np-shortcuts" aria-label="Actions rapides">
                <button type="button" onClick={() => selectSection("transfers")}><span className="np-shortcut-icon indigo"><ArrowLeftRight size={18} /></span><span><strong>Faire un transfert</strong><small>Envoyer à un contact</small></span><ChevronRight size={17} /></button>
                <button type="button" onClick={() => selectSection("funding")}><span className="np-shortcut-icon cyan"><Smartphone size={18} /></span><span><strong>Ajouter de l’argent</strong><small>Mobile Money ou autre</small></span><ChevronRight size={17} /></button>
                <button type="button" onClick={() => selectSection("shop")}><span className="np-shortcut-icon amber"><ShoppingBag size={18} /></span><span><strong>Explorer la boutique</strong><small>Jeux et services numériques</small></span><ChevronRight size={17} /></button>
                <button type="button" onClick={() => selectSection("cards")}><span className="np-shortcut-icon violet"><CreditCard size={18} /></span><span><strong>Gérer mes cartes</strong><small>Voir mes cartes virtuelles</small></span><ChevronRight size={17} /></button>
              </section>

              <section className="np-lower-grid">
                <article className="np-panel np-transactions-panel">
                  <div className="np-panel-heading"><div><span className="np-overline">ACTIVITÉ DU COMPTE</span><h2>Transactions récentes</h2></div><button type="button" className="np-text-link" onClick={() => selectSection("history")}>Tout voir <ChevronRight size={15} /></button></div>
                  <div className="np-transaction-list">
                    {transactionsList.map((item, idx) => {
                      const isExpanded = expandedTxId === (item.publicRef || String(idx));
                      const statusBadge = item.status === "succeeded"
                        ? { label: "Confirmée", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
                        : item.status === "pending"
                        ? { label: "En attente", cls: "bg-amber-50 text-amber-700 border-amber-200" }
                        : { label: "Échouée", cls: "bg-rose-50 text-rose-700 border-rose-200" };

                      return (
                        <div
                          key={`${item.name}-${idx}`}
                          className="border-t border-slate-100 transition-colors"
                        >
                          <div
                            className="np-transaction-row cursor-pointer hover:bg-slate-50/60 p-2 rounded-lg"
                            onClick={() => setExpandedTxId(isExpanded ? null : (item.publicRef || String(idx)))}
                            role="button"
                            tabIndex={0}
                          >
                            <span className={`np-merchant ${item.type}`}>{item.icon}</span>
                            <span className="np-transaction-copy">
                              <strong>{item.name}</strong>
                              <small>{item.meta}</small>
                            </span>
                            <span className={`np-transaction-amount ${item.type}`}>
                              {formatAmount(item.amount)}
                              <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusBadge.cls}`}>
                                {statusBadge.label}
                              </span>
                            </span>
                          </div>

                          {/* Détails étendus (comme PrismCard toggleDashboardTransactionDetails) */}
                          {isExpanded && (
                            <div className="p-3 my-1 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-2 animate-fadeIn">
                              <div className="grid grid-cols-2 gap-2 pb-1 border-b border-slate-200/60">
                                <div>
                                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Référence publique</span>
                                  <code className="text-slate-800 font-bold">{item.publicRef}</code>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Date et Heure</span>
                                  <span className="text-slate-700">{item.createdAt ? new Date(item.createdAt).toLocaleString("fr-FR") : "Récente"}</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center pt-1">
                                <span className="text-slate-500">Statut du règlement</span>
                                <span className="font-semibold text-slate-800 capitalize">{statusBadge.label}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {transactionsList.length === 0 && <p className="np-empty-state">Aucune opération enregistrée pour le moment.</p>}
                  </div>
                </article>
              </section>

            </>
          ) : active === "cards" ? (
            <VirtualCardsSection />
          ) : active === "reseller" ? (
            <section className="np-page-section">
              <ResellerSection />
            </section>
          ) : active === "shop" ? (
            <Shopfront embedded />
          ) : active === "codes" ? (
            <MyInternetCodes onGoToShop={() => selectSection("shop")} />
          ) : (
            <section className="np-page-section">
              <SectionHeading eyebrow="ESPACE NOVAPAID" title={current.label} detail={active === "wallet" ? "Visualisez votre solde, les fonds réservés et l’activité du portefeuille." : active === "transfers" ? "Retrouvez vos bénéficiaires et l’historique des transferts entre utilisateurs." : active === "funding" ? "Gérez vos rechargements et retraits Mobile Money en toute simplicité." : active === "history" ? "Consultez le relevé détaillé de vos opérations avec justificatifs téléchargeables." : active === "support" ? "Contactez l'assistance et consultez vos demandes." : "Gérez vos informations de profil et vos paramètres de sécurité."} />
              {active === "wallet" && (
                <WalletSection
                  balanceXaf={walletBalance}
                  reservedXaf={reservedBalance}
                  onNavigateSection={(sec) => selectSection(sec as any)}
                  onTriggerAction={(act) => {
                    if (act === "deposit" || act === "withdraw") {
                      selectSection("funding");
                    } else if (act === "transfer") {
                      selectSection("transfers");
                    }
                  }}
                />
              )}
              {active === "transfers" && <TransferExperience embeddedInDashboard />}
              {active === "funding" && (
                <FundingSection
                  currentBalance={walletBalance}
                  onBalanceUpdated={(b) => setWalletBalance(b)}
                />
              )}
              {active === "history" && (
                <HistorySection
                  onOpenSupport={(ref) => {
                    selectSection("support");
                  }}
                />
              )}
              {active === "support" && <SupportSection />}
              {active === "settings" && (
                <SettingsSection
                  user={userProfile}
                  onProfileUpdated={(profile) => setUserProfile((currentProfile) => ({ ...currentProfile, ...profile }))}
                  onOpenSupport={() => selectSection("support")}
                />
              )}
            </section>
          )}
        </div>
      </div>

      <nav className="np-mobile-nav" aria-label="Navigation mobile">
        <button type="button" className={active === "home" ? "active" : ""} onClick={() => selectSection("home")}><Home size={19} /><span>Accueil</span></button>
        <button type="button" className={active === "cards" ? "active" : ""} onClick={() => selectSection("cards")}><CreditCard size={19} /><span>Cartes</span></button>
        <button type="button" className={active === "shop" ? "active" : ""} onClick={() => selectSection("shop")}><ShoppingBag size={19} /><span>Boutique</span></button>
        <button type="button" className={active === "history" ? "active" : ""} onClick={() => selectSection("history")}><History size={19} /><span>Historique</span></button>
        <button type="button" className={active === "settings" ? "active" : ""} onClick={() => selectSection("settings")}><LockKeyhole size={19} /><span>Profil</span></button>
      </nav>

      {action && <div className="np-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAction(null); }}>
        <section className="np-modal" role="dialog" aria-modal="true" aria-labelledby="np-modal-title">
          <button ref={modalCloseRef} type="button" className="np-modal-close" aria-label="Fermer" onClick={() => setAction(null)}><X size={19} /></button>
          <span className="np-modal-mark"><ShieldCheck size={22} /></span>
          <span className="np-overline">OPÉRATION DE PAIEMENT</span>
          <h2 id="np-modal-title">{action === "deposit" ? "Préparer un dépôt" : "Demander un retrait"}</h2>
          <p>Le traitement des dépôts et des retraits dépend de l’intégration du prestataire de paiement. Aucune opération ne sera confirmée depuis cette fenêtre.</p>
          <div className="np-modal-note"><LockKeyhole size={15} /> Paiements non disponibles dans cet espace.</div>
          <button type="button" className="np-primary-button np-modal-done" onClick={() => setAction(null)}>J’ai compris</button>
        </section>
      </div>}
    </main>
  );
}

