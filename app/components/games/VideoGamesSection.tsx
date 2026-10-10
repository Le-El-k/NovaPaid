"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Eye,
  EyeOff,
  Flame,
  Gamepad2,
  Globe,
  HelpCircle,
  Info,
  LockKeyhole,
  Mail,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tv,
  User,
  X,
  Zap,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import {
  playError,
  playModalClose,
  playModalOpen,
  playStep,
  playTap,
  playToggle,
} from "@/app/lib/sound";
import { getAssetPath } from "@/app/lib/asset-path";
import { SoleasPayCheckoutV3 } from "@/app/components/payments/SoleasPayCheckoutV3";
import {
  ALL_COUNTRIES,
  POPULAR_COUNTRIES,
  detectUserCountry,
  dialCodes,
  formatFullPhoneNumber,
} from "@/app/lib/countries";
import { buildSupportWhatsAppHref, SUPPORT_WHATSAPP_CONTACTS } from "@/app/lib/support-whatsapp";

export type Language = "fr" | "en";

export type GameCategory = "all" | "mobile" | "console" | "pc";

export type GamePack = {
  id: string;
  name: string;
  quantity?: number;
  bonus?: string;
  price: number;
  badge?: string;
  popular?: boolean;
  image?: string;
};

export type GameRegion = {
  id: string;
  name: { fr: string; en: string };
  flag?: string;
  badge?: string;
  packs: GamePack[];
};

export type GameItem = {
  id: string;
  slug: string;
  name: string;
  publisher: string;
  category: "mobile" | "console" | "pc" | "crossplay";
  currencyName: { fr: string; en: string };
  badge?: { fr: string; en: string };
  logoUrl?: string;
  colorGradient: string;
  iconBg: string;
  accentColor: string;
  requiresAccountPassword?: boolean;
  identifierLabel: { fr: string; en: string };
  identifierPlaceholder: { fr: string; en: string };
  identifierHint: { fr: string; en: string };
  description: { fr: string; en: string };
  deliveryTime: { fr: string; en: string };
  packs: GamePack[];
  regions?: GameRegion[];
};

const allGeneralPacks = [
  {
    "id": "ff-gen-100",
    "name": "100 Diamants",
    "price": 940,
    "image": "/freefire/diamonds-low.jpg"
  },
  {
    "id": "ff-gen-310",
    "name": "310 Diamants",
    "price": 3230,
    "image": "/freefire/diamonds-low.jpg"
  },
  {
    "id": "ff-gen-520",
    "name": "520 Diamants",
    "price": 5100,
    "popular": true,
    "badge": "Populaire",
    "image": "/freefire/diamonds-low.jpg"
  },
  {
    "id": "ff-gen-1060",
    "name": "1060 Diamants",
    "price": 10190,
    "image": "/freefire/diamonds-high.webp"
  },
  {
    "id": "ff-gen-2180",
    "name": "2180 Diamants",
    "price": 19640,
    "image": "/freefire/diamonds-high.webp"
  },
  {
    "id": "ff-gen-5600",
    "name": "5600 Diamants",
    "price": 53330,
    "image": "/freefire/diamonds-high.webp"
  },
  {
    "id": "ff-gen-7290",
    "name": "7290 Diamants",
    "price": 54100,
    "badge": "Top Promo",
    "image": "/freefire/diamonds-high.webp"
  },
  {
    "id": "ff-gen-11500",
    "name": "11500 Diamants",
    "price": 98520,
    "image": "/freefire/diamonds-high.webp"
  }
];

