"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { checkSession } from "@/app/lib/auth/check-session";

// Client-side auth gate: verifies the server session (GET /api/auth) and sends
// unauthenticated visitors to the login page with a redirect back here. Children
// render only once the session is confirmed, so protected content never flashes.
// A transient network failure (PWA reopening offline, server waking) is NOT a
// logout: we retry and keep waiting instead of bouncing the user to /login.
export function RequireAuth({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"checking" | "authed" | "offline">("checking");

  useEffect(() => {
    let active = true;

    const goToLogin = () => {
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
    };

    const run = () => {
      setStatus("checking");
      checkSession().then((result) => {
        if (!active) return;
        if (result.authed) {
          setStatus("authed");
        } else if (result.networkError) {
          // Keep the session; wait for connectivity instead of logging out.
          setStatus("offline");
        } else {
          goToLogin();
        }
      });
    };

    run();

    // Re-check automatically when the device comes back online or the app is
    // brought back to the foreground, so an offline reopen recovers on its own.
    const onOnline = () => run();
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (status === "offline") {
    return (
      <div className="np-auth-gate-loading" role="status" aria-live="polite">
        <LoaderCircle size={26} className="np-auth-gate-spin" />
        <p style={{ marginTop: 16, fontSize: 14, opacity: 0.8 }}>Connexion en cours… vérifiez votre réseau.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ marginTop: 12, padding: "8px 18px", borderRadius: 999, border: "1px solid currentColor", background: "transparent", color: "inherit", cursor: "pointer" }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (status !== "authed") {
    return (
      <div className="np-auth-gate-loading" role="status" aria-live="polite">
        <LoaderCircle size={26} className="np-auth-gate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

export default RequireAuth;
