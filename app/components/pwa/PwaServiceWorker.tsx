"use client";

import { useEffect, useCallback, useRef } from "react";
import { BASE_PATH, getAssetPath } from "@/app/lib/asset-path";

interface VersionPayload {
  version: string;
  commit?: string;
  buildTime?: string;
  timestamp?: number;
}

export function PwaServiceWorker() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const initialVersionRef = useRef<string | null>(null);
  const refreshingRef = useRef(false);
  const updatePendingRef = useRef(false);

  const isUserBusy = useCallback(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return false;
    if (window.location.pathname.includes("/payment/")) return true;

    const activeTag = document.activeElement?.tagName?.toLowerCase();
    if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
      return true;
    }

    return false;
  }, []);

  const triggerSilentUpdate = useCallback(() => {
    if (refreshingRef.current) return;

    if (isUserBusy()) {
      // Defer update until user leaves inputs / payment
      updatePendingRef.current = true;
      console.log("[PWA] Update detected, deferred while user is active.");
      return;
    }

    refreshingRef.current = true;
    updatePendingRef.current = false;
    console.log("[PWA] Silently applying latest update...");

    if (registrationRef.current?.waiting) {
      registrationRef.current.waiting.postMessage({ action: "skipWaiting" });
    }

    setTimeout(() => {
      window.location.reload();
    }, 200);
  }, [isUserBusy]);

  const checkForRemoteUpdate = useCallback(async () => {
    try {
      const versionUrl = getAssetPath(`/version.json?t=${Date.now()}`);
      const res = await fetch(versionUrl, { cache: "no-store" });
      if (!res.ok) return;

      const data = (await res.json()) as VersionPayload;
      if (!data?.version) return;

      if (!initialVersionRef.current) {
        initialVersionRef.current = data.version;
        return;
      }

      if (initialVersionRef.current !== data.version) {
        console.log(`[PWA] New version detected online: ${data.version} (current: ${initialVersionRef.current})`);
        if (registrationRef.current) {
          void registrationRef.current.update();
        }
        triggerSilentUpdate();
      }
    } catch {
      // Ignore network errors when offline
    }
  }, [triggerSilentUpdate]);

  useEffect(() => {
    // Vite's development server replaces assets while the app is running.
    // Remove a legacy production worker on localhost before returning. Without
    // this cleanup, an older worker can serve a cached stylesheet and hide a
    // responsive change that is already present in the development server.
    if (process.env.NODE_ENV !== "production") {
      void (async () => {
        try {
          if ("serviceWorker" in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((registration) => registration.unregister()));
          }
          if ("caches" in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames
                .filter((name) => name.startsWith("nova-pay-pwa-"))
                .map((name) => caches.delete(name)),
            );
          }
        } catch {
          // Development caching must never affect the storefront.
        }
      })();
      return;
    }

    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    let updateInterval: NodeJS.Timeout | null = null;

    const onControllerChange = () => {
      console.log("[PWA] Service worker controller changed.");
      triggerSilentUpdate();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_ACTIVATED" || event.data?.type === "SW_UPDATED") {
        console.log("[PWA] Service worker updated event received:", event.data);
        triggerSilentUpdate();
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);

    const handleServiceWorkerRegistration = (registration: ServiceWorkerRegistration) => {
      registrationRef.current = registration;

      // If a new worker is already waiting to activate
      if (registration.waiting) {
        registration.waiting.postMessage({ action: "skipWaiting" });
        triggerSilentUpdate();
      }

      // Listen for new worker installs
      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener("statechange", () => {
          if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[PWA] New version installed in background.");
            installingWorker.postMessage({ action: "skipWaiting" });
            triggerSilentUpdate();
          }
        });
      });

      // Proactively check for updates immediately
      void registration.update();
      void checkForRemoteUpdate();
    };

    const registerServiceWorker = () => {
      const swUrl = getAssetPath("/service-worker.js");
      const scope = BASE_PATH ? `${BASE_PATH}/` : "/";

      navigator.serviceWorker
        .register(swUrl, { scope, updateViaCache: "none" })
        .then((registration) => {
          handleServiceWorkerRegistration(registration);
        })
        .catch((error) => {
          console.warn("[PWA] ServiceWorker registration failed:", error);
        });
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker, { once: true });
    }

    // Trigger update checks when returning to the app or reconnecting
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (updatePendingRef.current) {
          triggerSilentUpdate();
        }
        if (registrationRef.current) {
          void registrationRef.current.update();
        }
        void checkForRemoteUpdate();
      }
    };

    const onFocus = () => {
      if (updatePendingRef.current) {
        triggerSilentUpdate();
      }
      if (registrationRef.current) {
        void registrationRef.current.update();
      }
      void checkForRemoteUpdate();
    };

    const onOnline = () => {
      if (registrationRef.current) {
        void registrationRef.current.update();
        void checkForRemoteUpdate();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    // Periodic check every 10 minutes
    updateInterval = setInterval(() => {
      if (registrationRef.current) {
        void registrationRef.current.update();
      }
      void checkForRemoteUpdate();
    }, 10 * 60 * 1000);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      navigator.serviceWorker.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      if (updateInterval) clearInterval(updateInterval);
    };
  }, [checkForRemoteUpdate, triggerSilentUpdate]);

  return null;
}
