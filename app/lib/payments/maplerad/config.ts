// Maplerad configuration — SERVER-SIDE ONLY.
// Secrets are read from process.env (loaded by server.js from .env.maplerad.local,
// a git-ignored file). Never import this module into client/browser code and never
// expose the secret key to the frontend.

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
  const raw = (process.env.MAPLERAD_ENVIRONMENT || "sandbox").trim().toLowerCase();
  return raw === "production" || raw === "live" ? "production" : "sandbox";
}

/**
 * Returns the resolved Maplerad config, or null when no secret key is configured.
 * Callers MUST handle the null case and surface a clear "provider not configured"
 * error instead of attempting a request.
 */
export function getMapleradConfig(): MapleradConfig | null {
  const secretKey = (process.env.MAPLERAD_SECRET_KEY || "").trim();
  if (!secretKey) return null;

  const baseUrl = (process.env.MAPLERAD_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  const timeoutMs = Number(process.env.MAPLERAD_TIMEOUT_MS || 20000) || 20000;

  return {
    secretKey,
    publicKey: (process.env.MAPLERAD_PUBLIC_KEY || "").trim(),
    baseUrl,
    environment: readEnvironment(),
    timeoutMs,
  };
}

export function isMapleradConfigured(): boolean {
  return Boolean((process.env.MAPLERAD_SECRET_KEY || "").trim());
}
