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
    default: "Nova Paid — Recharge Pièces TikTok au Meilleur Prix en Afrique (Mobile Money)",
    template: "%s | Nova Paid",
  },
  description:
    "Achetez vos pièces TikTok instantanément et au meilleur tarif avec Orange Money, MTN MoMo, Moov Money et Wave. Livraison sécurisée et express en FCFA sur Nova Paid.",
  applicationName: "Nova Paid",
  authors: [{ name: "Nova Paid", url: siteUrl }],
  creator: "Nova Paid",
  publisher: "Nova Paid",
  keywords: [
    "recharge tiktok",
    "pièces tiktok",
    "pieces tiktok cameroun",
    "acheter pieces tiktok",
    "recharge tiktok mobile money",
    "pieces tiktok orange money",
    "pieces tiktok mtn momo",
    "tiktok coins afrique",
    "nova-pay",
    "nova-pay tiktok",
    "recharge live tiktok",
    "recharge tiktok cote d'ivoire",
    "recharge tiktok senegal",
    "tiktok coins fcfa",
    "acheter pieces tiktok pas cher",
    "prix pieces tiktok",
    "tiktok coins cheap",
    "recharge tiktok xaf",
    "recharge tiktok xof",
  ],
  category: "Finance & E-commerce",
  classification: "TikTok Coins & Mobile Money Services",
  manifest: `${basePath}/manifest.webmanifest`,
  alternates: {
    canonical: `${siteUrl}/`,
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
      { url: `${basePath}/novapaid-logo-32.png`, sizes: "32x32", type: "image/png" },
      { url: `${basePath}/novapaid-logo-96.png`, sizes: "96x96", type: "image/png" },
      { url: `${basePath}/novapaid-logo-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${basePath}/novapaid-logo-512.png`, sizes: "512x512", type: "image/png" },
    ],
    shortcut: `${basePath}/novapaid-logo-96.png`,
    apple: [{ url: `${basePath}/novapaid-logo-180.png`, sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Nova Paid — Recharge Pièces TikTok au Meilleur Prix (Mobile Money)",
    description:
      "Achetez directement vos pièces TikTok avec Orange Money, MTN MoMo, Moov et Wave. Livraison express et tarifs imbattables en FCFA.",
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
        alt: "Nova Paid — Recharge Pièces TikTok avec Mobile Money",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nova Paid — Recharge Pièces TikTok en FCFA (Mobile Money)",
    description:
      "Rechargez vos pièces TikTok instantanément avec Orange Money & MTN MoMo. Tarifs avantageux, livraison express et sécurisée.",
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
        "Service leader de recharge de pièces TikTok en Afrique via Mobile Money (Orange Money, MTN MoMo, Moov, Wave).",
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
      "alternateName": ["Nova Paid TikTok", "Nova Paid Coins TikTok", "Nova Paid Mobile Money"],
      "description":
        "Recharge instantanée de pièces TikTok avec Orange Money, MTN MoMo et Mobile Money au meilleur tarif en FCFA.",
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
          "name": "Recharge Pièces TikTok",
          "item": `${siteUrl}/#packs`,
        },
      ],
    },
    {
      "@type": "Product",
      "@id": `${siteUrl}/#product`,
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
        "url": `${siteUrl}/#packs`,
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
        "reviewCount": "1420",
        "bestRating": "5",
        "worstRating": "1",
      },
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