export const gamesCatalog: GameItem[] = [
  {
    id: "fortnite",
    slug: "fortnite",
    name: "Fortnite",
    publisher: "Epic Games",
    category: "crossplay",
    currencyName: { fr: "V-Bucks", en: "V-Bucks" },
    badge: { fr: "Populaire", en: "Popular" },
    logoUrl: "/fortnite-logo.png",
    colorGradient: "linear-gradient(135deg, #0284c7, #4f46e5)",
    iconBg: "#0284c7",
    accentColor: "#38bdf8",
    requiresAccountPassword: true,
    identifierLabel: { fr: "Email du compte Epic Games", en: "Epic Games Account Email" },
    identifierPlaceholder: { fr: "Ex: moncompte@email.com", en: "e.g. myaccount@email.com" },
    identifierHint: {
      fr: "Vos identifiants Epic Games (email et mot de passe). Désactivez la 2FA temporairement.",
      en: "Your Epic Games credentials (email & password). Disable 2FA temporarily.",
    },
    description: {
      fr: "Recharge officielle de V-Bucks Fortnite pour skins, passes de combat et emotes sur toutes plateformes.",
      en: "Official Fortnite V-Bucks top-up for skins, battle pass and emotes on all platforms.",
    },
    deliveryTime: { fr: "10 - 20 minutes", en: "10 - 20 minutes" },
    packs: [
      { id: "fortnite-800", name: "800 V-Bucks", price: 6600, bonus: "Pack Standard", image: "/fortnite/card-800.png" },
      { id: "fortnite-2400", name: "2 400 V-Bucks", price: 16900, popular: true, badge: "Populaire", bonus: "+320 Bonus inclus", image: "/fortnite/card-2400.png" },
      { id: "fortnite-4500", name: "4 500 V-Bucks", price: 27200, bonus: "+500 Bonus inclus", image: "/fortnite/card-4500.png" },
      { id: "fortnite-12500", name: "12 500 V-Bucks", price: 66200, badge: "Méga Pack", bonus: "+2 500 Bonus inclus", image: "/fortnite/card-12500.png" },
    ],
  },
  {
    id: "free-fire",
    slug: "free-fire",
    name: "Free Fire",
    publisher: "Garena",
    category: "mobile",
    currencyName: { fr: "Diamants", en: "Diamonds" },
    badge: { fr: "Top Vente", en: "Best Seller" },
    logoUrl: "/games/freefire-icon.png",
    colorGradient: "linear-gradient(135deg, #ff4e00, #ff8c00)",
    iconBg: "#ff4e00",
    accentColor: "#ff5722",
    identifierLabel: { fr: "ID Joueur (UID Free Fire)", en: "Player ID (Free Fire UID)" },
    identifierPlaceholder: { fr: "Ex: 1234567890", en: "e.g. 1234567890" },
    identifierHint: {
      fr: "Visible sur votre profil dans le coin supérieur gauche du jeu.",
      en: "Visible on your profile at the top left corner of the game.",
    },
    description: {
      fr: "Recharge officielle de Diamants Free Fire par UID sur votre compte selon votre région (Générale, Amériques, Europe). Livraison instantanée par Mobile Money.",
      en: "Official Free Fire Diamonds top-up by UID for your server region (General, Americas, Europe). Instant Mobile Money delivery.",
    },
    deliveryTime: { fr: "2 - 7 minutes", en: "2 - 7 minutes" },
    packs: allGeneralPacks,
    "regions": [
      {
        id: "general",
        name: { fr: "Régions générales", en: "General Regions" },
        flag: "🌐",
        badge: "Recommandé",
        packs: allGeneralPacks,
      },
      {
        "id": "lam",
        "name": {
          "fr": "Amériques (Amérique latine)",
          "en": "Americas (Latin America)"
        },
        "flag": "🌎",
        "packs": [
          {
            "id": "ff-lam-110",
            "name": "100+10 Diamants",
            "price": 760,
            "image": "/freefire/diamonds-low.jpg"
          },
          {
            "id": "ff-lam-341",
            "name": "310+31 Diamants",
            "price": 2270,
            "image": "/freefire/diamonds-low.jpg"
          },
          {
            "id": "ff-lam-572",
            "name": "520+52 Diamants",
            "price": 3820,
            "popular": true,
            "badge": "Populaire",
            "image": "/freefire/diamonds-low.jpg"
          },
          {
            "id": "ff-lam-1166",
            "name": "1060+106 Diamants",
            "price": 7100,
            "image": "/freefire/diamonds-high.webp"
          },
          {
            "id": "ff-lam-2398",
            "name": "2180+218 Diamants",
            "price": 14100,
            "image": "/freefire/diamonds-high.webp"
          },
          {
            "id": "ff-lam-6160",
            "name": "5600+560 Diamants",
            "price": 35850,
            "badge": "Top Promo",
            "image": "/freefire/diamonds-high.webp"
          }
        ]
      },
      {
        "id": "eu",
        "name": {
          "fr": "Europe",
          "en": "Europe"
        },
        "flag": "🇪🇺",
        "packs": [
          {
            "id": "ff-eu-100",
            "name": "100 Diamants",
            "price": 1060,
            "image": "/freefire/diamonds-low.jpg"
          },
          {
            "id": "ff-eu-310",
            "name": "310 Diamants",
            "price": 3170,
            "image": "/freefire/diamonds-low.jpg"
          },
          {
            "id": "ff-eu-520",
            "name": "520 Diamants",
            "price": 5270,
            "popular": true,
            "badge": "Populaire",
            "image": "/freefire/diamonds-low.jpg"
          },
          {
            "id": "ff-eu-1060",
            "name": "1060 Diamants",
            "price": 10540,
            "image": "/freefire/diamonds-high.webp"
          },
          {
            "id": "ff-eu-2180",
            "name": "2180 Diamants",
            "price": 21080,
            "image": "/freefire/diamonds-high.webp"
          },
          {
            "id": "ff-eu-5600",
            "name": "5600 Diamants",
            "price": 52680,
            "badge": "Top Promo",
            "image": "/freefire/diamonds-high.webp"
          }
        ]
      }
    ]
  },
  {
    "id": "pubg-mobile",
    "slug": "pubg-mobile",
    "name": "PUBG Mobile",
    "publisher": "Tencent Games",
    "logoUrl": "/games/pubg-icon.png",
    "category": "mobile",
    "currencyName": {
      "fr": "UC (Unknown Cash)",
      "en": "UC (Unknown Cash)"
    },
    "badge": {
      "fr": "Serveur Global",
      "en": "Global Server"
    },
    "colorGradient": "linear-gradient(135deg, #d48b04, #f59e0b)",
    "iconBg": "#d97706",
    "accentColor": "#f59e0b",
    "identifierLabel": {
      "fr": "ID Joueur (UID PUBG Mobile)",
      "en": "Player ID (PUBG Mobile UID)"
    },
    "identifierPlaceholder": {
      "fr": "Ex: 5123456789",
      "en": "e.g. 5123456789"
    },
    "identifierHint": {
      "fr": "Votre ID numérique situé sous votre avatar dans PUBG Mobile (Serveur Global).",
      "en": "Your numeric ID found directly under your avatar in PUBG Mobile (Global Server)."
    },
    "description": {
      "fr": "Recharge officielle d'Unknown Cash (UC) pour PUBG Mobile (Serveur Global) par UID Joueur. Livraison instantanée par Mobile Money.",
      "en": "Official Unknown Cash (UC) top-up for PUBG Mobile (Global Server) by Player UID. Instant Mobile Money delivery."
    },
    "deliveryTime": {
      "fr": "2 - 7 minutes",
      "en": "2 - 7 minutes"
    },
    "packs": [
      {
        "id": "pubg-60",
        "name": "60 UC",
        "price": 850,
        "image": "/pubg/uc-low.jpg"
      },
      {
        "id": "pubg-325",
        "name": "300+25 UC",
        "price": 3770,
        "image": "/pubg/uc-low.jpg"
      },
      {
        "id": "pubg-660",
        "name": "600+60 UC",
        "price": 7530,
        "popular": true,
        "badge": "Populaire",
        "image": "/pubg/uc-low.jpg"
      },
      {
        "id": "pubg-1800",
        "name": "1500+300 UC",
        "price": 18830,
        "image": "/pubg/uc-mid.jpg"
      },
      {
        "id": "pubg-3850",
        "name": "3000+850 UC",
        "price": 37650,
        "image": "/pubg/uc-mid.jpg"
      },
      {
        "id": "pubg-8100",
        "name": "6000+2100 UC",
        "price": 75310,
        "badge": "Top Promo",
        "image": "/pubg/uc-mid.jpg"
      },
      {
        "id": "pubg-16200",
        "name": "12000+4200 UC",
        "price": 151120,
        "image": "/pubg/uc-high.png"
      },
      {
        "id": "pubg-24300",
        "name": "18000+6300 UC",
        "price": 226280,
        "image": "/pubg/uc-high.png"
      },
      {
        "id": "pubg-32400",
        "name": "24000+8400 UC",
        "price": 301440,
        "image": "/pubg/uc-high.png"
      }
    ]
  },
  {
    id: "cod-mobile",
    slug: "cod-mobile",
    name: "Call of Duty: Mobile",
    publisher: "Activision",
    category: "mobile",
    currencyName: { fr: "Points COD (CP)", en: "COD Points (CP)" },
    badge: { fr: "Livraison 2-5 min", en: "2-5 min delivery" },
    logoUrl: "/games/cod-icon.png",
    colorGradient: "linear-gradient(135deg, #15803d, #22c55e)",
    iconBg: "#15803d",
    accentColor: "#22c55e",
    identifierLabel: { fr: "ID Joueur (UID Call of Duty)", en: "Player ID (COD UID)" },
    identifierPlaceholder: { fr: "Ex: 6749123456789", en: "e.g. 6749123456789" },
    identifierHint: {
      fr: "Visible sur votre profil joueur dans Call of Duty: Mobile. Délai de livraison : environ 2 à 5 minutes.",
      en: "Found in your player profile in Call of Duty: Mobile. Delivery time: 2 to 5 minutes.",
    },
    description: {
      fr: "Recharge officielle de Points COD (CP) pour Call of Duty: Mobile par UID Joueur. Délai garanti : environ 2 à 5 minutes.",
      en: "Official COD Points (CP) top-up for Call of Duty: Mobile by Player UID. Guaranteed delivery time: 2 to 5 minutes.",
    },
    deliveryTime: { fr: "2 - 5 minutes", en: "2 - 5 minutes" },
    packs: [
      {
        id: "cod-30",
        name: "30 CP",
        price: 420,
        image: "/cod/cp-low.png"
      },
      {
        id: "cod-80",
        name: "80 CP",
        price: 1050,
        image: "/cod/cp-low.png"
      },
      {
        id: "cod-420",
        name: "420 CP",
        price: 4340,
        image: "/cod/cp-low.png"
      },
      {
        id: "cod-880",
        name: "880 CP",
        price: 7680,
        popular: true,
        badge: "Populaire",
        image: "/cod/cp-high.png"
      },
      {
        id: "cod-2400",
        name: "2400 CP",
        price: 18710,
        image: "/cod/cp-high.png"
      },
      {
        id: "cod-5000",
        name: "5000 CP",
        price: 37420,
        badge: "Top Promo",
        image: "/cod/cp-high.png"
      },
      {
        id: "cod-10800",
        name: "10800 CP",
        price: 74850,
        badge: "Méga Pack",
        image: "/cod/cp-high.png"
      },
      {
        id: "cod-21600",
        name: "21600 CP",
        price: 146580,
        image: "/cod/cp-high.png"
      },
      {
        id: "cod-32400",
        name: "32400 CP",
        price: 218320,
        image: "/cod/cp-high.png"
      },
      {
        id: "cod-43200",
        name: "43200 CP",
        price: 283820,
        image: "/cod/cp-high.png"
      },
      {
        id: "cod-54000",
        name: "54000 CP",
        price: 352430,
        image: "/cod/cp-high.png"
      }
    ]
  },
  {
    "id": "blood-strike",
    "slug": "blood-strike",
    "name": "Blood Strike",
    "publisher": "NetEase Games",
    "logoUrl": "/games/bloodstrike-icon.png",
    "category": "mobile",
    "currencyName": {
      "fr": "Or (Gold)",
      "en": "Gold"
    },
    "badge": {
      "fr": "FPS Mobile",
      "en": "Mobile FPS"
    },
    "colorGradient": "linear-gradient(135deg, #b91c1c, #ef4444)",
    "iconBg": "#b91c1c",
    "accentColor": "#ef4444",
    "identifierLabel": {
      "fr": "ID Joueur (UID Blood Strike)",
      "en": "Player ID (Blood Strike UID)"
    },
    "identifierPlaceholder": {
      "fr": "Ex: 123456789",
      "en": "e.g. 123456789"
    },
    "identifierHint": {
      "fr": "Visible sur votre profil dans le coin supérieur gauche du jeu.",
      "en": "Found in your player profile in the top left corner of Blood Strike."
    },
    "description": {
      "fr": "Recharge officielle d'Or pour Blood Strike par UID Joueur. Livraison instantanée par Mobile Money.",
      "en": "Official Gold top-up for Blood Strike by Player UID. Instant Mobile Money delivery."
    },
    "deliveryTime": {
      "fr": "1 - 5 minutes",
      "en": "1 - 5 minutes"
    },
    "packs": [
      {
        "id": "bs-105",
        "name": "100 + 5 Or",
        "price": 720,
        "image": "/bloodstrike/gold-low.png"
      },
      {
        "id": "bs-320",
        "name": "300 + 20 Or",
        "price": 2170,
        "image": "/bloodstrike/gold-low.png"
      },
      {
        "id": "bs-540",
        "name": "500 + 40 Or",
        "price": 3600,
        "popular": true,
        "badge": "Populaire",
        "image": "/bloodstrike/gold-low.png"
      },
      {
        "id": "bs-1100",
        "name": "1000 + 100 Or",
        "price": 7220,
        "image": "/bloodstrike/gold-high.png"
      },
      {
        "id": "bs-2260",
        "name": "2000 + 260 Or",
        "price": 14450,
        "image": "/bloodstrike/gold-high.png"
      },
      {
        "id": "bs-5800",
        "name": "5000 + 800 Or",
        "price": 36100,
        "badge": "Top Promo",
        "image": "/bloodstrike/gold-high.png"
      }
    ]
  },
  {
    "id": "ea-fc-mobile",
    "slug": "ea-fc-mobile",
    "name": "EA Sports FC Mobile",
    "publisher": "Electronic Arts",
    "logoUrl": "/games/fcmobile-icon.png",
    "category": "mobile",
    "currencyName": {
      "fr": "Points FC",
      "en": "FC Points"
    },
    "badge": {
      "fr": "Football",
      "en": "Football"
    },
    "colorGradient": "linear-gradient(135deg, #065f46, #059669)",
    "iconBg": "#065f46",
    "accentColor": "#10b981",
    "identifierLabel": {
      "fr": "UID Joueur EA FC Mobile",
      "en": "Player UID EA FC Mobile"
    },
    "identifierPlaceholder": {
      "fr": "Ex: 1049283719",
      "en": "e.g. 1049283719"
    },
    "identifierHint": {
      "fr": "Votre UID situé dans les paramètres de votre compte EA Sports FC Mobile.",
      "en": "Your UID located in your EA Sports FC Mobile account settings."
    },
    "description": {
      "fr": "Points FC officiels pour vos packs de joueurs, passes événementiels et Ultimate Team.",
      "en": "Official FC Points for player packs, star passes, and Ultimate Team."
    },
    "deliveryTime": {
      "fr": "3 - 8 minutes",
      "en": "3 - 8 minutes"
    },
    "packs": [
      {
        "id": "fc-100",
        "name": "100 Points FC",
        "price": 990,
        "image": "/fcmobile/fc-100.png"
      },
      {
        "id": "fc-520",
        "name": "520 Points FC",
        "price": 3040,
        "popular": true,
        "badge": "Populaire",
        "image": "/fcmobile/fc-520.png"
      },
      {
        "id": "fc-1070",
        "name": "1 070 Points FC",
        "price": 6140,
        "image": "/fcmobile/fc-1070.png"
      },
      {
        "id": "fc-2200",
        "name": "2 200 Points FC",
        "price": 12340,
        "image": "/fcmobile/fc-2200.png"
      },
      {
        "id": "fc-5750",
        "name": "5 750 Points FC",
        "price": 30770,
        "badge": "Top Promo",
        "image": "/fcmobile/fc-5750.png"
      },
      {
        "id": "fc-12000",
        "name": "12 000 Points FC",
        "price": 61170,
        "badge": "Méga Pack",
        "image": "/fcmobile/fc-12000.png"
      }
    ]
  }
];;

