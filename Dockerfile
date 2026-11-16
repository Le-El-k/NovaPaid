# NovaPaid — image d'exécution. Le code n'est PAS copié dans l'image :
# le dépôt est monté en volume sur /app (voir docker-compose.yml), si bien qu'un
# simple `git pull` sur l'hôte suffit à mettre à jour (hook post-merge).
FROM node:24-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates git supervisor util-linux curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY docker/supervisord.conf /etc/supervisor/conf.d/novapaid.conf
COPY docker/refresh.sh /usr/local/bin/novapaid-refresh
COPY docker/entrypoint.sh /usr/local/bin/novapaid-entrypoint
RUN chmod 755 /usr/local/bin/novapaid-refresh /usr/local/bin/novapaid-entrypoint

EXPOSE 3000
ENTRYPOINT ["novapaid-entrypoint"]
CMD ["supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
