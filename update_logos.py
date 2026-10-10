
with open("app/components/games/VideoGamesSection.tsx", "r", encoding="utf-8") as f:
    v = f.read()

# 1. Update logoUrl for free-fire
v = v.replace(
    'badge: { fr: "Top Vente", en: "Best Seller" },\n    colorGradient: "linear-gradient(135deg, #ff4e00, #ff8c00)",',
    'badge: { fr: "Top Vente", en: "Best Seller" },\n    logoUrl: "/games/freefire-icon.png",\n    colorGradient: "linear-gradient(135deg, #ff4e00, #ff8c00)",'
)

# 2. Update logoUrl for pubg-mobile
v = v.replace(
    'badge: {\n      "fr": "Serveur Global",\n      "en": "Global Server"\n    },\n    "colorGradient": "linear-gradient(135deg, #d48b04, #f59e0b)",',
    'badge: {\n      "fr": "Serveur Global",\n      "en": "Global Server"\n    },\n    "logoUrl": "/games/pubg-icon.png",\n    "colorGradient": "linear-gradient(135deg, #d48b04, #f59e0b)",'
)

# 3. Update logoUrl for cod-mobile
v = v.replace(
    'badge: { fr: "Livraison 0-5 min", en: "0-5 min delivery" },\n    colorGradient: "linear-gradient(135deg, #15803d, #22c55e)",',
    'badge: { fr: "Livraison 0-5 min", en: "0-5 min delivery" },\n    logoUrl: "/games/cod-icon.png",\n    colorGradient: "linear-gradient(135deg, #15803d, #22c55e)",'
)

# 4. Update logoUrl for blood-strike
v = v.replace(
    'badge: {\n      "fr": "FPS Mobile",\n      "en": "Mobile FPS"\n    },\n    "colorGradient": "linear-gradient(135deg, #b91c1c, #ef4444)",',
    'badge: {\n      "fr": "FPS Mobile",\n      "en": "Mobile FPS"\n    },\n    "logoUrl": "/games/bloodstrike-icon.png",\n    "colorGradient": "linear-gradient(135deg, #b91c1c, #ef4444)",'
)

# 5. Update logoUrl for ea-fc-mobile
v = v.replace(
    'badge: {\n      "fr": "Football",\n      "en": "Football"\n    },\n    "colorGradient": "linear-gradient(135deg, #065f46, #059669)",',
    'badge: {\n      "fr": "Football",\n      "en": "Football"\n    },\n    "logoUrl": "/games/fcmobile-icon.png",\n    "colorGradient": "linear-gradient(135deg, #065f46, #059669)",'
)

with open("app/components/games/VideoGamesSection.tsx", "w", encoding="utf-8") as f:
    f.write(v)

print("Updated logoUrl for all 5 games in VideoGamesSection.tsx")

