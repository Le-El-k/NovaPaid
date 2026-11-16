"use client";

import { Shopfront } from "@/app/components/boutique/Shopfront";
import { RequireAuth } from "@/app/components/auth/RequireAuth";

export default function VideoGamesShopPage() {
  return (
    <RequireAuth>
      <Shopfront sectionSlug="jeux-video" />
    </RequireAuth>
  );
}
