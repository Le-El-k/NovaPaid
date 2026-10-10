
with open("app/globals.css", "r", encoding="utf-8") as f:
    css = f.read()

idx = css.find('.game-modal-header {')
print(css[idx:idx+1200])

