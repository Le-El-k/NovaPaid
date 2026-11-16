"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Info, Loader2, Lock, Mail, Smartphone, User } from "lucide-react";
import { getAssetPath } from "@/app/lib/asset-path";
import { resolveAuthRedirect } from "@/app/lib/auth/redirect";
import { PwaInstallButton } from "@/app/components/pwa/PwaInstallButton";
import { OtpStep } from "@/app/components/auth/OtpStep";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [returnTo, setReturnTo] = useState("/boutique");
  const [step, setStep] = useState<"form" | "code">("form");
  const [emailMasked, setEmailMasked] = useState("");

  useEffect(() => {
    setReturnTo(resolveAuthRedirect(window.location.search));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Impossible de créer votre compte.");
      }

      // The account + session exist; require the emailed 6-digit code before entering.
      if (typeof window !== "undefined") {
        localStorage.setItem("novapaid_current_user", JSON.stringify(data.user));
        localStorage.removeItem("novapaid_token");
      }
      setEmailMasked(data.emailMasked || "");
      setStep("code");
    } catch (err: any) {
      setErrorMsg(err?.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailCode = async (code: string) => {
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify_email", code }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Code incorrect.");
    if (typeof window !== "undefined") {
      window.location.replace(resolveAuthRedirect(window.location.search));
    }
  };

  const resendEmailCode = async () => {
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send_email_code" }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Impossible de renvoyer le code.");
  };

  return (
    <main className="np-auth-page">
      <div className="np-auth-frame">
        <header className="np-auth-page-top">
          <Link href="/" className="np-auth-page-brand" aria-label="NovaPaid, accueil">
          <Image
            src={getAssetPath("/novapaid-logo-96.png")}
            alt="NovaPaid"
            width={38}
            height={38}
            className="np-auth-page-logo"
            priority
          />
            <span>Nova<span>Paid</span></span>
          </Link>
          <Link href="/boutique" className="np-auth-page-back"><ArrowLeft size={15} /> Retour à la boutique</Link>
        </header>

        <div className="np-auth-layout">
          {step === "code" ? (
            <OtpStep
              title="Vérifiez votre email"
              description="Nous avons envoyé un code à 6 chiffres à"
              emailMasked={emailMasked}
              submitLabel="Vérifier et continuer"
              onVerify={verifyEmailCode}
              onResend={resendEmailCode}
            />
          ) : (
          <section className="np-auth-card np-auth-card-register">
            <div className="np-auth-card-heading">
              <span className="np-auth-card-kicker">NOUVEAU COMPTE</span>
              <h1>Créer un compte</h1>
              <p>Rejoignez NovaPaid en quelques étapes.</p>
            </div>

        {errorMsg && (
          <div className="np-alert-banner danger np-auth-error">
            <Info size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="np-auth-page-form">
          <div className="np-form-group">
            <label className="np-form-label" htmlFor="reg-name">Nom complet</label>
            <div className="np-input-wrapper">
              <span className="np-input-prefix"><User size={16} /></span>
              <input
                id="reg-name"
                type="text"
                className="np-text-input with-prefix"
                autoComplete="name"
                placeholder="Votre nom complet"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="np-form-group">
            <label className="np-form-label" htmlFor="reg-email">Adresse email</label>
            <div className="np-input-wrapper">
              <span className="np-input-prefix"><Mail size={16} /></span>
              <input
                id="reg-email"
                type="email"
                className="np-text-input with-prefix"
                autoComplete="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="np-form-group">
            <label className="np-form-label" htmlFor="reg-phone">Numéro WhatsApp (optionnel)</label>
            <div className="np-input-wrapper">
              <span className="np-input-prefix"><Smartphone size={16} /></span>
              <input
                id="reg-phone"
                type="tel"
                className="np-text-input with-prefix"
                autoComplete="tel"
                placeholder="+237 6XX XX XX XX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="np-form-group">
            <label className="np-form-label" htmlFor="reg-pass">Mot de passe</label>
            <div className="np-input-wrapper">
              <span className="np-input-prefix"><Lock size={16} /></span>
              <input
                id="reg-pass"
                type={showPassword ? "text" : "password"}
                className="np-text-input with-prefix"
                placeholder="Minimum 10 caractères"
                minLength={10}
                maxLength={200}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="np-input-eye-btn"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="np-primary-button np-submit-btn np-auth-submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Création du compte...</span>
              </>
            ) : (
              <>
                <span>Créer mon compte</span>
              </>
            )}
          </button>
        </form>

        <div className="np-auth-pwa">
          <PwaInstallButton className="np-pwa-install-btn--auth" />
        </div>

        <div className="np-auth-card-switch">
          Vous avez déjà un compte ?{" "}
          <Link href={`/login?redirect=${encodeURIComponent(returnTo)}`} className="font-bold text-blue-600 hover:underline">
            Se connecter
          </Link>
        </div>
          </section>
          )}
        </div>
      </div>
    </main>
  );
}
