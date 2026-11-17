// Single source of truth for all runtime configuration that is managed from the
// database (and editable from the admin panel) instead of only from .env files.
//
// Each field maps a stable config key -> its legacy env var (used as a fallback
// and for the one-time seed into the DB) and a default. `secret` values are
// masked in the admin UI and never sent to the browser; `public` values are
// exposed to the client via GET /api/public-config.
//
// This module has NO imports so it can be shared by the DB layer, the server
// integrations and the admin service without any import cycle.

export type IntegrationField = {
  key: string;
  env?: string;
  default?: string;
  secret: boolean;
  public?: boolean;
  group: string;
  label: string;
};

export const CONFIG_PREFIX = "cfg.";

export const INTEGRATION_CONFIG: IntegrationField[] = [
  // Geny (connexion internet)
  { key: "geny_api_key", env: "GENY_API_KEY", secret: true, group: "Geny (Internet)", label: "Clé API Geny (gk_live_… ou gk_test_…)" },
  { key: "geny_api_base", env: "GENY_API_BASE", default: "https://geny.payool.net/api/v1/partner/", secret: false, group: "Geny (Internet)", label: "URL de l'API Geny" },

  // Email (Mailjet)
  { key: "mailjet_api_key", env: "MAILJET_API_KEY", secret: true, group: "Email (Mailjet)", label: "Mailjet API Key" },
  { key: "mailjet_secret_key", env: "MAILJET_SECRET_KEY", secret: true, group: "Email (Mailjet)", label: "Mailjet Secret Key" },
  { key: "mailjet_from_email", env: "MAILJET_FROM_EMAIL", default: "support@novapaid.net", secret: false, group: "Email (Mailjet)", label: "Expéditeur — email" },
  { key: "mailjet_from_name", env: "MAILJET_FROM_NAME", default: "NovaPaid", secret: false, group: "Email (Mailjet)", label: "Expéditeur — nom" },
  { key: "mailjet_fallback_from_email", env: "MAILJET_FALLBACK_FROM_EMAIL", secret: false, group: "Email (Mailjet)", label: "Expéditeur de secours" },

  // SoleasPay
  { key: "soleaspay_webhook_token", env: "SOLEASPAY_WEBHOOK_TOKEN", secret: true, group: "SoleasPay", label: "Webhook Token" },
  { key: "soleaspay_gateway_token", env: "SOLEASPAY_GATEWAY_TOKEN", secret: true, group: "SoleasPay", label: "Gateway Token" },
  { key: "soleaspay_public_key", env: "NEXT_PUBLIC_SOLEASPAY_API_KEY", secret: false, public: true, group: "SoleasPay", label: "Clé publique (checkout navigateur)" },

  // BkPay
  { key: "bkpay_secret_key", env: "BKPAY_SECRET_KEY", secret: true, group: "BkPay", label: "Secret Key" },
  { key: "bkpay_public_key", env: "BKPAY_PUBLIC_KEY", secret: false, group: "BkPay", label: "Public Key" },

  // Contact (exposé au client)
  { key: "contact_email", default: "novapaid@novapaid.net", secret: false, public: true, group: "Contact", label: "Email de contact / support" },
  { key: "whatsapp_number", default: "237657887403", secret: false, public: true, group: "Contact", label: "Numéro WhatsApp (sans +, ex. 237…)" },

  // Général
  { key: "public_base_url", env: "PUBLIC_BASE_URL", secret: false, group: "Général", label: "URL publique HTTPS (callbacks/webhooks)" },
  { key: "site_url", env: "NEXT_PUBLIC_SITE_URL", default: "https://novapaid.net", secret: false, public: true, group: "Général", label: "URL du site" },
];

export const PUBLIC_CONFIG_KEYS = INTEGRATION_CONFIG.filter((f) => f.public).map((f) => f.key);
