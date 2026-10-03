#!/usr/bin/env bash
# One-time data load before timers start (about 30-60 min). Run as the edgelab user.
set -euo pipefail
R="$(cd "$(dirname "$0")" && pwd)/run.sh"
$R collect tickers            # SEC ticker <-> CIK map
$R collect assets             # Alpaca active + inactive US equities
$R backfill bars --start 2025-06-01          # enough history for 250-day betas
$R backfill universe --start 2026-09-01      # point-in-time universe snapshots
$R collect factors
$R collect filings
$R collect sic --limit 8000   # industry codes for peer matching (~15-20 min at SEC rate limit)
echo "backfill done"
