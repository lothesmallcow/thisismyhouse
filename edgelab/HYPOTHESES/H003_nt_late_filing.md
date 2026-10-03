---
hyp_id: H003
title: NT 10-K / NT 10-Q late-filing notices predict negative residual returns
status: draft
author: claude
created: 2026-10-03
---
## 1. Claim
After a Form 12b-25 notice (NT 10-K or NT 10-Q) becomes public, the stock underperforms matched peers
over 5 and 20 trading days.

## 2. Economic reason
A late filing signals accounting trouble or distress. Retail-heavy, low-attention small caps under-react.
Shorting them is costly and sometimes impossible (limits to arbitrage), which is exactly why the
anomaly can persist. It is also why we may not be able to harvest it.

## 3. Prior evidence and decay
- **Bartov and Konchitchki (Acc. Horizons 2017):** -1.96% over 5 days for NT 10-K.
- **Alford, Jones, Zmijewski (1994):** the reaction is only significant for filers more than 17
  days late.
- **Decay:** no post-2017 evidence.
- **Expected after haircut:** -0.8% over 5 days.

## 4. Definition
- **Forms:** NT 10-K, NT 10-Q (initial).
- **available_at:** acceptance time.
- **Entry:** first tradable open after.
- **Direction:** short (pess cost model includes borrow).
- **Required secondary:** long-only "avoid" version, i.e. return of the stock vs peers with the sign
  unflipped, plus the fraction of names flagged hard-to-borrow by Alpaca.
- **Holding:** 5 trading days primary; 20d secondary.

## 5. Primary metric
5d `peer_resid_ret` (signed for the short), pess, vs random-event. Family F1.

## 6. Power
- **Expected events:** about 1,500-2,500 NT filings per year, most of them micro caps. After the
  universe filter, maybe 600.
- **Noise:** sd about 8%.
- **Validation (n about 1,800):** MDE about 0.5%.

## 9. Risks
- Borrow availability.
- Repeat filers.
- Many names fail the liquidity filter.
