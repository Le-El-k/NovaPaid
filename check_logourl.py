
with open("app/components/games/VideoGamesSection.tsx", "r", encoding="utf-8") as f:
    v = f.read()

import re
matches = [m.start() for m in re.finditer(r'logoUrl', v)]
print(f"Found {len(matches)} logoUrl matches")
for m in matches:
    print(v[m-30:m+160])
    print("="*40)

