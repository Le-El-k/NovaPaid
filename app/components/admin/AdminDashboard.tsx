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
import { AdminSecurity } from "./AdminSecurity";
import { AdminCommunication } from "./AdminCommunication";
import { AdminExtras } from "./AdminExtras";
import AdminAnalytics from "./AdminAnalytics";
import AdminIntegrations from "./AdminIntegrations";
import { ThemeToggleButton } from "@/app/lib/theme";
import { MoneyValue, useCurrency } from "@/app/lib/currency";
import { LanguageSelector, useLanguage } from "@/app/lib/i18n";
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
  KeyRound,
} from "lucide-react";

type AdminTab = "overview" | "analytics" | "transactions" | "support" | "reviews" | "users" | "admins" | "approvals" | "kyc" | "cards" | "audit" | "settings" | "shop" | "resellers" | "announcements" | "ads" | "fees" | "revenue" | "advanced" | "activities" | "marketplace" | "user_shops" | "security" | "communication" | "extras" | "integrations";

const ADMIN_TABS: AdminTab[] = ["overview", "analytics", "transactions", "support", "reviews", "users", "admins", "approvals", "kyc", "cards", "audit", "settings", "shop", "resellers", "announcements", "ads", "fees", "revenue", "advanced", "activities", "marketplace", "user_shops", "security", "communication", "extras", "integrations"];

