
with open("app/layout.tsx", "r", encoding="utf-8") as f:
    l = f.read()

lines = l.split('\n')
print('\n'.join(lines[240:265]))

