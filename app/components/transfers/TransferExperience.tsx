"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  AtSign,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  History,
  Info,
  KeyRound,
  Lock,
  LockKeyhole,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useLanguage } from "@/app/lib/i18n";
import { useCurrency } from "@/app/lib/currency";
import { NovaProgressLoader } from "@/app/components/shared/NovaProgressLoader";
import { DEFAULT_LIMITS, generateIdempotencyKey, resolveRecipient } from "@/app/lib/transfers/transfer-store";
import { Beneficiary, TransferCategory, TransferLimits, TransferRecord } from "@/app/lib/transfers/transfer-types";
import { downloadTransferReceiptPDF } from "@/app/lib/transfers/transfer-receipt";

type UserCard = { id: string | number; label?: string; brand?: string; maskedPan?: string; balanceUsd?: number; status?: string };

type ActiveTab = "send" | "beneficiaries" | "history" | "receive_qr";
type SendStep = 1 | 2 | 3 | 4; // 1: Destinataire, 2: Montant & motif, 3: Confirmation, 4: Reçu

const QUICK_AMOUNTS = [2000, 5000, 10000, 25000, 50000];

function mapSavedBeneficiary(row: any): Beneficiary {
  const name = String(row.name || "Bénéficiaire NovaPaid");
  return {
    id: String(row.id),
    recipientUserId: row.recipientUserId === null ? null : Number(row.recipientUserId),
    name,
    maskedName: name,
    handle: row.handle || "@novapaid",
    phone: row.phone || "",
    maskedPhone: row.phone || "",
    email: row.email || "",
    maskedEmail: row.email || "",
    avatarColor: row.avatarColor || "from-blue-600 to-indigo-700",
    initials: row.initials || name.slice(0, 2).toUpperCase(),
    isVerified: Boolean(row.isVerified),
    isFavorite: Boolean(row.isFavorite),
  };
}

function mapTransferRecord(row: any): TransferRecord {
  const completed = row.status === "succeeded";
  const received = row.direction === "received";
  return {
    id: String(row.publicRef),
    direction: received ? "received" : "sent",
    counterpartyName: row.counterpartyName || "Compte NovaPaid",
    idempotencyKey: "",
    senderId: "current-user",
    senderName: received ? row.counterpartyName || "Compte NovaPaid" : "Vous",
    recipientId: String(row.counterpartyUserId || ""),
    recipientName: received ? "Vous" : row.counterpartyName || "Compte NovaPaid",
    recipientMaskedName: received ? "Vous" : row.counterpartyName || "Compte NovaPaid",
    recipientHandle: row.counterpartyEmail ? `@${String(row.counterpartyEmail).split("@")[0]}` : "",
    recipientPhone: "",
    recipientAvatarColor: "from-blue-600 to-indigo-700",
    recipientInitials: String(row.recipientName || "NP").slice(0, 2).toUpperCase(),
    amount: Number(row.amount || 0),
    fee: 0,
    totalDebited: Number(row.amount || 0),
    currency: "FCFA",
    category: "autre",
    status: completed ? "COMPLETED" : "FAILED",
    ledgerReference: String(row.publicRef),
    createdAt: row.createdAt,
    completedAt: completed ? row.createdAt : undefined,
    authMethod: "session",
    riskScore: "LOW",
  };
}

const CATEGORIES: { id: TransferCategory; label: string; icon: string }[] = [
  { id: "personnel", label: "Personnel", icon: "👤" },
  { id: "famille", label: "Famille & Amis", icon: "❤️" },
  { id: "services", label: "Prestation / Service", icon: "💼" },
  { id: "loyer", label: "Loyer & Charges", icon: "🏠" },
  { id: "remboursement", label: "Remboursement", icon: "🔄" },
  { id: "cadeau", label: "Cadeau", icon: "🎁" },
  { id: "autre", label: "Autre motif", icon: "📝" },
];

