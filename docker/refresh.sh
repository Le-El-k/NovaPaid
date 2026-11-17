#!/bin/bash
# Mise à jour après `git pull` (appelé par docker/git-hooks/post-merge) :
# réinstalle les dépendances si package-lock.json a changé, recompile, puis
# redémarre le serveur web et vérifie qu'il répond.
set -euo pipefail
cd /app
exec 9>/tmp/novapaid-refresh.lock
flock -n 9 || { echo "NovaPaid : une mise à jour est déjà en cours." >&2; exit 1; }

if ! sha256sum -c --status node_modules/.novapaid-lock.sha256 2>/dev/null; then
  echo "NovaPaid : package-lock.json a changé, npm ci…"
  npm ci --include=dev --no-audit --no-fund
  sha256sum package-lock.json > node_modules/.novapaid-lock.sha256
fi

echo "NovaPaid : build…"
npm run build:vinext
supervisorctl restart novapaid-web

for attempt in $(seq 1 30); do
  if node -e "fetch('http://127.0.0.1:3000/api/platform-status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    echo "NovaPaid : nouvelle version compilée et en ligne."
    exit 0
  fi
  sleep 2
done
echo "NovaPaid : le serveur ne répond pas après la mise à jour (docker logs novapaid_app)." >&2
exit 1
