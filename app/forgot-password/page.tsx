"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Info, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { getAssetPath } from "@/app/lib/asset-path";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_code", email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Erreur");
      setStep("reset");
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResendState("sending");
    setError(null);
    try {
      await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_code", email: email.trim() }),
      });
      setResendState("sent");
      setTimeout(() => setResendState("idle"), 4000);
    } catch {
      setResendState("idle");
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.length !== 6) { setError("Entrez le code à 6 chiffres reçu par email."); return; }
    if (password.length < 10) { setError("Le mot de passe doit contenir au moins 10 caractères."); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_with_code", email: email.trim(), code, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Erreur");
      setStep("done");
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="np-auth-page">
      <div className="np-auth-frame">
        <header className="np-auth-page-top">
          <Link href="/" className="np-auth-page-brand" aria-label="NovaPaid, accueil">
            <Image src={getAssetPath("/novapaid-logo-96.png")} alt="NovaPaid" width={38} height={38} className="np-auth-page-logo" priority />
            <span>Nova<span>Paid</span></span>
          </Link>
          <Link href="/login" className="np-auth-page-back"><ArrowLeft size={15} /> Retour à la connexion</Link>
        </header>

        <div className="np-auth-layout">
          <section className="np-auth-card">
            <div className="np-auth-card-heading">
              <span className="np-auth-card-kicker">Mot de passe</span>
              <h1>{step === "done" ? "Mot de passe modifié" : "Mot de passe oublié"}</h1>
              <p>
                {step === "email" && "Entrez votre adresse email pour recevoir un code de réinitialisation."}
                {step === "reset" && <>Entrez le code reçu par email et votre nouveau mot de passe.</>}
                {step === "done" && "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe."}
              </p>
            </div>

            {error && (
              <div className="np-alert-banner danger np-auth-error">
                <Info size={16} />
                <span>{error}</span>
              </div>
            )}

            {step === "email" && (
              <form onSubmit={requestCode} className="np-auth-page-form">
                <div className="np-form-group">
                  <label className="np-form-label" htmlFor="fp-email">Adresse email</label>
                  <div className="np-input-wrapper">
                    <span className="np-input-prefix"><Mail size={16} /></span>
                    <input id="fp-email" type="email" className="np-text-input with-prefix" autoComplete="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>
                <button type="submit" className="np-primary-button np-submit-btn np-auth-submit" disabled={loading}>
                  {loading ? <><Loader2 size={18} className="animate-spin" /><span>Envoi...</span></> : <span>Envoyer le code</span>}
                </button>
              </form>
            )}

            {step === "reset" && (
              <form onSubmit={submitReset} className="np-auth-page-form">
                <div className="np-form-group">
                  <label className="np-form-label" htmlFor="fp-code">Code de vérification</label>
                  <input id="fp-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="np-text-input np-otp-input" placeholder="______" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                </div>
                <div className="np-form-group">
                  <label className="np-form-label" htmlFor="fp-pass">Nouveau mot de passe</label>
                  <div className="np-input-wrapper">
                    <span className="np-input-prefix"><Lock size={16} /></span>
                    <input id="fp-pass" type={showPassword ? "text" : "password"} className="np-text-input with-prefix" placeholder="Minimum 10 caractères" minLength={10} maxLength={200} value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="button" className="np-input-eye-btn" aria-label={showPassword ? "Masquer" : "Afficher"} onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="np-form-group">
                  <label className="np-form-label" htmlFor="fp-confirm">Confirmer le mot de passe</label>
                  <div className="np-input-wrapper">
                    <span className="np-input-prefix"><Lock size={16} /></span>
                    <input id="fp-confirm" type={showPassword ? "text" : "password"} className="np-text-input with-prefix" placeholder="Retapez le mot de passe" minLength={10} maxLength={200} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                  </div>
                </div>
                <button type="submit" className="np-primary-button np-submit-btn np-auth-submit" disabled={loading}>
                  {loading ? <><Loader2 size={18} className="animate-spin" /><span>Réinitialisation...</span></> : <><ShieldCheck size={17} /><span>Réinitialiser le mot de passe</span></>}
                </button>
                <div className="np-auth-otp-actions">
                  <button type="button" className="np-auth-otp-resend" onClick={resend} disabled={resendState !== "idle"}>
                    {resendState === "sending" ? "Envoi…" : resendState === "sent" ? "Code renvoyé ✓" : "Renvoyer le code"}
                  </button>
                  <button type="button" className="np-auth-otp-back" onClick={() => { setStep("email"); setError(null); }}>
                    <ArrowLeft size={14} /> Changer d'email
                  </button>
                </div>
              </form>
            )}

            {step === "done" && (
              <div className="np-auth-success">
                <div className="np-auth-success-icon"><CheckCircle2 size={34} /></div>
                <Link href="/login" className="np-primary-button np-submit-btn np-auth-submit">Se connecter</Link>
              </div>
            )}

            <div className="np-auth-card-switch">
              <Link href="/login" className="font-bold text-blue-600 hover:underline">← Retour à la connexion</Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
