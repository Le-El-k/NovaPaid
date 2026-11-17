"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import LandingPage from "@/app/components/landing/LandingPage";
import { checkSession } from "@/app/lib/auth/check-session";

export default function Home() {
  const router = useRouter();
  // When the PWA reopens, its start_url is "/", which renders the landing page.
  // An already-authenticated user would see the landing and feel logged out, so
  // check the server session first and send them straight to the dashboard. The
  // session cookie persists (and is renewed) for a month, so returning users stay
  // signed in. A transient network failure falls back to the public landing.
  const [status, setStatus] = useState<"checking" | "guest">("checking");

  useEffect(() => {
    let active = true;
    checkSession().then((result) => {
      if (!active) return;
      if (result.authed) {
        window.location.replace("/dashboard");
        return;
      }
      setStatus("guest");
    });
    return () => {
      active = false;
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="np-auth-gate-loading" role="status" aria-live="polite">
        <LoaderCircle size={26} className="np-auth-gate-spin" />
      </div>
    );
  }

  return <LandingPage onOpenDashboard={() => router.push("/dashboard")} />;
}
