"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Info,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Unlock,
  X,
  Zap,
} from "lucide-react";
import { playTap } from "@/app/lib/sound";
import { useLanguage } from "@/app/lib/i18n";

type CardBrand = "visa" | "mastercard";
type CardStatus = "active" | "frozen" | "cancelled" | "closed";

interface CardData {
  id: number;
  label: string;
  maskedPan: string;
  cardType: string;
  status: CardStatus;
  balanceUsd: number;
  brand: CardBrand;
}

const MAX_CARDS = 3;
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 100;
const CREATION_FEE = 9;

function fmt(n: number) {
  return "$" + n.toFixed(2);
}

function VisaMark() {
  return <span className="npvc-brand-visa" aria-label="Visa">VISA</span>;
}

function MastercardMark() {
  return (
    <span className="npvc-brand-mc" aria-label="Mastercard">
      <i /><i />
      <small>mastercard</small>
    </span>
  );
}

function CardChip() {
  return (
    <svg className="npvc-chip" viewBox="0 0 34 26" fill="none" aria-hidden="true">
      <rect width="34" height="26" rx="4" fill="rgba(255,255,255,.18)" />
      <rect x="13" width="8" height="26" fill="rgba(255,255,255,.1)" />
      <rect y="9" width="34" height="8" fill="rgba(255,255,255,.1)" />
      <rect x="1" y="1" width="32" height="24" rx="3" stroke="rgba(255,255,255,.25)" strokeWidth=".5" fill="none" />
    </svg>
  );
}

function CardWidget({ card, flipped, onFlip, hidden }: {
  card: CardData; flipped: boolean; onFlip: () => void; hidden: boolean;
}) {
  const isVisa = card.brand === "visa";
  const statusColor = card.status === "active" ? "#22c55e" : card.status === "frozen" ? "#60a5fa" : "#f87171";
  const statusLabel = card.status === "active" ? "ACTIVE" : card.status === "frozen" ? "GELÉE" : "FERMÉE";

  return (
    <div className="npvc-card-scene">
      <button
        className={"npvc-card-3d" + (flipped ? " is-flipped" : "") + (card.status !== "active" ? " is-dim" : "")}
        type="button" onClick={onFlip} aria-label="Retourner la carte"
      >
        <span className={"npvc-card-face npvc-card-front npvc-brand-bg-" + card.brand}>
          <span className="npvc-card-glow" />
          <span className="npvc-card-row npvc-card-row-top">
            <CardChip />
            {isVisa ? <VisaMark /> : <MastercardMark />}
          </span>
          <span className="npvc-card-pan">{hidden ? "•••• •••• •••• ••••" : card.maskedPan}</span>
          <span className="npvc-card-row npvc-card-row-bottom">
            <span className="npvc-card-field"><small>SOLDE</small><b>{hidden ? "••••" : fmt(card.balanceUsd)}</b></span>
            <span className="npvc-card-field"><small>EXPIRE</small><b>10/29</b></span>
            <span className="npvc-card-field"><small>STATUT</small><b style={{ color: statusColor }}>{statusLabel}</b></span>
          </span>
        </span>
        <span className="npvc-card-face npvc-card-back">
          <span className="npvc-card-stripe" />
          <span className="npvc-card-cvv-row">
            <span className="npvc-card-cvv-tape" />
            <span className="npvc-card-cvv-box"><small>CVV</small><b>•••</b></span>
          </span>
          <span className="npvc-card-back-brand">{isVisa ? <VisaMark /> : <MastercardMark />}</span>
        </span>
      </button>
    </div>
  );
}

function EmptyCards({ onCreate }: { onCreate: () => void }) {
  const { t } = useLanguage();

  return (
    <div className="npvc-empty">
      <div className="npvc-empty-icon">
        <CreditCard size={36} />
        <span className="npvc-empty-sparkle"><Sparkles size={14} /></span>
      </div>
      <h2>{t("no_cards_available")}</h2>
      <p>{t("no_cards_desc")}</p>
      <button className="npvc-create-btn" type="button" onClick={onCreate}>
        <Plus size={16} />
        {t("create_first_card")}
      </button>
    </div>
  );
}

