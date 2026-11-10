"use client";

import { useEffect, useState } from "react";
import { PublicShop } from "../components/marketplace/PublicShop";

export default function ShopSlugPage() {
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && parts[0] === "shop") {
      setSlug(parts[1]);
    }
  }, []);

  if (!slug) return <div style={{ padding: 40, textAlign: "center", opacity: 0.5 }}>Chargement de la boutique...</div>;

  return <PublicShop slug={slug} />;
}
