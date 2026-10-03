# STATE (update at the end of every session)

**Last updated:** 2026-10-03 by Claude (build session 1)
**Phase:** 0 complete in code. Phase 1 NOT started (needs the VPS live).

## What exists
- Full codebase: collectors (EDGAR feed + enrichment + daily-index reconciliation, Alpaca bars/news/
  corporate actions, FRED VIX, Ken French factors), sim executor with risk limits and kill switch,
  3 controls + a generic filing-event strategy, Tier 1/2 analytics (beta-adjusted, peer residual,
  horizons gap..60d, MAE/MFE, shortfall, regimes), stats (Holm, BH, block bootstrap, PSR, deflated
  Sharpe, power/MDE, IC, Brier, FF5+mom regression), governance (pre-registration hashing, holdout
  lock), daily report, health checks, alerts, CSV export, review import.
- 27 tests pass. `fake-e2e` passes: planted effect found (5d peer-resid +2.9%, t=4.0), random controls
  indistinguishable from zero across 11 seeds (mean +0.1% per trade, individual seeds -0.8% to +0.7%).
- Live data sources are UNTESTED: the build sandbox could not reach SEC/Alpaca/ntfy. `edgelab smoke`
  on the VPS is the first real test. Expect 1-3 small fixes there.

## Running
Nothing yet. VPS not provisioned.

## Decisions waiting for Lorenzo
1. Accounts: Alpaca and Hetzner require 18+. Parent holds the accounts until 22 Nov 2026, or wait? (see docs/RUNBOOK.md)
2. New private GitHub repo `edgelab` (recommended) vs keep inside `thisismyhouse` (a GitHub Pages repo).
3. Read docs/PLAN_REVIEW.md and veto anything you disagree with.

## Next actions (Claude)
- After VPS smoke passes: fix whatever smoke reveals; start the 14-day Phase 1 clock.
- Phase 2 build (parallel to Phase 1): Form 4 XML parser (H001), 13D parser (H002), historical 8-K
  items via submissions JSON, backfill bars 2016+, research harness with split enforcement.
- Create scheduled routines (daily review, weekly strategist) once the repo + publish loop work.

## Usage log (approximate)
| date | job | surface | notes |
|---|---|---|---|
| 2026-10-03 | build session 1 | Claude Code cloud | large: research + full build |

## Change log
- 2026-10-03: initial build.
