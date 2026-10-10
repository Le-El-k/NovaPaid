
with open("app/components/games/VideoGamesSection.tsx", "r", encoding="utf-8") as f:
    c = f.read()

idx = c.find('"id": "fc-520"')
print(c[idx:idx+250])

