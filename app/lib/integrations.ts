// Configuration des fournisseurs externes, stockée en base (table integration_settings).
// Plus aucune clé ne vient d'un fichier .env : tout se règle dans /admin → Intégrations.
//
// - getIntegrationValue() : lecture côté serveur (synchrone, node:sqlite).
// - getPublicIntegrationConfig() : uniquement les champs marqués `public`, servis au navigateur.
// - Les champs `secret` ne quittent jamais le serveur : l'admin ne voit qu'un indicateur masqué.
import { getDatabase } from "./db/database.ts";

export type IntegrationField = {
  key: string;
  label: string;
  secret?: boolean;
  /** Exposé au navigateur via /api/public-config (jamais pour un secret). */
  public?: boolean;
  defaultValue?: string;
  placeholder?: string;
  help?: string;
  options?: string[];
};

export type IntegrationProvider = {
  id: string;
  name: string;
  description: string;
  fields: IntegrationField[];
};

export const INTEGRATIONS: IntegrationProvider[] = [
  {
    id: "mailjet",
    name: "Mailjet",
    description: "Emails transactionnels (codes de vérification, 2FA).",
    fields: [
      { key: "api_key", label: "Clé API", secret: true },
      { key: "secret_key", label: "Clé secrète", secret: true },
      { key: "from_email", label: "Expéditeur (email)", defaultValue: "support@novapaid.net", help: "Doit être validé dans Mailjet." },
      { key: "from_name", label: "Expéditeur (nom)", defaultValue: "NovaPaid" },
      { key: "fallback_from_email", label: "Expéditeur de secours", help: "Utilisé seulement si l'expéditeur principal est refusé." },
    ],
  },
  {
    id: "soleaspay",
    name: "SoleasPay",
    description: "Paiements Mobile Money (checkout et webhook).",
    fields: [
      { key: "api_key", label: "Clé API checkout", public: true, help: "Envoyée au navigateur par le formulaire de paiement SoleasPay." },
      { key: "webhook_token", label: "Jeton webhook", secret: true, help: "Le webhook vérifie x-private-key = sha256(jeton)." },
      { key: "gateway_token", label: "Jeton gateway (Bearer)", secret: true, help: "Optionnel : revérifie chaque paiement avant crédit." },
    ],
  },
  {
    id: "maplerad",
    name: "Maplerad",
    description: "Cartes virtuelles Visa et comptes bancaires.",
    fields: [
      { key: "public_key", label: "Clé publique" },
      { key: "secret_key", label: "Clé secrète", secret: true },
      { key: "environment", label: "Environnement", defaultValue: "sandbox", options: ["sandbox", "production"] },
      { key: "webhook_secret", label: "Secret webhook (whsec_…)", secret: true },
      { key: "base_url", label: "URL de l'API", defaultValue: "https://api.maplerad.com/v1" },
      { key: "timeout_ms", label: "Délai max (ms)", defaultValue: "20000" },
    ],
  },
  {
    id: "geny",
    name: "Geny",
    description: "API partenaire « Connexion internet ».",
    fields: [
      { key: "api_key", label: "Clé API (gk_test_… / gk_live_…)", secret: true },
      { key: "api_base", label: "URL de l'API", defaultValue: "https://geny.payool.net/api/v1/partner/" },
    ],
  },
  {
    id: "bkpay",
    name: "BKPay",
    description: "Paiements BKPay.",
    fields: [
      { key: "secret_key", label: "Clé secrète", secret: true },
      { key: "webhook_secret", label: "Secret webhook", secret: true },
    ],
  },
  {
    id: "proxies",
    name: "Proxys Cloudflare",
    description: "URLs des Workers SebPay et LeekPay. Leurs propres secrets restent configurés chez Cloudflare.",
    fields: [
      { key: "sebpay_url", label: "URL proxy SebPay", public: true, defaultValue: "https://nova-pay-sebpay.sebpay-proxy.workers.dev/api/sebpay" },
      { key: "leekpay_url", label: "URL proxy LeekPay", public: true, defaultValue: "https://nova-pay-leekpay.sebpay-proxy.workers.dev/api/leekpay" },
    ],
  },
  {
    id: "emailjs",
    name: "EmailJS",
    description: "Notification email des commandes boutique (envoyée depuis le navigateur).",
    fields: [
      { key: "service_id", label: "Service ID", public: true },
      { key: "template_id", label: "Template ID", public: true },
      { key: "public_key", label: "Clé publique", public: true },
    ],
  },
  {
    id: "site",
    name: "Site",
    description: "Paramètres généraux utilisés pour les URLs de retour des paiements.",
    fields: [
      { key: "public_base_url", label: "URL publique du site", placeholder: "https://novapaid.net", help: "Vide = URL de la requête en cours." },
    ],
  },
];

