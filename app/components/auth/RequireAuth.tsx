"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

// Client-side auth gate: verifies the server session (GET /api/auth) and sends
// unauthenticated visitors to the login page with a redirect back here. Children
// render only once the session is confirmed, so protected content never flashes.
export function RequireAuth({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"checking" | "authed">("checking");

  useEffect(() => {
    let active = true;
    const goToLogin = () => {
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
    };

    fetch("/api/auth")
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (!res.ok || !data?.success || !data.user) {
          goToLogin();
          return;
        }
        setStatus("authed");
      })
      .catch(() => {
        if (active) goToLogin();
      });

    return () => {
      active = false;
    };
  }, []);

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
