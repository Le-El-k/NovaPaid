import { packs as defaultTikTokPacks } from "./catalog.ts";
import { gamesCatalog } from "./game-catalog.ts";

export type ShopOffer = {
  id: string;
  name: string;
  priceXaf: number;
  quantity?: number;
  bonus?: string;
};

export type ShopProduct = {
  id: number;
  sectionId: number;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  badge: string;
  customerLabel: string;
  requiresPassword: boolean;
  sortOrder: number;
  isActive: boolean;
  offers: ShopOffer[];
};

export type ShopSection = {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  products: ShopProduct[];
};

export const initialShopSections = [
  {
    slug: "pieces-tiktok",
    name: "Pièces TikTok",
    description: "Choisissez un pack de pièces à créditer sur votre compte TikTok.",
    icon: "coins",
    sortOrder: 10,
  },
  {
    slug: "jeux-video",
    name: "Jeux vidéo",
    description: "Sélectionnez un jeu, puis le forfait qui correspond à votre compte.",
    icon: "gamepad-2",
    sortOrder: 20,
  },
  {
    slug: "connexion-internet",
    name: "Connexion internet",
    description: "Des forfaits internet rapides et stables, de 1 Go à l’illimité.",
    icon: "wifi",
    sortOrder: 30,
  },
] as const;

export const initialShopProducts = [
  {
    sectionSlug: "pieces-tiktok",
    slug: "recharge-tiktok",
    name: "Recharge TikTok",
    subtitle: "Pièces officielles pour votre compte",
    description: "Choisissez le montant à créditer sur votre compte TikTok.",
    imageUrl: "",
    badge: "",
    customerLabel: "Identifiant TikTok",
    requiresPassword: true,
    sortOrder: 10,
    offers: defaultTikTokPacks.map((pack) => ({
      id: pack.id,
      name: `${new Intl.NumberFormat("fr-FR").format(pack.coins)} pièces`,
      quantity: pack.coins,
      ...(pack.bonus ? { bonus: `+${new Intl.NumberFormat("fr-FR").format(pack.bonus)} offertes` } : {}),
      priceXaf: pack.price,
    })),
  },
  ...gamesCatalog.flatMap((game, gameIndex) => {
    const imageBySlug: Record<string, string> = {
      fortnite: "/fortnite/card-800.png",
      "free-fire": "/games/freefire-icon.png",
      "pubg-mobile": "/games/pubg-icon.png",
      "cod-mobile": "/games/cod-icon.png",
      "blood-strike": "/games/bloodstrike-icon.png",
      "ea-fc-mobile": "/games/fcmobile-icon.png",
    };
    const regions = game.regions?.length
      ? game.regions
      : [{ id: "general", name: { fr: "", en: "" }, packs: game.packs }];
    return regions.filter((region) => region.packs.length > 0).map((region, regionIndex) => ({
      sectionSlug: "jeux-video",
      slug: regions.length > 1 ? `${game.slug}-${region.id}` : game.slug,
      name: regions.length > 1 ? `${game.name} · ${region.name.fr}` : game.name,
      subtitle: `${game.currencyName.fr} · ${game.publisher}`,
      description: game.description.fr,
      imageUrl: imageBySlug[game.slug] || game.logoUrl || "",
      badge: game.badge?.fr || "",
      customerLabel: game.identifierLabel.fr,
      requiresPassword: Boolean(game.requiresAccountPassword),
      sortOrder: (gameIndex + 1) * 10 + regionIndex,
      offers: region.packs.map((pack) => ({
        id: pack.id,
        name: pack.name,
        priceXaf: pack.price,
        ...(pack.quantity ? { quantity: pack.quantity } : {}),
        ...(pack.bonus ? { bonus: pack.bonus } : {}),
      })),
    }));
  }),
  {
    sectionSlug: "connexion-internet",
    slug: "forfaits-courte-duree",
    name: "Forfaits courte durée",
    subtitle: "Pass Flash & journaliers",
    description: "Des forfaits rapides pour rester connecté au quotidien.",
    imageUrl: "",
    badge: "Jusqu’à 15 Mbit/s",
    customerLabel: "Numéro à recharger",
    requiresPassword: false,
    sortOrder: 10,
    offers: [
      { id: "internet-1-go-24h", name: "1 Go · 24 heures", quantity: 1, priceXaf: 250 },
      { id: "internet-2-5-go-24h", name: "2,5 Go · 24 heures", quantity: 1, priceXaf: 500 },
      { id: "internet-5-go-3j", name: "5 Go · 3 jours", quantity: 1, priceXaf: 1000 },
    ],
  },
  {
    sectionSlug: "connexion-internet",
    slug: "forfaits-hebdomadaires",
    name: "Forfaits hebdomadaires",
    subtitle: "Forfaits 7 à 14 jours",
    description: "Choisissez le volume et la durée adaptés à votre semaine.",
    imageUrl: "",
    badge: "Populaire",
    customerLabel: "Numéro à recharger",
    requiresPassword: false,
    sortOrder: 20,
    offers: [
      { id: "internet-4-go-7j", name: "4 Go · 7 jours", quantity: 1, priceXaf: 1000 },
      { id: "internet-10-go-7j", name: "10 Go · 7 jours", quantity: 1, priceXaf: 1600 },
      { id: "internet-illimite-7j", name: "Illimité · 7 jours", quantity: 1, priceXaf: 3600 },
      { id: "internet-illimite-14j", name: "Illimité · 14 jours", quantity: 1, priceXaf: 7000 },
    ],
  },
  {
    sectionSlug: "connexion-internet",
    slug: "forfaits-mensuels",
    name: "Forfaits mensuels",
    subtitle: "Usage personnel · 30 jours",
    description: "Un forfait mensuel pour vos usages internet personnels.",
    imageUrl: "",
    badge: "30 jours",
    customerLabel: "Numéro à recharger",
    requiresPassword: false,
    sortOrder: 30,
    offers: [
      { id: "internet-25-go-30j", name: "25 Go · 30 jours", quantity: 1, priceXaf: 3500 },
      { id: "internet-60-go-30j", name: "60 Go · 30 jours", quantity: 1, priceXaf: 7000 },
      { id: "internet-illimite-maxi-30j", name: "Illimité / Maxi · 30 jours", quantity: 1, priceXaf: 14000 },
    ],
  },
];
