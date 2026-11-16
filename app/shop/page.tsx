"use client";

import { useEffect, useState } from "react";
import { PublicShop } from "../components/marketplace/PublicShop";
import { ServiceUnavailable } from "../components/common/ServiceUnavailable";
import { RequireAuth } from "../components/auth/RequireAuth";
import { SERVICES_LIVE } from "@/app/lib/feature-flags";

export default function ShopSlugPage() {
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && parts[0] === "shop") {
      setSlug(parts[1]);
    }
  }, []);

  return (
    <RequireAuth>
      {!SERVICES_LIVE ? (
        <ServiceUnavailable />
      ) : !slug ? (
        <div style={{ padding: 40, textAlign: "center", opacity: 0.5 }}>Chargement de la boutique...</div>
      ) : (
        <PublicShop slug={slug} />
      )}
    </RequireAuth>
  );
}
