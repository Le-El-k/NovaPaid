"use client";

import { Shopfront } from "@/app/components/boutique/Shopfront";
import { RequireAuth } from "@/app/components/auth/RequireAuth";

export default function TikTokShopPage() {
  return (
    <RequireAuth>
      <Shopfront sectionSlug="pieces-tiktok" />
    </RequireAuth>
  );
}
