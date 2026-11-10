"use client";
import { useState, useEffect, useRef } from "react";

interface PinLockScreenProps {
  onUnlock: () => void;
  onLogout?: () => void;
  userName?: string;
}

export default function PinLockScreen({ onUnlock, onLogout, userName }: PinLockScreenProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (pin.length !== 4) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_pin", pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "PIN incorrect.");
      onUnlock();
    } catch (err: any) {
      setError(err.message || "PIN incorrect.");
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  }

  function handleDigit(digit: string) {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError("");
    if (newPin.length === 4) {
      setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        setPin(newPin);
        handleSubmitDirect(newPin);
      }, 100);
    }
  }

  async function handleSubmitDirect(pinValue: string) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_pin", pin: pinValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "PIN incorrect.");
      onUnlock();
    } catch (err: any) {
      setError(err.message || "PIN incorrect.");
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  }

  function handleDelete() {
    setPin(pin.slice(0, -1));
    setError("");
  }

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-4"
      style={{ background: "var(--ink, #0d0a14)" }}>
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ background: "var(--violet, #8b5cf6)" }}>
          <svg className="w-8 h-8" fill="none" stroke="#fff" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        {userName && (
          <p className="text-sm mb-1" style={{ color: "var(--muted, #8a8494)" }}>Bonjour, {userName}</p>
        )}
        <h1 className="text-xl font-bold" style={{ color: "var(--text, #f0eff4)" }}>Entrez votre code PIN</h1>
      </div>

      {/* PIN dots */}
      <div className={`flex gap-4 mb-6 ${shake ? "animate-shake" : ""}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full transition-all duration-200"
            style={{
              background: i < pin.length ? "var(--cyan, #00d4aa)" : "transparent",
              border: `2px solid ${i < pin.length ? "var(--cyan, #00d4aa)" : "var(--line, #2a2537)"}`,
            }}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-4 text-center">{error}</p>
      )}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 max-w-[280px] w-full">
        {digits.map((digit, i) => {
          if (digit === "") return <div key={i} />;
          if (digit === "del") {
            return (
              <button
                key={i}
                onClick={handleDelete}
                disabled={pin.length === 0}
                className="w-full aspect-square rounded-2xl flex items-center justify-center text-lg font-medium transition-all active:scale-95 disabled:opacity-30"
                style={{ background: "transparent", color: "var(--text, #f0eff4)" }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414A2 2 0 0110.828 5H21a2 2 0 012 2v10a2 2 0 01-2 2H10.828a2 2 0 01-1.414-.586L3 12z" />
                </svg>
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => handleDigit(digit)}
              disabled={loading}
              className="w-full aspect-square rounded-2xl flex items-center justify-center text-xl font-semibold transition-all active:scale-95"
              style={{ background: "var(--panel, #1a1625)", color: "var(--text, #f0eff4)" }}
            >
              {digit}
            </button>
          );
        })}
      </div>

      {onLogout && (
        <button
          onClick={onLogout}
          className="mt-8 text-sm opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: "var(--text, #f0eff4)" }}
        >
          Se déconnecter
        </button>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
}
