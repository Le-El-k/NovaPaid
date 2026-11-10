"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Download,
  Filter,
  Receipt,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";

export interface TransactionItem {
  id: number | string;
  publicRef: string;
  type: string; // 'deposit' | 'withdrawal' | 'transfer' | 'purchase'
  status: string;
  amountFormatted: string;
  direction: "credit" | "debit";
  description: string;
  createdAt: string;
}

type FilterType = "all" | "deposit" | "withdrawal" | "transfer" | "purchase";

export function HistorySection({ onOpenSupport }: { onOpenSupport?: (txRef: string) => void }) {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    fetch("/api/transactions")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
      })
      .catch(() => setTransactions([]));
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchType = filterType === "all" || tx.type === filterType;
      const query = searchQuery.trim().toLowerCase();
      const matchQuery =
        !query ||
        tx.description.toLowerCase().includes(query) ||
        tx.publicRef.toLowerCase().includes(query) ||
        tx.amountFormatted.toLowerCase().includes(query);
      return matchType && matchQuery;
    });
  }, [transactions, filterType, searchQuery]);

  const copyRef = (ref: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(ref);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const headers = ["Date", "Reference", "Type", "Sens", "Montant_FCFA", "Description", "Statut"];
    const rows = filtered.map((tx) => [
      `"${new Date(tx.createdAt).toLocaleString("fr-FR")}"`,
      `"${tx.publicRef}"`,
      `"${tx.type}"`,
      `"${tx.direction}"`,
      `"${tx.amountFormatted.replace(/[^0-9]/g, '')}"`,
      `"${(tx.description || "").replace(/"/g, '""')}"`,
      `"${statusLabel(tx.status)}"`
    ]);
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `novapaid_releve_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getIconForType = (type: string, direction: "credit" | "debit") => {
    if (type === "deposit") return <ArrowDownLeft size={16} className="text-emerald-500" />;
    if (type === "withdrawal") return <ArrowUpRight size={16} className="text-rose-500" />;
    if (type === "transfer") return <ArrowLeftRight size={16} className="text-indigo-500" />;
    if (type === "purchase") return <ShoppingBag size={16} className="text-amber-500" />;
    return direction === "credit" ? (
      <ArrowDownLeft size={16} className="text-emerald-500" />
    ) : (
      <ArrowUpRight size={16} className="text-rose-500" />
    );
  };

  const statusLabel = (status: string) => status === "pending"
    ? "En attente"
    : status === "succeeded"
      ? "Confirmée"
      : status === "rejected"
        ? "Rejetée"
        : status === "failed"
          ? "Échouée"
          : status;

  const statusClass = (status: string) => status === "succeeded"
    ? "success"
    : status === "pending"
      ? "warning"
      : "danger";

  return (
    <div className="np-history-view-container">
      {/* Barre d'outils filtres et recherche */}
      <div className="np-panel np-history-toolbar">
        <div className="np-history-search">
          <Search size={16} className="np-search-icon" />
          <input
            type="text"
            className="np-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par description, référence ou montant..."
          />
          {searchQuery && (
            <button
              type="button"
              className="np-clear-search"
              onClick={() => setSearchQuery("")}
              aria-label="Effacer la recherche"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="np-history-filter-chips">
          <button
            type="button"
            className={`np-filter-chip ${filterType === "all" ? "active" : ""}`}
            onClick={() => setFilterType("all")}
          >
            Toutes ({transactions.length})
          </button>
          <button
            type="button"
            className={`np-filter-chip ${filterType === "deposit" ? "active" : ""}`}
            onClick={() => setFilterType("deposit")}
          >
            Dépôts
          </button>
          <button
            type="button"
            className={`np-filter-chip ${filterType === "withdrawal" ? "active" : ""}`}
            onClick={() => setFilterType("withdrawal")}
          >
            Retraits
          </button>
          <button
            type="button"
            className={`np-filter-chip ${filterType === "transfer" ? "active" : ""}`}
            onClick={() => setFilterType("transfer")}
          >
            Transferts
          </button>
          <button
            type="button"
            className={`np-filter-chip ${filterType === "purchase" ? "active" : ""}`}
            onClick={() => setFilterType("purchase")}
          >
            Boutique & Jeux
          </button>
        </div>
      </div>

      {/* Liste des transactions */}
      <div className="np-panel np-history-list-panel">
        <div className="np-panel-heading">
          <div>
            <span className="np-overline">RELEVÉ DE COMPTE</span>
            <h2>Historique des transactions ({filtered.length})</h2>
          </div>
          <button
            type="button"
            className="np-outline-button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            title="Télécharger l'historique au format CSV"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "6px 12px" }}
          >
            <Download size={14} />
            <span>Exporter CSV</span>
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="np-empty-state">
            <Activity size={32} className="np-empty-icon" />
            <p>Aucune transaction ne correspond à vos critères de recherche.</p>
          </div>
        ) : (
          <div className="np-transaction-list detailed">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="np-transaction-row clickable"
                onClick={() => setSelectedTx(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelectedTx(item)}
              >
                <div className={`np-merchant ${item.direction}`}>
                  {getIconForType(item.type, item.direction)}
                </div>
                <div className="np-transaction-copy">
                  <strong>{item.description}</strong>
                  <small>
                    Réf : {item.publicRef} • {new Date(item.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </div>
                <div className="np-tx-status-col">
                  <span className={`np-badge ${statusClass(item.status)}`}>{statusLabel(item.status)}</span>
                </div>
                <div className={`np-transaction-amount ${item.direction}`}>
                  <span>{item.amountFormatted}</span>
                  <small>Cliquer pour le reçu</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modale de reçu détaillé */}
      {selectedTx && (
        <div
          className="np-modal-backdrop"
          role="presentation"
          onMouseDown={(e) => e.target === e.currentTarget && setSelectedTx(null)}
        >
          <section className="np-modal np-receipt-modal" role="dialog" aria-modal="true">
            <button
              type="button"
              className="np-modal-close"
              aria-label="Fermer le reçu"
              onClick={() => setSelectedTx(null)}
            >
              <X size={18} />
            </button>

            <div className="np-receipt-header">
              <span className="np-receipt-icon success">
                <CheckCircle2 size={32} />
              </span>
              <span className="np-overline">REÇU OFFICIEL NOVAPAID</span>
              <h3>Justificatif d’Opération</h3>
              <div className="np-receipt-hero-amount">
                <span className={selectedTx.direction}>{selectedTx.amountFormatted}</span>
              </div>
            </div>

            <div className="np-receipt-body">
              <div className="np-receipt-row">
                <span>Description</span>
                <strong>{selectedTx.description}</strong>
              </div>
              <div className="np-receipt-row">
                <span>Type d’opération</span>
                <strong className="capitalize">{selectedTx.type}</strong>
              </div>
              <div className="np-receipt-row">
                <span>Référence publique</span>
                <div className="np-inline-ref">
                  <code>{selectedTx.publicRef}</code>
                  <button
                    type="button"
                    className="np-copy-chip small"
                    onClick={() => copyRef(selectedTx.publicRef)}
                  >
                    <Copy size={12} />
                    <span>{copiedRef ? "Copié" : "Copier"}</span>
                  </button>
                </div>
              </div>
              <div className="np-receipt-row">
                <span>Horodatage</span>
                <span>
                  {new Date(selectedTx.createdAt).toLocaleString("fr-FR", {
                    dateStyle: "full",
                    timeStyle: "medium",
                  })}
                </span>
              </div>
              <div className="np-receipt-row">
                <span>Statut du règlement</span>
                <span className="text-emerald-600 font-bold">Exécuté et irréversible</span>
              </div>
            </div>

            <div className="np-receipt-actions-row">
              <button
                type="button"
                className="np-outline-button"
                onClick={() => {
                  window.print();
                }}
              >
                <Download size={15} />
                <span>Imprimer / PDF</span>
              </button>
              <button
                type="button"
                className="np-text-link ml-auto"
                onClick={() => {
                  const ref = selectedTx.publicRef;
                  setSelectedTx(null);
                  onOpenSupport?.(ref);
                }}
              >
                Signaler cette transaction
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
