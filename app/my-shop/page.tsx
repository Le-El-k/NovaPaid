"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MyShop } from "../components/marketplace/MyShop";
import { ServiceUnavailable } from "../components/common/ServiceUnavailable";
import { RequireAuth } from "../components/auth/RequireAuth";
import { SERVICES_LIVE } from "@/app/lib/feature-flags";

export default function MyShopPage() {
  return (
    <RequireAuth>
      {!SERVICES_LIVE ? <ServiceUnavailable /> : (
    <div className="np-marketplace-page">
      <div className="np-marketplace-page-nav">
        <Link href="/dashboard" className="np-marketplace-back-link">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Ma Boutique</h1>
      </div>
      <MyShop />
    </div>
      )}
    </RequireAuth>
  );
}
