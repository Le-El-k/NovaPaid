
with open("app/globals.css", "r", encoding="utf-8") as f:
    css = f.read()

import re
matches = [m.start() for m in re.finditer(r'opacityFadeIn', css)]
for m in matches:
    print(css[m-40:m+200])
    print("="*40)

