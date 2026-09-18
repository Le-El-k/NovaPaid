import type { Metadata } from "next";
import { PaymentCheckoutReturn } from "@/app/components/payments/PaymentCheckoutReturn";

export const metadata: Metadata = {
  title: "Paiement Échoué | Nova Paid",
  description: "Statut d'échec de transaction Nova Paid.",
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
