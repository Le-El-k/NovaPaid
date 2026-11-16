"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type CurrencyCode = "XAF" | "USD";

const CURRENCY_KEY = "novapaid_currency";

interface ExchangeRate {
  rate: number;
  updatedAt: string;
  source: string;
}

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  toggleCurrency: () => void;
  formatAmount: (amount: number, sourceCurrency?: CurrencyCode) => string;
  convertAmount: (amount: number, from: CurrencyCode, to: CurrencyCode) => number;
  exchangeRate: ExchangeRate;
}

const DEFAULT_RATE: ExchangeRate = {
  rate: 620,
  updatedAt: new Date().toISOString().split("T")[0],
  source: "configured",
};

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "XAF",
  setCurrency: () => {},
  toggleCurrency: () => {},
  formatAmount: (a) => `${a.toLocaleString("fr-FR")} FCFA`,
  convertAmount: (a) => a,
  exchangeRate: DEFAULT_RATE,
});

function getInitialCurrency(): CurrencyCode {
  if (typeof window === "undefined") return "XAF";
  try {
    const saved = localStorage.getItem(CURRENCY_KEY);
    if (saved === "XAF" || saved === "USD") return saved;
  } catch {}
  return "XAF";
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("XAF");
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate>(DEFAULT_RATE);

  useEffect(() => {
    setCurrencyState(getInitialCurrency());
    fetchExchangeRate();
  }, []);

  async function fetchExchangeRate() {
    try {
      const res = await fetch("/api/fees?from=USD&to=XAF&amount=1");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.rate) {
          setExchangeRate({
            rate: data.rate,
            updatedAt: new Date().toISOString().split("T")[0],
            source: "platform",
          });
          return;
        }
      }
    } catch {}
    try {
      const res = await fetch("/api/fees");
      if (res.ok) {
        const data = await res.json();
        const rates = data.exchange_rates || [];
        const usdXaf = rates.find(
          (r: any) => (r.from_currency === "USD" && r.to_currency === "XAF") ||
                      (r.from_currency === "XAF" && r.to_currency === "USD")
        );
        if (usdXaf) {
          const rate = usdXaf.from_currency === "USD" ? usdXaf.rate : 1 / usdXaf.rate;
          setExchangeRate({
            rate,
            updatedAt: usdXaf.updated_at || new Date().toISOString().split("T")[0],
            source: "platform",
          });
        }
      }
    } catch {}
  }

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    try { localStorage.setItem(CURRENCY_KEY, c); } catch {}
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrencyState(prev => {
      const next = prev === "XAF" ? "USD" : "XAF";
      try { localStorage.setItem(CURRENCY_KEY, next); } catch {}
      return next;
    });
  }, []);

  const convertAmount = useCallback((amount: number, from: CurrencyCode, to: CurrencyCode): number => {
    if (from === to) return amount;
    if (from === "XAF" && to === "USD") return amount / exchangeRate.rate;
    if (from === "USD" && to === "XAF") return amount * exchangeRate.rate;
    return amount;
  }, [exchangeRate.rate]);

  const formatAmount = useCallback((amount: number, sourceCurrency: CurrencyCode = "XAF"): string => {
    const converted = convertAmount(amount, sourceCurrency, currency);
    if (currency === "XAF") {
      return `${Math.round(converted).toLocaleString("fr-FR")} FCFA`;
    }
    return `${converted.toFixed(2)} $`;
  }, [currency, convertAmount]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, toggleCurrency, formatAmount, convertAmount, exchangeRate }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

export function CurrencyToggle({ className = "" }: { className?: string }) {
  const { currency, setCurrency, exchangeRate } = useCurrency();
  return (
    <div
      className={`np-currency-toggle ${className}`}
      title={`1 USD ≈ ${exchangeRate.rate.toLocaleString("fr-FR")} FCFA (${exchangeRate.updatedAt})`}
    >
      <select
        className="np-currency-select"
        value={currency}
        onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
        aria-label="Devise"
      >
        <option value="XAF">FCFA</option>
        <option value="USD">USD ($)</option>
      </select>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="np-currency-arrow" aria-hidden="true">
        <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

export function CurrencyDisplay({ amount, sourceCurrency = "XAF", className = "" }: {
  amount: number;
  sourceCurrency?: CurrencyCode;
  className?: string;
}) {
  const { formatAmount } = useCurrency();
  return (
    <span className={`np-currency-display ${className}`}>
      {formatAmount(amount, sourceCurrency)}
    </span>
  );
}

/**
 * MoneyValue — a funds amount with an inline currency dropdown (the unit next to
 * the number is itself the FCFA/USD selector) and an eye icon to hide the amount.
 * Use this inside every "funds box" (balance / KPI card) instead of a header toggle.
 */
export function MoneyValue({
  amount,
  sourceCurrency = "XAF",
  className = "",
  maskable = true,
  defaultHidden = false,
  hidden: hiddenProp,
}: {
  amount: number;
  sourceCurrency?: CurrencyCode;
  className?: string;
  maskable?: boolean;
  defaultHidden?: boolean;
  /** When provided, masking is controlled by the parent (e.g. a shared "hide balance" eye). */
  hidden?: boolean;
}) {
  const { currency, setCurrency, convertAmount, exchangeRate } = useCurrency();
  const [hiddenState, setHidden] = useState(defaultHidden);
  const hidden = hiddenProp !== undefined ? hiddenProp : hiddenState;
  const value = convertAmount(amount || 0, sourceCurrency, currency);
  const num = currency === "XAF"
    ? Math.round(value).toLocaleString("fr-FR")
    : value.toFixed(2);
  return (
    <span
      className={`np-money ${className}`}
      onClick={(event) => event.stopPropagation()}
    >
      <span className="np-money-num">{hidden ? "••••••" : num}</span>
      <span
        className="np-money-cur"
        title={`1 USD ≈ ${exchangeRate.rate.toLocaleString("fr-FR")} FCFA (${exchangeRate.updatedAt})`}
      >
        <select
          className="np-money-select"
          value={currency}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
          aria-label="Devise"
        >
          <option value="XAF">FCFA</option>
          <option value="USD">$</option>
        </select>
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" className="np-money-arrow" aria-hidden="true">
          <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {maskable && (
        <button
          type="button"
          className="np-money-eye"
          onClick={(event) => { event.stopPropagation(); setHidden((h) => !h); }}
          aria-label={hidden ? "Afficher le montant" : "Masquer le montant"}
          title={hidden ? "Afficher" : "Masquer"}
        >
          {hidden ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M6.3 6.3a2 2 0 002.8 2.8M4.3 4.4C2.4 5.6 1 8 1 8s2.5 4.5 7 4.5c1 0 1.9-.2 2.7-.5M13 11.2C14.4 10 15 8 15 8s-2.5-4.5-7-4.5c-.5 0-1 .05-1.4.14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8" cy="8" r="1.9" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          )}
        </button>
      )}
    </span>
  );
}
