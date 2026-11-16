// Maplerad orchestration — SERVER-SIDE ONLY.
// Bridges the typed HTTP client (client.ts) and the local database (NovaDbService):
// enrolment, Visa card issuance, bank-account creation, and webhook application.

import { NovaDbService } from "../../db/service.ts";
import { createMapleradClient } from "./client.ts";
import { getMapleradConfig } from "./config.ts";
import type {
  EnrollCustomerRequest,
  MapleradWebhookEvent,
} from "./types.ts";

const PROVIDER = "maplerad";

export class MapleradError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "MapleradError";
    this.status = status;
  }
}

/** Active card provider configured by admin (sandbox | maplerad | ...). */
export function getActiveCardProvider(): string {
  try {
    const settings = NovaDbService.getCardIssuingSettings() as any;
    return (settings?.active_provider || "sandbox").toString();
  } catch {
    return "sandbox";
  }
}

export function isMapleradActive(): boolean {
  return getActiveCardProvider() === PROVIDER && Boolean(getMapleradConfig());
}

// Minimal name → ISO alpha-2 map for the countries NovaPaid serves. Defaults to CM.
const COUNTRY_ISO: Record<string, string> = {
  cameroun: "CM", cameroon: "CM", cm: "CM",
  "côte d'ivoire": "CI", "cote d'ivoire": "CI", "ivory coast": "CI", ci: "CI",
  senegal: "SN", sénégal: "SN", sn: "SN",
  nigeria: "NG", ng: "NG",
  ghana: "GH", gh: "GH",
  benin: "BJ", bénin: "BJ", bj: "BJ",
  togo: "TG", tg: "TG",
  gabon: "GA", ga: "GA",
};

function toIsoCountry(value: string | null | undefined): string {
  if (!value) return "CM";
  const key = value.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(key)) return key.toUpperCase();
  return COUNTRY_ISO[key] || "CM";
}

/** Convert a stored date (YYYY-MM-DD or DD-MM-YYYY or ISO) to DD-MM-YYYY. */
function toDdMmYyyy(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim().slice(0, 10);
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/); // YYYY-MM-DD
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = v.match(/^(\d{2})-(\d{2})-(\d{4})$/); // DD-MM-YYYY
  if (m) return v;
  m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); // DD/MM/YYYY
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

/** Split a stored phone into {country_code, number}. NovaPaid defaults to +237. */
function splitPhone(raw: string): { phone_country_code: string; phone_number: string } {
  const cleaned = (raw || "").replace(/[\s().-]/g, "");
  const codes = ["+237", "+225", "+221", "+234", "+233", "+229", "+228", "+241"];
  for (const code of codes) {
    if (cleaned.startsWith(code)) return { phone_country_code: code, phone_number: cleaned.slice(code.length) };
    const bare = code.slice(1);
    if (cleaned.startsWith(bare)) return { phone_country_code: code, phone_number: cleaned.slice(bare.length) };
  }
  const digits = cleaned.replace(/^\+/, "");
  return { phone_country_code: "+237", phone_number: digits };
}