const copy = {
  fr: {
    kicker: "RECHARGES & PASS JEUX VIDÉO",
    title: "Jeux Vidéo & Recharges Gaming",
    subtitle:
      "Achetez vos diamants Free Fire, V-Bucks Fortnite, UC PUBG, EA Sports FC et Blood Strike en FCFA avec Mobile Money (Orange Money, MTN MoMo, Moov, Wave).",
    fastDelivery: "Livraison en 5-15 min",
    all: "Tous les jeux",
    mobile: "Jeux Mobile",
    console: "Consoles & Cartes",
    pc: "PC Gaming",
    searchPlaceholder: "Rechercher un jeu (Fortnite, Free Fire, PUBG, Call of Duty, Blood Strike...)",
    viewOffers: "Voir les forfaits",
    backToGames: "Retour aux jeux",
    choosePackTitle: "1. Choisissez votre forfait",
    choosePackSubtitle: "Cliquez sur un forfait pour configurer votre commande",
    // Step 1: Conditions
    step1Title: "Consignes importantes",
    step1Subtitle: "Veuillez lire et accepter les 2 conditions ci-dessous pour continuer",
    epicCredentialsTitle: "Identifiants Epic Games requis",
    epicCredentialsDesc:
      "Veuillez vous assurer que vous disposez des identifiants corrects de votre compte Epic Games (adresse email et mot de passe) pour recevoir vos V-Bucks.",
    accountCredentialsTitle: "Identifiants de compte requis",
    accountCredentialsDesc:
      "Veuillez vous assurer que vous disposez des identifiants corrects de votre compte de jeu pour permettre la livraison de votre recharge.",
    twoFactorTitle: "Authentification à deux facteurs (2FA / A2F)",
    twoFactorDesc:
      "Si vous avez activé l'authentification à double facteur sur votre compte, veuillez la désactiver temporairement pendant la recharge afin que vos crédits soient livrés sans blocage.",
    checkbox1Text:
      "Je confirme que je vais fournir les identifiants réels de mon compte (email et mot de passe).",
    checkbox2Text:
      "Je confirme avoir désactivé temporairement l'authentification à deux facteurs (2FA / A2F).",
    bothConditionsRequired:
      "Veuillez cocher les 2 cases obligatoires pour confirmer l'acceptation des conditions.",
    acceptAndContinue: "Accepter et continuer",
    // Step 2: Identifiants
    step2Title: "Identifiants & Contact",
    step2Subtitle: "Renseignez vos identifiants de connexion et votre contact WhatsApp",
    epicEmail: "Email du compte Epic Games",
    epicPassword: "Mot de passe Epic Games",
    password: "Mot de passe du compte",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    emailPlaceholder: "ex: moncompte@email.com",
    passwordPlaceholder: "••••••••",
    emailRequired: "Veuillez renseigner une adresse email valide.",
    passwordRequired: "Veuillez renseigner le mot de passe de votre compte.",
    whatsappNumber: "Numéro WhatsApp",
    popularCountries: "Pays populaires",
    allCountries: "Tous les pays",
    whatsappRequired: "Veuillez entrer un numéro WhatsApp valide (au moins 6 chiffres).",
    continueToPayment: "Continuer vers le paiement",
    backToStep1: "Revoir les consignes",
    // Step 3: Paiement
    step3Title: "Récapitulatif & Paiement sécurisé",
    backToStep2: "Modifier mes coordonnées",
    paymentSummary: "Récapitulatif de la commande",
    providerNotice: "Paiement 100% sécurisé via Mobile Money",
    soleaspayTitle: "Payer par Mobile Money (SoleasPay)",
    soleaspayDesc: "Orange Money, MTN MoMo, Moov Money, Wave",
    orderViaWhatsapp: "Commander directement sur WhatsApp",
    orderViaWhatsappDesc: "Discutez en direct avec notre équipe pour être assisté pas à pas",
    howItWorksTitle: "Comment fonctionne la recharge de jeux ?",
    howStep1Title: "1. Choisissez votre pack",
    howStep1Desc: "Cliquez sur le forfait souhaité pour ouvrir la fenêtre de commande.",
    howStep2Title: "2. Validez les conditions & 2FA",
    howStep2Desc: "Désactivez temporairement l'A2F/2FA sur votre compte et renseignez vos identifiants.",
    howStep3Title: "3. Payez par Mobile Money",
    howStep3Desc: "Réglez instantanément avec Orange Money, MTN MoMo, Wave ou Moov Money via SoleasPay.",
    howStep4Title: "4. Réception sous 5-15 min",
    howStep4Desc: "Votre compte de jeu est crédité directement. Notre support reste à votre écoute 7j/7.",
    needAssistance: "Besoin d'aide pour recharger un jeu ?",
    contactSupport: "Contacter le support WhatsApp",
    noGamesFound: "Aucun jeu trouvé pour cette recherche.",
    resetSearch: "Réinitialiser la recherche",
    secureGuaranteed: "100% Officiel & Sécurisé",
    totalToPay: "Total à régler",
    close: "Fermer",
  },
  en: {
    kicker: "GAMING TOP-UPS & PASSES",
    title: "Video Games & Gaming Top-ups",
    subtitle:
      "Buy Free Fire Diamonds, Fortnite V-Bucks, PUBG UC, EA Sports FC and Blood Strike in FCFA with Mobile Money (Orange Money, MTN MoMo, Moov, Wave).",
    fastDelivery: "Delivered in 5-15 min",
    all: "All games",
    mobile: "Mobile Games",
    console: "Consoles & Cards",
    pc: "PC Gaming",
    searchPlaceholder: "Search for a game (Fortnite, Free Fire, PUBG, Call of Duty, Blood Strike...)",
    viewOffers: "View packages",
    backToGames: "Back to games",
    choosePackTitle: "1. Select your package",
    choosePackSubtitle: "Click on any package to configure your order",
    step1Title: "Important instructions",
    step1Subtitle: "Please read and check both conditions below to proceed",
    epicCredentialsTitle: "Epic Games credentials required",
    epicCredentialsDesc:
      "Make sure you have your real Epic Games credentials (email address and password) to receive your V-Bucks.",
    accountCredentialsTitle: "Account credentials required",
    accountCredentialsDesc:
      "Make sure you provide the correct game account login credentials to enable delivery.",
    twoFactorTitle: "Two-factor authentication (2FA)",
    twoFactorDesc:
      "If two-factor authentication is enabled on your account, please disable it temporarily during the top-up process so your credits can be delivered without delay.",
    checkbox1Text:
      "I confirm that I will provide my real account credentials (email and password).",
    checkbox2Text:
      "I confirm that I have temporarily disabled two-factor authentication (2FA).",
    bothConditionsRequired:
      "Please check both required boxes to confirm you accept the terms.",
    acceptAndContinue: "Accept and continue",
    step2Title: "Credentials & Contact",
    step2Subtitle: "Enter your account credentials and WhatsApp contact number",
    epicEmail: "Epic Games Account Email",
    epicPassword: "Epic Games Account Password",
    password: "Account password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    emailPlaceholder: "e.g. myaccount@email.com",
    passwordPlaceholder: "••••••••",
    emailRequired: "Please enter a valid email address.",
    passwordRequired: "Please enter your account password.",
    whatsappNumber: "WhatsApp number",
    popularCountries: "Popular countries",
    allCountries: "All countries",
    whatsappRequired: "Please enter a valid WhatsApp number (at least 6 digits).",
    continueToPayment: "Continue to payment",
    backToStep1: "Review instructions",
    step3Title: "Order summary & Secure payment",
    backToStep2: "Edit my details",
    paymentSummary: "Order summary",
    providerNotice: "100% secure payment via Mobile Money",
    soleaspayTitle: "Pay with Mobile Money (SoleasPay)",
    soleaspayDesc: "Orange Money, MTN MoMo, Moov Money, Wave",
    orderViaWhatsapp: "Order directly on WhatsApp",
    orderViaWhatsappDesc: "Chat directly with our team for step-by-step guidance",
    howItWorksTitle: "How does video game recharge work?",
    howStep1Title: "1. Pick your package",
    howStep1Desc: "Click on your desired package to open the checkout modal.",
    howStep2Title: "2. Confirm terms & 2FA",
    howStep2Desc: "Temporarily turn off 2FA on your account and provide your login details.",
    howStep3Title: "3. Pay via Mobile Money",
    howStep3Desc: "Pay instantly with Orange Money, MTN MoMo, Wave, or Moov Money via SoleasPay.",
    howStep4Title: "4. Delivered in 5-15 min",
    howStep4Desc: "Your game account is credited quickly. Our support is available 7/7.",
    needAssistance: "Need help topping up a game?",
    contactSupport: "Contact WhatsApp support",
    noGamesFound: "No games found matching your search.",
    resetSearch: "Reset search",
    secureGuaranteed: "100% Official & Secure",
    totalToPay: "Total to pay",
    close: "Close",
  },
} as const;

