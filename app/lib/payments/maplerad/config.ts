// Maplerad configuration — SERVER-SIDE ONLY.
// Values resolve via getConfigValue: database (admin panel) first, then the legacy
// env var (loaded by server.js from .env.maplerad.local), then the registry default.
// Never import this module into client/browser code and never expose the secret key
// to the frontend.

import { getConfigValue } from "../../config/runtime-config.ts";

export type MapleradEnvironment = "sandbox" | "production";

export interface MapleradConfig {
  secretKey: string;
  publicKey: string;
  webhookSecret: string;
  baseUrl: string;
  environment: MapleradEnvironment;
  timeoutMs: number;
}

/**
 * The same API host serves both sandbox and production — the environment is
 * selected by which API key you authenticate with (see Maplerad "Environment"
 * docs). We still track the environment on our records so sandbox and production
 * customers/cards never collide.
 */
const DEFAULT_BASE_URL = "https://api.maplerad.com/v1";

function readEnvironment(): MapleradEnvironment {
  const raw = (getConfigValue("maplerad_environment") || "sandbox").trim().toLowerCase();
  return raw === "production" || raw === "live" ? "production" : "sandbox";
}

/**
 * Returns the resolved Maplerad config, or null when no secret key is configured.
 * Callers MUST handle the null case and surface a clear "provider not configured"
 * error instead of attempting a request.
 */
export function getMapleradConfig(): MapleradConfig | null {
  const secretKey = getConfigValue("maplerad_secret_key").trim();
  if (!secretKey) return null;

  const baseUrl = (getConfigValue("maplerad_base_url") || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  const timeoutMs = Number(process.env.MAPLERAD_TIMEOUT_MS || 20000) || 20000;

  return {
    secretKey,
    publicKey: getConfigValue("maplerad_public_key").trim(),
    webhookSecret: getConfigValue("maplerad_webhook_secret").trim(),
    baseUrl,
    environment: readEnvironment(),
    timeoutMs,
  };
}

export function isMapleradConfigured(): boolean {
  return Boolean(getConfigValue("maplerad_secret_key").trim());
}
