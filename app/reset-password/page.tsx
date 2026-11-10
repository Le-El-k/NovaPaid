"use client";
import { useState } from "react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Récupérer le token depuis l'URL
  const token = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") || "" : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 10) {
      setError("Le mot de passe doit contenir au moins 10 caractères.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--surface, #f4f3f7)" }}>
        <div className="w-full max-w-md p-8 rounded-2xl shadow-lg text-center" style={{ background: "var(--panel, #1a1625)", color: "var(--text, #f0eff4)" }}>
          <h1 className="text-xl font-bold mb-4">Lien invalide</h1>
          <p className="text-sm opacity-70 mb-6">Ce lien de réinitialisation est invalide ou a expiré.</p>
          <Link href="/forgot-password" className="text-sm font-medium" style={{ color: "var(--cyan, #00d4aa)" }}>
            Demander un nouveau lien →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--surface, #f4f3f7)" }}>
      <div className="w-full max-w-md p-8 rounded-2xl shadow-lg" style={{ background: "var(--panel, #1a1625)", color: "var(--text, #f0eff4)" }}>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Nouveau mot de passe</h1>
          <p className="text-sm opacity-70">
            {done ? "Votre mot de passe a été modifié." : "Choisissez un nouveau mot de passe sécurisé."}
          </p>
        </div>

        {!done ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5 opacity-80">Nouveau mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={10}
                placeholder="Minimum 10 caractères"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                style={{ background: "var(--ink, #0d0a14)", border: "1px solid var(--line, #2a2537)", color: "var(--text, #f0eff4)" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 opacity-80">Confirmer le mot de passe</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={10}
                placeholder="Retapez le mot de passe"
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
              {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ background: "var(--green, #00c853)" }}>
              <svg className="w-8 h-8" fill="none" stroke="#0d0a14" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm opacity-70">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
            <Link
              href="/login"
              className="inline-block py-3 px-6 rounded-xl font-semibold text-sm"
              style={{ background: "var(--cyan, #00d4aa)", color: "#0d0a14" }}
            >
              Se connecter
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
