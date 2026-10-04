#!/usr/bin/env bash
# Pre-commit: block secrets and personal data before they enter git history.
# Install once with: npm run hooks:install
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
[ -d compass ] && cd compass
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks git --staged --redact --no-banner --config .gitleaks.toml
else
  echo "pre-commit: gitleaks not installed, skipping secret scan (CI still runs it). https://github.com/gitleaks/gitleaks#installing"
fi
node scripts/scan-personal-data.mjs
