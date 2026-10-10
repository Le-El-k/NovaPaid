export type PackBadge = "popular" | "creator";

export type Pack = {
  id: string;
  coins: number;
  bonus?: number;
  price: number;
  badge?: PackBadge;
};

export const packs: Pack[] = [
  { id: "mini", coins: 100, price: 1_124 },
  { id: "starter", coins: 350, price: 3_900 },
  { id: "boost", coins: 700, bonus: 70, price: 7_900, badge: "popular" },
  { id: "live", coins: 1_400, bonus: 140, price: 15_700 },
  { id: "creator", coins: 3_500, bonus: 350, price: 39_300, badge: "creator" },
  { id: "max", coins: 7_000, bonus: 700, price: 78_700 },
];
