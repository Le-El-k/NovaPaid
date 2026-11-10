"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Wrench } from "lucide-react";

export function PlatformMaintenanceGate() {
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string } | null>(null);

  const refresh = async () => {
    try {
      const response = await fetch("/api/platform-status", { cache: "no-store" });
      const data = await response.json();
      setMaintenance(data?.maintenance?.enabled ? data.maintenance : null);
    } catch {
      setMaintenance(null);
    }
  };

  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return;
    refresh();
  }, []);

  if (!maintenance) return null;

  return (
    <section className="np-maintenance-gate" role="alert" aria-live="assertive">
      <div className="np-maintenance-card">
        <div className="np-maintenance-icon"><Wrench size={26} /></div>
        <span className="np-maintenance-overline">Service temporairement indisponible</span>
        <h1>Maintenance en cours</h1>
        <p>{maintenance.message}</p>
        <button type="button" onClick={refresh}>
          <RefreshCw size={15} />
          Vérifier à nouveau
        </button>
        <small><AlertTriangle size={13} /> Les données de votre compte restent protégées.</small>
      </div>
    </section>
  );
}
