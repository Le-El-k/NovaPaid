export type SupportLanguage = "fr" | "en";

export type SupportWhatsAppContact = {
  id: string;
  label: Record<SupportLanguage, string>;
  whatsappNumber: string;
  phoneNumber: string;
  displayPhone: string;
};

export const SUPPORT_WHATSAPP_CONTACTS = [
  {
    id: "service-client-1",
    label: {
      fr: "Support Nova Paid",
      en: "Nova Paid support",
    },
    whatsappNumber: "237682018364",
    phoneNumber: "+237682018364",
    displayPhone: "+237 682 018 364",
  },
] as const satisfies readonly SupportWhatsAppContact[];

export function buildSupportWhatsAppHref(
  whatsappNumber: string,
  message?: string,
): string {
  const normalizedNumber = whatsappNumber.replace(/\D/g, "");
  const baseHref = `https://wa.me/${normalizedNumber}`;
  const normalizedMessage = message?.trim();

  return normalizedMessage
    ? `${baseHref}?text=${encodeURIComponent(normalizedMessage)}`
    : baseHref;
}