function CardListItem({ card, active, onClick }: { card: CardData; active: boolean; onClick: () => void }) {
  const statusClass = card.status === "active" ? "is-active-status" : card.status === "frozen" ? "is-frozen-status" : "is-closed-status";

  return (
    <button
      className={"npvc-card-thumb" + (active ? " is-active" : "") + (card.status !== "active" ? " is-dim" : "")}
      type="button" onClick={onClick}
    >
      <span className={"npvc-card-thumb-bg npvc-brand-bg-" + card.brand}>
        <span className="npvc-card-thumb-mark">
          {card.brand === "visa" ? <VisaMark /> : <MastercardMark />}
        </span>
      </span>
      <span className="npvc-card-thumb-info">
        <span className="npvc-card-thumb-label">{card.label}</span>
        <span className="npvc-card-thumb-pan">{card.maskedPan.slice(-9)}</span>
      </span>
      <span className="npvc-card-thumb-right">
        <span className="npvc-card-thumb-balance">{fmt(card.balanceUsd)}</span>
        <span className={"npvc-card-thumb-status " + statusClass}>
          {card.status === "active" ? "Active" : card.status === "frozen" ? "Gelée" : "Fermée"}
        </span>
      </span>
      <ChevronRight size={14} className="npvc-card-thumb-chevron" />
    </button>
  );
}

