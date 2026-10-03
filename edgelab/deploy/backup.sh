#!/usr/bin/env bash
# Consistent SQLite snapshot (safe while jobs run), 14 daily copies kept.
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
set -a; [ -f "$APP_DIR/.env" ] && . "$APP_DIR/.env"; set +a
DATA="${EDGELAB_DATA_DIR:-$APP_DIR/data}"
mkdir -p "$DATA/backups"
OUT="$DATA/backups/edgelab-$(date +%F).sqlite"
sqlite3 "$DATA/edgelab.sqlite" ".backup '$OUT'"
gzip -f "$OUT"
ls -1t "$DATA"/backups/edgelab-*.sqlite.gz | tail -n +15 | xargs -r rm --
