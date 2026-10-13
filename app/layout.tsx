import type { Metadata, Viewport } from "next";
import { PwaInstallPrompt } from "@/app/components/pwa/PwaInstallPrompt";
import { PwaServiceWorker } from "@/app/components/pwa/PwaServiceWorker";
import {
  buildSupportWhatsAppHref,
  SUPPORT_WHATSAPP_CONTACTS,
} from "@/app/lib/support-whatsapp";
import "./globals.css";

const installPromptCaptureScript = `
  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    window.__novapaidInstallPrompt = event;
    window.dispatchEvent(new Event("nova-pay-install-prompt-ready"));
  });
`;

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || process.env.BASE_PATH || "";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://novapaid.net").replace(/\/+$/, "");
const pwaOgImageUrl = `${siteUrl}/novapaid-logo-512.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Nova Paid — Cartes Virtuelles Visa/Mastercard, Pièces TikTok & Recharges Jeux Vidéo en FCFA",
    template: "%s | Nova Paid",
  },
  description:
    "Achetez vos cartes bancaires virtuelles Visa / Mastercard internationales, rechargez vos pièces TikTok et vos jeux vidéo préférés (Fortnite V-Bucks, Free Fire Diamants, PUBG UC, COD Mobile CP, Blood Strike, EA FC Mobile) instantanément avec Mobile Money (Orange Money, MTN MoMo, Moov, Wave). Livraison express en 5 à 15 minutes en FCFA.",
  applicationName: "Nova Paid",
  authors: [{ name: "Nova Paid", url: siteUrl }],
  creator: "Nova Paid",
  publisher: "Nova Paid",
  keywords: [
    "carte virtuelle visa",
    "carte virtuelle mastercard",
    "carte bancaire virtuelle afrique",
    "carte virtuelle cameroun",
    "carte visa cote d'ivoire",
    "carte bancaire virtuelle senegal",
    "payer netflix sans carte bancaire",
    "carte virtuelle facebook ads afrique",
    "carte bancaire internationale fcfa",
    "recharge tiktok",
    "pièces tiktok",
    "pieces tiktok cameroun",
    "acheter pieces tiktok",
    "recharge tiktok mobile money",
    "pieces tiktok orange money",
    "pieces tiktok mtn momo",
    "pieces tiktok wave",
    "tiktok coins afrique",
    "nova-pay",
    "novapaid",
    "recharge live tiktok",
    "recharge tiktok cote d'ivoire",
    "recharge tiktok senegal",
    "tiktok coins fcfa",
    "acheter pieces tiktok pas cher",
    "prix pieces tiktok",
    "recharge tiktok xaf",
    "recharge tiktok xof",
    "recharge jeux video",
    "diamants free fire",
    "recharge free fire mobile money",
    "pass booyah free fire",
    "uc pubg mobile",
    "recharge pubg mobile afrique",
    "cp cod mobile",
    "call of duty mobile cp fcfa",
    "v-bucks fortnite",
    "recharge fortnite vbucks afrique",
    "points fc mobile",
    "ea sports fc mobile fcfa",
    "or blood strike",
    "gaming mobile money afrique",
  ],
  category: "Fintech & E-commerce",
  classification: "Cartes Bancaires Virtuelles, Pièces TikTok & Recharges Jeux Vidéo",
  manifest: `${basePath}/manifest.webmanifest`,
  alternates: {
    canonical: `${siteUrl}/`,
    languages: {
      "fr-FR": `${siteUrl}/`,
      "en-US": `${siteUrl}/`,
    },
  },
  appleWebApp: {
    capable: true,
    title: "Nova Paid",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "Nova Paid",
  },
  icons: {
    icon: [
      { url: `${basePath}/favicon.ico`, sizes: "any" },
      { url: `${basePath}/novapaid-logo-48.png`, sizes: "48x48", type: "image/png" },
      { url: `${basePath}/novapaid-logo-32.png`, sizes: "32x32", type: "image/png" },
      { url: `${basePath}/novapaid-logo-96.png`, sizes: "96x96", type: "image/png" },
      { url: `${basePath}/novapaid-logo-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${basePath}/novapaid-logo-512.png`, sizes: "512x512", type: "image/png" },
    ],
    shortcut: `${basePath}/favicon.ico`,
    apple: [{ url: `${basePath}/novapaid-logo-180.png`, sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Nova Paid — Cartes Virtuelles Visa/Mastercard, Pièces TikTok & Jeux Vidéo en FCFA",
    description:
      "Cartes bancaires virtuelles internationales Visa / Mastercard, recharge de pièces TikTok et jeux vidéo (Fortnite, Free Fire, PUBG, COD Mobile, FC Mobile). Paiements locaux sécurisés par Mobile Money en FCFA.",
    url: `${siteUrl}/`,
    siteName: "Nova Paid",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: pwaOgImageUrl,
        secureUrl: pwaOgImageUrl,
        width: 512,
        height: 512,
        alt: "Nova Paid — Cartes Virtuelles, Pièces TikTok & Jeux Vidéo avec Mobile Money",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nova Paid — Cartes Virtuelles, Pièces TikTok & Recharges Gaming en FCFA",
    description:
      "Achetez vos cartes virtuelles Visa/Mastercard, pièces TikTok et recharges gaming (Free Fire, Fortnite, PUBG, COD) par Mobile Money en FCFA.",
    images: [pwaOgImageUrl],
    creator: "@novapaid",
    site: "@novapaid",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

const jsonLdGlobal = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      "name": "Nova Paid",
      "url": `${siteUrl}/`,
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/novapaid-logo-512.png`,
        "width": "512",
        "height": "512",
      },
      "description":
        "Plateforme leader de services digitaux en Afrique : cartes bancaires virtuelles Visa & Mastercard, recharges de pièces TikTok et jeux vidéo (Fortnite, Free Fire, PUBG, COD Mobile, FC Mobile, Blood Strike) par Mobile Money (Orange Money, MTN MoMo, Moov, Wave).",
      "contactPoint": SUPPORT_WHATSAPP_CONTACTS.map((contact) => ({
          "@type": "ContactPoint",
          "name": contact.label.fr,
          "telephone": contact.phoneNumber,
          "contactType": "customer service",
          "availableLanguage": ["French", "English"],
          "areaServed": ["CM", "CI", "SN", "BF", "ML", "TG", "BJ", "GA", "CG", "CD", "XAF", "XOF"],
        })),
      "sameAs": SUPPORT_WHATSAPP_CONTACTS.map((contact) =>
        buildSupportWhatsAppHref(contact.whatsappNumber)
      ),
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      "url": `${siteUrl}/`,
      "name": "Nova Paid",
      "alternateName": ["Nova Paid Cartes", "Nova Paid TikTok", "Nova Paid Gaming", "Nova Paid Mobile Money"],
      "description":
        "Achat de cartes bancaires virtuelles Visa/Mastercard, recharge de pièces TikTok et jeux vidéo avec Orange Money, MTN MoMo, Moov et Wave en FCFA.",
      "inLanguage": ["fr-FR", "en-US"],
      "publisher": {
        "@id": `${siteUrl}/#organization`,
      },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${siteUrl}/#breadcrumbs`,
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Accueil",
          "item": `${siteUrl}/`,
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Cartes Virtuelles Visa / Mastercard",
          "item": `${siteUrl}/#cards`,
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Pièces TikTok",
          "item": `${siteUrl}/#coins`,
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Recharges Jeux Vidéo",
          "item": `${siteUrl}/#games`,
        },
      ],
    },
    {
      "@type": "Product",
      "@id": `${siteUrl}/#product-tiktok`,
      "name": "Recharge Pièces TikTok Nova Paid",
      "image": pwaOgImageUrl,
      "description":
        "Achetez vos pièces TikTok en FCFA avec Mobile Money (Orange Money, MTN MoMo, Moov, Wave) au meilleur tarif.",
      "brand": {
        "@type": "Brand",
        "name": "Nova Paid",
      },
      "sku": "NOVA_PAY-TIKTOK-PACKS",
      "offers": {
        "@type": "AggregateOffer",
        "url": `${siteUrl}/#coins`,
        "priceCurrency": "XAF",
        "lowPrice": "1124",
        "highPrice": "78700",
        "offerCount": "6",
        "priceValidUntil": "2028-12-31",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@id": `${siteUrl}/#organization`,
        },
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "15000",
        "bestRating": "5",
        "worstRating": "1",
      },
    },
    {
      "@type": "Product",
      "@id": `${siteUrl}/#product-cards`,
      "name": "Cartes Bancaires Virtuelles Visa & Mastercard Nova Paid",
      "image": pwaOgImageUrl,
      "description":
        "Cartes virtuelles prépayées et de débit Visa et Mastercard en USD acceptées sur Netflix, Facebook Ads, ChatGPT Plus, Amazon et Apple Pay. Achat direct en FCFA par Mobile Money sans vérification KYC.",
      "brand": {
        "@type": "Brand",
        "name": "Nova Paid",
      },
      "sku": "NOVA-CARDS-VIRTUAL",
      "offers": {
        "@type": "AggregateOffer",
        "url": `${siteUrl}/#cards`,
        "priceCurrency": "XAF",
        "lowPrice": "5000",
        "highPrice": "15000",
        "offerCount": "4",
        "priceValidUntil": "2028-12-31",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@id": `${siteUrl}/#organization`,
        },
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "15000",
        "bestRating": "5",
        "worstRating": "1",
      },
    },
    {
      "@type": "Product",
      "@id": `${siteUrl}/#product-gaming`,
      "name": "Recharges Jeux Vidéo & Pass Gaming Nova Paid",
      "image": pwaOgImageUrl,
      "description":
        "Recharges instantanées pour jeux vidéo : V-Bucks Fortnite, Diamants Free Fire, UC PUBG Mobile, Points COD Mobile CP, Or Blood Strike et Points FC Mobile. Paiement par Mobile Money en FCFA.",
      "brand": {
        "@type": "Brand",
        "name": "Nova Paid",
      },
      "sku": "NOVA-GAMING-TOPUP",
      "offers": {
        "@type": "AggregateOffer",
        "url": `${siteUrl}/#games`,
        "priceCurrency": "XAF",
        "lowPrice": "420",
        "highPrice": "352430",
        "offerCount": "40",
        "priceValidUntil": "2028-12-31",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@id": `${siteUrl}/#organization`,
        },
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "15000",
        "bestRating": "5",
        "worstRating": "1",
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Comment effectuer le paiement avec Mobile Money (Orange, MTN, Moov, Wave) ?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sélectionnez votre forfait, renseignez vos informations, puis cliquez sur 'Payer par Mobile Money'. Vous serez redirigé vers la passerelle sécurisée SoleasPay où vous choisirez votre opérateur (Orange Money, MTN MoMo, Moov Money ou Wave). Il vous suffira de valider la demande de débit sur votre téléphone.",
          },
        },
        {
          "@type": "Question",
          "name": "Quel est le délai de livraison de ma recharge ou de ma carte ?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "La quasi-totalité des commandes sont livrées en 5 à 15 minutes après confirmation du paiement. Pour les recharges de jeux (Blood Strike, PUBG, Free Fire, COD), la livraison prend entre 1 et 8 minutes selon le jeu.",
          },
        },
        {
          "@type": "Question",
          "name": "Pourquoi désactiver l'A2F/2FA lors de la recharge de mon compte ?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Pour les recharges directes par compte (Fortnite), la désactivation temporaire de l'authentification à deux facteurs permet à notre système d'accéder au compte et de créditer vos forfaits sans être bloqué par un code SMS. Vous pouvez la réactiver immédiatement après livraison.",
          },
        },
        {
          "@type": "Question",
          "name": "Où puis-je utiliser ma carte virtuelle Nova Paid ?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Nos cartes virtuelles Visa et Mastercard en USD sont acceptées sur toutes les plateformes internationales sécurisées par 3D Secure : abonnements (Netflix, Spotify, ChatGPT Plus), publicités (Facebook Ads, Google Ads), boutiques en ligne (Amazon, Alibaba, AliExpress) et services cloud.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <head>
        <meta property="og:image" content={pwaOgImageUrl} />
        <meta property="og:image:secure_url" content={pwaOgImageUrl} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
        <meta property="og:image:alt" content="Nova Paid — Recharge Pièces TikTok avec Mobile Money" />
        <meta name="twitter:image" content={pwaOgImageUrl} />
        <meta name="twitter:image:src" content={pwaOgImageUrl} />
        <meta name="twitter:image:alt" content="Nova Paid — Recharge Pièces TikTok avec Mobile Money" />
        <script dangerouslySetInnerHTML={{ __html: installPromptCaptureScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGlobal) }}
        />
      </head>
      <body>
        <PwaServiceWorker />
        <PwaInstallPrompt />
        {children}
      </body>
    </html>
  );
}
