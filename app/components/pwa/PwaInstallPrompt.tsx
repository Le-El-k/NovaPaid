"use client";

import Image from "next/image";
import { Download, MonitorDown, Plus, Share, Smartphone } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getAssetPath } from "@/app/lib/asset-path";

type Platform = "ios" | "android" | "desktop" | "other";
type Language = "fr" | "en";

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

const INSTALL_REMINDER_KEY = "nova-pay-pwa-install-reminder-until";
const INSTALL_PROMPT_READY_EVENT = "nova-pay-install-prompt-ready";
const REMINDER_DURATION_MS = 24 * 60 * 60 * 1000;

type WindowWithInstallPrompt = Window & {
  __novapaidInstallPrompt?: DeferredInstallPrompt | null;
};

const copy = {
  fr: {
    android: "Android",
    desktop: "Téléphone ou ordinateur",
    ios: "iPhone ou iPad",
    other: "Votre appareil",
    installTitle: "Installez Nova Paid sur votre appareil",
    iosTitle: "Ajoutez Nova Paid à votre écran d’accueil",
    installDescription: "Accédez plus rapidement à Nova Paid depuis votre téléphone, tablette ou ordinateur.",
    iosDescription: "Installez Nova Paid en quelques secondes pour y accéder comme à une application.",
    benefit: "Nova Paid s’ouvrira depuis votre écran d’accueil ou votre bureau, comme une application.",
    install: "Installer l’application",
    installing: "Ouverture de l’invite…",
    later: "Plus tard",
    iosFirstStep: "Ouvrez le menu Partager de votre navigateur.",
    iosSecondStep: "Choisissez « Sur l’écran d’accueil » ou « Ajouter à l’écran d’accueil ».",
    iosThirdStep: "Appuyez sur « Ajouter » pour confirmer.",
  },
  en: {
    android: "Android",
    desktop: "Phone or computer",
    ios: "iPhone or iPad",
    other: "Your device",
    installTitle: "Install Nova Paid on your device",
    iosTitle: "Add Nova Paid to your Home Screen",
    installDescription: "Open Nova Paid faster from your phone, tablet, or computer.",
    iosDescription: "Install Nova Paid in seconds and access it like an app.",
    benefit: "Nova Paid will open from your Home Screen or desktop like an app.",
    install: "Install the app",
    installing: "Opening prompt…",
    later: "Not now",
    iosFirstStep: "Open your browser’s Share menu.",
    iosSecondStep: "Choose “Add to Home Screen”.",
    iosThirdStep: "Tap “Add” to confirm.",
  },
} as const;

function detectPlatform(): Platform {
  const userAgent = navigator.userAgent;
  const isIpadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  if (/iPad|iPhone|iPod/.test(userAgent) || isIpadOs) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  if (/Windows NT|Macintosh|Linux|CrOS/i.test(userAgent)) return "desktop";
  return "other";
}

function isRunningAsInstalledApp(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  const standaloneDisplayMode = typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;

  return standaloneDisplayMode || navigatorWithStandalone.standalone === true ||
    document.referrer.startsWith("android-app://");
}

function getPreferredLanguage(): Language {
  let savedLanguage: string | null = null;

  try {
    savedLanguage = window.localStorage.getItem("nova-pay-language");
  } catch {
    savedLanguage = null;
  }

  if (savedLanguage === "fr" || savedLanguage === "en") return savedLanguage;

  return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

function subscribeToLanguage(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("nova-pay-preference-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("nova-pay-preference-change", onStoreChange);
  };
}

function getReminderUntil(): number | null {
  try {
    const reminderUntil = Number(window.localStorage.getItem(INSTALL_REMINDER_KEY));
    return Number.isFinite(reminderUntil) && reminderUntil > 0 ? reminderUntil : null;
  } catch {
    return null;
  }
}

function clearReminder(): void {
  try {
    window.localStorage.removeItem(INSTALL_REMINDER_KEY);
  } catch {
    return;
  }
}

function saveReminder(until: number): void {
  try {
    window.localStorage.setItem(INSTALL_REMINDER_KEY, String(until));
  } catch {
    return;
  }
}

function getStoredInstallPrompt(): DeferredInstallPrompt | null {
  return (window as WindowWithInstallPrompt).__novapaidInstallPrompt ?? null;
}

function storeInstallPrompt(installPrompt: DeferredInstallPrompt | null): void {
  (window as WindowWithInstallPrompt).__novapaidInstallPrompt = installPrompt;
}

function waitForInstallPrompt(timeoutMs: number): Promise<DeferredInstallPrompt | null> {
  const storedInstallPrompt = getStoredInstallPrompt();
  if (storedInstallPrompt) return Promise.resolve(storedInstallPrompt);

  return new Promise((resolve) => {
    let timeoutId = 0;

    const finish = (installPrompt: DeferredInstallPrompt | null) => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(INSTALL_PROMPT_READY_EVENT, onInstallPromptReady);
      resolve(installPrompt);
    };

    const onInstallPromptReady = () => finish(getStoredInstallPrompt());

    window.addEventListener(INSTALL_PROMPT_READY_EVENT, onInstallPromptReady, { once: true });
    timeoutId = window.setTimeout(() => finish(null), timeoutMs);
  });
}