function buildEnrollPayload(
  user: NonNullable<ReturnType<typeof NovaDbService.getUserForProviderEnrollment>>,
  environment: "sandbox" | "production"
): EnrollCustomerRequest {
  const sandbox = environment === "sandbox";
  let kyc: any = {};
  try { kyc = user.kycData ? JSON.parse(user.kycData) : {}; } catch { kyc = {}; }

  const missing: string[] = [];
  if (!user.firstName) missing.push("prénom");
  if (!user.lastName) missing.push("nom");
  if (!user.email) missing.push("email");

  const country = toIsoCountry(user.country);
  const dob = toDdMmYyyy(user.dateOfBirth) || (sandbox ? "01-01-1990" : null);
  if (!dob) missing.push("date de naissance");

  const identificationNumber =
    (kyc.identificationNumber || kyc.idNumber || kyc.nin || "").toString().trim() ||
    (sandbox ? "0000000000" : "");
  if (!identificationNumber) missing.push("numéro d'identification (CNI/NIN)");

  const phone = splitPhone(user.phone);
  if (!phone.phone_number) missing.push("téléphone");

  const address = {
    street: (user.address || (sandbox ? "N/A" : "")).toString().trim(),
    city: (user.city || (sandbox ? "Douala" : "")).toString().trim(),
    state: (user.state || user.city || (sandbox ? "Littoral" : "")).toString().trim(),
    country,
    postal_code: (user.postalCode || (sandbox ? "00000" : "")).toString().trim(),
  };
  if (!address.street) missing.push("adresse");
  if (!address.city) missing.push("ville");

  if (missing.length > 0) {
    throw new MapleradError(
      "Profil KYC incomplet pour émettre une carte. Champs requis : " + missing.join(", ") + ".",
      422
    );
  }

  const payload: EnrollCustomerRequest = {
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    country,
    identification_number: identificationNumber,
    dob: dob!,
    phone,
    address,
  };

  // Identity document + selfie when captured during KYC (data URIs).
  if (kyc.identityType && kyc.identityImage && kyc.identityNumber) {
    payload.identity = {
      type: kyc.identityType,
      image: kyc.identityImage,
      number: String(kyc.identityNumber),
      country,
      ...(kyc.identityImageBack ? { image_back: kyc.identityImageBack } : {}),
    };
  }
  if (kyc.selfie || kyc.photo) payload.photo = kyc.selfie || kyc.photo;

  return payload;
}

/** Ensure the user has a Maplerad customer id for the active environment. */
export async function ensureMapleradCustomer(userId: number): Promise<string> {
  const config = getMapleradConfig();
  if (!config) throw new MapleradError("Maplerad n'est pas configuré.", 503);
  const client = createMapleradClient();
  if (!client) throw new MapleradError("Maplerad n'est pas configuré.", 503);

  const existing = NovaDbService.getProviderCustomerId(userId, PROVIDER, config.environment);
  if (existing) return existing;

  const user = NovaDbService.getUserForProviderEnrollment(userId);
  if (!user) throw new MapleradError("Utilisateur introuvable.", 404);

  const payload = buildEnrollPayload(user, config.environment);
  const res = await client.enrollCustomer(payload);
  if (!res.ok) throw new MapleradError(res.error, res.status || 400);

  const customerId = res.data?.id;
  if (!customerId) throw new MapleradError("Réponse Maplerad invalide : identifiant client manquant.", 502);

  NovaDbService.saveProviderCustomer(userId, PROVIDER, config.environment, customerId, {
    tier: res.data?.tier,
    status: res.data?.status,
  });
  return customerId;
}

/** Issue a virtual Visa/Mastercard card via Maplerad (asynchronous). */
export async function issueMapleradCard(
  userId: number,
  opts: { brand: "visa" | "mastercard"; amountUsd: number; label?: string }
): Promise<{ success: boolean; pending: true; cardId: number; reference: string; costXaf: number; newWalletBalanceXaf: number }> {
  const config = getMapleradConfig();
  if (!config) throw new MapleradError("Maplerad n'est pas configuré.", 503);
  const client = createMapleradClient();
  if (!client) throw new MapleradError("Maplerad n'est pas configuré.", 503);

  const settings = NovaDbService.getCardIssuingSettings() as any;
  if (settings && settings.card_creation_enabled === 0) {
    throw new MapleradError("La création de cartes est temporairement désactivée.", 403);
  }

  const customerId = await ensureMapleradCustomer(userId);
  const label = opts.label || (opts.brand === "visa" ? "Carte Virtuelle Visa" : "Carte Virtuelle Mastercard");

  const res = await client.createCard({
    customer_id: customerId,
    currency: "USD",
    type: "VIRTUAL",
    auto_approve: true,
    brand: opts.brand === "mastercard" ? "MASTERCARD" : "VISA",
    amount: Math.round(opts.amountUsd * 100),
  });
  if (!res.ok) throw new MapleradError(res.error, res.status || 400);

  const reference = res.data?.reference;
  if (!reference) throw new MapleradError("Réponse Maplerad invalide : référence d'émission manquante.", 502);

  const { cardId, costXaf, newWalletBalanceXaf } = NovaDbService.createPendingMapleradCard(userId, {
    brand: opts.brand,
    label,
    amountUsd: opts.amountUsd,
    reference,
    environment: config.environment,
    mapleradCustomerId: customerId,
  });

  return { success: true, pending: true, cardId, reference, costXaf, newWalletBalanceXaf };
}

