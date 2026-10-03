---
hyp_id: H000
title: <one line>
status: draft            # draft -> registered (commit, then `edgelab register <file>`). After that: never edit; write H000b instead.
author: claude | lorenzo
created: YYYY-MM-DD
---

## 1. Claim (one sentence, directional)
After <event>, <stocks> <outperform/underperform> <benchmark> over <horizon>.

## 2. Economic reason it should exist (mandatory; no reason, no test)
Who is on the other side and why can't or won't they arbitrage it? (attention limits, forced
trading, short-sale constraints, slow-moving capital, regulatory timing...)

## 3. Prior evidence and expected decay
Papers, effect sizes, publication date. Apply a >=50% haircut (McLean-Pontiff). Expected effect
after haircut: X% per event over horizon H.

## 4. Exact definition (code must match this text)
- Event source and filter (form types, items, transaction codes...):
- Timestamp used as `available_at`:
- Entry: first tradable open after available_at (or other, justify):
- Direction: long / short / long-short. Long-only variant reported too: yes/no
- Holding period / exit:
- Universe filter: price >= $2, adv20 >= $1M (from settings) + any extra:
- Position sizing:
- Exclusions (overlapping events, etc.):

## 5. Primary metric and test (only ONE primary; everything else is secondary/descriptive)
- Primary: mean calendar-time daily average of `peer_resid_ret` at horizon H, pess costs, vs 0
  AND vs random-event control.
- Test: one-sided t on calendar-time series; block bootstrap CI (block 5).
- Family: this hypothesis is part of family <F>; Holm correction across the family at alpha 0.05.

## 6. Power
- Expected events per year in universe:
- Assumed sd of per-event residual return at H (from discovery data or 7% default):
- MDE at 80% power for the validation sample: `stats.min_detectable_effect(sd, n)` =
- Forward test stop rule: N events = `stats.required_n(expected_effect, sd)` = ..., and >= 8 weeks.

## 7. Splits
Discovery 2016-2020 (free to explore, all looks logged), validation 2021-2023 (one run of the
frozen spec), holdout 2024-2026H1 (needs Lorenzo's unlock). Embargo 90 days at boundaries.

## 8. Kill criteria (decided now)
- Validation primary metric p > Holm threshold -> dead. No re-specification.
- Effect exists only under opt costs -> dead.
- Effect explained by FF5+momentum (alpha t < 2 after regression) -> dead as a new edge.

## 9. Known risks
Look-ahead, survivorship, short-borrow, crowding, data quality.

## 10. Discovery notes (filled during discovery, before registration of the validation spec)
...
