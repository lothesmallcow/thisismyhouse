---
hyp_id: H001
title: Opportunistic insider cluster purchases predict positive 20-day residual returns
status: draft
author: claude
created: 2026-10-03
---
## 1. Claim
When 2+ distinct insiders of the same company make open-market purchases (Form 4 code P) within 5
business days, and at least one is "opportunistic" (did not trade in the same calendar month in
each of the prior 3 years), the stock beats matched peers over the next 20 trading days.

## 2. Economic reason
Insiders hold private information about the firm. Purchases are costly signals: selling has many
liquidity reasons, buying has few. Clusters reduce noise. Investors under-react because Form 4
volume is huge and mostly routine, and the signal is concentrated in small, low-attention firms
where arbitrage capital is thin.

## 3. Prior evidence and decay
- **Cohen, Malloy, Pomorski (JF 2012):** opportunistic insider trades earn 82 bps/month
  value-weighted; routine trades earn about 0.
- **Alldredge and Blank (JFR 2019):** cluster buys earn +2.1% over one month.
- **Decay:** post-SOX the price reaction at announcement is faster.
- **Expected after a 50% haircut:** about +0.8% over 20 days.

## 4. Definition
- **Source:** Form 4 XML.
  - nonDerivativeTransaction with transactionCode = P, acquired.
  - Exclude trades flagged with the Rule 10b5-1 checkbox (2023+).
  - Exclude 10% owners that are funds (reporter is not an officer or director).
- **available_at:** acceptance time of the filing that completes the cluster.
- **Entry:** first tradable open after that. **Direction:** long only.
- **Holding:** 20 trading days. Horizons 1d, 5d and 60d are reported as secondary.
- **Universe:** settings defaults. Purchase value >= $25k per insider.
- **Overlap:** one signal per company per 20 days.

## 5. Primary metric
Mean calendar-time 20d `peer_resid_ret`, pess costs. One-sided t-test, compared with 0 and with the
random-event control (Form 4 events). Family F1 (H001-H005), Holm alpha 0.05.

## 6. Power
- **Expected clusters:** about 300-600/yr (estimated in discovery, CHECK).
- **Noise:** sd about 9% at 20d.
- **Validation (3 yrs, n about 1,200):** MDE = 2.8 × 9% / √1200 = 0.73%. Borderline versus the
  expected 0.8%.

## 7. Splits
Template defaults.

## 8. Kill criteria
Template defaults.

## 9. Risks
- Form 4 parsing errors.
- Amended filings (4/A).
- Insiders filing late. Use acceptance time, never transaction date.
- Small-cap costs.

## 10. Discovery notes
(empty)