export function PwaInstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const installPromptRef = useRef<DeferredInstallPrompt | null>(null);
  const reminderTimerRef = useRef<number | null>(null);
  const language = useSyncExternalStore(
    subscribeToLanguage,
    getPreferredLanguage,
    (): Language => "fr",
  );

  useEffect(() => {
    if (isRunningAsInstalledApp()) return;
    if (typeof window !== "undefined" && window.location.pathname.includes("/payment")) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const installPrompt = event as DeferredInstallPrompt;
      storeInstallPrompt(installPrompt);
      installPromptRef.current = installPrompt;
    };

    const onInstallPromptReady = () => {
      installPromptRef.current = getStoredInstallPrompt();
    };

    const onAppInstalled = () => {
      installPromptRef.current = null;
      storeInstallPrompt(null);
      clearReminder();
      if (reminderTimerRef.current !== null) {
        window.clearTimeout(reminderTimerRef.current);
        reminderTimerRef.current = null;
      }
      setIsVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener(INSTALL_PROMPT_READY_EVENT, onInstallPromptReady);
    window.addEventListener("appinstalled", onAppInstalled);
    installPromptRef.current = getStoredInstallPrompt();

    const showModalWhenReminderExpires = () => {
      clearReminder();
      reminderTimerRef.current = null;
      setIsVisible(true);
    };

    const reminderUntil = getReminderUntil();
    if (reminderUntil && reminderUntil > Date.now()) {
      return;
    }
    // Wait at least 10 seconds before asking user to install PWA
    reminderTimerRef.current = window.setTimeout(
      showModalWhenReminderExpires,
      10000,
    );

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener(INSTALL_PROMPT_READY_EVENT, onInstallPromptReady);
      window.removeEventListener("appinstalled", onAppInstalled);
      if (reminderTimerRef.current !== null) {
        window.clearTimeout(reminderTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isVisible]);

  const postponeInstallation = () => {
    const reminderUntil = Date.now() + REMINDER_DURATION_MS;
    saveReminder(reminderUntil);
    setIsVisible(false);

    if (reminderTimerRef.current !== null) {
      window.clearTimeout(reminderTimerRef.current);
    }

    reminderTimerRef.current = window.setTimeout(() => {
      clearReminder();
      reminderTimerRef.current = null;
      setIsVisible(true);
    }, REMINDER_DURATION_MS);
  };

  const requestInstallation = async () => {
    setIsInstalling(true);

    try {
      const installPrompt = installPromptRef.current ?? getStoredInstallPrompt() ??
        await waitForInstallPrompt(1500);
      if (!installPrompt) return;

      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      installPromptRef.current = null;
      storeInstallPrompt(null);

      if (choice.outcome === "accepted") {
        clearReminder();
        setIsVisible(false);
      }
    } catch {
      return;
    } finally {
      setIsInstalling(false);
    }
  };

  if (!isVisible) return null;

  const t = copy[language];
  const platform = detectPlatform();
  const PlatformIcon = platform === "desktop" ? MonitorDown : Smartphone;
  const platformLabel = t[platform];

  return (
    <div className="pwa-install-overlay" role="presentation">
      <section
        className="pwa-install-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
        aria-describedby="pwa-install-description"
      >
        <div className="pwa-install-heading">
          <Image
            className="pwa-install-app-icon"
            src={getAssetPath("/novapaid-logo-192.png")}
            alt=""
            width={56}
            height={56}
            priority
          />
          <div>
            <span className="pwa-install-platform"><PlatformIcon size={14} /> {platformLabel}</span>
            <h2 id="pwa-install-title">{platform === "ios" ? t.iosTitle : t.installTitle}</h2>
          </div>
        </div>

        <p className="pwa-install-description" id="pwa-install-description">
          {platform === "ios" ? t.iosDescription : t.installDescription}
        </p>

        {platform === "ios" ? (
          <ol className="pwa-install-steps">
            <li>
              <span className="pwa-install-step-icon"><Share size={17} /></span>
              <span>{t.iosFirstStep}</span>
            </li>
            <li>
              <span className="pwa-install-step-icon"><Plus size={17} /></span>
              <span>{t.iosSecondStep}</span>
            </li>
            <li>
              <span className="pwa-install-step-number">3</span>
              <span>{t.iosThirdStep}</span>
            </li>
          </ol>
        ) : (
          <>
            <div className="pwa-install-benefit">
              <Download size={17} aria-hidden="true" />
              <span>{t.benefit}</span>
            </div>
          </>
        )}

        <div className="pwa-install-actions">
          {platform !== "ios" && (
            <button
              type="button"
              className="pwa-install-primary"
              onClick={requestInstallation}
              disabled={isInstalling}
            >
              <Download size={17} aria-hidden="true" />
              {isInstalling ? t.installing : t.install}
            </button>
          )}
          <button type="button" className="pwa-install-later" onClick={postponeInstallation}>
            {t.later}
          </button>
        </div>
      </section>
    </div>
  );
}
