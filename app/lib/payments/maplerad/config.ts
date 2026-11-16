// Maplerad configuration — SERVER-SIDE ONLY.
// Secrets are read from the database (admin → Intégrations), never from a .env file
// a git-ignored file). Never import this module into client/browser code and never
// expose the secret key to the frontend.

import { getIntegrationValue } from "../../integrations.ts";
export type MapleradEnvironment = "sandbox" | "production";

export interface MapleradConfig {
  secretKey: string;
  publicKey: string;
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
  const raw = (getIntegrationValue("maplerad", "environment") || "sandbox").toLowerCase();
  return raw === "production" || raw === "live" ? "production" : "sandbox";
}

/**
 * Returns the resolved Maplerad config, or null when no secret key is configured.
 * Callers MUST handle the null case and surface a clear "provider not configured"
 * error instead of attempting a request.
 */
export function getMapleradConfig(): MapleradConfig | null {
  const secretKey = getIntegrationValue("maplerad", "secret_key");
  if (!secretKey) return null;

  const baseUrl = (getIntegrationValue("maplerad", "base_url") || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const timeoutMs = Number(getIntegrationValue("maplerad", "timeout_ms") || 20000) || 20000;

  return {
    secretKey,
    publicKey: getIntegrationValue("maplerad", "public_key"),
    baseUrl,
    environment: readEnvironment(),
    timeoutMs,
  };
}

export function isMapleradConfigured(): boolean {
  return Boolean(getIntegrationValue("maplerad", "secret_key"));
}
