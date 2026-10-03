#!/usr/bin/env bash
# Run as root after `smoke` passes and the initial backfill is done.
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
for t in $APP_DIR/deploy/systemd/*.timer; do systemctl enable --now "$(basename "$t")"; done
systemctl list-timers 'edgelab-*' --no-pager
