// Server-side runtime configuration reader.
//
// Resolution order for every config value: database (app_settings, key "cfg.<key>")
// first, then the legacy env var, then the registry default. This lets all API
// keys, emails and numbers live in the DB (editable from the admin panel) while
// keeping .env as a safe fallback during migration.

import { getDatabase } from "../db/database.ts";
import { INTEGRATION_CONFIG, CONFIG_PREFIX, type IntegrationField } from "./config-registry.ts";

const BY_KEY = new Map<string, IntegrationField>(INTEGRATION_CONFIG.map((f) => [f.key, f]));

function readFromDb(cfgKey: string): string | null {
  try {
    const row = getDatabase().prepare("SELECT setting_value FROM app_settings WHERE setting_key = ?").get(CONFIG_PREFIX + cfgKey) as any;
    if (!row || row.setting_value == null) return null;
    let v: any = row.setting_value;
    try { v = JSON.parse(row.setting_value); } catch { /* stored as plain string */ }
    if (typeof v === "string") return v.trim() ? v : null;
    if (v != null && v !== "") return String(v);
    return null;
  } catch {
    return null; // DB not ready yet — fall back to env
  }
}

// Resolve a single config value (DB -> env -> default).
export function getConfigValue(cfgKey: string): string {
  const field = BY_KEY.get(cfgKey);
  const fromDb = readFromDb(cfgKey);
  if (fromDb !== null) return fromDb;
  const env = field?.env;
  if (env && process.env[env] && String(process.env[env]).trim()) return String(process.env[env]);
  return field?.default ?? "";
}

// Admin view: non-secret values in clear, secret values masked (never leaves the server in clear).
export function getIntegrationConfigForAdmin() {
  return INTEGRATION_CONFIG.map((f) => {
    const value = getConfigValue(f.key);
    if (f.secret) {
      return { key: f.key, group: f.group, label: f.label, secret: true, isSet: Boolean(value), preview: value ? `••••${value.slice(-4)}` : "" };
    }
    return { key: f.key, group: f.group, label: f.label, secret: false, value };
  });
}

// Values safe to expose to the browser.
export function getPublicConfig() {
  const out: Record<string, string> = {};
  for (const f of INTEGRATION_CONFIG) if (f.public) out[f.key] = getConfigValue(f.key);
  return out;
}
