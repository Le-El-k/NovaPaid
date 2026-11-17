"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import LandingPage from "@/app/components/landing/LandingPage";

export default function Home() {
  const router = useRouter();
  // When the PWA reopens, its start_url is "/", which renders the landing page.
  // An already-authenticated user would see the landing and feel logged out, so
  // check the server session first and send them straight to the dashboard. The
  // session cookie persists for a month, so returning users stay signed in.
  const [status, setStatus] = useState<"checking" | "guest">("checking");

  useEffect(() => {
    let active = true;

    fetch("/api/auth")
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (res.ok && data?.success && data.user) {
          window.location.replace("/dashboard");
          return;
        }
        setStatus("guest");
      })
      .catch(() => {
        if (active) setStatus("guest");
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
