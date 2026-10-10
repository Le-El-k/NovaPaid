
with open("app/components/games/VideoGamesSection.tsx", "r", encoding="utf-8") as f:
    v = f.read()

idx = v.find('video-game-card-hero')
print(v[idx-80:idx+400])

