import os

file_path = os.path.join("app", "components", "games", "VideoGamesSection.tsx")
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update GameRegion definition
old_pack_type = '''export type GamePack = {
  id: string;
  name: string;
  quantity?: number;
  bonus?: string;
  price: number;
  badge?: string;
  popular?: boolean;
  image?: string;
};'''

new_pack_type = '''export type GamePack = {
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
};'''

content = content.replace(old_pack_type, new_pack_type)

# 2. Update GameItem to include regions?: GameRegion[]
old_game_item = '''  deliveryTime: { fr: string; en: string };
  packs: GamePack[];
};'''

new_game_item = '''  deliveryTime: { fr: string; en: string };
  packs: GamePack[];
  regions?: GameRegion[];
};'''

content = content.replace(old_game_item, new_game_item)

# 3. Replace Free Fire object with complete multi-region definition
old_ff = '''  {
    id: "free-fire",
    slug: "free-fire",
    name: "Free Fire",
    publisher: "Garena",
    category: "mobile",
    currencyName: { fr: "Diamants", en: "Diamonds" },
    badge: { fr: "Top Vente", en: "Best Seller" },
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
      fr: "Recharge directe de Diamants Free Fire sur votre compte de jeu. Livraison instantanée par Mobile Money.",
      en: "Instant Free Fire Diamonds top-up to your player account via Mobile Money.",
    },
    deliveryTime: { fr: "5 - 10 minutes", en: "5 - 10 minutes" },
    packs: [
      { id: "ff-110", name: "110 Diamants", price: 850 },
      { id: "ff-341", name: "341 Diamants", price: 2400, bonus: "+31 bonus" },
      { id: "ff-572", name: "572 Diamants", price: 3950, bonus: "+52 bonus", popular: true, badge: "Populaire" },
      { id: "ff-1188", name: "1 188 Diamants", price: 7900, bonus: "+108 bonus" },
      { id: "ff-2420", name: "2 420 Diamants", price: 15500, bonus: "+220 bonus" },
      { id: "ff-booyah", name: "Passe Booyah", price: 3200, badge: "Pass Saison" },
    ],
  },'''

