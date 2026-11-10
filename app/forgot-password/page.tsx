"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--surface, #f4f3f7)" }}>
      <div className="w-full max-w-md p-8 rounded-2xl shadow-lg" style={{ background: "var(--panel, #1a1625)", color: "var(--text, #f0eff4)" }}>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Mot de passe oublié</h1>
          <p className="text-sm opacity-70">
            {sent
              ? "Vérifiez votre boîte email pour le lien de réinitialisation."
              : "Entrez votre adresse email pour recevoir un lien de réinitialisation."}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5 opacity-80">Adresse email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="vous@exemple.com"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                style={{ background: "var(--ink, #0d0a14)", border: "1px solid var(--line, #2a2537)", color: "var(--text, #f0eff4)" }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: "var(--cyan, #00d4aa)", color: "#0d0a14" }}
            >
              {loading ? "Envoi en cours..." : "Envoyer le lien"}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ background: "var(--cyan, #00d4aa)" }}>
              <svg className="w-8 h-8" fill="none" stroke="#0d0a14" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm opacity-70">
              Si un compte est associé à <strong>{email}</strong>, vous recevrez un email avec les instructions.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="text-sm underline opacity-60 hover:opacity-100 transition-opacity"
            >
              Essayer une autre adresse
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm opacity-60 hover:opacity-100 transition-opacity" style={{ color: "var(--cyan, #00d4aa)" }}>
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
