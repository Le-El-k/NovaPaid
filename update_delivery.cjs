const fs = require("fs");

// 1. Update VideoGamesSection.tsx
let vg = fs.readFileSync("app/components/games/VideoGamesSection.tsx", "utf8");

// Fortnite: 10 - 20 minutes
vg = vg.replace(
  'deliveryTime: { fr: "5 - 15 minutes", en: "5 - 15 minutes" },',
  'deliveryTime: { fr: "10 - 20 minutes", en: "10 - 20 minutes" },'
);

// Free Fire: 2 - 7 minutes
vg = vg.replace(
  'deliveryTime: { fr: "5 - 10 minutes", en: "5 - 10 minutes" },',
  'deliveryTime: { fr: "2 - 7 minutes", en: "2 - 7 minutes" },'
);

// PUBG Mobile: 2 - 7 minutes
const pubgIndex = vg.indexOf('"pubg-mobile"');
if (pubgIndex !== -1) {
  const pubgDelivIdx = vg.indexOf('"deliveryTime": {', pubgIndex);
  const pubgEndIdx = vg.indexOf('},', pubgDelivIdx);
  const newPubgDeliv = '"deliveryTime": {
      "fr": "2 - 7 minutes",
      "en": "2 - 7 minutes"
    },';
  vg = vg.slice(0, pubgDelivIdx) + newPubgDeliv + vg.slice(pubgEndIdx + 2);
}

// COD: 2 - 5 minutes
vg = vg.replace(
  'badge: { fr: "Livraison 0-5 min", en: "0-5 min delivery" },',
  'badge: { fr: "Livraison 2-5 min", en: "2-5 min delivery" },'
);
vg = vg.replace(
  /Visible sur votre profil joueur dans Call of Duty: Mobile. Délai de livraison : environ [0-9]+ à [0-9]+ minutes./g,
  'Visible sur votre profil joueur dans Call of Duty: Mobile. Délai de livraison : environ 2 à 5 minutes.'
);
vg = vg.replace(
  /Found in your player profile in Call of Duty: Mobile. Delivery time: [0-9]+ to [0-9]+ minutes./g,
  'Found in your player profile in Call of Duty: Mobile. Delivery time: 2 to 5 minutes.'
);
vg = vg.replace(
  /Recharge officielle de Points COD (CP) pour Call of Duty: Mobile par UID Joueur. Délai garanti : environ [0-9]+ à [0-9]+ minutes./g,
  'Recharge officielle de Points COD (CP) pour Call of Duty: Mobile par UID Joueur. Délai garanti : environ 2 à 5 minutes.'
);
vg = vg.replace(
  /Official COD Points (CP) top-up for Call of Duty: Mobile by Player UID. Guaranteed delivery time: [0-9]+ to [0-9]+ minutes./g,
  'Official COD Points (CP) top-up for Call of Duty: Mobile by Player UID. Guaranteed delivery time: 2 to 5 minutes.'
);
vg = vg.replace(
  'deliveryTime: { fr: "0 - 5 minutes", en: "0 - 5 minutes" },',
  'deliveryTime: { fr: "2 - 5 minutes", en: "2 - 5 minutes" },'
);

// Blood Strike: 1 - 5 minutes
const bsIndex = vg.indexOf('"blood-strike"');
if (bsIndex !== -1) {
  const bsDelivIdx = vg.indexOf('"deliveryTime": {', bsIndex);
  const bsEndIdx = vg.indexOf('},', bsDelivIdx);
  const newBsDeliv = '"deliveryTime": {
      "fr": "1 - 5 minutes",
      "en": "1 - 5 minutes"
    },';
  vg = vg.slice(0, bsDelivIdx) + newBsDeliv + vg.slice(bsEndIdx + 2);
}

// FC Mobile: 3 - 8 minutes
const fcIndex = vg.indexOf('"ea-fc-mobile"');
if (fcIndex !== -1) {
  const fcDelivIdx = vg.indexOf('"deliveryTime": {', fcIndex);
  const fcEndIdx = vg.indexOf('},', fcDelivIdx);
  const newFcDeliv = '"deliveryTime": {
      "fr": "3 - 8 minutes",
      "en": "3 - 8 minutes"
    },';
  vg = vg.slice(0, fcDelivIdx) + newFcDeliv + vg.slice(fcEndIdx + 2);
}

fs.writeFileSync("app/components/games/VideoGamesSection.tsx", vg, "utf8");
console.log("Updated VideoGamesSection.tsx!");

// 2. Update send-order-email.ts
let email = fs.readFileSync("app/lib/payments/send-order-email.ts", "utf8");
email = email.replace(
  "- DÉLAI LIVRAISON : environ 0 à 5 minutes",
  "- DÉLAI LIVRAISON : environ 2 à 5 minutes"
);
email = email.replace(
  "Commande COD Mobile confirmée (Délai : 0-5 min)",
  "Commande COD Mobile confirmée (Délai : 2-5 min)"
);
fs.writeFileSync("app/lib/payments/send-order-email.ts", email, "utf8");
console.log("Updated send-order-email.ts!");
