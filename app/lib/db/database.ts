import { DatabaseSync } from "node:sqlite";
import { randomBytes, scryptSync } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { initialShopProducts, initialShopSections } from "../shop-catalog.ts";

let dbInstance: DatabaseSync | null = null;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../");
const configuredBootstrapEmail = process.env.NOVAPAID_BOOTSTRAP_ADMIN_EMAIL;
const configuredBootstrapPassword = process.env.NOVAPAID_BOOTSTRAP_ADMIN_PASSWORD;
try {
  process.loadEnvFile(path.join(projectRoot, ".env.admin.local"));
} catch {}
if (configuredBootstrapEmail !== undefined) process.env.NOVAPAID_BOOTSTRAP_ADMIN_EMAIL = configuredBootstrapEmail;
if (configuredBootstrapPassword !== undefined) process.env.NOVAPAID_BOOTSTRAP_ADMIN_PASSWORD = configuredBootstrapPassword;

function hashBootstrapPassword(password: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;
}

function getDbPath(): string {
  if (process.env.NOVAPAID_DB_PATH) return process.env.NOVAPAID_DB_PATH;
  try {
    if (typeof import.meta.url === "string" && import.meta.url.startsWith("file:")) {
      if (fs.existsSync(path.join(projectRoot, "package.json"))) {
        return path.join(projectRoot, "novapaid_app.db");
      }
    }
  } catch {}
  return path.resolve(process.cwd(), "novapaid_app.db");
}

