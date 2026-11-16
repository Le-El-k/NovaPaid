"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Bell, CheckCircle2, Clock, Copy, Loader2, Lock, Plus, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { useLanguage } from "@/app/lib/i18n";
import type { GenyOrderView } from "@/app/lib/geny/types.ts";

type Phase = "idle" | "creating" | "otp" | "polling" | "succeeded" | "failed" | "expired" | "pending_long";
type NotifPerm = "default" | "granted" | "denied" | "unsupported";

function initialNotifPerm(): NotifPerm {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as NotifPerm;
}

async function requestNotifPermission(): Promise<NotifPerm> {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    if (Notification.permission !== "default") return Notification.permission as NotifPerm;
    return (await Notification.requestPermission()) as NotifPerm;
  } catch {
    return "unsupported";
  }
}

// Shows a real notification on the user's device (system banner), delivered
// through the service worker so it also fires when the tab is in the background.
async function showDeviceNotification(title: string, body: string) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const options: NotificationOptions & { renotify?: boolean } = {
      body,
      icon: "/novapaid-logo-96.png",
      badge: "/novapaid-logo-96.png",
      tag: "geny-code",
      renotify: true,
      data: { url: "/dashboard#codes" },
    };
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg) { await reg.showNotification(title, options); return; }
    }
    new Notification(title, options);
  } catch {
    // Notifications are best-effort; never break the checkout.
  }
}

type GenyInternetCheckoutProps = {
  planId: string;
  orderRef: string;
  operator: "mtn" | "orange";
  phone: string; // normalized 6XXXXXXXX
  buttonLabel: string;
  onNewOrderRef: () => string;
  onStepChange?: (step: 1 | 2 | 3) => void;
};

// Polling cadence (ms) and overall budget: ~8 minutes of active checking.
const POLL_INTERVAL = 4000;
const MAX_POLLS = 120;

function formatPhone(local: string) {
  return `+237 ${local.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4")}`.trim();
}