export function TransferExperience({
  onClose,
  initialRecipient,
  embeddedInDashboard = false,
}: {
  onClose?: () => void;
  initialRecipient?: Beneficiary | null;
  embeddedInDashboard?: boolean;
}) {
  const { t } = useLanguage();
  const { convertAmount, formatAmount } = useCurrency();

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>("send");
  const [step, setStep] = useState<SendStep>(1);

  // ── New simplified card-based transfer flow ──────────────────────────────
  const [cards, setCards] = useState<UserCard[]>([]);
  const [recipientContact, setRecipientContact] = useState("");
  const [recipientLast4, setRecipientLast4] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendError, setSendError] = useState("");
  const [loaderActive, setLoaderActive] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendResult, setSendResult] = useState<null | { ok: boolean; message: string; amount?: number; fee?: number; total?: number; breakdown?: { label: string; last4: string; amount: number }[] }>(null);

  // Frais appliqués aux transferts entre utilisateurs de la plateforme (2%).
  const TRANSFER_FEE_PCT = 2;

  // Card balance expressed in FCFA (cards hold USD). One helper for the whole flow.
  const cardBalanceXaf = (c: UserCard) => Math.max(0, Math.round(convertAmount(Number(c.balanceUsd || 0), "USD", "XAF")));
  const activeCards = cards.filter((c) => (c.status || "active") === "active");
  const totalAvailableXaf = activeCards.reduce((sum, c) => sum + cardBalanceXaf(c), 0);

  // Live amount/fee preview as the user types.
  const previewAmountXaf = parseInt(sendAmount.replace(/\D/g, "") || "0", 10);
  const previewFeeXaf = Math.round(previewAmountXaf * TRANSFER_FEE_PCT / 100);
  const previewTotalXaf = previewAmountXaf + previewFeeXaf;

  // Load the user's virtual cards (the funds source for transfers / withdrawals).
  useEffect(() => {
    let on = true;
    fetch("/api/cards")
      .then((r) => r.json())
      .then((d) => { if (on && d?.success && Array.isArray(d.cards)) setCards(d.cards); })
      .catch(() => undefined);
    return () => { on = false; };
  }, []);

  // Cascade: debit the first card up to its balance, then take the rest needed
  // from the following cards. Returns the per-card breakdown, or null if the
  // total available across the cards is not enough.
  const buildCascade = (amountXaf: number) => {
    let remaining = amountXaf;
    const breakdown: { label: string; last4: string; amount: number }[] = [];
    for (const c of activeCards) {
      if (remaining <= 0) break;
      const avail = cardBalanceXaf(c);
      if (avail <= 0) continue;
      const take = Math.min(avail, remaining);
      breakdown.push({ label: c.label || "Carte", last4: (c.maskedPan || "").replace(/\D/g, "").slice(-4) || "0000", amount: take });
      remaining -= take;
    }
    if (remaining > 0) return null; // insufficient across all cards
    return breakdown;
  };

  const handleCardSend = async () => {
    if (verifying) return;
    setSendError("");
    setSendResult(null);
    const contact = recipientContact.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    const isPhone = /^\+?[0-9\s()-]{8,20}$/.test(contact);
    const amountXaf = parseInt(sendAmount.replace(/\D/g, "") || "0", 10);

    if (!isEmail && !isPhone) { setSendError(t("xfer2_err_contact")); return; }
    if (!/^[0-9]{4}$/.test(recipientLast4)) { setSendError(t("xfer2_err_last4")); return; }
    if (amountXaf <= 0) { setSendError(t("xfer2_err_amount")); return; }
    if (activeCards.length === 0) { setSendError(t("xfer2_err_no_card")); return; }

    // Vérifier que le contact + les 4 derniers chiffres correspondent à un compte
    // NovaPaid réel. Sinon, un message d'erreur s'affiche et l'envoi est bloqué.
    setVerifying(true);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "card_transfer", contact, recipientLast4 }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setSendError(data?.error || t("xfer2_err_recipient"));
        setVerifying(false);
        return;
      }
    } catch {
      setSendError(t("xfer2_err_recipient"));
      setVerifying(false);
      return;
    }
    setVerifying(false);

    // Frais de transfert (2%) : l'émetteur règle le montant + les frais.
    const feeXaf = Math.round(amountXaf * TRANSFER_FEE_PCT / 100);
    const totalXaf = amountXaf + feeXaf;
    const breakdown = buildCascade(totalXaf);
    if (!breakdown) {
      // conditions / sums not met → failure (shown after the loader so the user
      // still sees the processing animation, as requested)
      setLoaderActive(true);
      setSendResult({ ok: false, message: t("xfer2_fail_insufficient").replace("{n}", formatAmount(totalAvailableXaf, "XAF")) });
      return;
    }
    setLoaderActive(true);
    setSendResult({ ok: true, message: "", amount: amountXaf, fee: feeXaf, total: totalXaf, breakdown });
  };

  // Called by the loader once it reaches 100%.
  const finishCardSend = async () => {
    setLoaderActive(false);
    if (!sendResult) return;
    if (!sendResult.ok) return; // failure already prepared
    const amountXaf = parseInt(sendAmount.replace(/\D/g, "") || "0", 10);
    // Apply the cascade to the local card balances (debit the cards).
    const bd = sendResult.breakdown || [];
    setCards((prev) => {
      const byTaken = new Map(bd.map((b) => [b.last4, b.amount]));
      return prev.map((c) => {
        const last4 = (c.maskedPan || "").replace(/\D/g, "").slice(-4);
        const takenXaf = byTaken.get(last4) || 0;
        if (!takenXaf) return c;
        const takenUsd = convertAmount(takenXaf, "XAF", "USD");
        return { ...c, balanceUsd: Math.max(0, Number(c.balanceUsd || 0) - takenUsd) };
      });
    });
    // Best-effort server record (does not block the UX).
    try {
      await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "card_transfer", contact: recipientContact.trim(), recipientLast4, amountXaf, idempotencyKey }),
      });
    } catch { /* ignore – prototype settlement is client-side */ }
    setSendResult({ ok: true, message: t("xfer2_success").replace("{n}", formatAmount(amountXaf, "XAF")), breakdown: bd });
  };

  const resetCardSend = () => {
    setRecipientContact("");
    setRecipientLast4("");
    setSendAmount("");
    setSendError("");
    setSendResult(null);
    setIdempotencyKey(generateIdempotencyKey());
  };

  // Données financières et session
  const [balance, setBalance] = useState<number>(0);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [limits, setLimits] = useState<TransferLimits>(DEFAULT_LIMITS);
  const [receiveDetails, setReceiveDetails] = useState({ email: "", phone: "" });

  // Formulaire d'envoi
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [amountInput, setAmountInput] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [category, setCategory] = useState<TransferCategory>("personnel");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [completedTransfer, setCompletedTransfer] = useState<TransferRecord | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(generateIdempotencyKey);

  // Modales & Détails
  const [viewingTransfer, setViewingTransfer] = useState<TransferRecord | null>(null);
  const [showAddBeneficiaryModal, setShowAddBeneficiaryModal] = useState(false);
  const [newBenForm, setNewBenForm] = useState({ phone: "", email: "" });
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);

  // Copie d'informations
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Filtre historique
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "COMPLETED" | "DISPUTED">("ALL");
  const [historySearch, setHistorySearch] = useState("");

  // Le serveur fournit le portefeuille, les bénéficiaires et l’historique du compte connecté.
  useEffect(() => {
    let active = true;
    fetch("/api/transfers")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error || t("xfer_err_login_required"));
        if (!active) return;
        setBalance(Number(data.wallet?.balanceXaf || 0));
        setBeneficiaries((data.beneficiaries || []).map(mapSavedBeneficiary));
        setTransfers((data.transferRecords || []).map(mapTransferRecord));
        if (data.limits) setLimits(data.limits);
        setReceiveDetails({ email: data.user?.email || "", phone: data.user?.phone || "" });
      })
      .catch((error) => {
        if (active) setTransferError(error?.message || t("xfer_err_wallet_load"));
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (initialRecipient) {
      if (!initialRecipient.recipientUserId || !initialRecipient.isVerified) {
        setTransferError(t("xfer_err_contact_not_active"));
        return;
      }
      setSelectedBeneficiary(initialRecipient);
      setStep(2);
      setActiveTab("send");
    }
  }, [initialRecipient]);

  // Résolution intelligente du destinataire
  const resolution = useMemo(() => {
    return resolveRecipient(searchQuery, beneficiaries);
  }, [searchQuery, beneficiaries]);

  const parsedAmount = parseInt(amountInput.replace(/\D/g, "") || "0", 10);
  const remainingBalance = balance - parsedAmount;
  const isOverBalance = parsedAmount > balance;
  const isBelowMin = parsedAmount > 0 && parsedAmount < limits.singleMin;
  const isAboveMax = parsedAmount > limits.singleMax;
  const isAmountValid = parsedAmount >= limits.singleMin && !isOverBalance && !isAboveMax;

  const copyToClipboard = (text: string, keyId: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleSelectBeneficiary = (b: Beneficiary) => {
    if (!b.recipientUserId || !b.isVerified) {
      setTransferError(t("xfer_err_contact_not_linked"));
      return;
    }
    setSelectedBeneficiary(b);
    setTransferError("");
    setSearchQuery("");
    setStep(2);
  };

  const handleUseCandidate = async () => {
    if (!resolution.candidate) return;
    const identity = searchQuery.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity);
    const isPhone = /^\+?[0-9\s()-]{8,20}$/.test(identity);
    if (!isEmail && !isPhone) {
      setTransferError(t("xfer_err_add_need_email_phone"));
      return;
    }
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_beneficiary", name: "", ...(isEmail ? { email: identity } : { phone: identity }) }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data.beneficiary) throw new Error(data?.error || t("xfer_err_beneficiary_not_found"));
      const beneficiary = mapSavedBeneficiary(data.beneficiary);
      setBeneficiaries((current) => [beneficiary, ...current]);
      handleSelectBeneficiary(beneficiary);
    } catch (error: any) {
      setTransferError(error?.message || t("xfer_err_add_beneficiary_failed"));
    }
  };

  const handleToggleFavorite = async (bId: string) => {
    const beneficiary = beneficiaries.find((item) => item.id === bId);
    if (!beneficiary) return;
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "favorite_beneficiary", beneficiaryId: Number(bId), favorite: !beneficiary.isFavorite }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || t("xfer_err_update_failed"));
      setBeneficiaries((current) => current.map((item) => item.id === bId ? { ...item, isFavorite: data.isFavorite } : item));
    } catch (error: any) {
      setTransferError(error?.message || t("xfer_err_favorite_failed"));
    }
  };

  const handleExecuteTransfer = async () => {
    if (!selectedBeneficiary || !isAmountValid || isProcessing) return;
    if (!selectedBeneficiary.recipientUserId) {
      setTransferError(t("xfer_err_beneficiary_unlinked"));
      return;
    }
    setIsProcessing(true);
    setTransferError("");
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientUserId: selectedBeneficiary.recipientUserId, amount: parsedAmount, note: note.trim() || undefined, idempotencyKey }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || t("xfer_err_transfer_not_executed"));
      const newTransfer: TransferRecord = {
        id: data.publicRef,
        direction: "sent",
        idempotencyKey: idempotencyKey,
        senderId: "current-user",
        senderName: "Vous",
        recipientId: String(selectedBeneficiary.recipientUserId),
        recipientName: data.recipientName || selectedBeneficiary.name,
        recipientMaskedName: selectedBeneficiary.maskedName,
        recipientHandle: selectedBeneficiary.handle,
        recipientPhone: selectedBeneficiary.phone,
        recipientAvatarColor: selectedBeneficiary.avatarColor,
        recipientInitials: selectedBeneficiary.initials,
        amount: parsedAmount,
        fee: 0, // Gratuit entre membres NovaPay
        totalDebited: parsedAmount,
        currency: "FCFA",
        note: note.trim() || undefined,
        category: category,
        status: "COMPLETED",
        ledgerReference: data.publicRef,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        authMethod: "session",
        riskScore: "LOW",
      };
      setBalance(Number(data.newBalanceXaf));
      window.dispatchEvent(new CustomEvent("novapay:balance-changed", { detail: { balance: Number(data.newBalanceXaf) } }));
      setTransfers((current) => [newTransfer, ...current]);
      setCompletedTransfer(newTransfer);
      setStep(4);
    } catch (error: any) {
      setTransferError(error?.message || t("xfer_err_transfer_generic"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetForm = () => {
    setSelectedBeneficiary(null);
    setSearchQuery("");
    setAmountInput("");
    setNote("");
    setCategory("personnel");
    setCompletedTransfer(null);
    setIdempotencyKey(generateIdempotencyKey());
    setTransferError("");
    setStep(1);
  };

  const handleSaveNewBeneficiary = async () => {
    if (!newBenForm.email.trim() && !newBenForm.phone.trim()) {
      setTransferError(t("xfer_err_enter_email_or_phone"));
      return;
    }
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_beneficiary", ...newBenForm }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data.beneficiary) throw new Error(data?.error || t("xfer_err_add_beneficiary_failed2"));
      const beneficiary = mapSavedBeneficiary(data.beneficiary);
      setBeneficiaries((current) => [beneficiary, ...current]);
      setTransferError("");
      setShowAddBeneficiaryModal(false);
      setNewBenForm({ phone: "", email: "" });
    } catch (error: any) {
      setTransferError(error?.message || t("xfer_err_add_beneficiary_failed2"));
    }
  };

  const handleDisputeSubmit = async () => {
    if (!viewingTransfer || !disputeReason.trim()) return;
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dispute_transfer", transactionRef: viewingTransfer.id, reason: disputeReason }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || t("xfer_err_dispute_send_failed"));
      setDisputeSubmitted(true);
      setTimeout(() => {
        setShowDisputeModal(false);
        setDisputeSubmitted(false);
        setDisputeReason("");
      }, 2500);
    } catch (error: any) {
      setTransferError(error?.message || t("xfer_err_dispute_support_failed"));
    }
  };

  // Filtrage de l'historique
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const matchStatus =
        historyFilter === "ALL"
          ? true
          : historyFilter === "COMPLETED"
          ? t.status === "COMPLETED"
          : t.status === "DISPUTED";
      const q = historySearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.recipientName.toLowerCase().includes(q) ||
        t.recipientHandle.toLowerCase().includes(q) ||
        (t.note && t.note.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [transfers, historyFilter, historySearch]);

  const favorites = beneficiaries.filter((b) => b.isFavorite);

  return (
    <div className="np-transfer-section w-full max-w-5xl mx-auto space-y-6">
      {/* En-tête sobre (le gros bloc bleu a été retiré) */}
      <div className="np-xfer2-head">
        <div>
          <h1 className="np-xfer2-title">{t("xfer2_title")}</h1>
          <p className="np-xfer2-sub">{t("xfer2_subtitle")}</p>
        </div>
        <div className="np-xfer2-tabs">
          <button type="button" onClick={() => setActiveTab("send")} className={`np-xfer2-tab ${activeTab === "send" ? "is-active" : ""}`}>
            <ArrowLeftRight size={15} /> {t("xfer_tab_new")}
          </button>
          <button type="button" onClick={() => setActiveTab("beneficiaries")} className={`np-xfer2-tab ${activeTab === "beneficiaries" ? "is-active" : ""}`}>
            <Users size={15} /> {t("xfer_tab_beneficiaries")} ({beneficiaries.length})
          </button>
          <button type="button" onClick={() => setActiveTab("history")} className={`np-xfer2-tab ${activeTab === "history" ? "is-active" : ""}`}>
            <History size={15} /> {t("xfer_tab_history")} ({transfers.length})
          </button>
        </div>
      </div>

      {transferError && <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">{transferError}</div>}

      {/* ========================================================================= */}
      {/* ONGLET 1 : ENVOI DEPUIS LES CARTES (formulaire simple)                   */}
      {/* ========================================================================= */}
      {activeTab === "send" && (
        <div className="np-xfer2-grid">
          {/* Soldes des cartes (source des fonds) */}
          <section className="np-xfer2-cards-panel">
            <div className="np-xfer2-panel-head">
              <h2>{t("xfer2_your_cards")}</h2>
              <span className="np-xfer2-total">
                {t("xfer2_total_available")} <strong>{formatAmount(totalAvailableXaf, "XAF")}</strong>
              </span>
            </div>
            {activeCards.length === 0 ? (
              <div className="np-xfer2-empty"><Wallet size={18} /> <span>{t("xfer2_no_card")}</span></div>
            ) : (
              <div className="np-xfer2-card-list">
                {activeCards.map((c) => (
                  <div className="np-xfer2-card" key={String(c.id)}>
                    <span className={"np-xfer2-card-chip " + (c.brand || "visa")}>{(c.brand || "visa").toUpperCase()}</span>
                    <div className="np-xfer2-card-info">
                      <strong>{c.label || t("xfer2_card")}</strong>
                      <small>{c.maskedPan || "•••• ••••"}</small>
                    </div>
                    <div className="np-xfer2-card-bal">{formatAmount(cardBalanceXaf(c), "XAF")}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Formulaire d'envoi */}
          <section className="np-xfer2-form-panel">
            {sendResult && !loaderActive ? (
              <div className={"np-xfer2-result " + (sendResult.ok ? "ok" : "fail")}>
                <div className="np-xfer2-result-icon">
                  {sendResult.ok ? <CheckCircle2 size={40} /> : <AlertTriangle size={40} />}
                </div>
                <h3>{sendResult.ok ? t("xfer2_success_title") : t("xfer2_fail_title")}</h3>
                <p>{sendResult.message}</p>
                {sendResult.ok && typeof sendResult.total === "number" && (
                  <div className="np-xfer2-breakdown">
                    <div className="np-xfer2-breakdown-row">
                      <span>{t("xfer2_amount_sent")}</span>
                      <strong>{formatAmount(sendResult.amount || 0, "XAF")}</strong>
                    </div>
                    <div className="np-xfer2-breakdown-row">
                      <span>{t("xfer2_fee_label")}</span>
                      <strong>{formatAmount(sendResult.fee || 0, "XAF")}</strong>
                    </div>
                    <div className="np-xfer2-breakdown-row np-xfer2-breakdown-total">
                      <span>{t("xfer2_total_debited")}</span>
                      <strong>{formatAmount(sendResult.total || 0, "XAF")}</strong>
                    </div>
                  </div>
                )}
                {sendResult.ok && sendResult.breakdown && sendResult.breakdown.length > 0 && (
                  <div className="np-xfer2-breakdown">
                    <span className="np-xfer2-breakdown-head">{t("xfer2_debited_from")}</span>
                    {sendResult.breakdown.map((b, i) => (
                      <div key={i} className="np-xfer2-breakdown-row">
                        <span>{b.label} ···· {b.last4}</span>
                        <strong>− {formatAmount(b.amount, "XAF")}</strong>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" className="np-xfer2-send" onClick={resetCardSend}>{t("xfer2_new")}</button>
              </div>
            ) : (
              <>
                <h2>{t("xfer2_send_title")}</h2>
                <p className="np-xfer2-form-sub">{t("xfer2_send_sub")}</p>

                <label className="np-xfer2-label">{t("xfer2_recipient_label")}</label>
                <div className="np-xfer2-field">
                  <AtSign size={16} />
                  <input
                    type="text"
                    value={recipientContact}
                    onChange={(e) => { setRecipientContact(e.target.value); setSendError(""); }}
                    placeholder={t("xfer2_recipient_ph")}
                  />
                </div>

                <label className="np-xfer2-label">{t("xfer2_last4_label")}</label>
                <div className="np-xfer2-field">
                  <KeyRound size={16} />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={recipientLast4}
                    onChange={(e) => { setRecipientLast4(e.target.value.replace(/\D/g, "").slice(0, 4)); setSendError(""); }}
                    placeholder="••••"
                  />
                </div>

                <label className="np-xfer2-label">{t("xfer2_amount_label")}</label>
                <div className="np-xfer2-field np-xfer2-amount">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={sendAmount ? parseInt(sendAmount, 10).toLocaleString("fr-FR") : ""}
                    onChange={(e) => { setSendAmount(e.target.value.replace(/\D/g, "")); setSendError(""); }}
                    placeholder="0"
                  />
                  <span className="np-xfer2-cur">FCFA</span>
                </div>

                {previewAmountXaf > 0 && (
                  <div className="np-xfer2-fee-preview">
                    <div><span>{t("xfer2_fee_label")}</span><strong>{formatAmount(previewFeeXaf, "XAF")}</strong></div>
                    <div className="np-xfer2-fee-total"><span>{t("xfer2_total_debited")}</span><strong>{formatAmount(previewTotalXaf, "XAF")}</strong></div>
                  </div>
                )}

                {sendError && (
                  <div className="np-xfer2-error"><AlertTriangle size={15} /> <span>{sendError}</span></div>
                )}

                <button type="button" className="np-xfer2-send" onClick={handleCardSend} disabled={verifying}>
                  {verifying ? <><RefreshCw size={16} className="animate-spin" /> {t("xfer2_verifying")}</> : <><ArrowUpRight size={17} /> {t("xfer2_send_btn")}</>}
                </button>
                <p className="np-xfer2-hint">{t("xfer2_cascade_hint")}</p>
              </>
            )}
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 2 : GESTION DES BÉNÉFICIAIRES & FAVORIS                          */}
      {/* ========================================================================= */}
      {activeTab === "beneficiaries" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t("xfer_directory_title")}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t("xfer_directory_subtitle")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddBeneficiaryModal(true)}
              className="px-4 py-2 bg-[#1859bb] hover:bg-[#124491] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
            >
              <UserPlus size={15} /> {t("xfer_add_beneficiary")}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {beneficiaries.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-full bg-gradient-to-tr ${b.avatarColor} text-white font-bold flex items-center justify-center text-sm shadow-sm`}
                    >
                      {b.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900">{b.name}</span>
                        {b.isVerified && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded">
                            {t("xfer_account_active")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-blue-600 font-semibold">{b.handle}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(b.id)}
                    className="p-1.5 text-slate-300 hover:text-amber-400 transition-colors"
                  >
                    <Star
                      size={18}
                      className={b.isFavorite ? "text-amber-400 fill-amber-400" : ""}
                    />
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>{t("xfer_phone")}</span>
                    <span className="font-mono text-slate-700">{b.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t("xfer_contact_info")}</span>
                    <span className="font-mono text-slate-700">{b.email || b.phone}</span>
                  </div>
                  {b.lastTransferDate && (
                    <div className="flex items-center justify-between">
                      <span>{t("xfer_last_sent")}</span>
                      <span>{new Date(b.lastTransferDate).toLocaleDateString("fr-FR")}</span>
                    </div>
                  )}
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBeneficiary(b);
                      setStep(2);
                      setActiveTab("send");
                    }}
                    className="flex-1 py-2 bg-blue-50 hover:bg-[#1859bb] hover:text-white text-[#1859bb] text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeftRight size={13} /> {t("xfer_send_money")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 3 : HISTORIQUE COMPLET & REÇUS D’AUDIT                           */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t("xfer_history_title")}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t("xfer_history_subtitle")}
              </p>
            </div>

            {/* Filtres de statut */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs">
              <button
                type="button"
                onClick={() => setHistoryFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  historyFilter === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t("xfer_filter_all")} ({transfers.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter("COMPLETED")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  historyFilter === "COMPLETED"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t("xfer_filter_completed")}
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter("DISPUTED")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  historyFilter === "DISPUTED"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t("xfer_filter_disputed")}
              </button>
            </div>
          </div>

          {/* Recherche dans l'historique */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder={t("xfer_history_search_placeholder")}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tableau / Liste des transferts */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {filteredTransfers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {t("xfer_no_transfers")}
              </div>
            ) : (
              filteredTransfers.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-tr ${tx.recipientAvatarColor} text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-sm`}
                    >
                      {tx.recipientInitials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{tx.direction === "received" ? t("xfer_from_name").replace("{n}", tx.counterpartyName || tx.recipientName) : t("xfer_to_name").replace("{n}", tx.counterpartyName || tx.recipientName)}</span>
                        <span className="text-xs text-slate-500 font-medium">({tx.recipientHandle})</span>
                        {tx.status === "COMPLETED" && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                            {t("xfer_status_confirmed")}
                          </span>
                        )}
                        {tx.status === "DISPUTED" && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded flex items-center gap-1">
                            <AlertTriangle size={10} /> {t("xfer_status_disputed")}
                          </span>
                        )}
                        {tx.status === "CANCELLED" && (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.2 rounded">
                            {t("xfer_status_cancelled")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="font-mono text-[11px] text-blue-600">{tx.id}</span>
                        <span>·</span>
                        <span>{new Date(tx.createdAt).toLocaleDateString("fr-FR", { dateStyle: "medium" })}</span>
                        {tx.note && (
                          <>
                            <span>·</span>
                            <span className="italic text-slate-600 truncate max-w-[200px]">&quot;{tx.note}&quot;</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pl-13 sm:pl-0">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-slate-900">
                        {tx.direction === "received" ? "+" : "−"} {tx.amount.toLocaleString("fr-FR")} <small className="text-xs font-semibold">FCFA</small>
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono">{t("xfer_fee_zero")}</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => downloadTransferReceiptPDF(tx)}
                        title={t("xfer_download_receipt_title")}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewingTransfer(tx)}
                        className="px-2.5 py-1.5 bg-[#1859bb] hover:bg-[#124491] text-white text-xs font-bold rounded-lg transition-all"
                      >
                        {t("xfer_details")}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET : COORDONNÉES POUR RECEVOIR UN TRANSFERT                         */}
      {/* ========================================================================= */}
      {activeTab === "receive_qr" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6 max-w-lg mx-auto text-center">
          <div>
            <div className="inline-flex p-3 rounded-2xl bg-blue-50 text-[#1859bb] mb-2">
              <ArrowDownLeft size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-900">{t("xfer_receive_title")}</h2>
            <p className="text-xs text-slate-500 mt-1">
              {t("xfer_receive_subtitle")}
            </p>
          </div>

          <div className="space-y-3">
            {receiveDetails.email && <div className="p-3 bg-blue-50 rounded-xl border border-blue-200/80 flex items-center justify-between gap-3">
              <div className="text-left">
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">{t("xfer_account_email")}</span>
                <span className="text-sm font-extrabold text-[#10264f] break-all">{receiveDetails.email}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(receiveDetails.email, "email")}
                className="px-3 py-1.5 bg-white text-blue-700 text-xs font-bold rounded-lg border border-blue-200 hover:bg-blue-100/50 transition-all flex items-center gap-1.5"
              >
                {copiedKey === "email" ? <Check size={14} /> : <Copy size={14} />}
                {copiedKey === "email" ? t("xfer_copied") : t("xfer_copy")}
              </button>
            </div>}

            {receiveDetails.phone && <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div className="text-left">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{t("xfer_account_phone")}</span>
                <span className="font-mono text-xs font-bold text-slate-800">{receiveDetails.phone}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(receiveDetails.phone, "phone")}
                className="px-3 py-1.5 bg-white text-slate-700 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-1.5"
              >
                {copiedKey === "phone" ? <Check size={14} /> : <Copy size={14} />}
                {copiedKey === "phone" ? t("xfer_copied") : t("xfer_copy")}
              </button>
            </div>}
            {!receiveDetails.email && !receiveDetails.phone && <p className="text-sm text-slate-500">{t("xfer_receive_unavailable")}</p>}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : DÉTAIL D'UN TRANSFERT (AVEC TRACE DU GRAND LIVRE & CONTESTATION)  */}
      {/* ========================================================================= */}
      {viewingTransfer && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setViewingTransfer(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#1859bb] flex items-center justify-center font-bold">
                  <ArrowLeftRight size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t("xfer_entry_detail_title")}</h3>
                  <span className="text-[10px] text-slate-600 font-mono">{viewingTransfer.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingTransfer(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{viewingTransfer.direction === "received" ? t("xfer_sender") : t("xfer_beneficiary")}</span>
                  <span className="font-bold text-slate-900">{viewingTransfer.counterpartyName || viewingTransfer.recipientName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{viewingTransfer.direction === "received" ? t("xfer_sender_id") : t("xfer_recipient_id")}</span>
                  <span className="font-semibold text-blue-700">{viewingTransfer.recipientHandle}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t("xfer_amount_debited_short")}</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {viewingTransfer.amount.toLocaleString("fr-FR")} FCFA
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t("xfer_processing_fee")}</span>
                  <span className="text-emerald-600 font-bold">0 FCFA</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t("xfer_transaction_status")}</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      viewingTransfer.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-800"
                        : viewingTransfer.status === "DISPUTED"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {viewingTransfer.status}
                  </span>
                </div>
              </div>

              {/* Détail des écritures de portefeuille */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1.5 font-mono text-[11px]">
                <div className="text-[10px] font-bold text-blue-900 uppercase font-sans mb-1 flex items-center gap-1">
                  <ShieldCheck size={13} /> {t("xfer_debit_credit_together")}
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>{t("xfer_debit_source")}</span>
                  <span className="text-red-700">− {viewingTransfer.amount.toLocaleString("fr-FR")} FCFA</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>{t("xfer_credit_beneficiary")}</span>
                  <span className="text-emerald-700">+ {viewingTransfer.amount.toLocaleString("fr-FR")} FCFA</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => downloadTransferReceiptPDF(viewingTransfer)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <Download size={14} /> {t("xfer_download_pdf")}
              </button>

              {viewingTransfer.status !== "DISPUTED" && viewingTransfer.status !== "CANCELLED" && (
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(true)}
                  className="px-3 py-2.5 border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                >
                  <ShieldAlert size={14} /> {t("xfer_dispute")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : AJOUT D'UN BÉNÉFICIAIRE                                          */}
      {/* ========================================================================= */}
      {showAddBeneficiaryModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAddBeneficiaryModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus size={16} className="text-[#1859bb]" /> {t("xfer_new_beneficiary")}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddBeneficiaryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{t("xfer_form_phone_label")}</label>
                <input
                  type="text"
                  value={newBenForm.phone}
                  onChange={(e) => setNewBenForm({ ...newBenForm, phone: e.target.value })}
                  placeholder="+237 6•• •• •• ••"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t("xfer_form_email_label")}</label>
                <input
                  type="email"
                  value={newBenForm.email}
                  onChange={(e) => setNewBenForm({ ...newBenForm, email: e.target.value })}
                  placeholder={t("xfer_form_email_placeholder")}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddBeneficiaryModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                {t("xfer_cancel")}
              </button>
              <button
                type="button"
                disabled={!newBenForm.email.trim() && !newBenForm.phone.trim()}
                onClick={handleSaveNewBeneficiary}
                className="px-4 py-2 bg-[#1859bb] hover:bg-[#124491] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition-all"
              >
                {t("xfer_save_contact")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : CONTESTATION & SIGNALEMENT DE LITIGE AU SUPPORT                  */}
      {/* ========================================================================= */}
      {showDisputeModal && viewingTransfer && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowDisputeModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-red-600 flex items-center gap-2">
                <ShieldAlert size={16} /> {t("xfer_dispute_title")}
              </h3>
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {disputeSubmitted ? (
              <div className="text-center py-6 space-y-2">
                <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">{t("xfer_dispute_opened_title")}</h4>
                <p className="text-xs text-slate-500">
                  {t("xfer_dispute_opened_body")}
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-600">
                  {t("xfer_dispute_intro")} <strong>{viewingTransfer.id}</strong> {t("xfer_dispute_amount_of")}{" "}
                  <strong>{viewingTransfer.amount.toLocaleString("fr-FR")} FCFA</strong> {t("xfer_dispute_to")}{" "}
                  <strong>{viewingTransfer.recipientName}</strong>.
                </p>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    {t("xfer_dispute_reason_label")}
                  </label>
                  <textarea
                    rows={3}
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder={t("xfer_dispute_reason_placeholder")}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDisputeModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600"
                  >
                    {t("xfer_cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={!disputeReason.trim()}
                    onClick={handleDisputeSubmit}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition-all"
                  >
                    {t("xfer_dispute_submit")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <NovaProgressLoader
        active={loaderActive}
        label={t("xfer2_processing")}
        onComplete={finishCardSend}
      />
    </div>
  );
}
