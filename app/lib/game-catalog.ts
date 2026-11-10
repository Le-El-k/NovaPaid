export type Language = "fr" | "en";

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

