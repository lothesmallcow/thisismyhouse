---
name: post-trade-review
description: Daily post-close review of edgelab trades and operations. Use for the scheduled daily review routine or when asked to review today's trades.
---
# Daily post-trade review (keep it short: this is about correctness, not performance)

Inputs: `edgelab/reports/daily/<date>.md|json`, `edgelab/exports/*.csv`. Numbers come from those files only.

1. **Ops first.** Any job errors, missing filings acceptance times, zero news, zero bars, open data
   gaps, risk events, kill flags? List them with the likely cause and the fix (code fix = do it,
   with tests, on a branch/commit; data fix = note it for the VPS).
2. **Closed trades today** (from `exports/trades.csv` where exit_date = date). For each:
   - `vol_rel_move = |residual 5d move| / (pre_vol20 * sqrt(days_held))`, where the residual move is
     `peer_resid_ret` at the matching horizon in `signals_outcomes.csv`. Compute it with pandas; do not eyeball.
   - `noise = 1` if vol_rel_move < 1.0 (a move inside one normal sd is noise by construction).
   - One tag from the fixed list ONLY: `market_driven`, `sector_driven`, `signal_consistent`,
     `cost_driven`, `execution_problem`, `unexplained`. "unexplained" is a fine answer.
   - Comment: one sentence max. No stories for noise trades.
3. Write `edgelab/JOURNAL/reviews/<date>.csv` with columns
   `trade_id,review_date,tag,noise,vol_rel_move,comment,reviewer` (reviewer = `claude:<model id>`).
4. Write `edgelab/JOURNAL/daily/<date>.md`: ops status (green/amber/red), anything needing a fix,
   counts of tags. NO performance verdicts: those only happen at pre-set windows.
5. If something needs Lorenzo, add it to `STATE.md` "Decisions waiting". Commit and push.

Never: change strategy code or parameters of a frozen strategy; read `hs_` data into features;
recompute P&L by hand.
