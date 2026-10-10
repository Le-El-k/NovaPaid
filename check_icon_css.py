
with open("app/globals.css", "r", encoding="utf-8") as f:
    css = f.read()

idx = css.find('.video-game-card-icon-wrap')
print(css[idx:idx+500])

idx2 = css.find('.video-game-detail-hero-logo')
print("detail-hero-logo:", css[idx2:idx2+400])

