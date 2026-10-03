---
name: weekly-review
description: Weekly strategist review for edgelab. Use for the scheduled weekly routine or when asked for a weekly review, research status, or proposals.
---
# Weekly review (target: a 1-page report Lorenzo can read in 10 minutes)

Inputs: `STATE.md`, last 5 `JOURNAL/daily/*.md`, `exports/*.csv`, `HYPOTHESES/`.

1. **Health:** uptime and gaps for the week (job_runs_7d, data_gaps). Phase 1 gate progress in days.
2. **Controls and candidates:** per account, pess and opt equity curves, 1-week and since-start
   returns, with the random-event control next to every candidate. Use code. Include the n of trades
   and say plainly when n is too small to mean anything (it usually is).
3. **Tag tally:** counts by tag across ALL reviews to date. Flag a tag only if its share moved by
   more than its binomial standard error. Turn tag patterns into *hypotheses for pre-registration*,
   never into rule changes.
4. **Research progress:** hypotheses by status, looks consumed (`test_log`), what ran this week.
5. **Proposals:** at most 3 (new pre-registrations, fixes, process changes). Each with expected value,
   cost in usage/money, and what gate it touches. Frozen strategies: default answer is no.
6. **Decisions for Lorenzo:** numbered, each answerable with yes/no.
7. Usage: estimate this week's Claude usage per job and append it to `STATE.md`.

Write `JOURNAL/weekly/<date>.md`, update `STATE.md`, commit, push.