function findField(provider: string, key: string) {
  return INTEGRATIONS.find((p) => p.id === provider)?.fields.find((f) => f.key === key);
}

/** Valeur stockée en base, sinon valeur par défaut du champ, sinon "". */
export function getIntegrationValue(provider: string, key: string): string {
  try {
    const row = getDatabase()
      .prepare("SELECT setting_value FROM integration_settings WHERE provider = ? AND setting_key = ?")
      .get(provider, key) as { setting_value?: string } | undefined;
    const value = String(row?.setting_value ?? "").trim();
    if (value) return value;
  } catch {
    // Base indisponible : on retombe sur la valeur par défaut.
  }
  return findField(provider, key)?.defaultValue ?? "";
}

/** Champs `public` uniquement, regroupés par fournisseur. */
export function getPublicIntegrationConfig() {
  const out: Record<string, Record<string, string>> = {};
  for (const provider of INTEGRATIONS) {
    for (const field of provider.fields) {
      if (!field.public || field.secret) continue;
      (out[provider.id] ||= {})[field.key] = getIntegrationValue(provider.id, field.key);
    }
  }
  return out;
}

function maskSecret(value: string) {
  if (!value) return "";
  return value.length <= 6 ? "••••••" : `••••••${value.slice(-4)}`;
}

/** Vue admin : les secrets sont masqués, jamais renvoyés en clair. */
export function listIntegrationsForAdmin() {
  const db = getDatabase();
  const rows = db.prepare("SELECT provider, setting_key, setting_value, updated_at FROM integration_settings").all() as Array<{
    provider: string; setting_key: string; setting_value: string; updated_at: string;
  }>;
  const stored = new Map(rows.map((r) => [`${r.provider}:${r.setting_key}`, r]));
  return INTEGRATIONS.map((provider) => ({
    id: provider.id,
    name: provider.name,
    description: provider.description,
    fields: provider.fields.map((field) => {
      const row = stored.get(`${provider.id}:${field.key}`);
      const raw = String(row?.setting_value ?? "");
      return {
        key: field.key,
        label: field.label,
        secret: Boolean(field.secret),
        public: Boolean(field.public),
        help: field.help || "",
        placeholder: field.placeholder || field.defaultValue || "",
        options: field.options || null,
        defaultValue: field.defaultValue || "",
        isSet: raw.trim().length > 0,
        value: field.secret ? "" : raw,
        masked: field.secret ? maskSecret(raw) : "",
        updatedAt: row?.updated_at || null,
      };
    }),
  }));
}

/**
 * Enregistre les valeurs d'un fournisseur.
 * - Secret laissé vide : valeur actuelle conservée (sauf si listé dans `clear`).
 * - Champ non secret vide : supprimé (retour à la valeur par défaut).
 */
export function saveIntegrationValues(provider: string, values: Record<string, unknown>, clear: string[], adminId: number) {
  const def = INTEGRATIONS.find((p) => p.id === provider);
  if (!def) throw new Error("Fournisseur inconnu.");
  const db = getDatabase();
  const upsert = db.prepare(`
    INSERT INTO integration_settings (provider, setting_key, setting_value, updated_by, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(provider, setting_key) DO UPDATE SET setting_value = excluded.setting_value,
      updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP
  `);
  const remove = db.prepare("DELETE FROM integration_settings WHERE provider = ? AND setting_key = ?");
  const changed: string[] = [];
  db.exec("BEGIN");
  try {
    for (const field of def.fields) {
      if (clear.includes(field.key)) {
        remove.run(provider, field.key);
        changed.push(field.key);
        continue;
      }
      if (!(field.key in values)) continue;
      const value = String(values[field.key] ?? "").trim();
      if (value.length > 4000) throw new Error(`Valeur trop longue pour « ${field.label} ».`);
      if (field.options && value && !field.options.includes(value)) throw new Error(`Valeur invalide pour « ${field.label} ».`);
      if (field.secret && !value) continue;
      if (value) upsert.run(provider, field.key, value, adminId);
      else remove.run(provider, field.key);
      changed.push(field.key);
    }
    db.prepare(`
      INSERT INTO admin_audit_logs (admin_id, role, action, target, reason, request_id)
      VALUES (?, (SELECT role FROM admins WHERE id = ?), 'update_integration', ?, ?, lower(hex(randomblob(16))))
    `).run(adminId, adminId, `integration:${provider}`, `Champs modifiés : ${changed.join(", ") || "aucun"}`);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { success: true, integrations: listIntegrationsForAdmin() };
}
