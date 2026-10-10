import type { Metadata } from "next";
import { PaymentCheckoutReturn } from "@/app/components/payments/PaymentCheckoutReturn";

export const metadata: Metadata = {
  title: "Paiement Réussi | Nova Paid",
  description: "Confirmation et reçu de paiement Nova Paid.",
  alternates: null,
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function PaymentSuccessPage() {
  return <PaymentCheckoutReturn outcome="success" />;
}
