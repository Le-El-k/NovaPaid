"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/app/lib/i18n";
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
  const { t } = useLanguage();
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
    const headers = [t("hist_csv_date"), t("hist_csv_reference"), t("hist_csv_type"), t("hist_csv_direction"), t("hist_csv_amount"), t("hist_csv_description"), t("hist_csv_status")];
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
    if (type === "deposit") return <ArrowDownLeft size={16} className="np-icon-success" />;
    if (type === "withdrawal") return <ArrowUpRight size={16} className="np-icon-danger" />;
    if (type === "transfer") return <ArrowLeftRight size={16} className="np-icon-accent" />;
    if (type === "purchase") return <ShoppingBag size={16} className="np-icon-warning" />;
    return direction === "credit" ? (
      <ArrowDownLeft size={16} className="np-icon-success" />
    ) : (
      <ArrowUpRight size={16} className="np-icon-danger" />
    );
  };

  const statusLabel = (status: string) => status === "pending"
    ? t("hist_status_pending")
    : status === "succeeded"
      ? t("hist_status_succeeded")
      : status === "rejected"
        ? t("hist_status_rejected")
        : status === "failed"
          ? t("hist_status_failed")
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
            placeholder={t("hist_search_placeholder")}
          />
          {searchQuery && (
            <button
              type="button"
              className="np-clear-search"
              onClick={() => setSearchQuery("")}
              aria-label={t("hist_clear_search")}
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
            {t("hist_filter_all").replace("{n}", String(transactions.length))}
          </button>
          <button
            type="button"
            className={`np-filter-chip ${filterType === "deposit" ? "active" : ""}`}
            onClick={() => setFilterType("deposit")}
          >
            {t("hist_filter_deposits")}
          </button>
          <button
            type="button"
            className={`np-filter-chip ${filterType === "withdrawal" ? "active" : ""}`}
            onClick={() => setFilterType("withdrawal")}
          >
            {t("hist_filter_withdrawals")}
          </button>
          <button
            type="button"
            className={`np-filter-chip ${filterType === "transfer" ? "active" : ""}`}
            onClick={() => setFilterType("transfer")}
          >
            {t("hist_filter_transfers")}
          </button>
          <button
            type="button"
            className={`np-filter-chip ${filterType === "purchase" ? "active" : ""}`}
            onClick={() => setFilterType("purchase")}
          >
            {t("hist_filter_shop_games")}
          </button>
        </div>
      </div>

      {/* Liste des transactions */}
      <div className="np-panel np-history-list-panel">
        <div className="np-panel-heading">
          <div>
            <span className="np-overline">{t("hist_account_statement")}</span>
            <h2>{t("hist_transactions_title").replace("{n}", String(filtered.length))}</h2>
          </div>
          <button
            type="button"
            className="np-outline-button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            title={t("hist_export_csv_title")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "6px 12px" }}
          >
            <Download size={14} />
            <span>{t("hist_export_csv")}</span>
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="np-empty-state">
            <Activity size={32} className="np-empty-icon" />
            <p>{t("hist_empty_state")}</p>
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
                    {t("hist_ref_label")} {item.publicRef} • {new Date(item.createdAt).toLocaleDateString("fr-FR", {
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
                  <small>{t("hist_click_for_receipt")}</small>
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
              aria-label={t("hist_close_receipt")}
              onClick={() => setSelectedTx(null)}
            >
              <X size={18} />
            </button>

            <div className="np-receipt-header">
              <span className="np-receipt-icon success">
                <CheckCircle2 size={32} />
              </span>
              <span className="np-overline">{t("hist_receipt_official")}</span>
              <h3>{t("hist_receipt_title")}</h3>
              <div className="np-receipt-hero-amount">
                <span className={selectedTx.direction}>{selectedTx.amountFormatted}</span>
              </div>
            </div>

            <div className="np-receipt-body">
              <div className="np-receipt-row">
                <span>{t("hist_receipt_description")}</span>
                <strong>{selectedTx.description}</strong>
              </div>
              <div className="np-receipt-row">
                <span>{t("hist_receipt_operation_type")}</span>
                <strong className="capitalize">{selectedTx.type}</strong>
              </div>
              <div className="np-receipt-row">
                <span>{t("hist_receipt_public_ref")}</span>
                <div className="np-inline-ref">
                  <code>{selectedTx.publicRef}</code>
                  <button
                    type="button"
                    className="np-copy-chip small"
                    onClick={() => copyRef(selectedTx.publicRef)}
                  >
                    <Copy size={12} />
                    <span>{copiedRef ? t("hist_copied") : t("hist_copy")}</span>
                  </button>
                </div>
              </div>
              <div className="np-receipt-row">
                <span>{t("hist_receipt_timestamp")}</span>
                <span>
                  {new Date(selectedTx.createdAt).toLocaleString("fr-FR", {
                    dateStyle: "full",
                    timeStyle: "medium",
                  })}
                </span>
              </div>
              <div className="np-receipt-row">
                <span>{t("hist_receipt_settlement_status")}</span>
                <span className="np-icon-success" style={{ fontWeight: 700 }}>{t("hist_receipt_executed")}</span>
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
                <span>{t("hist_print_pdf")}</span>
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
                {t("hist_report_transaction")}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
