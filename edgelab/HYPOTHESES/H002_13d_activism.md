---
hyp_id: H002
title: Schedule 13D filings with activist intent predict positive post-filing drift
status: draft
author: claude
created: 2026-10-03
---
## 1. Claim
After an initial Schedule 13D (not 13D/A) becomes public, the target beats matched peers from the
first tradable open over 20 trading days.

## 2. Economic reason
Activists create value through engagement, but the market under-prices both the probability and the
size of success. Small targets get little analyst attention. The filer accumulates before filing
(most of the move is pre-filing), so we test only the post-filing remainder.

## 3. Prior evidence and decay
- **Brav, Jiang, Partnoy, Thomas (JF 2008):** about +7% in (-20,+20) days, with no reversal.
- **Pre-filing run-up:** much of that move happens before the filing.
- **Rule change:** the 2024 SEC rule shortened the filing deadline to 5 business days (CHECK). That
  leaves less pre-filing leakage and possibly more post-filing drift.
- **Expected post-filing 20d after haircut:** +1%.

## 4. Definition
- **Source:** form type SC 13D (initial only).
- **Exclusions:** filers that are banks or broker-dealers, and companies with an initial 13D in the
  prior 12 months.
- **available_at:** acceptance time.
- **Entry:** first tradable open after. **Direction:** long.
- **Holding:** 20 trading days.
- **Secondary:** split by Item 4 language ("board", "strategic alternatives", "engage"). The keyword
  list is fixed now: board, director, strategic alternative, sale of the company, engage,
  undervalued.

## 5. Primary metric
20d `peer_resid_ret`, pess, versus 0 and versus random-event (SC 13D excluded). Family F1.

## 6. Power
- **Expected events:** about 300-500 initial 13Ds per year in the universe (CHECK).
- **Noise:** sd about 10%.
- **Validation (n about 1,000):** MDE about 0.9%.

## 9. Risks
- Passive filers misfiled as 13D.
- Merger arbitrage situations.
