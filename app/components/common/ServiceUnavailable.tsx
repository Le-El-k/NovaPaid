"use client";

import Link from "next/link";
import { Clock, ShoppingBag, Wrench } from "lucide-react";
import { useLanguage } from "@/app/lib/i18n";

// Shown on every section that is not yet open to the public while the platform
// launches with the Boutique only (see SERVICES_LIVE in app/lib/feature-flags).
export function ServiceUnavailable({ embedded = false }: { embedded?: boolean }) {
  const { t } = useLanguage();
  return (
    <section className={`np-svc-unavailable${embedded ? " is-embedded" : ""}`} role="status" aria-live="polite">
      <div className="np-svc-unavailable-card">
        <div className="np-svc-unavailable-icon"><Wrench size={26} /></div>
        <span className="np-svc-unavailable-overline"><Clock size={13} /> {t("svc_unavailable_overline")}</span>
        <h1>{t("svc_unavailable_title")}</h1>
        <p>{t("svc_unavailable_desc")}</p>
        <Link href="/boutique" className="np-svc-unavailable-cta">
          <ShoppingBag size={16} /> {t("svc_unavailable_cta")}
        </Link>
      </div>
    </section>
  );
}

export default ServiceUnavailable;
