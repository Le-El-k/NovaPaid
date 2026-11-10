import type { Metadata } from "next";
import { PaymentCheckoutReturn } from "@/app/components/payments/PaymentCheckoutReturn";

export const metadata: Metadata = {
  title: "Paiement Réussi | NovaPaid",
  description: "Confirmation et reçu de paiement NovaPaid.",
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
