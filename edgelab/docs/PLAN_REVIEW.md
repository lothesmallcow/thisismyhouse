# Review of the handoff plan: what I changed and why

Verdict: the philosophy is right (pre-registration, controls, counting looks, deterministic code,
Claude as judge rather than trader). Several specifics were wrong or would have wasted months.
Confidence in brackets is how sure I am the change is correct.

## Big changes

**1. LLM-scored historical backtests are contaminated. LLM hypotheses become forward-only. [90%]**
An LLM reading a 2019 filing may already "know" what the stock did in 2020. Recent work confirms it:
- Gao, Jiang and Yan (2025) find a memorisation signal that is positive before the training cutoff
  and falls to about zero after it.
- FinCAD (EMNLP 2026) finds the leak survives anonymising company names.

So the plan's "sensor" ideas (evasiveness, LLM reading of 8-Ks and news) cannot be validated on
history with Claude. They get a different path:
- **Shadow mode first:** signals logged, not traded, on text published after the model's cutoff.
- **Then a pre-registered forward test.**

Historical research (Phase 2) uses signals that need no LLM judgment: form types, 8-K item codes,
Form 4 transactions, 13D filings, timestamps, text similarity.

**2. "100 trades" cannot detect a realistic edge. [95%]**
5-day stock-specific returns of small and mid caps have a standard deviation of roughly 6-8%.

| Trades | Smallest true edge you can detect (80% power) |
|---|---|
| 100 | about 2% per trade |
| ~2,000 to ~10,000 | about 0.3-0.5% per trade |

0.3-0.5% per trade is what a real edge would look like after decay. A green forward result on 100
trades is therefore mostly luck.

Changes:
- The forward gate is now the event count from each hypothesis's own power calculation, AND 8 weeks.
- Outcomes are measured on every signal, traded or not, to increase n.
- Peer residuals cut the noise.
- The statistical weight comes from historical validation with thousands of events. The forward
  test mainly checks implementation and that the sign holds.
- `analytics.stats.required_n` does the maths; every pre-registration must fill in the numbers.

**3. The customer-supplier idea was backwards. [85%]**
Cohen and Frazzini (2008): news about big, well-watched **customers** is priced slowly into their
smaller, ignored **suppliers**. You trade the supplier, not the customer.

Further problems:
- The effect fell to roughly 0.6%/month and is insignificant value-weighted after 2005 (Pinchuk).
- SFAS 131 forces disclosure of a >10% customer but not its name, so links are noisy to build for free.

Demoted to "later, maybe".

**4. Holding period follows the evidence, not "hours to days". [85%]**
Documented edges with free data live at days to weeks (insiders, 13D, NT filings) or months (Lazy
Prices, going concern). So:
- Execution is daily: decide before the open, trade at the open auction price, exit at a later open.
- Intraday horizons (5m to 4h) are still measured after the fact from minute history, so the decay
  curve exists without intraday trading.

This removes the whole real-time streaming problem.

**5. No 24/7 tick collector is needed. [85%]**
Almost everything is backfillable with true timestamps:
- EDGAR acceptance times
- Alpaca SIP bars (free once 15 minutes old, back to 2016)
- Benzinga news (back to 2015)

The always-on parts are small:
- the filings poll (every 5 min)
- news (15 min)
- pre-open decisions
- after-close accounting

**6. Our simulator is the accounting truth; Alpaca paper is only a plumbing check. [80%]**
Alpaca paper fills are a simulation too, and an optimistic one (no auction price, no borrow
refusals). Every account is costed by our simulator under both cost models. An Alpaca paper
account can mirror the orders, and the gap between its fills and ours is itself a measurement.

Also, Alpaca's docs suggest market-on-open orders may need their paid "Elite" router [65%]. So
the mirror uses plain market orders placed before the open.

**7. A sharper placebo: the random-event trader. [90%]**
"Random stock" is a weak control for event strategies, because event days are more volatile and
get more attention. The new control buys random stocks that had a filing since the last open: same
event-day exposure, zero information. A candidate must beat this one, not just SPY.

**8. Positive controls added. [90%]**
If the pipeline cannot find an effect that is definitely there, a null result means nothing.
- **Synthetic:** `fake-e2e` plants a +2% drift after "8-K item 1.01" and the pipeline must find it
  (it does: t = 4.0).
- **Real data:** PC1 checks timestamp alignment. Earnings 8-Ks (item 2.02) must show a much bigger
  overnight "gap" move than matched non-event stocks. If they don't, timestamps are broken.

**9. Research agenda re-ranked using the literature (see LITERATURE.md). [70%]**
Order of testing:

| # | Hypothesis |
|---|---|
| H001 | Opportunistic insider cluster buying (Form 4) |
| H002 | 13D activist filings |
| H003 | NT 10-K/10-Q late-filing notices (short) |
| H004 | 8-K items 4.01 auditor change / 4.02 non-reliance (short) |
| H005 | Disclosure timing: Friday and after-hours filings, interacted with attention |
| H006 | LLM 8-K reader, forward-only |

Dropped or parked:
- **Dropped:** earnings-call evasiveness, because transcripts are paywalled (FMP Ultimate, about $149/month).
- **Parked:** PEAD, which is dead for large caps since about 2006 (Martineau 2022).
- **Parked:** overnight vs intraday, a crowded calibration exercise.
- **Parked:** customer-supplier.
- **Slow sleeve later:** Lazy Prices, whose effect builds over 6-18 months.

**10. Shorts need honest treatment. [85%]**
H003 and H004 are negative signals, and paper shorting has no borrow problem. The pessimistic model
charges 5-20%/year borrow for small and micro caps. Every short hypothesis also reports a long-only
"avoid" version. Real money at your size would rarely be able to short these names.

## Smaller changes
- **Same code for backtest and live.** Strategies are functions of a `Context`; a backtest replays
  `decide()` over history. No vectorbt, Backtrader or QuantConnect: they would make text and event
  data awkward and create two code paths that drift apart. [80%]
- **Correlated signals.** Ten signals on one day are not ten independent observations. Tests
  aggregate to calendar-time daily returns first, and confidence intervals use a block bootstrap.
- **A dead VPS can't send its own alert.** healthchecks.io works as a dead-man switch (it alerts when
  pings stop), with ntfy for push.
- **EDGAR timestamp traps.**
  - Filings accepted after 5:30pm ET get the next day's *filing date*. Acceptance time is truth.
  - The SEC JSON labels times "Z" but appears to use Eastern time. `edgelab smoke` measures this
    instead of assuming it.
- **Survivorship.** Daily point-in-time universe snapshots fix it going forward. Historical results
  carry a survivorship caveat until delisted coverage is measured.
- **Daily Claude review stays small.** Single-trade stories are about 85% noise. Daily: ops anomalies
  plus fixed tags on closed trades. Judgment happens weekly over accumulated tags.

## Facts that changed since the plan (see VERIFICATION.md)
- **The PDT rule no longer exists.** The SEC approved FINRA's replacement on 14 Apr 2026, effective
  4 Jun 2026. [92%]
- **Ages.** Alpaca and Hetzner both require 18+. [80-90%]
- **EU retail clients cannot buy SPY** (no PRIIPs KID). A real-money control would be a UCITS ETF. [85%]
- **`/goal` exists in Claude Code** (since v2.1.139). [95%]

## Things in the plan I kept as is
Pre-registration, the three-way split, count every look, controls, slow gated learning, hindsight
tables isolated, Claude as reviewer not trader, the Tier 1/2/3 analytics, the fixed tag list.
