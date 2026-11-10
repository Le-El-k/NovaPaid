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
import { DEFAULT_LIMITS, generateIdempotencyKey, resolveRecipient } from "@/app/lib/transfers/transfer-store";
import { Beneficiary, TransferCategory, TransferLimits, TransferRecord } from "@/app/lib/transfers/transfer-types";
import { downloadTransferReceiptPDF } from "@/app/lib/transfers/transfer-receipt";

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
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>("send");
  const [step, setStep] = useState<SendStep>(1);

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
        if (!res.ok || !data?.success) throw new Error(data?.error || "Connexion requise.");
        if (!active) return;
        setBalance(Number(data.wallet?.balanceXaf || 0));
        setBeneficiaries((data.beneficiaries || []).map(mapSavedBeneficiary));
        setTransfers((data.transferRecords || []).map(mapTransferRecord));
        if (data.limits) setLimits(data.limits);
        setReceiveDetails({ email: data.user?.email || "", phone: data.user?.phone || "" });
      })
      .catch((error) => {
        if (active) setTransferError(error?.message || "Impossible de charger le portefeuille.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (initialRecipient) {
      if (!initialRecipient.recipientUserId || !initialRecipient.isVerified) {
        setTransferError("Ce contact ne correspond pas à un compte NovaPaid actif. Recherchez son email ou son numéro enregistré.");
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
      setTransferError("Ce contact n’est pas lié à un compte NovaPaid actif.");
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
      setTransferError("Pour ajouter un bénéficiaire, recherchez son email ou son numéro associé à NovaPaid.");
      return;
    }
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_beneficiary", name: "", ...(isEmail ? { email: identity } : { phone: identity }) }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data.beneficiary) throw new Error(data?.error || "Bénéficiaire introuvable.");
      const beneficiary = mapSavedBeneficiary(data.beneficiary);
      setBeneficiaries((current) => [beneficiary, ...current]);
      handleSelectBeneficiary(beneficiary);
    } catch (error: any) {
      setTransferError(error?.message || "Impossible d’ajouter ce bénéficiaire.");
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
      if (!res.ok || !data?.success) throw new Error(data?.error || "Mise à jour impossible.");
      setBeneficiaries((current) => current.map((item) => item.id === bId ? { ...item, isFavorite: data.isFavorite } : item));
    } catch (error: any) {
      setTransferError(error?.message || "Impossible de modifier le favori.");
    }
  };

  const handleExecuteTransfer = async () => {
    if (!selectedBeneficiary || !isAmountValid || isProcessing) return;
    if (!selectedBeneficiary.recipientUserId) {
      setTransferError("Ce bénéficiaire n’est pas rattaché à un compte NovaPaid.");
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
      if (!res.ok || !data?.success) throw new Error(data?.error || "Le transfert n’a pas été exécuté.");
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
      setTransferError(error?.message || "Erreur pendant le transfert.");
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
      setTransferError("Saisissez l’email ou le téléphone associé au compte NovaPaid.");
      return;
    }
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_beneficiary", ...newBenForm }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data.beneficiary) throw new Error(data?.error || "Impossible d’ajouter le bénéficiaire.");
      const beneficiary = mapSavedBeneficiary(data.beneficiary);
      setBeneficiaries((current) => [beneficiary, ...current]);
      setTransferError("");
      setShowAddBeneficiaryModal(false);
      setNewBenForm({ phone: "", email: "" });
    } catch (error: any) {
      setTransferError(error?.message || "Impossible d’ajouter le bénéficiaire.");
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
      if (!res.ok || !data?.success) throw new Error(data?.error || "Impossible d’envoyer la demande.");
      setDisputeSubmitted(true);
      setTimeout(() => {
        setShowDisputeModal(false);
        setDisputeSubmitted(false);
        setDisputeReason("");
      }, 2500);
    } catch (error: any) {
      setTransferError(error?.message || "Impossible d’envoyer la demande au support.");
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
      {/* Barre d'en-tête du module Transfert */}
      <div className="bg-gradient-to-r from-[#10264f] via-[#143975] to-[#1859bb] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Transferts NovaPay</h1>
            <p className="text-blue-200/80 text-sm mt-1 max-w-xl">
              Envoyez des fonds à un compte NovaPaid actif. Chaque opération est enregistrée dans le portefeuille et l’historique du compte.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 min-w-[220px]">
            <span className="text-xs text-blue-200 font-medium block">Solde disponible portefeuille</span>
            <div className="text-2xl font-black tracking-tight text-white mt-0.5">
              {balance.toLocaleString("fr-FR")} <small className="text-sm font-semibold text-blue-200">FCFA</small>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[11px] text-blue-100/70">
              <span>Plafond jour restant :</span>
              <span className="font-semibold text-white">{(limits.dailyLimit - limits.dailyUsed).toLocaleString("fr-FR")} FCFA</span>
            </div>
          </div>
        </div>

        {/* Navigation par Onglets */}
        <div className="np-transfer-tabs flex items-center gap-1.5 mt-6 pt-4 border-t border-white/15 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("send")}
            className={`np-transfer-tab px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "send"
                ? "is-active bg-white text-[#10264f] shadow-lg shadow-black/10 scale-102"
                : "is-idle text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <ArrowLeftRight size={15} /> Nouveau transfert
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("beneficiaries")}
            className={`np-transfer-tab px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "beneficiaries"
                ? "is-active bg-white text-[#10264f] shadow-lg shadow-black/10 scale-102"
                : "is-idle text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Users size={15} /> Bénéficiaires & Favoris ({beneficiaries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`np-transfer-tab px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "history"
                ? "is-active bg-white text-[#10264f] shadow-lg shadow-black/10 scale-102"
                : "is-idle text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <History size={15} /> Historique & Reçus ({transfers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("receive_qr")}
            className={`np-transfer-tab px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "receive_qr"
                ? "is-active bg-white text-[#10264f] shadow-lg shadow-black/10 scale-102"
                : "is-idle text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <ArrowDownLeft size={15} /> Recevoir
          </button>
        </div>
      </div>

      {transferError && <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">{transferError}</div>}

      {/* ========================================================================= */}
      {/* ONGLET 1 : ENVOYER UN TRANSFERT (PARCOURS EN 4 ÉTAPES)                   */}
      {/* ========================================================================= */}
      {activeTab === "send" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {/* Stepper indicateur */}
          <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              {[
                { s: 1, label: "Destinataire" },
                { s: 2, label: "Montant & Motif" },
                { s: 3, label: "Confirmation" },
                { s: 4, label: "Reçu de transfert" },
              ].map(({ s, label }) => (
                <div key={s} className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === s
                        ? "bg-[#1859bb] text-white ring-4 ring-blue-100"
                        : step > s
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {step > s ? <Check size={13} strokeWidth={3} /> : s}
                  </span>
                  <span
                    className={`text-xs font-medium hidden sm:inline ${
                      step === s ? "text-slate-900 font-bold" : step > s ? "text-emerald-700" : "text-slate-600"
                    }`}
                  >
                    {label}
                  </span>
                  {s < 4 && <ChevronRight size={13} className="text-slate-300 ml-2 hidden sm:inline" />}
                </div>
              ))}
            </div>

            {step > 1 && step < 4 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as SendStep)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft size={13} /> Retour
              </button>
            )}
          </div>

          <div className="p-6">
            {/* ÉTAPE 1 : CHOIX DU BÉNÉFICIAIRE */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">À qui souhaitez-vous envoyer de l’argent ?</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Recherchez par email ou numéro de téléphone associé à NovaPaid, ou sélectionnez un bénéficiaire enregistré.
                  </p>
                </div>

                {/* Champ de recherche instantané */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setTransferError(""); }}
                    placeholder="Email ou téléphone du compte NovaPaid"
                    className="w-full pl-10 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-10 pr-2 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Résultat de résolution automatique si recherche active */}
                {searchQuery.trim() && (
                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60">
                    {resolution.found ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-full bg-gradient-to-tr ${resolution.found.avatarColor} text-white font-bold flex items-center justify-center text-sm shadow-sm`}
                          >
                            {resolution.found.initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-slate-900">{resolution.found.name}</span>
                              <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded ${resolution.found.isVerified ? "text-blue-700 bg-blue-100" : "text-amber-800 bg-amber-100"}`}>
                                {resolution.found.isVerified ? "Compte actif" : "Compte indisponible"}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="font-medium text-blue-600">{resolution.found.email || resolution.found.phone || resolution.found.handle}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!resolution.found.isVerified}
                          onClick={() => handleSelectBeneficiary(resolution.found!)}
                          className="px-4 py-2 bg-[#1859bb] hover:bg-[#124491] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                        >
                          Sélectionner
                        </button>
                      </div>
                    ) : resolution.isUnknown && resolution.candidate ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                            {resolution.candidate.initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-slate-900">
                                Coordonnées à vérifier
                              </span>
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                                Non vérifié
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {searchQuery.trim()}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleUseCandidate}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                        >
                          Vérifier et ajouter
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <AlertCircle size={15} className="text-amber-500" />
                      <span>Aucun bénéficiaire enregistré ne correspond à &quot;{searchQuery}&quot;. Pour ajouter un compte, utilisez son email ou son numéro associé à NovaPaid.</span>
                      </div>
                    )}
                  </div>
                )}
                {/* Section Favoris récents (Bulles d'accès rapide) */}
                {favorites.length > 0 && !searchQuery.trim() && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Star size={13} className="text-amber-400 fill-amber-400" /> Bénéficiaires favoris
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab("beneficiaries")}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Gérer
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {favorites.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleSelectBeneficiary(b)}
                          className="p-3 rounded-xl border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/40 transition-all text-left flex items-center gap-3 group"
                        >
                          <div
                            className={`w-10 h-10 rounded-full bg-gradient-to-tr ${b.avatarColor} text-white font-bold flex items-center justify-center text-xs shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform`}
                          >
                            {b.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">{b.name}</div>
                            <div className="text-[11px] text-blue-600 font-medium truncate">{b.handle}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Liste complète des contacts */}
                {!searchQuery.trim() && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Tous les contacts enregistrés ({beneficiaries.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddBeneficiaryModal(true)}
                        className="text-xs text-[#1859bb] hover:text-[#10264f] font-bold flex items-center gap-1"
                      >
                        <UserPlus size={13} /> Nouveau contact
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {beneficiaries.map((b) => (
                        <div
                          key={b.id}
                          className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectBeneficiary(b)}
                            className="flex items-center gap-3 text-left flex-1 min-w-0"
                          >
                            <div
                              className={`w-10 h-10 rounded-full bg-gradient-to-tr ${b.avatarColor} text-white font-bold flex items-center justify-center text-xs flex-shrink-0`}
                            >
                              {b.initials}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-slate-900 truncate">{b.name}</span>
                                {b.isVerified && (
                                  <UserCheck size={13} className="text-blue-600 flex-shrink-0" aria-label="Compte actif" />
                                )}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-2 truncate">
                                <span className="text-blue-600 font-medium">{b.handle}</span>
                                <span>·</span>
                                <span>{b.maskedPhone}</span>
                              </div>
                            </div>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleFavorite(b.id)}
                              className="p-1.5 text-slate-300 hover:text-amber-400 transition-colors"
                              title={b.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                            >
                              <Star
                                size={16}
                                className={b.isFavorite ? "text-amber-400 fill-amber-400" : ""}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectBeneficiary(b)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-[#1859bb] hover:text-white text-slate-700 text-xs font-bold rounded-lg transition-all"
                            >
                              Envoyer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ÉTAPE 2 : MONTANT, MOTIF ET CATÉGORIE */}
            {step === 2 && selectedBeneficiary && (
              <div className="space-y-6 max-w-xl mx-auto">
                {/* Carte destinataire choisi */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-full bg-gradient-to-tr ${selectedBeneficiary.avatarColor} text-white font-bold flex items-center justify-center text-sm shadow-sm`}
                    >
                      {selectedBeneficiary.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900">{selectedBeneficiary.name}</span>
                        {selectedBeneficiary.isVerified && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded">
                            Compte actif
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {selectedBeneficiary.handle} · {selectedBeneficiary.maskedPhone}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Changer
                  </button>
                </div>

                {/* Saisie du montant */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Montant à transférer
                    </label>
                    <span className="text-xs text-slate-500">
                      Disponible :{" "}
                      <strong className="text-slate-900">{balance.toLocaleString("fr-FR")} FCFA</strong>
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amountInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setAmountInput(val);
                      }}
                      placeholder="0"
                      className={`w-full py-4 px-4 text-3xl font-black rounded-xl border text-center transition-all ${
                        isOverBalance
                          ? "border-red-400 bg-red-50/50 text-red-900 focus:ring-red-400"
                          : "border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      }`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-400">
                      FCFA
                    </span>
                  </div>

                  {/* Raccourcis de montants */}
                  <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                    {QUICK_AMOUNTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setAmountInput(q.toString())}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      >
                        +{q.toLocaleString("fr-FR")}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAmountInput(balance.toString())}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                    >
                      Tout le solde
                    </button>
                  </div>

                  {/* Messages de validation */}
                  {isOverBalance && (
                    <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                      <AlertTriangle size={15} className="flex-shrink-0" />
                      <span>Solde insuffisant. Votre solde disponible est de {balance.toLocaleString("fr-FR")} FCFA.</span>
                    </div>
                  )}
                  {isBelowMin && (
                    <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 text-xs flex items-center gap-2">
                      <Info size={15} className="flex-shrink-0" />
                      <span>Le montant minimum par transfert est de {limits.singleMin.toLocaleString("fr-FR")} FCFA.</span>
                    </div>
                  )}
                  {isAboveMax && (
                    <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 text-xs flex items-center gap-2">
                      <Info size={15} className="flex-shrink-0" />
                      <span>Le montant maximum autorisé par opération est de {limits.singleMax.toLocaleString("fr-FR")} FCFA.</span>
                    </div>
                  )}
                </div>

                {/* Frais et solde après opération */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Frais de transfert NovaPay :</span>
                    <span className="font-bold text-emerald-600">0 FCFA (Gratuit entre comptes)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Montant net reçu par le destinataire :</span>
                    <span className="font-bold text-slate-900">
                      {parsedAmount > 0 ? parsedAmount.toLocaleString("fr-FR") : 0} FCFA
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-semibold text-slate-700">
                    <span>Solde restant estimé :</span>
                    <span className={remainingBalance < 0 ? "text-red-600 font-bold" : "text-slate-900 font-bold"}>
                      {remainingBalance >= 0 ? remainingBalance.toLocaleString("fr-FR") : 0} FCFA
                    </span>
                  </div>
                </div>

                {/* Motif & Catégorie */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                      Catégorie du transfert
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CATEGORIES.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCategory(c.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all text-left ${
                            category === c.id
                              ? "bg-blue-50 border-blue-400 text-[#1859bb]"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span>{c.icon}</span>
                          <span className="truncate">{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Note / Message pour le destinataire (optionnel)
                    </label>
                    <input
                      type="text"
                      value={note}
                      maxLength={120}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Ex: Remboursement déjeuner, loyer octobre, etc."
                      className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-[10px] text-slate-600 text-right mt-1">{note.length} / 120 caractères</div>
                  </div>
                </div>

                {/* Bouton vers étape 3 */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={!isAmountValid}
                    onClick={() => setStep(3)}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#1859bb] hover:bg-[#124491] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    Vérifier et confirmer <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 3 : RÉCAPITULATIF ET CONFIRMATION */}
            {step === 3 && selectedBeneficiary && (
              <div className="space-y-6 max-w-xl mx-auto">
                <div className="text-center">
                  <div className="inline-flex p-3 rounded-2xl bg-blue-50 text-[#1859bb] mb-2">
                    <ShieldCheck size={28} />
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900">Confirmation du transfert</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Vérifiez attentivement les détails avant de signer l’opération dans le Grand Livre.
                  </p>
                </div>

                {/* Boîte de synthèse financière */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200/90 space-y-4">
                  <div className="text-center py-2">
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
                      Montant débité de votre portefeuille
                    </span>
                    <div className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                      {parsedAmount.toLocaleString("fr-FR")}{" "}
                      <small className="text-base font-semibold text-[#1859bb]">FCFA</small>
                    </div>
                    <span className="inline-block mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Frais de transfert : 0 FCFA (Offerts)
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-3 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Bénéficiaire certifié :</span>
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        {selectedBeneficiary.maskedName}
                        <UserCheck size={14} className="text-blue-600" />
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Identifiant :</span>
                      <span className="font-semibold text-blue-700">{selectedBeneficiary.handle}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Compte de destination :</span>
                      <span className="font-mono text-slate-700">{selectedBeneficiary.email || selectedBeneficiary.phone}</span>
                    </div>
                    {note && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Motif :</span>
                        <span className="font-medium text-slate-800 italic">&quot;{note}&quot;</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Avertissement anti-fraude contextuel */}
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
                  <ShieldAlert size={17} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Vérifiez le destinataire et le montant :</strong> le transfert est enregistré immédiatement après confirmation et ne peut pas être annulé depuis cette page.
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                  <ShieldCheck size={17} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>La confirmation utilise votre session NovaPaid. Vérifiez soigneusement le bénéficiaire et le montant.</span>
                </div>

                {/* Bouton de confirmation finale */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleExecuteTransfer}
                    className="w-full py-4 px-4 rounded-xl bg-[#1859bb] hover:bg-[#124491] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-extrabold shadow-lg shadow-blue-900/15 transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw size={17} className="animate-spin" />
                        Écriture atomique dans le Grand Livre…
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        Signer et transférer {parsedAmount.toLocaleString("fr-FR")} FCFA
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setStep(2)}
                    className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Modifier le montant
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 4 : CONFIRMATION ET REÇU OFFICIEL */}
            {step === 4 && completedTransfer && (
              <div className="space-y-6 max-w-xl mx-auto py-2">
                <>
                    {/* Carte de succès */}
                    <div className="text-center space-y-2">
                      <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-600 mb-1 animate-bounce">
                        <CheckCircle2 size={36} />
                      </div>
                      <h2 className="text-2xl font-black text-slate-900">Transfert réussi !</h2>
                      <p className="text-xs text-slate-500">
                        Les fonds ont été immédiatement crédités sur le compte de {completedTransfer.recipientName}.
                      </p>
                    </div>

                    {/* Récapitulatif de confirmation */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3.5 text-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <span className="font-bold text-slate-700">Confirmation NovaPaid</span>
                        <span className="font-mono text-[11px] text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded font-semibold">
                          {completedTransfer.id}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Montant transféré :</span>
                        <span className="font-extrabold text-slate-900 text-sm">
                          {completedTransfer.amount.toLocaleString("fr-FR")} FCFA
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Bénéficiaire :</span>
                        <span className="font-bold text-slate-900">{completedTransfer.recipientName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Identifiant :</span>
                        <span className="text-blue-700 font-semibold">{completedTransfer.recipientHandle}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Date et heure :</span>
                        <span className="text-slate-700 font-medium">
                          {new Date(completedTransfer.createdAt).toLocaleString("fr-FR")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <span className="text-slate-500">Nouveau solde portefeuille :</span>
                        <span className="font-bold text-slate-900">{balance.toLocaleString("fr-FR")} FCFA</span>
                      </div>
                    </div>

                    {/* Boutons d'action : Téléchargement PDF, Partage, Nouveau */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => downloadTransferReceiptPDF(completedTransfer)}
                        className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow transition-all flex items-center justify-center gap-2"
                      >
                        <Download size={15} /> Télécharger la confirmation PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const text = `Reçu NovaPay: J'ai transféré ${completedTransfer.amount.toLocaleString("fr-FR")} FCFA à ${completedTransfer.recipientName}. Réf: ${completedTransfer.id}`;
                          copyToClipboard(text, "receipt-share");
                        }}
                        className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        {copiedKey === "receipt-share" ? (
                          <>
                            <Check size={15} className="text-emerald-600" /> Preuve copiée !
                          </>
                        ) : (
                          <>
                            <Share2 size={15} /> Partager la preuve
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={handleResetForm}
                        className="text-xs font-bold text-[#1859bb] hover:underline"
                      >
                        Effectuer un autre transfert
                      </button>
                    </div>
                </>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 2 : GESTION DES BÉNÉFICIAIRES & FAVORIS                          */}
      {/* ========================================================================= */}
      {activeTab === "beneficiaries" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Annuaire des bénéficiaires</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Gérez vos contacts fréquents pour des transferts sécurisés en 1 clic.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddBeneficiaryModal(true)}
              className="px-4 py-2 bg-[#1859bb] hover:bg-[#124491] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
            >
              <UserPlus size={15} /> Ajouter un bénéficiaire
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
                            Compte actif
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
                    <span>Téléphone :</span>
                    <span className="font-mono text-slate-700">{b.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Coordonnées :</span>
                    <span className="font-mono text-slate-700">{b.email || b.phone}</span>
                  </div>
                  {b.lastTransferDate && (
                    <div className="flex items-center justify-between">
                      <span>Dernier envoi :</span>
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
                    <ArrowLeftRight size={13} /> Envoyer de l’argent
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
              <h2 className="text-lg font-bold text-slate-900">Journal d’audit des transferts</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Consultez toutes les opérations enregistrées avec leurs références Grand Livre et reçus conformes.
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
                Tous ({transfers.length})
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
                Validés
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
                Litiges
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
              placeholder="Rechercher par référence TRF-..., bénéficiaire ou motif..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tableau / Liste des transferts */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {filteredTransfers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Aucun transfert ne correspond aux critères sélectionnés.
              </div>
            ) : (
              filteredTransfers.map((t) => (
                <div
                  key={t.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-tr ${t.recipientAvatarColor} text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-sm`}
                    >
                      {t.recipientInitials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{t.direction === "received" ? `De ${t.counterpartyName || t.recipientName}` : `À ${t.counterpartyName || t.recipientName}`}</span>
                        <span className="text-xs text-slate-500 font-medium">({t.recipientHandle})</span>
                        {t.status === "COMPLETED" && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                            Confirmé
                          </span>
                        )}
                        {t.status === "DISPUTED" && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded flex items-center gap-1">
                            <AlertTriangle size={10} /> En litige
                          </span>
                        )}
                        {t.status === "CANCELLED" && (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.2 rounded">
                            Annulé
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="font-mono text-[11px] text-blue-600">{t.id}</span>
                        <span>·</span>
                        <span>{new Date(t.createdAt).toLocaleDateString("fr-FR", { dateStyle: "medium" })}</span>
                        {t.note && (
                          <>
                            <span>·</span>
                            <span className="italic text-slate-600 truncate max-w-[200px]">&quot;{t.note}&quot;</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pl-13 sm:pl-0">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-slate-900">
                        {t.direction === "received" ? "+" : "−"} {t.amount.toLocaleString("fr-FR")} <small className="text-xs font-semibold">FCFA</small>
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono">Frais: 0 FCFA</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => downloadTransferReceiptPDF(t)}
                        title="Télécharger le reçu PDF"
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewingTransfer(t)}
                        className="px-2.5 py-1.5 bg-[#1859bb] hover:bg-[#124491] text-white text-xs font-bold rounded-lg transition-all"
                      >
                        Détails
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
            <h2 className="text-xl font-black text-slate-900">Recevoir un transfert NovaPaid</h2>
            <p className="text-xs text-slate-500 mt-1">
              Partagez l’email ou le téléphone associé à votre compte. L’expéditeur doit confirmer votre identité avant l’envoi.
            </p>
          </div>

          <div className="space-y-3">
            {receiveDetails.email && <div className="p-3 bg-blue-50 rounded-xl border border-blue-200/80 flex items-center justify-between gap-3">
              <div className="text-left">
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">Email du compte</span>
                <span className="text-sm font-extrabold text-[#10264f] break-all">{receiveDetails.email}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(receiveDetails.email, "email")}
                className="px-3 py-1.5 bg-white text-blue-700 text-xs font-bold rounded-lg border border-blue-200 hover:bg-blue-100/50 transition-all flex items-center gap-1.5"
              >
                {copiedKey === "email" ? <Check size={14} /> : <Copy size={14} />}
                {copiedKey === "email" ? "Copié !" : "Copier"}
              </button>
            </div>}

            {receiveDetails.phone && <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div className="text-left">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Téléphone du compte</span>
                <span className="font-mono text-xs font-bold text-slate-800">{receiveDetails.phone}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(receiveDetails.phone, "phone")}
                className="px-3 py-1.5 bg-white text-slate-700 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-1.5"
              >
                {copiedKey === "phone" ? <Check size={14} /> : <Copy size={14} />}
                {copiedKey === "phone" ? "Copié !" : "Copier"}
              </button>
            </div>}
            {!receiveDetails.email && !receiveDetails.phone && <p className="text-sm text-slate-500">Les coordonnées de réception ne sont pas disponibles. Reconnectez-vous puis réessayez.</p>}
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
                  <h3 className="text-sm font-bold text-slate-900">Détail de l’écriture comptable</h3>
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
                  <span className="text-slate-500">{viewingTransfer.direction === "received" ? "Expéditeur :" : "Bénéficiaire :"}</span>
                  <span className="font-bold text-slate-900">{viewingTransfer.counterpartyName || viewingTransfer.recipientName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{viewingTransfer.direction === "received" ? "Identifiant expéditeur :" : "Identifiant destinataire :"}</span>
                  <span className="font-semibold text-blue-700">{viewingTransfer.recipientHandle}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Montant débité :</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {viewingTransfer.amount.toLocaleString("fr-FR")} FCFA
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Frais de traitement :</span>
                  <span className="text-emerald-600 font-bold">0 FCFA</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Statut de la transaction :</span>
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
                  <ShieldCheck size={13} /> Débit et crédit enregistrés ensemble
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Débit Compte Source :</span>
                  <span className="text-red-700">− {viewingTransfer.amount.toLocaleString("fr-FR")} FCFA</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Crédit Compte Bénéficiaire :</span>
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
                <Download size={14} /> Télécharger la confirmation PDF
              </button>

              {viewingTransfer.status !== "DISPUTED" && viewingTransfer.status !== "CANCELLED" && (
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(true)}
                  className="px-3 py-2.5 border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                >
                  <ShieldAlert size={14} /> Contester
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
                <UserPlus size={16} className="text-[#1859bb]" /> Nouveau bénéficiaire
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
                <label className="font-bold text-slate-700 block mb-1">Téléphone associé au compte :</label>
                <input
                  type="text"
                  value={newBenForm.phone}
                  onChange={(e) => setNewBenForm({ ...newBenForm, phone: e.target.value })}
                  placeholder="+237 6•• •• •• ••"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email associé au compte :</label>
                <input
                  type="email"
                  value={newBenForm.email}
                  onChange={(e) => setNewBenForm({ ...newBenForm, email: e.target.value })}
                  placeholder="nom@domaine.com"
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
                Annuler
              </button>
              <button
                type="button"
                disabled={!newBenForm.email.trim() && !newBenForm.phone.trim()}
                onClick={handleSaveNewBeneficiary}
                className="px-4 py-2 bg-[#1859bb] hover:bg-[#124491] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition-all"
              >
                Enregistrer le contact
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
                <ShieldAlert size={16} /> Contester une opération
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
                <h4 className="text-sm font-bold text-slate-900">Dossier de litige ouvert</h4>
                <p className="text-xs text-slate-500">
                  Notre équipe de conformité et sécurité examine cette transaction. Vous serez contacté sous 24h ouvrées.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-600">
                  Vous contestez le transfert <strong>{viewingTransfer.id}</strong> d’un montant de{" "}
                  <strong>{viewingTransfer.amount.toLocaleString("fr-FR")} FCFA</strong> vers{" "}
                  <strong>{viewingTransfer.recipientName}</strong>.
                </p>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Motif de la contestation (fraude, erreur de destinataire, piratage) :
                  </label>
                  <textarea
                    rows={3}
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="Expliquez ce qui s'est passé..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDisputeModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={!disputeReason.trim()}
                    onClick={handleDisputeSubmit}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition-all"
                  >
                    Transmettre au Support Risque
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
