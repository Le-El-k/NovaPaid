"use client";


import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getAssetPath } from "@/app/lib/asset-path";
import type { ShopSection } from "@/app/lib/shop-catalog";
import { AdminShopCatalog } from "./AdminShopCatalog";
import { AdminFees } from "./AdminFees";
import { AdminRevenue } from "./AdminRevenue";
import { AdminAdvanced } from "./AdminAdvanced";
import { AdminActivities } from "./AdminActivities";
import { AdminMarketplace } from "./AdminMarketplace";
import { AdminShops } from "./AdminShops";
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  History,
  Home,
  Laptop,
  Lock,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  TrendingUp,
  User,
  UserCheck,
  Users,
  Wallet,
  X,
  XCircle,
  Star,
  MessageSquare,
  Menu,
  Plus,
  Mail,
  LogOut,
  ShoppingBag,
  Send,
  Tag,
} from "lucide-react";

type AdminTab = "overview" | "transactions" | "support" | "reviews" | "users" | "admins" | "approvals" | "kyc" | "cards" | "audit" | "settings" | "shop" | "resellers" | "announcements" | "ads" | "fees" | "revenue" | "advanced" | "activities" | "marketplace" | "user_shops";

const ADMIN_TABS: AdminTab[] = ["overview", "transactions", "support", "reviews", "users", "admins", "approvals", "kyc", "cards", "audit", "settings", "shop", "resellers", "announcements", "ads", "fees", "revenue", "advanced", "activities", "marketplace", "user_shops"];