function CreateDrawer({ open, onClose, onCreated, walletBalance, currentCount }: {
  open: boolean; onClose: () => void;
  onCreated: (card: CardData) => void; walletBalance: number; currentCount: number;
}) {
  const { t } = useLanguage();
  const [brand, setBrand] = useState<CardBrand>("visa");
  const [amount, setAmount] = useState(MIN_AMOUNT);
  const [amountInput, setAmountInput] = useState("1.00");
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = CREATION_FEE + amount;
  const isLimitReached = currentCount >= MAX_CARDS;

  const previewCard: CardData = {
    id: 0,
    label: brand === "visa" ? "Carte Visa" : "Carte Mastercard",
    maskedPan: (brand === "visa" ? "4" : "5") + "*** •••• •••• ****",
    cardType: "virtual",
    status: "active",
    balanceUsd: amount,
    brand,
  };

  const updateAmount = (v: number) => {
    const n = Number.isFinite(v) ? Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, v)) : MIN_AMOUNT;
    setAmount(n);
    setAmountInput(n.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLimitReached) {
      setError("Limite maximale de 3 cartes atteinte.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, amountUsd: amount }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Erreur lors de la création.");
      onCreated(data.card);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="npvc-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="npvc-drawer" role="dialog" aria-modal="true" aria-label={t("new_card")}>
        <div className="npvc-drawer-header">
          <div>
            <h2>{t("new_card")}</h2>
            <span className="npvc-drawer-counter">{currentCount}/{MAX_CARDS} cartes</span>
          </div>
          <button className="npvc-drawer-close" type="button" onClick={onClose} aria-label={t("close")}>
            <X size={18} />
          </button>
        </div>

        {isLimitReached ? (
          <div className="npvc-drawer-limit-alert">
            <AlertCircle size={22} />
            <div>
              <strong>{t("card_limit_reached")}</strong>
              <p>{t("card_limit_warning")}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="npvc-drawer-preview">
              <CardWidget card={previewCard} flipped={flipped} onFlip={() => setFlipped(f => !f)} hidden={false} />
              <p className="npvc-drawer-preview-hint">Appuyez sur la carte pour la retourner</p>
            </div>
            <form className="npvc-drawer-form" onSubmit={handleSubmit}>
              <fieldset className="npvc-drawer-field">
                <legend>Réseau de paiement</legend>
                <div className="npvc-drawer-brand-opts">
                  {(["visa", "mastercard"] as CardBrand[]).map((b) => (
                    <button key={b} type="button"
                      className={"npvc-drawer-brand-btn" + (brand === b ? " is-sel" : "")}
                      onClick={() => { playTap(); setBrand(b); setFlipped(false); }}
                    >
                      {b === "visa" ? <VisaMark /> : <MastercardMark />}
                      <span>{b === "visa" ? "Visa" : "Mastercard"}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="npvc-drawer-field">
                <label className="npvc-drawer-label">Montant initial (USD)</label>
                <div className="npvc-drawer-amount-row">
                  <span className="npvc-drawer-currency">$</span>
                  <input type="number" min={MIN_AMOUNT} max={MAX_AMOUNT} step="0.01"
                    value={amountInput}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setAmountInput(e.target.value);
                      const p = parseFloat(e.target.value);
                      if (!isNaN(p) && p >= MIN_AMOUNT && p <= MAX_AMOUNT) setAmount(p);
                    }}
                    onBlur={() => updateAmount(parseFloat(amountInput))}
                    className="npvc-drawer-amount-input"
                  />
                </div>
                <input type="range" min={MIN_AMOUNT} max={MAX_AMOUNT} step="0.01"
                  value={amount} onChange={(e) => updateAmount(parseFloat(e.target.value))}
                  className="npvc-drawer-range"
                />
                <div className="npvc-drawer-range-labels"><small>$1</small><small>$100</small></div>
              </div>
              <div className="npvc-drawer-summary">
                <div className="npvc-drawer-summary-row"><span>Frais d'émission</span><span>$9.00</span></div>
                <div className="npvc-drawer-summary-row"><span>Montant crédité</span><span>{fmt(amount)}</span></div>
                <div className="npvc-drawer-summary-total"><span>Total à payer</span><span>{fmt(total)}</span></div>
                {walletBalance < total && (
                  <p className="npvc-drawer-warn">
                    Solde insuffisant ({Math.round(walletBalance * 655).toLocaleString("fr-FR")} FCFA disponibles).
                  </p>
                )}
              </div>
              {error && <p className="npvc-drawer-error">{error}</p>}
              <div className="npvc-drawer-footer">
                <div className="npvc-drawer-security"><ShieldCheck size={13} /><span>3D Secure · PCI-DSS</span></div>
                <button className="npvc-create-btn npvc-drawer-submit" type="submit" disabled={loading}>
                  {loading ? <RefreshCw size={15} className="spin" /> : <Plus size={15} />}
                  {loading ? "Création en cours…" : "Créer ma carte"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export function VirtualCardsSection({ language: _language }: { language?: any } = {}) {
  const { t, language } = useLanguage();
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  // Freeze / Unfreeze confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; card: CardData | null; action: "freeze" | "unfreeze" }>({
    open: false,
    card: null,
    action: "freeze",
  });
  const [isTogglingFreeze, setIsTogglingFreeze] = useState(false);
  const [toggleFeedback, setToggleFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [cardTxs, setCardTxs] = useState<any[]>([]);
  const [cardTxsLoading, setCardTxsLoading] = useState(false);
  const [fundModal, setFundModal] = useState<{ open: boolean; card: CardData | null }>({ open: false, card: null });
  const [fundAmount, setFundAmount] = useState("10");
  const [funding, setFunding] = useState(false);
  const [withdrawModal, setWithdrawModal] = useState<{ open: boolean; card: CardData | null }>({ open: false, card: null });
  const [withdrawAmount, setWithdrawAmount] = useState("10");
  const [withdrawing, setWithdrawing] = useState(false);

  const activeCard = cards.find(c => c.id === activeId) ?? cards[0] ?? null;
  const isLimitReached = cards.length >= MAX_CARDS;

  const loadCards = useCallback(async () => {
    try {
      const [cr, wr] = await Promise.all([
        fetch("/api/cards").then(r => r.json()),
        fetch("/api/wallet").then(r => r.json()),
      ]);
      if (cr.success && Array.isArray(cr.cards)) {
        setCards(cr.cards);
        if (cr.cards.length > 0) {
          setActiveId((curr) => (curr && cr.cards.some((c: CardData) => c.id === curr) ? curr : cr.cards[0].id));
        }
      }
      if (wr.success) setWalletBalance((wr.wallet?.availableMinor ?? 0) / 100);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCards(); }, [loadCards]);

  useEffect(() => {
    if (!activeId) return;
    setCardTxsLoading(true);
    fetch(`/api/cards?cardId=${activeId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.transactions)) setCardTxs(data.transactions);
        else setCardTxs([]);
      })
      .catch(() => setCardTxs([]))
      .finally(() => setCardTxsLoading(false));
  }, [activeId]);

  const handleCreated = (card: CardData) => {
    setCards(prev => [card, ...prev]);
    setActiveId(card.id);
  };

  const openFreezeModal = (card: CardData) => {
    const action = card.status === "frozen" ? "unfreeze" : "freeze";
    setConfirmModal({ open: true, card, action });
  };

  const handleConfirmFund = async () => {
    if (!fundModal.card) return;
    const amount = Number(fundAmount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 1000) {
      setToggleFeedback({ type: "error", text: "Montant de recharge invalide (1 - 1 000 USD)." });
      return;
    }
    setFunding(true);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fund", cardId: fundModal.card.id, amountUsd: amount }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Recharge impossible.");
      setCards(prev => prev.map(c => c.id === fundModal.card!.id ? data.card : c));
      if (typeof data.newWalletBalanceXaf === "number") setWalletBalance(data.newWalletBalanceXaf);
      setToggleFeedback({ type: "success", text: `Carte rechargée avec succès (+$${amount.toFixed(2)} USD).` });
      setFundModal({ open: false, card: null });
      // Refresh txs
      fetch(`/api/cards?cardId=${fundModal.card.id}`).then(r => r.json()).then(d => { if (d.success) setCardTxs(d.transactions); });
    } catch (e: any) {
      setToggleFeedback({ type: "error", text: e?.message || "Erreur lors de la recharge." });
    } finally {
      setFunding(false);
    }
  };

  const handleConfirmWithdraw = async () => {
    if (!withdrawModal.card) return;
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 1000) {
      setToggleFeedback({ type: "error", text: "Montant de rapatriement invalide (1 - 1 000 USD)." });
      return;
    }
    setWithdrawing(true);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw", cardId: withdrawModal.card.id, amountUsd: amount }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Rapatriement impossible.");
      setCards(prev => prev.map(c => c.id === withdrawModal.card!.id ? data.card : c));
      if (typeof data.newWalletBalanceXaf === "number") setWalletBalance(data.newWalletBalanceXaf);
      setToggleFeedback({ type: "success", text: `Fonds rapatriés avec succès vers le portefeuille (-$${amount.toFixed(2)} USD).` });
      setWithdrawModal({ open: false, card: null });
      // Refresh txs
      fetch(`/api/cards?cardId=${withdrawModal.card.id}`).then(r => r.json()).then(d => { if (d.success) setCardTxs(d.transactions); });
    } catch (e: any) {
      setToggleFeedback({ type: "error", text: e?.message || "Erreur lors du rapatriement." });
    } finally {
      setWithdrawing(false);
    }
  };

  const handleConfirmToggleFreeze = async () => {
    if (!confirmModal.card || isTogglingFreeze) return;
    setIsTogglingFreeze(true);
    setToggleFeedback(null);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_freeze", cardId: confirmModal.card.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.card) {
        throw new Error(data.error || "Impossible de modifier l'état de la carte.");
      }
      setCards(prev => prev.map(c => c.id === data.card.id ? { ...c, status: data.card.status } : c));
      setToggleFeedback({
        type: "success",
        text: data.card.status === "frozen"
          ? "Carte gelée avec succès. Vos paiements en ligne sont suspendus."
          : "Carte réactivée avec succès.",
      });
      setConfirmModal({ open: false, card: null, action: "freeze" });
    } catch (err: any) {
      setToggleFeedback({ type: "error", text: err?.message || "Erreur de connexion." });
    } finally {
      setIsTogglingFreeze(false);
    }
  };

  if (loading) {
    return (
      <div className="npvc-loading">
        <RefreshCw size={22} className="spin" />
        <span>{t("loading")}</span>
      </div>
    );
  }

  return (
    <div className="npvc-root">
      <header className="npvc-header">
        <div>
          <div className="npvc-title-row">
            <h1 className="npvc-title">{t("cards_title")}</h1>
            <span className={"npvc-counter-badge " + (isLimitReached ? "is-limit" : "")}>
              {cards.length}/{MAX_CARDS} {t("card_limit_badge")}
            </span>
          </div>
          <p className="npvc-subtitle">
            {cards.length} {t("card_limit_badge")} · Solde portefeuille : {Math.round(walletBalance * 655).toLocaleString("fr-FR")} FCFA
          </p>
        </div>

        {isLimitReached ? (
          <button
            className="npvc-create-btn npvc-header-btn is-limit-reached"
            type="button"
            disabled
            title={t("card_limit_warning")}
          >
            <Lock size={15} />
            <span>{t("card_limit_reached")}</span>
          </button>
        ) : (
          <button className="npvc-create-btn npvc-header-btn" type="button" onClick={() => setDrawerOpen(true)}>
            <Plus size={15} />
            <span>{t("new_card")}</span>
          </button>
        )}
      </header>

      {/* 3 Cards Limit Notice if reached */}
      {isLimitReached && (
        <div className="npvc-limit-banner">
          <Info size={16} />
          <div>
            <strong>Limite maximale de 3 cartes atteinte</strong>
            <p>{t("card_limit_warning")}</p>
          </div>
        </div>
      )}

      {/* Operation Feedback */}
      {toggleFeedback && (
        <div className={"npvc-feedback-banner " + toggleFeedback.type}>
          {toggleFeedback.type === "success" ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>{toggleFeedback.text}</span>
          <button type="button" onClick={() => setToggleFeedback(null)} aria-label="Fermer"><X size={14} /></button>
        </div>
      )}

      {cards.length === 0 ? (
        <EmptyCards onCreate={() => setDrawerOpen(true)} />
      ) : (
        <div className="npvc-layout">
          <aside className="npvc-sidebar">
            <div className="npvc-sidebar-top">
              <p className="npvc-sidebar-label">Toutes les cartes ({cards.length}/{MAX_CARDS})</p>
            </div>
            <div className="npvc-sidebar-list">
              {cards.map(c => (
                <CardListItem key={c.id} card={c}
                  active={c.id === (activeCard?.id ?? -1)}
                  onClick={() => { setActiveId(c.id); setFlipped(false); }}
                />
              ))}
            </div>
          </aside>

          {activeCard && (
            <div className="npvc-detail">
              <div className="npvc-detail-card-wrap">
                <CardWidget card={activeCard} flipped={flipped} onFlip={() => setFlipped(f => !f)} hidden={hidden} />
                <div className="npvc-detail-card-actions">
                  <button type="button" className="npvc-icon-btn" onClick={() => setHidden(h => !h)}>
                    {hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                    <span>{hidden ? t("show_details") : t("hide_details")}</span>
                  </button>
                  <button type="button" className="npvc-icon-btn" onClick={() => setFlipped(f => !f)}>
                    <RefreshCw size={15} />
                    <span>{t("flip_card")}</span>
                  </button>
                  {activeCard.status === "frozen" ? (
                    <button
                      type="button"
                      className="npvc-icon-btn is-unfreeze"
                      onClick={() => openFreezeModal(activeCard)}
                      title={t("unfreeze_card")}
                    >
                      <Unlock size={15} />
                      <span>{t("unfreeze_card")}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="npvc-icon-btn is-freeze"
                      onClick={() => openFreezeModal(activeCard)}
                      title={t("freeze_card")}
                    >
                      <Lock size={15} />
                      <span>{t("freeze_card")}</span>
                    </button>
                  )}
                </div>
                <p className="npvc-flip-hint">Touchez la carte pour la retourner</p>
              </div>

              <div className="npvc-info-panel">
                <div className="npvc-info-grid">
                  <div className="npvc-info-tile">
                    <small>{t("card_balance")}</small>
                    <strong>{hidden ? "••••" : fmt(activeCard.balanceUsd)}</strong>
                  </div>
                  <div className="npvc-info-tile">
                    <small>{t("card_network")}</small>
                    <strong>{activeCard.brand === "visa" ? "Visa" : "Mastercard"}</strong>
                  </div>
                  <div className="npvc-info-tile">
                    <small>{t("card_type")}</small>
                    <strong>Virtuelle</strong>
                  </div>
                  <div className="npvc-info-tile">
                    <small>{t("card_status")}</small>
                    <strong className={"npvc-status-" + activeCard.status}>
                      {activeCard.status === "active" ? t("active_card") : activeCard.status === "frozen" ? t("frozen_card") : t("closed_card")}
                    </strong>
                  </div>
                </div>

                {/* Complete Card Actions Bar (Recharger, Geler, Rapatrier) */}
                <div className="npvc-actions-bar">
                  <button
                    type="button"
                    className="npvc-act-btn npvc-act-btn--fund npvc-action-fund-btn"
                    onClick={() => { setFundModal({ open: true, card: activeCard }); setFundAmount("10"); }}
                    disabled={activeCard.status !== "active"}
                    title="Recharger la carte depuis votre solde"
                  >
                    <Zap size={15} />
                    <span>Recharger</span>
                  </button>

                  {activeCard.status === "frozen" ? (
                    <button
                      type="button"
                      className="npvc-act-btn npvc-act-btn--unfreeze"
                      onClick={() => openFreezeModal(activeCard)}
                      disabled={isTogglingFreeze}
                      title={t("unfreeze_card")}
                    >
                      <Unlock size={15} />
                      <span>{t("unfreeze_card")}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="npvc-act-btn npvc-act-btn--freeze"
                      onClick={() => openFreezeModal(activeCard)}
                      disabled={isTogglingFreeze}
                      title={t("freeze_card")}
                    >
                      <Lock size={15} />
                      <span>{t("freeze_card")}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="npvc-act-btn npvc-act-btn--withdraw"
                    onClick={() => { setWithdrawModal({ open: true, card: activeCard }); setWithdrawAmount("10"); }}
                    disabled={activeCard.status !== "active" || activeCard.balanceUsd < 1}
                    title="Rapatrier les fonds vers votre portefeuille principal"
                  >
                    <CreditCard size={15} />
                    <span>Rapatrier</span>
                  </button>
                </div>

                <div className="npvc-info-security">
                  <ShieldCheck size={16} />
                  <div>
                    <p className="npvc-security-title">Protection & Sécurité bancaire</p>
                    <ul>
                      <li><Check size={12} />Authentification 3D Secure active</li>
                      <li><Check size={12} />Plafond et blocage instantané</li>
                      <li><Check size={12} />Normes PCI-DSS bancaires</li>
                    </ul>
                  </div>
                </div>

                {/* Adresse de facturation internationale (Billing Address US - PrismCard) */}
                <div style={{ marginTop: "14px", padding: "14px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 700, color: "#1e293b", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
                      Adresse de facturation (Billing Address)
                    </span>
                    <span style={{ fontSize: "10px", color: "#059669", fontWeight: 700, background: "#ecfdf5", padding: "2px 6px", borderRadius: "6px" }}>
                      Valide USA
                    </span>
                  </div>
                  <div style={{ color: "#475569", lineHeight: "1.6" }}>
                    <div><strong>Rue :</strong> 1209 Orange Street</div>
                    <div><strong>Ville / État :</strong> Wilmington, Delaware (DE)</div>
                    <div><strong>Code Postal (ZIP) :</strong> 19801</div>
                    <div><strong>Pays :</strong> United States (US)</div>
                  </div>
                  <small style={{ display: "block", marginTop: "6px", color: "#94a3b8", fontSize: "10px" }}>
                    Utilisez cette adresse pour vos achats internationaux (Netflix, Spotify, Amazon, App Store).
                  </small>
                </div>

                {/* Card transaction history */}
                <div className="npvc-card-transactions">
                  <h4>{t("transaction_history")}</h4>
                  {cardTxsLoading ? (
                    <div className="npvc-empty-card-tx" style={{display:"flex",alignItems:"center",gap:"6px"}}><RefreshCw size={13} className="spin" /> Chargement...</div>
                  ) : cardTxs.length === 0 ? (
                    <p className="npvc-empty-card-tx">{t("no_card_tx")}</p>
                  ) : (
                    <ul className="npvc-tx-list">
                      {cardTxs.map((tx) => (
                        <li key={tx.id} className="npvc-tx-item">
                          <span className={"npvc-tx-icon " + (tx.type === "refund" ? "is-credit" : "is-debit")}>
                            {tx.type === "refund" ? "+" : "-"}
                          </span>
                          <div className="npvc-tx-info">
                            <span className="npvc-tx-desc">{tx.merchant || tx.description}</span>
                            <span className="npvc-tx-date">{new Date(tx.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          </div>
                          <span className={"npvc-tx-amount " + (tx.type === "refund" ? "is-credit" : "is-debit")}>
                            {tx.type === "refund" ? "+" : "-"}${tx.amountUsd.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Freeze / Unfreeze confirmation modal */}
      {confirmModal.open && confirmModal.card && (
        <div className="npvc-modal-backdrop" role="dialog" aria-modal="true">
          <div className="npvc-confirm-dialog">
            <div className={"npvc-confirm-icon " + (confirmModal.action === "freeze" ? "is-warn" : "is-info")}>
              {confirmModal.action === "freeze" ? <Lock size={26} /> : <Unlock size={26} />}
            </div>
            <h3>
              {confirmModal.action === "freeze"
                ? "Geler la carte " + confirmModal.card.label + " ?"
                : "Réactiver la carte " + confirmModal.card.label + " ?"}
            </h3>
            <p>
              {confirmModal.action === "freeze"
                ? "Vos paiements en ligne avec cette carte seront immédiatement suspendus. Vous pourrez la débloquer à tout moment en un clic."
                : "Votre carte sera immédiatement dégelée et prête pour tous vos achats en ligne."}
            </p>
            <div className="npvc-confirm-actions">
              <button
                type="button"
                className="npvc-confirm-cancel"
                onClick={() => setConfirmModal({ open: false, card: null, action: "freeze" })}
                disabled={isTogglingFreeze}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className={"npvc-confirm-btn " + (confirmModal.action === "freeze" ? "is-freeze-action" : "is-unfreeze-action")}
                onClick={handleConfirmToggleFreeze}
                disabled={isTogglingFreeze}
              >
                {isTogglingFreeze ? (
                  <RefreshCw size={15} className="spin" />
                ) : confirmModal.action === "freeze" ? (
                  <Lock size={15} />
                ) : (
                  <Unlock size={15} />
                )}
                <span>
                  {isTogglingFreeze
                    ? "Traitement…"
                    : confirmModal.action === "freeze"
                    ? "Oui, geler la carte"
                    : "Oui, réactiver la carte"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recharge Modal */}
      {fundModal.open && fundModal.card && (
        <div className="npvc-modal-backdrop" role="dialog" aria-modal="true">
          <div className="npvc-confirm-dialog" style={{ maxWidth: "420px" }}>
            <div className="npvc-confirm-icon is-info">
              <Zap size={26} />
            </div>
            <h3>Recharger {fundModal.card.label}</h3>
            <p>
              Ajoutez des fonds instantanément depuis votre portefeuille NovaPaid (Solde disponible : <strong>{walletBalance.toLocaleString("fr-FR")} FCFA</strong>). Taux : 1 USD = 610 FCFA.
            </p>
            <div style={{ margin: "16px 0", textAlign: "left" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                Montant en USD ($)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  className="np-text-input"
                  style={{ width: "100%", paddingLeft: "28px", fontWeight: 700 }}
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="10"
                />
                <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontWeight: 700 }}>$</span>
              </div>
              <small style={{ display: "block", marginTop: "6px", color: "#64748b", fontSize: "11px" }}>
                Débit portefeuille estimé : <strong>{(Number(fundAmount || 0) * 610).toLocaleString("fr-FR")} FCFA</strong>
              </small>
            </div>
            <div className="npvc-confirm-actions">
              <button
                type="button"
                className="npvc-confirm-cancel"
                onClick={() => setFundModal({ open: false, card: null })}
                disabled={funding}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className="npvc-confirm-btn is-unfreeze-action npvc-action-fund-btn"
                onClick={handleConfirmFund}
                disabled={funding || Number(fundAmount) < 1}
              >
                {funding ? <RefreshCw size={15} className="spin" /> : <Zap size={15} />}
                <span>{funding ? "Recharge en cours…" : "Confirmer la recharge"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {withdrawModal.open && withdrawModal.card && (
        <div className="npvc-modal-backdrop" role="dialog" aria-modal="true">
          <div className="npvc-confirm-dialog" style={{ maxWidth: "420px" }}>
            <div className="npvc-confirm-icon is-warn">
              <CreditCard size={26} />
            </div>
            <h3>Rapatrier des fonds de la carte</h3>
            <p>
              Rapatriez des fonds de votre carte <strong>{withdrawModal.card.label}</strong> (Solde carte : <strong>${withdrawModal.card.balanceUsd.toFixed(2)} USD</strong>) directement sur votre compte principal NovaPaid en FCFA.
            </p>
            <div style={{ margin: "16px 0", textAlign: "left" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                Montant à rapatrier en USD ($)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  min="1"
                  max={Math.floor(withdrawModal.card.balanceUsd)}
                  step="1"
                  className="np-text-input"
                  style={{ width: "100%", paddingLeft: "28px", fontWeight: 700 }}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="10"
                />
                <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontWeight: 700 }}>$</span>
              </div>
              <small style={{ display: "block", marginTop: "6px", color: "#64748b", fontSize: "11px" }}>
                Crédit portefeuille estimé : <strong>{(Number(withdrawAmount || 0) * 610).toLocaleString("fr-FR")} FCFA</strong>
              </small>
            </div>
            <div className="npvc-confirm-actions">
              <button
                type="button"
                className="npvc-confirm-cancel"
                onClick={() => setWithdrawModal({ open: false, card: null })}
                disabled={withdrawing}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className="npvc-confirm-btn is-freeze-action"
                onClick={handleConfirmWithdraw}
                disabled={withdrawing || Number(withdrawAmount) < 1 || Number(withdrawAmount) > withdrawModal.card.balanceUsd}
              >
                {withdrawing ? <RefreshCw size={15} className="spin" /> : <CreditCard size={15} />}
                <span>{withdrawing ? "Rapatriement…" : "Rapatrier vers le solde"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={handleCreated}
        walletBalance={walletBalance}
        currentCount={cards.length}
      />
    </div>
  );
}

export default VirtualCardsSection;
