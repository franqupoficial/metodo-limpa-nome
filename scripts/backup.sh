#!/usr/bin/env bash
# Backup do banco PostgreSQL (formato custom, compactado). Agende diariamente e armazene cópias fora do servidor,
# com criptografia e acesso restrito. Restauração: pg_restore --clean --if-exists -d "$DATABASE_URL" arquivo.dump
set -euo pipefail
: "${DATABASE_URL:?Defina DATABASE_URL}"
DEST="${BACKUP_DIR:-./backups}"
mkdir -p "$DEST"
FILE="$DEST/portal-$(date +%Y%m%d-%H%M%S).dump"
pg_dump --format=custom --no-owner --dbname="${DATABASE_URL%%\?*}" --file="$FILE"
chmod 600 "$FILE"
# mantém os últimos 30 backups locais
ls -1t "$DEST"/portal-*.dump | tail -n +31 | xargs -r rm --
echo "Backup gerado: $FILE"
