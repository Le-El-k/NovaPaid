
with open("app/globals.css", "r", encoding="utf-8") as f:
    css = f.read()

idx = css.find('.pwa-install-overlay')
print(css[idx:idx+800])

