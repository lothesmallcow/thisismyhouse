# edgelab: rules for every Claude session

You are working on Lorenzo's paper-trading **research** system. The goal is to find out honestly
whether any edge exists, not to make money. A clean negative result is a success.

**Start of every session:** read this file, then `STATE.md`. **End of every session:** update
`STATE.md` (phase, what changed, open decisions, approximate usage you consumed).

## Owner and style
- Owner: Lorenzo (first-year Bocconi BIEF student, not a quant, very little time). He is the referee
  at gates, you do everything else.
- Write to him bluntly, no flattery, no em dashes. Give options with trade-offs, then a firm call.
  Put a confidence % on anything uncertain or time-sensitive. Verify current facts (prices, rules,
  API terms) instead of trusting memory.
- When you explain statistics, do it in 3 to 5 plain sentences with a concrete number.

## Architecture (see README.md for detail)
- VPS runs everything deterministic: collectors, executor, nightly analytics (systemd timers in
  `deploy/systemd`). Claude never makes tick-by-tick decisions.
- The VPS publishes `reports/` and `exports/` (CSV) to GitHub every evening. Scheduled Claude
  routines read those, write `JOURNAL/`, and commit. The VPS imports `JOURNAL/reviews/*.csv`.
- Memory = this repo + the SQLite DB. Never rely on chat context.

## Hard rules (never break; enforced in code where possible)
1. **Paper only.** No real money, no live broker keys, no new paid services or accounts without
   Lorenzo's explicit approval in writing.
2. **No pattern mining.** Every hypothesis is pre-registered in `HYPOTHESES/` (template there) with an
   economic reason *before* any return is looked at. No reason, no test.
3. **Count every look.** Every evaluation goes through `analytics.stats.log_test`. Multiple-testing
   corrections use the full count from `test_log`, including failed variants.
4. **Splits are fixed** (`config/settings.yaml: splits`). Discovery: explore freely. Validation: each
   hypothesis tested ONCE, dead if it fails, no tweak-and-retest. Holdout: touched once, only with a
   committed `HYPOTHESES/holdout_unlocks/H###.md` containing `APPROVED-BY: Lorenzo` (code enforces it).
5. **No look-ahead.** Every feature carries `available_at`. Trades happen at the first open after the
   info became public (`timeutil.first_tradable_open`). Never use filing *date* where acceptance
   *time* exists; when only the date is known use `conservative_available_at`.
6. **LLM look-ahead.** An LLM scoring text dated before its training cutoff may know the future.
   LLM-derived features are only valid on text after the model's cutoff (forward collection). Flag
   anything else `lookahead_contaminated=1` and treat results as an upper bound only.
7. **Hindsight never feeds features.** Tables prefixed `hs_` (reviews, tags, narratives) are never read
   by strategies, executor or collectors (`tests/test_leakage_and_governance.py`).
8. **Both cost models, always.** Report opt and pess side by side. Edge only under opt = no edge.
9. **Controls always run:** SPY buy-and-hold, random-universe, random-event. A candidate is judged
   against random-event first (same event-day volatility, no information).
10. **Frozen means frozen.** During a forward test, no rule, parameter or universe changes. Bugs that
    corrupt data may be fixed; log them in `STATE.md` and in the verdict.
11. **Secrets** live only in `.env` on the VPS. Never commit keys. Never print them.
12. **Tests must pass** (`python -m pytest -q tests`) before any commit that touches `edgelab/`.

## What you do alone vs. what needs Lorenzo
Alone: build/fix code, tests, data pulls, backtests on discovery and the single validation run,
daily/weekly reviews, drafting and registering hypotheses, ops fixes (log every change).
Needs Lorenzo (write the request in `STATE.md` under "Decisions waiting" and keep working on other
things): promoting a strategy to forward test; any change to a frozen strategy; touching holdout;
changing `risk:` limits or `splits:`; anything with money, new paid services, or new accounts.

## Gates
| Phase | Exit gate |
|---|---|
| 0 Setup | `python -m edgelab.cli fake-e2e` runs end to end; all tests pass |
| 1 Plumbing | 14 consecutive calendar days live, zero *silent* gaps (every gap detected, alerted, backfilled), alert path tested, controls marking daily |
| 2 Research | Each registered hypothesis has one validation result logged. Survivor = passes Holm at family alpha 0.05 on pess costs vs random-event. Zero survivors is valid |
| 3 Rules | Survivor coded as a strategy, params frozen, git tag `strat/H###-v1`, Lorenzo approves |
| 4 Forward | Run until BOTH the pre-registered event count (from the power calc) and 8 weeks are reached. No edits |
| 5 Verdict | `verdict-report` skill: edge / no edge / inconclusive, skeptic agent review |
| 6 Iterate | Retire or stress-test; real money only discussed after a positive verdict, Lorenzo 18+, Italian tax/broker check |

## Skills (in `.claude/skills/`)
`preregister-hypothesis`, `backtest-checklist`, `post-trade-review`, `weekly-review`, `verdict-report`.
Use them. High-stakes conclusions (anything that would move a gate) go through a separate skeptic
subagent that has not seen your reasoning and is told to break the result.

## Commands
```
python -m edgelab.cli fake-e2e            # Phase 0 gate on synthetic data
python -m pytest -q tests                 # must pass
python -m edgelab.cli smoke               # VPS only: live checks of every data source + alerts
python -m edgelab.cli kill --reason "..." # global kill switch (or --account X)
python -m edgelab.cli register HYPOTHESES/H001_....md
```
