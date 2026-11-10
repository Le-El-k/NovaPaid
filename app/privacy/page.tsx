"use client";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen py-12 px-4" style={{ background: "var(--surface, #f4f3f7)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm opacity-60 hover:opacity-100 transition-opacity" style={{ color: "var(--cyan, #00d4aa)" }}>
            ← Retour à l'accueil
          </Link>
        </div>
        <div className="p-8 rounded-2xl shadow-lg" style={{ background: "var(--panel, #1a1625)", color: "var(--text, #f0eff4)" }}>
          <h1 className="text-3xl font-bold mb-6">Politique de confidentialité</h1>
          <p className="text-sm opacity-60 mb-8">Dernière mise à jour : 10 novembre 2026</p>

          <div className="space-y-6 text-sm leading-relaxed opacity-85">
            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cyan, #00d4aa)" }}>1. Collecte des données</h2>
              <p>NovaPaid collecte les informations nécessaires à la fourniture de ses services financiers numériques : nom, adresse email, numéro de téléphone, informations de paiement, et données d'identification pour la vérification KYC.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cyan, #00d4aa)" }}>2. Utilisation des données</h2>
              <p>Vos données sont utilisées pour :</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Créer et gérer votre compte</li>
                <li>Traiter vos transactions financières</li>
                <li>Assurer la sécurité de votre compte</li>
                <li>Répondre à vos demandes de support</li>
                <li>Se conformer aux obligations légales et réglementaires</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cyan, #00d4aa)" }}>3. Protection des données</h2>
              <p>Nous utilisons des mesures de sécurité avancées incluant le chiffrement des données sensibles, l'authentification à deux facteurs, et des protocoles de sécurité conformes aux standards de l'industrie financière.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cyan, #00d4aa)" }}>4. Partage des données</h2>
              <p>Vos données ne sont jamais vendues. Elles peuvent être partagées avec nos partenaires de paiement (processeurs de paiement mobile money, émetteurs de cartes virtuelles) uniquement dans le cadre du traitement de vos transactions.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cyan, #00d4aa)" }}>5. Vos droits</h2>
              <p>Vous disposez du droit d'accéder à vos données, de les rectifier, de les supprimer, et de vous opposer à leur traitement. Pour exercer ces droits, contactez notre support.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cyan, #00d4aa)" }}>6. Cookies</h2>
              <p>NovaPaid utilise des cookies essentiels pour l'authentification et la sécurité de votre session. Aucun cookie publicitaire n'est utilisé sans votre consentement explicite.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cyan, #00d4aa)" }}>7. Contact</h2>
              <p>Pour toute question relative à la protection de vos données, contactez-nous via la section Support de l'application ou par WhatsApp.</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
