"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Info, Loader2, Lock, Mail } from "lucide-react";
import { getAssetPath } from "@/app/lib/asset-path";
import { resolveAuthRedirect } from "@/app/lib/auth/redirect";
import { PwaInstallButton } from "@/app/components/pwa/PwaInstallButton";
import { OtpStep } from "@/app/components/auth/OtpStep";

function formatMmSs(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LoginPage() {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [returnTo, setReturnTo] = useState("/dashboard");
  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [emailMasked, setEmailMasked] = useState("");
  // Lock countdown after too many failed passwords (server returns retryAfter, 5 min).
  const [lockUntil, setLockUntil] = useState(0);
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    setReturnTo(resolveAuthRedirect(window.location.search));
  }, []);

  useEffect(() => {
    if (lockUntil <= Date.now()) return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockUntil]);

  const lockRemaining = Math.max(0, Math.ceil((lockUntil - nowTs) / 1000));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          emailOrPhone: emailOrPhone.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.retryAfter) { setLockUntil(Date.now() + Number(data.retryAfter) * 1000); setNowTs(Date.now()); }
        throw new Error(data.error || "Identifiant ou mot de passe incorrect.");
      }

      // Email 2FA: a 6-digit code was sent; switch to the verification step.
      if (data.requiresCode) {
        setPendingUserId(Number(data.userId));
        setEmailMasked(data.emailMasked || "");
        setStep("code");
        return;
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const verifyLoginCode = async (code: string) => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login_verify", userId: pendingUserId, code }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Code incorrect.");
    if (typeof window !== "undefined") {
      localStorage.setItem("novapaid_current_user", JSON.stringify(data.user));
      localStorage.removeItem("novapaid_token");
      window.location.replace(resolveAuthRedirect(window.location.search));
    }
  };

  const resendLoginCode = async () => {
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send_login_code", userId: pendingUserId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      const e: any = new Error(data.error || "Impossible de renvoyer le code.");
      if (data.retryAfter) e.retryAfter = Number(data.retryAfter);
      throw e;
    }
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
          <Link href="/dashboard/boutique" className="np-auth-page-back"><ArrowLeft size={15} /> Retour à la boutique</Link>
        </header>

        <div className="np-auth-layout">
          {step === "code" ? (
            <OtpStep
              title="Confirmez votre connexion"
              description="Nous avons envoyé un code à 6 chiffres à"
              emailMasked={emailMasked}
              submitLabel="Se connecter"
              onVerify={verifyLoginCode}
              onResend={resendLoginCode}
              onBack={() => { setStep("credentials"); setErrorMsg(null); }}
            />
          ) : (
          <section className="np-auth-card">
            <div className="np-auth-card-heading">
              <span className="np-auth-card-kicker">ESPACE CLIENT</span>
              <h1>Se connecter</h1>
              <p>Accédez à votre compte NovaPaid.</p>
            </div>

        <form onSubmit={handleSubmit} className="np-auth-page-form">
          <div className="np-form-group">
            <label className="np-form-label" htmlFor="login-email">Adresse email ou téléphone</label>
            <div className="np-input-wrapper">
              <span className="np-input-prefix"><Mail size={16} /></span>
              <input
                id="login-email"
                type="text"
                className="np-text-input with-prefix"
                autoComplete="username"
                placeholder="vous@exemple.com ou +237..."
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="np-form-group">
            <label className="np-form-label" htmlFor="login-pass">Mot de passe</label>
            <div className="np-input-wrapper">
              <span className="np-input-prefix"><Lock size={16} /></span>
              <input
                id="login-pass"
                type={showPassword ? "text" : "password"}
                className="np-text-input with-prefix"
                placeholder="Votre mot de passe"
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

          {(errorMsg || lockRemaining > 0) && (
            <div className="np-auth-error" role="alert">
              <Info size={16} />
              <span>{lockRemaining > 0 ? `Trop de tentatives. Réessayez dans ${formatMmSs(lockRemaining)}.` : errorMsg}</span>
            </div>
          )}

          <button type="submit" className="np-primary-button np-submit-btn np-auth-submit" disabled={loading || lockRemaining > 0}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Connexion en cours...</span>
              </>
            ) : lockRemaining > 0 ? (
              <span>Réessayez dans {formatMmSs(lockRemaining)}</span>
            ) : (
              <>
                <span>Se connecter</span>
              </>
            )}
          </button>

        </form>

        <div className="np-auth-pwa">
          <PwaInstallButton className="np-pwa-install-btn--auth" />
        </div>

        <div className="np-auth-forgot">
          <Link href="/forgot-password">Mot de passe oublié ?</Link>
        </div>

        <div className="np-auth-card-switch">
          Vous n'avez pas encore de compte ?{" "}
          <Link href={`/register?redirect=${encodeURIComponent(returnTo)}`} className="font-bold text-blue-600 hover:underline">
            Créer un compte
          </Link>
        </div>
          </section>
          )}
        </div>
      </div>
    </main>
  );
}
