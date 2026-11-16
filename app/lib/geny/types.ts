// Shared Geny API types. Safe to import on the client: contains no secrets.

export type GenyMode = "direct" | "wallet";
export type GenyOrderStatus = "pending" | "succeeded" | "failed" | "expired" | "refunded";
export type GenyOperator = "mtn" | "orange";

export interface GenyPayment {
  requires_otp: boolean;
  otp_instruction: string;
}

export interface GenyOrder {
  object: "order";
  order_ref: string;
  reference: string;
  livemode: boolean;
  mode: GenyMode;
  status: GenyOrderStatus;
  final: boolean;
  plan: { id: string; name: string };
  currency: string;
  wholesale_price: number;
  customer_price: number;
  margin: number;
  customer: { phone: string; operator: string };
  customer_ref: string;
  payment: GenyPayment | null;
  code: string | null;
  code_kind: string | null;
  code_balance: unknown;
  failure: { code: string } | null;
  created_at: number;
  updated_at: number;
  balance?: { wallet: number };
}

export interface GenyPlan {
  id: string;
  name: string;
  quota_bytes: number | null;
  duration_value: number;
  duration_unit: string;
  public_price: number | null;
  wholesale_price: number;
  customer_price: { min: number; max: number; default: number } | null;
  modes: GenyMode[];
}

export interface GenyErrorPayload {
  error: string;
  code: string;
  param?: string;
  request_id?: string;
  [key: string]: unknown;
}

// Normalised plan the API route returns to the browser for the internet catalogue.
export interface GenyPlanView {
  id: string;
  name: string;
  durationLabel: string;
  volumeLabel: string; // "1 Go", "2,5 Go" or "Illimité"
  priceXaf: number; // the reseller's "Votre prix client" (customer_price.default)
  min: number;
  max: number;
}

// Normalised result the API route returns to the browser. Never carries the API key.
export interface GenyOrderView {
  ok: boolean;
  orderRef: string;
  status: GenyOrderStatus | "unknown";
  final: boolean;
  requiresOtp: boolean;
  otpInstruction: string;
  code: string | null;
  codeKind: string | null;
  planName: string;
  amount: number;
  failureCode: string | null;
  livemode: boolean;
}
