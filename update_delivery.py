import re

with open("app/components/games/VideoGamesSection.tsx", "r", encoding="utf-8") as f:
    vg = f.read()

# 1. Fortnite: 10 - 20 minutes
vg = re.sub(
    r'(id:s*"fortnite"[sS]*?deliveryTime:s*{s*fr:s*")[^"]+("s*,s*en:s*")[^"]+("s*})',
    r'g<1>10 - 20 minutesg<2>10 - 20 minutesg<3>',
    vg
)

# 2. Free Fire: 2 - 7 minutes
vg = re.sub(
    r'(id:s*"free-fire"[sS]*?deliveryTime:s*{s*fr:s*")[^"]+("s*,s*en:s*")[^"]+("s*})',
    r'g<1>2 - 7 minutesg<2>2 - 7 minutesg<3>',
    vg
)

# 3. PUBG Mobile: 2 - 7 minutes
vg = re.sub(
    r'("id":s*"pubg-mobile"[sS]*?"deliveryTime":s*{s*"fr":s*")[^"]+("s*,s*"en":s*")[^"]+("s*})',
    r'g<1>2 - 7 minutesg<2>2 - 7 minutesg<3>',
    vg
)

# 4. COD Mobile: 2 - 5 minutes
vg = re.sub(
    r'(id:s*"cod-mobile"[sS]*?deliveryTime:s*{s*fr:s*")[^"]+("s*,s*en:s*")[^"]+("s*})',
    r'g<1>2 - 5 minutesg<2>2 - 5 minutesg<3>',
    vg
)
vg = vg.replace('badge: { fr: "Livraison 0-5 min", en: "0-5 min delivery" }', 'badge: { fr: "Livraison 2-5 min", en: "2-5 min delivery" }')
vg = re.sub(r'Délai de livraisons*:s*environs*[0-9]+s*às*[0-9]+s*minutes', 'Délai de livraison : environ 2 à 5 minutes', vg)
vg = re.sub(r'Delivery times*:s*[0-9]+s*tos*[0-9]+s*minutes', 'Delivery time: 2 to 5 minutes', vg)
vg = re.sub(r'Délai garantis*:s*environs*[0-9]+s*às*[0-9]+s*minutes', 'Délai garanti : environ 2 à 5 minutes', vg)
vg = re.sub(r'Guaranteed delivery times*:s*[0-9]+s*tos*[0-9]+s*minutes', 'Guaranteed delivery time: 2 to 5 minutes', vg)

# 5. Blood Strike: 1 - 5 minutes
vg = re.sub(
    r'("id":s*"blood-strike"[sS]*?"deliveryTime":s*{s*"fr":s*")[^"]+("s*,s*"en":s*")[^"]+("s*})',
    r'g<1>1 - 5 minutesg<2>1 - 5 minutesg<3>',
    vg
)

# 6. FC Mobile: 3 - 8 minutes
vg = re.sub(
    r'("id":s*"ea-fc-mobile"[sS]*?"deliveryTime":s*{s*"fr":s*")[^"]+("s*,s*"en":s*")[^"]+("s*})',
    r'g<1>3 - 8 minutesg<2>3 - 8 minutesg<3>',
    vg
)

with open("app/components/games/VideoGamesSection.tsx", "w", encoding="utf-8") as f:
    f.write(vg)

print("VideoGamesSection updated successfully!")

# Update send-order-email.ts
with open("app/lib/payments/send-order-email.ts", "r", encoding="utf-8") as f:
    em = f.read()

em = re.sub(r'- DÉLAI LIVRAISON : environ [0-9]+ à [0-9]+ minutes', '- DÉLAI LIVRAISON : environ 2 à 5 minutes', em)
em = re.sub(r'Délai : [0-9]+-[0-9]+ min', 'Délai : 2-5 min', em)

with open("app/lib/payments/send-order-email.ts", "w", encoding="utf-8") as f:
    f.write(em)

print("send-order-email updated successfully!")
