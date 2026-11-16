// Maplerad API request/response types.
// Field names mirror the Maplerad REST API exactly (snake_case) — do not rename.

export interface MapleradEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

// ---- Customers ----------------------------------------------------------

export interface MapleradPhone {
  phone_country_code: string; // e.g. "+237"
  phone_number: string; // local number without country code
}

export interface MapleradAddress {
  street: string;
  street2?: string | null;
  city: string;
  state: string;
  country: string; // ISO alpha-2, e.g. "CM"
  postal_code: string;
}

export type MapleradIdentityType = "NIN" | "PASSPORT" | "VOTERS_CARD" | "DRIVERS_LICENSE";

export interface MapleradIdentity {
  type: MapleradIdentityType;
  image: string; // data URI
  number: string;
  country: string; // ISO alpha-2
  image_back?: string; // data URI, required for some national IDs
}

/** POST /customers — Tier 0 (minimal). */
export interface CreateCustomerTier0Request {
  first_name: string;
  last_name: string;
  email: string;
  country: string; // ISO alpha-2
}

/** POST /customers/enroll — full enrollment (reaches Tier 2 / card-eligible). */
export interface EnrollCustomerRequest {
  first_name: string;
  last_name: string;
  email: string;
  country: string;
  identification_number: string;
  dob: string; // DD-MM-YYYY
  phone: MapleradPhone;
  address: MapleradAddress;
  identity?: MapleradIdentity;
  photo?: string; // selfie as data URI (or URL in sandbox)
}

export interface MapleradCustomer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  country: string;
  status: string; // PENDING | COMPLETED | ...
  tier: number;
  created_at: string;
  updated_at: string;
}

// ---- Issuing (cards) ----------------------------------------------------

/** POST /issuing */
export interface CreateCardRequest {
  customer_id: string;
  currency: "USD";
  type: "VIRTUAL";
  auto_approve: true;
  brand?: "VISA" | "MASTERCARD";
  amount?: number; // minor units (cents) to pre-fund
}

/** Synchronous ack — real details arrive via webhook issuing.created.successful. */
export interface CreateCardAck {
  reference: string;
}

export interface MapleradCard {
  id: string;
  name: string;
  masked_pan: string;
  type: string; // VIRTUAL
  issuer: string; // VISA | MASTERCARD
  currency: string; // USD
  status: string; // ACTIVE | DISABLED
  balance: number; // minor units
  auto_approve?: boolean;
  expiry?: string;
  card_number?: string;
  cvv?: string;
}

// ---- Collections (bank / virtual accounts) ------------------------------

/** POST /collections/virtual-account — static NGN account. */
export interface CreateVirtualAccountNgnRequest {
  customer_id: string;
  currency: "NGN";
  preferred_bank?: string; // bank code
}

export interface MapleradVirtualAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  currency: string;
  status?: string;
  created_at: string;
}

/** POST /collections/virtual-account/usd — async, returns a reference. */
export interface CreateUsdAccountRequest {
  customer_id: string;
  meta: {
    identification_number: string;
    employment_status: "EMPLOYED" | "SELF_EMPLOYED" | "UNEMPLOYED" | "STUDENT" | "RETIRED";
    employment_description: string;
    nationality: string;
    employer_name: string;
    occupation: string;
    us_residency_status: "NON_RESIDENT_ALIEN" | "RESIDENT_ALIEN" | "US_CITIZEN";
    documents?: Record<string, unknown>;
  };
}

export interface CreateUsdAccountAck {
  reference: string;
  status: string; // PENDING
  currency: string; // USD
  kyc_link?: string;
}

// ---- Webhooks -----------------------------------------------------------

export interface MapleradWebhookEvent {
  event: string; // e.g. "issuing.created.successful"
  reference?: string;
  card?: MapleradCard;
  status?: string;
  reason?: string;
  verification_link?: string;
  link_expire_at?: string;
  id?: string;
  [key: string]: unknown;
}

// ---- Client result ------------------------------------------------------

export type MapleradResult<T> =
  | { ok: true; data: T; raw: unknown }
  | { ok: false; error: string; status: number; raw: unknown };
