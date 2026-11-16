"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

interface FeeEstimatorProps {
  type: "card_creation" | "card_reload" | "card_withdrawal" | "transfer";
  amount: number;
  currency?: string;
  onFeeCalculated?: (fee: number, total: number) => void;
}

export function FeeEstimator({ type, amount, currency = "XAF", onFeeCalculated }: FeeEstimatorProps) {
  const [loading, setLoading] = useState(false);
  const [feeData, setFeeData] = useState<{ fee: number; total: number } | null>(null);

  useEffect(() => {
    if (!amount || amount <= 0) { setFeeData(null); return; }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/fees?type=${type}&amount=${amount}&currency=${currency}`, { signal: controller.signal });
        const json = await res.json();
        if (json.success) {
          setFeeData({ fee: json.fee, total: json.total });
          onFeeCalculated?.(json.fee, json.total);
        }
      } catch (e: any) {
        if (e.name !== "AbortError") console.error(e);
      }
      setLoading(false);
    }, 300);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [type, amount, currency]);

  if (!amount || amount <= 0) return null;

  const labels: Record<string, string> = {
    card_creation: "Frais de création",
    card_reload: "Frais de rechargement",
    card_withdrawal: "Frais de retrait",
    transfer: "Frais de transfert",
  };

  return (
    <div className="np-fee-estimator">
      {loading ? (
        <div className="np-fee-estimator-loading">
          <Loader2 size={14} className="animate-spin" />
          <span>Calcul des frais...</span>
        </div>
      ) : feeData ? (
        <div className="np-fee-estimator-result">
          <div className="np-fee-estimator-row">
            <span>Montant</span>
            <span>{amount.toLocaleString()} {currency}</span>
          </div>
          {feeData.fee > 0 && (
            <div className="np-fee-estimator-row fee">
              <span>{labels[type] || "Frais"}</span>
              <span>+{feeData.fee.toLocaleString()} {currency}</span>
            </div>
          )}
          <div className="np-fee-estimator-row total">
            <span>Total</span>
            <span>{feeData.total.toLocaleString()} {currency}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface CurrencyConverterProps {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
}

export function CurrencyConverter({ amount, fromCurrency, toCurrency }: CurrencyConverterProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ converted: number; rate: number; fee: number; feePct: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!amount || amount <= 0 || fromCurrency === toCurrency) { setResult(null); setError(null); return; }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/fees?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`, { signal: controller.signal });
        const json = await res.json();
        if (json.success) {
          setResult({ converted: json.converted, rate: json.rate, fee: json.fee, feePct: json.feePct });
        } else {
          setError(json.error || "Conversion non disponible");
        }
      } catch (e: any) {
        if (e.name !== "AbortError") setError("Erreur de conversion");
      }
      setLoading(false);
    }, 300);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [amount, fromCurrency, toCurrency]);

  if (!amount || amount <= 0 || fromCurrency === toCurrency) return null;

  return (
    <div className="np-fee-estimator">
      {loading ? (
        <div className="np-fee-estimator-loading">
          <Loader2 size={14} className="animate-spin" />
          <span>Conversion...</span>
        </div>
      ) : error ? (
        <div className="np-fee-estimator-error">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      ) : result ? (
        <div className="np-fee-estimator-result">
          <div className="np-fee-estimator-row">
            <span>{amount.toLocaleString()} {fromCurrency}</span>
            <ArrowRight size={14} />
            <span className="font-bold">{result.converted.toLocaleString()} {toCurrency}</span>
          </div>
          <div className="np-fee-estimator-meta">
            <span>Taux: 1 {fromCurrency} = {result.rate} {toCurrency}</span>
            {result.fee > 0 && <span>Frais: {result.fee.toLocaleString()} {fromCurrency} ({result.feePct}%)</span>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
