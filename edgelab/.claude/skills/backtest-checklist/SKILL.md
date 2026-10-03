---
name: backtest-checklist
description: Mandatory checklist before trusting or reporting any edgelab backtest, event study, or validation result. Use before writing any number that could influence a gate decision.
---
# Backtest checklist (answer each in writing in the result file)

**Timing and leakage**
- [ ] Every input has `available_at`, and entries use `first_tradable_open(available_at)`. Show 3 random events with timestamps.
- [ ] No filing *date* used where acceptance *time* exists. If only dates: `conservative_available_at`.
- [ ] No hindsight tables (`hs_*`), no future universe membership, no adjusted data that leaks future splits into signal logic.
- [ ] LLM features: post-cutoff only, or flagged contaminated (upper bound only).
- [ ] PC1 (timestamp alignment) passed on the same data build.

**Sample**
- [ ] Split respected: which split, date range, embargo applied. Holdout untouched unless an unlock was consumed.
- [ ] Survivorship: fraction of events whose symbol has no price data. Report it. Above 10%, say the result may be biased upward.
- [ ] Event counts per year: look for structural breaks (form changes, rule changes).

**Statistics**
- [ ] Calendar-time aggregation (one obs per day), not per-event t-stats.
- [ ] Block bootstrap CI reported.
- [ ] Number of looks for this hypothesis (`stats.n_looks`) and family Holm threshold stated.
- [ ] Deflated Sharpe with n_trials = total looks in `test_log` for the family.
- [ ] Power: MDE for this sample. "Not significant" with MDE > expected effect means "uninformative", not "no effect".

**Economics**
- [ ] Pess and opt costs side by side; borrow cost for shorts; long-only variant for short signals.
- [ ] Beats random-event control, not only zero or SPY.
- [ ] FF5 + momentum regression on the calendar-time series: is alpha still there?
- [ ] Capacity sanity: median adv20 of traded names vs. position size.

**Process**
- [ ] Code commit hash recorded; result reproducible with one command.
- [ ] For any gate-relevant result: a skeptic subagent (fresh context, told to break it) has reviewed it and its objections are answered in the file.
