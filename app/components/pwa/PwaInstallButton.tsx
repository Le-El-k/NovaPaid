"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useLanguage } from "@/app/lib/i18n";

// Opens the shared PwaInstallPrompt modal (mounted in the root layout) which
// handles the real install flow — the Android/desktop `beforeinstallprompt`
// gesture and the iOS "Add to Home Screen" instructions.
function openInstallDialog() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("nova-pay-open-install-dialog"));
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  const displayStandalone = typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;
  return displayStandalone || nav.standalone === true || (typeof document !== "undefined" && document.referrer.startsWith("android-app://"));
}

type PwaInstallButtonProps = {
  className?: string;
  label?: string;
};

export function PwaInstallButton({ className = "", label }: PwaInstallButtonProps) {
  const { t } = useLanguage();
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  // Hide the button when the app is already running as an installed PWA.
  if (installed) return null;

  return (
    <button type="button" className={`np-pwa-install-btn ${className}`.trim()} onClick={openInstallDialog}>
      <Download size={16} />
      <span>{label || t("pwa_install_cta")}</span>
    </button>
  );
}

export default PwaInstallButton;
