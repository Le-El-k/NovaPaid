"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { getAssetPath } from "@/app/lib/asset-path";

interface AuthModalProps {
  initialMode?: "login" | "register";
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export function AuthModal({
  initialMode = "login",
  isOpen,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [name, setName] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (mode === "login") {
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
          localStorage.removeItem("novapaid_current_user");
          localStorage.removeItem("novapaid_token");
          window.dispatchEvent(new CustomEvent("novapaid:auth-changed", { detail: { user: data.user } }));
        }

        onSuccess(data.user);
      } else {
        // Inscription
        if (!name.trim() || !email.trim() || !password.trim()) {
          throw new Error("Veuillez renseigner tous les champs obligatoires.");
        }

        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "register",
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            password,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Impossible de créer votre compte.");
        }

        if (typeof window !== "undefined") {
          localStorage.removeItem("novapaid_current_user");
          localStorage.removeItem("novapaid_token");
          window.dispatchEvent(new CustomEvent("novapaid:auth-changed", { detail: { user: data.user } }));
        }

        onSuccess(data.user);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="np-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="np-auth-modal" role="dialog" aria-modal="true">
        <button
          type="button"
          className="np-auth-close"
          onClick={onClose}
          aria-label="Fermer la fenêtre d'authentification"
        >
          <X size={18} />
        </button>

        {/* En-tête avec vrai logo officiel */}
        <div className="np-auth-header">
          <div className="np-auth-logo-wrap">
            <Image
              src={getAssetPath("/novapaid-logo-96.png")}
              alt="NovaPaid Logo"
              width={46}
              height={46}
              priority
              className="rounded-xl shadow-md"
            />
          </div>
          <h2>
            {mode === "login" ? "Connexion à votre espace" : "Créer votre compte NovaPaid"}
          </h2>
          <p>
            {mode === "login"
              ? "Accédez à vos cartes, votre portefeuille et vos opérations."
              : "Rejoignez la communauté et profitez de transferts gratuits et de cartes en USD."}
          </p>
        </div>

        {/* Sélecteur d'onglets Connexion / Inscription */}
        <div className="np-auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setErrorMsg(null);
            }}
          >
            Se connecter
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setErrorMsg(null);
            }}
          >
            Créer un compte
          </button>
        </div>

        {errorMsg && (
          <div className="np-alert-banner danger mt-4">
            <Info size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="np-auth-form">
          {mode === "register" && (
            <div className="np-form-group">
              <label className="np-form-label" htmlFor="reg-name">
                Nom complet
              </label>
              <div className="np-input-wrapper">
                <span className="np-input-prefix"><User size={16} /></span>
                <input
                  id="reg-name"
                  type="text"
                  className="np-text-input with-prefix"
                  placeholder="Ex : Kévin Mboua"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {mode === "login" ? (
            <div className="np-form-group">
              <label className="np-form-label" htmlFor="log-ident">
                Adresse email ou numéro de téléphone
              </label>
              <div className="np-input-wrapper">
                <span className="np-input-prefix"><Mail size={16} /></span>
                <input
                  id="log-ident"
                  type="text"
                  className="np-text-input with-prefix"
                  placeholder="Ex : roddy@novapaid.com ou +237..."
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <>
              <div className="np-form-group">
                <label className="np-form-label" htmlFor="reg-email">
                  Adresse email
                </label>
                <div className="np-input-wrapper">
                  <span className="np-input-prefix"><Mail size={16} /></span>
                  <input
                    id="reg-email"
                    type="email"
                    className="np-text-input with-prefix"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="np-form-group">
                <label className="np-form-label" htmlFor="reg-phone">
                  Numéro de téléphone WhatsApp (optionnel)
                </label>
                <div className="np-input-wrapper">
                  <span className="np-input-prefix"><Smartphone size={16} /></span>
                  <input
                    id="reg-phone"
                    type="tel"
                    className="np-text-input with-prefix"
                    placeholder="+237 6XX XX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="np-form-group">
            <div className="flex justify-between items-center mb-1">
              <label className="np-form-label" htmlFor="auth-password" style={{ margin: 0 }}>
                Mot de passe
              </label>
              {mode === "login" && (
                <button
                  type="button"
                  className="text-xs text-blue-600 font-semibold hover:underline bg-transparent border-0 p-0 cursor-pointer"
                  onClick={() => alert("La réinitialisation automatique du mot de passe n’est pas encore disponible. Contactez le support depuis votre espace NovaPaid.")}
                >
                  Mot de passe oublié ?
                </button>
              )}
            </div>
            <div className="np-input-wrapper">
              <span className="np-input-prefix"><Lock size={16} /></span>
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                className="np-text-input with-prefix"
                placeholder={mode === "login" ? "Votre mot de passe" : "Minimum 10 caractères"}
                minLength={mode === "register" ? 10 : undefined}
                maxLength={200}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="np-input-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Masquer mot de passe" : "Afficher mot de passe"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === "register" && (
            <div className="np-auth-bonus-box">
              <Sparkles size={16} className="text-amber-500 flex-shrink-0" />
              <span>
                Votre portefeuille XAF sera créé avec votre compte. Aucun solde fictif ne sera ajouté à l’inscription.
              </span>
            </div>
          )}

          <button type="submit" className="np-primary-button np-submit-btn w-full mt-2" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Traitement en cours...</span>
              </>
            ) : (
              <>
                <span>{mode === "login" ? "Accéder à mon espace" : "Créer mon compte immédiatement"}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="np-auth-footer-switch">
          {mode === "login" ? (
            <p>
              Vous n'avez pas encore de compte ?{" "}
              <button
                type="button"
                className="np-link-btn"
                onClick={() => {
                  setMode("register");
                  setErrorMsg(null);
                }}
              >
                Créer un compte gratuitement
              </button>
            </p>
          ) : (
            <p>
              Vous avez déjà un compte ?{" "}
              <button
                type="button"
                className="np-link-btn"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                }}
              >
                Se connecter
              </button>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
export default AuthModal;
