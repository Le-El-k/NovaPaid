# NovaPaid - Guide Complet & Architecture

## 1. Démarrage Rapide

Le site et son backend démarrent désormais immédiatement avec une seule commande :

```bash
npm run dev
# ou
npm start
# ou directement
node --experimental-strip-types server.js
```

L'application démarre sur le port **3000** :
- **Espace Client** : `http://localhost:3000/`
- **Console d'Administration** : `http://localhost:3000/admin`
- **Routes Dédiées** :
  - Cartes : `http://localhost:3000/cards`
  - Portefeuille : `http://localhost:3000/wallet`
  - Dépôts & Retraits : `http://localhost:3000/funding`
  - Historique & Reçus : `http://localhost:3000/history`
  - Support & Assistance : `http://localhost:3000/support`
  - Paramètres & Sécurité : `http://localhost:3000/settings`
  - Boutique & Gaming : `http://localhost:3000/boutique`

---

## 2. Diagnostic : Pourquoi le site ne s'ouvrait pas ?

L'analyse approfondie a mis en évidence le problème suivant :
- Le projet utilisait initialement `vinext` via `pnpm`.
- Sur l'environnement de déploiement et sous Windows, `pnpm` génère des liens symboliques / points de jonction NTFS (`node_modules/next`, `node_modules/vinext`, etc.) pointant vers `.pnpm/`.
- Ces liens symboliques étaient brisés (erreur d'entrée/sortie `Input/output error` et `MODULE_NOT_FOUND` sur `cli.js`), empêchant tout lancement via `vinext dev`.

**Solution mise en place :**
Un serveur universel autonome en Node.js natif (`server.js`) a été conçu avec zéro dépendance externe. Il sert à la fois les pages clientes précompilées, les ressources statiques et achemine toutes les requêtes d'API REST vers notre moteur de base de données en TypeScript.

---

## 3. La Console d'Administration (`/admin`)

Une interface d'administration complète a été ajoutée pour gérer les opérations conformément au cahier de charges :

1. **Vue d'ensemble (KPIs)** :
   - Volume total traité dans le ledger comptable.
   - Trésorerie globale des portefeuilles clients.
   - Alertes en temps réel des approbations et KYC en attente.
2. **Gestion des Utilisateurs & Wallets (`users`, `wallets`)** :
   - Consultation des comptes, rôles (`customer`, `support`, `super_admin`), soldes et états.
   - Suspension ou réactivation immédiate d'un compte.
3. **File d'Approbations (`admin_approvals`)** :
   - Traitement des retraits à haut montant et des demandes de remplacement de carte.
   - Boutons de validation ou rejet avec motif d'audit.
4. **Dossiers KYC (`kyc_cases`)** :
   - Vérification des pièces d'identité pour le passage au Niveau 2.
   - Validation ou refus avec motif transmis au client.
5. **Supervision des Cartes (`cards`)** :
   - Surveillance du parc de cartes Visa et Mastercard.
   - Gel immédiat (Freeze) en cas de suspicion de fraude et déblocage.
6. **Journal d'Audit & Sécurité (`audit_logs`)** :
   - Traçabilité complète, horodatée et immuable de chaque intervention administrative (conformité COBAC / CEMAC).
7. **Paramètres Système (`app_settings`)** :
   - Configuration dynamique du taux pivot USD/XAF, plafonds journaliers et commissions opérateurs.

---

## 4. Endpoints API Disponibles

- `GET /api/wallet` : Profil et solde du portefeuille.
- `POST /api/wallet` : Dépôt ou retrait Mobile Money.
- `GET /api/cards` : Liste des cartes virtuelles.
- `POST /api/cards` : Création d'une nouvelle carte.
- `GET /api/transfers` : Bénéficiaires et historique.
- `POST /api/transfers` : Transfert instantané entre membres.
- `GET /api/transactions` : Relevé de compte ledger.
- `GET /api/admin?section=[overview|users|approvals|kyc|cards|audit|settings]` : Données d'administration.
- `POST /api/admin` : Prise de décision (approbations, KYC, cartes, paramètres).
