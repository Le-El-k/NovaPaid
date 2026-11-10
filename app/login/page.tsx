"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Info, Loader2, Lock, Mail } from "lucide-react";
import { getAssetPath } from "@/app/lib/asset-path";
import { resolveAuthRedirect } from "@/app/lib/auth/redirect";

export default function LoginPage() {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [returnTo, setReturnTo] = useState("/dashboard");

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
          action: "login",
          emailOrPhone: emailOrPhone.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Identifiant ou mot de passe incorrect.");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("novapaid_current_user", JSON.stringify(data.user));
        localStorage.removeItem("novapaid_token");
        window.location.replace(resolveAuthRedirect(window.location.search));
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
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
          <Link href="/boutique" className="np-auth-page-back"><ArrowLeft size={15} /> Retour à la boutique</Link>
        </header>

        <div className="np-auth-layout">
          <section className="np-auth-card">
            <div className="np-auth-card-heading">
              <span className="np-auth-card-kicker">ESPACE CLIENT</span>
              <h1>Se connecter</h1>
              <p>Accédez à votre compte NovaPaid.</p>
            </div>

        {errorMsg && (
          <div className="np-alert-banner danger np-auth-error">
            <Info size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

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
                placeholder="roddy@novapaid.com ou +237..."
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

          <button type="submit" className="np-primary-button np-submit-btn np-auth-submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Connexion en cours...</span>
              </>
            ) : (
              <>
                <span>Se connecter</span>
              </>
            )}
          </button>

          <div className="text-center mt-3">
            <Link href="/forgot-password" className="text-sm opacity-70 hover:opacity-100 transition-opacity" style={{ color: "var(--cyan, #00d4aa)" }}>
              Mot de passe oublié ?
            </Link>
          </div>
        </form>

        <div className="np-auth-card-switch">
          Vous n'avez pas encore de compte ?{" "}
          <Link href={`/register?redirect=${encodeURIComponent(returnTo)}`} className="font-bold text-blue-600 hover:underline">
            Créer un compte
          </Link>
        </div>
          </section>
        </div>
      </div>
    </main>
  );
}
