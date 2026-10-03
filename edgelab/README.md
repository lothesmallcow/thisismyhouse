# edgelab

A paper-trading **research** system that asks one question honestly: is there any edge in public,
tedious-to-read information (SEC filings, insider trades, disclosure timing) once realistic costs,
proper controls and multiple-testing corrections are applied? A documented "no" is a valid result.

**Read first:**
- `CLAUDE.md`: rules
- `STATE.md`: where we are
- `docs/RUNBOOK.md`: what Lorenzo does
- `docs/PLAN_REVIEW.md`: why it is built this way

## Architecture

```
            VPS (systemd timers, deterministic, no LLM)                       GitHub                 Claude routines
 EDGAR feed ─┐                                                                                           (cloud)
 Alpaca bars ┼─> collectors ─> SQLite ─> decide (09:12 ET) ─> sim fills ─> nightly ─> reports/ ─┐
 Benzinga ───┤                 (WAL)     controls + frozen     both cost    outcomes   exports/ ─┼─ push ─> daily review ─┐
 FRED / KF ──┘                           strategies, risk      models       report              │          weekly strategist
                                         limits, kill switch                                    │                 │
                     health (15 min) ─> ntfy push + healthchecks dead-man         JOURNAL/reviews/*.csv  <── commit ┘
                                                                                  (imported nightly into hs_ tables)
```

- **Daily frequency by design.** Decisions are made before the open and trades execute at the open.
  Intraday horizons are measured afterwards from minute history.
- **The simulator is the accounting truth.** Every trade is costed under an optimistic and a
  pessimistic model. Alpaca paper can mirror the orders as a plumbing check.
- **Every signal is logged with Tier 1 fields, traded or not:** pre-trade beta, size bucket,
  liquidity, regime, time of day, matched peers.
- **Every signal gets outcomes** at gap, 5m, 30m, 1h, 4h, close, 1d, 3d, 5d, 10d, 20d and 60d. Each
  outcome is reported raw, market, beta-adjusted and peer-residual.
- **Controls:** SPY buy-and-hold, random-universe, and random-event (the sharp placebo).

## Layout
```
edgelab/            python package
  collectors/       edgar.py, alpaca_data.py, macro.py
  executor/         engine.py (decide/reconcile/mark), costs.py
  strategies/       controls.py, filing_item.py, base.py
  analytics/        outcomes.py, stats.py
  reports/          daily.py
  governance.py     pre-registration hashing, holdout lock
  universe.py       point-in-time universe + regimes
  fake.py, e2e.py   synthetic market for the Phase 0 gate
  smoke.py          live checks on the VPS
config/settings.yaml
HYPOTHESES/         pre-registrations (TEMPLATE.md, H001..H006, PC1)
JOURNAL/            daily/, weekly/, reviews/, verdicts/
deploy/             setup_vps.sh, run.sh, systemd units, publish/backup scripts
ops/routines/       prompts for scheduled Claude routines
.claude/skills/     project skills
docs/               RUNBOOK, PLAN_REVIEW, VERIFICATION, LITERATURE, LEARN
tests/              pytest (python -m pytest -q tests)
```

## Local quick start
```
pip install -r requirements.txt
python -m pytest -q tests
python -m edgelab.cli fake-e2e          # full pipeline on a synthetic market (~40 s)
```
