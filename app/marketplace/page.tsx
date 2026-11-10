"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, ShoppingCart, Store } from "lucide-react";
import { MarketplaceBrowse } from "../components/marketplace/MarketplaceBrowse";
import { MesCommandes } from "../components/marketplace/MesCommandes";
import { MyShop } from "../components/marketplace/MyShop";

type MarketplaceTab = "browse" | "commandes" | "my_shop";

export default function MarketplacePage() {
  const [tab, setTab] = useState<MarketplaceTab>("browse");

  return (
    <div className="np-marketplace-page">
      <div className="np-marketplace-page-nav">
        <Link href="/dashboard" className="np-marketplace-back-link">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <div className="np-marketplace-tabs">
          <button type="button" className={tab === "browse" ? "active" : ""} onClick={() => setTab("browse")}>
            <ShoppingCart size={15} /> <span>Articles</span>
          </button>
          <button type="button" className={tab === "commandes" ? "active" : ""} onClick={() => setTab("commandes")}>
            <Package size={15} /> <span>Mes commandes</span>
          </button>
          <button type="button" className={tab === "my_shop" ? "active" : ""} onClick={() => setTab("my_shop")}>
            <Store size={15} /> <span>Ma Boutique</span>
          </button>
        </div>
      </div>

      {tab === "browse" && <MarketplaceBrowse />}
      {tab === "commandes" && <MesCommandes />}
      {tab === "my_shop" && <MyShop />}
    </div>
  );
}
