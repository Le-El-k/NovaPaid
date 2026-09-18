# Proxy SebPay

Ce Worker transmet les appels du navigateur à
SebPay et ajoute les deux cles conservees dans les secrets Cloudflare.

## Configuration

Depuis le dossier `worker` :

```powershell
npx wrangler secret put SEBPAY_PUBLIC_KEY --config .\wrangler.jsonc
npx wrangler secret put SEBPAY_SECRET_KEY --config .\wrangler.jsonc
```

Les restrictions IP configurees sur les cles SebPay doivent autoriser les
requetes du Worker ; sinon SebPay repond `IP_NOT_ALLOWED` aux collectes.

## Deploiement

```powershell
npx wrangler deploy --config .\wrangler.jsonc
```

## Endpoints utilises

```text
GET  /api/sebpay/p/countries
POST /api/sebpay/collections
GET  /api/sebpay/collections/:id
```

Le catalogue pays contient les devises et operateurs actifs. Le frontend filtre
les operateurs autorisant les collectes (`payin_enabled`) et utilise
`otp_required`/`ussd_code` pour afficher l'OTP seulement lorsque necessaire.

Les proxys LeekPay et SebPay n'acceptent que les routes utilisées par Nova Paid,
limitent la taille des requêtes et vérifient `ALLOWED_ORIGIN`. Définir cette
variable avec les origines exactes du site (séparées par des virgules) dans les
secrets/variables de chaque Worker au lieu de laisser une origine générale.

## Notifications Mailjet

Le Worker Mailjet envoie la notification de commande à
`serviceclient2126@gmail.com` après qu'un retour SoleasPay ait été reconnu comme
confirmé par l'application. Les clés Mailjet restent exclusivement dans les
secrets Cloudflare : ne les placez jamais dans `.env.local` ou dans une variable
`NEXT_PUBLIC_*`.

Depuis le dossier racine, configurez les secrets du Worker Mailjet, puis
déployez-le :

```powershell
npx wrangler secret put MAILJET_API_KEY --config .\worker\mailjet-wrangler.jsonc
npx wrangler secret put MAILJET_API_SECRET --config .\worker\mailjet-wrangler.jsonc
npx wrangler secret put MAILJET_FROM_EMAIL --config .\worker\mailjet-wrangler.jsonc
npx wrangler secret put MAILJET_FROM_NAME --config .\worker\mailjet-wrangler.jsonc
npx wrangler secret put MAILJET_TO_EMAIL --config .\worker\mailjet-wrangler.jsonc
npx wrangler secret put ALLOWED_ORIGIN --config .\worker\mailjet-wrangler.jsonc
npm run deploy:mailjet
```

`MAILJET_FROM_EMAIL` doit être un expéditeur actif et vérifié dans Mailjet.
Définissez ensuite `NEXT_PUBLIC_MAILJET_PROXY_URL` avec l'URL fournie par
Cloudflare, suivie de `/api/mailjet`, puis redéployez le site. Aucune donnée de
mot de passe n'est incluse dans les notifications.