new_ff = '''  {
    id: "free-fire",
    slug: "free-fire",
    name: "Free Fire",
    publisher: "Garena",
    category: "mobile",
    currencyName: { fr: "Diamants", en: "Diamonds" },
    badge: { fr: "Top Vente", en: "Best Seller" },
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
      fr: "Recharge directe de Diamants Free Fire sur votre compte de jeu selon votre région (Afrique, LAM, Europe). Livraison instantanée par Mobile Money.",
      en: "Direct Free Fire Diamonds top-up for your game region (General, Latin America, Europe). Delivered via Mobile Money.",
    },
    deliveryTime: { fr: "5 - 10 minutes", en: "5 - 10 minutes" },
    packs: [
      { id: "ff-gen-100", name: "100 Diamants", price: 1050, image: "/freefire/diamonds-100.png" },
      { id: "ff-gen-310", name: "310 Diamants", price: 3575, image: "/freefire/diamonds-310.png" },
      { id: "ff-gen-520", name: "520 Diamants", price: 5650, popular: true, badge: "Populaire", image: "/freefire/diamonds-520.png" },
      { id: "ff-gen-1060", name: "1060 Diamants", price: 11300, image: "/freefire/diamonds-1060.png" },
      { id: "ff-gen-2180", name: "2180 Diamants", price: 21750, image: "/freefire/diamonds-2180.png" },
      { id: "ff-gen-5600", name: "5600 Diamants", price: 59050, image: "/freefire/diamonds-5600.png" },
      { id: "ff-gen-7290", name: "7290 Diamants", price: 59900, badge: "Top Promo", image: "/freefire/diamonds-7290.png" },
      { id: "ff-gen-11500", name: "11500 Diamants", price: 109100, image: "/freefire/diamonds-11500.png" },
      { id: "ff-gen-weekly", name: "Abonnement Hebdomadaire ×1", price: 2250, badge: "Pass Hebdo", image: "/freefire/weekly-pass.png" },
      { id: "ff-gen-monthly", name: "Monthly Membership ×1", price: 8720, badge: "Pass Mensuel", image: "/freefire/monthly-pass.png" },
      { id: "ff-gen-booyah", name: "Booyah Pass Premium", price: 5775, badge: "Booyah Pass", image: "/freefire/booyah-pass.png" },
    ],
    regions: [
      {
        id: "general",
        name: { fr: "Régions générales", en: "General Regions" },
        flag: "🌐",
        badge: "Recommandé",
        packs: [
          { id: "ff-gen-100", name: "100 Diamants", price: 1050, image: "/freefire/diamonds-100.png" },
          { id: "ff-gen-310", name: "310 Diamants", price: 3575, image: "/freefire/diamonds-310.png" },
          { id: "ff-gen-520", name: "520 Diamants", price: 5650, popular: true, badge: "Populaire", image: "/freefire/diamonds-520.png" },
          { id: "ff-gen-1060", name: "1060 Diamants", price: 11300, image: "/freefire/diamonds-1060.png" },
          { id: "ff-gen-2180", name: "2180 Diamants", price: 21750, image: "/freefire/diamonds-2180.png" },
          { id: "ff-gen-5600", name: "5600 Diamants", price: 59050, image: "/freefire/diamonds-5600.png" },
          { id: "ff-gen-7290", name: "7290 Diamants", price: 59900, badge: "Top Promo", image: "/freefire/diamonds-7290.png" },
          { id: "ff-gen-11500", name: "11500 Diamants", price: 109100, image: "/freefire/diamonds-11500.png" },
          { id: "ff-gen-weekly", name: "Abonnement Hebdomadaire ×1", price: 2250, badge: "Pass Hebdo", image: "/freefire/weekly-pass.png" },
          { id: "ff-gen-monthly", name: "Monthly Membership ×1", price: 8720, badge: "Pass Mensuel", image: "/freefire/monthly-pass.png" },
          { id: "ff-gen-booyah", name: "Booyah Pass Premium", price: 5775, badge: "Booyah Pass", image: "/freefire/booyah-pass.png" },
        ],
      },
      {
        id: "lam",
        name: { fr: "LAM (Amérique latine)", en: "LAM (Latin America)" },
        flag: "🌎",
        packs: [
          { id: "ff-lam-100", name: "100 Diamants", price: 1200, image: "/freefire/diamonds-100.png" },
          { id: "ff-lam-310", name: "310 Diamants", price: 3000, image: "/freefire/diamonds-310.png" },
          { id: "ff-lam-520", name: "520 Diamants", price: 5000, popular: true, badge: "Populaire", image: "/freefire/diamonds-520.png" },
          { id: "ff-lam-1060", name: "1060 Diamants", price: 9050, image: "/freefire/diamonds-1060.png" },
          { id: "ff-lam-2180", name: "2180 Diamants", price: 17500, image: "/freefire/diamonds-2180.png" },
          { id: "ff-lam-5600", name: "5600 Diamants", price: 44600, image: "/freefire/diamonds-5600.png" },
          { id: "ff-lam-7290", name: "7290 Diamants", price: 52200, image: "/freefire/diamonds-7290.png" },
          { id: "ff-lam-11500", name: "11500 Diamants", price: 88900, image: "/freefire/diamonds-11500.png" },
          { id: "ff-lam-lite", name: "Weekly Lite ×1", price: 925, badge: "Weekly Lite", image: "/freefire/weekly-lite.png" },
          { id: "ff-lam-weekly", name: "Abonnement Hebdomadaire ×1", price: 2750, badge: "Pass Hebdo", image: "/freefire/weekly-pass.png" },
          { id: "ff-lam-monthly", name: "Monthly Membership ×1", price: 12250, badge: "Pass Mensuel", image: "/freefire/monthly-pass.png" },
          { id: "ff-lam-booyah", name: "Booyah Pass Premium", price: 4675, badge: "Booyah Pass", image: "/freefire/booyah-pass.png" },
        ],
      },
      {
        id: "eu",
        name: { fr: "UE (Europe)", en: "EU (Europe)" },
        flag: "🇪🇺",
        packs: [
          { id: "ff-eu-100", name: "100 Diamants", price: 1630, image: "/freefire/diamonds-100.png" },
          { id: "ff-eu-310", name: "310 Diamants", price: 4570, image: "/freefire/diamonds-310.png" },
          { id: "ff-eu-520", name: "520 Diamants", price: 6130, popular: true, badge: "Populaire", image: "/freefire/diamonds-520.png" },
          { id: "ff-eu-1060", name: "1060 Diamants", price: 12015, image: "/freefire/diamonds-1060.png" },
          { id: "ff-eu-2180", name: "2180 Diamants", price: 26600, image: "/freefire/diamonds-2180.png" },
          { id: "ff-eu-5600", name: "5600 Diamants", price: 66300, image: "/freefire/diamonds-5600.png" },
          { id: "ff-eu-7290", name: "7290 Diamants", price: 75900, image: "/freefire/diamonds-7290.png" },
          { id: "ff-eu-11500", name: "11500 Diamants", price: 127200, image: "/freefire/diamonds-11500.png" },
          { id: "ff-eu-lite", name: "Weekly Lite ×1", price: 580, badge: "Weekly Lite", image: "/freefire/weekly-lite.png" },
          { id: "ff-eu-weekly", name: "Abonnement Hebdomadaire ×1", price: 2600, badge: "Pass Hebdo", image: "/freefire/weekly-pass.png" },
          { id: "ff-eu-monthly", name: "Monthly Membership ×1", price: 9635, badge: "Pass Mensuel", image: "/freefire/monthly-pass.png" },
        ],
      },
      {
        id: "br",
        name: { fr: "BR (Brésil)", en: "BR (Brazil)" },
        flag: "🇧🇷",
        packs: [
          { id: "ff-br-100", name: "100 Diamants", price: 1200, image: "/freefire/diamonds-100.png" },
          { id: "ff-br-310", name: "310 Diamants", price: 3000, image: "/freefire/diamonds-310.png" },
          { id: "ff-br-520", name: "520 Diamants", price: 5000, popular: true, badge: "Populaire", image: "/freefire/diamonds-520.png" },
          { id: "ff-br-1060", name: "1060 Diamants", price: 9050, image: "/freefire/diamonds-1060.png" },
          { id: "ff-br-2180", name: "2180 Diamants", price: 17500, image: "/freefire/diamonds-2180.png" },
          { id: "ff-br-5600", name: "5600 Diamants", price: 44600, image: "/freefire/diamonds-5600.png" },
          { id: "ff-br-7290", name: "7290 Diamants", price: 52200, image: "/freefire/diamonds-7290.png" },
          { id: "ff-br-11500", name: "11500 Diamants", price: 88900, image: "/freefire/diamonds-11500.png" },
        ],
      },
      {
        id: "mena",
        name: { fr: "Moyen-Orient et Afrique du Nord", en: "Middle East & North Africa" },
        flag: "🌍",
        packs: [
          { id: "ff-mena-100", name: "100 Diamants", price: 1050, image: "/freefire/diamonds-100.png" },
          { id: "ff-mena-310", name: "310 Diamants", price: 3575, image: "/freefire/diamonds-310.png" },
          { id: "ff-mena-520", name: "520 Diamants", price: 5650, popular: true, badge: "Populaire", image: "/freefire/diamonds-520.png" },
          { id: "ff-mena-1060", name: "1060 Diamants", price: 11300, image: "/freefire/diamonds-1060.png" },
          { id: "ff-mena-2180", name: "2180 Diamants", price: 21750, image: "/freefire/diamonds-2180.png" },
          { id: "ff-mena-5600", name: "5600 Diamants", price: 59050, image: "/freefire/diamonds-5600.png" },
          { id: "ff-mena-7290", name: "7290 Diamants", price: 59900, image: "/freefire/diamonds-7290.png" },
          { id: "ff-mena-11500", name: "11500 Diamants", price: 109100, image: "/freefire/diamonds-11500.png" },
        ],
      },
      {
        id: "sg",
        name: { fr: "SG/MY/PH/KH", en: "SG/MY/PH/KH" },
        flag: "🇸🇬",
        packs: [
          { id: "ff-sg-100", name: "100 Diamants", price: 1050, image: "/freefire/diamonds-100.png" },
          { id: "ff-sg-310", name: "310 Diamants", price: 3575, image: "/freefire/diamonds-310.png" },
          { id: "ff-sg-520", name: "520 Diamants", price: 5650, popular: true, badge: "Populaire", image: "/freefire/diamonds-520.png" },
          { id: "ff-sg-1060", name: "1060 Diamants", price: 11300, image: "/freefire/diamonds-1060.png" },
          { id: "ff-sg-2180", name: "2180 Diamants", price: 21750, image: "/freefire/diamonds-2180.png" },
          { id: "ff-sg-5600", name: "5600 Diamants", price: 59050, image: "/freefire/diamonds-5600.png" },
          { id: "ff-sg-7290", name: "7290 Diamants", price: 59900, image: "/freefire/diamonds-7290.png" },
          { id: "ff-sg-11500", name: "11500 Diamants", price: 109100, image: "/freefire/diamonds-11500.png" },
        ],
      },
      {
        id: "id",
        name: { fr: "ID (Indonésie)", en: "ID (Indonesia)" },
        flag: "🇮🇩",
        packs: [
          { id: "ff-id-100", name: "100 Diamants", price: 1050, image: "/freefire/diamonds-100.png" },
          { id: "ff-id-310", name: "310 Diamants", price: 3575, image: "/freefire/diamonds-310.png" },
          { id: "ff-id-520", name: "520 Diamants", price: 5650, popular: true, badge: "Populaire", image: "/freefire/diamonds-520.png" },
          { id: "ff-id-1060", name: "1060 Diamants", price: 11300, image: "/freefire/diamonds-1060.png" },
          { id: "ff-id-2180", name: "2180 Diamants", price: 21750, image: "/freefire/diamonds-2180.png" },
          { id: "ff-id-5600", name: "5600 Diamants", price: 59050, image: "/freefire/diamonds-5600.png" },
          { id: "ff-id-7290", name: "7290 Diamants", price: 59900, image: "/freefire/diamonds-7290.png" },
          { id: "ff-id-11500", name: "11500 Diamants", price: 109100, image: "/freefire/diamonds-11500.png" },
        ],
      },
      {
        id: "th",
        name: { fr: "TH (Thaïlande)", en: "TH (Thailand)" },
        flag: "🇹🇭",
        packs: [
          { id: "ff-th-100", name: "100 Diamants", price: 1050, image: "/freefire/diamonds-100.png" },
          { id: "ff-th-310", name: "310 Diamants", price: 3575, image: "/freefire/diamonds-310.png" },
          { id: "ff-th-520", name: "520 Diamants", price: 5650, popular: true, badge: "Populaire", image: "/freefire/diamonds-520.png" },
          { id: "ff-th-1060", name: "1060 Diamants", price: 11300, image: "/freefire/diamonds-1060.png" },
          { id: "ff-th-2180", name: "2180 Diamants", price: 21750, image: "/freefire/diamonds-2180.png" },
          { id: "ff-th-5600", name: "5600 Diamants", price: 59050, image: "/freefire/diamonds-5600.png" },
          { id: "ff-th-7290", name: "7290 Diamants", price: 59900, image: "/freefire/diamonds-7290.png" },
          { id: "ff-th-11500", name: "11500 Diamants", price: 109100, image: "/freefire/diamonds-11500.png" },
        ],
      },
    ],
  },'''

content = content.replace(old_ff, new_ff)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Free fire definition updated successfully!")

