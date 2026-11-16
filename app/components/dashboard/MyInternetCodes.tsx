"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, CheckCircle2, LoaderCircle, PackageOpen, RefreshCw, ShoppingBag, Wifi } from "lucide-react";
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

export function MyInternetCodes({ onGoToShop }: { onGoToShop?: () => void }) {
  const { t, language } = useLanguage();
  const [codes, setCodes] = useState<InternetCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/geny?action=my-codes", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.ok) {
        setCodes(Array.isArray(data.codes) ? data.codes : []);
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
        <div className="np-codes-grid">
          {codes.map((item) => (
            <article className="np-code-card" key={item.orderRef}>
              <div className="np-code-card-top">
                <span className="np-code-card-plan">{item.planName || t("sfront_internet_plan")}</span>
                <span className="np-code-card-amount">{new Intl.NumberFormat("fr-FR").format(item.amountXaf)} FCFA</span>
              </div>
              <div className="np-code-card-value">
                <code>{item.code}</code>
                <button type="button" onClick={() => void copy(item.code, item.orderRef)} aria-label={t("geny_copy")}>
                  {copiedRef === item.orderRef ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                  <span>{copiedRef === item.orderRef ? t("geny_copied") : t("geny_copy")}</span>
                </button>
              </div>
              <div className="np-code-card-meta">
                {item.operator && <span>{item.operator === "mtn" ? "MTN MoMo" : item.operator === "orange" ? "Orange Money" : item.operator}</span>}
                {item.phone && <span>+{item.phone.replace(/^\+/, "")}</span>}
                <span>{formatDate(item.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
