#!/usr/bin/env bash
# Push today's code-generated report + CSV exports to GitHub so scheduled Claude routines
# (which cannot reach this VPS) can read them. Only touches reports/ and exports/.
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_DIR="$(git -C "$APP_DIR" rev-parse --show-toplevel)"
cd "$APP_DIR"
set -a; [ -f .env ] && . ./.env; set +a
[ "${EDGELAB_PUBLISH:-1}" = "1" ] || exit 0
"$APP_DIR/.venv/bin/python" -m edgelab.cli export --out "$APP_DIR/exports"
"$APP_DIR/.venv/bin/python" -m edgelab.cli import-reviews || true
cd "$REPO_DIR"
git pull --rebase --autostash -q
git add -- "$APP_DIR/reports" "$APP_DIR/exports"
if ! git diff --cached --quiet; then
  git -c user.name="edgelab-vps" -c user.email="edgelab-vps@users.noreply.github.com" \
      commit -q -m "data: reports and exports $(TZ=America/New_York date +%F)"
  for i in 1 2 3 4; do git push -q && break || sleep $((2**i)); done
fi
