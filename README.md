# NovaPaid

NovaPaid ouvre désormais sur un espace client responsive (mobile et grand écran). Les services existants restent accessibles dans la boutique dédiée : `/boutique/`.

## Développement local

```powershell
pnpm install
pnpm run dev:vinext
```

Le serveur de développement démarre sur le port 3001. La commande `pnpm run dev` classique démarre sur le port 3000 et exécute également le générateur PWA.

## Base de données XAMPP

La base locale `novapaid` existe et comprend les tables de comptes, ledger, opérations, cartes, boutique, webhooks, support et administration. Le fichier `novapaid_database.sql` contient uniquement le schéma MariaDB, sans données utilisateur et sans commande `DROP TABLE`. Il sert à préparer une base vierge ; ne le réimporte pas dans une base existante.

## Boutique et paiements existants

La boutique de cartes virtuelles, pièces TikTok et jeux vidéo est conservée à `/boutique/`. Les intégrations de paiement existantes restent dans cette section.

Pour configurer les fournisseurs, copier `.env.example` vers `.env.local` et renseigner les valeurs nécessaires. Les secrets SebPay restent uniquement dans Cloudflare Workers (`worker/.dev.vars` en local, jamais dans le frontend).

SebPay passe par le proxy minimal situé dans `worker/sebpay-proxy.js`. Le navigateur affiche les informations de pays, d’opérateur et de numéro Mobile Money, puis interroge le statut de collecte par le proxy.

Configurer les secrets depuis le dossier `worker` :

```powershell
npx wrangler secret put SEBPAY_PUBLIC_KEY --config .\wrangler.jsonc
npx wrangler secret put SEBPAY_SECRET_KEY --config .\wrangler.jsonc
```

Depuis la racine du dépôt, déployer ensuite le proxy avec `npm run deploy:payments`. Les détails sont dans [worker/README.md](worker/README.md).

## Déploiement GitHub Pages

Le dépôt est configuré pour déployer automatiquement le site statique avec GitHub Actions. Dans les paramètres GitHub, choisir **Settings > Pages > GitHub Actions** comme source. Un push sur `main` lance le workflow existant.

## Validation

```powershell
pnpm run lint
pnpm exec tsc --noEmit --incremental false
pnpm run build:vinext
```

## Mode de démonstration NovaPaid

Les montants, cartes et transactions affichés dans le nouveau tableau de bord sont fictifs. Les actions financières n’exécutent aucun mouvement d’argent. La base locale n’est pas encore connectée à une API frontend. Les opérations réelles nécessitent l’intégration des API partenaires et les validations réglementaires décrites dans le cahier des charges.

