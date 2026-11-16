"use client";

import { useState } from "react";
import { ArrowLeft, Info, Loader2, ShieldCheck } from "lucide-react";

type OtpStepProps = {
  title: string;
  description: string;
  emailMasked?: string;
  submitLabel: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack?: () => void;
};

// Shared 6-digit code entry used by the login and registration flows.
export function OtpStep({ title, description, emailMasked, submitLabel, onVerify, onResend, onBack }: OtpStepProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { setError("Entrez le code à 6 chiffres reçu par email."); return; }
    setError(null);
    setLoading(true);
    try {
      await onVerify(code);
    } catch (err: any) {
      setError(err?.message || "Code incorrect. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setResendState("sending");
    try {
      await onResend();
      setResendState("sent");
      setTimeout(() => setResendState("idle"), 4000);
    } catch (err: any) {
      setError(err?.message || "Impossible de renvoyer le code.");
      setResendState("idle");
    }
  };

  return (
    <section className="np-auth-card">
      <div className="np-auth-card-heading">
        <span className="np-auth-card-kicker">Vérification</span>
        <h1>{title}</h1>
        <p>{description}{emailMasked ? <> <strong>{emailMasked}</strong></> : null}</p>
      </div>

      {error && (
        <div className="np-alert-banner danger np-auth-error">
          <Info size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="np-auth-page-form">
        <div className="np-form-group">
          <label className="np-form-label" htmlFor="otp-code">Code de vérification</label>
          <input
            id="otp-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            className="np-text-input np-otp-input"
            placeholder="______"
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); if (error) setError(null); }}
          />
        </div>

        <button type="submit" className="np-primary-button np-submit-btn np-auth-submit" disabled={loading || code.length !== 6}>
          {loading ? <><Loader2 size={18} className="animate-spin" /><span>Vérification...</span></> : <><ShieldCheck size={17} /><span>{submitLabel}</span></>}
        </button>
      </form>

      <div className="np-auth-otp-actions">
        <button type="button" className="np-auth-otp-resend" onClick={handleResend} disabled={resendState !== "idle"}>
          {resendState === "sending" ? "Envoi…" : resendState === "sent" ? "Code renvoyé ✓" : "Renvoyer le code"}
        </button>
        {onBack && (
          <button type="button" className="np-auth-otp-back" onClick={onBack}>
            <ArrowLeft size={14} /> Retour
          </button>
        )}
      </div>
    </section>
  );
}

export default OtpStep;