/** Create a virtual bank account (NGN static account) for the user via Maplerad. */
export async function createMapleradBankAccount(
  userId: number,
  currency: "NGN" = "NGN"
): Promise<{ success: boolean; accountId: number; status: string }> {
  const config = getMapleradConfig();
  if (!config) throw new MapleradError("Maplerad n'est pas configuré.", 503);
  const client = createMapleradClient();
  if (!client) throw new MapleradError("Maplerad n'est pas configuré.", 503);

  const customerId = await ensureMapleradCustomer(userId);

  // Only the synchronous NGN static account is wired here. USD accounts require
  // an additional KYC document bundle (meta) and are handled via webhook — add
  // that flow once the KYC document capture UI is in place.
  const res = await client.createVirtualAccountNgn({ customer_id: customerId, currency });
  if (!res.ok) throw new MapleradError(res.error, res.status || 400);

  const acct = res.data;
  const accountId = NovaDbService.insertBankAccount(userId, {
    provider: PROVIDER,
    environment: config.environment,
    currency: acct?.currency || currency,
    status: acct?.account_number ? "active" : (acct?.status || "pending").toLowerCase(),
    providerAccountId: acct?.id || null,
    accountNumber: acct?.account_number || null,
    accountName: acct?.account_name || null,
    bankName: acct?.bank_name || null,
  });

  return { success: true, accountId, status: acct?.account_number ? "active" : "pending" };
}

/**
 * Freeze or unfreeze an issued card at Maplerad.
 * `mapleradCardId` is the card's provider reference (provider_card_ref).
 * Throws MapleradError when the provider rejects or is unreachable, so the
 * caller can avoid mutating local state on failure.
 */
export async function setMapleradCardFreeze(
  mapleradCardId: string,
  action: "freeze" | "unfreeze",
): Promise<void> {
  const client = createMapleradClient();
  if (!client) throw new MapleradError("Maplerad n'est pas configuré.", 503);
  if (!mapleradCardId) throw new MapleradError("Référence de carte Maplerad manquante.", 422);

  const res =
    action === "freeze"
      ? await client.freezeCard(mapleradCardId)
      : await client.unfreezeCard(mapleradCardId);

  if (!res.ok) {
    throw new MapleradError(res.error || "Échec du changement d'état de la carte chez Maplerad.", res.status || 502);
  }
}

/** Route an inbound Maplerad webhook event to the right DB handler. */
export function handleMapleradWebhook(event: MapleradWebhookEvent): { handled: boolean; matched: boolean } {
  const type = String(event.event || "");

  if (type.startsWith("issuing.created")) {
    const r = NovaDbService.applyMapleradCardWebhook({
      reference: event.reference,
      event: type,
      card: event.card as any,
      reason: event.reason,
    });
    return { handled: true, matched: r.matched };
  }

  if (type.startsWith("account.creation") || type.startsWith("account.status")) {
    const r = NovaDbService.applyMapleradAccountWebhook({
      event: type,
      id: (event.id as string) || (event.card as any)?.id,
      reference: event.reference,
      account_number: (event as any).account_number,
      account_name: (event as any).account_name,
      bank_name: (event as any).bank_name,
      status: event.status,
      reason: event.reason,
    });
    return { handled: true, matched: r.matched };
  }

  // Other events (issuing.transaction, issuing.charge, etc.) are acknowledged
  // but not yet persisted. Extend here as needed.
  return { handled: false, matched: false };
}