export function GenyInternetCheckout({
  planId,
  orderRef: initialOrderRef,
  operator,
  phone,
  buttonLabel,
  onNewOrderRef,
  onStepChange,
}: GenyInternetCheckoutProps) {
  const { t } = useLanguage();
  const [orderRef, setOrderRef] = useState(initialOrderRef);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [otp, setOtp] = useState("");
  const [otpInstruction, setOtpInstruction] = useState("");
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [livemode, setLivemode] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [notifPerm, setNotifPerm] = useState<NotifPerm>(initialNotifPerm);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCount = useRef(0);
  const activeRef = useRef(true);
  const notifiedRef = useRef(false);

  const WAIT_TARGET = 300; // ~5 minutes, matching the operator's typical confirmation time

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  // Reset to a fresh order if the chosen offer changes (component is keyed by offer in parent).
  useEffect(() => {
    setOrderRef(initialOrderRef);
  }, [initialOrderRef]);

  // Countdown shown on the waiting (validation) screen while the payment is pending.
  useEffect(() => {
    if (phase !== "creating" && phase !== "polling") return;
    const interval = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Drive the parent's 3-step indicator from the real payment phase:
  //   1 = Paiement (entering the number) · 2 = Validation (approve on phone) · 3 = Votre code
  useEffect(() => {
    const step: 1 | 2 | 3 = phase === "succeeded" ? 3 : phase === "idle" ? 1 : 2;
    onStepChange?.(step);
  }, [phase, onStepChange]);

  const applyView = useCallback((view: GenyOrderView) => {
    setLivemode(view.livemode);
    if (view.otpInstruction) setOtpInstruction(view.otpInstruction);
    if (view.status === "succeeded" && view.code) {
      setCode(view.code);
      setPhase("succeeded");
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        void showDeviceNotification(
          t("geny_notif_ready_title"),
          t("geny_notif_ready_body").replace("{code}", view.code),
        );
      }
      return "done" as const;
    }
    if (view.status === "failed") {
      setPhase("failed");
      return "done" as const;
    }
    if (view.status === "expired") {
      setPhase("expired");
      return "done" as const;
    }
    if (view.requiresOtp && !view.final) {
      setPhase("otp");
      return "otp" as const;
    }
    return "pending" as const;
  }, [t]);

  const schedulePoll = useCallback(() => {
    if (!activeRef.current) return;
    if (pollCount.current >= MAX_POLLS) {
      setPhase("pending_long");
      return;
    }
    pollRef.current = setTimeout(async () => {
      if (!activeRef.current) return;
      pollCount.current += 1;
      try {
        const res = await fetch(`/api/geny?action=order&orderRef=${encodeURIComponent(orderRef)}`, { cache: "no-store" });
        const data = (await res.json()) as GenyOrderView & { code?: string; error?: string };
        if (!activeRef.current) return;
        if (res.ok && data.ok) {
          const outcome = applyView(data);
          if (outcome === "pending") schedulePoll();
        } else {
          // Transient read error: keep polling unless the order is truly gone.
          schedulePoll();
        }
      } catch {
        if (activeRef.current) schedulePoll();
      }
    }, POLL_INTERVAL);
  }, [orderRef, applyView]);

  const startCheckout = useCallback(async () => {
    setError("");
    setPhase("creating");
    setElapsedSec(0);
    pollCount.current = 0;
    notifiedRef.current = false;
    // Ask for device-notification permission now (still inside the Pay click gesture).
    void requestNotifPermission().then((perm) => { if (activeRef.current) setNotifPerm(perm); });
    try {
      const res = await fetch("/api/geny", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-order", orderRef, planId, operator, phone }),
      });
      const data = (await res.json()) as GenyOrderView & { code?: string; error?: string };
      if (!activeRef.current) return;
      if (!res.ok || !data.ok) {
        setError(data.error || t("geny_error_generic"));
        setPhase("idle");
        return;
      }
      const outcome = applyView(data);
      if (outcome === "pending") {
        setPhase("polling");
        schedulePoll();
      }
    } catch {
      if (!activeRef.current) return;
      setError(t("geny_error_generic"));
      setPhase("idle");
    }
  }, [orderRef, planId, operator, phone, applyView, schedulePoll, t]);

  const submitOtp = useCallback(async () => {
    if (!/^\d{3,8}$/.test(otp)) {
      setError(t("geny_otp_invalid"));
      return;
    }
    setError("");
    setOtpSubmitting(true);
    try {
      const res = await fetch("/api/geny", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "otp", orderRef, otp }),
      });
      const data = (await res.json()) as GenyOrderView & { error?: string };
      if (!activeRef.current) return;
      if (!res.ok || !data.ok) {
        setError(data.error || t("geny_otp_invalid"));
        return;
      }
      setOtp("");
      const outcome = applyView(data);
      if (outcome === "pending") {
        setPhase("polling");
        schedulePoll();
      }
    } catch {
      if (activeRef.current) setError(t("geny_error_generic"));
    } finally {
      if (activeRef.current) setOtpSubmitting(false);
    }
  }, [otp, orderRef, applyView, schedulePoll, t]);

  const checkAgain = useCallback(async () => {
    setPhase("polling");
    pollCount.current = Math.max(0, MAX_POLLS - 30);
    try {
      const res = await fetch(`/api/geny?action=order&orderRef=${encodeURIComponent(orderRef)}`, { cache: "no-store" });
      const data = (await res.json()) as GenyOrderView;
      if (res.ok && data.ok) {
        const outcome = applyView(data);
        if (outcome === "pending") schedulePoll();
      } else {
        setPhase("pending_long");
      }
    } catch {
      setPhase("pending_long");
    }
  }, [orderRef, applyView, schedulePoll]);

  const retry = useCallback(() => {
    if (pollRef.current) clearTimeout(pollRef.current);
    pollCount.current = 0;
    setCode("");
    setOtp("");
    setError("");
    setOtpInstruction("");
    setElapsedSec(0);
    notifiedRef.current = false;
    setOrderRef(onNewOrderRef());
    setPhase("idle");
  }, [onNewOrderRef]);

  const copyCode = useCallback(async () => {
    if (!code) return;
    const markCopied = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    };
    // Modern Clipboard API (secure contexts: https / localhost).
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(code);
        markCopied();
        return;
      } catch {
        // fall through to the legacy path below
      }
    }
    // Legacy fallback (works over http and on older browsers).
    try {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-1000px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, code.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (ok) markCopied();
    } catch {
      // Clipboard unavailable; the code stays visible for manual copy.
    }
  }, [code]);

  const operatorLabel = operator === "mtn" ? "MTN MoMo" : "Orange Money";
  const ussdCode = operator === "mtn" ? "*126#" : "#150#";
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const remainingSec = Math.max(0, WAIT_TARGET - elapsedSec);
  const waitProgress = Math.min(100, Math.round((elapsedSec / WAIT_TARGET) * 100));

  // --- Render ---

  if (phase === "succeeded") {
    return (
      <div className="geny-checkout geny-checkout--success" role="status">
        <div className="geny-success-icon"><CheckCircle2 size={34} /></div>
        <h3>{t("geny_success_title")}</h3>
        <p>{t("geny_success_desc")}</p>
        <div className="geny-code-box">
          <span className="geny-code-label">{t("geny_code_label")}</span>
          <div className="geny-code-value">
            <code>{code}</code>
            <button type="button" onClick={copyCode} aria-label={t("geny_copy")}>
              {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              <span>{copied ? t("geny_copied") : t("geny_copy")}</span>
            </button>
          </div>
        </div>
        <p className="geny-ref-line">{t("geny_ref_label")} : <strong>{orderRef}</strong></p>
      </div>
    );
  }

  if (phase === "failed" || phase === "expired") {
    return (
      <div className="geny-checkout geny-checkout--error" role="alert">
        <div className="geny-error-icon"><AlertCircle size={30} /></div>
        <h3>{t("geny_failed_title")}</h3>
        <p>{phase === "expired" ? t("geny_expired_desc") : t("geny_failed_desc")}</p>
        <button type="button" className="geny-retry-btn" onClick={retry}>
          <RefreshCw size={15} /> {t("geny_retry")}
        </button>
      </div>
    );
  }

  if (phase === "otp") {
    return (
      <div className="geny-checkout geny-checkout--otp">
        <div className="geny-step-head"><Smartphone size={18} /><strong>{t("geny_otp_title")}</strong></div>
        <p>{otpInstruction || t("geny_otp_desc")}</p>
        <div className="geny-otp-row">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 8)); if (error) setError(""); }}
            placeholder="123456"
            aria-label={t("geny_otp_title")}
          />
          <button type="button" onClick={submitOtp} disabled={otpSubmitting || otp.length < 3}>
            {otpSubmitting ? <Loader2 size={16} className="geny-spin" /> : null}
            {t("geny_otp_submit")}
          </button>
        </div>
        {error && <p className="geny-inline-error"><AlertCircle size={13} /> {error}</p>}
      </div>
    );
  }

  if (phase === "polling" || phase === "creating") {
    return (
      <div className="geny-checkout geny-checkout--waiting" role="status">
        <div className="geny-waiting-title">
          <Loader2 size={20} className="geny-spin" />
          <h3>{t("geny_awaiting_validation_title")}</h3>
        </div>

        <div className="geny-wait-box">
          <div className="geny-wait-box-head"><Clock size={18} /><strong>{t("geny_wait_box_title")}</strong></div>
          <p>{t("geny_wait_box_desc")}</p>
          <div className="geny-wait-bar"><i style={{ width: `${waitProgress}%` }} /></div>
          <span className="geny-wait-timer">
            {t("geny_wait_elapsed").replace("{elapsed}", fmt(elapsedSec)).replace("{remaining}", fmt(remainingSec))}
          </span>
        </div>

        {notifPerm === "granted" ? (
          <div className="geny-notif-box is-on">
            <span className="geny-notif-icon"><Bell size={16} /></span>
            <span><strong>{t("geny_notif_title")}</strong><small>{t("geny_notif_desc")}</small></span>
          </div>
        ) : notifPerm === "denied" ? (
          <div className="geny-notif-box is-off">
            <span className="geny-notif-icon"><Bell size={16} /></span>
            <span><strong>{t("geny_notif_blocked_title")}</strong><small>{t("geny_notif_blocked_desc")}</small></span>
          </div>
        ) : notifPerm === "default" ? (
          <button type="button" className="geny-notif-box is-prompt" onClick={() => { void requestNotifPermission().then((p) => { setNotifPerm(p); }); }}>
            <span className="geny-notif-icon"><Bell size={16} /></span>
            <span><strong>{t("geny_notif_enable_title")}</strong><small>{t("geny_notif_enable_desc")}</small></span>
          </button>
        ) : null}

        <p className="geny-ussd-hint">
          {t("geny_ussd_hint").split("{ussd}")[0]}
          <b>{ussdCode}</b>
          {(t("geny_ussd_hint").split("{ussd}")[1] || "").replace("{operator}", operatorLabel)}
        </p>

        <button type="button" className="geny-new-payment-btn" onClick={retry}>
          <Plus size={16} /> {t("geny_new_payment")}
        </button>

        <div className="geny-wait-foot">
          <span className="geny-ref-line">{t("geny_ref_label")} : <strong>{orderRef}</strong></span>
          <button type="button" className="geny-cancel-link" onClick={retry}>{t("geny_cancel")}</button>
        </div>
      </div>
    );
  }

  if (phase === "pending_long") {
    return (
      <div className="geny-checkout geny-checkout--waiting">
        <h3>{t("geny_pending_long_title")}</h3>
        <p>{t("geny_pending_long").replace("{ref}", orderRef)}</p>
        <div className="geny-pending-actions">
          <button type="button" className="geny-retry-btn" onClick={checkAgain}><RefreshCw size={15} /> {t("geny_check_again")}</button>
        </div>
      </div>
    );
  }

  // idle
  return (
    <div className="geny-checkout geny-checkout--idle">
      <button type="button" className="np-internet-pay-btn geny-pay-btn" onClick={startCheckout}>
        <Lock size={15} /> {buttonLabel}
      </button>
      {error && <p className="geny-inline-error"><AlertCircle size={13} /> {error}</p>}
      <p className="geny-secure-line"><ShieldCheck size={13} /> {t("geny_secure_line").replace("{operator}", operatorLabel)}</p>
    </div>
  );
}
