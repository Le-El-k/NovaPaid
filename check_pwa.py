
with open("app/components/pwa/PwaInstallPrompt.tsx", "r", encoding="utf-8") as f:
    c = f.read()

idx = c.find("return (")
print(c[idx:])

