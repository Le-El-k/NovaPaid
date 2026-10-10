
with open("app/components/games/VideoGamesSection.tsx", "r", encoding="utf-8") as f:
    v = f.read()

idx_xbox = v.find('  {\n    "id": "xbox",')
if idx_xbox == -1:
    idx_xbox = v.find('  {\r\n    "id": "xbox",')

# Find the end of the gamesCatalog array: ];

const copy = {
idx_end = v.find('];\n\nconst copy = {', idx_xbox)
if idx_end == -1:
    idx_end = v.find('];\r\n\r\nconst copy = {', idx_xbox)
if idx_end == -1:
    idx_end = v.find('];;\n\nconst copy = {', idx_xbox)
if idx_end == -1:
    idx_end = v.find('];;\r\n\r\nconst copy = {', idx_xbox)

if idx_xbox != -1 and idx_end != -1:
    # Before idx_xbox, there is the closing brace of the previous item (ea-fc-mobile)
    # Let's ensure proper array closing
    # The item before xbox ends with: ]
  },
    v = v[:idx_xbox] + v[idx_end:]
    # remove any trailing comma before ];
    v = v.replace(']\n  },\n];\n\nconst copy', ']\n  }\n];\n\nconst copy')
    v = v.replace(']\n  },\n];;\n\nconst copy', ']\n  }\n];\n\nconst copy')
    v = v.replace(']\r\n  },\r\n];\r\n\r\nconst copy', ']\r\n  }\r\n];\r\n\r\nconst copy')
    v = v.replace(']\r\n  },\r\n];;\r\n\r\nconst copy', ']\r\n  }\r\n];\r\n\r\nconst copy')
    print("Removed xbox and brawl-stars successfully!")
else:
    print("Could not find boundaries:", idx_xbox, idx_end)

with open("app/components/games/VideoGamesSection.tsx", "w", encoding="utf-8") as f:
    f.write(v)

