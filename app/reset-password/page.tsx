"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Info, Loader2, Lock, ShieldCheck } from "lucide-react";
import { getAssetPath } from "@/app/lib/asset-path";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") || "" : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    if (password.length < 10) { setError("Le mot de passe doit contenir au moins 10 caractères."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Erreur");
      setDone(true);
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
            {!token ? (
              <div className="np-auth-card-heading">
                <span className="np-auth-card-kicker">Mot de passe</span>
                <h1>Lien invalide</h1>
                <p>Ce lien de réinitialisation est invalide ou a expiré.</p>
                <Link href="/forgot-password" className="np-primary-button np-submit-btn np-auth-submit" style={{ marginTop: 16 }}>Demander un nouveau code</Link>
              </div>
            ) : (
              <>
                <div className="np-auth-card-heading">
                  <span className="np-auth-card-kicker">Mot de passe</span>
                  <h1>{done ? "Mot de passe modifié" : "Nouveau mot de passe"}</h1>
                  <p>{done ? "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe." : "Choisissez un nouveau mot de passe sécurisé."}</p>
                </div>

                {error && (
                  <div className="np-alert-banner danger np-auth-error">
                    <Info size={16} />
                    <span>{error}</span>
                  </div>
                )}

                {!done ? (
                  <form onSubmit={handleSubmit} className="np-auth-page-form">
                    <div className="np-form-group">
                      <label className="np-form-label" htmlFor="rp-pass">Nouveau mot de passe</label>
                      <div className="np-input-wrapper">
                        <span className="np-input-prefix"><Lock size={16} /></span>
                        <input id="rp-pass" type={showPassword ? "text" : "password"} className="np-text-input with-prefix" placeholder="Minimum 10 caractères" minLength={10} maxLength={200} value={password} onChange={(e) => setPassword(e.target.value)} required />
                        <button type="button" className="np-input-eye-btn" aria-label={showPassword ? "Masquer" : "Afficher"} onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="np-form-group">
                      <label className="np-form-label" htmlFor="rp-confirm">Confirmer le mot de passe</label>
                      <div className="np-input-wrapper">
                        <span className="np-input-prefix"><Lock size={16} /></span>
                        <input id="rp-confirm" type={showPassword ? "text" : "password"} className="np-text-input with-prefix" placeholder="Retapez le mot de passe" minLength={10} maxLength={200} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                      </div>
                    </div>
                    <button type="submit" className="np-primary-button np-submit-btn np-auth-submit" disabled={loading}>
                      {loading ? <><Loader2 size={18} className="animate-spin" /><span>Réinitialisation...</span></> : <><ShieldCheck size={17} /><span>Réinitialiser le mot de passe</span></>}
                    </button>
                  </form>
                ) : (
                  <div className="np-auth-success">
                    <div className="np-auth-success-icon"><CheckCircle2 size={34} /></div>
                    <Link href="/login" className="np-primary-button np-submit-btn np-auth-submit">Se connecter</Link>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
