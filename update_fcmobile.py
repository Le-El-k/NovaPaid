import sys

# 1. Update VideoGamesSection.tsx
with open("app/components/games/VideoGamesSection.tsx", "r", encoding="utf-8") as f:
    v = f.read()

# Replace ea-fc-mobile packs in gamesCatalog
fc_old_packs = '''    "packs": [\n      {\n        "id": "fc-500",\n        "name": "500 Points FC",\n        "price": 3900\n      },\n      {\n        "id": "fc-1050",\n        "name": "1 050 Points FC",\n        "price": 7800,\n        "popular": true,\n        "badge": "Populaire"\n      },\n      {\n        "id": "fc-2200",\n        "name": "2 200 Points FC",\n        "price": 15500\n      },\n      {\n        "id": "fc-5750",\n        "name": "5 750 Points FC",\n        "price": 38000,\n        "badge": "Top Promo"\n      },\n      {\n        "id": "fc-12000",\n        "name": "12 000 Points FC",\n        "price": 75000,\n        "badge": "Pro Pack"\n      }\n    ]'''

fc_new_packs = '''    "packs": [\n      {\n        "id": "fc-100",\n        "name": "100 Points FC",\n        "price": 990,\n        "image": "/fcmobile/fc-100.png"\n      },\n      {\n        "id": "fc-520",\n        "name": "520 Points FC",\n        "price": 4930,\n        "popular": true,\n        "badge": "Populaire",\n        "image": "/fcmobile/fc-520.png"\n      },\n      {\n        "id": "fc-1070",\n        "name": "1 070 Points FC",\n        "price": 9970,\n        "image": "/fcmobile/fc-1070.png"\n      },\n      {\n        "id": "fc-2200",\n        "name": "2 200 Points FC",\n        "price": 20050,\n        "image": "/fcmobile/fc-2200.png"\n      },\n      {\n        "id": "fc-5750",\n        "name": "5 750 Points FC",\n        "price": 49990,\n        "badge": "Top Promo",\n        "image": "/fcmobile/fc-5750.png"\n      },\n      {\n        "id": "fc-12000",\n        "name": "12 000 Points FC",\n        "price": 99390,\n        "badge": "Méga Pack",\n        "image": "/fcmobile/fc-12000.png"\n      }\n    ]'''

if fc_old_packs in v:
    v = v.replace(fc_old_packs, fc_new_packs)
    print("Replaced ea-fc-mobile packs")
else:
    print("Could not find fc_old_packs exact string")

# Add ea-fc-mobile to isDirectFlow and other checks
v = v.replace(
    'const isDirect = selectedGame?.id === "free-fire" || selectedGame?.id === "pubg-mobile" || selectedGame?.id === "cod-mobile" || selectedGame?.id === "blood-strike" || selectedGame?.id === "blood-strike";',
    'const isDirect = selectedGame?.id === "free-fire" || selectedGame?.id === "pubg-mobile" || selectedGame?.id === "cod-mobile" || selectedGame?.id === "blood-strike" || selectedGame?.id === "ea-fc-mobile";'
)

v = v.replace(
    'setCheckoutStep((selectedGame?.id === "free-fire" || selectedGame?.id === "pubg-mobile" || selectedGame?.id === "cod-mobile" || selectedGame?.id === "blood-strike" || selectedGame?.id === "blood-strike") ? 2 : 1);',
    'setCheckoutStep((selectedGame?.id === "free-fire" || selectedGame?.id === "pubg-mobile" || selectedGame?.id === "cod-mobile" || selectedGame?.id === "blood-strike" || selectedGame?.id === "ea-fc-mobile") ? 2 : 1);'
)

v = v.replace(
    'const isDirectFlow = selectedGame.id === "free-fire" || selectedGame.id === "pubg-mobile" || selectedGame.id === "cod-mobile" || selectedGame.id === "blood-strike" || selectedGame.id === "blood-strike";',
    'const isDirectFlow = selectedGame.id === "free-fire" || selectedGame.id === "pubg-mobile" || selectedGame.id === "cod-mobile" || selectedGame.id === "blood-strike" || selectedGame.id === "ea-fc-mobile";'
)

v = v.replace(
    'selectedGame.id === "free-fire" || selectedGame.id === "pubg-mobile" || selectedGame.id === "cod-mobile" || selectedGame.id === "blood-strike" || selectedGame.id === "blood-strike") ? "freefire-pack-grid" : ""',
    'selectedGame.id === "free-fire" || selectedGame.id === "pubg-mobile" || selectedGame.id === "cod-mobile" || selectedGame.id === "blood-strike" || selectedGame.id === "ea-fc-mobile") ? "freefire-pack-grid" : ""'
)

