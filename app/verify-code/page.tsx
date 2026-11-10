"use client";
import { useState, useEffect } from "react";

export default function VerifyCodePage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Récupérer userId et type depuis les params URL
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const userId = params.get("uid") || "";
  const type = params.get("type") || "login";
  const redirect = params.get("redirect") || "/dashboard";

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  async function resendCode() {
    try {
      setCooldown(60);
      await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_login_code", userId: Number(userId) }),
      });
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_login_code", userId: Number(userId), code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Code incorrect.");
      window.location.href = redirect;
    } catch (err: any) {
      setError(err.message || "Code incorrect.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--surface, #f4f3f7)" }}>
      <div className="w-full max-w-md p-8 rounded-2xl shadow-lg" style={{ background: "var(--panel, #1a1625)", color: "var(--text, #f0eff4)" }}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: "var(--blue, #3b82f6)" }}>
            <svg className="w-8 h-8" fill="none" stroke="#fff" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Vérification en deux étapes</h1>
          <p className="text-sm opacity-70">
            Entrez le code à 4 chiffres envoyé à votre adresse email.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20">{error}</div>
          )}
          <div>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              required
              maxLength={4}
              placeholder="0000"
              autoFocus
              className="w-full px-4 py-4 rounded-xl text-center text-3xl font-bold tracking-[0.6em] outline-none transition-colors"
              style={{ background: "var(--ink, #0d0a14)", border: "1px solid var(--line, #2a2537)", color: "var(--text, #f0eff4)" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || code.length !== 4}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
            style={{ background: "var(--cyan, #00d4aa)", color: "#0d0a14" }}
          >
            {loading ? "Vérification..." : "Confirmer"}
          </button>
          <button
            type="button"
            onClick={resendCode}
            disabled={cooldown > 0}
            className="w-full text-sm text-center opacity-60 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
          >
            {cooldown > 0 ? `Renvoyer dans ${cooldown}s` : "Renvoyer le code"}
          </button>
        </form>
      </div>
    </div>
  );
}
