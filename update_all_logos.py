
with open("app/components/games/VideoGamesSection.tsx", "r", encoding="utf-8") as f:
    v = f.read()

# pubg-mobile
v = v.replace(
    '"name": "PUBG Mobile",\n    "publisher": "Tencent Games",',
    '"name": "PUBG Mobile",\n    "publisher": "Tencent Games",\n    "logoUrl": "/games/pubg-icon.png",'
)

# blood-strike
v = v.replace(
    '"name": "Blood Strike",\n    "publisher": "NetEase Games",',
    '"name": "Blood Strike",\n    "publisher": "NetEase Games",\n    "logoUrl": "/games/bloodstrike-icon.png",'
)

# ea-fc-mobile
v = v.replace(
    '"name": "EA Sports FC Mobile",\n    "publisher": "Electronic Arts",',
    '"name": "EA Sports FC Mobile",\n    "publisher": "Electronic Arts",\n    "logoUrl": "/games/fcmobile-icon.png",'
)

with open("app/components/games/VideoGamesSection.tsx", "w", encoding="utf-8") as f:
    f.write(v)

print("Added logoUrl for pubg-mobile, blood-strike, ea-fc-mobile")

