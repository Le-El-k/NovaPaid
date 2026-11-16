#!/bin/sh
# Prépare le conteneur : dossier de données accessible au process web, et
# premier build si le dépôt monté n'a encore ni dépendances ni pages compilées.
set -eu
mkdir -p /data /var/log/supervisor
chown -R node:node /data
cd /app
if [ ! -x node_modules/.bin/vinext ] || [ ! -f dist/client/index.html ]; then
  echo "NovaPaid : premier démarrage, installation et build…"
  npm ci --no-audit --no-fund
  sha256sum package-lock.json > node_modules/.novapaid-lock.sha256
  npm run build:vinext
fi
exec "$@"
