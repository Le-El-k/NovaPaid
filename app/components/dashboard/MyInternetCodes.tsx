"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, CheckCircle2, ChevronLeft, ChevronRight, LoaderCircle, PackageOpen, RefreshCw, ShoppingBag, Wifi } from "lucide-react";
import { useLanguage } from "@/app/lib/i18n";

type InternetCode = {
  orderRef: string;
  code: string;
  planName: string;
  amountXaf: number;
  phone: string;
  operator: string;
  createdAt: string;
};

const PAGE_SIZE = 10;

export function MyInternetCodes({ onGoToShop }: { onGoToShop?: () => void }) {
  const { t, language } = useLanguage();
  const [codes, setCodes] = useState<InternetCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/geny?action=my-codes", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.ok) {
        setCodes(Array.isArray(data.codes) ? data.codes : []);
        setPage(0);
      } else {
        setError(data?.error || t("mic_load_error"));
      }
    } catch {
      setError(t("mic_load_error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const copy = useCallback(async (code: string, ref: string) => {
    const done = () => { setCopiedRef(ref); window.setTimeout(() => setCopiedRef((r) => (r === ref ? null : r)), 1800); };
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(code); done(); return; } catch { /* fallback */ }
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = code; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      if (document.execCommand("copy")) done();
      document.body.removeChild(ta);
    } catch { /* ignore */ }
  }, []);

  const formatDate = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso.includes("T") || iso.includes("Z") ? iso : iso.replace(" ", "T") + "Z");
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(language === "en" ? "en-US" : "fr-FR", { dateStyle: "medium", timeStyle: "short" });
  };

  const operatorLabel = (op: string) => (op === "mtn" ? "MTN MoMo" : op === "orange" ? "Orange Money" : op);

  const totalPages = Math.max(1, Math.ceil(codes.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageCodes = useMemo(() => codes.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE), [codes, safePage]);

  return (
    <section className="np-page-section np-codes-section">
      <div className="np-codes-head">
        <div>
          <span className="np-overline"><Wifi size={14} /> {t("my_internet_codes")}</span>
          <h2>{t("mic_title")}</h2>
          <p>{t("mic_subtitle")}</p>
        </div>
        <button type="button" className="np-codes-refresh" onClick={() => void load()} aria-label={t("mic_refresh")}>
          <RefreshCw size={15} /> {t("mic_refresh")}
        </button>
      </div>

      {loading ? (
        <div className="np-codes-state"><LoaderCircle size={22} className="np-storefront-spin" /><span>{t("mic_loading")}</span></div>
      ) : error ? (
        <div className="np-codes-state is-error"><PackageOpen size={24} /><strong>{error}</strong><button type="button" onClick={() => void load()}>{t("mic_retry")}</button></div>
      ) : codes.length === 0 ? (
        <div className="np-codes-state np-codes-empty">
          <PackageOpen size={30} />
          <strong>{t("mic_empty_title")}</strong>
          <span>{t("mic_empty_desc")}</span>
          {onGoToShop && <button type="button" className="np-codes-shop-btn" onClick={onGoToShop}><ShoppingBag size={16} /> {t("mic_go_shop")}</button>}
        </div>
      ) : (
        <>
          <div className="np-codes-count">{t("mic_count").replace("{n}", String(codes.length))}</div>
          <ul className="np-codes-list" aria-label={t("mic_title")}>
            {pageCodes.map((item) => {
              const copied = copiedRef === item.orderRef;
              return (
                <li className="np-code-row" key={item.orderRef}>
                  <div className="np-code-row-main">
                    <code className="np-code-row-value">{item.code}</code>
                    <div className="np-code-row-meta">
                      <span className="np-code-row-plan">{item.planName || t("sfront_internet_plan")}</span>
                      {item.operator && <span>{operatorLabel(item.operator)}</span>}
                      {item.phone && <span>+{item.phone.replace(/^\+/, "")}</span>}
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                  <span className="np-code-row-amount">{new Intl.NumberFormat("fr-FR").format(item.amountXaf)} FCFA</span>
                  <button
                    type="button"
                    className={`np-code-copy${copied ? " is-copied" : ""}`}
                    onClick={() => void copy(item.code, item.orderRef)}
                    aria-label={copied ? t("geny_copied") : t("geny_copy")}
                    title={copied ? t("geny_copied") : t("geny_copy")}
                  >
                    {copied ? <CheckCircle2 size={17} /> : <Copy size={16} />}
                  </button>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <nav className="np-codes-pagination" aria-label={t("mic_pagination")}>
              <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} aria-label={t("mic_prev")}>
                <ChevronLeft size={16} /> {t("mic_prev")}
              </button>
              <span className="np-codes-page-indicator">{t("mic_page").replace("{x}", String(safePage + 1)).replace("{y}", String(totalPages))}</span>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1} aria-label={t("mic_next")}>
                {t("mic_next")} <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