function formatPrice(value: number, language: Language): string {
  return `${new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-US").format(value)} FCFA`;
}

function createPaymentOrderId(): string {
  return `NOVA-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export function VideoGamesSection({ language, theme = "dark" }: { language: Language; theme?: "light" | "dark" }) {
  const t = copy[language];
  const [mounted, setMounted] = useState(false);
  const [category, setCategory] = useState<GameCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);
  const [selectedPack, setSelectedPack] = useState<GamePack | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string>("general");
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const activeRegion = useMemo(() => {
    if (!selectedGame?.regions || selectedGame.regions.length === 0) return null;
    return selectedGame.regions.find((r) => r.id === selectedRegionId) || selectedGame.regions[0];
  }, [selectedGame, selectedRegionId]);

  const displayPacks = useMemo(() => {
    if (activeRegion && activeRegion.packs.length > 0) {
      return activeRegion.packs;
    }
    return selectedGame?.packs || [];
  }, [selectedGame, activeRegion]);

  // Form 3-Step States in Centered Modal
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1);
  const [acceptCredentials, setAcceptCredentials] = useState(false);
  const [accept2fa, setAccept2fa] = useState(false);
  const [conditionsError, setConditionsError] = useState(false);
  const [epicEmail, setEpicEmail] = useState("");
  const [epicEmailError, setEpicEmailError] = useState(false);
  const [epicPassword, setEpicPassword] = useState("");
  const [epicPasswordError, setEpicPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappError, setWhatsappError] = useState(false);
    const [countryCode, setCountryCode] = useState("CM");
  const [dialCode, setDialCode] = useState("+237");
  const [paymentOrderId, setPaymentOrderId] = useState("");

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const whatsappInputRef = useRef<HTMLInputElement>(null);
  const categoriesNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedGame) {
      document.body.classList.add("game-detail-open");
    } else {
      document.body.classList.remove("game-detail-open");
    }
    return () => {
      document.body.classList.remove("game-detail-open");
    };
  }, [selectedGame]);

  // Detect country on mount
  useEffect(() => {
    let isMounted = true;
    void detectUserCountry()
      .then((detected) => {
        if (!isMounted || !detected) return;
        setCountryCode(detected.countryCode);
        setDialCode(detected.dialCode);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Lock scroll when modal is open
  useEffect(() => {
    if (isCheckoutModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCheckoutModalOpen]);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCheckoutModalOpen) {
        closeCheckoutModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCheckoutModalOpen]);

  // Listen to hash changes for deep linking (e.g. #games?game=fortnite)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.includes("game=")) {
        const slug = hash.split("game=")[1]?.split("&")[0];
        const found = gamesCatalog.find((g) => g.slug === slug || g.id === slug);
        if (found) {
          setSelectedGame(found);
          const defaultPack = found.packs.find((p) => p.popular) || found.packs[0];
          setSelectedPack(defaultPack);
        }
      } else if (!hash.includes("game=") && selectedGame) {
        setSelectedGame(null);
        setIsCheckoutModalOpen(false);
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [selectedGame]);

  const openGameDetail = (game: GameItem) => {
    playTap();
    setSelectedGame(game);
    setSelectedRegionId("general");
    const initPacks = (game.regions && game.regions[0]?.packs) || game.packs;
    const defaultPack = initPacks.find((p) => p.popular) || initPacks[0];
    setSelectedPack(defaultPack);
    setIsCheckoutModalOpen(false);
    try {
      window.history.pushState(null, "", "#games?game=" + game.slug);
    } catch {}
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const closeGameDetail = () => {
    playTap();
    setSelectedGame(null);
    setSelectedPack(null);
    setIsCheckoutModalOpen(false);
    try {
      window.history.pushState(null, "", "#games");
    } catch {}
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Open modal ONLY when a pack is clicked
  const handlePackClick = (pack: GamePack) => {
    playModalOpen();
    setSelectedPack(pack);
    const isDirect = selectedGame?.id === "free-fire" || selectedGame?.id === "pubg-mobile" || selectedGame?.id === "cod-mobile" || selectedGame?.id === "blood-strike" || selectedGame?.id === "ea-fc-mobile";
    setCheckoutStep(isDirect ? 2 : 1);
    setAcceptCredentials(false);
    setAccept2fa(false);
    setConditionsError(false);
    setEpicEmail("");
    setEpicEmailError(false);
    setEpicPassword("");
    setEpicPasswordError(false);
    setShowPassword(false);
    setWhatsapp("");
    setWhatsappError(false);
    setPaymentOrderId(createPaymentOrderId());
    setIsCheckoutModalOpen(true);
  };

  const closeCheckoutModal = () => {
    playModalClose();
    setIsCheckoutModalOpen(false);
    setCheckoutStep((selectedGame?.id === "free-fire" || selectedGame?.id === "pubg-mobile" || selectedGame?.id === "cod-mobile" || selectedGame?.id === "blood-strike" || selectedGame?.id === "ea-fc-mobile") ? 2 : 1);
  };

  // Step 1: Verification des DEUX cases a cocher
  const handleStep1Continue = () => {
    if (!acceptCredentials || !accept2fa) {
      playError();
      setConditionsError(true);
      return;
    }
    playStep(true);
    setCheckoutStep(2);
    setTimeout(() => {
      emailInputRef.current?.focus();
    }, 60);
  };

  // Step 2: Verification des identifiants et WhatsApp
  const handleStep2Continue = () => {
    let hasError = false;
    const cleanEmail = epicEmail.trim();
    const cleanPassword = epicPassword.trim();
    const cleanPhone = whatsapp.replace(/\D/g, "");

    if (selectedGame?.id === "cod-mobile") {
      if (!cleanEmail) {
        setEpicEmailError(true);
        emailInputRef.current?.focus();
        hasError = true;
      }
    } else if (selectedGame?.requiresAccountPassword) {
      if (!cleanEmail || !cleanEmail.includes("@")) {
        setEpicEmailError(true);
        emailInputRef.current?.focus();
        hasError = true;
      }
      if (!cleanPassword || cleanPassword.length < 4) {
        setEpicPasswordError(true);
        if (!hasError) passwordInputRef.current?.focus();
        hasError = true;
      }
    } else {
      if (!cleanEmail) {
        setEpicEmailError(true);
        emailInputRef.current?.focus();
        hasError = true;
      }
    }

    if (cleanPhone.length < 6) {
      setWhatsappError(true);
      if (!hasError) whatsappInputRef.current?.focus();
      hasError = true;
    }

    if (hasError) {
      playError();
      return;
    }

    playStep(true);
    setPaymentOrderId(createPaymentOrderId());
    setCheckoutStep(3);
  };

  const filteredGames = useMemo(() => {
    return gamesCatalog.filter((game) => {
      const matchesCategory =
        category === "all" ||
        game.category === category ||
        (game.category === "crossplay" && category === "mobile");

      const query = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        game.name.toLowerCase().includes(query) ||
        game.publisher.toLowerCase().includes(query) ||
        game.currencyName[language].toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });
  }, [category, searchQuery, language]);

  // WhatsApp order link
  const directWhatsAppOrderHref = useMemo(() => {
    if (!selectedGame || !selectedPack) return "#";
    const fullPhone = formatFullPhoneNumber(whatsapp, dialCode);
    const idVal = epicEmail.trim() || "(À renseigner)";
    const message = [
      `Bonjour Nova Paid, je souhaite commander une recharge sur ${selectedGame.name} :`,
      `- Forfait : ${selectedPack.name} (${formatPrice(selectedPack.price, language)})`,
      `- ${selectedGame.id === "fortnite" ? "Email Epic Games" : selectedGame.id === "free-fire" ? "UID Free Fire" : selectedGame.id === "ea-fc-mobile" ? "UID EA FC Mobile" : "Compte"} : ${idVal}`,
      `- 2FA désactivé : Oui`,
      `- WhatsApp : ${fullPhone}`,
      `- Réf commande : ${paymentOrderId}`,
    ].join("\n");
    return buildSupportWhatsAppHref(SUPPORT_WHATSAPP_CONTACTS[0].whatsappNumber, message);
  }, [selectedGame, selectedPack, epicEmail, whatsapp, dialCode, paymentOrderId, language]);

  // RENDER DEDICATED GAME DETAIL PAGE
  if (selectedGame) {
    const activePack = selectedPack || displayPacks[0];
    const isDirectFlow = selectedGame.id === "free-fire" || selectedGame.id === "pubg-mobile" || selectedGame.id === "cod-mobile" || selectedGame.id === "blood-strike" || selectedGame.id === "ea-fc-mobile";
    return (
      <div className="video-game-detail-page" id="game-detail">
        {/* Navigation Topbar */}
        <div className="video-game-detail-topbar">
          <button
            type="button"
            className="video-game-detail-back"
            onClick={closeGameDetail}
            aria-label={t.backToGames}
          >
            <ArrowLeft size={18} />
            <span className="desktop-back-text">{t.backToGames}</span>
            <span className="mobile-back-text">{language === "fr" ? "Retour" : "Back"}</span>
          </button>
          <div className="video-game-detail-topbar-title">
            {selectedGame.logoUrl && (
              <Image
                src={getAssetPath(selectedGame.logoUrl)}
                alt={selectedGame.name}
                width={26}
                height={26}
                style={{ objectFit: "contain" }}
              />
            )}
            <strong>{selectedGame.name}</strong>
          </div>
          <span className="video-game-detail-topbar-badge">
            <Zap size={14} /> {selectedGame.deliveryTime ? selectedGame.deliveryTime[language] : t.fastDelivery}
          </span>
        </div>

        {/* Hero Banner */}
        <div
          className="video-game-detail-hero"
          style={{ background: selectedGame.colorGradient }}
        >
          <div className="video-game-detail-hero-content">
            <div className="video-game-detail-hero-badge-row">
              {selectedGame.badge && (
                <span className="video-game-detail-hero-badge">
                  <Sparkles size={12} /> {selectedGame.badge[language]}
                </span>
              )}
              <span className="video-game-detail-hero-badge secondary">
                <ShieldCheck size={12} /> {t.secureGuaranteed}
              </span>
            </div>
            <div className="video-game-detail-hero-main">
              {selectedGame.logoUrl ? (
                <div className="video-game-detail-hero-logo">
                  <Image
                    src={getAssetPath(selectedGame.logoUrl)}
                    alt={selectedGame.name}
                    width={48}
                    height={48}
                    style={{ objectFit: "contain" }}
                  />
                </div>
              ) : (
                <div className="video-game-detail-hero-logo fallback">
                  <Gamepad2 size={32} />
                </div>
              )}
              <div>
                <span className="video-game-detail-hero-pub">{selectedGame.publisher}</span>
                <h1 className="video-game-detail-hero-title">{selectedGame.name}</h1>
              </div>
            </div>
            <p className="video-game-detail-hero-desc">
              {selectedGame.description[language]}
            </p>
          </div>
        </div>

        {/* Packs Selection Section on Page */}
        <div className="video-game-detail-packs-container">
          <div className="video-game-detail-card">
            <div className="video-game-packs-title-group">
              <h2 className="video-game-detail-section-title">
                <Sparkles size={18} /> {t.choosePackTitle}
              </h2>
              <p className="video-game-packs-subtitle">{t.choosePackSubtitle}</p>
            </div>

            {/* Region Selector for Multi-Region Games (Free Fire, etc.) */}
            {selectedGame.regions && selectedGame.regions.length > 0 && (
              <div className="game-regions-selector-wrap">
                <div className="game-regions-selector-header">
                  <div className="game-regions-label">
                    <Globe size={15} />
                    <span>{language === "fr" ? "Serveur de jeu :" : "Game Server :"}</span>
                  </div>
                </div>
                <div className="game-regions-grid" role="tablist" aria-label="Régions de jeu">
                  {selectedGame.regions.map((reg) => {
                    const isCurrent = (activeRegion?.id || "general") === reg.id;
                    const shortName = reg.id === "general" 
                      ? (language === "fr" ? "Général" : "General")
                      : reg.id === "lam"
                      ? "LAM"
                      : (language === "fr" ? "Europe" : "Europe");
                    return (
                      <button
                        type="button"
                        key={reg.id}
                        role="tab"
                        aria-selected={isCurrent}
                        className={"game-region-tab-btn" + (isCurrent ? " active" : "")}
                        onClick={() => {
                          playTap();
                          setSelectedRegionId(reg.id);
                          if (reg.packs.length > 0) {
                            const popular = reg.packs.find((p) => p.popular) || reg.packs[0];
                            setSelectedPack(popular);
                          }
                        }}
                      >
                        {reg.flag && <span className="game-region-flag">{reg.flag}</span>}
                        <span className="game-region-name">{shortName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={"video-game-pack-grid " + (selectedGame.id === "fortnite" ? "fortnite-mode" : (selectedGame.id === "free-fire" || selectedGame.id === "pubg-mobile" || selectedGame.id === "cod-mobile" || selectedGame.id === "blood-strike" || selectedGame.id === "ea-fc-mobile") ? "freefire-pack-grid" : "")} role="radiogroup">
              {displayPacks.map((pack) => {
                const isSelected = activePack?.id === pack.id;

                if (selectedGame.id === "free-fire" || selectedGame.id === "pubg-mobile" || selectedGame.id === "cod-mobile" || selectedGame.id === "blood-strike" || selectedGame.id === "ea-fc-mobile") {
                const isPubg = selectedGame.id === "pubg-mobile";
                const isCod = selectedGame.id === "cod-mobile";
                const isBs = selectedGame.id === "blood-strike";
                const isFc = selectedGame.id === "ea-fc-mobile";
                  return (
                    <button
                      type="button"
                      key={pack.id}
                      className={(isFc ? "fcmobile-card " : isBs ? "bloodstrike-card " : isCod ? "cod-card " : isPubg ? "pubg-card " : "freefire-card ") + (isSelected ? "selected " : "") + (pack.popular ? "popular" : "")}
                      onClick={() => handlePackClick(pack)}
                      role="radio"
                      aria-checked={isSelected}
                    >
                      {pack.badge && <span className="freefire-card-badge">{pack.badge}</span>}
                      <div className="freefire-card-art-wrap">
                        <Image
                          src={getAssetPath(pack.image || "/freefire/diamonds-100.png")}
                          alt={pack.name}
                          width={180}
                          height={130}
                          className="freefire-card-art"
                        />
                      </div>
                      <span className="freefire-card-name">{pack.name}</span>
                      {pack.bonus && <span className="video-game-pack-bonus">{pack.bonus}</span>}
                      <div className="freefire-card-price-pill">
                        <span>{formatPrice(pack.price, language)}</span>
                      </div>
                    </button>
                  );
                }

                if (pack.image) {
                  return (
                    <button
                      type="button"
                      key={pack.id}
                      className={"fortnite-vbucks-card " + (isSelected ? "selected" : "")}
                      onClick={() => handlePackClick(pack)}
                      role="radio"
                      aria-checked={isSelected}
                    >
                      {pack.badge && <span className="fortnite-vbucks-badge">{pack.badge}</span>}
                      <div className="fortnite-vbucks-art-wrap">
                        <Image
                          src={getAssetPath(pack.image)}
                          alt={pack.name}
                          width={640}
                          height={360}
                          className="fortnite-vbucks-art"
                          priority
                        />
                      </div>
                      <div className="fortnite-vbucks-meta">
                        <span className="fortnite-vbucks-name">{pack.name}</span>
                        {pack.bonus && (
                          <span className="fortnite-vbucks-bonus">{pack.bonus}</span>
                        )}
                      </div>
                      <div className="fortnite-vbucks-price-pill">
                        <span>{formatPrice(pack.price, language)}</span>
                      </div>
                    </button>
                  );
                }

                return (
                  <button
                    type="button"
                    key={pack.id}
                    className={"video-game-pack-card " + (isSelected ? "selected " : "") + (pack.popular ? "popular" : "")}
                    onClick={() => handlePackClick(pack)}
                    role="radio"
                    aria-checked={isSelected}
                  >
                    {pack.badge && (
                      <span className="video-game-pack-badge">{pack.badge}</span>
                    )}
                    <span className="video-game-pack-name">{pack.name}</span>
                    {pack.bonus && (
                      <span className="video-game-pack-bonus">{pack.bonus}</span>
                    )}
                    <strong className="video-game-pack-price">
                      {formatPrice(pack.price, language)}
                    </strong>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

























































        {mounted && isCheckoutModalOpen && activePack && createPortal(
          <div
            className="game-modal-overlay"
            role="presentation"
            data-theme={theme}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeCheckoutModal();
            }}
          >
            <div
              className="game-modal-panel"
              role="dialog"
              data-theme={theme}
              aria-modal="true"
              aria-labelledby="game-modal-title"
            >
              {/* Close Button */}
              <button
                type="button"
                className="game-modal-close-btn"
                onClick={closeCheckoutModal}
                aria-label={t.close}
              >
                <X size={18} />
              </button>

              {/* Modal Top Header with Selected Pack recap */}
              <div
                className="game-modal-header"
                style={{ background: selectedGame.colorGradient }}
              >
                <div className="game-modal-pack-badge">
                  <span className="game-modal-pack-name">{activePack.name}</span>
                  <strong className="game-modal-pack-price">{formatPrice(activePack.price, language)}</strong>
                </div>
                <div className="game-modal-game-info">
                  <span className="game-modal-publisher">{selectedGame.publisher}</span>
                  <h2 id="game-modal-title">{selectedGame.name}</h2>
                </div>
              </div>

              {/* Modal Body with 3 Steps */}
              <div className="game-modal-body">
                {/* Progress Indicator */}
                <div className="game-checkout-progress" aria-label="Progression de la commande">
                  {isDirectFlow ? (
                    <>
                      <span className={checkoutStep >= 2 ? "active" : ""} />
                      <span className={checkoutStep >= 3 ? "active" : ""} />
                    </>
                  ) : (
                    <>
                      <span className={checkoutStep >= 1 ? "active" : ""} />
                      <span className={checkoutStep >= 2 ? "active" : ""} />
                      <span className={checkoutStep >= 3 ? "active" : ""} />
                    </>
                  )}
                </div>

                {/* STEP 1: Instructions & 2 CASES A COCHER OBLIGATOIRES */}
                {!isDirectFlow && checkoutStep === 1 && (
                  <div className="game-checkout-step">
                    <div className="game-checkout-header">
                      <span className="game-step-kicker">Étape 1 sur 3</span>
                      <h3 className="game-modal-step-title">{t.step1Title}</h3>
                      <p className="video-game-form-hint">{t.step1Subtitle}</p>
                    </div>

                    <div className="game-instruction-cards">
                      <div className="game-instruction-card">
                        <div className="game-instruction-icon">
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <strong>
                            {selectedGame.id === "fortnite"
                              ? t.epicCredentialsTitle
                              : selectedGame.id === "free-fire"
                              ? (language === "fr" ? "ID Joueur (UID) requis" : "Player UID required")
                              : t.accountCredentialsTitle}
                          </strong>
                          <p>
                            {selectedGame.id === "fortnite"
                              ? t.epicCredentialsDesc
                              : selectedGame.id === "free-fire"
                              ? (language === "fr"
                                  ? "Renseignez votre UID Free Fire à 8-10 chiffres (visible sur votre profil en jeu). Aucun mot de passe requis."
                                  : "Provide your 8-10 digit Free Fire UID from your in-game profile. No password required.")
                              : t.accountCredentialsDesc}
                          </p>
                        </div>
                      </div>

                      <div className="game-instruction-card warning">
                        <div className="game-instruction-icon warning">
                          <Info size={20} />
                        </div>
                        <div>
                          <strong>
                            {selectedGame.id === "free-fire" && activeRegion
                              ? (language === "fr" ? "Vérification de la région du compte" : "Account region check")
                              : t.twoFactorTitle}
                          </strong>
                          <p>
                            {selectedGame.id === "free-fire" && activeRegion
                              ? (language === "fr"
                                  ? "Vérifiez bien que votre compte est configuré sur " + activeRegion.flag + " " + activeRegion.name[language] + ". La livraison ne fonctionne que pour ce serveur."
                                  : "Ensure your account server matches " + activeRegion.flag + " " + activeRegion.name[language] + ". Top-up works only for this server.")
                              : t.twoFactorDesc}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* DEUX CASES A COCHER BIEN VISIBLES */}
                    <div className="game-checkboxes-group">
                      {/* Case a cocher 1 : Identifiants corrects */}
                      <label className={`game-terms-checkbox ${acceptCredentials ? "checked" : ""} ${conditionsError && !acceptCredentials ? "error" : ""}`}>
                        <input
                          type="checkbox"
                          checked={acceptCredentials}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            playToggle(checked);
                            setAcceptCredentials(checked);
                            if (conditionsError && checked && accept2fa) {
                              setConditionsError(false);
                            }
                          }}
                        />
                        <span className="game-checkbox-indicator"><Check size={14} /></span>
                        <span className="game-checkbox-label">
                          {selectedGame.id === "free-fire"
                            ? (language === "fr"
                                ? "Je confirme renseigner mon ID Joueur (UID Free Fire) exact et sans erreur."
                                : "I confirm that my Free Fire Player ID (UID) is accurate.")
                            : t.checkbox1Text}
                        </span>
                      </label>

                      {/* Case a cocher 2 : 2FA ou Region */}
                      <label className={`game-terms-checkbox ${accept2fa ? "checked" : ""} ${conditionsError && !accept2fa ? "error" : ""}`}>
                        <input
                          type="checkbox"
                          checked={accept2fa}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            playToggle(checked);
                            setAccept2fa(checked);
                            if (conditionsError && checked && acceptCredentials) {
                              setConditionsError(false);
                            }
                          }}
                        />
                        <span className="game-checkbox-indicator"><Check size={14} /></span>
                        <span className="game-checkbox-label">
                          {selectedGame.id === "free-fire" && activeRegion
                            ? (language === "fr"
                                ? "Je confirme que mon compte Free Fire est bien rattaché à la région : " + activeRegion.flag + " " + activeRegion.name[language] + "."
                                : "I confirm that my account is registered in: " + activeRegion.flag + " " + activeRegion.name[language] + ".")
                            : t.checkbox2Text}
                        </span>
                      </label>
                    </div>

                    {conditionsError && (
                      <div className="field-error-notice" role="alert" style={{ marginTop: "10px" }}>
                        <AlertCircle size={13} />
                        <span>{t.bothConditionsRequired}</span>
                      </div>
                    )}

                    <div className="game-checkout-actions">
                      <button
                        type="button"
                        className={"video-game-primary-btn w-full" + (!acceptCredentials || !accept2fa ? " disabled" : "")}
                        disabled={!acceptCredentials || !accept2fa}
                        onClick={handleStep1Continue}
                      >
                        {t.acceptAndContinue} <ArrowRight size={17} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Identifiants (Email, Mot de passe, WhatsApp) */}
                {checkoutStep === 2 && (
                  <div className="game-checkout-step">
                    {!isDirectFlow && (
                      <button
                        type="button"
                        className="video-game-back-btn"
                        onClick={() => {
                          playStep(false);
                          setCheckoutStep(1);
                        }}
                      >
                        <ArrowLeft size={16} /> {t.backToStep1}
                      </button>
                    )}

                    <div className="game-checkout-header" style={{ marginTop: "10px" }}>
                      <span className="game-step-kicker">{isDirectFlow ? (language === "fr" ? "Étape 1 sur 2" : "Step 1 of 2") : (language === "fr" ? "Étape 2 sur 3" : "Step 2 of 3")}</span>
                      <h3 className="game-modal-step-title">{selectedGame.id === "cod-mobile" ? (language === "fr" ? "Identifiants du joueur & Contact" : "Player Info & Contact") : t.step2Title}</h3>
                      <p className="video-game-form-hint">{selectedGame.id === "cod-mobile" ? (language === "fr" ? "Renseignez votre UID, Pseudo ou ID en jeu et votre numéro WhatsApp" : "Enter your in-game UID, Username or ID and WhatsApp number") : isDirectFlow ? (language === "fr" ? "Renseignez votre ID Joueur (UID) et votre numéro WhatsApp" : "Enter your Player UID and WhatsApp number") : t.step2Subtitle}</p>
                    </div>

                    {selectedGame.id === "cod-mobile" ? (
                      <>
                        {/* 1. UID / Pseudo ou ID du joueur */}
                        <label className="video-game-field">
                          <span className="video-game-field-label">
                            {language === "fr" ? "UID, Pseudo ou ID du joueur" : "Player UID, Username or ID"} <span className="required">*</span>
                          </span>
                          <div className="field-with-icon">
                            <User size={16} className="field-lead-icon" />
                            <input
                              ref={emailInputRef}
                              type="text"
                              value={epicEmail}
                              onChange={(e) => {
                                setEpicEmail(e.target.value);
                                if (epicEmailError && e.target.value.trim()) {
                                  setEpicEmailError(false);
                                }
                              }}
                              placeholder={language === "fr" ? "Ex: 6749123456789 ou Ghost_99" : "e.g. 6749123456789 or Ghost_99"}
                              className={"video-game-input with-icon " + (epicEmailError ? "has-error" : "")}
                              required
                            />
                          </div>
                          {epicEmailError && (
                            <span className="video-game-field-error">
                              <AlertCircle size={13} /> {language === "fr" ? "Veuillez renseigner votre UID, pseudo ou ID de joueur" : "Please enter your player UID, username or ID"}
                            </span>
                          )}
                        </label>

                        </>
                    ) : (
                      <>
    {/* Email Field */}
                    <label className="video-game-field">
                      <span className="video-game-field-label">
                        {selectedGame.id === "fortnite" ? t.epicEmail : selectedGame.identifierLabel[language]} <span className="required">*</span>
                      </span>
                      <div className="field-with-icon">
                        {(selectedGame.id === "free-fire" || selectedGame.id === "pubg-mobile" || selectedGame.id === "cod-mobile" || selectedGame.id === "blood-strike" || selectedGame.id === "ea-fc-mobile") ? <User size={16} className="field-lead-icon" /> : <Mail size={16} className="field-lead-icon" />}
                        <input
                          ref={emailInputRef}
                          type="email"
                          value={epicEmail}
                          onChange={(e) => {
                            setEpicEmail(e.target.value);
                            if (epicEmailError && e.target.value.trim()) {
                              setEpicEmailError(false);
                            }
                          }}
                          placeholder={selectedGame.id === "fortnite" ? t.emailPlaceholder : selectedGame.identifierPlaceholder[language]}
                          className={`video-game-input with-icon ${epicEmailError ? "has-error" : ""}`}
                          autoComplete={selectedGame.id === "fortnite" ? "email" : "off"}
                          required
                        />
                      </div>
                      {epicEmailError && (
                        <span className="video-game-field-error">
                          <AlertCircle size={13} /> {t.emailRequired}
                        </span>
                      )}
                    </label>

                    {/* Password Field */}
                    {selectedGame.requiresAccountPassword && (
                      <label className="video-game-field">
                        <span className="video-game-field-label">
                          {selectedGame.id === "fortnite" ? t.epicPassword : t.password} <span className="required">*</span>
                        </span>
                        <div className="field-with-icon field-password-wrap">
                          <LockKeyhole size={16} className="field-lead-icon" />
                          <input
                            ref={passwordInputRef}
                            type={showPassword ? "text" : "password"}
                            value={epicPassword}
                            onChange={(e) => {
                              setEpicPassword(e.target.value);
                              if (epicPasswordError && e.target.value.length >= 4) {
                                setEpicPasswordError(false);
                              }
                            }}
                            placeholder={t.passwordPlaceholder}
                            className={`video-game-input with-icon with-action ${epicPasswordError ? "has-error" : ""}`}
                            autoComplete="current-password"
                            required
                          />
                          <button
                            type="button"
                            className="toggle-password-btn"
                            onClick={() => {
                              playToggle(!showPassword);
                              setShowPassword(!showPassword);
                            }}
                            aria-label={showPassword ? t.hidePassword : t.showPassword}
                          >
                            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        </div>
                        {epicPasswordError && (
                          <span className="video-game-field-error">
                            <AlertCircle size={13} /> {t.passwordRequired}
                          </span>
                        )}
                      </label>
                    )}
                      </>
                    )}
                    {/* WhatsApp Field */}
                    <label className="video-game-field">
                      <span className="video-game-field-label">
                        {t.whatsappNumber} <span className="required">*</span>
                      </span>
                      <div className="video-game-phone-group">
                        <select
                          className="video-game-country-select"
                          value={countryCode}
                          onChange={(e) => {
                            const code = e.target.value;
                            setCountryCode(code);
                            if (dialCodes[code]) {
                              setDialCode(dialCodes[code]);
                            }
                          }}
                          aria-label="Code pays"
                        >
                          <optgroup label={t.popularCountries}>
                            {POPULAR_COUNTRIES.map((c) => (
                              <option key={`game-pop-${c.code}`} value={c.code}>
                                {c.flag} {c.dialCode} ({c.name})
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label={t.allCountries}>
                            {ALL_COUNTRIES.map((c) => (
                              <option key={`game-all-${c.code}`} value={c.code}>
                                {c.flag} {c.dialCode} ({c.name})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        <input
                          ref={whatsappInputRef}
                          type="tel"
                          value={whatsapp}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            setWhatsapp(val);
                            if (whatsappError && val.length >= 6) {
                              setWhatsappError(false);
                            }
                          }}
                          placeholder="6 00 00 00 00"
                          className={`video-game-input ${whatsappError ? "has-error" : ""}`}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="tel"
                          required
                        />
                      </div>
                      {whatsappError && (
                        <span className="video-game-field-error">
                          <AlertCircle size={13} /> {t.whatsappRequired}
                        </span>
                      )}
                    </label>

                    <div className="game-checkout-actions">
                      <button
                        type="button"
                        className="video-game-primary-btn w-full"
                        onClick={handleStep2Continue}
                      >
                        {t.continueToPayment} <ArrowRight size={17} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Recap & Paiement SoleasPay */}
                {checkoutStep === 3 && (
                  <div className="game-checkout-step">
                    <button
                      type="button"
                      className="video-game-back-btn"
                      onClick={() => {
                        playStep(false);
                        setCheckoutStep(2);
                      }}
                    >
                      <ArrowLeft size={16} /> {t.backToStep2}
                    </button>

                    <div className="game-checkout-header" style={{ marginTop: "10px" }}>
                      <span className="game-step-kicker">{isDirectFlow ? (language === "fr" ? "Étape 2 sur 2" : "Step 2 of 2") : (language === "fr" ? "Étape 3 sur 3" : "Step 3 of 3")}</span>
                      <h3 className="game-modal-step-title">{t.step3Title}</h3>
                    </div>

                    {/* Order Summary box / Free Fire compact recap */}
                    {selectedGame.id === "cod-mobile" ? (
                      <div className="freefire-direct-recap">
                        <div className="freefire-recap-item">
                          <span>Forfait :</span>
                          <strong style={{ color: "#22c55e", fontFamily: "inherit" }}>{activePack.name}</strong>
                        </div>
                        <div className="freefire-recap-item">
                          <span>Joueur / UID :</span>
                          <strong>{epicEmail.trim()}</strong>
                        </div>
                                                <div className="freefire-recap-item">
                          <span>WhatsApp :</span>
                          <strong>{formatFullPhoneNumber(whatsapp, dialCode)}</strong>
                        </div>
                        <div className="freefire-recap-item total">
                          <span>Total :</span>
                          <strong style={{ color: "#ff8c00" }}>{formatPrice(activePack.price, language)}</strong>
                        </div>
                      </div>
                    ) : isDirectFlow ? (
                      <div className="freefire-direct-recap">
                        <div className="freefire-recap-item">
                          <span>Forfait :</span>
                          <strong style={{ color: "#38bdf8", fontFamily: "inherit" }}>{activePack.name}</strong>
                        </div>
                        <div className="freefire-recap-item">
                          <span>ID :</span>
                          <strong>{epicEmail.trim()}</strong>
                        </div>
                        <div className="freefire-recap-item">
                          <span>WhatsApp :</span>
                          <strong>{formatFullPhoneNumber(whatsapp, dialCode)}</strong>
                        </div>
                        <div className="freefire-recap-item total">
                          <span>Total :</span>
                          <strong style={{ color: "#ff8c00" }}>{formatPrice(activePack.price, language)}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="video-game-order-summary">
                        <h3>{t.paymentSummary}</h3>
                        <div className="video-game-summary-row">
                          <span>Jeu</span>
                          <strong>{selectedGame.name}</strong>
                        </div>
                        <div className="video-game-summary-row">
                          <span>Forfait</span>
                          <strong>{activePack.name}</strong>
                        </div>
                        {activePack.bonus && (
                          <div className="video-game-summary-row">
                            <span>Bonus</span>
                            <strong style={{ color: "#0f8b4d" }}>{activePack.bonus}</strong>
                          </div>
                        )}
                        <div className="video-game-summary-row">
                          <span>{selectedGame.id === "fortnite" ? "Email Epic Games" : selectedGame.id === "cod-mobile" ? "UID / Pseudo ou ID" : "ID Joueur (UID)"}</span>
                          <code style={{ fontSize: "11px", wordBreak: "break-all" }}>{epicEmail.trim()}</code>
                        </div>
                        <div className="video-game-summary-row">
                          <span>WhatsApp</span>
                          <strong>{formatFullPhoneNumber(whatsapp, dialCode)}</strong>
                        </div>
                        <div className="video-game-summary-row total">
                          <span>{t.totalToPay}</span>
                          <strong>{formatPrice(activePack.price, language)}</strong>
                        </div>
                      </div>
                    )}

                    {/* Payment Section */}
                    <div className="video-game-payment-methods">
                      <span className="video-game-payment-notice">
                        <ShieldCheck size={16} /> {t.providerNotice}
                      </span>

                      {/* SoleasPay Mobile Money */}
                      <div className="video-game-provider-box">
                        <div className="video-game-provider-header">
                          <div>
                            <strong>{t.soleaspayTitle}</strong>
                            <p>{t.soleaspayDesc}</p>
                          </div>
                          <div className="soleaspay-logo-badge">
                            <Image
                              src={getAssetPath("/soleaspay-logo.png")}
                              alt="SoleasPay"
                              width={72}
                              height={26}
                              className="soleaspay-logo-img"
                            />
                          </div>
                        </div>

                        <SoleasPayCheckoutV3
                          language={language}
                          amount={activePack.price}
                          orderId={paymentOrderId}
                          description={`${selectedGame.name} - ${activePack.name}`}
                          username={epicEmail.trim()}
                          email={epicEmail.trim()}
                          password={epicPassword}
                          whatsapp={whatsapp}
                          dialCode={dialCode}
                          country={(() => {
                            const c = ALL_COUNTRIES.find((c) => c.code === countryCode);
                            return c ? `${c.flag} ${c.name} (${c.dialCode})` : countryCode;
                          })()}
                          coins={0}
                          productType="game"
                          productLabel={`${selectedGame.name}${selectedGame.id === "free-fire" && activeRegion ? " (" + activeRegion.name[language] + ")" : ""} - ${activePack.name}`}
                        />
                      </div>

                      {/* Direct WhatsApp Order */}
                      <div className="video-game-whatsapp-order-box">
                        <div className="video-game-whatsapp-header">
                          <FaWhatsapp size={22} className="whatsapp-green-icon" />
                          <div>
                            <strong>{t.orderViaWhatsapp}</strong>
                            <p>{t.orderViaWhatsappDesc}</p>
                          </div>
                        </div>
                        <a
                          href={directWhatsAppOrderHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="video-game-whatsapp-btn"
                        >
                          <FaWhatsapp size={17} /> Discuter & Valider sur WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  // RENDER CATALOGUE LIST VIEW
  return (
    <section className="video-games-section" id="games">
      <div className="video-games-heading desktop-only">
        <div>



          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>



      </div>

      {/* Filter and Search Bar */}
      <div className="video-games-filter-bar">
        <div className="video-games-categories-wrapper">
        <div className="video-games-categories" role="tablist" aria-label="Catégories de jeux" ref={categoriesNavRef}>
          <button
            type="button"
            role="tab"
            aria-selected={category === "all"}
            className={`video-games-cat-btn ${category === "all" ? "active" : ""}`}
            onClick={() => {
              playTap();
              setCategory("all");
            }}
          >
            <Gamepad2 size={15} /> {t.all}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={category === "mobile"}
            className={`video-games-cat-btn ${category === "mobile" ? "active" : ""}`}
            onClick={() => {
              playTap();
              setCategory("mobile");
            }}
          >
            <Smartphone size={15} /> {t.mobile}
          </button>
        </div>
        </div>

        <div className="video-games-search-box">
          <Search size={16} className="video-games-search-icon" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="video-games-search-input"
            aria-label={t.searchPlaceholder}
          />
          {searchQuery && (
            <button
              type="button"
              className="video-games-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Effacer la recherche"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Games Catalog Grid */}
      {filteredGames.length > 0 ? (
        <div className="video-games-grid">
          {filteredGames.map((game) => {
            const allPacks = (game.regions && game.regions[0]?.packs?.length) ? game.regions[0].packs : game.packs;
            const minPrice = allPacks.length > 0 ? Math.min(...allPacks.map((p) => p.price)) : 0;
            return (
              <div
                key={game.id}
                data-game-id={game.id} className={"video-game-card game-card-" + game.id}
                onClick={() => openGameDetail(game)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openGameDetail(game);
                  }
                }}
              >
                <div
                  className="video-game-card-hero"
                  style={{ background: game.colorGradient }}
                >
                  {game.badge && (
                    <span className="video-game-card-badge">
                      <Sparkles size={11} /> {game.badge[language]}
                    </span>
                  )}
                  <div className="video-game-card-icon-wrap">
                    {game.logoUrl ? (
                      <Image
                        src={getAssetPath(game.logoUrl)}
                        alt={game.name}
                        width={30}
                        height={30}
                        className="video-game-card-logo"
                      />
                    ) : (
                      <Gamepad2 size={26} />
                    )}
                  </div>
                  <div className="video-game-card-title-group">
                    <span className="video-game-card-publisher">{game.publisher}</span>
                    <h2 className="video-game-card-name">{game.name}</h2>
                  </div>
                </div>

                <div className="video-game-card-body">

                  <div className="video-game-card-meta">
                    <span className="video-game-currency-badge">
                      <Flame size={12} /> {game.currencyName[language]}
                    </span>
                    <span className="video-game-delivery-badge">
                      <span className="live-pulse-dot" aria-hidden="true" /> <Clock3 size={12} /> {game.deliveryTime[language]}
                    {minPrice > 0 && (
                      <span className="video-game-starting-price-badge">
                        {language === "fr" ? "Dès " : "From "}
                        <strong>{formatPrice(minPrice, language)}</strong>
                      </span>
                    )}
                    </span>
                  </div>
                  <div className="video-game-card-bottom">
                    <button
                      type="button"
                      className="video-game-card-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openGameDetail(game);
                      }}
                    >
                      {t.viewOffers} <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}</div
      >
      ) : (
        <div className="video-games-empty">
          <Gamepad2 size={44} className="video-games-empty-icon" />
          <p>{t.noGamesFound}</p>
          <button
            type="button"
            className="video-games-empty-btn"
            onClick={() => {
              setSearchQuery("");
              setCategory("all");
            }}
          >
            {t.resetSearch}
          </button>
        </div>
      )}

      {/* How it works info section */}














































    </section>
  );
}