v = v.replace(
    'if (selectedGame.id === "free-fire" || selectedGame.id === "pubg-mobile" || selectedGame.id === "cod-mobile" || selectedGame.id === "blood-strike" || selectedGame.id === "blood-strike") {\n                const isPubg = selectedGame.id === "pubg-mobile";\n                const isCod = selectedGame.id === "cod-mobile";\n                const isBs = selectedGame.id === "blood-strike";\n                  return (\n                    <button\n                      type="button"\n                      key={pack.id}\n                      className={(isBs ? "bloodstrike-card " : isCod ? "cod-card " : isPubg ? "pubg-card " : "freefire-card ")',
    'if (selectedGame.id === "free-fire" || selectedGame.id === "pubg-mobile" || selectedGame.id === "cod-mobile" || selectedGame.id === "blood-strike" || selectedGame.id === "ea-fc-mobile") {\n                const isPubg = selectedGame.id === "pubg-mobile";\n                const isCod = selectedGame.id === "cod-mobile";\n                const isBs = selectedGame.id === "blood-strike";\n                const isFc = selectedGame.id === "ea-fc-mobile";\n                  return (\n                    <button\n                      type="button"\n                      key={pack.id}\n                      className={(isFc ? "fcmobile-card " : isBs ? "bloodstrike-card " : isCod ? "cod-card " : isPubg ? "pubg-card " : "freefire-card ")'
)

v = v.replace(
    '(selectedGame.id === "free-fire" || selectedGame.id === "pubg-mobile" || selectedGame.id === "cod-mobile" || selectedGame.id === "blood-strike" || selectedGame.id === "blood-strike") ? <User size={16} className="field-lead-icon" /> : <Mail size={16} className="field-lead-icon" />',
    '(selectedGame.id === "free-fire" || selectedGame.id === "pubg-mobile" || selectedGame.id === "cod-mobile" || selectedGame.id === "blood-strike" || selectedGame.id === "ea-fc-mobile") ? <User size={16} className="field-lead-icon" /> : <Mail size={16} className="field-lead-icon" />'
)

v = v.replace(
    '`- ${selectedGame.id === "fortnite" ? "Email Epic Games" : selectedGame.id === "free-fire" ? "UID Free Fire" : "Compte"} : ${idVal}`',
    '`- ${selectedGame.id === "fortnite" ? "Email Epic Games" : selectedGame.id === "free-fire" ? "UID Free Fire" : selectedGame.id === "ea-fc-mobile" ? "UID EA FC Mobile" : "Compte"} : ${idVal}`'
)

with open("app/components/games/VideoGamesSection.tsx", "w", encoding="utf-8") as f:
    f.write(v)
print("VideoGamesSection.tsx updated")

# 2. Update send-order-email.ts
with open("app/lib/payments/send-order-email.ts", "r", encoding="utf-8") as f:
    em = f.read()

em = em.replace(
    'const isBloodStrike = label.includes("blood strike");',
    'const isBloodStrike = label.includes("blood strike");\n  const isFcMobile = label.includes("ea sports fc") || label.includes("fc mobile") || label.includes("points fc");'
)

em = em.replace(
    'const bloodStrikeRechargeLink = "https://manabuy.com/fr/blood-strike-top-up";',
    'const bloodStrikeRechargeLink = "https://manabuy.com/fr/blood-strike-top-up";\n  const fcMobileRechargeLink = "https://manabuy.com/fr/ea-sports-fc-mobile-soccer-top-up";'
)

em = em.replace(
    '} else if (isBloodStrike) {\n    credentialsInfo = `\\n- ID Joueur Blood Strike (UID) : ${checkout.username || "Non renseigné"}\\n- LIEN DE RECHARGE MANABUY : ${bloodStrikeRechargeLink}`;',
    '} else if (isBloodStrike) {\n    credentialsInfo = `\\n- ID Joueur Blood Strike (UID) : ${checkout.username || "Non renseigné"}\\n- LIEN DE RECHARGE MANABUY : ${bloodStrikeRechargeLink}`;\n  } else if (isFcMobile) {\n    credentialsInfo = `\\n- UID Joueur EA FC Mobile : ${checkout.username || "Non renseigné"}\\n- LIEN DE RECHARGE MANABUY : ${fcMobileRechargeLink}`;'
)

em = em.replace(
    ': isBloodStrike\n    ? bloodStrikeRechargeLink\n    : "";',
    ': isBloodStrike\n    ? bloodStrikeRechargeLink\n    : isFcMobile\n    ? fcMobileRechargeLink\n    : "";'
)

em = em.replace(
    ': isBloodStrike\n      ? "Blood Strike (Or)"\n      : notification.productType === "coins"',
    ': isBloodStrike\n      ? "Blood Strike (Or)"\n      : isFcMobile\n      ? "EA Sports FC Mobile (Points FC)"\n      : notification.productType === "coins"'
)

em = em.replace(
    ': isBloodStrike ? "Blood Strike" : "Non renseigné"',
    ': isBloodStrike ? "Blood Strike" : isFcMobile ? "EA Sports FC Mobile" : "Non renseigné"'
)

em = em.replace(
    ': isBloodStrike\n      ? `Commande Blood Strike confirmée.\\nID Joueur : ${checkout.username}\\nLien direct Manabuy : ${bloodStrikeRechargeLink}`\n      : "",',
    ': isBloodStrike\n      ? `Commande Blood Strike confirmée.\\nID Joueur : ${checkout.username}\\nLien direct Manabuy : ${bloodStrikeRechargeLink}`\n      : isFcMobile\n      ? `Commande EA Sports FC Mobile confirmée.\\nUID Joueur : ${checkout.username}\\nLien direct Manabuy : ${fcMobileRechargeLink}`\n      : "",'
)

with open("app/lib/payments/send-order-email.ts", "w", encoding="utf-8") as f:
    f.write(em)
print("send-order-email.ts updated")
