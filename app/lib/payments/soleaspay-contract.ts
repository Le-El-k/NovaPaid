import type { PaymentLanguage } from "@/app/lib/payments/payment-contract";

export type SoleasPayLanguage = PaymentLanguage;

export type SoleasPayFeeBearer = "CUSTOMER" | "MERCHANT";

export type SoleasPayCheckoutV3Customer = {
  name: string;
  email?: string;
};

export type SoleasPayCheckoutV3Payload = {
  apiKey: string;
  amount: number;
  currency: string;
  orderId: string;
  description: string;
  shopName: string;
  successUrl: string;
  failureUrl: string;
  customer: SoleasPayCheckoutV3Customer;
  line?: "up";
  area?: string;
  feeBearer: "CUSTOMER";
};
