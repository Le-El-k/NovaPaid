import type { Metadata } from "next";
import { PaymentCheckoutReturn } from "@/app/components/payments/PaymentCheckoutReturn";

export const metadata: Metadata = {
  title: "Paiement Échoué | NovaPaid",
  description: "Statut d'échec de transaction NovaPaid.",
  alternates: null,
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function PaymentFailedPage() {
  return <PaymentCheckoutReturn outcome="failure" />;
}
