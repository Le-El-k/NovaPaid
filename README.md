# Nova Paid

Boutique web de pieces TikTok avec SoleasPay et SebPay.

## Developpement

```powershell
npm install
npm run dev
```

Pour activer les prestataires avec tes propres identifiants, copie `.env.example`
vers `.env.local` puis renseigne les variables publiques SoleasPay/EmailJS et
les URL de tes Workers. Les secrets SebPay restent uniquement dans Cloudflare
Workers (`worker/.dev.vars` en local, jamais dans le frontend).

Le frontend local utilise directement le Worker SebPay public. Aucune clé
secrète SebPay n'est incluse dans le frontend.

## SebPay

SebPay passe par le proxy minimal situe dans `worker/sebpay-proxy.js`. Le
navigateur affiche une etape 4 pour le pays, l'operateur, le numero Mobile Money
et, uniquement si l'operateur l'exige, le code USSD et l'OTP. Les pays, devises,
services PayIn et operateurs sont charges depuis le catalogue SebPay en temps
reel. Le navigateur envoie ensuite la collection au proxy, puis verifie son
statut toutes les 5 secondes avec `GET /collections/:id`.

Configurer les deux secrets une seule fois :

```powershell
Set-Location -LiteralPath ".\worker"
npx wrangler secret put SEBPAY_PUBLIC_KEY --config .\wrangler.jsonc
npx wrangler secret put SEBPAY_SECRET_KEY --config .\wrangler.jsonc
```

Si SebPay limite ces cles a une adresse IP, cette restriction doit aussi
autoriser les requetes sortantes du Worker. Une reponse `IP_NOT_ALLOWED` bloque
les collectes meme lorsque les deux secrets sont correctement configures.

Depuis la racine du depot, deployer ensuite le proxy :

```powershell
npm run deploy:payments
```

Les details sont dans [`worker/README.md`](worker/README.md).

## Deploiement GitHub Pages

Le projet est configure pour etre deploie automatiquement sur GitHub Pages via GitHub Actions :

1. Dans les parametres du depot GitHub : **Settings** > **Pages**.
2. Sous **Build and deployment** > **Source**, selectionner **GitHub Actions**.
3. A chaque `git push` sur la branche `main`, le workflow `.github/workflows/deploy-pages.yml` compile automatiquement le site statique (`npm run build:pages`) et le publie sur GitHub Pages.

## Validation

```powershell
npm run lint
npx tsc --noEmit --incremental false
npm run build:pages
npm run build
npx wrangler deploy --config .\worker\wrangler.jsonc --dry-run
```