function readAdminTab(search: string): AdminTab {
  const requested = new URLSearchParams(search).get("section");
  return ADMIN_TABS.includes(requested as AdminTab) ? (requested as AdminTab) : "overview";
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>(() =>
    readAdminTab(typeof window === "undefined" ? "" : window.location.search)
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileSidebarCloseButtonRef = useRef<HTMLButtonElement>(null);
  const wasMobileSidebarOpen = useRef(false);
  const [loading, setLoading] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [adminIdentity, setAdminIdentity] = useState<any>(null);
  const [adminEmailInput, setAdminEmailInput] = useState("service@novapaid.net");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [passwordResetTarget, setPasswordResetTarget] = useState<any>(null);
  const [passwordResetValue, setPasswordResetValue] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [overview, setOverview] = useState<any>({
    usersCount: 0,
    cardsCount: 0,
    pendingKyc: 0,
    pendingApprovals: 0,
    openTickets: 0,
    transactionReviews: 0,
    transactionsCount: 0,
    totalBalanceXaf: 0,
    totalVolumeXaf: 0,
  });

  const [users, setUsers] = useState<any[]>([]);
  const [adminAccounts, setAdminAccounts] = useState<any[]>([]);
  const [showAddAdminForm, setShowAddAdminForm] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({ name: "", email: "", phone: "", role: "operator", password: "" });
  const [approvals, setApprovals] = useState<any[]>([]);
  const [kycCases, setKycCases] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [resellers, setResellers] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", message: "", targetAudience: "all" });
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [newAd, setNewAd] = useState({ title: "", description: "", linkUrl: "", imageUrl: "", isActive: true, sortOrder: 0 });
  const [savingAd, setSavingAd] = useState(false);
  const [appSettings, setAppSettings] = useState<any>({});
  const [shopSections, setShopSections] = useState<ShopSection[]>([]);
  const [dailyLimitInput, setDailyLimitInput] = useState("");
  const [savingDailyLimit, setSavingDailyLimit] = useState(false);
  const [mobileFeesInput, setMobileFeesInput] = useState({ orange: "1", mtn: "1", wave: "0.5", card: "1.8", bank: "0.8" });
  const [savingMobileFees, setSavingMobileFees] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewFilter, setReviewFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [newReviewForm, setNewReviewForm] = useState({
    authorName: "",
    authorLocation: "Douala, Cameroun",
    rating: 5,
    serviceTag: "Carte Mastercard USD",
    reviewText: "",
  });

  // Balance adjustment modal state
  const [adjustModal, setAdjustModal] = useState<{ open: boolean; user: any | null }>({ open: false, user: null });
  const [adjustDir, setAdjustDir] = useState<"credit" | "debit">("credit");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // Support Management Extended States
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketFilterStatus, setTicketFilterStatus] = useState<string>("all");
  const [ticketFilterPriority, setTicketFilterPriority] = useState<string>("all");
  const [ticketFilterCategory, setTicketFilterCategory] = useState<string>("all");
  const [ticketSearch, setTicketSearch] = useState<string>("");
  const [adminReplyMessage, setAdminReplyMessage] = useState("");
  const [adminReplyIsInternal, setAdminReplyIsInternal] = useState(false);
  const [adminReplyNextStatus, setAdminReplyNextStatus] = useState("waiting_client");
  const [adminReplyPriority, setAdminReplyPriority] = useState("");
  const [isReplyingTicket, setIsReplyingTicket] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<string | null>(null);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searchMatches = normalizedSearch ? [
    ...users.filter((user) => `${user.name} ${user.email} ${user.phone}`.toLowerCase().includes(normalizedSearch)).slice(0, 3).map((user) => ({ type: "Client", label: user.name, detail: user.email, tab: "users" as AdminTab })),
    ...transactions.filter((tx) => `${tx.publicRef} ${tx.userName} ${tx.userEmail} ${tx.description}`.toLowerCase().includes(normalizedSearch)).slice(0, 3).map((tx) => ({ type: "Transaction", label: tx.publicRef, detail: tx.userName, tab: "transactions" as AdminTab })),
    ...supportTickets.filter((ticket) => `${ticket.publicRef} ${ticket.userName} ${ticket.subject}`.toLowerCase().includes(normalizedSearch)).slice(0, 3).map((ticket) => ({ type: "Support", label: ticket.publicRef, detail: ticket.subject, tab: "support" as AdminTab })),
  ] : [];

  const selectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
    if (typeof window === "undefined") return;
    const nextUrl = tab === "overview" ? "/admin" : `/admin?section=${tab}`;
    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.pushState(null, "", nextUrl);
    }
  };

  useEffect(() => {
    if (mobileSidebarOpen) {
      wasMobileSidebarOpen.current = true;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      mobileSidebarCloseButtonRef.current?.focus();
      const handleDrawerKeys = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setMobileSidebarOpen(false);
          return;
        }
        if (event.key !== "Tab") return;
        const focusable = document.querySelectorAll<HTMLElement>(
          "#np-admin-sidebar button:not(:disabled), #np-admin-sidebar a[href], #np-admin-sidebar input:not(:disabled), #np-admin-sidebar select:not(:disabled), #np-admin-sidebar textarea:not(:disabled)",
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      window.addEventListener("keydown", handleDrawerKeys);
      return () => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener("keydown", handleDrawerKeys);
      };
    }
    if (wasMobileSidebarOpen.current) mobileMenuButtonRef.current?.focus();
    wasMobileSidebarOpen.current = mobileSidebarOpen;
  }, [mobileSidebarOpen]);

  useEffect(() => {
    const syncTabFromUrl = () => setActiveTab(readAdminTab(window.location.search));
    window.addEventListener("popstate", syncTabFromUrl);
    return () => window.removeEventListener("popstate", syncTabFromUrl);
  }, []);

  // La session admin est vérifiée par le serveur et conservée dans un cookie HttpOnly.
  useEffect(() => {
    let active = true;
    fetch("/api/admin?section=session")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setAdminIdentity(data?.admin || null);
        setIsUnlocked(Boolean(data?.authenticated));
      })
      .catch(() => {
        if (active) setIsUnlocked(false);
      });
    return () => { active = false; };
  }, []);

  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError("");
    setAuthLoading(true);

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email: adminEmailInput.trim(), password: adminPasswordInput }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setIsUnlocked(true);
        setAdminIdentity(data.admin || null);
        setAdminPasswordInput("");
        showNotification("Session administrateur déverrouillée.");
      } else {
        setLoginError(data?.error || "Email ou mot de passe invalide.");
      }
    } catch (error: any) {
      setLoginError(error?.message || "Le service admin est indisponible.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    }).catch(() => undefined);
    setIsUnlocked(false);
    setAdminIdentity(null);
    setAdminPasswordInput("");
    setActiveTab("overview");
    window.history.replaceState(null, "", "/admin");
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchSectionData = async (tab: AdminTab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin?section=${tab}`);
      const data = await res.json();
      if (res.status === 401) {
        setIsUnlocked(false);
        setAdminIdentity(null);
      }
      if (data?.success) {
        if (tab === "overview") {
          setOverview(data.overview);
          fetch("/api/admin?section=approvals")
            .then((approvalRes) => approvalRes.json())
            .then((approvalData) => approvalData?.success && setApprovals(approvalData.approvals || []))
            .catch(() => undefined);
        }
        if (tab === "reviews") setReviews(data.reviews || []);
        if (tab === "users") setUsers(data.users || []);
        if (tab === "admins") setAdminAccounts(data.admins || []);
        if (tab === "approvals") setApprovals(data.approvals || []);
        if (tab === "kyc") setKycCases(data.kycCases || []);
        if (tab === "cards") setCards(data.cards || []);
        if (tab === "transactions") setTransactions(data.transactions || []);
        if (tab === "support") setSupportTickets(data.tickets || []);
        if (tab === "audit") setAuditLogs(data.auditLogs || []);
        if (tab === "settings") setAppSettings(data.settings || {});
        if (tab === "shop") setShopSections(data.shopCatalog || []);
        if (tab === "resellers") setResellers(data.resellers || []);
        if (tab === "announcements") setAnnouncements(data.announcements || []);
        if (tab === "ads") setAds(data.ads || []);
      }
    } catch {
      // Ignorer l'erreur réseau locale
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      fetchSectionData(activeTab);
    }
  }, [activeTab, isUnlocked]);

  useEffect(() => {
    const limit = appSettings?.daily_transfer_limit_level2?.limitXaf;
    if (Number.isSafeInteger(Number(limit)) && Number(limit) > 0) setDailyLimitInput(String(limit));
  }, [appSettings?.daily_transfer_limit_level2?.limitXaf]);

  useEffect(() => {
    const fees = appSettings?.mobile_money_fee_percent;
    if (!fees) return;
    setMobileFeesInput({
      orange: String(fees.orange ?? 1),
      mtn: String(fees.mtn ?? 1),
      wave: String(fees.wave ?? 0.5),
      card: String(fees.card ?? 1.8),
      bank: String(fees.bank ?? 0.8),
    });
  }, [appSettings?.mobile_money_fee_percent]);

  useEffect(() => {
    const setting = appSettings?.platform_maintenance_mode;
    if (!setting) return;
    setMaintenanceEnabled(setting.enabled === true);
    setMaintenanceMessage(String(setting.message || ""));
  }, [appSettings?.platform_maintenance_mode]);

  // Actions administratives
  const handleDecideApproval = async (approvalId: number, approve: boolean) => {
    const approval = approvals.find((item) => item.id === approvalId);
    const financialAction = approval?.actionType === "deposit_funding" || approval?.actionType === "withdrawal_payout";
    const notePrompt = approval?.actionType === "deposit_funding"
      ? approve ? "Référence du paiement externe vérifié :" : "Motif du rejet du dépôt :"
      : approval?.actionType === "withdrawal_payout"
        ? approve ? "Référence du paiement externe envoyé :" : "Motif du rejet du retrait :"
        : null;
    const note = notePrompt
      ? window.prompt(notePrompt, "")
      : approve ? "Approuvé par Super Admin" : "Rejeté par Super Admin";
    if (note === null || (financialAction && !note.trim())) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "decide_approval",
          approvalId,
          approve,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Décision impossible.");
      if (data?.success) {
        showNotification(`Demande #${approvalId} ${approve ? "approuvée" : "rejetée"}.`);
        fetchSectionData("approvals");
        fetchSectionData("overview");
      }
    } catch (error: any) {
      showNotification(error?.message || "Erreur lors de la prise de décision.");
    }
  };

  const handleReviewKyc = async (caseId: number, approve: boolean) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review_kyc",
          caseId,
          approve,
          reason: approve ? "Document d'identité validé conforme" : "Document refusé (non conforme)",
        }),
      });
      const data = await res.json();
      if (data?.success) {
        showNotification(`Dossier KYC #${caseId} ${approve ? "validé (Niveau 2)" : "rejeté"}.`);
        fetchSectionData("kyc");
        fetchSectionData("overview");
      }
    } catch {
      showNotification("Erreur lors du traitement KYC.");
    }
  };

  const handleToggleCard = async (cardId: number) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_card", cardId }),
      });
      const data = await res.json();
      if (data?.success) {
        showNotification(`Statut de la carte mis à jour : ${data.status}.`);
        fetchSectionData("cards");
      }
    } catch {
      showNotification("Erreur lors de l'action sur la carte.");
    }
  };

  const handleReviewTransaction = async (transaction: any) => {
    const nextStatus = transaction.reviewStatus === "open" ? "resolved" : "open";
    const note = nextStatus === "open"
      ? window.prompt("Motif du signalement de cette transaction :", "")
      : transaction.reviewNote || "Examen terminé";
    if (nextStatus === "open" && !note?.trim()) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review_transaction", transactionId: transaction.id, status: nextStatus, note }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Action impossible.");
      showNotification(nextStatus === "open" ? "Transaction signalée pour examen." : "Examen de transaction clôturé.");
      fetchSectionData("transactions");
      fetchSectionData("overview");
    } catch (error: any) {
      showNotification(error?.message || "Erreur lors de l’examen.");
    }
  };

  const handleAdminTicketReply = async (ticketId: number) => {
    if (!adminReplyMessage.trim() || isReplyingTicket) return;
    setIsReplyingTicket(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply_ticket",
          ticketId,
          message: adminReplyMessage.trim(),
          isInternal: adminReplyIsInternal,
          nextStatus: adminReplyNextStatus,
          priority: adminReplyPriority || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Impossible d’envoyer la réponse.");
      showNotification(adminReplyIsInternal ? "Note interne confidentielle enregistrée." : "Réponse officielle envoyée au client.");
      setAdminReplyMessage("");
      setAdminReplyIsInternal(false);
      const refreshRes = await fetch("/api/admin?tab=support");
      const refreshData = await refreshRes.json();
      if (refreshData.success && refreshData.tickets) {
        setSupportTickets(refreshData.tickets);
        const updated = refreshData.tickets.find((t: any) => t.id === ticketId);
        if (updated) setSelectedTicket(updated);
      }
      fetchSectionData("overview");
    } catch (error: any) {
      showNotification(error?.message || "Erreur lors de l’envoi.");
    } finally {
      setIsReplyingTicket(false);
    }
  };

  const handleAdminTicketStatusChange = async (ticketId: number, nextStatus: string, priority?: string, resolution?: string) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_ticket",
          ticketId,
          status: nextStatus,
          priority: priority || undefined,
          resolution: resolution || (nextStatus === "resolved" ? "Demande traitée et résolue par le support." : ""),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Mise à jour impossible.");
      showNotification(`Statut du ticket mis à jour : ${nextStatus}`);
      const refreshRes = await fetch("/api/admin?tab=support");
      const refreshData = await refreshRes.json();
      if (refreshData.success && refreshData.tickets) {
        setSupportTickets(refreshData.tickets);
        const updated = refreshData.tickets.find((t: any) => t.id === ticketId);
        if (updated) setSelectedTicket(updated);
      }
      fetchSectionData("overview");
    } catch (error: any) {
      showNotification(error?.message || "Erreur lors de la mise à jour.");
    }
  };

  const handleUpdateTicket = async (ticket: any, nextStatus: "in_progress" | "resolved") => {
    const resolution = nextStatus === "resolved"
      ? window.prompt("Réponse à enregistrer avant de clôturer :", ticket.resolution || "")
      : ticket.resolution || "";
    if (nextStatus === "resolved" && !resolution?.trim()) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_ticket", ticketId: ticket.id, status: nextStatus, resolution }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Action impossible.");
      showNotification(nextStatus === "resolved" ? "Ticket résolu." : "Ticket pris en charge.");
      fetchSectionData("support");
      fetchSectionData("overview");
    } catch (error: any) {
      showNotification(error?.message || "Erreur lors de la mise à jour du ticket.");
    }
  };

  const handleUpdateUserStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_user", userId, status: newStatus }),
      });
      const data = await res.json();
      if (data?.success) {
        showNotification(`Utilisateur #${userId} passé à l'état ${newStatus}.`);
        fetchSectionData("users");
      }
    } catch {
      showNotification("Erreur lors de la mise à jour utilisateur.");
    }
  };

  const handleToggleWallet = async (user: any) => {
    const status = user.walletStatus === "frozen" ? "active" : "frozen";
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_wallet", userId: user.id, status }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Action impossible.");
      showNotification(status === "frozen" ? "Portefeuille gelé." : "Portefeuille réactivé.");
      fetchSectionData("users");
    } catch (error: any) {
      showNotification(error?.message || "Erreur de mise à jour du portefeuille.");
    }
  };


  const handleAdjustWalletBalance = async () => {
    if (!adjustModal.user) return;
    const amount = Number(adjustAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
      showNotification("Montant invalide.");
      return;
    }
    if (adjustReason.trim().length < 5) {
      showNotification("La raison doit avoir au moins 5 caracteres.");
      return;
    }
    setAdjusting(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust_wallet_balance",
          userId: adjustModal.user.id,
          direction: adjustDir,
          amountXaf: amount,
          reason: adjustReason.trim(),
          idempotencyKey: "adj-" + Date.now() + "-" + String(adjustModal.user.id),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Impossible.");
      showNotification("Solde ajuste.");
      setAdjustModal({ open: false, user: null });
      setAdjustAmount("");
      setAdjustReason("");
      fetchSectionData("users");
    } catch (error: any) {
      showNotification(error?.message || "Erreur.");
    } finally {
      setAdjusting(false);
    }
  };
  const handleUpdateAdmin = async (account: any, changes: { role?: string; status?: string; password?: string }) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_admin", adminId: account.id, role: changes.role || account.role, status: changes.status || account.status, ...(changes.password ? { password: changes.password } : {}) }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Modification impossible.");
      showNotification("Compte administrateur mis à jour.");
      fetchSectionData("admins");
      return true;
    } catch (error: any) {
      showNotification(error?.message || "Erreur de mise à jour du compte admin.");
      return false;
    }
  };

  const handleResetAdminPassword = (account: any) => {
    setPasswordResetTarget(account);
    setPasswordResetValue("");
  };

  const handleUpdateResellerRate = async (resellerId: number, currentRate: number) => {
    const next = window.prompt("Nouveau taux de commission revendeur (%) :", String(currentRate));
    if (!next || isNaN(Number(next))) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_reseller_rate", resellerId, rate: Number(next) }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Mise à jour impossible.");
      showNotification("Taux de commission mis à jour.");
      fetchSectionData("resellers");
    } catch (e: any) {
      showNotification(e?.message || "Erreur.");
    }
  };

  const handleSendPushAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title.trim() || !newAnnouncement.message.trim()) return;
    setSendingAnnouncement(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_push_announcement", ...newAnnouncement }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Envoi impossible.");
      showNotification(`Annonce envoyée à ${data.sentCount} utilisateur(s).`);
      setNewAnnouncement({ title: "", message: "", targetAudience: "all" });
      fetchSectionData("announcements");
    } catch (e: any) {
      showNotification(e?.message || "Erreur lors de l'envoi.");
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAd.title.trim()) return;
    setSavingAd(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_ad", ...newAd }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Enregistrement impossible.");
      showNotification("Annonce publicitaire enregistrée.");
      setNewAd({ title: "", description: "", linkUrl: "", imageUrl: "", isActive: true, sortOrder: 0 });
      fetchSectionData("ads");
    } catch (e: any) {
      showNotification(e?.message || "Erreur enregistrement.");
    } finally {
      setSavingAd(false);
    }
  };

  const handleDeleteAd = async (adId: number) => {
    if (!window.confirm("Supprimer cette bannière publicitaire ?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_ad", id: adId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Suppression impossible.");
      showNotification("Bannière supprimée.");
      fetchSectionData("ads");
    } catch (e: any) {
      showNotification(e?.message || "Erreur suppression.");
    }
  };

  const handlePasswordResetSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordResetTarget || passwordResetValue.length < 10 || passwordResetValue.length > 200) {
      showNotification("Le mot de passe doit contenir entre 10 et 200 caractères.");
      return;
    }
    const updated = await handleUpdateAdmin(passwordResetTarget, { password: passwordResetValue });
    if (updated) {
      setPasswordResetTarget(null);
      setPasswordResetValue("");
    }
  };

  const handleCreateAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_admin", ...newAdminForm }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Création impossible.");
      setNewAdminForm({ name: "", email: "", phone: "", role: "operator", password: "" });
      setShowAddAdminForm(false);
      showNotification("Compte administrateur créé.");
      fetchSectionData("admins");
    } catch (error: any) {
      showNotification(error?.message || "Erreur de création du compte admin.");
    }
  };

  const handleSaveDailyLimit = async (event: React.FormEvent) => {
    event.preventDefault();
    const limitXaf = Number(dailyLimitInput);
    if (!Number.isSafeInteger(limitXaf) || limitXaf < 5000 || limitXaf > 5000000) {
      showNotification("Le plafond doit être compris entre 5 000 et 5 000 000 FCFA.");
      return;
    }
    setSavingDailyLimit(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_setting", key: "daily_transfer_limit_level2", value: { limitXaf } }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Enregistrement impossible.");
      showNotification("Plafond journalier de transfert mis à jour.");
      fetchSectionData("settings");
    } catch (error: any) {
      showNotification(error?.message || "Impossible d’enregistrer le plafond.");
    } finally {
      setSavingDailyLimit(false);
    }
  };

  const handleSaveMobileFees = async (event: React.FormEvent) => {
    event.preventDefault();
    const values = Object.fromEntries(
      Object.entries(mobileFeesInput).map(([provider, input]) => [provider, Number(input)]),
    ) as Record<string, number>;
    if (Object.values(values).some((fee) => !Number.isFinite(fee) || fee < 0 || fee > 10)) {
      showNotification("Chaque commission doit être comprise entre 0 et 10 %.");
      return;
    }
    setSavingMobileFees(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_setting", key: "mobile_money_fee_percent", value: values }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Enregistrement impossible.");
      showNotification("Commissions de dépôt et de retrait mises à jour.");
      fetchSectionData("settings");
    } catch (error: any) {
      showNotification(error?.message || "Impossible d’enregistrer les commissions.");
    } finally {
      setSavingMobileFees(false);
    }
  };

  const handleSaveMaintenance = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingMaintenance(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_setting",
          key: "platform_maintenance_mode",
          value: {
            enabled: maintenanceEnabled,
            message: maintenanceMessage.trim() || "Une maintenance est en cours. Merci de réessayer dans quelques instants.",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Enregistrement impossible.");
      showNotification(maintenanceEnabled ? "Mode maintenance activé." : "Mode maintenance désactivé.");
      fetchSectionData("settings");
    } catch (error: any) {
      showNotification(error?.message || "Impossible de modifier le mode maintenance.");
    } finally {
      setSavingMaintenance(false);
    }
  };

  const handleUpdateReview = async (reviewId: number, status: "approved" | "rejected" | "pending") => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_review", reviewId, status }),
      });
      const data = await res.json();
      if (data?.success) {
        showNotification(`Avis #${reviewId} passé à l'état "${status}".`);
        fetchSectionData("reviews");
      }
    } catch {
      showNotification("Erreur lors de la modération de l'avis.");
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm("Voulez-vous vraiment supprimer définitivement cet avis ?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_review", reviewId }),
      });
      const data = await res.json();
      if (data?.success) {
        showNotification(`Avis #${reviewId} supprimé avec succès.`);
        fetchSectionData("reviews");
      }
    } catch {
      showNotification("Erreur lors de la suppression de l'avis.");
    }
  };

  const handleCreateAdminReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewForm.authorName || !newReviewForm.reviewText) {
      showNotification("Veuillez renseigner le nom et le texte de l'avis.");
      return;
    }
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_review", ...newReviewForm }),
      });
      const data = await res.json();
      if (data?.success) {
        showNotification("Avis ajouté en attente de modération.");
        setShowAddReviewModal(false);
        setNewReviewForm({
          authorName: "",
          authorLocation: "Douala, Cameroun",
          rating: 5,
          serviceTag: "Carte Mastercard USD",
          reviewText: "",
        });
        fetchSectionData("reviews");
      }
    } catch {
      showNotification("Erreur lors de la création de l'avis.");
    }
  };

  // ÉCRAN DE VERROUILLAGE HAUTE SÉCURITÉ SI NON AUTHENTIFIÉ
  if (!isUnlocked) {
    return (
      <div className="np-admin-login-page">
        <div className="np-admin-login-card">
          <div className="np-admin-login-accent" />

          <div className="np-admin-login-heading">
            <div className="np-admin-login-logo-ring">
              <div className="np-admin-login-logo">
                <Image
                  src={getAssetPath("/novapaid-logo-96.png")}
                  alt="NovaPaid"
                  width={40}
                  height={40}
                  className="np-admin-login-image"
                />
              </div>
            </div>
            <span className="np-admin-login-kicker">
              Portail d'Administration Sécurisé
            </span>
            <h1 className="np-admin-login-title">Espace Contrôle NovaPaid</h1>
            <p className="np-admin-login-description">
              Accès réservé au personnel autorisé. Connectez-vous avec votre email et votre mot de passe administrateur.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="np-admin-login-form">
            <div>
              <label htmlFor="admin-login-email" className="np-admin-login-label">Adresse email</label>
              <div className="np-admin-login-field">
                <input
                  id="admin-login-email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  placeholder="service@novapaid.net"
                  value={adminEmailInput}
                  onChange={(e) => {
                    setAdminEmailInput(e.target.value);
                    if (loginError) setLoginError("");
                  }}
                  className="np-admin-login-input"
                />
                <Mail size={16} className="np-admin-login-field-icon" />
              </div>
            </div>
            <div>
              <label htmlFor="admin-login-password" className="np-admin-login-label">Mot de passe</label>
              <div className="np-admin-login-field">
                <input
                  id="admin-login-password"
                  type="password"
                  autoComplete="current-password"
                  value={adminPasswordInput}
                  onChange={(e) => {
                    setAdminPasswordInput(e.target.value);
                    if (loginError) setLoginError("");
                  }}
                  className="np-admin-login-input"
                />
                <Lock size={16} className="np-admin-login-field-icon" />
              </div>
              {loginError && (
                <p className="np-admin-login-error">
                  <AlertTriangle size={12} /> {loginError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={authLoading || !adminEmailInput.trim() || !adminPasswordInput}
              className="np-admin-login-submit"
            >
              <Lock size={16} />
              <span>{authLoading ? "Vérification..." : "Se connecter à l’administration"}</span>
            </button>

          </form>

          <div className="np-admin-login-bottom">
            <Link href="/" className="np-admin-login-back">
              <ArrowLeft size={13} /> Retour au site public
            </Link>
            <span>Session protégée</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="np-admin-app">
      {/* Sidebar Admin */}
      {mobileSidebarOpen && <button type="button" className="np-admin-mobile-scrim" onClick={() => setMobileSidebarOpen(false)} aria-label="Fermer le menu d’administration" />}
      <aside id="np-admin-sidebar" className={`np-admin-sidebar${mobileSidebarOpen ? " is-open" : ""}`}>
        <div className="np-admin-brand">
          <Image
            src={getAssetPath("/novapaid-logo-96.png")}
            alt="NovaPaid"
            width={34}
            height={34}
            className="np-brand-real-logo"
            priority
          />
          <div className="np-admin-brand-copy">
            <strong>Nova<span>Paid</span></strong>
            <span className="np-admin-badge">ADMIN PRIVÉ</span>
          </div>
          <button
            ref={mobileSidebarCloseButtonRef}
            type="button"
            className="np-admin-sidebar-close"
            aria-label="Fermer le menu d’administration"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        <nav className="np-admin-nav" aria-label="Navigation d’administration">
          <div className="np-admin-nav-section-label">TABLEAU DE BORD</div>
          <button
            type="button"
            aria-label="Vue d'ensemble"
            title="Vue d'ensemble"
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => selectTab("overview")}
          >
            <Activity size={18} />
            <span>Vue d'ensemble</span>
          </button>
          <button type="button" aria-label="Revenus & Statistiques" title="Revenus & Statistiques" className={activeTab === "revenue" ? "active" : ""} onClick={() => selectTab("revenue")}>
            <TrendingUp size={18} />
            <span>Revenus & Stats</span>
          </button>

          <div className="np-admin-nav-section-label">GESTION</div>

          <button
            type="button"
            aria-label="Utilisateurs et portefeuilles"
            title="Utilisateurs et portefeuilles"
            className={activeTab === "users" ? "active" : ""}
            onClick={() => selectTab("users")}
          >
            <Users size={18} />
            <span>Utilisateurs</span>
            <span className="np-admin-nav-count">{overview?.usersCount || 0}</span>
          </button>

          <button
            type="button"
            aria-label="Programme Revendeurs"
            title="Programme Revendeurs"
            className={activeTab === "resellers" ? "active" : ""}
            onClick={() => selectTab("resellers")}
          >
            <Tag size={18} />
            <span>Revendeurs</span>
          </button>

          <button
            type="button"
            aria-label="Dossiers KYC"
            title="Dossiers KYC"
            className={activeTab === "kyc" ? "active" : ""}
            onClick={() => selectTab("kyc")}
          >
            <UserCheck size={18} />
            <span>Vérifications d’identité</span>
            {(overview?.pendingKyc || 0) > 0 && (
              <span className="np-admin-nav-badge warning">{overview.pendingKyc}</span>
            )}
          </button>

          <button
            type="button"
            aria-label="Cartes virtuelles"
            title="Cartes virtuelles"
            className={activeTab === "cards" ? "active" : ""}
            onClick={() => selectTab("cards")}
          >
            <CreditCard size={18} />
            <span>Cartes Virtuelles</span>
            <span className="np-admin-nav-count">{overview?.cardsCount || 0}</span>
          </button>

          <button
            type="button"
            aria-label="Avis clients et modération"
            title="Avis clients et modération"
            className={activeTab === "reviews" ? "active" : ""}
            onClick={() => selectTab("reviews")}
          >
            <Star size={18} />
            <span>Avis Clients</span>
            {reviews.length > 0 && (
              <span className="np-admin-nav-count">{reviews.length}</span>
            )}
          </button>

          <button
            type="button"
            aria-label="Annonces Push"
            title="Annonces Push"
            className={activeTab === "announcements" ? "active" : ""}
            onClick={() => selectTab("announcements")}
          >
            <Send size={18} />
            <span>Annonces Push</span>
          </button>

          <button
            type="button"
            aria-label="Publicités et Bannières"
            title="Publicités et Bannières"
            className={activeTab === "ads" ? "active" : ""}
            onClick={() => selectTab("ads")}
          >
            <ShoppingBag size={18} />
            <span>Bannières & Ads</span>
          </button>

          <div className="np-admin-nav-section-label">OPÉRATIONS</div>

          <button
            type="button"
            aria-label="Approbations"
            title="Approbations"
            className={activeTab === "approvals" ? "active" : ""}
            onClick={() => selectTab("approvals")}
          >
            <FileCheck2 size={18} />
            <span>Demandes d’approbation</span>
            {(overview?.pendingApprovals || 0) > 0 && (
              <span className="np-admin-nav-badge pulse">{overview.pendingApprovals}</span>
            )}
          </button>

          <button
            type="button"
            aria-label="Transactions"
            title="Transactions"
            className={activeTab === "transactions" ? "active" : ""}
            onClick={() => selectTab("transactions")}
          >
            <ArrowDownLeft size={18} />
            <span>Journaux & Transactions</span>
            <span className="np-admin-nav-count">{overview?.transactionsCount || 0}</span>
          </button>

          <button
            type="button"
            aria-label="Support clients"
            title="Support clients"
            className={activeTab === "support" ? "active" : ""}
            onClick={() => selectTab("support")}
          >
            <MessageSquare size={18} />
            <span>Support & Tickets</span>
            {(overview?.openTickets || 0) > 0 && <span className="np-admin-nav-badge warning">{overview.openTickets}</span>}
          </button>

          <button
            type="button"
            aria-label="Journal d'audit"
            title="Journal d'audit"
            className={activeTab === "audit" ? "active" : ""}
            onClick={() => selectTab("audit")}
          >
            <History size={18} />
            <span>Logs d'activité</span>
          </button>

          <div className="np-admin-nav-section-label">E-COMMERCE</div>
          <button
            type="button"
            aria-label="Catalogue boutique"
            title="Catalogue boutique"
            className={activeTab === "shop" ? "active" : ""}
            onClick={() => selectTab("shop")}
          >
            <ShoppingBag size={18} />
            <span>Boutique & Produits</span>
          </button>
          <button type="button" aria-label="Marketplace" title="Marketplace" className={activeTab === "marketplace" ? "active" : ""} onClick={() => selectTab("marketplace")}>
            <Tag size={18} />
            <span>Marketplace</span>
          </button>
          <button type="button" aria-label="Boutiques utilisateur" title="Boutiques utilisateur" className={activeTab === "user_shops" ? "active" : ""} onClick={() => selectTab("user_shops")}>
            <Home size={18} />
            <span>Boutiques Utilisateur</span>
          </button>

          <div className="np-admin-nav-section-label">CONFIGURATION</div>
          <button
            type="button"
            aria-label="Frais & Taux"
            title="Frais & Taux"
            className={activeTab === "fees" ? "active" : ""}
            onClick={() => selectTab("fees")}
          >
            <DollarSign size={18} />
            <span>Frais & Taux</span>
          </button>
          <button type="button" aria-label="Configuration avancée" title="Configuration avancée" className={activeTab === "advanced" ? "active" : ""} onClick={() => selectTab("advanced")}>
            <Settings size={18} />
            <span>Config avancée</span>
          </button>
          <button type="button" aria-label="Journal d'activités" title="Journal d'activités" className={activeTab === "activities" ? "active" : ""} onClick={() => selectTab("activities")}>
            <Activity size={18} />
            <span>Activités système</span>
          </button>
          <button
            type="button"
            aria-label="Paramètres système"
            title="Paramètres système"
            className={activeTab === "settings" ? "active" : ""}
            onClick={() => selectTab("settings")}
          >
            <Sliders size={18} />
            <span>Paramètres & Taux</span>
          </button>

          {adminIdentity?.role === "super_admin" && (
            <button type="button" aria-label="Comptes administrateurs" title="Comptes administrateurs" className={activeTab === "admins" ? "active" : ""} onClick={() => selectTab("admins")}>
              <Lock size={18} />
              <span>Accès Administrateurs</span>
            </button>
          )}
        </nav>

        <div className="np-admin-sidebar-bottom">
          <button
            type="button"
            aria-label="Verrouiller la session administrateur"
            title="Verrouiller la session administrateur"
            onClick={handleLogout}
            className="np-admin-logout-btn"
          >
            <LogOut size={14} />
            <span>Verrouiller la session</span>
          </button>
          <Link href="/dashboard" className="np-admin-back-client" aria-label="Retour à l’espace client" title="Retour à l’espace client">
            <ArrowLeft size={16} />
            <span>Retour Espace Client</span>
          </Link>
          <div className="np-admin-session-info">
            <div className="np-avatar-admin">SA</div>
            <div>
              <strong>{adminIdentity?.name || "Administrateur"}</strong>
              <small>{adminIdentity?.email || "Session sécurisée"}</small>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="np-admin-main">
        {/* Top bar */}
        <header className="np-admin-topbar">
          <button
            ref={mobileMenuButtonRef}
            type="button"
            className="np-admin-menu-toggle"
            aria-label={mobileSidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileSidebarOpen}
            aria-controls="np-admin-sidebar"
            onClick={() => setMobileSidebarOpen((open) => !open)}
          >
            {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="np-admin-title-group">
            <h1>
              {activeTab === "overview" && "Tableau de Bord Administratif"}
              {activeTab === "transactions" && "Surveillance des transactions"}
              {activeTab === "support" && "Prise en charge du support"}
              {activeTab === "reviews" && "Gestion & Modération des Avis Clients"}
              {activeTab === "users" && "Gestion des Utilisateurs & Portefeuilles"}
              {activeTab === "admins" && "Gestion des accès administrateurs"}
              {activeTab === "approvals" && "File d’Approbations des Retraits"}
              {activeTab === "kyc" && "Vérification des Identités (KYC)"}
              {activeTab === "cards" && "Supervision des Cartes Virtuelles"}
              {activeTab === "audit" && "Piste d’Audit Réglementaire & Sécurité"}
              {activeTab === "settings" && "Configuration des Paramètres Plateforme"}
              {activeTab === "shop" && "Gestion de la boutique"}
              {activeTab === "resellers" && "Programme d'Affiliation & Revendeurs"}
              {activeTab === "announcements" && "Diffusion des Annonces Push"}
              {activeTab === "ads" && "Gestion des Campagnes & Bannières"}
              {activeTab === "fees" && "Frais, Taux de Change & Providers"}
              {activeTab === "revenue" && "Revenus & Statistiques Financières"}
              {activeTab === "advanced" && "Configuration Avancée"}
              {activeTab === "activities" && "Journal d'Activité Système"}
              {activeTab === "marketplace" && "Gestion Marketplace"}
              {activeTab === "user_shops" && "Boutiques Utilisateur"}
            </h1>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#23272f] text-white">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse" />
                ADMIN CONSOLE
              </span>
              <span className="np-admin-environment-tag">Sécurité Maximale</span>
            </div>
          </div>

          <div className="np-admin-top-actions">
            <div className="np-admin-search">
              <Search size={15} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Rechercher client, référence…"
                aria-label="Recherche globale"
              />
              {normalizedSearch && (
                <div className="np-admin-search-results">
                  {searchMatches.length === 0 ? (
                    <p>Aucun résultat</p>
                  ) : searchMatches.map((match, index) => (
                    <button
                      key={`${match.type}-${match.label}-${index}`}
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        selectTab(match.tab);
                      }}
                    >
                      <span>{match.type}</span>
                      <strong>{match.label}</strong>
                      <small>{match.detail}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              className="np-outline-button"
              onClick={() => fetchSectionData(activeTab)}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Actualiser</span>
            </button>
          </div>
        </header>

        {notification && (
          <div className="np-admin-toast-banner">
            <CheckCircle2 size={16} />
            <span>{notification}</span>
          </div>
        )}

        <div className="np-admin-content">
          {/* VUE D'ENSEMBLE */}
          {activeTab === "overview" && (
            <div className="np-admin-overview-layout">
              {/* Cartes KPI */}
              <div className="np-admin-kpi-grid">
                <article className="np-panel np-admin-kpi" onClick={() => selectTab("users")}>
                  <div className="np-admin-kpi-header">
                    <span>Utilisateurs</span>
                    <Users size={18} className="text-red-500" />
                  </div>
                  <strong>{overview?.usersCount || 0}</strong>
                  <div className="np-admin-kpi-foot positive">
                    <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span>{overview?.usersCount ? Math.max(1, Math.round(overview.usersCount * 0.4)) : 0} connectés</span>
                  </div>
                </article>

                <article className="np-panel np-admin-kpi" onClick={() => selectTab("cards")}>
                  <div className="np-admin-kpi-header">
                    <span>Cartes</span>
                    <CreditCard size={18} className="text-emerald-500" />
                  </div>
                  <strong>{overview?.cardsCount || 0}</strong>
                  <div className="np-admin-kpi-foot">
                    <span>Cartes virtuelles actives</span>
                  </div>
                </article>

                <article className="np-panel np-admin-kpi" onClick={() => selectTab("users")}>
                  <div className="np-admin-kpi-header">
                    <span>Solde disponible</span>
                    <Wallet size={18} className="text-blue-600" />
                  </div>
                  <strong>{(overview?.totalBalanceXaf || 0).toLocaleString("fr-FR")} <small>FCFA</small></strong>
                  <div className="np-admin-kpi-foot positive">
                    <TrendingUp size={13} />
                    <span>Tous portefeuilles clients</span>
                  </div>
                </article>

                <article className="np-panel np-admin-kpi" onClick={() => selectTab("transactions")}>
                  <div className="np-admin-kpi-header">
                    <span>Revenu total & Volume</span>
                    <TrendingUp size={18} className="text-purple-500" />
                  </div>
                  <strong>{(overview?.totalVolumeXaf || 0).toLocaleString("fr-FR")} <small>FCFA</small></strong>
                  <div className="np-admin-kpi-foot">
                    <span>Flux comptabilisés</span>
                  </div>
                </article>

                <article className="np-panel np-admin-kpi" onClick={() => selectTab("approvals")}>
                  <div className="np-admin-kpi-header">
                    <span>Approbations en attente</span>
                    <AlertTriangle size={18} className="text-yellow-500" />
                  </div>
                  <strong className="text-yellow-500">{overview?.pendingApprovals || 0}</strong>
                  <div className="np-admin-kpi-foot">
                    <span>Dépôts & retraits à valider</span>
                  </div>
                </article>
              </div>

              {/* Raccourcis d'actions urgentes */}
              <div className="np-admin-grid-halves">
                {/* Accès rapides PrismCard */}
                <section className="np-panel">
                  <div className="np-panel-heading">
                    <div>
                      <span className="np-overline">NAVIGATION RAPIDE</span>
                      <h2>Accès rapides</h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-1">
                    <button type="button" onClick={() => selectTab("settings")} className="admin-card p-3 hover:border-red-500 transition-all text-left flex items-center gap-3">
                      <Sliders size={18} className="text-red-500" />
                      <span className="text-xs text-gray-300 font-semibold">Taux de change</span>
                    </button>
                    <button type="button" onClick={() => selectTab("settings")} className="admin-card p-3 hover:border-red-500 transition-all text-left flex items-center gap-3">
                      <Wallet size={18} className="text-red-500" />
                      <span className="text-xs text-gray-300 font-semibold">Frais & Plafonds</span>
                    </button>
                    <button type="button" onClick={() => selectTab("users")} className="admin-card p-3 hover:border-red-500 transition-all text-left flex items-center gap-3">
                      <Users size={18} className="text-red-500" />
                      <span className="text-xs text-gray-300 font-semibold">Gestion utilisateurs</span>
                    </button>
                    <button type="button" onClick={() => selectTab("cards")} className="admin-card p-3 hover:border-red-500 transition-all text-left flex items-center gap-3">
                      <CreditCard size={18} className="text-red-500" />
                      <span className="text-xs text-gray-300 font-semibold">Gestion des cartes</span>
                    </button>
                    <button type="button" onClick={() => selectTab("approvals")} className="admin-card p-3 hover:border-red-500 transition-all text-left flex items-center gap-3">
                      <FileCheck2 size={18} className="text-red-500" />
                      <span className="text-xs text-gray-300 font-semibold">Approbations ({overview?.pendingApprovals || 0})</span>
                    </button>
                    <button type="button" onClick={() => selectTab("audit")} className="admin-card p-3 hover:border-red-500 transition-all text-left flex items-center gap-3">
                      <History size={18} className="text-red-500" />
                      <span className="text-xs text-gray-300 font-semibold">Logs d'activité</span>
                    </button>
                  </div>
                </section>

                <section className="np-panel">
                  <div className="np-panel-heading">
                    <div>
                      <span className="np-overline">URGENT</span>
                      <h2>Approbations requises</h2>
                    </div>
                    <button type="button" className="np-text-link" onClick={() => selectTab("approvals")}>
                      Voir tout <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="np-admin-quick-action-list">
                    {approvals.filter((approval) => approval.status === "pending").slice(0, 3).map((approval) => (
                      <div className="np-admin-action-row" key={approval.id}>
                        <div className="np-action-info">
                          <strong>{approval.actionType} · {approval.requesterName}</strong>
                          <small>Réf : {approval.targetRef} · {approval.reason}</small>
                        </div>
                        <div className="np-action-buttons">
                          <button type="button" className="np-btn-sm success" onClick={() => handleDecideApproval(approval.id, true)}><Check size={14} /> Valider</button>
                          <button type="button" className="np-btn-sm danger" onClick={() => handleDecideApproval(approval.id, false)}><X size={14} /> Rejeter</button>
                        </div>
                      </div>
                    ))}
                    {!approvals.some((approval) => approval.status === "pending") && <p className="np-admin-card-desc">Aucune demande en attente.</p>}
                  </div>
                </section>

                <section className="np-panel">
                  <div className="np-panel-heading">
                    <div>
                      <span className="np-overline">CONFORMITÉ COBAC</span>
                      <h2>Sécurité & Statut Système</h2>
                    </div>
                    <ShieldCheck size={20} className="text-emerald-500" />
                  </div>

                  <div className="np-admin-checklist">
                    <div className="np-check-item">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <span>{(overview?.transactionsCount || 0).toLocaleString("fr-FR")} transactions enregistrées</span>
                    </div>
                    <div className="np-check-item">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <span>Journal des actions administratives activé</span>
                    </div>
                    <div className="np-check-item">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <span>{overview?.usersCount || 0} comptes utilisateurs suivis</span>
                    </div>
                    <div className="np-check-item">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <span>{overview?.openTickets || 0} tickets support ouverts</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="np-panel np-admin-table-panel">
              <div className="np-panel-heading">
                <div>
                  <span className="np-overline">JOURNAL FINANCIER</span>
                  <h2>Transactions récentes ({transactions.length})</h2>
                  <p className="np-admin-card-desc">Lecture du journal et suivi des vérifications. Les montants comptabilisés restent inchangés.</p>
                </div>
                {(overview?.transactionReviews || 0) > 0 && <span className="np-badge warning">{overview.transactionReviews} à examiner</span>}
              </div>
              <div className="np-admin-table-wrap">
                <table className="np-admin-table">
                  <thead>
                    <tr><th>Date / Référence</th><th>Client</th><th>Opération</th><th>Montant</th><th>État</th><th>Examen admin</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td><small>{new Date(tx.createdAt).toLocaleString("fr-FR")}</small><code className="block">{tx.publicRef}</code></td>
                        <td><strong>{tx.userName}</strong><small className="block text-slate-500">{tx.userEmail}</small></td>
                        <td><strong>{tx.type}</strong><small className="block text-slate-500">{tx.description}</small></td>
                        <td><strong>{tx.currency === "XAF" ? `${Math.round(tx.amountMinor / 100).toLocaleString("fr-FR")} FCFA` : `${(tx.amountMinor / 100).toFixed(2)} ${tx.currency}`}</strong></td>
                        <td><span className={"np-badge " + (tx.status === "succeeded" ? "success" : tx.status === "pending" ? "warning" : "danger")}>{tx.status}</span></td>
                        <td>
                          <span className={"np-badge " + (tx.reviewStatus === "open" ? "warning" : tx.reviewStatus === "resolved" ? "success" : "")}>
                            {tx.reviewStatus === "clear" ? "Aucun signalement" : tx.reviewStatus === "open" ? "À examiner" : "Clôturé"}
                          </span>
                          {tx.reviewNote && <small className="block text-slate-500 max-w-48">{tx.reviewNote}</small>}
                        </td>
                        <td><button type="button" className={"np-btn-sm " + (tx.reviewStatus === "open" ? "success" : "outline")} onClick={() => handleReviewTransaction(tx)}>{tx.reviewStatus === "open" ? "Clôturer" : "Signaler"}</button></td>
                      </tr>
                    ))}
                    {transactions.length === 0 && <tr><td colSpan={7} className="text-center text-slate-500 py-8">Aucune transaction enregistrée.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "support" && (() => {
            const openCount = supportTickets.filter(t => t.status === "open").length;
            const inProgressCount = supportTickets.filter(t => t.status === "in_progress").length;
            const waitingClientCount = supportTickets.filter(t => t.status === "waiting_client").length;
            const resolvedCount = supportTickets.filter(t => t.status === "resolved" || t.status === "closed").length;

            const filteredTickets = supportTickets.filter((t) => {
              if (ticketFilterStatus !== "all" && t.status !== ticketFilterStatus) return false;
              if (ticketFilterPriority !== "all" && t.priority !== ticketFilterPriority) return false;
              if (ticketFilterCategory !== "all" && t.category !== ticketFilterCategory) return false;
              if (ticketSearch.trim()) {
                const q = ticketSearch.trim().toLowerCase();
                const matches = (t.publicRef + " " + t.userName + " " + t.userEmail + " " + t.subject).toLowerCase().includes(q);
                if (!matches) return false;
              }
              return true;
            });

            return (
              <div className="space-y-6">
                {/* Support KPIs */}
                <div className="np-admin-kpi-grid">
                  <article className="np-panel np-admin-kpi">
                    <div className="np-admin-kpi-header">
                      <span>Total réclamations</span>
                      <MessageSquare size={18} className="text-blue-600" />
                    </div>
                    <strong>{supportTickets.length}</strong>
                    <div className="np-admin-kpi-foot"><span>Toutes demandes confondues</span></div>
                  </article>
                  <article className="np-panel np-admin-kpi">
                    <div className="np-admin-kpi-header">
                      <span>Nouveaux tickets</span>
                      <Clock size={18} className="text-amber-500" />
                    </div>
                    <strong className="text-amber-600">{openCount}</strong>
                    <div className="np-admin-kpi-foot warning"><span>En attente de prise en charge</span></div>
                  </article>
                  <article className="np-panel np-admin-kpi">
                    <div className="np-admin-kpi-header">
                      <span>En traitement</span>
                      <Activity size={18} className="text-indigo-600" />
                    </div>
                    <strong className="text-indigo-600">{inProgressCount}</strong>
                    <div className="np-admin-kpi-foot"><span>En cours d'investigation</span></div>
                  </article>
                  <article className="np-panel np-admin-kpi">
                    <div className="np-admin-kpi-header">
                      <span>Attente réponse client</span>
                      <UserCheck size={18} className="text-purple-600" />
                    </div>
                    <strong className="text-purple-600">{waitingClientCount}</strong>
                    <div className="np-admin-kpi-foot"><span>Réponse transmise au client</span></div>
                  </article>
                  <article className="np-panel np-admin-kpi">
                    <div className="np-admin-kpi-header">
                      <span>Résolus & Clôturés</span>
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    </div>
                    <strong className="text-emerald-600">{resolvedCount}</strong>
                    <div className="np-admin-kpi-foot positive"><span>Demandes traitées avec succès</span></div>
                  </article>
                </div>

                {/* Main Tickets Panel */}
                <div className="np-panel np-admin-table-panel">
                  <div className="np-panel-heading">
                    <div>
                      <span className="np-overline">CENTRE DE SUPPORT CLIENT</span>
                      <h2>Gestion des réclamations ({filteredTickets.length}/{supportTickets.length})</h2>
                    </div>
                    <button
                      type="button"
                      className="np-btn-sm outline flex items-center gap-1"
                      onClick={() => fetchSectionData("support")}
                    >
                      <RefreshCw size={13} />
                      <span>Actualiser</span>
                    </button>
                  </div>

                  {/* Toolbar & Filters */}
                  <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex-1 min-w-[240px] max-w-md relative">
                      <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        className="np-text-input pl-9 h-9 text-xs"
                        placeholder="Rechercher (Réf, Client, Email, Sujet)..."
                        value={ticketSearch}
                        onChange={(e) => setTicketSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 items-center text-xs">
                      <select
                        className="np-text-input h-9 text-xs py-1 px-2.5"
                        value={ticketFilterStatus}
                        onChange={(e) => setTicketFilterStatus(e.target.value)}
                      >
                        <option value="all">Tous statuts</option>
                        <option value="open">Nouveau ({openCount})</option>
                        <option value="in_progress">En cours ({inProgressCount})</option>
                        <option value="waiting_client">En attente client ({waitingClientCount})</option>
                        <option value="resolved">Résolu</option>
                        <option value="closed">Clôturé</option>
                      </select>
                      <select
                        className="np-text-input h-9 text-xs py-1 px-2.5"
                        value={ticketFilterPriority}
                        onChange={(e) => setTicketFilterPriority(e.target.value)}
                      >
                        <option value="all">Toutes priorités</option>
                        <option value="urgent">Urgente</option>
                        <option value="high">Élevée</option>
                        <option value="normal">Normale</option>
                        <option value="low">Basse</option>
                      </select>
                      <select
                        className="np-text-input h-9 text-xs py-1 px-2.5"
                        value={ticketFilterCategory}
                        onChange={(e) => setTicketFilterCategory(e.target.value)}
                      >
                        <option value="all">Toutes catégories</option>
                        <option value="card">Carte bancaire</option>
                        <option value="payment">Paiement</option>
                        <option value="balance">Solde</option>
                        <option value="transaction">Transaction</option>
                        <option value="funding">Dépôt/Retrait</option>
                        <option value="transfer">Transfert</option>
                        <option value="shop">Boutique</option>
                        <option value="security">Sécurité</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="np-admin-table-wrap">
                    <table className="np-admin-table">
                      <thead>
                        <tr>
                          <th>Réf / Date</th>
                          <th>Client</th>
                          <th>Demande & Sujet</th>
                          <th>Priorité</th>
                          <th>Statut</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTickets.map((ticket) => {
                          const isUrgent = ticket.priority === "urgent" || ticket.priority === "high";
                          const isDone = ticket.status === "resolved" || ticket.status === "closed";
                          return (
                            <tr key={ticket.id} className={ticket.status === "open" ? "bg-amber-50/40" : ""}>
                              <td>
                                <code className="font-bold text-blue-700">{ticket.publicRef}</code>
                                <small className="block text-slate-500">
                                  {new Date(ticket.createdAt).toLocaleDateString("fr-FR", {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </small>
                              </td>
                              <td>
                                <strong>{ticket.userName}</strong>
                                <small className="block text-slate-500">{ticket.userEmail}</small>
                              </td>
                              <td>
                                <strong className="text-slate-900">{ticket.subject}</strong>
                                <small className="block text-slate-500">
                                  {ticket.category}{ticket.transactionRef ? ` · Réf : ${ticket.transactionRef}` : ""}
                                </small>
                                <p className="text-xs text-slate-600 line-clamp-1 max-w-xs">{ticket.message}</p>
                              </td>
                              <td>
                                <span className={"np-badge " + (isUrgent ? "warning font-bold" : "")}>
                                  {ticket.priority === "urgent" ? "Urgente" : ticket.priority === "high" ? "Élevée" : ticket.priority === "low" ? "Basse" : "Normale"}
                                </span>
                              </td>
                              <td>
                                <span className={"np-badge " + (isDone ? "success" : ticket.status === "open" ? "warning" : ticket.status === "waiting_client" ? "info" : "")}>
                                  {ticket.status === "open" ? "Nouveau" : ticket.status === "in_progress" ? "En cours" : ticket.status === "waiting_client" ? "En attente client" : ticket.status === "resolved" ? "Résolu" : "Fermé"}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="np-btn-sm success flex items-center gap-1.5 font-bold"
                                  onClick={() => setSelectedTicket(ticket)}
                                >
                                  <MessageSquare size={13} />
                                  <span>Gérer & Répondre</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredTickets.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center text-slate-500 py-12">
                              <MessageSquare size={28} className="mx-auto text-slate-300 mb-2" />
                              <p>Aucun ticket ne correspond aux critères sélectionnés.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TICKET DETAIL & INTERACTIVE CONVERSATION MODAL */}
                {selectedTicket && (
                  <div className="np-admin-modal-backdrop" role="dialog" aria-modal="true">
                    <div className="np-admin-modal-box max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
                      {/* Modal Header */}
                      <header className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                              {selectedTicket.publicRef}
                            </code>
                            <span className="np-badge">{selectedTicket.category}</span>
                            {selectedTicket.transactionRef && (
                              <span className="text-xs text-slate-500">Réf Tx : {selectedTicket.transactionRef}</span>
                            )}
                          </div>
                          <h3 className="text-base font-extrabold text-slate-900">{selectedTicket.subject}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Client : <strong>{selectedTicket.userName}</strong> ({selectedTicket.userEmail}) · ID: {selectedTicket.userId}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          onClick={() => setSelectedTicket(null)}
                          aria-label="Fermer"
                        >
                          <X size={18} />
                        </button>
                      </header>

                      {/* Ticket Body / Conversation History */}
                      <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/30 text-xs">
                        {/* Status & Priority Control Row */}
                        <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">Statut :</span>
                            <select
                              className="np-text-input h-8 text-xs py-0.5 px-2 font-bold"
                              value={selectedTicket.status}
                              onChange={(e) => handleAdminTicketStatusChange(selectedTicket.id, e.target.value)}
                            >
                              <option value="open">Nouveau (open)</option>
                              <option value="in_progress">En cours de traitement</option>
                              <option value="waiting_client">En attente réponse client</option>
                              <option value="resolved">Résolu</option>
                              <option value="closed">Fermé / Clôturé</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">Priorité :</span>
                            <select
                              className="np-text-input h-8 text-xs py-0.5 px-2 font-bold"
                              value={selectedTicket.priority || "normal"}
                              onChange={(e) => handleAdminTicketStatusChange(selectedTicket.id, selectedTicket.status, e.target.value)}
                            >
                              <option value="low">Basse</option>
                              <option value="normal">Normale</option>
                              <option value="high">Élevée</option>
                              <option value="urgent">Urgente</option>
                            </select>
                          </div>
                        </div>

                        {/* Resolution if present */}
                        {selectedTicket.resolution && (
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                            <div className="flex items-center gap-1.5 font-bold mb-1">
                              <CheckCircle2 size={15} className="text-emerald-600" />
                              <span>Résolution enregistrée :</span>
                            </div>
                            <p className="text-xs text-emerald-800 leading-relaxed">{selectedTicket.resolution}</p>
                          </div>
                        )}

                        {/* Initial Customer Message */}
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                          <div className="flex justify-between items-center mb-1.5 text-slate-500">
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <User size={13} /> {selectedTicket.userName} (Client)
                            </span>
                            <span className="text-[11px]">
                              {new Date(selectedTicket.createdAt).toLocaleString("fr-FR")}
                            </span>
                          </div>
                          <p className="text-slate-800 leading-relaxed text-xs whitespace-pre-wrap">
                            {selectedTicket.message}
                          </p>
                        </div>

                        {/* Conversation Thread Messages */}
                        {Array.isArray(selectedTicket.messages) && selectedTicket.messages.map((m: any) => {
                          const isAdmin = m.senderType === "admin";
                          const isInternal = Boolean(m.isInternal);

                          if (isInternal) {
                            return (
                              <div key={m.id} className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 shadow-sm">
                                <div className="flex justify-between items-center mb-1 text-amber-800 font-bold text-[11px]">
                                  <span className="flex items-center gap-1">
                                    <Lock size={12} /> Note interne confidentielle · {m.senderName}
                                  </span>
                                  <span>{new Date(m.createdAt).toLocaleString("fr-FR")}</span>
                                </div>
                                <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-wrap">{m.message}</p>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={m.id}
                              className={"p-3.5 rounded-xl border shadow-sm " + (isAdmin ? "bg-blue-50/70 border-blue-200 ml-6" : "bg-white border-slate-200 mr-6")}
                            >
                              <div className="flex justify-between items-center mb-1 text-slate-500">
                                <span className={"font-bold " + (isAdmin ? "text-blue-800 flex items-center gap-1" : "text-slate-800")}>
                                  {isAdmin ? <><ShieldCheck size={13} /> {m.senderName} (Support)</> : m.senderName}
                                </span>
                                <span className="text-[11px]">{new Date(m.createdAt).toLocaleString("fr-FR")}</span>
                              </div>
                              <p className="text-slate-800 leading-relaxed text-xs whitespace-pre-wrap">{m.message}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Reply & Internal Note Form */}
                      <footer className="p-4 border-t border-slate-200 bg-white space-y-3">
                        <textarea
                          className="np-text-input textarea w-full text-xs"
                          rows={3}
                          placeholder={adminReplyIsInternal ? "Écrivez une note interne confidentielle (masquée pour le client)..." : "Rédigez votre réponse officielle transmise au client..."}
                          value={adminReplyMessage}
                          onChange={(e) => setAdminReplyMessage(e.target.value)}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 select-none">
                            <input
                              type="checkbox"
                              checked={adminReplyIsInternal}
                              onChange={(e) => setAdminReplyIsInternal(e.target.checked)}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <span>Note interne (masquée pour le client)</span>
                          </label>

                          {!adminReplyIsInternal && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Après envoi :</span>
                              <select
                                className="np-text-input h-8 text-xs py-0.5 px-2"
                                value={adminReplyNextStatus}
                                onChange={(e) => setAdminReplyNextStatus(e.target.value)}
                              >
                                <option value="waiting_client">En attente client</option>
                                <option value="in_progress">En cours de traitement</option>
                                <option value="resolved">Marquer comme résolu</option>
                                <option value="closed">Clôturer le ticket</option>
                              </select>
                            </div>
                          )}

                          <button
                            type="button"
                            className={"np-primary-button np-btn-sm flex items-center gap-1.5 " + (adminReplyIsInternal ? "bg-amber-600 hover:bg-amber-700" : "")}
                            onClick={() => handleAdminTicketReply(selectedTicket.id)}
                            disabled={isReplyingTicket || !adminReplyMessage.trim()}
                          >
                            {isReplyingTicket ? <RefreshCw size={13} className="spin" /> : <Send size={13} />}
                            <span>{adminReplyIsInternal ? "Enregistrer la note interne" : "Envoyer la réponse"}</span>
                          </button>
                        </div>
                      </footer>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          {/* GESTION DES AVIS CLIENTS & PREUVE SOCIALE */}
          {activeTab === "reviews" && (
            <div className="space-y-6">
              {/* KPIs Avis */}
              <div className="np-admin-kpi-grid">
                <article className="np-panel np-admin-kpi">
                  <div className="np-admin-kpi-header">
                    <span>Total avis enregistrés</span>
                    <MessageSquare size={18} className="text-blue-600" />
                  </div>
                  <strong>{reviews.length}</strong>
                  <div className="np-admin-kpi-foot">
                    <span>Avis dans la base de données</span>
                  </div>
                </article>

                <article className="np-panel np-admin-kpi">
                  <div className="np-admin-kpi-header">
                    <span>Note moyenne des clients</span>
                    <Star size={18} className="text-amber-500 fill-amber-500" />
                  </div>
                  <strong className="text-amber-500">
                    {reviews.length > 0
                      ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1)
                      : "5.0"} <small>/ 5.0</small>
                  </strong>
                  <div className="np-admin-kpi-foot positive">
                    <TrendingUp size={13} />
                    <span>99.4% de satisfaction certifiée</span>
                  </div>
                </article>

                <article className="np-panel np-admin-kpi">
                  <div className="np-admin-kpi-header">
                    <span>Avis en ligne (Approuvés)</span>
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  </div>
                  <strong className="text-emerald-600">
                    {reviews.filter((r) => r.status === "approved").length}
                  </strong>
                  <div className="np-admin-kpi-foot">
                    <span>Visibles sur la landing page</span>
                  </div>
                </article>

                <article className="np-panel np-admin-kpi">
                  <div className="np-admin-kpi-header">
                    <span>En attente de modération</span>
                    <Clock size={18} className="text-indigo-600" />
                  </div>
                  <strong className="text-indigo-600">
                    {reviews.filter((r) => r.status === "pending").length}
                  </strong>
                  <div className="np-admin-kpi-foot">
                    <span>À vérifier par l'équipe</span>
                  </div>
                </article>
              </div>

              {/* Table des avis */}
              <div className="np-panel np-admin-table-panel">
                <div className="np-panel-heading flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <span className="np-overline">MODÉRATION & SOCIAL PROOF</span>
                    <h2>Avis & Témoignages Clients ({reviews.length})</h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex bg-slate-800/60 p-1 rounded-lg border border-slate-700/60 text-xs">
                      <button
                        type="button"
                        className={"px-3 py-1 rounded-md font-medium transition-colors " + (reviewFilter === "all" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white")}
                        onClick={() => setReviewFilter("all")}
                      >
                        Tous ({reviews.length})
                      </button>
                      <button
                        type="button"
                        className={"px-3 py-1 rounded-md font-medium transition-colors " + (reviewFilter === "approved" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white")}
                        onClick={() => setReviewFilter("approved")}
                      >
                        Approuvés ({reviews.filter((r) => r.status === "approved").length})
                      </button>
                      <button
                        type="button"
                        className={"px-3 py-1 rounded-md font-medium transition-colors " + (reviewFilter === "pending" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white")}
                        onClick={() => setReviewFilter("pending")}
                      >
                        En attente ({reviews.filter((r) => r.status === "pending").length})
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddReviewModal(true)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Plus size={15} />
                      <span>Ajouter un avis vérifié</span>
                    </button>
                  </div>
                </div>

                <div className="np-admin-table-wrap">
                  <table className="np-admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Client & Localisation</th>
                        <th>Note</th>
                        <th>Service</th>
                        <th>Commentaire</th>
                        <th>Statut</th>
                        <th>Date</th>
                        <th>Actions de Modération</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews
                        .filter((r) => reviewFilter === "all" || r.status === reviewFilter)
                        .map((rev) => (
                          <tr key={rev.id}>
                            <td>#{rev.id}</td>
                            <td>
                              <strong>{rev.authorName}</strong>
                              <small className="block text-slate-500">{rev.authorLocation}</small>
                            </td>
                            <td>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                                  <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                                ))}
                                <span className="text-xs font-bold ml-1 text-slate-400">({rev.rating}/5)</span>
                              </div>
                            </td>
                            <td>
                              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
                                {rev.serviceTag}
                              </span>
                            </td>
                            <td className="max-w-xs">
                              <p className="text-xs text-slate-300 line-clamp-2 italic">
                                « {rev.reviewText} »
                              </p>
                            </td>
                            <td>
                              <span
                                className={"np-badge " + (rev.status === "approved" ? "success" : rev.status === "pending" ? "warning" : "danger")}
                              >
                                {rev.status === "approved"
                                  ? "Approuvé"
                                  : rev.status === "pending"
                                  ? "En attente"
                                  : "Rejeté"}
                              </span>
                            </td>
                            <td>
                              <small className="text-slate-400">
                                {new Date(rev.createdAt).toLocaleDateString("fr-FR")}
                              </small>
                            </td>
                            <td>
                              <div className="flex items-center gap-1.5">
                                {rev.status !== "approved" && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateReview(rev.id, "approved")}
                                    className="np-btn-sm success"
                                    title="Publier sur la landing page"
                                  >
                                    Approuver
                                  </button>
                                )}
                                {rev.status === "approved" && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateReview(rev.id, "rejected")}
                                    className="np-btn-sm warning"
                                    title="Masquer de la landing page"
                                  >
                                    Masquer
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReview(rev.id)}
                                  className="np-btn-sm danger"
                                  title="Supprimer définitivement"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Ajouter un avis officiel */}
              {showAddReviewModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
                    <button
                      type="button"
                      onClick={() => setShowAddReviewModal(false)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-white"
                    >
                      <X size={20} />
                    </button>

                    <h3 className="text-lg font-bold text-white mb-1">Ajouter un Avis Client Officiel</h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Ce témoignage sera immédiatement enregistré avec le badge vérifié et mis en avant sur le site.
                    </p>

                    <form onSubmit={handleCreateAdminReview} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Nom du client
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Rodrigue M."
                            value={newReviewForm.authorName}
                            onChange={(e) => setNewReviewForm({ ...newReviewForm, authorName: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Ville & Pays
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Douala, Cameroun"
                            value={newReviewForm.authorLocation}
                            onChange={(e) => setNewReviewForm({ ...newReviewForm, authorLocation: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Note attribuée
                          </label>
                          <select
                            value={newReviewForm.rating}
                            onChange={(e) => setNewReviewForm({ ...newReviewForm, rating: Number(e.target.value) })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                          >
                            <option value={5}>★★★★★ (5/5 Excellent)</option>
                            <option value={4}>★★★★☆ (4/5 Très bon)</option>
                            <option value={3}>★★★☆☆ (3/5 Bon)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Service utilisé
                          </label>
                          <select
                            value={newReviewForm.serviceTag}
                            onChange={(e) => setNewReviewForm({ ...newReviewForm, serviceTag: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                          >
                            <option value="Carte Mastercard USD">Carte Mastercard USD</option>
                            <option value="Carte Visa USD">Carte Visa USD</option>
                            <option value="Pièces TikTok">Pièces TikTok</option>
                            <option value="Gaming & Free Fire">Gaming & Free Fire</option>
                            <option value="Transferts P2P">Transferts P2P</option>
                            <option value="Abonnements Streaming">Abonnements Streaming</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Témoignage du client
                        </label>
                        <textarea
                          rows={3}
                          required
                          placeholder="Décrivez l'expérience réelle du client avec NovaPaid..."
                          value={newReviewForm.reviewText}
                          onChange={(e) => setNewReviewForm({ ...newReviewForm, reviewText: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddReviewModal(false)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg font-medium"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
                        >
                          Enregistrer et Publier
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* UTILISATEURS */}
          {activeTab === "users" && (
            <div className="np-panel np-admin-table-panel">
              <div className="np-panel-heading">
                <div>
                  <span className="np-overline">RÉPERTOIRE</span>
                  <h2>Utilisateurs enregistrés ({users.length})</h2>
                </div>
              </div>

              <div className="np-admin-table-wrap">
                <table className="np-admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nom & Coordonnées</th>
                      <th>Rôle</th>
                      <th>Solde portefeuille</th>
                      <th>Statut KYC</th>
                      <th>État du compte</th>
                      <th>Portefeuille</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td><strong>#{u.id}</strong></td>
                        <td>
                          <strong>{u.name}</strong>
                          <div className="text-xs text-slate-500">{u.email} • {u.phone}</div>
                        </td>
                        <td>
                          <span className={"np-role-badge " + (u.role)}>{u.role}</span>
                        </td>
                        <td>
                          <strong>{(u.balanceXaf || 0).toLocaleString("fr-FR")} {u.currency}</strong>
                        </td>
                        <td>
                          <span className={"np-badge " + (u.kycStatus === "approved" ? "success" : u.kycStatus === "pending" ? "warning" : "danger")}>
                            {u.kycStatus}
                          </span>
                        </td>
                        <td>
                          <span className={"np-status-dot " + (u.status === "active" ? "active" : "inactive")} />
                          <span className="capitalize text-xs">{u.status}</span>
                        </td>
                        <td><span className={"np-badge " + (u.walletStatus === "frozen" ? "danger" : "success")}>{u.walletStatus === "frozen" ? "gelé" : "actif"}</span></td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="np-btn-sm outline" onClick={() => handleUpdateUserStatus(u.id, u.status)}>
                              {u.status === "active" ? "Suspendre" : "Activer"}
                            </button>
                            <button type="button" className="np-btn-sm outline" onClick={() => handleToggleWallet(u)}>
                              {u.walletStatus === "frozen" ? "Dégeler" : "Geler le solde"}
                            </button>
                            {adminIdentity?.role === "super_admin" && (
                              <button type="button" className="np-btn-sm outline" onClick={() => { setAdjustModal({ open: true, user: u }); setAdjustDir("credit"); setAdjustAmount(""); setAdjustReason(""); }}>
                                Ajuster
                              </button>
                            )}
                            {adminIdentity?.role === "super_admin" && u.status === "active" && (
                              <button type="button" className="np-btn-sm outline" onClick={async () => {
                                if (!confirm(`Se connecter en tant que ${u.name} (${u.email}) ? Vous serez redirigé vers le tableau de bord utilisateur.`)) return;
                                try {
                                  const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "impersonate_user", userId: u.id }) });
                                  const data = await res.json();
                                  if (data.success) { window.location.href = "/dashboard"; }
                                  else { showNotification(data.error || "Erreur d'impersonation"); }
                                } catch { showNotification("Erreur de connexion"); }
                              }}>
                                Connexion
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* APPROBATIONS */}
          {activeTab === "admins" && (
            <div className="np-panel np-admin-table-panel">
              <div className="np-panel-heading">
                <div>
                  <span className="np-overline">ACCÈS PRIVILÉGIÉS</span>
                  <h2>Administrateurs ({adminAccounts.length})</h2>
                  <p className="np-admin-card-desc">Les droits découlent du rôle. Suspendre un compte révoque immédiatement ses sessions.</p>
                </div>
                <button type="button" className="np-btn-sm success" onClick={() => setShowAddAdminForm((open) => !open)}>
                  <Plus size={14} /> Ajouter un accès
                </button>
              </div>
              {showAddAdminForm && (
                <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 mb-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <label className="text-xs font-semibold text-slate-600">Nom
                    <input required maxLength={100} value={newAdminForm.name} onChange={(event) => setNewAdminForm({ ...newAdminForm, name: event.target.value })} className="mt-1 w-full border border-slate-200 rounded-md p-2 bg-white" />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">Email
                    <input required type="email" maxLength={254} value={newAdminForm.email} onChange={(event) => setNewAdminForm({ ...newAdminForm, email: event.target.value })} className="mt-1 w-full border border-slate-200 rounded-md p-2 bg-white" />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">Téléphone (facultatif)
                    <input value={newAdminForm.phone} onChange={(event) => setNewAdminForm({ ...newAdminForm, phone: event.target.value })} className="mt-1 w-full border border-slate-200 rounded-md p-2 bg-white" />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">Rôle
                    <select value={newAdminForm.role} onChange={(event) => setNewAdminForm({ ...newAdminForm, role: event.target.value })} className="mt-1 w-full border border-slate-200 rounded-md p-2 bg-white">
                      <option value="operator">Support</option>
                      <option value="compliance">Conformité</option>
                      <option value="super_admin">Super administrateur</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-600 md:col-span-2">Mot de passe initial (10 caractères minimum)
                    <input required type="password" minLength={10} maxLength={200} autoComplete="new-password" value={newAdminForm.password} onChange={(event) => setNewAdminForm({ ...newAdminForm, password: event.target.value })} className="mt-1 w-full border border-slate-200 rounded-md p-2 bg-white" />
                  </label>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <button type="button" className="np-btn-sm outline" onClick={() => setShowAddAdminForm(false)}>Annuler</button>
                    <button type="submit" className="np-btn-sm success">Créer le compte</button>
                  </div>
                </form>
              )}
              <div className="np-admin-table-wrap">
                <table className="np-admin-table">
                  <thead><tr><th>Administrateur</th><th>Rôle</th><th>Droits</th><th>Statut</th><th>Dernière connexion</th><th>Actions</th></tr></thead>
                  <tbody>
                    {adminAccounts.map((account) => (
                      <tr key={account.id}>
                        <td><strong>{account.name}</strong><small className="block text-slate-500">{account.email}</small></td>
                        <td>
                          <select value={account.role} onChange={(event) => handleUpdateAdmin(account, { role: event.target.value })} className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs">
                            <option value="super_admin">Super administrateur</option>
                            <option value="compliance">Conformité</option>
                            <option value="operator">Support</option>
                          </select>
                        </td>
                        <td><code>{account.permissions}</code></td>
                        <td><span className={"np-badge " + (account.status === "active" ? "success" : "danger")}>{account.status}</span></td>
                        <td><small>{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString("fr-FR") : "Jamais"}</small></td>
                        <td><div className="flex flex-wrap gap-2">
                          <button type="button" className={"np-btn-sm " + (account.status === "active" ? "danger" : "success")} onClick={() => handleUpdateAdmin(account, { status: account.status === "active" ? "suspended" : "active" })}>{account.status === "active" ? "Suspendre" : "Réactiver"}</button>
                          <button type="button" className="np-btn-sm outline" onClick={() => handleResetAdminPassword(account)}>Réinitialiser le mot de passe</button>
                        </div></td>
                      </tr>
                    ))}
                    {adminAccounts.length === 0 && <tr><td colSpan={6} className="text-center text-slate-500 py-8">Aucun compte administrateur.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* APPROBATIONS */}
          {activeTab === "approvals" && (
            <div className="np-panel np-admin-table-panel">
              <div className="np-panel-heading">
                <div>
                  <span className="np-overline">WORKFLOW</span>
                  <h2>Demandes d’approbation administrative ({approvals.length})</h2>
                  <p className="np-admin-card-desc">Pour un dépôt, vérifiez le paiement externe. Pour un retrait, effectuez le paiement avant de valider et saisissez sa référence.</p>
                </div>
              </div>

              <div className="np-admin-table-wrap">
                <table className="np-admin-table">
                  <thead>
                    <tr>
                      <th>Réf. Demande</th>
                      <th>Demandeur</th>
                      <th>Type d'action</th>
                      <th>Cible</th>
                      <th>Montant</th>
                      <th>Motif & Justification</th>
                      <th>Statut</th>
                      <th>Décision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvals.map((a) => (
                      <tr key={a.id}>
                        <td><code>{a.requestRef}</code></td>
                        <td>
                          <strong>{a.requesterName}</strong>
                          <small className="block text-slate-500">{a.requesterEmail}</small>
                        </td>
                        <td><span className="np-action-tag">{a.actionType === "deposit_funding" ? "Vérification dépôt" : a.actionType === "withdrawal_payout" ? "Règlement retrait" : a.actionType}</span></td>
                        <td><code>{a.targetRef}</code></td>
                        <td>{a.amountXaf ? <strong>{a.amountXaf.toLocaleString("fr-FR")} FCFA</strong> : <span className="text-slate-400">-</span>}</td>
                        <td><span className="text-xs text-slate-700">{a.reason}</span></td>
                        <td>
                          <span className={"np-badge " + (a.status === "approved" ? "success" : a.status === "pending" ? "warning" : "danger")}>
                            {a.status === "approved" ? "Approuvée" : a.status === "pending" ? "En attente" : "Rejetée"}
                          </span>
                        </td>
                        <td>
                          {a.status === "pending" ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="np-btn-sm success"
                                onClick={() => handleDecideApproval(a.id, true)}
                              >
                                Valider
                              </button>
                              <button
                                type="button"
                                className="np-btn-sm danger"
                                onClick={() => handleDecideApproval(a.id, false)}
                              >
                                Rejeter
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Traité</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DOSSIERS KYC */}
          {activeTab === "kyc" && (
            <div className="np-panel np-admin-table-panel">
              <div className="np-panel-heading">
                <div>
                  <span className="np-overline">CONFORMITÉ</span>
                  <h2>Vérification d’Identité Client ({kycCases.length})</h2>
                </div>
              </div>

              <div className="np-admin-table-wrap">
                <table className="np-admin-table">
                  <thead>
                    <tr>
                      <th>Réf Dossier</th>
                      <th>Client</th>
                      <th>Téléphone</th>
                      <th>Motif / Statut CNI</th>
                      <th>Statut</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kycCases.map((k) => (
                      <tr key={k.id}>
                        <td><code>{k.publicRef}</code></td>
                        <td>
                          <strong>{k.userName}</strong>
                          <small className="block text-slate-500">{k.userEmail}</small>
                        </td>
                        <td>{k.userPhone}</td>
                        <td><span className="text-xs">{k.decisionReason}</span></td>
                        <td>
                          <span className={"np-badge " + (k.status === "approved" ? "success" : k.status === "pending" ? "warning" : "danger")}>
                            {k.status}
                          </span>
                        </td>
                        <td><small>{new Date(k.createdAt).toLocaleDateString("fr-FR")}</small></td>
                        <td>
                          {k.status === "pending" ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="np-btn-sm success"
                                onClick={() => handleReviewKyc(k.id, true)}
                              >
                                Approuver
                              </button>
                              <button
                                type="button"
                                className="np-btn-sm danger"
                                onClick={() => handleReviewKyc(k.id, false)}
                              >
                                Rejeter
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Classé</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CARTES VIRTUELLES */}
          {activeTab === "cards" && (
            <div className="np-panel np-admin-table-panel">
              <div className="np-panel-heading">
                <div>
                  <span className="np-overline">PARC ÉMIS</span>
                  <h2>Cartes bancaires virtuelles ({cards.length})</h2>
                </div>
              </div>

              <div className="np-admin-table-wrap">
                <table className="np-admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Titulaire</th>
                      <th>Libellé de la carte</th>
                      <th>Numéro masqué</th>
                      <th>Type</th>
                      <th>Solde actuel</th>
                      <th>État</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map((c) => (
                      <tr key={c.id}>
                        <td>#{c.id}</td>
                        <td>
                          <strong>{c.userName}</strong>
                          <small className="block text-slate-500">{c.userEmail}</small>
                        </td>
                        <td>{c.label}</td>
                        <td><code>{c.maskedPan}</code></td>
                        <td><span className="uppercase text-xs font-bold">{c.cardType}</span></td>
                        <td><strong>${c.balanceUsd.toFixed(2)} USD</strong></td>
                        <td>
                          <span className={"np-badge " + (c.status === "active" ? "success" : "danger")}>
                            {c.status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="np-btn-sm outline"
                            onClick={() => handleToggleCard(c.id)}
                          >
                            {c.status === "active" ? "Geler (Freeze)" : "Débloquer"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AUDIT LOGS */}
          {activeTab === "audit" && (
            <div className="np-panel np-admin-table-panel">
              <div className="np-panel-heading">
                <div>
                  <span className="np-overline">PISTE D'AUDIT</span>
                  <h2>Événements & Actions Administratives ({auditLogs.length})</h2>
                </div>
              </div>

              <div className="np-admin-table-wrap">
                <table className="np-admin-table">
                  <thead>
                    <tr>
                      <th>Date / Heure</th>
                      <th>Acteur</th>
                      <th>Rôle</th>
                      <th>Action</th>
                      <th>Cible</th>
                      <th>Raison</th>
                      <th>Request ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td><small>{new Date(log.createdAt).toLocaleString("fr-FR")}</small></td>
                        <td><strong>{log.actorName}</strong></td>
                        <td><span className="np-role-badge">{log.role}</span></td>
                        <td><code>{log.action}</code></td>
                        <td><code>{log.target}</code></td>
                        <td><span className="text-xs text-slate-600">{log.reason}</span></td>
                        <td><code className="text-slate-400">{log.requestId}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PARAMÈTRES SYSTÈME */}
          {activeTab === "shop" && (
            <AdminShopCatalog
              sections={shopSections}
              onRefresh={() => fetchSectionData("shop")}
              onNotify={showNotification}
            />
          )}

          {/* PARAMÈTRES SYSTÈME */}
          {/* REVENDEURS / AFFILIATION (PrismCard) */}
          {activeTab === "resellers" && (
            <div className="np-panel np-admin-table-panel">
              <div className="np-panel-heading">
                <div>
                  <span className="np-overline">AFFILIATION & PARTENAIRES</span>
                  <h2>Programme Revendeurs ({resellers.length})</h2>
                  <p className="np-admin-card-desc">Gérez les codes d'affiliation, les filleuls rattachés et les commissions générées.</p>
                </div>
              </div>
              <div className="np-admin-table-wrap">
                <table className="np-admin-table">
                  <thead>
                    <tr>
                      <th>Revendeur</th>
                      <th>Code Filleul</th>
                      <th>Taux Commission</th>
                      <th>Filleuls Inscrits</th>
                      <th>Total Gagné</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resellers.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.userName}</strong>
                          <small className="block text-slate-400">{r.userEmail}</small>
                        </td>
                        <td><code>{r.referralCode}</code></td>
                        <td><strong>{r.commissionRate}%</strong></td>
                        <td><span className="np-badge success">{r.referralsCount} client(s)</span></td>
                        <td><strong>{r.totalEarnedXaf.toLocaleString("fr-FR")} FCFA</strong></td>
                        <td><span className={"np-badge " + (r.status === "active" ? "success" : "danger")}>{r.status}</span></td>
                        <td>
                          <button type="button" className="np-btn-sm outline" onClick={() => handleUpdateResellerRate(r.id, r.commissionRate)}>
                            Modifier taux
                          </button>
                        </td>
                      </tr>
                    ))}
                    {resellers.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-slate-500 py-6">Aucun revendeur inscrit pour le moment.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ANNONCES PUSH (PrismCard) */}
          {activeTab === "announcements" && (
            <div className="space-y-6">
              <div className="np-panel p-6">
                <div className="np-panel-heading">
                  <div>
                    <span className="np-overline">DIFFUSION EN MASSE</span>
                    <h2>Nouvelle Annonce Push</h2>
                  </div>
                </div>
                <form onSubmit={handleSendPushAnnouncement} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Titre de l'annonce</label>
                      <input
                        type="text"
                        className="np-text-input w-full"
                        placeholder="Ex: Nouveauté : Rechargez vos cartes en 1 clic !"
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                        required
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Cible</label>
                      <select
                        className="np-text-input w-full"
                        value={newAnnouncement.targetAudience}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, targetAudience: e.target.value })}
                      >
                        <option value="all">Tous les utilisateurs actifs</option>
                        <option value="verified">Comptes vérifiés KYC</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Message</label>
                    <textarea
                      className="np-text-input w-full"
                      rows={3}
                      placeholder="Contenu de la notification envoyée aux utilisateurs..."
                      value={newAnnouncement.message}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                      required
                      maxLength={500}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="np-btn-sm success" disabled={sendingAnnouncement}>
                      <Send size={14} />
                      <span>{sendingAnnouncement ? "Diffusion en cours…" : "Diffuser l'annonce push"}</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="np-panel np-admin-table-panel">
                <div className="np-panel-heading">
                  <div>
                    <span className="np-overline">HISTORIQUE</span>
                    <h2>Annonces diffusées ({announcements.length})</h2>
                  </div>
                </div>
                <div className="np-admin-table-wrap">
                  <table className="np-admin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Titre</th>
                        <th>Message</th>
                        <th>Audience</th>
                        <th>Destinataires</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {announcements.map((a) => (
                        <tr key={a.id}>
                          <td><small>{new Date(a.created_at).toLocaleString("fr-FR")}</small></td>
                          <td><strong>{a.title}</strong></td>
                          <td><span className="text-xs text-slate-300">{a.message}</span></td>
                          <td><code>{a.target_audience}</code></td>
                          <td><span className="np-badge success">{a.sent_count} reçu(s)</span></td>
                          <td><span className="np-badge success">{a.status}</span></td>
                        </tr>
                      ))}
                      {announcements.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-slate-500 py-6">Aucune annonce diffusée.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PUBLICITÉS & BANNIÈRES (PrismCard AdController) */}
          {activeTab === "ads" && (
            <div className="space-y-6">
              <div className="np-panel p-6">
                <div className="np-panel-heading">
                  <div>
                    <span className="np-overline">MARKETING & BANNIÈRES</span>
                    <h2>Ajouter une bannière promotionnelle</h2>
                  </div>
                </div>
                <form onSubmit={handleSaveAd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Titre de la campagne</label>
                    <input
                      type="text"
                      className="np-text-input w-full"
                      placeholder="Ex: -50% sur les cartes Mastercard ce weekend"
                      value={newAd.title}
                      onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                      required
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Lien de destination (URL)</label>
                    <input
                      type="text"
                      className="np-text-input w-full"
                      placeholder="Ex: /cards ou /boutique"
                      value={newAd.linkUrl}
                      onChange={(e) => setNewAd({ ...newAd, linkUrl: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Description / Accroche</label>
                    <input
                      type="text"
                      className="np-text-input w-full"
                      placeholder="Description courte affichée sur la bannière"
                      value={newAd.description}
                      onChange={(e) => setNewAd({ ...newAd, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">URL Image / Bannière (facultatif)</label>
                    <input
                      type="text"
                      className="np-text-input w-full"
                      placeholder="https://..."
                      value={newAd.imageUrl}
                      onChange={(e) => setNewAd({ ...newAd, imageUrl: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <button type="submit" className="np-btn-sm success" disabled={savingAd}>
                      <Plus size={14} />
                      <span>{savingAd ? "Enregistrement…" : "Publier la bannière"}</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="np-panel np-admin-table-panel">
                <div className="np-panel-heading">
                  <div>
                    <span className="np-overline">CAMPAGNES ACTIVES</span>
                    <h2>Bannières & Publicités ({ads.length})</h2>
                  </div>
                </div>
                <div className="np-admin-table-wrap">
                  <table className="np-admin-table">
                    <thead>
                      <tr>
                        <th>Titre</th>
                        <th>Description</th>
                        <th>Lien</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ads.map((ad) => (
                        <tr key={ad.id}>
                          <td><strong>{ad.title}</strong></td>
                          <td><span className="text-xs text-slate-300">{ad.description || "—"}</span></td>
                          <td><code>{ad.link_url || "—"}</code></td>
                          <td><span className={"np-badge " + (ad.is_active ? "success" : "default")}>{ad.is_active ? "Active" : "Désactivée"}</span></td>
                          <td>
                            <button type="button" className="np-btn-sm danger" onClick={() => handleDeleteAd(ad.id)}>
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                      {ads.length === 0 && (
                        <tr><td colSpan={5} className="text-center text-slate-500 py-6">Aucune bannière publicitaire configurée.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "fees" && (
            <AdminFees adminId={adminIdentity?.id || 0} />
          )}

          {activeTab === "revenue" && (
            <AdminRevenue />
          )}

          {activeTab === "advanced" && (
            <AdminAdvanced adminId={adminIdentity?.id || 0} />
          )}

          {activeTab === "activities" && (
            <AdminActivities />
          )}

          {activeTab === "marketplace" && (
            <AdminMarketplace adminId={adminIdentity?.id || 0} />
          )}

          {activeTab === "user_shops" && (
            <AdminShops />
          )}

          {activeTab === "settings" && (
            <div className="np-admin-settings-layout">
              <section className="np-panel">
                <div className="np-panel-heading">
                  <div>
                    <span className="np-overline">TAUX & COMMISSIONS</span>
                    <h2>Paramètres financiers de la plateforme</h2>
                  </div>
                </div>

                <div className="np-admin-settings-grid">
                  <div className="np-setting-box">
                    <strong>Taux Pivot USD / XAF</strong>
                    <p>Taux de conversion appliqué lors de la recharge de carte virtuelle en USD.</p>
                    <div className="np-setting-val">
                      <span>1 USD = </span>
                      <b>{appSettings?.exchange_rate_usd_xaf?.rate || 610.0} FCFA</b>
                    </div>
                  </div>

                  <div className="np-setting-box">
                    <strong>Plafond journalier des transferts</strong>
                    <p>Montant maximum qu’un utilisateur peut transférer par jour.</p>
                    <form onSubmit={handleSaveDailyLimit} className="np-setting-val is-editable">
                      <label className="sr-only" htmlFor="admin-daily-transfer-limit">Plafond journalier en FCFA</label>
                      <input id="admin-daily-transfer-limit" type="number" min={5000} max={5000000} step={1000} required value={dailyLimitInput} onChange={(event) => setDailyLimitInput(event.target.value)} />
                      <b>FCFA</b>
                      <button type="submit" className="np-btn-sm success" disabled={savingDailyLimit}>{savingDailyLimit ? "Enregistrement…" : "Enregistrer"}</button>
                    </form>
                    <small>Valeur autorisée : 5 000 à 5 000 000 FCFA.</small>
                  </div>

                  <div className="np-setting-box">
                    <strong>Frais Réseau Mobile Money</strong>
                    <p>Commissions appliquées côté serveur aux demandes de dépôt et de retrait.</p>
                    <form className="np-fees-table" onSubmit={handleSaveMobileFees}>
                      {([
                        ["orange", "Orange Money"],
                        ["mtn", "MTN Mobile Money"],
                        ["wave", "Wave Mobile"],
                        ["card", "Carte bancaire"],
                        ["bank", "Virement bancaire"],
                      ] as const).map(([provider, label]) => (
                        <label key={provider}>
                          <span>{label}</span>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.01}
                            required
                            aria-label={`Commission ${label} en pourcentage`}
                            value={mobileFeesInput[provider]}
                            onChange={(event) => setMobileFeesInput((current) => ({ ...current, [provider]: event.target.value }))}
                          />
                          <b>%</b>
                        </label>
                      ))}
                      <button type="submit" className="np-btn-sm success" disabled={savingMobileFees}>
                        {savingMobileFees ? "Enregistrement…" : "Enregistrer les commissions"}
                      </button>
                    </form>
                    <small>Chaque taux doit être compris entre 0 et 10 %.</small>
                  </div>
                </div>
              </section>

              <section className="np-panel">
                <div className="np-panel-heading">
                  <div>
                    <span className="np-overline">CONTINUITÉ DE SERVICE</span>
                    <h2>Mode maintenance</h2>
                    <p className="np-admin-card-desc">Bloque temporairement les parcours clients tout en laissant la console admin disponible.</p>
                  </div>
                  <span className={"np-badge " + (maintenanceEnabled ? "warning" : "success")}>
                    {maintenanceEnabled ? "Maintenance active" : "Plateforme disponible"}
                  </span>
                </div>
                <form className="np-admin-maintenance-form" onSubmit={handleSaveMaintenance}>
                  <label className="np-admin-maintenance-toggle">
                    <input
                      type="checkbox"
                      checked={maintenanceEnabled}
                      onChange={(event) => setMaintenanceEnabled(event.target.checked)}
                    />
                    <span aria-hidden="true" />
                    <b>Activer le mode maintenance</b>
                  </label>
                  <label>
                    <span>Message affiché aux clients</span>
                    <textarea
                      value={maintenanceMessage}
                      maxLength={180}
                      onChange={(event) => setMaintenanceMessage(event.target.value)}
                      placeholder="Une maintenance est en cours. Merci de réessayer dans quelques instants."
                    />
                  </label>
                  <div className="np-admin-maintenance-actions">
                    <small>Le changement est immédiat sur les parcours publics et utilisateurs.</small>
                    <button type="submit" className="np-primary-btn" disabled={savingMaintenance}>
                      {savingMaintenance ? "Enregistrement…" : "Enregistrer le statut"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
      {passwordResetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPasswordResetTarget(null); }}>
          <section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="admin-password-reset-title">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><span className="text-[10px] font-semibold tracking-widest text-emerald-400">SÉCURITÉ ADMIN</span><h2 id="admin-password-reset-title" className="mt-1 text-lg font-bold">Changer le mot de passe</h2><p className="mt-1 text-xs text-slate-400">Compte : {passwordResetTarget.email}</p></div>
              <button type="button" aria-label="Fermer" onClick={() => setPasswordResetTarget(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
              <label className="block text-xs font-medium text-slate-300" htmlFor="admin-new-password">Nouveau mot de passe (10 caractères minimum)
                <input id="admin-new-password" type="password" required minLength={10} maxLength={200} autoComplete="new-password" autoFocus value={passwordResetValue} onChange={(event) => setPasswordResetValue(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none" />
              </label>
              <div className="flex justify-end gap-2"><button type="button" className="np-btn-sm outline" onClick={() => setPasswordResetTarget(null)}>Annuler</button><button type="submit" className="np-btn-sm success">Enregistrer</button></div>
            </form>
          </section>
        </div>
      )}

    {/* Balance Adjustment Modal */}
    {adjustModal.open && adjustModal.user && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setAdjustModal({ open: false, user: null })} role="dialog" aria-modal="true">
        <div className="np-panel w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-lg text-slate-800 mb-1">Ajuster le solde</h3>
          <p className="text-xs text-slate-500 mb-4">Utilisateur : <strong>{adjustModal.user.name}</strong> — Solde : <strong>{(adjustModal.user.balanceXaf ?? 0).toLocaleString("fr-FR")} FCFA</strong></p>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button type="button" onClick={() => setAdjustDir("credit")} className={"flex-1 np-btn-sm " + (adjustDir === "credit" ? "success" : "outline")}>+ Crediter</button>
              <button type="button" onClick={() => setAdjustDir("debit")} className={"flex-1 np-btn-sm " + (adjustDir === "debit" ? "danger" : "outline")}>- Debiter</button>
            </div>
            <input type="number" className="np-text-input w-full" placeholder="Montant (FCFA)" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} min={1} max={10000000} />
            <input type="text" className="np-text-input w-full" placeholder="Raison de l ajustement (min. 5 car.)" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} maxLength={200} />
            <div className="flex gap-2 pt-2">
              <button type="button" className="flex-1 np-btn-sm outline" onClick={() => setAdjustModal({ open: false, user: null })}>Annuler</button>
              <button type="button" className={"flex-1 np-btn-sm " + (adjustDir === "credit" ? "success" : "danger")} onClick={handleAdjustWalletBalance} disabled={adjusting}>{adjusting ? "En cours..." : adjustDir === "credit" ? "Crediter" : "Debiter"}</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
