
with open("app/page.tsx", "r", encoding="utf-8") as f:
    c = f.read()

import re
matches = [m.start() for m in re.finditer(r'store-page', c)]
for m in matches:
    print(c[m-20:m+150])
    print("="*40)

