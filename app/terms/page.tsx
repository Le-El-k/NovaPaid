"use client";
import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen py-12 px-4" style={{ background: "var(--surface, #f4f3f7)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm opacity-60 hover:opacity-100 transition-opacity" style={{ color: "var(--cyan, #00d4aa)" }}>
            ← Retour à l'accueil
          </Link>
        </div>
        <div className="p-8 rounded-2xl shadow-lg" style={{ background: "var(--panel, #1a1625)", color: "var(--text, #f0eff4)" }}>
          <h1 className="text-3xl font-bold mb-6">Conditions d'utilisation</h1>
          <p className="text-sm opacity-60 mb-8">Dernière mise à jour : 10 novembre 2026</p>

          <div className="space-y-6 text-sm leading-relaxed opacity-85">
            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cyan, #00d4aa)" }}>1. Acceptation des conditions</h2>
              <p>En utilisant NovaPaid, vous acceptez les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser nos services.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cyan, #00d4aa)" }}>2. Description des services</h2>
              <p>NovaPaid offre des services financiers numériques incluant :</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Portefeuille électronique (dépôts, retraits, transferts)</li>
                <li>Cartes virtuelles Visa et Mastercard</li>
                <li>Marketplace et boutique en ligne</li>
                <li>Achat de crédits de jeux et recharges</li>
                <li>Programme de parrainage/revendeur</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cyan, #00d4aa)" }}>3. Inscription et compte</h2>
              <p>Vous devez fournir des informations exactes lors de l'inscription. Vous êtes responsable de la sécurité de votre compte, y compris votre mot de passe et votre code PIN. Toute activité sur votre compte est de votre responsabilité.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cyan, #00d4aa)" }}>4. Vérification d'identité (KYC)</h2>
              <p>NovaPaid peut exiger une vérification d'identité pour certaines opérations. Le non-respect de cette obligation peut entraîner la limitation ou la suspension de votre compte.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cyan, #00d4aa)" }}>5. Limites et frais</h2>
              <p>Les transactions sont soumises à des limites et des frais configurés par la plateforme. Les limites et frais applicables sont affichés avant chaque transaction.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cyan, #00d4aa)" }}>6. Responsabilité</h2>
              <p>NovaPaid s'efforce de maintenir un service fiable mais ne garantit pas un fonctionnement sans interruption. NovaPaid n'est pas responsable des pertes résultant de l'utilisation de services tiers (opérateurs mobiles, fournisseurs de cartes).</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cyan, #00d4aa)" }}>7. Suspension et résiliation</h2>
              <p>NovaPaid se réserve le droit de suspendre ou de résilier un compte en cas de violation de ces conditions, d'activité suspecte, ou de non-conformité réglementaire.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cyan, #00d4aa)" }}>8. Modifications</h2>
              <p>Ces conditions peuvent être modifiées. Les utilisateurs seront notifiés des changements importants. L'utilisation continue du service après modification vaut acceptation.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cyan, #00d4aa)" }}>9. Droit applicable</h2>
              <p>Les présentes conditions sont régies par le droit applicable au Cameroun et à la zone CEMAC.</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
