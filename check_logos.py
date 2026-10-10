
with open("app/components/games/VideoGamesSection.tsx", "r", encoding="utf-8") as f:
    v = f.read()

import re
matches = [m.start() for m in re.finditer(r'logoUrl', v)]
print("Total logoUrl matches:", len(matches))
for m in matches:
    print(v[m-10:m+45].replace('\n', ' '))

