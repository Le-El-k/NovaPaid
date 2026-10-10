with open("app/components/games/VideoGamesSection.tsx", "r", encoding="utf-8") as f:
    vg = f.read()

games = [
    ("Fortnite", "fortnite"),
    ("Free Fire", "free-fire"),
    ("PUBG Mobile", "pubg-mobile"),
    ("Call of Duty", "cod-mobile"),
    ("Blood Strike", "blood-strike"),
    ("EA FC Mobile", "ea-fc-mobile"),
]

for name, gid in games:
    idx = vg.find('"' + gid + '"')
    if idx == -1:
        idx = vg.find("'" + gid + "'")
    deliv_idx = vg.find("deliveryTime", idx)
    end_idx = vg.find("}", deliv_idx) + 1
    chunk = vg[deliv_idx:end_idx].replace('
', ' ').replace('', '')
    print(f"{name} ({gid}): {chunk}")

with open("app/lib/payments/send-order-email.ts", "r", encoding="utf-8") as f:
    em = f.read()
for line in em.splitlines():
    if "DÉLAI" in line or "Délai" in line:
        print("Email: ", line.strip())
