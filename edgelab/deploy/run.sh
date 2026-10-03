#!/usr/bin/env bash
# Wrapper used by every systemd unit: venv, env, non-overlapping runs (flock), logging.
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"
set -a; [ -f .env ] && . ./.env; set +a
LOCK="/tmp/edgelab-$(echo "$*" | tr ' /' '__').lock"
exec flock -n "$LOCK" "$APP_DIR/.venv/bin/python" -m edgelab.cli "$@"
