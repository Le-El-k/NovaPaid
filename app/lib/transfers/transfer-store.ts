import { Beneficiary, TransferLimits } from "./transfer-types";

export const DEFAULT_LIMITS: TransferLimits = {
  dailyLimit: 500_000,
  dailyUsed: 0,
  monthlyLimit: 2_500_000,
  monthlyUsed: 0,
  singleMax: 250_000,
  singleMin: 500,
  kycLevel: 1,
};

/**
 * Match only beneficiaries already returned by the server. Unknown phone or
 * email values are candidates for server verification, never treated as users.
 */
export function resolveRecipient(
  query: string,
  allBeneficiaries: Beneficiary[]
): { found: Beneficiary | null; isUnknown: boolean; candidate?: Partial<Beneficiary> } {
  const clean = query.trim().toLowerCase();
  if (!clean) return { found: null, isUnknown: false };

  const normalizedPhone = clean.replace(/[\s()-]/g, "");
  const exact = allBeneficiaries.find((beneficiary) => {
    const phone = beneficiary.phone.toLowerCase().replace(/[\s()-]/g, "");
    return beneficiary.handle.toLowerCase() === clean
      || beneficiary.handle.toLowerCase().replace(/^@/, "") === clean
      || (phone.length > 0 && phone === normalizedPhone)
      || beneficiary.email.toLowerCase() === clean;
  });

  if (exact) return { found: exact, isUnknown: false };

  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
  const phone = /^\+?[0-9]{8,15}$/.test(normalizedPhone);
  if (!email && !phone) return { found: null, isUnknown: false };

  const display = query.trim();
  return {
    found: null,
    isUnknown: true,
    candidate: {
      name: display,
      maskedName: display,
      handle: "",
      phone: phone ? display : "",
      maskedPhone: phone ? display : "",
      email: email ? display : "",
      maskedEmail: email ? display : "",
      avatarColor: "from-slate-500 to-slate-700",
      initials: "?",
      isVerified: false,
      isFavorite: false,
    },
  };
}

export function generateIdempotencyKey(): string {
  return `idemp_${crypto.randomUUID()}`;
}
