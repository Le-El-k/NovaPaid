
with open("app/layout.tsx", "r", encoding="utf-8") as f:
    l = f.read()

import re
for m in re.finditer(r'(playstation|steam|psn)', l, re.IGNORECASE):
    idx = m.start()
    print(f"Line in layout.tsx at {idx}:", l[idx-40:idx+60].replace('\n', ' '))

