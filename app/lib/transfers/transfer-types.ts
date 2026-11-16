export type TransferStatus = "COMPLETED" | "PENDING_2FA" | "PROCESSING" | "FAILED" | "DISPUTED" | "CANCELLED";

export type TransferCategory =
  | "personnel"
  | "famille"
  | "services"
  | "loyer"
  | "remboursement"
  | "cadeau"
  | "autre";

export interface Beneficiary {
  id: string;
  recipientUserId?: number | null;
  name: string;
  maskedName: string;
  handle: string; // @username
  phone: string;
  maskedPhone: string;
  email: string;
  maskedEmail: string;
  avatarColor: string;
  initials: string;
  isVerified: boolean; // Le compte destinataire est actif
  isFavorite: boolean;
  lastTransferDate?: string;
}

export interface TransferRecord {
  id: string;
  direction: "sent" | "received";
  counterpartyName?: string;
  idempotencyKey: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  recipientMaskedName: string;
  recipientHandle: string;
  recipientPhone: string;
  recipientAvatarColor: string;
  recipientInitials: string;
  amount: number; // en FCFA (entier sans virgule selon CDC 6.1)
  fee: number; // 0 FCFA ou calculé
  totalDebited: number;
  currency: string;
  note?: string;
  category: TransferCategory;
  status: TransferStatus;
  ledgerReference: string; // Réf comptabilité en partie double
  createdAt: string;
  completedAt?: string;
  authMethod: "passkey" | "pin" | "otp" | "session";
  riskScore: "LOW" | "MEDIUM" | "HIGH";
}

export interface TransferLimits {
  dailyLimit: number; // ex: 500 000 FCFA
  dailyUsed: number;
  monthlyLimit: number; // ex: 2 500 000 FCFA
  monthlyUsed: number;
  singleMax: number; // ex: 250 000 FCFA
  singleMin: number; // ex: 500 FCFA
  kycLevel: 1 | 2 | 3;
}