export function getDatabase(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDbPath();
  const db = new DatabaseSync(dbPath);
  try {
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA synchronous = NORMAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    initSchemaAndSeeds(db);
    dbInstance = db;
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

function initSchemaAndSeeds(db: DatabaseSync) {
  const bootstrapEmail = (process.env.NOVAPAID_BOOTSTRAP_ADMIN_EMAIL || "service@novapaid.net").trim().toLowerCase();
  const bootstrapPassword = process.env.NOVAPAID_BOOTSTRAP_ADMIN_PASSWORD || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bootstrapEmail) || bootstrapEmail.length > 254) {
    throw new Error("L’adresse email administrateur initiale est invalide.");
  }
  if (bootstrapPassword.length > 200) throw new Error("Le mot de passe administrateur initial dépasse la longueur autorisée.");
  // ============================================================
  // TABLES UTILISATEURS (séparées des tables admin)
  // ============================================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      status TEXT NOT NULL DEFAULT 'active',
      state TEXT,
      profile_photo TEXT,
      date_of_birth TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      postal_code TEXT,
      email_verified_at TEXT,
      kyc_status TEXT NOT NULL DEFAULT 'not_started',
      kyc_data TEXT,
      risk_level TEXT NOT NULL DEFAULT 'low',
      tier_level INTEGER,
      mfa_secret TEXT,
      mfa_enabled INTEGER NOT NULL DEFAULT 0,
      pin_hash TEXT,
      pin_attempts INTEGER DEFAULT 0,
      pin_locked_until TEXT,
      referred_by INTEGER,
      is_reseller INTEGER NOT NULL DEFAULT 0,
      reseller_code TEXT UNIQUE,
      reseller_activated_at TEXT,
      pwa_installed_at TEXT,
      terms_accepted_at TEXT,
      terms_version TEXT,
      privacy_accepted_at TEXT,
      privacy_version TEXT,
      last_deposit_help_popup_shown_at TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_token TEXT NOT NULL UNIQUE,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS auth_rate_limits (
      bucket_hash TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 0,
      window_started INTEGER NOT NULL,
      blocked_until INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      request_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_key TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'XAF',
      account_type TEXT NOT NULL DEFAULT 'customer',
      label TEXT NOT NULL DEFAULT 'Compte principal',
      available_minor INTEGER NOT NULL DEFAULT 0,
      reserved_minor INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_order_id INTEGER UNIQUE,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL DEFAULT 'sandbox-card-provider',
      provider_card_ref TEXT UNIQUE,
      label TEXT NOT NULL,
      masked_pan TEXT NOT NULL DEFAULT '**** **** **** 1234',
      card_type TEXT NOT NULL DEFAULT 'virtual',
      network TEXT NOT NULL DEFAULT 'visa',
      status TEXT NOT NULL DEFAULT 'active',
      external_balance_minor INTEGER NOT NULL DEFAULT 0,
      expiry_month INTEGER NOT NULL DEFAULT 10,
      expiry_year INTEGER NOT NULL DEFAULT 29,
      synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS card_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_ref TEXT NOT NULL UNIQUE,
      idempotency_key TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      card_type TEXT NOT NULL DEFAULT 'virtual',
      network TEXT NOT NULL DEFAULT 'visa',
      price_minor INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'XAF',
      status TEXT NOT NULL DEFAULT 'pending',
      provider TEXT NOT NULL DEFAULT 'sandbox-card-provider',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS soleaspay_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_ref TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount_xaf INTEGER NOT NULL DEFAULT 0,
      amount_usd_minor INTEGER,
      card_id INTEGER,
      meta_json TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      transaction_reference TEXT,
      raw_payload TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS internet_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_ref TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL,
      plan_name TEXT NOT NULL DEFAULT '',
      amount_xaf INTEGER NOT NULL DEFAULT 0,
      phone TEXT NOT NULL DEFAULT '',
      operator TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    -- Full lifecycle of every internet (Geny) forfait purchase, recorded
    -- server-side with the buyer's identity, for admin tracking & reconciliation.
    CREATE TABLE IF NOT EXISTS geny_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_ref TEXT NOT NULL UNIQUE,
      user_id INTEGER,
      user_name TEXT NOT NULL DEFAULT '',
      user_email TEXT NOT NULL DEFAULT '',
      plan_id TEXT NOT NULL DEFAULT '',
      plan_name TEXT NOT NULL DEFAULT '',
      amount_xaf INTEGER NOT NULL DEFAULT 0,
      phone TEXT NOT NULL DEFAULT '',
      operator TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      code TEXT NOT NULL DEFAULT '',
      livemode INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
    CREATE INDEX IF NOT EXISTS idx_geny_orders_status ON geny_orders(status);
    CREATE INDEX IF NOT EXISTS idx_geny_orders_user ON geny_orders(user_id);

    CREATE TABLE IF NOT EXISTS beneficiaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      handle TEXT,
      recipient_user_id INTEGER,
      phone TEXT,
      email TEXT,
      avatar_color TEXT,
      initials TEXT,
      is_verified INTEGER NOT NULL DEFAULT 1,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      account_number TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS ledger_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_ref TEXT NOT NULL UNIQUE,
      idempotency_key TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'succeeded',
      currency TEXT NOT NULL DEFAULT 'XAF',
      amount_minor INTEGER NOT NULL,
      fee_minor INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL,
      created_by INTEGER NOT NULL,
      recipient_user_id INTEGER,
      related_ref TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      wallet_id INTEGER NOT NULL,
      direction TEXT NOT NULL,
      amount_minor INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES ledger_transactions (id),
      FOREIGN KEY (wallet_id) REFERENCES wallets (id)
    );

    CREATE TABLE IF NOT EXISTS funding_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_ref TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      payer_phone TEXT,
      provider_reference TEXT UNIQUE,
      idempotency_key TEXT NOT NULL UNIQUE,
      amount_minor INTEGER NOT NULL,
      fee_minor INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'XAF',
      status TEXT NOT NULL DEFAULT 'succeeded',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS withdrawal_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_ref TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      beneficiary_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      provider_reference TEXT UNIQUE,
      idempotency_key TEXT NOT NULL UNIQUE,
      amount_minor INTEGER NOT NULL,
      fee_minor INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'XAF',
      status TEXT NOT NULL DEFAULT 'succeeded',
      risk_decision TEXT NOT NULL DEFAULT 'sandbox_review',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries (id)
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_ref TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      transaction_ref TEXT,
      category TEXT NOT NULL DEFAULT 'support',
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      assigned_to INTEGER,
      resolution TEXT,
      priority TEXT NOT NULL DEFAULT 'normal',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS support_ticket_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      sender_type TEXT NOT NULL,
      sender_id INTEGER NOT NULL,
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      is_internal INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES support_tickets (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS kyc_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_ref TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL DEFAULT 'manual-review',
      provider_reference TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      decision_reason TEXT,
      document_type TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TEXT,
      reviewed_by INTEGER,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS customer_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_name TEXT NOT NULL,
      author_location TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 5,
      service_tag TEXT NOT NULL DEFAULT 'Général',
      review_text TEXT NOT NULL,
      is_verified INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'approved',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      action_url TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS card_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'purchase',
      amount_minor INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      description TEXT NOT NULL DEFAULT '',
      merchant TEXT,
      merchant_city TEXT,
      reference TEXT,
      message TEXT,
      transaction_date TEXT,
      metadata TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      external_ref TEXT,
      balance_before INTEGER,
      balance_after INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES cards (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    -- ============================================================
    -- TABLES AUTH & SÉCURITÉ (PrismCard parity)
    -- ============================================================

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'registration',
      channel TEXT NOT NULL DEFAULT 'email',
      used INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS card_verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      card_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trusted_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      device_fingerprint TEXT NOT NULL,
      device_name TEXT,
      browser TEXT,
      os TEXT,
      ip_address TEXT,
      last_used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS webauthn_credentials (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL DEFAULT 'Biometrie',
      credential_source TEXT NOT NULL,
      sign_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pending_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      verification_code TEXT NOT NULL,
      referral_code TEXT,
      country TEXT,
      ip_address TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS login_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      method TEXT NOT NULL DEFAULT 'password',
      ip_address TEXT,
      user_agent TEXT,
      device_name TEXT,
      browser TEXT,
      os TEXT,
      country TEXT,
      status TEXT NOT NULL DEFAULT 'success',
      failure_reason TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    -- ============================================================
    -- TABLES FRAIS & TAUX (PrismCard parity)
    -- ============================================================

    CREATE TABLE IF NOT EXISTS card_fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'creation',
      currency TEXT NOT NULL DEFAULT 'XAF',
      fixed_amount REAL NOT NULL DEFAULT 0,
      percentage REAL NOT NULL DEFAULT 0,
      min_charge REAL NOT NULL DEFAULT 0,
      max_charge REAL,
      is_active INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS card_reload_fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fixed_amount REAL NOT NULL DEFAULT 0,
      percentage_rate REAL NOT NULL DEFAULT 0,
      min_amount REAL NOT NULL DEFAULT 0,
      max_amount REAL,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_modified_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (last_modified_by) REFERENCES admins (id)
    );

    CREATE TABLE IF NOT EXISTS card_withdrawal_fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fixed_amount REAL NOT NULL DEFAULT 0,
      percentage_rate REAL NOT NULL DEFAULT 0,
      min_amount REAL NOT NULL DEFAULT 0,
      max_amount REAL,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_modified_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (last_modified_by) REFERENCES admins (id)
    );

    CREATE TABLE IF NOT EXISTS transfer_fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fixed_amount REAL NOT NULL DEFAULT 0,
      percentage_rate REAL NOT NULL DEFAULT 0,
      min_amount REAL NOT NULL DEFAULT 0,
      max_amount REAL,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_modified_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (last_modified_by) REFERENCES admins (id)
    );

    CREATE TABLE IF NOT EXISTS cross_border_fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_transaction_id INTEGER UNIQUE,
      user_id INTEGER NOT NULL,
      card_id INTEGER NOT NULL,
      reason TEXT,
      fee REAL NOT NULL DEFAULT 0,
      channel TEXT,
      is_paid INTEGER NOT NULL DEFAULT 0,
      decline_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (card_id) REFERENCES cards (id)
    );

    CREATE TABLE IF NOT EXISTS decline_fee_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_transaction_id INTEGER UNIQUE,
      user_id INTEGER NOT NULL,
      card_id INTEGER NOT NULL,
      reason TEXT,
      fee REAL NOT NULL DEFAULT 0,
      channel TEXT,
      is_paid INTEGER NOT NULL DEFAULT 0,
      decline_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (card_id) REFERENCES cards (id)
    );

    CREATE TABLE IF NOT EXISTS exchange_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      fee_percentage REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (from_currency, to_currency)
    );

    -- ============================================================
    -- TABLES PROVIDERS DE PAIEMENT DYNAMIQUES (PrismCard parity)
    -- ============================================================

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      key_name TEXT NOT NULL DEFAULT '',
      api_key TEXT,
      api_secret TEXT,
      is_live INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_test INTEGER NOT NULL DEFAULT 0,
      additional_config TEXT,
      config TEXT,
      description TEXT,
      logo TEXT,
      shop_name TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      payment_type TEXT,
      allowed_countries TEXT,
      marketplace_enabled INTEGER NOT NULL DEFAULT 0,
      shop_enabled INTEGER NOT NULL DEFAULT 0,
      is_recommended INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);

    -- ============================================================
    -- TABLES PARAMÈTRES UTILISATEUR (PrismCard parity)
    -- ============================================================

    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      currency TEXT NOT NULL DEFAULT 'XAF',
      notification_email INTEGER NOT NULL DEFAULT 1,
      notification_push INTEGER NOT NULL DEFAULT 1,
      two_factor_auth INTEGER NOT NULL DEFAULT 0,
      dark_mode INTEGER NOT NULL DEFAULT 0,
      language TEXT NOT NULL DEFAULT 'fr',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      preference_key TEXT NOT NULL,
      preference_value TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, preference_key),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    -- ============================================================
    -- TABLES VÉRIFICATION D'IDENTITÉ (PrismCard parity)
    -- ============================================================

    CREATE TABLE IF NOT EXISTS identity_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      api_environment TEXT NOT NULL DEFAULT 'production',
      document_type TEXT NOT NULL DEFAULT 'id_card',
      front_image TEXT,
      back_image TEXT,
      selfie_image TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      decision_reason TEXT,
      decided_by INTEGER,
      submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (decided_by) REFERENCES admins (id)
    );

    -- ============================================================
    -- TABLES EMAIL & COMMUNICATION (PrismCard parity)
    -- ============================================================

    CREATE TABLE IF NOT EXISTS email_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mail_mailer TEXT NOT NULL DEFAULT 'smtp',
      mail_host TEXT,
      mail_port INTEGER NOT NULL DEFAULT 587,
      mail_username TEXT,
      mail_password TEXT,
      mail_encryption TEXT DEFAULT 'tls',
      mail_from_address TEXT,
      mail_from_name TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS email_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      total_recipients INTEGER NOT NULL DEFAULT 0,
      sent_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      daily_sent_count INTEGER NOT NULL DEFAULT 0,
      scheduled_for TEXT,
      last_sent_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS email_campaign_recipients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_campaign_id INTEGER NOT NULL,
      user_id INTEGER,
      email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      sent_at TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (email_campaign_id) REFERENCES email_campaigns (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS push_announcement_recipients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      push_announcement_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      delivered_at TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (push_announcement_id) REFERENCES push_announcements (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    -- ============================================================
    -- TABLES LANDING PAGE CMS (PrismCard parity)
    -- ============================================================

    CREATE TABLE IF NOT EXISTS landing_page_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_name TEXT NOT NULL DEFAULT 'NovaPaid',
      site_logo TEXT,
      favicon TEXT,
      hero_title TEXT NOT NULL DEFAULT 'La finance digitale, simplifiée.',
      hero_subtitle TEXT,
      hero_image TEXT,
      hero_cta_text TEXT DEFAULT 'Commencer',
      hero_cta_url TEXT DEFAULT '/register',
      stats_json TEXT,
      features_json TEXT,
      testimonials_json TEXT,
      pricing_json TEXT,
      faq_json TEXT,
      cta_title TEXT,
      cta_subtitle TEXT,
      cta_button_text TEXT,
      cta_button_url TEXT,
      footer_text TEXT,
      footer_links_json TEXT,
      social_links_json TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      contact_address TEXT,
      seo_title TEXT,
      seo_description TEXT,
      seo_keywords TEXT,
      seo_og_image TEXT,
      font_heading TEXT DEFAULT 'Poppins',
      font_body TEXT DEFAULT 'Poppins',
      primary_color TEXT DEFAULT '#6366f1',
      secondary_color TEXT DEFAULT '#8b5cf6',
      marketplace_overlay_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- ============================================================
    -- TABLES MARKETPLACE (PrismCard parity)
    -- ============================================================

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES admins (id)
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      parent_article_id INTEGER,
      plan_name TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      plan_description TEXT,
      price REAL NOT NULL DEFAULT 0,
      image TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      offer_is_active INTEGER NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 0,
      quantity_remaining INTEGER NOT NULL DEFAULT 0,
      categorie_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (parent_article_id) REFERENCES articles (id) ON DELETE SET NULL,
      FOREIGN KEY (categorie_id) REFERENCES categories (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS commandes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      api_environment TEXT NOT NULL DEFAULT 'production',
      article_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      article_title_snapshot TEXT,
      plan_name_snapshot TEXT,
      stock_reserved_at TEXT,
      stock_consumed_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      response TEXT,
      note TEXT,
      payment_method TEXT,
      wallet_amount REAL NOT NULL DEFAULT 0,
      external_provider TEXT,
      external_amount REAL NOT NULL DEFAULT 0,
      external_checkout_amount REAL,
      external_checkout_currency TEXT,
      external_order_id TEXT,
      external_payment_id TEXT,
      external_payment_status TEXT,
      soleaspay_data TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (article_id) REFERENCES articles (id)
    );

    CREATE TABLE IF NOT EXISTS comentaire_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      article_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      rating INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comentaire_commandes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      commande_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (commande_id) REFERENCES commandes (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS commande_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commande_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'XAF',
      reference TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      provider TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (commande_id) REFERENCES commandes (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS category_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      field_name TEXT NOT NULL,
      field_type TEXT NOT NULL DEFAULT 'text',
      field_label TEXT NOT NULL,
      is_required INTEGER NOT NULL DEFAULT 0,
      options TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS category_field_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_field_id INTEGER NOT NULL,
      commande_id INTEGER NOT NULL,
      field_value TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_field_id) REFERENCES category_fields (id) ON DELETE CASCADE,
      FOREIGN KEY (commande_id) REFERENCES commandes (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS view_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      article_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
      FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE
    );

    -- ============================================================
    -- TABLES BOUTIQUES UTILISATEUR (PrismCard parity)
    -- ============================================================

    CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      logo TEXT,
      banner TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      is_verified INTEGER NOT NULL DEFAULT 0,
      commission_rate REAL NOT NULL DEFAULT 5.0,
      settings TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      rejection_reason TEXT,
      approved_at TEXT,
      approved_by INTEGER,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (approved_by) REFERENCES admins (id)
    );

    CREATE TABLE IF NOT EXISTS user_shop_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      product_type TEXT NOT NULL DEFAULT 'physical',
      digital_file TEXT,
      digital_file_name TEXT,
      digital_link TEXT,
      digital_link_instructions TEXT,
      credential_format TEXT,
      price REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'XAF',
      image TEXT,
      images TEXT,
      stock INTEGER,
      stock_alert INTEGER,
      unlimited_stock INTEGER NOT NULL DEFAULT 0,
      sku TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_featured INTEGER NOT NULL DEFAULT 0,
      auto_deliver INTEGER NOT NULL DEFAULT 0,
      metadata TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (shop_id, slug),
      FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shop_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT NOT NULL UNIQUE,
      shop_id INTEGER NOT NULL,
      buyer_id INTEGER,
      api_environment TEXT NOT NULL DEFAULT 'production',
      guest_email TEXT,
      guest_name TEXT,
      guest_phone TEXT,
      guest_token TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      commission_amount REAL NOT NULL DEFAULT 0,
      seller_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'XAF',
      status TEXT NOT NULL DEFAULT 'pending',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT,
      payment_reference TEXT,
      wallet_amount REAL NOT NULL DEFAULT 0,
      external_provider TEXT,
      external_amount REAL NOT NULL DEFAULT 0,
      external_order_id TEXT,
      external_payment_id TEXT,
      external_payment_status TEXT,
      metadata TEXT,
      paid_at TEXT,
      completed_at TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shop_id) REFERENCES shops (id),
      FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS shop_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      product_slug TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shop_order_id) REFERENCES shop_orders (id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES user_shop_products (id)
    );

    CREATE TABLE IF NOT EXISTS product_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_product_id INTEGER NOT NULL,
      credential_data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      assigned_to_order INTEGER,
      assigned_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shop_product_id) REFERENCES user_shop_products (id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to_order) REFERENCES shop_order_items (id) ON DELETE SET NULL
    );

    -- ============================================================
    -- TABLES ACTIVITÉ & LOGS (PrismCard parity)
    -- ============================================================

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      method TEXT,
      url TEXT,
      country TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    -- ============================================================
    -- TABLES PAIEMENT MANUEL (PrismCard parity)
    -- ============================================================

    CREATE TABLE IF NOT EXISTS manual_payment_apis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      logo TEXT,
      instructions TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS manual_payment_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manual_payment_api_id INTEGER NOT NULL,
      field_name TEXT NOT NULL,
      field_label TEXT NOT NULL,
      field_type TEXT NOT NULL DEFAULT 'text',
      is_required INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manual_payment_api_id) REFERENCES manual_payment_apis (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS manual_payment_api_amounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manual_payment_api_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'XAF',
      label TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manual_payment_api_id) REFERENCES manual_payment_apis (id) ON DELETE CASCADE
    );

    -- ============================================================
    -- TABLES RESELLER AVANCÉ (PrismCard parity)
    -- ============================================================

    CREATE TABLE IF NOT EXISTS reseller_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan TEXT NOT NULL DEFAULT 'monthly',
      status TEXT NOT NULL DEFAULT 'active',
      starts_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      cancelled_at TEXT,
      payment_reference TEXT,
      amount_paid REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'XAF',
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reseller_commission_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_type TEXT NOT NULL,
      rate REAL NOT NULL DEFAULT 5.0,
      min_amount REAL NOT NULL DEFAULT 0,
      max_amount REAL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reseller_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_type TEXT NOT NULL,
      rate REAL NOT NULL,
      reason TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES admins (id)
    );

    CREATE TABLE IF NOT EXISTS reseller_link_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reseller_id INTEGER NOT NULL,
      referral_code TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      converted INTEGER NOT NULL DEFAULT 0,
      converted_user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reseller_id) REFERENCES users (id),
      FOREIGN KEY (converted_user_id) REFERENCES users (id)
    );

    -- ============================================================
    -- TABLES WEBHOOK RELAY (PrismCard parity)
    -- ============================================================

    CREATE TABLE IF NOT EXISTS webhook_relays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_key_id INTEGER,
      name TEXT NOT NULL,
      public_id TEXT NOT NULL UNIQUE,
      token TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (api_key_id) REFERENCES api_keys (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS webhook_destinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      webhook_relay_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      secret TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (webhook_relay_id) REFERENCES webhook_relays (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      webhook_relay_id INTEGER NOT NULL,
      event_type TEXT,
      payload TEXT NOT NULL,
      source_ip TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (webhook_relay_id) REFERENCES webhook_relays (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      webhook_event_id INTEGER NOT NULL,
      webhook_destination_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TEXT,
      response_code INTEGER,
      response_body TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (webhook_event_id) REFERENCES webhook_events (id) ON DELETE CASCADE,
      FOREIGN KEY (webhook_destination_id) REFERENCES webhook_destinations (id) ON DELETE CASCADE
    );

    -- ============================================================
    -- TABLES CARD PROVIDER (PrismCard parity)
    -- ============================================================

    CREATE TABLE IF NOT EXISTS card_issuing_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      active_provider TEXT NOT NULL DEFAULT 'sandbox',
      maplerad_environment TEXT NOT NULL DEFAULT 'sandbox',
      ziiropay_environment TEXT NOT NULL DEFAULT 'sandbox',
      max_cards_per_user INTEGER NOT NULL DEFAULT 3,
      card_creation_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS card_provider_customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      provider_customer_id TEXT NOT NULL,
      environment TEXT NOT NULL DEFAULT 'sandbox',
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, provider, environment),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS card_termination_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      reason TEXT,
      refund_amount REAL,
      refund_reference TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES cards (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS card_sync_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL,
      last_sync_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'idle',
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE
    );

    -- Comptes bancaires virtuels fournis par un prestataire (Maplerad, etc.)
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL DEFAULT 'maplerad',
      environment TEXT NOT NULL DEFAULT 'sandbox',
      provider_account_id TEXT,
      provider_reference TEXT,
      currency TEXT NOT NULL DEFAULT 'USD',
      account_number TEXT,
      account_name TEXT,
      bank_name TEXT,
      routing_number TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      failure_reason TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    -- ============================================================
    -- TABLES SUPPORT AVANCÉ (PrismCard parity)
    -- ============================================================

    CREATE TABLE IF NOT EXISTS support_widget_integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      public_key TEXT NOT NULL UNIQUE,
      domain TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      settings TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- ============================================================
    -- TABLES RETRAIT (PrismCard parity)
    -- ============================================================

    CREATE TABLE IF NOT EXISTS withdrawal_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'CM',
      operator TEXT,
      logo TEXT,
      min_amount REAL NOT NULL DEFAULT 500,
      max_amount REAL NOT NULL DEFAULT 500000,
      fee_fixed REAL NOT NULL DEFAULT 0,
      fee_percentage REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS withdrawal_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_currency TEXT NOT NULL DEFAULT 'USD',
      to_currency TEXT NOT NULL DEFAULT 'XAF',
      rate REAL NOT NULL,
      fee_percentage REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (from_currency, to_currency)
    );

    CREATE TABLE IF NOT EXISTS withdrawal_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      withdrawals_enabled INTEGER NOT NULL DEFAULT 1,
      min_withdrawal REAL NOT NULL DEFAULT 500,
      max_withdrawal REAL NOT NULL DEFAULT 500000,
      daily_limit REAL NOT NULL DEFAULT 1000000,
      requires_kyc INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- ============================================================
    -- TABLE MARKETING (PrismCard parity)
    -- ============================================================

    CREATE TABLE IF NOT EXISTS marketing_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facebook_pixel_id TEXT,
      google_analytics_id TEXT,
      google_tag_manager_id TEXT,
      tiktok_pixel_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS marketplace_product_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      budget REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_response TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS deposit_help_popup_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT 'Besoin d''aide pour déposer?',
      message TEXT,
      video_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      show_after_seconds INTEGER NOT NULL DEFAULT 30,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ============================================================
  // TABLES ADMINISTRATEURS (séparées des tables utilisateurs)
  // ============================================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'super_admin',
      password_hash TEXT NOT NULL DEFAULT '',
      permissions TEXT NOT NULL DEFAULT 'all',
      status TEXT NOT NULL DEFAULT 'active',
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      session_token TEXT NOT NULL UNIQUE,
      ip_address TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES admins (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_ref TEXT NOT NULL UNIQUE,
      requested_by INTEGER NOT NULL,
      approved_by INTEGER,
      action_type TEXT NOT NULL,
      target_ref TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      decided_at TEXT,
      FOREIGN KEY (requested_by) REFERENCES users (id),
      FOREIGN KEY (approved_by) REFERENCES admins (id)
    );

    CREATE TABLE IF NOT EXISTS admin_transaction_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'open',
      note TEXT,
      opened_by INTEGER NOT NULL,
      resolved_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES ledger_transactions (id),
      FOREIGN KEY (opened_by) REFERENCES admins (id),
      FOREIGN KEY (resolved_by) REFERENCES admins (id)
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      role TEXT,
      action TEXT NOT NULL,
      target TEXT,
      reason TEXT,
      details TEXT,
      request_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES admins (id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_by INTEGER,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (updated_by) REFERENCES admins (id)
    );

    CREATE TABLE IF NOT EXISTS shop_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT 'shopping-bag',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_by INTEGER,
      updated_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES admins (id) ON DELETE SET NULL,
      FOREIGN KEY (updated_by) REFERENCES admins (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS shop_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id INTEGER NOT NULL,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      badge TEXT NOT NULL DEFAULT '',
      customer_label TEXT NOT NULL DEFAULT 'Identifiant du compte',
      requires_password INTEGER NOT NULL DEFAULT 0 CHECK (requires_password IN (0, 1)),
      offers_json TEXT NOT NULL DEFAULT '[]',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_by INTEGER,
      updated_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (section_id, slug),
      FOREIGN KEY (section_id) REFERENCES shop_sections (id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES admins (id) ON DELETE SET NULL,
      FOREIGN KEY (updated_by) REFERENCES admins (id) ON DELETE SET NULL
    );
  `);

  // Migrations non destructives pour les bases SQLite déjà créées.
  // Migrations non destructives – colonnes existantes
  ensureColumn(db, "users", "role", "TEXT NOT NULL DEFAULT 'customer'");
  ensureColumn(db, "admins", "password_hash", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "cards", "network", "TEXT NOT NULL DEFAULT 'visa'");
  ensureColumn(db, "cards", "expiry_month", "INTEGER NOT NULL DEFAULT 10");
  ensureColumn(db, "cards", "expiry_year", "INTEGER NOT NULL DEFAULT 29");
  ensureColumn(db, "cards", "updated_at", "TEXT");
  ensureColumn(db, "card_orders", "network", "TEXT NOT NULL DEFAULT 'visa'");
  ensureColumn(db, "support_tickets", "priority", "TEXT NOT NULL DEFAULT 'normal'");
  ensureColumn(db, "funding_orders", "payer_phone", "TEXT");
  ensureColumn(db, "kyc_cases", "document_type", "TEXT");
  ensureColumn(db, "wallets", "reserved_minor", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "users", "pin_hash", "TEXT");
  ensureColumn(db, "users", "referred_by", "INTEGER");

  // Migrations Phase 1 – nouvelles colonnes PrismCard parity
  ensureColumn(db, "users", "first_name", "TEXT");
  ensureColumn(db, "users", "last_name", "TEXT");
  ensureColumn(db, "users", "profile_photo", "TEXT");
  ensureColumn(db, "users", "date_of_birth", "TEXT");
  ensureColumn(db, "users", "address", "TEXT");
  ensureColumn(db, "users", "city", "TEXT");
  ensureColumn(db, "users", "country", "TEXT");
  ensureColumn(db, "users", "postal_code", "TEXT");
  ensureColumn(db, "users", "state", "TEXT");
  ensureColumn(db, "users", "kyc_data", "TEXT");
  ensureColumn(db, "users", "tier_level", "INTEGER");
  ensureColumn(db, "users", "pin_attempts", "INTEGER DEFAULT 0");
  ensureColumn(db, "users", "pin_locked_until", "TEXT");
  ensureColumn(db, "users", "is_reseller", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "users", "reseller_code", "TEXT");
  ensureColumn(db, "users", "reseller_activated_at", "TEXT");
  ensureColumn(db, "users", "pwa_installed_at", "TEXT");
  ensureColumn(db, "users", "terms_accepted_at", "TEXT");
  ensureColumn(db, "users", "terms_version", "TEXT");
  ensureColumn(db, "users", "privacy_accepted_at", "TEXT");
  ensureColumn(db, "users", "privacy_version", "TEXT");
  ensureColumn(db, "users", "deleted_at", "TEXT");
  ensureColumn(db, "users", "last_deposit_help_popup_shown_at", "TEXT");

  // Cards – colonnes enrichies PrismCard parity
  ensureColumn(db, "cards", "maplerad_id", "TEXT");
  ensureColumn(db, "cards", "card_holder", "TEXT");
  ensureColumn(db, "cards", "is_frozen", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "cards", "freeze_reason", "TEXT");
  ensureColumn(db, "cards", "is_visible", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn(db, "cards", "billing_name", "TEXT");
  ensureColumn(db, "cards", "billing_address", "TEXT");
  ensureColumn(db, "cards", "billing_city", "TEXT");
  ensureColumn(db, "cards", "billing_state", "TEXT");
  ensureColumn(db, "cards", "billing_postal_code", "TEXT");
  ensureColumn(db, "cards", "billing_country", "TEXT");
  ensureColumn(db, "cards", "metadata", "TEXT");
  ensureColumn(db, "cards", "api_environment", "TEXT NOT NULL DEFAULT 'production'");

  // Card transactions – colonnes enrichies
  ensureColumn(db, "card_transactions", "merchant_city", "TEXT");
  ensureColumn(db, "card_transactions", "reference", "TEXT");
  ensureColumn(db, "card_transactions", "message", "TEXT");
  ensureColumn(db, "card_transactions", "transaction_date", "TEXT");
  ensureColumn(db, "card_transactions", "metadata", "TEXT");
  ensureColumn(db, "card_transactions", "balance_before", "INTEGER");
  ensureColumn(db, "card_transactions", "balance_after", "INTEGER");

  // Wallet transactions – colonnes enrichies
  ensureColumn(db, "funding_orders", "payment_provider", "TEXT");
  ensureColumn(db, "funding_orders", "payment_reference", "TEXT");
  ensureColumn(db, "funding_orders", "metadata", "TEXT");
  ensureColumn(db, "funding_orders", "balance_before", "INTEGER");
  ensureColumn(db, "funding_orders", "balance_after", "INTEGER");

  // Support tickets – colonnes enrichies
  ensureColumn(db, "support_tickets", "support_widget_integration_id", "INTEGER");
  ensureColumn(db, "support_tickets", "external_visitor_key", "TEXT");
  ensureColumn(db, "support_tickets", "external_visitor_name", "TEXT");
  ensureColumn(db, "support_tickets", "external_visitor_email", "TEXT");
  ensureColumn(db, "support_tickets", "ticket_number", "TEXT");
  ensureColumn(db, "support_tickets", "origin_url", "TEXT");
  ensureColumn(db, "support_tickets", "last_activity_at", "TEXT");
  ensureColumn(db, "support_tickets", "closed_at", "TEXT");

  // Support messages – colonnes enrichies
  ensureColumn(db, "support_ticket_messages", "attachments", "TEXT");
  ensureColumn(db, "support_ticket_messages", "reactions", "TEXT");
  db.prepare("DELETE FROM app_settings WHERE setting_key = 'admin_master_pin'").run();
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, expires_at);
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id, expires_at);
    CREATE INDEX IF NOT EXISTS idx_ledger_user_created ON ledger_transactions(created_by, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ledger_entries_wallet_tx ON ledger_entries(wallet_id, transaction_id);
    CREATE INDEX IF NOT EXISTS idx_funding_orders_user_status ON funding_orders(user_id, status, id DESC);
    CREATE INDEX IF NOT EXISTS idx_withdrawal_orders_user_status ON withdrawal_orders(user_id, status, id DESC);
    CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_recipient ON beneficiaries(user_id, recipient_user_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_status_updated ON support_tickets(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity_logs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_shop_sections_visible_order ON shop_sections(is_active, sort_order, id);
    CREATE INDEX IF NOT EXISTS idx_shop_products_section_visible_order ON shop_products(section_id, is_active, sort_order, id);
    CREATE INDEX IF NOT EXISTS idx_card_transactions_card_user ON card_transactions(card_id, user_id, created_at DESC);

    -- Phase 1 indexes
    CREATE INDEX IF NOT EXISTS idx_password_reset_email ON password_reset_tokens(email);
    CREATE INDEX IF NOT EXISTS idx_verification_codes_user ON verification_codes(user_id, type, used);
    CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);
    CREATE INDEX IF NOT EXISTS idx_webauthn_user ON webauthn_credentials(user_id);
    CREATE INDEX IF NOT EXISTS idx_pending_reg_email ON pending_registrations(email, expires_at);
    CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_card_fees_type ON card_fees(type, is_active);
    CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair ON exchange_rates(from_currency, to_currency, is_active);
    CREATE INDEX IF NOT EXISTS idx_identity_verif_user ON identity_verifications(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
    CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
    CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(categorie_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_commandes_user ON commandes(user_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_commandes_article ON commandes(article_id);
    CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug);
    CREATE INDEX IF NOT EXISTS idx_shops_user ON shops(user_id);
    CREATE INDEX IF NOT EXISTS idx_shop_orders_shop ON shop_orders(shop_id, status);
    CREATE INDEX IF NOT EXISTS idx_shop_orders_buyer ON shop_orders(buyer_id);
    CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activities_action ON activities(action, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_webhook_relays_public ON webhook_relays(public_id);
    CREATE INDEX IF NOT EXISTS idx_webhook_events_relay ON webhook_events(webhook_relay_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reseller_subs_user ON reseller_subscriptions(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_reseller_clicks ON reseller_link_clicks(reseller_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_withdrawal_methods_active ON withdrawal_methods(is_active, display_order);
    CREATE INDEX IF NOT EXISTS idx_card_provider_customers ON card_provider_customers(user_id, provider);
    CREATE INDEX IF NOT EXISTS idx_manual_payment_apis_active ON manual_payment_apis(is_active, display_order);

    CREATE TABLE IF NOT EXISTS resellers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      referral_code TEXT NOT NULL UNIQUE,
      commission_rate REAL NOT NULL DEFAULT 5.0,
      status TEXT NOT NULL DEFAULT 'active',
      subscription_status TEXT NOT NULL DEFAULT 'active',
      total_earned_minor INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS reseller_commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reseller_id INTEGER NOT NULL,
      referred_user_id INTEGER NOT NULL,
      order_type TEXT NOT NULL,
      order_ref TEXT NOT NULL,
      amount_minor INTEGER NOT NULL,
      commission_minor INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'paid',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reseller_id) REFERENCES resellers (user_id),
      FOREIGN KEY (referred_user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS push_announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      target_audience TEXT NOT NULL DEFAULT 'all',
      status TEXT NOT NULL DEFAULT 'sent',
      sent_count INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES admins (id)
    );

    CREATE TABLE IF NOT EXISTS promotional_ads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      link_url TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_resellers_code ON resellers(referral_code);
    CREATE INDEX IF NOT EXISTS idx_reseller_commissions_reseller ON reseller_commissions(reseller_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_push_announcements_created ON push_announcements(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_promotional_ads_active ON promotional_ads(is_active, sort_order);

    -- ============================================================
    -- PHASE 7 — COMMUNICATION
    -- ============================================================

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth_key TEXT NOT NULL,
      device_name TEXT,
      browser TEXT,
      os TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS support_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      sender_type TEXT NOT NULL DEFAULT 'user',
      sender_id INTEGER,
      content TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'text',
      attachment_url TEXT,
      attachment_name TEXT,
      attachment_size INTEGER,
      attachment_mime TEXT,
      reply_to_id INTEGER,
      reactions TEXT,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_edited INTEGER NOT NULL DEFAULT 0,
      edited_at TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES support_tickets (id) ON DELETE CASCADE,
      FOREIGN KEY (reply_to_id) REFERENCES support_messages (id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

    -- ============================================================
    -- PHASE 8 — FONCTIONNALITÉS SUPPLÉMENTAIRES
    -- ============================================================

    CREATE TABLE IF NOT EXISTS help_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL DEFAULT 'general',
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      excerpt TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      views INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS revenue_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      amount_minor INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'XAF',
      reference_id INTEGER,
      reference_type TEXT,
      description TEXT,
      recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_revenue_records_date ON revenue_records(recorded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON help_articles(slug);
    CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id, created_at DESC);
  `);

  // Promotional ads – colonnes enrichies PrismCard parity.
  // Doit s'exécuter après le CREATE TABLE ci-dessus : sur une base neuve,
  // ALTER TABLE échouait ("no such table") et stoppait l'initialisation.
  ensureColumn(db, "promotional_ads", "content", "TEXT");
  ensureColumn(db, "promotional_ads", "type", "TEXT");
  ensureColumn(db, "promotional_ads", "button_text", "TEXT");
  ensureColumn(db, "promotional_ads", "button_url", "TEXT");
  ensureColumn(db, "promotional_ads", "button_external", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "promotional_ads", "background_color", "TEXT");
  ensureColumn(db, "promotional_ads", "text_color", "TEXT");
  ensureColumn(db, "promotional_ads", "background_image", "TEXT");
  ensureColumn(db, "promotional_ads", "start_date", "TEXT");
  ensureColumn(db, "promotional_ads", "end_date", "TEXT");
  ensureColumn(db, "promotional_ads", "click_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "promotional_ads", "created_by_id", "INTEGER");
  ensureColumn(db, "promotional_ads", "updated_by_id", "INTEGER");

  const insertSection = db.prepare(`
    INSERT OR IGNORE INTO shop_sections (slug, name, description, icon, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const section of initialShopSections) {
    insertSection.run(section.slug, section.name, section.description, section.icon, section.sortOrder);
  }
  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO shop_products (
      section_id, slug, name, subtitle, description, image_url, badge,
      customer_label, requires_password, offers_json, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const product of initialShopProducts) {
    const section = db.prepare("SELECT id FROM shop_sections WHERE slug = ?").get(product.sectionSlug) as { id?: number } | undefined;
    if (!section?.id) continue;
    insertProduct.run(
      section.id,
      product.slug,
      product.name,
      product.subtitle,
      product.description,
      product.imageUrl,
      product.badge,
      product.customerLabel,
      product.requiresPassword ? 1 : 0,
      JSON.stringify(product.offers),
      product.sortOrder,
    );
  }
  const refreshUntouchedSeedProduct = db.prepare(`
    UPDATE shop_products SET name = ?, subtitle = ?, description = ?, image_url = ?, badge = ?,
      customer_label = ?, requires_password = ?, offers_json = ?, sort_order = ?
    WHERE section_id = ? AND slug = ? AND created_by IS NULL AND updated_by IS NULL
  `);
  for (const product of initialShopProducts) {
    const section = db.prepare("SELECT id FROM shop_sections WHERE slug = ?").get(product.sectionSlug) as { id?: number } | undefined;
    if (section?.id) {
      refreshUntouchedSeedProduct.run(
        product.name,
        product.subtitle,
        product.description,
        product.imageUrl,
        product.badge,
        product.customerLabel,
        product.requiresPassword ? 1 : 0,
        JSON.stringify(product.offers),
        product.sortOrder,
        section.id,
        product.slug,
      );
    }
  }
  const deleteUnusedSeedProduct = db.prepare("DELETE FROM shop_products WHERE id = ? AND created_by IS NULL AND updated_by IS NULL");
  for (const section of initialShopSections) {
    const sectionRow = db.prepare("SELECT id FROM shop_sections WHERE slug = ?").get(section.slug) as { id?: number } | undefined;
    if (!sectionRow?.id) continue;
    const currentSeedSlugs = new Set(initialShopProducts.filter((product) => product.sectionSlug === section.slug).map((product) => product.slug));
    const uneditedProducts = db.prepare("SELECT id, slug FROM shop_products WHERE section_id = ? AND created_by IS NULL AND updated_by IS NULL").all(sectionRow.id) as Array<{ id: number; slug: string }>;
    for (const product of uneditedProducts) {
      if (!currentSeedSlugs.has(product.slug)) deleteUnusedSeedProduct.run(product.id);
    }
  }

  // Initialisation minimale : aucune activité, identité ou opération fictive.
  const adminCount = (db.prepare("SELECT count(*) as count FROM admins").get() as any)?.count || 0;
  if (adminCount === 0) {
    db.prepare(`
      INSERT INTO admins (id, name, email, phone, role, password_hash, permissions, status)
      VALUES (1, 'Service NovaPaid', ?, NULL, 'super_admin', '', 'all', 'suspended')
    `).run(bootstrapEmail);
  }

  const settingsCount = (db.prepare("SELECT count(*) as count FROM app_settings").get() as any)?.count || 0;
  if (settingsCount === 0) {
    const bootstrapAdminId = Number((db.prepare("SELECT id FROM admins WHERE role = 'super_admin' ORDER BY id LIMIT 1").get() as any)?.id || 1);
    const setStmt = db.prepare(`
      INSERT INTO app_settings (setting_key, setting_value, version, updated_by)
      VALUES (?, ?, 1, ?)
    `);
    setStmt.run('exchange_rate_usd_xaf', JSON.stringify({ rate: 610.0, currency: 'XAF' }), bootstrapAdminId);
    setStmt.run('daily_transfer_limit_level2', JSON.stringify({ limitXaf: 500000 }), bootstrapAdminId);
    setStmt.run('mobile_money_fee_percent', JSON.stringify({ orange: 1.0, mtn: 1.0, wave: 1.0, card: 1.0, bank: 1.0 }), bootstrapAdminId);
    setStmt.run('platform_maintenance_mode', JSON.stringify({ enabled: false, message: '' }), bootstrapAdminId);
    setStmt.run('card_creation_fee_usd', JSON.stringify({ fee: 9.0, label: 'Frais de création de carte' }), bootstrapAdminId);
    setStmt.run('platform_name', JSON.stringify({ name: 'NovaPaid' }), bootstrapAdminId);
  }

  // Seed default exchange rates
  const rateCount = (db.prepare("SELECT count(*) as count FROM exchange_rates").get() as any)?.count || 0;
  if (rateCount === 0) {
    const rateStmt = db.prepare("INSERT OR IGNORE INTO exchange_rates (from_currency, to_currency, rate, fee_percentage, display_order) VALUES (?, ?, ?, ?, ?)");
    rateStmt.run("XAF", "USD", 0.001639, 2.5, 1);
    rateStmt.run("USD", "XAF", 610.0, 2.5, 2);
    rateStmt.run("XAF", "EUR", 0.001524, 2.5, 3);
    rateStmt.run("EUR", "XAF", 655.957, 2.5, 4);
    rateStmt.run("USD", "EUR", 0.92, 1.5, 5);
    rateStmt.run("EUR", "USD", 1.087, 1.5, 6);
  }

  // Seed default card creation fee
  const cardFeeCount = (db.prepare("SELECT count(*) as count FROM card_fees").get() as any)?.count || 0;
  if (cardFeeCount === 0) {
    db.prepare("INSERT INTO card_fees (name, type, currency, fixed_amount, percentage, min_charge, max_charge, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
      "Frais Visa USD", "creation", "USD", 3.0, 0, 1, 1000, "Frais standard de création de carte virtuelle Visa"
    );
    db.prepare("INSERT INTO card_fees (name, type, currency, fixed_amount, percentage, min_charge, max_charge, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
      "Frais Mastercard USD", "creation", "USD", 3.0, 0, 1, 1000, "Frais standard de création de carte virtuelle Mastercard"
    );
  }

  // Seed default reload/withdrawal/transfer fees
  const reloadFeeCount = (db.prepare("SELECT count(*) as count FROM card_reload_fees").get() as any)?.count || 0;
  if (reloadFeeCount === 0) {
    db.prepare("INSERT INTO card_reload_fees (fixed_amount, percentage_rate, min_amount, max_amount) VALUES (0, 2.5, 500, NULL)").run();
  }
  const withdrawalFeeCount = (db.prepare("SELECT count(*) as count FROM card_withdrawal_fees").get() as any)?.count || 0;
  if (withdrawalFeeCount === 0) {
    db.prepare("INSERT INTO card_withdrawal_fees (fixed_amount, percentage_rate, min_amount, max_amount) VALUES (0, 1.5, 1000, NULL)").run();
  }
  const transferFeeCount = (db.prepare("SELECT count(*) as count FROM transfer_fees").get() as any)?.count || 0;
  if (transferFeeCount === 0) {
    db.prepare("INSERT INTO transfer_fees (fixed_amount, percentage_rate, min_amount, max_amount) VALUES (0, 2.0, 500, NULL)").run();
  }

  const bootstrapApplied = db.prepare("SELECT setting_key FROM app_settings WHERE setting_key = 'admin_bootstrap_applied'").get();
  if (bootstrapPassword && !bootstrapApplied) {
    const rootAdmin = db.prepare("SELECT id FROM admins WHERE role = 'super_admin' ORDER BY id LIMIT 1").get() as any;
    if (rootAdmin) {
      const emailConflict = db.prepare(`
        SELECT id FROM admins WHERE id <> ? AND lower(email) = ?
        UNION ALL SELECT id FROM users WHERE lower(email) = ? LIMIT 1
      `).get(rootAdmin.id, bootstrapEmail, bootstrapEmail);
      if (emailConflict) throw new Error("L’adresse administrateur initiale est déjà utilisée par un autre compte.");
      db.prepare(`
        UPDATE admins SET name = 'Service NovaPaid', email = ?, password_hash = ?, status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(bootstrapEmail, hashBootstrapPassword(bootstrapPassword), rootAdmin.id);
      db.prepare("DELETE FROM admin_sessions WHERE admin_id = ?").run(rootAdmin.id);
      db.prepare(`
        INSERT INTO admin_audit_logs (admin_id, role, action, target, reason, request_id)
        VALUES (?, 'super_admin', 'bootstrap_admin_credentials', ?, 'Identifiants initiaux appliqués', ?)
      `).run(rootAdmin.id, `admin:${rootAdmin.id}`, randomBytes(16).toString("hex"));
      db.prepare(`
        INSERT INTO app_settings (setting_key, setting_value, version, updated_by)
        VALUES ('admin_bootstrap_applied', 'true', 1, ?)
      `).run(rootAdmin.id);
    }
  }

  const adminColumns = db.prepare("PRAGMA table_info(admins)").all() as Array<{ name: string }>;
  if (adminColumns.some((column) => column.name === "pin_code")) {
    db.prepare("UPDATE admins SET pin_code = '' WHERE pin_code <> ''").run();
  }
  db.prepare("UPDATE admins SET status = 'suspended' WHERE password_hash NOT LIKE 'scrypt$%'").run();
  db.prepare("DELETE FROM admin_sessions WHERE admin_id IN (SELECT id FROM admins WHERE status <> 'active')").run();
}

function ensureColumn(db: DatabaseSync, table: string, column: string, definition: string) {
  const existing = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!existing.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

