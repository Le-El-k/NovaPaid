"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function VerifyEmailPage() {
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  async function sendCode() {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_email_code" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setCodeSent(true);
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || "Erreur d'envoi du code.");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_email", code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setVerified(true);
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: verified ? "var(--green, #00c853)" : "var(--violet, #8b5cf6)" }}>
            {verified ? (
              <svg className="w-8 h-8" fill="none" stroke="#0d0a14" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="none" stroke="#fff" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {verified ? "Email vérifié !" : "Vérification de l'email"}
          </h1>
          <p className="text-sm opacity-70">
            {verified
              ? "Votre adresse email a été vérifiée avec succès."
              : codeSent
                ? "Entrez le code à 4 chiffres envoyé à votre adresse email."
                : "Nous devons vérifier votre adresse email. Cliquez pour recevoir un code."}
          </p>
        </div>

        {verified ? (
          <div className="text-center">
            <Link
              href="/dashboard"
              className="inline-block py-3 px-6 rounded-xl font-semibold text-sm"
              style={{ background: "var(--cyan, #00d4aa)", color: "#0d0a14" }}
            >
              Aller au tableau de bord
            </Link>
          </div>
        ) : !codeSent ? (
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20">{error}</div>
            )}
            <button
              onClick={sendCode}
              disabled={sending}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: "var(--cyan, #00d4aa)", color: "#0d0a14" }}
            >
              {sending ? "Envoi..." : "Envoyer le code de vérification"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5 opacity-80">Code de vérification</label>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                required
                maxLength={4}
                placeholder="0000"
                className="w-full px-4 py-3 rounded-xl text-sm text-center text-2xl font-bold tracking-[0.5em] outline-none transition-colors"
                style={{ background: "var(--ink, #0d0a14)", border: "1px solid var(--line, #2a2537)", color: "var(--text, #f0eff4)" }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.length !== 4}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
              style={{ background: "var(--cyan, #00d4aa)", color: "#0d0a14" }}
            >
              {loading ? "Vérification..." : "Vérifier"}
            </button>
            <button
              type="button"
              onClick={sendCode}
              disabled={cooldown > 0 || sending}
              className="w-full text-sm text-center opacity-60 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
            >
              {cooldown > 0 ? `Renvoyer dans ${cooldown}s` : "Renvoyer le code"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-sm opacity-60 hover:opacity-100 transition-opacity">
            Plus tard →
          </Link>
        </div>
      </div>
    </div>
  );
}