function readAdminTab(search: string): AdminTab {
  const requested = new URLSearchParams(search).get("section");
  return ADMIN_TABS.includes(requested as AdminTab) ? (requested as AdminTab) : "overview";
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>(() =>
    readAdminTab(typeof window === "undefined" ? "" : window.location.search)
  );
  const { t, language } = useLanguage();
  const { currency, convertAmount } = useCurrency();
  const locale = language === "fr" ? "fr-FR" : "en-US";
  // Format an XAF amount through the currency context (reacts to the FCFA/USD dropdown).
  const money = (xaf: number): { n: string; u: string } => {
    const v = convertAmount(xaf || 0, "XAF", currency);
    return currency === "XAF"
      ? { n: Math.round(v).toLocaleString(locale), u: "FCFA" }
      : { n: v.toFixed(2), u: "$" };
  };
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileSidebarCloseButtonRef = useRef<HTMLButtonElement>(null);
  const wasMobileSidebarOpen = useRef(false);
  const [loading, setLoading] = useState(false);
  // Bumped by the "Actualiser" button to remount self-fetching section components
  // (Analytics, Intégrations, Fees, Advanced, …) so they re-fetch their data.
  const [refreshKey, setRefreshKey] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [adminIdentity, setAdminIdentity] = useState<any>(null);
  const [adminEmailInput, setAdminEmailInput] = useState("");
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
    setSearchQuery("");
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
        showNotification(t("adm_session_unlocked"));
      } else {
        setLoginError(data?.error || t("adm_invalid_credentials"));
      }
    } catch (error: any) {
      setLoginError(error?.message || t("adm_admin_service_unavailable"));
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
      ? approve ? t("adm_prompt_deposit_ref") : t("adm_prompt_deposit_reject")
      : approval?.actionType === "withdrawal_payout"
        ? approve ? t("adm_prompt_withdrawal_ref") : t("adm_prompt_withdrawal_reject")
        : null;
    const note = notePrompt
      ? window.prompt(notePrompt, "")
      : approve ? t("adm_approved_by_super") : t("adm_rejected_by_super");
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
      if (!res.ok || !data?.success) throw new Error(data?.error || t("adm_decision_impossible"));
      if (data?.success) {
        showNotification(t("adm_request_decided").replace("{n}", String(approvalId)).replace("{x}", approve ? t("adm_approved_fem") : t("adm_rejected_fem")));
        fetchSectionData("approvals");
        fetchSectionData("overview");
      }
    } catch (error: any) {
      showNotification(error?.message || t("adm_err_decision"));
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
          reason: approve ? t("adm_kyc_doc_valid") : t("adm_kyc_doc_refused"),
        }),
      });
      const data = await res.json();
      if (data?.success) {
        showNotification(t("adm_kyc_case_decided").replace("{n}", String(caseId)).replace("{x}", approve ? t("adm_kyc_validated_level2") : t("adm_rejected_masc")));
        fetchSectionData("kyc");
        fetchSectionData("overview");
      }
    } catch {
      showNotification(t("adm_err_kyc_processing"));
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
        showNotification(t("adm_card_status_updated").replace("{x}", String(data.status)));
        fetchSectionData("cards");
      }
    } catch {
      showNotification(t("adm_err_card_action"));
    }
  };

  const handleReviewTransaction = async (transaction: any) => {
    const nextStatus = transaction.reviewStatus === "open" ? "resolved" : "open";
    const note = nextStatus === "open"
      ? window.prompt(t("adm_prompt_flag_transaction"), "")
      : transaction.reviewNote || t("adm_review_done");
    if (nextStatus === "open" && !note?.trim()) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review_transaction", transactionId: transaction.id, status: nextStatus, note }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || t("adm_err_action_failed"));
      showNotification(nextStatus === "open" ? t("adm_transaction_flagged") : t("adm_transaction_review_closed"));
      fetchSectionData("transactions");
      fetchSectionData("overview");
    } catch (error: any) {
      showNotification(error?.message || t("adm_err_review"));
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
      if (!res.ok || !data?.success) throw new Error(data?.error || t("adm_err_send_reply"));
      showNotification(adminReplyIsInternal ? t("adm_internal_note_saved") : t("adm_official_reply_sent"));
      setAdminReplyMessage("");
      setAdminReplyIsInternal(false);
      const refreshRes = await fetch("/api/admin?tab=support");
      const refreshData = await refreshRes.json();
      if (refreshData.success && refreshData.tickets) {
        setSupportTickets(refreshData.tickets);
        const updated = refreshData.tickets.find((tk: any) => tk.id === ticketId);
        if (updated) setSelectedTicket(updated);
      }
      fetchSectionData("overview");
    } catch (error: any) {
      showNotification(error?.message || t("adm_err_send"));
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
          resolution: resolution || (nextStatus === "resolved" ? t("adm_request_resolved_by_support") : ""),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || t("adm_err_update_failed"));
      showNotification(t("adm_ticket_status_updated").replace("{x}", String(nextStatus)));
      const refreshRes = await fetch("/api/admin?tab=support");
      const refreshData = await refreshRes.json();
      if (refreshData.success && refreshData.tickets) {
        setSupportTickets(refreshData.tickets);
        const updated = refreshData.tickets.find((tk: any) => tk.id === ticketId);
        if (updated) setSelectedTicket(updated);
      }
      fetchSectionData("overview");
    } catch (error: any) {
      showNotification(error?.message || t("adm_err_update"));
    }
  };

  const handleUpdateTicket = async (ticket: any, nextStatus: "in_progress" | "resolved") => {
    const resolution = nextStatus === "resolved"
      ? window.prompt(t("adm_prompt_resolution"), ticket.resolution || "")
      : ticket.resolution || "";
    if (nextStatus === "resolved" && !resolution?.trim()) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_ticket", ticketId: ticket.id, status: nextStatus, resolution }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || t("adm_err_action_failed"));
      showNotification(nextStatus === "resolved" ? t("adm_ticket_resolved") : t("adm_ticket_taken"));
      fetchSectionData("support");
      fetchSectionData("overview");
    } catch (error: any) {
      showNotification(error?.message || t("adm_err_ticket_update"));
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
        showNotification(t("adm_user_status_changed").replace("{n}", String(userId)).replace("{x}", String(newStatus)));
        fetchSectionData("users");
      }
    } catch {
      showNotification(t("adm_err_user_update"));
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
      if (!res.ok || !data?.success) throw new Error(data?.error || t("adm_err_action_failed"));
      showNotification(status === "frozen" ? t("adm_wallet_frozen") : t("adm_wallet_reactivated"));
      fetchSectionData("users");
    } catch (error: any) {
      showNotification(error?.message || t("adm_err_wallet_update"));
    }
  };


  const handleAdjustWalletBalance = async () => {
    if (!adjustModal.user) return;
    const amount = Number(adjustAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
      showNotification(t("adm_invalid_amount"));
      return;
    }
    if (adjustReason.trim().length < 5) {
      showNotification(t("adm_reason_min_5"));
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
      if (!res.ok || !data?.success) throw new Error(data?.error || t("adm_impossible"));
      showNotification(t("adm_balance_adjusted"));
      setAdjustModal({ open: false, user: null });
      setAdjustAmount("");
      setAdjustReason("");
      fetchSectionData("users");
    } catch (error: any) {
      showNotification(error?.message || t("adm_err_generic"));
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
      if (!res.ok || !data?.success) throw new Error(data?.error || t("adm_modification_impossible"));
      showNotification(t("adm_admin_account_updated"));
      fetchSectionData("admins");
      return true;
    } catch (error: any) {
      showNotification(error?.message || t("adm_err_admin_update"));
      return false;
    }
  };

  const handleResetAdminPassword = (account: any) => {
    setPasswordResetTarget(account);
    setPasswordResetValue("");
  };

  const handleUpdateResellerRate = async (resellerId: number, currentRate: number) => {
    const next = window.prompt(t("adm_prompt_reseller_rate"), String(currentRate));
    if (!next || isNaN(Number(next))) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_reseller_rate", resellerId, rate: Number(next) }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || t("adm_err_update_failed"));
      showNotification(t("adm_commission_rate_updated"));
      fetchSectionData("resellers");
    } catch (e: any) {
      showNotification(e?.message || t("adm_err_generic"));
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
      if (!res.ok || !data?.success) throw new Error(data?.error || t("adm_send_impossible"));
      showNotification(t("adm_announcement_sent").replace("{n}", String(data.sentCount)));
      setNewAnnouncement({ title: "", message: "", targetAudience: "all" });
      fetchSectionData("announcements");
    } catch (e: any) {
      showNotification(e?.message || t("adm_err_send"));
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
      if (!res.ok || !data?.success) throw new Error(data?.error || t("adm_err_save_failed"));
      showNotification(t("adm_ad_saved"));
      setNewAd({ title: "", description: "", linkUrl: "", imageUrl: "", isActive: true, sortOrder: 0 });
      fetchSectionData("ads");
    } catch (e: any) {
      showNotification(e?.message || t("adm_err_save"));
    } finally {
      setSavingAd(false);
    }
  };

  const handleDeleteAd = async (adId: number) => {
    if (!window.confirm(t("adm_confirm_delete_banner"))) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_ad", id: adId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || t("adm_delete_impossible"));
      showNotification(t("adm_banner_deleted"));
      fetchSectionData("ads");
    } catch (e: any) {
      showNotification(e?.message || t("adm_err_delete"));
    }
  };

  const handlePasswordResetSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordResetTarget || passwordResetValue.length < 10 || passwordResetValue.length > 200) {
      showNotification(t("adm_password_length_rule"));
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
      if (!res.ok || !data?.success) throw new Error(data?.error || t("adm_creation_impossible"));
      setNewAdminForm({ name: "", email: "", phone: "", role: "operator", password: "" });
      setShowAddAdminForm(false);
      showNotification(t("adm_admin_account_created"));
      fetchSectionData("admins");
    } catch (error: any) {
      showNotification(error?.message || t("adm_err_admin_create"));
    }
  };

  const handleSaveDailyLimit = async (event: React.FormEvent) => {
    event.preventDefault();
    const limitXaf = Number(dailyLimitInput);
    if (!Number.isSafeInteger(limitXaf) || limitXaf < 5000 || limitXaf > 5000000) {
      showNotification(t("adm_limit_range_rule"));
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
      if (!res.ok || !data?.success) throw new Error(data?.error || t("adm_err_save_failed"));
      showNotification(t("adm_daily_limit_updated"));
      fetchSectionData("settings");
    } catch (error: any) {
      showNotification(error?.message || t("adm_err_save_limit"));
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
      showNotification(t("adm_fee_range_rule"));
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
      if (!res.ok || !data?.success) throw new Error(data?.error || t("adm_err_save_failed"));
      showNotification(t("adm_fees_updated"));
      fetchSectionData("settings");
    } catch (error: any) {
      showNotification(error?.message || t("adm_err_save_fees"));
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
            message: maintenanceMessage.trim() || t("adm_maintenance_default_msg"),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || t("adm_err_save_failed"));
      showNotification(maintenanceEnabled ? t("adm_maintenance_enabled") : t("adm_maintenance_disabled"));
      fetchSectionData("settings");
    } catch (error: any) {
      showNotification(error?.message || t("adm_err_maintenance"));
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
        showNotification(t("adm_review_status_changed").replace("{n}", String(reviewId)).replace("{x}", String(status)));
        fetchSectionData("reviews");
      }
    } catch {
      showNotification(t("adm_err_review_moderation"));
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm(t("adm_confirm_delete_review"))) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_review", reviewId }),
      });
      const data = await res.json();
      if (data?.success) {
        showNotification(t("adm_review_deleted").replace("{n}", String(reviewId)));
        fetchSectionData("reviews");
      }
    } catch {
      showNotification(t("adm_err_review_delete"));
    }
  };

  const handleCreateAdminReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewForm.authorName || !newReviewForm.reviewText) {
      showNotification(t("adm_review_fields_required"));
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
        showNotification(t("adm_review_added_pending"));
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
      showNotification(t("adm_err_review_create"));
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
              {t("admin_secure_portal")}
            </span>
            <h1 className="np-admin-login-title">{t("admin_control_space")}</h1>
            <p className="np-admin-login-description">
              {t("admin_login_desc")}
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="np-admin-login-form">
            <div>
              <label htmlFor="admin-login-email" className="np-admin-login-label">{t("admin_email_label")}</label>
              <div className="np-admin-login-field">
                <input
                  id="admin-login-email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  placeholder="vous@exemple.com"
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
              <label htmlFor="admin-login-password" className="np-admin-login-label">{t("admin_password_label")}</label>
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
              <span>{authLoading ? t("admin_checking") : t("admin_login_btn")}</span>
            </button>

          </form>

          <div className="np-admin-login-bottom">
            <Link href="/" className="np-admin-login-back">
              <ArrowLeft size={13} /> {t("admin_back_public")}
            </Link>
            <span>{t("admin_session_protected")}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="np-admin-app">
      {/* Sidebar Admin */}
      {mobileSidebarOpen && <button type="button" className="np-admin-mobile-scrim" onClick={() => setMobileSidebarOpen(false)} aria-label={t("admin_close_menu")} />}
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
          </div>
          <button
            ref={mobileSidebarCloseButtonRef}
            type="button"
            className="np-admin-sidebar-close"
            aria-label={t("admin_close_menu")}
            onClick={() => setMobileSidebarOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        <nav className="np-admin-nav" aria-label={t("admin_nav_label")}>
          <div className="np-admin-nav-section-label">{t("admin_section_dashboard")}</div>
          <button
            type="button"
            aria-label={t("admin_overview")}
            title={t("admin_overview")}
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => selectTab("overview")}
          >
            <Activity size={18} />
            <span>{t("admin_overview")}</span>
          </button>
          <button type="button" aria-label={t("admin_revenue_stats")} title={t("admin_revenue_stats")} className={activeTab === "revenue" ? "active" : ""} onClick={() => selectTab("revenue")}>
            <TrendingUp size={18} />
            <span>{t("admin_revenue_stats")}</span>
          </button>
          <button type="button" aria-label={t("admin_analytics")} title={t("admin_analytics")} className={activeTab === "analytics" ? "active" : ""} onClick={() => selectTab("analytics")}>
            <DollarSign size={18} />
            <span>{t("admin_analytics")}</span>
          </button>
          <button type="button" aria-label="Intégrations / API" title="Intégrations / API" className={activeTab === "integrations" ? "active" : ""} onClick={() => selectTab("integrations")}>
            <KeyRound size={18} />
            <span>Intégrations / API</span>
          </button>

          <div className="np-admin-nav-section-label">{t("admin_section_management")}</div>

          <button
            type="button"
            aria-label={t("admin_users")}
            title={t("admin_users")}
            className={activeTab === "users" ? "active" : ""}
            onClick={() => selectTab("users")}
          >
            <Users size={18} />
            <span>{t("admin_users")}</span>
            <span className="np-admin-nav-count">{overview?.usersCount || 0}</span>
          </button>

          <button
            type="button"
            aria-label={t("admin_resellers")}
            title={t("admin_resellers")}
            className={activeTab === "resellers" ? "active" : ""}
            onClick={() => selectTab("resellers")}
          >
            <Tag size={18} />
            <span>{t("admin_resellers")}</span>
          </button>

          <button
            type="button"
            aria-label={t("admin_kyc")}
            title={t("admin_kyc")}
            className={activeTab === "kyc" ? "active" : ""}
            onClick={() => selectTab("kyc")}
          >
            <UserCheck size={18} />
            <span>{t("admin_kyc")}</span>
            {(overview?.pendingKyc || 0) > 0 && (
              <span className="np-admin-nav-badge warning">{overview.pendingKyc}</span>
            )}
          </button>

          <button
            type="button"
            aria-label={t("adm_virtual_cards_label")}
            title={t("adm_virtual_cards_label")}
            className={activeTab === "cards" ? "active" : ""}
            onClick={() => selectTab("cards")}
          >
            <CreditCard size={18} />
            <span>{t("admin_virtual_cards")}</span>
            <span className="np-admin-nav-count">{overview?.cardsCount || 0}</span>
          </button>

          <button
            type="button"
            aria-label={t("admin_reviews")}
            title={t("admin_reviews")}
            className={activeTab === "reviews" ? "active" : ""}
            onClick={() => selectTab("reviews")}
          >
            <Star size={18} />
            <span>{t("admin_reviews")}</span>
            {reviews.length > 0 && (
              <span className="np-admin-nav-count">{reviews.length}</span>
            )}
          </button>

          <button
            type="button"
            aria-label={t("admin_push_announcements")}
            title={t("admin_push_announcements")}
            className={activeTab === "announcements" ? "active" : ""}
            onClick={() => selectTab("announcements")}
          >
            <Send size={18} />
            <span>{t("admin_push_announcements")}</span>
          </button>

          <button
            type="button"
            aria-label={t("admin_banners_ads")}
            title={t("admin_banners_ads")}
            className={activeTab === "ads" ? "active" : ""}
            onClick={() => selectTab("ads")}
          >
            <ShoppingBag size={18} />
            <span>{t("admin_banners_ads")}</span>
          </button>

          <div className="np-admin-nav-section-label">{t("admin_section_operations")}</div>

          <button
            type="button"
            aria-label={t("admin_approval_requests")}
            title={t("admin_approval_requests")}
            className={activeTab === "approvals" ? "active" : ""}
            onClick={() => selectTab("approvals")}
          >
            <FileCheck2 size={18} />
            <span>{t("admin_approval_requests")}</span>
            {(overview?.pendingApprovals || 0) > 0 && (
              <span className="np-admin-nav-badge pulse">{overview.pendingApprovals}</span>
            )}
          </button>

          <button
            type="button"
            aria-label={t("admin_transactions")}
            title={t("admin_transactions")}
            className={activeTab === "transactions" ? "active" : ""}
            onClick={() => selectTab("transactions")}
          >
            <ArrowDownLeft size={18} />
            <span>{t("admin_logs_transactions")}</span>
            <span className="np-admin-nav-count">{overview?.transactionsCount || 0}</span>
          </button>

          <button
            type="button"
            aria-label={t("admin_support")}
            title={t("admin_support")}
            className={activeTab === "support" ? "active" : ""}
            onClick={() => selectTab("support")}
          >
            <MessageSquare size={18} />
            <span>{t("admin_support_claims")}</span>
            {(overview?.openTickets || 0) > 0 && <span className="np-admin-nav-badge warning">{overview.openTickets}</span>}
          </button>

          <button
            type="button"
            aria-label={t("admin_logs")}
            title={t("admin_logs")}
            className={activeTab === "audit" ? "active" : ""}
            onClick={() => selectTab("audit")}
          >
            <History size={18} />
            <span>{t("admin_activity_logs")}</span>
          </button>

          <div className="np-admin-nav-section-label">{t("admin_section_ecommerce")}</div>
          <button
            type="button"
            aria-label={t("admin_shop_products")}
            title={t("admin_shop_products")}
            className={activeTab === "shop" ? "active" : ""}
            onClick={() => selectTab("shop")}
          >
            <ShoppingBag size={18} />
            <span>{t("admin_shop_products")}</span>
          </button>
          <button type="button" aria-label={t("admin_marketplace")} title={t("admin_marketplace")} className={activeTab === "marketplace" ? "active" : ""} onClick={() => selectTab("marketplace")}>
            <Tag size={18} />
            <span>{t("admin_marketplace")}</span>
          </button>
          <button type="button" aria-label={t("admin_user_shops")} title={t("admin_user_shops")} className={activeTab === "user_shops" ? "active" : ""} onClick={() => selectTab("user_shops")}>
            <Home size={18} />
            <span>{t("admin_user_shops")}</span>
          </button>

          <div className="np-admin-nav-section-label">{t("admin_section_communication")}</div>
          <button type="button" aria-label={t("admin_communication")} title={t("admin_communication")} className={activeTab === "communication" ? "active" : ""} onClick={() => selectTab("communication")}>
            <Mail size={18} />
            <span>{t("admin_communication")}</span>
          </button>

          <div className="np-admin-nav-section-label">{t("admin_section_security")}</div>
          <button type="button" aria-label={t("admin_user_security")} title={t("admin_user_security")} className={activeTab === "security" ? "active" : ""} onClick={() => selectTab("security")}>
            <ShieldAlert size={18} />
            <span>{t("admin_user_security")}</span>
          </button>

          <div className="np-admin-nav-section-label">{t("admin_section_config")}</div>
          <button type="button" aria-label={t("admin_extras")} title={t("admin_extras")} className={activeTab === "extras" ? "active" : ""} onClick={() => selectTab("extras")}>
            <Plus size={18} />
            <span>{t("admin_extras")}</span>
          </button>
          <button
            type="button"
            aria-label={t("admin_fees_rates")}
            title={t("admin_fees_rates")}
            className={activeTab === "fees" ? "active" : ""}
            onClick={() => selectTab("fees")}
          >
            <DollarSign size={18} />
            <span>{t("admin_fees_rates")}</span>
          </button>
          <button type="button" aria-label={t("admin_advanced_config")} title={t("admin_advanced_config")} className={activeTab === "advanced" ? "active" : ""} onClick={() => selectTab("advanced")}>
            <Settings size={18} />
            <span>{t("admin_advanced_config")}</span>
          </button>
          <button type="button" aria-label={t("admin_system_activities")} title={t("admin_system_activities")} className={activeTab === "activities" ? "active" : ""} onClick={() => selectTab("activities")}>
            <Activity size={18} />
            <span>{t("admin_system_activities")}</span>
          </button>
          <button
            type="button"
            aria-label={t("admin_settings")}
            title={t("admin_settings")}
            className={activeTab === "settings" ? "active" : ""}
            onClick={() => selectTab("settings")}
          >
            <Sliders size={18} />
            <span>{t("admin_settings_rates")}</span>
          </button>

          {adminIdentity?.role === "super_admin" && (
            <button type="button" aria-label={t("admin_admin_access")} title={t("admin_admin_access")} className={activeTab === "admins" ? "active" : ""} onClick={() => selectTab("admins")}>
              <Lock size={18} />
              <span>{t("admin_admin_access")}</span>
            </button>
          )}
        </nav>

        <div className="np-admin-sidebar-bottom">
          <button
            type="button"
            aria-label={t("admin_lock_session")}
            title={t("admin_lock_session")}
            onClick={handleLogout}
            className="np-admin-logout-btn"
          >
            <LogOut size={14} />
            <span>{t("admin_lock_session")}</span>
          </button>
          <Link href="/dashboard" className="np-admin-back-client" aria-label={t("admin_back_client")} title={t("admin_back_client")}>
            <ArrowLeft size={16} />
            <span>{t("admin_back_client")}</span>
          </Link>
          <div className="np-admin-session-info">
            <div className="np-avatar-admin">SA</div>
            <div>
              <strong>{adminIdentity?.name || t("admin_default_name")}</strong>
              <small>{adminIdentity?.email || t("admin_secure_session")}</small>
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
            aria-label={mobileSidebarOpen ? t("admin_close_menu_short") : t("admin_open_menu")}
            aria-expanded={mobileSidebarOpen}
            aria-controls="np-admin-sidebar"
            onClick={() => setMobileSidebarOpen((open) => !open)}
          >
            {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="np-admin-top-brand" aria-hidden="true">
            <Image
              src={getAssetPath("/novapaid-logo-96.png")}
              alt="NovaPaid"
              width={28}
              height={28}
              className="np-brand-real-logo"
            />
            <strong>Nova<span>Paid</span></strong>
          </div>
          <div className="np-admin-top-actions">
            <button
              type="button"
              className="np-outline-button np-admin-refresh-btn"
              onClick={() => { fetchSectionData(activeTab); setRefreshKey((k) => k + 1); }}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>{t("admin_refresh")}</span>
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
          <div className="np-admin-page-title">
            <h1>
              {activeTab === "overview" && t("admin_title_overview")}
              {activeTab === "transactions" && t("admin_title_transactions")}
              {activeTab === "support" && t("admin_title_support")}
              {activeTab === "reviews" && t("admin_title_reviews")}
              {activeTab === "users" && t("admin_title_users")}
              {activeTab === "admins" && t("admin_title_admins")}
              {activeTab === "approvals" && t("admin_title_approvals")}
              {activeTab === "kyc" && t("admin_title_kyc")}
              {activeTab === "cards" && t("admin_title_cards")}
              {activeTab === "audit" && t("admin_title_audit")}
              {activeTab === "settings" && t("admin_title_settings")}
              {activeTab === "shop" && t("admin_title_shop")}
              {activeTab === "resellers" && t("admin_title_resellers")}
              {activeTab === "announcements" && t("admin_title_announcements")}
              {activeTab === "ads" && t("admin_title_ads")}
              {activeTab === "fees" && t("admin_title_fees")}
              {activeTab === "revenue" && t("admin_title_revenue")}
              {activeTab === "advanced" && t("admin_title_advanced")}
              {activeTab === "activities" && t("admin_title_activities")}
              {activeTab === "marketplace" && t("admin_title_marketplace")}
              {activeTab === "user_shops" && t("admin_title_user_shops")}
              {activeTab === "security" && t("admin_title_security")}
              {activeTab === "communication" && t("admin_title_communication")}
              {activeTab === "extras" && t("admin_title_extras")}
              {activeTab === "analytics" && t("admin_title_analytics")}
              {activeTab === "integrations" && "Intégrations / API"}
            </h1>
          </div>
          {/* VUE D'ENSEMBLE */}
          {activeTab === "overview" && (
            <div className="np-admin-overview-layout">
              {/* Cartes KPI */}
              <div className="np-admin-kpi-grid">
                <article className="np-panel np-admin-kpi" onClick={() => selectTab("users")}>
                  <div className="np-admin-kpi-header">
                    <span>{t("admin_users")}</span>
                    <Users size={18} className="text-red-500" />
                  </div>
                  <strong>{overview?.usersCount || 0}</strong>
                  <div className="np-admin-kpi-foot positive">
                    <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span>{overview?.usersCount ? Math.max(1, Math.round(overview.usersCount * 0.4)) : 0} {t("admin_connected")}</span>
                  </div>
                </article>

                <article className="np-panel np-admin-kpi" onClick={() => selectTab("cards")}>
                  <div className="np-admin-kpi-header">
                    <span>{t("admin_cards")}</span>
                    <CreditCard size={18} className="text-emerald-500" />
                  </div>
                  <strong>{overview?.cardsCount || 0}</strong>
                  <div className="np-admin-kpi-foot">
                    <span>{t("admin_active_virtual_cards")}</span>
                  </div>
                </article>

                <article className="np-panel np-admin-kpi" onClick={() => selectTab("users")}>
                  <div className="np-admin-kpi-header">
                    <span>{t("admin_available_balance")}</span>
                    <Wallet size={18} className="text-blue-600" />
                  </div>
                  <strong><MoneyValue amount={overview?.totalBalanceXaf || 0} /></strong>
                  <div className="np-admin-kpi-foot positive">
                    <TrendingUp size={13} />
                    <span>{t("admin_all_wallets")}</span>
                  </div>
                </article>

                <article className="np-panel np-admin-kpi" onClick={() => selectTab("transactions")}>
                  <div className="np-admin-kpi-header">
                    <span>{t("admin_total_revenue_volume")}</span>
                    <TrendingUp size={18} className="text-purple-500" />
                  </div>
                  <strong><MoneyValue amount={overview?.totalVolumeXaf || 0} /></strong>
                  <div className="np-admin-kpi-foot">
                    <span>{t("admin_counted_flows")}</span>
                  </div>
                </article>

                <article className="np-panel np-admin-kpi" onClick={() => selectTab("approvals")}>
                  <div className="np-admin-kpi-header">
                    <span>{t("admin_pending_approvals")}</span>
                    <AlertTriangle size={18} className="text-yellow-500" />
                  </div>
                  <strong className="text-yellow-500">{overview?.pendingApprovals || 0}</strong>
                  <div className="np-admin-kpi-foot">
                    <span>{t("admin_deposits_withdrawals_validate")}</span>
                  </div>
                </article>
              </div>

              {/* Raccourcis d'actions urgentes */}
              <div className="np-admin-grid-halves">
                {/* Accès rapides PrismCard */}
                <section className="np-panel">
                  <div className="np-panel-heading">
                    <div>
                      <span className="np-overline">{t("admin_quick_nav")}</span>
                      <h2>{t("admin_quick_access")}</h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-1">
                    <button type="button" onClick={() => selectTab("settings")} className="admin-card p-3 hover:border-red-500 transition-all text-left flex items-center gap-3">
                      <Sliders size={18} className="text-red-500" />
                      <span className="text-xs text-gray-300 font-semibold">{t("admin_exchange_rate")}</span>
                    </button>
                    <button type="button" onClick={() => selectTab("settings")} className="admin-card p-3 hover:border-red-500 transition-all text-left flex items-center gap-3">
                      <Wallet size={18} className="text-red-500" />
                      <span className="text-xs text-gray-300 font-semibold">{t("admin_fees_limits")}</span>
                    </button>
                    <button type="button" onClick={() => selectTab("users")} className="admin-card p-3 hover:border-red-500 transition-all text-left flex items-center gap-3">
                      <Users size={18} className="text-red-500" />
                      <span className="text-xs text-gray-300 font-semibold">{t("admin_user_management")}</span>
                    </button>
                    <button type="button" onClick={() => selectTab("cards")} className="admin-card p-3 hover:border-red-500 transition-all text-left flex items-center gap-3">
                      <CreditCard size={18} className="text-red-500" />
                      <span className="text-xs text-gray-300 font-semibold">{t("admin_card_management")}</span>
                    </button>
                    <button type="button" onClick={() => selectTab("approvals")} className="admin-card p-3 hover:border-red-500 transition-all text-left flex items-center gap-3">
                      <FileCheck2 size={18} className="text-red-500" />
                      <span className="text-xs text-gray-300 font-semibold">{t("admin_approvals")} ({overview?.pendingApprovals || 0})</span>
                    </button>
                    <button type="button" onClick={() => selectTab("audit")} className="admin-card p-3 hover:border-red-500 transition-all text-left flex items-center gap-3">
                      <History size={18} className="text-red-500" />
                      <span className="text-xs text-gray-300 font-semibold">{t("admin_activity_logs")}</span>
                    </button>
                  </div>
                </section>

                <section className="np-panel">
                  <div className="np-panel-heading">
                    <div>
                      <span className="np-overline">{t("admin_urgent")}</span>
                      <h2>{t("admin_required_approvals")}</h2>
                    </div>
                    <button type="button" className="np-text-link" onClick={() => selectTab("approvals")}>
                      {t("admin_view_all")} <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="np-admin-quick-action-list">
                    {approvals.filter((approval) => approval.status === "pending").slice(0, 3).map((approval) => (
                      <div className="np-admin-action-row" key={approval.id}>
                        <div className="np-action-info">
                          <strong>{approval.actionType} · {approval.requesterName}</strong>
                          <small>{t("admin_ref")} : {approval.targetRef} · {approval.reason}</small>
                        </div>
                        <div className="np-action-buttons">
                          <button type="button" className="np-btn-sm success" onClick={() => handleDecideApproval(approval.id, true)}><Check size={14} /> {t("admin_validate")}</button>
                          <button type="button" className="np-btn-sm danger" onClick={() => handleDecideApproval(approval.id, false)}><X size={14} /> {t("admin_reject")}</button>
                        </div>
                      </div>
                    ))}
                    {!approvals.some((approval) => approval.status === "pending") && <p className="np-admin-card-desc">{t("admin_no_pending_requests")}</p>}
                  </div>
                </section>

                <section className="np-panel">
                  <div className="np-panel-heading">
                    <div>
                      <span className="np-overline">{t("admin_cobac_compliance")}</span>
                      <h2>{t("admin_security_system_status")}</h2>
                    </div>
                    <ShieldCheck size={20} className="text-emerald-500" />
                  </div>

                  <div className="np-admin-checklist">
                    <div className="np-check-item">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <span>{(overview?.transactionsCount || 0).toLocaleString(language === "fr" ? "fr-FR" : "en-US")} {t("admin_transactions_recorded")}</span>
                    </div>
                    <div className="np-check-item">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <span>{t("admin_admin_actions_log_enabled")}</span>
                    </div>
                    <div className="np-check-item">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <span>{overview?.usersCount || 0} {t("admin_user_accounts_tracked")}</span>
                    </div>
                    <div className="np-check-item">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <span>{overview?.openTickets || 0} {t("admin_open_support_tickets")}</span>
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
                  <span className="np-overline">{t("admin_financial_journal")}</span>
                  <h2>{t("admin_recent_transactions")} ({transactions.length})</h2>
                  <p className="np-admin-card-desc">{t("admin_tx_journal_desc")}</p>
                </div>
                <div className="np-admin-head-right">
                  {(overview?.transactionReviews || 0) > 0 && <span className="np-badge warning">{overview.transactionReviews} {t("admin_to_review")}</span>}
                  <div className="np-admin-section-search">
                    <Search size={14} />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={t("admin_search_placeholder")}
                      aria-label={t("admin_global_search")}
                    />
                  </div>
                </div>
              </div>
              <div className="np-admin-table-wrap">
                <table className="np-admin-table">
                  <thead>
                    <tr><th>{t("admin_date_ref")}</th><th>{t("admin_client")}</th><th>{t("admin_operation")}</th><th>{t("admin_amount")}</th><th>{t("admin_state")}</th><th>{t("admin_admin_review")}</th><th>{t("admin_action")}</th></tr>
                  </thead>
                  <tbody>
                    {transactions.filter((tx) => !normalizedSearch || `${tx.publicRef} ${tx.userName} ${tx.userEmail} ${tx.type} ${tx.description}`.toLowerCase().includes(normalizedSearch)).map((tx) => (
                      <tr key={tx.id}>
                        <td><small>{new Date(tx.createdAt).toLocaleString(language === "fr" ? "fr-FR" : "en-US")}</small><code className="block">{tx.publicRef}</code></td>
                        <td><strong>{tx.userName}</strong><small className="block text-slate-500">{tx.userEmail}</small></td>
                        <td><strong>{tx.type}</strong><small className="block text-slate-500">{tx.description}</small></td>
                        <td><strong>{(() => { const m = money(convertAmount(tx.amountMinor / 100, tx.currency === "XAF" ? "XAF" : "USD", "XAF")); return `${m.n} ${m.u}`; })()}</strong></td>
                        <td><span className={"np-badge " + (tx.status === "succeeded" ? "success" : tx.status === "pending" ? "warning" : "danger")}>{tx.status}</span></td>
                        <td>
                          <span className={"np-badge " + (tx.reviewStatus === "open" ? "warning" : tx.reviewStatus === "resolved" ? "success" : "")}>
                            {tx.reviewStatus === "clear" ? t("admin_no_report") : tx.reviewStatus === "open" ? t("admin_to_examine") : t("admin_closed_review")}
                          </span>
                          {tx.reviewNote && <small className="block text-slate-500 max-w-48">{tx.reviewNote}</small>}
                        </td>
                        <td><button type="button" className={"np-btn-sm " + (tx.reviewStatus === "open" ? "success" : "outline")} onClick={() => handleReviewTransaction(tx)}>{tx.reviewStatus === "open" ? t("admin_close_review") : t("admin_flag")}</button></td>
                      </tr>
                    ))}
                    {transactions.length === 0 && <tr><td colSpan={7} className="text-center text-slate-500 py-8">{t("admin_no_transactions")}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "support" && (() => {
            const openCount = supportTickets.filter(tk => tk.status === "open").length;
            const inProgressCount = supportTickets.filter(tk => tk.status === "in_progress").length;
            const waitingClientCount = supportTickets.filter(tk => tk.status === "waiting_client").length;
            const resolvedCount = supportTickets.filter(tk => tk.status === "resolved" || tk.status === "closed").length;

            const filteredTickets = supportTickets.filter((tk) => {
              if (ticketFilterStatus !== "all" && tk.status !== ticketFilterStatus) return false;
              if (ticketFilterPriority !== "all" && tk.priority !== ticketFilterPriority) return false;
              if (ticketFilterCategory !== "all" && tk.category !== ticketFilterCategory) return false;
              if (ticketSearch.trim()) {
                const q = ticketSearch.trim().toLowerCase();
                const matches = (tk.publicRef + " " + tk.userName + " " + tk.userEmail + " " + tk.subject).toLowerCase().includes(q);
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
                      <span>{t("admin_total_claims")}</span>
                      <MessageSquare size={18} className="text-blue-600" />
                    </div>
                    <strong>{supportTickets.length}</strong>
                    <div className="np-admin-kpi-foot"><span>{t("admin_all_requests")}</span></div>
                  </article>
                  <article className="np-panel np-admin-kpi">
                    <div className="np-admin-kpi-header">
                      <span>{t("admin_new_tickets")}</span>
                      <Clock size={18} className="text-amber-500" />
                    </div>
                    <strong className="text-amber-600">{openCount}</strong>
                    <div className="np-admin-kpi-foot warning"><span>{t("admin_awaiting_handling")}</span></div>
                  </article>
                  <article className="np-panel np-admin-kpi">
                    <div className="np-admin-kpi-header">
                      <span>{t("admin_in_treatment")}</span>
                      <Activity size={18} className="text-indigo-600" />
                    </div>
                    <strong className="text-indigo-600">{inProgressCount}</strong>
                    <div className="np-admin-kpi-foot"><span>{t("admin_under_investigation")}</span></div>
                  </article>
                  <article className="np-panel np-admin-kpi">
                    <div className="np-admin-kpi-header">
                      <span>{t("admin_awaiting_client_response")}</span>
                      <UserCheck size={18} className="text-purple-600" />
                    </div>
                    <strong className="text-purple-600">{waitingClientCount}</strong>
                    <div className="np-admin-kpi-foot"><span>{t("admin_response_sent")}</span></div>
                  </article>
                  <article className="np-panel np-admin-kpi">
                    <div className="np-admin-kpi-header">
                      <span>{t("admin_resolved_closed")}</span>
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    </div>
                    <strong className="text-emerald-600">{resolvedCount}</strong>
                    <div className="np-admin-kpi-foot positive"><span>{t("admin_successfully_processed")}</span></div>
                  </article>
                </div>

                {/* Main Tickets Panel */}
                <div className="np-panel np-admin-table-panel">
                  <div className="np-panel-heading">
                    <div>
                      <span className="np-overline">{t("admin_support_center")}</span>
                      <h2>{t("admin_claims_management")} ({filteredTickets.length}/{supportTickets.length})</h2>
                    </div>
                    <button
                      type="button"
                      className="np-btn-sm outline flex items-center gap-1"
                      onClick={() => fetchSectionData("support")}
                    >
                      <RefreshCw size={13} />
                      <span>{t("admin_refresh")}</span>
                    </button>
                  </div>

                  {/* Toolbar & Filters */}
                  <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex-1 min-w-[240px] max-w-md relative">
                      <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        className="np-text-input pl-9 h-9 text-xs"
                        placeholder={t("admin_search_ticket")}
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
                        <option value="all">{t("admin_all_statuses")}</option>
                        <option value="open">{t("admin_new")} ({openCount})</option>
                        <option value="in_progress">{t("admin_in_progress")} ({inProgressCount})</option>
                        <option value="waiting_client">{t("admin_awaiting_client")} ({waitingClientCount})</option>
                        <option value="resolved">{t("admin_resolved")}</option>
                        <option value="closed">{t("admin_closed")}</option>
                      </select>
                      <select
                        className="np-text-input h-9 text-xs py-1 px-2.5"
                        value={ticketFilterPriority}
                        onChange={(e) => setTicketFilterPriority(e.target.value)}
                      >
                        <option value="all">{t("admin_all_priorities")}</option>
                        <option value="urgent">{t("admin_urgent_priority")}</option>
                        <option value="high">{t("admin_high_priority")}</option>
                        <option value="normal">{t("admin_normal_priority")}</option>
                        <option value="low">{t("admin_low_priority")}</option>
                      </select>
                      <select
                        className="np-text-input h-9 text-xs py-1 px-2.5"
                        value={ticketFilterCategory}
                        onChange={(e) => setTicketFilterCategory(e.target.value)}
                      >
                        <option value="all">{t("admin_all_categories")}</option>
                        <option value="card">{t("admin_cat_card")}</option>
                        <option value="payment">{t("admin_cat_payment")}</option>
                        <option value="balance">{t("admin_cat_balance")}</option>
                        <option value="transaction">{t("admin_cat_transaction")}</option>
                        <option value="funding">{t("admin_cat_funding")}</option>
                        <option value="transfer">{t("admin_cat_transfer")}</option>
                        <option value="shop">{t("admin_cat_shop")}</option>
                        <option value="security">{t("admin_cat_security")}</option>
                        <option value="other">{t("admin_cat_other")}</option>
                      </select>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="np-admin-table-wrap">
                    <table className="np-admin-table">
                      <thead>
                        <tr>
                          <th>{t("admin_ref_date")}</th>
                          <th>{t("admin_client")}</th>
                          <th>{t("admin_request_subject")}</th>
                          <th>{t("admin_priority")}</th>
                          <th>{t("admin_status")}</th>
                          <th>{t("admin_actions")}</th>
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
                                  {new Date(ticket.createdAt).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", {
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
                                  {ticket.category}{ticket.transactionRef ? ` · ${t("admin_ref")} : ${ticket.transactionRef}` : ""}
                                </small>
                                <p className="text-xs text-slate-600 line-clamp-1 max-w-xs">{ticket.message}</p>
                              </td>
                              <td>
                                <span className={"np-badge " + (isUrgent ? "warning font-bold" : "")}>
                                  {ticket.priority === "urgent" ? t("admin_urgent_priority") : ticket.priority === "high" ? t("admin_high_priority") : ticket.priority === "low" ? t("admin_low_priority") : t("admin_normal_priority")}
                                </span>
                              </td>
                              <td>
                                <span className={"np-badge " + (isDone ? "success" : ticket.status === "open" ? "warning" : ticket.status === "waiting_client" ? "info" : "")}>
                                  {ticket.status === "open" ? t("admin_new") : ticket.status === "in_progress" ? t("admin_in_progress") : ticket.status === "waiting_client" ? t("admin_awaiting_client") : ticket.status === "resolved" ? t("admin_resolved") : t("admin_closed")}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="np-btn-sm success flex items-center gap-1.5 font-bold"
                                  onClick={() => setSelectedTicket(ticket)}
                                >
                                  <MessageSquare size={13} />
                                  <span>{t("admin_manage_reply")}</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredTickets.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center text-slate-500 py-12">
                              <MessageSquare size={28} className="mx-auto text-slate-300 mb-2" />
                              <p>{t("admin_no_tickets_match")}</p>
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
                              <span className="text-xs text-slate-500">{t("admin_ref")} Tx : {selectedTicket.transactionRef}</span>
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
                          aria-label={t("adm_close")}
                        >
                          <X size={18} />
                        </button>
                      </header>

                      {/* Ticket Body / Conversation History */}
                      <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/30 text-xs">
                        {/* Status & Priority Control Row */}
                        <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">{t("admin_ticket_status")} :</span>
                            <select
                              className="np-text-input h-8 text-xs py-0.5 px-2 font-bold"
                              value={selectedTicket.status}
                              onChange={(e) => handleAdminTicketStatusChange(selectedTicket.id, e.target.value)}
                            >
                              <option value="open">{t("admin_new_open")}</option>
                              <option value="in_progress">{t("admin_being_processed")}</option>
                              <option value="waiting_client">{t("admin_awaiting_client_reply")}</option>
                              <option value="resolved">{t("admin_resolved")}</option>
                              <option value="closed">{t("admin_closed_ticket")}</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">{t("admin_priority_label")} :</span>
                            <select
                              className="np-text-input h-8 text-xs py-0.5 px-2 font-bold"
                              value={selectedTicket.priority || "normal"}
                              onChange={(e) => handleAdminTicketStatusChange(selectedTicket.id, selectedTicket.status, e.target.value)}
                            >
                              <option value="low">{t("admin_low_priority")}</option>
                              <option value="normal">{t("admin_normal_priority")}</option>
                              <option value="high">{t("admin_high_priority")}</option>
                              <option value="urgent">{t("admin_urgent_priority")}</option>
                            </select>
                          </div>
                        </div>

                        {/* Resolution if present */}
                        {selectedTicket.resolution && (
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                            <div className="flex items-center gap-1.5 font-bold mb-1">
                              <CheckCircle2 size={15} className="text-emerald-600" />
                              <span>{t("admin_resolution_recorded")}</span>
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
                              {new Date(selectedTicket.createdAt).toLocaleString(language === "fr" ? "fr-FR" : "en-US")}
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
                                    <Lock size={12} /> {t("admin_internal_note")} · {m.senderName}
                                  </span>
                                  <span>{new Date(m.createdAt).toLocaleString(language === "fr" ? "fr-FR" : "en-US")}</span>
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
                                <span className="text-[11px]">{new Date(m.createdAt).toLocaleString(language === "fr" ? "fr-FR" : "en-US")}</span>
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
                          placeholder={adminReplyIsInternal ? t("admin_internal_note_placeholder") : t("admin_official_reply_placeholder")}
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
                            <span>{t("admin_internal_note_checkbox")}</span>
                          </label>

                          {!adminReplyIsInternal && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">{t("admin_after_send")}</span>
                              <select
                                className="np-text-input h-8 text-xs py-0.5 px-2"
                                value={adminReplyNextStatus}
                                onChange={(e) => setAdminReplyNextStatus(e.target.value)}
                              >
                                <option value="waiting_client">{t("admin_awaiting_client")}</option>
                                <option value="in_progress">{t("admin_being_processed")}</option>
                                <option value="resolved">{t("admin_mark_resolved")}</option>
                                <option value="closed">{t("admin_close_ticket")}</option>
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
                            <span>{adminReplyIsInternal ? t("admin_save_internal_note") : t("admin_send_reply")}</span>
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
                    <span>{t("admin_total_reviews")}</span>
                    <MessageSquare size={18} className="text-blue-600" />
                  </div>
                  <strong>{reviews.length}</strong>
                  <div className="np-admin-kpi-foot">
                    <span>{t("admin_reviews_in_db")}</span>
                  </div>
                </article>

                <article className="np-panel np-admin-kpi">
                  <div className="np-admin-kpi-header">
                    <span>{t("admin_avg_rating")}</span>
                    <Star size={18} className="text-amber-500 fill-amber-500" />
                  </div>
                  <strong className="text-amber-500">
                    {reviews.length > 0
                      ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1)
                      : "5.0"} <small>/ 5.0</small>
                  </strong>
                  <div className="np-admin-kpi-foot positive">
                    <TrendingUp size={13} />
                    <span>99.4% {t("admin_satisfaction_certified")}</span>
                  </div>
                </article>

                <article className="np-panel np-admin-kpi">
                  <div className="np-admin-kpi-header">
                    <span>{t("admin_approved_online")}</span>
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  </div>
                  <strong className="text-emerald-600">
                    {reviews.filter((r) => r.status === "approved").length}
                  </strong>
                  <div className="np-admin-kpi-foot">
                    <span>{t("admin_visible_landing")}</span>
                  </div>
                </article>

                <article className="np-panel np-admin-kpi">
                  <div className="np-admin-kpi-header">
                    <span>{t("admin_pending_moderation")}</span>
                    <Clock size={18} className="text-indigo-600" />
                  </div>
                  <strong className="text-indigo-600">
                    {reviews.filter((r) => r.status === "pending").length}
                  </strong>
                  <div className="np-admin-kpi-foot">
                    <span>{t("admin_to_verify_team")}</span>
                  </div>
                </article>
              </div>

              {/* Table des avis */}
              <div className="np-panel np-admin-table-panel">
                <div className="np-panel-heading flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <span className="np-overline">{t("admin_moderation_social")}</span>
                    <h2>{t("admin_reviews_testimonials")} ({reviews.length})</h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex bg-slate-800/60 p-1 rounded-lg border border-slate-700/60 text-xs">
                      <button
                        type="button"
                        className={"px-3 py-1 rounded-md font-medium transition-colors " + (reviewFilter === "all" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white")}
                        onClick={() => setReviewFilter("all")}
                      >
                        {t("admin_all")} ({reviews.length})
                      </button>
                      <button
                        type="button"
                        className={"px-3 py-1 rounded-md font-medium transition-colors " + (reviewFilter === "approved" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white")}
                        onClick={() => setReviewFilter("approved")}
                      >
                        {t("admin_approved")} ({reviews.filter((r) => r.status === "approved").length})
                      </button>
                      <button
                        type="button"
                        className={"px-3 py-1 rounded-md font-medium transition-colors " + (reviewFilter === "pending" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white")}
                        onClick={() => setReviewFilter("pending")}
                      >
                        {t("admin_pending")} ({reviews.filter((r) => r.status === "pending").length})
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddReviewModal(true)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Plus size={15} />
                      <span>{t("admin_add_verified_review")}</span>
                    </button>
                  </div>
                </div>

                <div className="np-admin-table-wrap">
                  <table className="np-admin-table">
                    <thead>
                      <tr>
                        <th>{t("admin_id")}</th>
                        <th>{t("admin_client_location")}</th>
                        <th>{t("admin_rating")}</th>
                        <th>{t("admin_service")}</th>
                        <th>{t("admin_comment")}</th>
                        <th>{t("admin_status")}</th>
                        <th>{t("admin_date")}</th>
                        <th>{t("admin_moderation_actions")}</th>
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
                                  ? t("admin_approved")
                                  : rev.status === "pending"
                                  ? t("admin_pending")
                                  : t("admin_reject")}
                              </span>
                            </td>
                            <td>
                              <small className="text-slate-400">
                                {new Date(rev.createdAt).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US")}
                              </small>
                            </td>
                            <td>
                              <div className="flex items-center gap-1.5">
                                {rev.status !== "approved" && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateReview(rev.id, "approved")}
                                    className="np-btn-sm success"
                                    title={t("adm_publish_landing")}
                                  >
                                    {t("admin_approve")}
                                  </button>
                                )}
                                {rev.status === "approved" && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateReview(rev.id, "rejected")}
                                    className="np-btn-sm warning"
                                    title={t("adm_hide_landing")}
                                  >
                                    {t("admin_hide")}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReview(rev.id)}
                                  className="np-btn-sm danger"
                                  title={t("adm_delete_permanently")}
                                >
                                  {t("admin_delete")}
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

                    <h3 className="text-lg font-bold text-white mb-1">{t("admin_add_official_review")}</h3>
                    <p className="text-xs text-slate-400 mb-4">
                      {t("admin_review_badge_desc")}
                    </p>

                    <form onSubmit={handleCreateAdminReview} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            {t("admin_client_name")}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={t("adm_ph_author_name")}
                            value={newReviewForm.authorName}
                            onChange={(e) => setNewReviewForm({ ...newReviewForm, authorName: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            {t("admin_city_country")}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={t("adm_ph_author_location")}
                            value={newReviewForm.authorLocation}
                            onChange={(e) => setNewReviewForm({ ...newReviewForm, authorLocation: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            {t("admin_rating_given")}
                          </label>
                          <select
                            value={newReviewForm.rating}
                            onChange={(e) => setNewReviewForm({ ...newReviewForm, rating: Number(e.target.value) })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                          >
                            <option value={5}>{t("adm_rating_5")}</option>
                            <option value={4}>{t("adm_rating_4")}</option>
                            <option value={3}>{t("adm_rating_3")}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            {t("admin_service_used")}
                          </label>
                          <select
                            value={newReviewForm.serviceTag}
                            onChange={(e) => setNewReviewForm({ ...newReviewForm, serviceTag: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                          >
                            <option value="Carte Mastercard USD">{t("adm_svc_mastercard")}</option>
                            <option value="Carte Visa USD">{t("adm_svc_visa")}</option>
                            <option value="Pièces TikTok">{t("adm_svc_tiktok")}</option>
                            <option value="Gaming & Free Fire">{t("adm_svc_gaming")}</option>
                            <option value="Transferts P2P">{t("adm_svc_p2p")}</option>
                            <option value="Abonnements Streaming">{t("adm_svc_streaming")}</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {t("admin_client_testimonial")}
                        </label>
                        <textarea
                          rows={3}
                          required
                          placeholder={t("admin_testimonial_placeholder")}
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
                          {t("admin_cancel")}
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
                        >
                          {t("admin_save_publish")}
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
                  <span className="np-overline">{t("admin_directory")}</span>
                  <h2>{t("admin_registered_users")} ({users.length})</h2>
                </div>
                <div className="np-admin-section-search">
                  <Search size={14} />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={t("admin_search_placeholder")}
                    aria-label={t("admin_global_search")}
                  />
                </div>
              </div>

              <div className="np-admin-table-wrap">
                <table className="np-admin-table np-admin-table--cards">
                  <thead>
                    <tr>
                      <th>{t("admin_id")}</th>
                      <th>{t("admin_name_contacts")}</th>
                      <th>{t("admin_role")}</th>
                      <th>{t("admin_wallet_balance")}</th>
                      <th>{t("admin_kyc_status")}</th>
                      <th>{t("admin_account_state")}</th>
                      <th>{t("admin_wallet")}</th>
                      <th>{t("admin_actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter((u) => !normalizedSearch || `${u.name} ${u.email} ${u.phone} #${u.id}`.toLowerCase().includes(normalizedSearch)).map((u) => (
                      <tr key={u.id}>
                        <td data-label={t("admin_id")}><strong>#{u.id}</strong></td>
                        <td data-label={t("admin_name_contacts")}>
                          <strong>{u.name}</strong>
                          <div className="text-xs text-slate-500">{u.email} • {u.phone}</div>
                        </td>
                        <td data-label={t("admin_role")}>
                          <span className={"np-role-badge " + (u.role)}>{u.role}</span>
                        </td>
                        <td data-label={t("admin_wallet_balance")}>
                          <strong>{money(u.balanceXaf || 0).n} {money(u.balanceXaf || 0).u}</strong>
                        </td>
                        <td data-label={t("admin_kyc_status")}>
                          <span className={"np-badge " + (u.kycStatus === "approved" ? "success" : u.kycStatus === "pending" ? "warning" : "danger")}>
                            {u.kycStatus}
                          </span>
                        </td>
                        <td data-label={t("admin_account_state")}>
                          <span className={"np-status-dot " + (u.status === "active" ? "active" : "inactive")} />
                          <span className="capitalize text-xs">{u.status}</span>
                        </td>
                        <td data-label={t("admin_wallet")}><span className={"np-badge " + (u.walletStatus === "frozen" ? "danger" : "success")}>{u.walletStatus === "frozen" ? t("admin_frozen") : t("admin_active")}</span></td>
                        <td className="np-admin-cell-actions" data-label={t("admin_actions")}>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="np-btn-sm outline" onClick={() => handleUpdateUserStatus(u.id, u.status)}>
                              {u.status === "active" ? t("admin_suspend") : t("admin_activate")}
                            </button>
                            <button type="button" className="np-btn-sm outline" onClick={() => handleToggleWallet(u)}>
                              {u.walletStatus === "frozen" ? t("admin_unfreeze") : t("admin_freeze_balance")}
                            </button>
                            {adminIdentity?.role === "super_admin" && (
                              <button type="button" className="np-btn-sm outline" onClick={() => { setAdjustModal({ open: true, user: u }); setAdjustDir("credit"); setAdjustAmount(""); setAdjustReason(""); }}>
                                {t("admin_adjust")}
                              </button>
                            )}
                            {adminIdentity?.role === "super_admin" && u.status === "active" && (
                              <button type="button" className="np-btn-sm outline" onClick={async () => {
                                if (!confirm(t("adm_confirm_impersonate").replace("{name}", String(u.name)).replace("{email}", String(u.email)))) return;
                                try {
                                  const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "impersonate_user", userId: u.id }) });
                                  const data = await res.json();
                                  if (data.success) { window.location.href = "/dashboard"; }
                                  else { showNotification(data.error || t("adm_err_impersonation")); }
                                } catch { showNotification(t("adm_err_connection")); }
                              }}>
                                {t("admin_login_as")}
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
                  <span className="np-overline">{t("admin_privileged_access")}</span>
                  <h2>{t("admin_administrators")} ({adminAccounts.length})</h2>
                  <p className="np-admin-card-desc">{t("admin_admin_rights_desc")}</p>
                </div>
                <button type="button" className="np-btn-sm success" onClick={() => setShowAddAdminForm((open) => !open)}>
                  <Plus size={14} /> {t("admin_add_access")}
                </button>
              </div>
              {showAddAdminForm && (
                <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 mb-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <label className="text-xs font-semibold text-slate-600">{t("admin_name")}
                    <input required maxLength={100} value={newAdminForm.name} onChange={(event) => setNewAdminForm({ ...newAdminForm, name: event.target.value })} className="mt-1 w-full border border-slate-200 rounded-md p-2 bg-white" />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">{t("admin_email")}
                    <input required type="email" maxLength={254} value={newAdminForm.email} onChange={(event) => setNewAdminForm({ ...newAdminForm, email: event.target.value })} className="mt-1 w-full border border-slate-200 rounded-md p-2 bg-white" />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">{t("admin_phone_optional")}
                    <input value={newAdminForm.phone} onChange={(event) => setNewAdminForm({ ...newAdminForm, phone: event.target.value })} className="mt-1 w-full border border-slate-200 rounded-md p-2 bg-white" />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">{t("admin_admin_role")}
                    <select value={newAdminForm.role} onChange={(event) => setNewAdminForm({ ...newAdminForm, role: event.target.value })} className="mt-1 w-full border border-slate-200 rounded-md p-2 bg-white">
                      <option value="operator">{t("admin_role_support")}</option>
                      <option value="compliance">{t("admin_role_compliance")}</option>
                      <option value="super_admin">{t("admin_role_super_admin")}</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-600 md:col-span-2">{t("admin_initial_password")}
                    <input required type="password" minLength={10} maxLength={200} autoComplete="new-password" value={newAdminForm.password} onChange={(event) => setNewAdminForm({ ...newAdminForm, password: event.target.value })} className="mt-1 w-full border border-slate-200 rounded-md p-2 bg-white" />
                  </label>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <button type="button" className="np-btn-sm outline" onClick={() => setShowAddAdminForm(false)}>{t("admin_cancel")}</button>
                    <button type="submit" className="np-btn-sm success">{t("admin_create_account")}</button>
                  </div>
                </form>
              )}
              <div className="np-admin-table-wrap">
                <table className="np-admin-table">
                  <thead><tr><th>{t("admin_administrator")}</th><th>{t("admin_role")}</th><th>{t("admin_rights")}</th><th>{t("admin_status")}</th><th>{t("admin_last_login")}</th><th>{t("admin_actions")}</th></tr></thead>
                  <tbody>
                    {adminAccounts.map((account) => (
                      <tr key={account.id}>
                        <td><strong>{account.name}</strong><small className="block text-slate-500">{account.email}</small></td>
                        <td>
                          <select value={account.role} onChange={(event) => handleUpdateAdmin(account, { role: event.target.value })} className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs">
                            <option value="super_admin">{t("admin_role_super_admin")}</option>
                            <option value="compliance">{t("admin_role_compliance")}</option>
                            <option value="operator">{t("admin_role_support")}</option>
                          </select>
                        </td>
                        <td><code>{account.permissions}</code></td>
                        <td><span className={"np-badge " + (account.status === "active" ? "success" : "danger")}>{account.status}</span></td>
                        <td><small>{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString(language === "fr" ? "fr-FR" : "en-US") : t("admin_never")}</small></td>
                        <td><div className="flex flex-wrap gap-2">
                          <button type="button" className={"np-btn-sm " + (account.status === "active" ? "danger" : "success")} onClick={() => handleUpdateAdmin(account, { status: account.status === "active" ? "suspended" : "active" })}>{account.status === "active" ? t("admin_suspend") : t("admin_reactivate")}</button>
                          <button type="button" className="np-btn-sm outline" onClick={() => handleResetAdminPassword(account)}>{t("admin_reset_password")}</button>
                        </div></td>
                      </tr>
                    ))}
                    {adminAccounts.length === 0 && <tr><td colSpan={6} className="text-center text-slate-500 py-8">{t("admin_no_admin_accounts")}</td></tr>}
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
                  <span className="np-overline">{t("admin_workflow")}</span>
                  <h2>{t("admin_approval_requests_title")} ({approvals.length})</h2>
                  <p className="np-admin-card-desc">{t("admin_approval_desc")}</p>
                </div>
              </div>

              <div className="np-admin-table-wrap">
                <table className="np-admin-table">
                  <thead>
                    <tr>
                      <th>{t("admin_request_ref")}</th>
                      <th>{t("admin_requester")}</th>
                      <th>{t("admin_action_type")}</th>
                      <th>{t("admin_target")}</th>
                      <th>{t("admin_amount")}</th>
                      <th>{t("admin_reason_justification")}</th>
                      <th>{t("admin_status")}</th>
                      <th>{t("admin_decision")}</th>
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
                        <td><span className="np-action-tag">{a.actionType === "deposit_funding" ? t("admin_deposit_verification") : a.actionType === "withdrawal_payout" ? t("admin_withdrawal_payment") : a.actionType}</span></td>
                        <td><code>{a.targetRef}</code></td>
                        <td>{a.amountXaf ? <strong>{money(a.amountXaf).n} {money(a.amountXaf).u}</strong> : <span className="text-slate-400">-</span>}</td>
                        <td><span className="text-xs text-slate-700">{a.reason}</span></td>
                        <td>
                          <span className={"np-badge " + (a.status === "approved" ? "success" : a.status === "pending" ? "warning" : "danger")}>
                            {a.status === "approved" ? t("admin_approved_status") : a.status === "pending" ? t("admin_pending_status") : t("admin_rejected_status")}
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
                                {t("admin_validate")}
                              </button>
                              <button
                                type="button"
                                className="np-btn-sm danger"
                                onClick={() => handleDecideApproval(a.id, false)}
                              >
                                {t("admin_reject")}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">{t("admin_processed")}</span>
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
                  <span className="np-overline">{t("admin_compliance")}</span>
                  <h2>{t("admin_kyc_verification")} ({kycCases.length})</h2>
                </div>
              </div>

              <div className="np-admin-table-wrap">
                <table className="np-admin-table">
                  <thead>
                    <tr>
                      <th>{t("admin_kyc_ref")}</th>
                      <th>{t("admin_client")}</th>
                      <th>{t("admin_phone")}</th>
                      <th>{t("admin_kyc_reason")}</th>
                      <th>{t("admin_status")}</th>
                      <th>{t("admin_date")}</th>
                      <th>{t("admin_actions")}</th>
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
                        <td><small>{new Date(k.createdAt).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US")}</small></td>
                        <td>
                          {k.status === "pending" ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="np-btn-sm success"
                                onClick={() => handleReviewKyc(k.id, true)}
                              >
                                {t("admin_approve")}
                              </button>
                              <button
                                type="button"
                                className="np-btn-sm danger"
                                onClick={() => handleReviewKyc(k.id, false)}
                              >
                                {t("admin_reject")}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">{t("admin_filed")}</span>
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
                  <span className="np-overline">{t("admin_issued_fleet")}</span>
                  <h2>{t("admin_virtual_bank_cards")} ({cards.length})</h2>
                </div>
              </div>

              <div className="np-admin-table-wrap">
                <table className="np-admin-table">
                  <thead>
                    <tr>
                      <th>{t("admin_id")}</th>
                      <th>{t("admin_holder")}</th>
                      <th>{t("admin_card_label")}</th>
                      <th>{t("admin_masked_number")}</th>
                      <th>{t("admin_type")}</th>
                      <th>{t("admin_current_balance")}</th>
                      <th>{t("admin_state")}</th>
                      <th>{t("admin_action")}</th>
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
                            {c.status === "active" ? t("admin_freeze_card") : t("admin_unblock_card")}
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
                  <span className="np-overline">{t("admin_audit_trail")}</span>
                  <h2>{t("admin_events_admin_actions")} ({auditLogs.length})</h2>
                </div>
              </div>

              <div className="np-admin-table-wrap">
                <table className="np-admin-table">
                  <thead>
                    <tr>
                      <th>{t("admin_date_time")}</th>
                      <th>{t("admin_actor")}</th>
                      <th>{t("admin_role")}</th>
                      <th>{t("admin_action")}</th>
                      <th>{t("admin_target")}</th>
                      <th>{t("admin_reason")}</th>
                      <th>Request ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td><small>{new Date(log.createdAt).toLocaleString(language === "fr" ? "fr-FR" : "en-US")}</small></td>
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
                  <span className="np-overline">{t("admin_affiliates_partners")}</span>
                  <h2>{t("admin_resellers_program")} ({resellers.length})</h2>
                  <p className="np-admin-card-desc">{t("admin_resellers_desc")}</p>
                </div>
              </div>
              <div className="np-admin-table-wrap">
                <table className="np-admin-table">
                  <thead>
                    <tr>
                      <th>{t("admin_reseller")}</th>
                      <th>{t("admin_referral_code")}</th>
                      <th>{t("admin_commission_rate")}</th>
                      <th>{t("admin_referrals_count")}</th>
                      <th>{t("admin_total_earned")}</th>
                      <th>{t("admin_status")}</th>
                      <th>{t("admin_actions")}</th>
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
                        <td><strong>{money(r.totalEarnedXaf).n} {money(r.totalEarnedXaf).u}</strong></td>
                        <td><span className={"np-badge " + (r.status === "active" ? "success" : "danger")}>{r.status}</span></td>
                        <td>
                          <button type="button" className="np-btn-sm outline" onClick={() => handleUpdateResellerRate(r.id, r.commissionRate)}>
                            {t("admin_modify_rate")}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {resellers.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-slate-500 py-6">{t("admin_no_resellers")}</td></tr>
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
                    <span className="np-overline">{t("admin_mass_broadcast")}</span>
                    <h2>{t("admin_new_push_announcement")}</h2>
                  </div>
                </div>
                <form onSubmit={handleSendPushAnnouncement} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">{t("admin_announcement_title")}</label>
                      <input
                        type="text"
                        className="np-text-input w-full"
                        placeholder={t("adm_ph_announcement_title")}
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                        required
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">{t("admin_target_audience")}</label>
                      <select
                        className="np-text-input w-full"
                        value={newAnnouncement.targetAudience}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, targetAudience: e.target.value })}
                      >
                        <option value="all">{t("adm_audience_all_active")}</option>
                        <option value="verified">{t("adm_audience_kyc_verified")}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">{t("adm_message_label")}</label>
                    <textarea
                      className="np-text-input w-full"
                      rows={3}
                      placeholder={t("adm_ph_notification_content")}
                      value={newAnnouncement.message}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                      required
                      maxLength={500}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="np-btn-sm success" disabled={sendingAnnouncement}>
                      <Send size={14} />
                      <span>{sendingAnnouncement ? t("adm_broadcasting") : t("adm_broadcast_push")}</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="np-panel np-admin-table-panel">
                <div className="np-panel-heading">
                  <div>
                    <span className="np-overline">{t("adm_history")}</span>
                    <h2>{t("adm_announcements_sent_title")} ({announcements.length})</h2>
                  </div>
                </div>
                <div className="np-admin-table-wrap">
                  <table className="np-admin-table">
                    <thead>
                      <tr>
                        <th>{t("adm_th_date")}</th>
                        <th>{t("adm_th_title")}</th>
                        <th>{t("adm_th_message")}</th>
                        <th>{t("adm_th_audience")}</th>
                        <th>{t("adm_th_recipients")}</th>
                        <th>{t("adm_th_status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {announcements.map((a) => (
                        <tr key={a.id}>
                          <td><small>{new Date(a.created_at).toLocaleString(language === "fr" ? "fr-FR" : "en-US")}</small></td>
                          <td><strong>{a.title}</strong></td>
                          <td><span className="text-xs text-slate-300">{a.message}</span></td>
                          <td><code>{a.target_audience}</code></td>
                          <td><span className="np-badge success">{t("adm_received_count").replace("{n}", String(a.sent_count))}</span></td>
                          <td><span className="np-badge success">{a.status}</span></td>
                        </tr>
                      ))}
                      {announcements.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-slate-500 py-6">{t("adm_no_announcements")}</td></tr>
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
                    <span className="np-overline">{t("adm_marketing_banners")}</span>
                    <h2>{t("adm_add_promo_banner")}</h2>
                  </div>
                </div>
                <form onSubmit={handleSaveAd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">{t("adm_campaign_title")}</label>
                    <input
                      type="text"
                      className="np-text-input w-full"
                      placeholder={t("adm_ph_campaign_title")}
                      value={newAd.title}
                      onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                      required
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">{t("adm_destination_link")}</label>
                    <input
                      type="text"
                      className="np-text-input w-full"
                      placeholder={t("adm_ph_destination_link")}
                      value={newAd.linkUrl}
                      onChange={(e) => setNewAd({ ...newAd, linkUrl: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-400 block mb-1">{t("adm_description_tagline")}</label>
                    <input
                      type="text"
                      className="np-text-input w-full"
                      placeholder={t("adm_ph_banner_description")}
                      value={newAd.description}
                      onChange={(e) => setNewAd({ ...newAd, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">{t("adm_image_url_optional")}</label>
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
                      <span>{savingAd ? t("adm_saving") : t("adm_publish_banner")}</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="np-panel np-admin-table-panel">
                <div className="np-panel-heading">
                  <div>
                    <span className="np-overline">{t("adm_active_campaigns")}</span>
                    <h2>{t("adm_banners_ads_title")} ({ads.length})</h2>
                  </div>
                </div>
                <div className="np-admin-table-wrap">
                  <table className="np-admin-table">
                    <thead>
                      <tr>
                        <th>{t("adm_th_title")}</th>
                        <th>{t("adm_th_description")}</th>
                        <th>{t("adm_th_link")}</th>
                        <th>{t("adm_th_status")}</th>
                        <th>{t("adm_th_actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ads.map((ad) => (
                        <tr key={ad.id}>
                          <td><strong>{ad.title}</strong></td>
                          <td><span className="text-xs text-slate-300">{ad.description || "—"}</span></td>
                          <td><code>{ad.link_url || "—"}</code></td>
                          <td><span className={"np-badge " + (ad.is_active ? "success" : "default")}>{ad.is_active ? t("adm_active_status") : t("adm_disabled_status")}</span></td>
                          <td>
                            <button type="button" className="np-btn-sm danger" onClick={() => handleDeleteAd(ad.id)}>
                              {t("adm_delete_btn")}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {ads.length === 0 && (
                        <tr><td colSpan={5} className="text-center text-slate-500 py-6">{t("adm_no_banners")}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "fees" && (
            <AdminFees key={refreshKey} adminId={adminIdentity?.id || 0} />
          )}

          {activeTab === "revenue" && (
            <AdminRevenue key={refreshKey} />
          )}

          {activeTab === "analytics" && (
            <AdminAnalytics key={refreshKey} />
          )}

          {activeTab === "integrations" && (
            <AdminIntegrations key={refreshKey} />
          )}

          {activeTab === "advanced" && (
            <AdminAdvanced key={refreshKey} adminId={adminIdentity?.id || 0} />
          )}

          {activeTab === "activities" && (
            <AdminActivities key={refreshKey} />
          )}

          {activeTab === "marketplace" && (
            <AdminMarketplace key={refreshKey} adminId={adminIdentity?.id || 0} />
          )}

          {activeTab === "user_shops" && (
            <AdminShops key={refreshKey} />
          )}

          {activeTab === "security" && (
            <AdminSecurity key={refreshKey} />
          )}

          {activeTab === "communication" && (
            <AdminCommunication key={refreshKey} />
          )}

          {activeTab === "extras" && (
            <AdminExtras key={refreshKey} />
          )}

          {activeTab === "settings" && (
            <div className="np-admin-settings-layout">
              <section className="np-panel np-admin-appearance-panel">
                <div className="np-panel-heading">
                  <div>
                    <span className="np-overline">{t("adm_appearance_overline")}</span>
                    <h2>{t("adm_appearance_title")}</h2>
                    <p className="np-admin-card-desc">{t("adm_appearance_desc")}</p>
                  </div>
                </div>
                <div className="np-admin-pref-grid">
                  <div className="np-admin-pref-row">
                    <div className="np-admin-pref-label">
                      <strong>{t("adm_theme_label")}</strong>
                      <small>{t("adm_theme_desc")}</small>
                    </div>
                    <ThemeToggleButton />
                  </div>
                  <div className="np-admin-pref-row">
                    <div className="np-admin-pref-label">
                      <strong>{t("adm_language_label")}</strong>
                      <small>{t("adm_language_desc")}</small>
                    </div>
                    <LanguageSelector />
                  </div>
                </div>
              </section>

              <section className="np-panel">
                <div className="np-panel-heading">
                  <div>
                    <span className="np-overline">{t("adm_rates_commissions")}</span>
                    <h2>{t("adm_platform_financial_settings")}</h2>
                  </div>
                </div>

                <div className="np-admin-settings-grid">
                  <div className="np-setting-box">
                    <strong>{t("adm_pivot_rate")}</strong>
                    <p>{t("adm_pivot_rate_desc")}</p>
                    <div className="np-setting-val">
                      <span>1 USD = </span>
                      <b>{appSettings?.exchange_rate_usd_xaf?.rate || 610.0} FCFA</b>
                    </div>
                  </div>

                  <div className="np-setting-box">
                    <strong>{t("adm_daily_transfer_limit")}</strong>
                    <p>{t("adm_daily_transfer_limit_desc")}</p>
                    <form onSubmit={handleSaveDailyLimit} className="np-setting-val is-editable">
                      <label className="sr-only" htmlFor="admin-daily-transfer-limit">{t("adm_daily_limit_fcfa")}</label>
                      <input id="admin-daily-transfer-limit" type="number" min={5000} max={5000000} step={1000} required value={dailyLimitInput} onChange={(event) => setDailyLimitInput(event.target.value)} />
                      <b>FCFA</b>
                      <button type="submit" className="np-btn-sm success" disabled={savingDailyLimit}>{savingDailyLimit ? t("adm_saving") : t("adm_save")}</button>
                    </form>
                    <small>{t("adm_allowed_value_range")}</small>
                  </div>

                  <div className="np-setting-box">
                    <strong>{t("adm_mobile_money_fees")}</strong>
                    <p>{t("adm_mobile_money_fees_desc")}</p>
                    <form className="np-fees-table" onSubmit={handleSaveMobileFees}>
                      {([
                        ["orange", "Orange Money"],
                        ["mtn", "MTN Mobile Money"],
                        ["wave", "Wave Mobile"],
                        ["card", t("adm_bank_card")],
                        ["bank", t("adm_bank_transfer")],
                      ] as const).map(([provider, label]) => (
                        <label key={provider}>
                          <span>{label}</span>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.01}
                            required
                            aria-label={t("adm_commission_aria").replace("{x}", label)}
                            value={mobileFeesInput[provider]}
                            onChange={(event) => setMobileFeesInput((current) => ({ ...current, [provider]: event.target.value }))}
                          />
                          <b>%</b>
                        </label>
                      ))}
                      <button type="submit" className="np-btn-sm success" disabled={savingMobileFees}>
                        {savingMobileFees ? t("adm_saving") : t("adm_save_commissions")}
                      </button>
                    </form>
                    <small>{t("adm_each_rate_rule")}</small>
                  </div>
                </div>
              </section>

              <section className="np-panel">
                <div className="np-panel-heading">
                  <div>
                    <span className="np-overline">{t("adm_service_continuity")}</span>
                    <h2>{t("adm_maintenance_mode")}</h2>
                    <p className="np-admin-card-desc">{t("adm_maintenance_mode_desc")}</p>
                  </div>
                  <span className={"np-badge " + (maintenanceEnabled ? "warning" : "success")}>
                    {maintenanceEnabled ? t("adm_maintenance_active") : t("adm_platform_available")}
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
                    <b>{t("adm_enable_maintenance")}</b>
                  </label>
                  <label>
                    <span>{t("adm_message_to_clients")}</span>
                    <textarea
                      value={maintenanceMessage}
                      maxLength={180}
                      onChange={(event) => setMaintenanceMessage(event.target.value)}
                      placeholder={t("adm_maintenance_default_msg")}
                    />
                  </label>
                  <div className="np-admin-maintenance-actions">
                    <small>{t("adm_change_immediate")}</small>
                    <button type="submit" className="np-primary-btn" disabled={savingMaintenance}>
                      {savingMaintenance ? t("adm_saving") : t("adm_save_status")}
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
              <div><span className="text-[10px] font-semibold tracking-widest text-emerald-400">{t("adm_admin_security")}</span><h2 id="admin-password-reset-title" className="mt-1 text-lg font-bold">{t("adm_change_password")}</h2><p className="mt-1 text-xs text-slate-400">{t("adm_account_label")} {passwordResetTarget.email}</p></div>
              <button type="button" aria-label={t("adm_close")} onClick={() => setPasswordResetTarget(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
              <label className="block text-xs font-medium text-slate-300" htmlFor="admin-new-password">{t("adm_new_password_label")}
                <input id="admin-new-password" type="password" required minLength={10} maxLength={200} autoComplete="new-password" autoFocus value={passwordResetValue} onChange={(event) => setPasswordResetValue(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none" />
              </label>
              <div className="flex justify-end gap-2"><button type="button" className="np-btn-sm outline" onClick={() => setPasswordResetTarget(null)}>{t("adm_cancel")}</button><button type="submit" className="np-btn-sm success">{t("adm_save")}</button></div>
            </form>
          </section>
        </div>
      )}

    {/* Balance Adjustment Modal */}
    {adjustModal.open && adjustModal.user && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setAdjustModal({ open: false, user: null })} role="dialog" aria-modal="true">
        <div className="np-panel w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-lg text-slate-800 mb-1">{t("adm_adjust_balance")}</h3>
          <p className="text-xs text-slate-500 mb-4">{t("adm_user_label")} <strong>{adjustModal.user.name}</strong> {t("adm_balance_label")} <strong>{money(adjustModal.user.balanceXaf ?? 0).n} {money(adjustModal.user.balanceXaf ?? 0).u}</strong></p>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button type="button" onClick={() => setAdjustDir("credit")} className={"flex-1 np-btn-sm " + (adjustDir === "credit" ? "success" : "outline")}>{t("adm_credit_plus")}</button>
              <button type="button" onClick={() => setAdjustDir("debit")} className={"flex-1 np-btn-sm " + (adjustDir === "debit" ? "danger" : "outline")}>{t("adm_debit_minus")}</button>
            </div>
            <input type="number" className="np-text-input w-full" placeholder={t("adm_ph_amount_fcfa")} value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} min={1} max={10000000} />
            <input type="text" className="np-text-input w-full" placeholder={t("adm_ph_adjust_reason")} value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} maxLength={200} />
            <div className="flex gap-2 pt-2">
              <button type="button" className="flex-1 np-btn-sm outline" onClick={() => setAdjustModal({ open: false, user: null })}>{t("adm_cancel")}</button>
              <button type="button" className={"flex-1 np-btn-sm " + (adjustDir === "credit" ? "success" : "danger")} onClick={handleAdjustWalletBalance} disabled={adjusting}>{adjusting ? t("adm_in_progress_ellipsis") : adjustDir === "credit" ? t("adm_credit") : t("adm_debit")}</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
