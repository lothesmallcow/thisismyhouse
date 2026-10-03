---
hyp_id: H004
title: 8-K Item 4.02 (non-reliance) and 4.01 auditor resignations predict negative drift
status: draft
author: claude
created: 2026-10-03
---
## 1. Claim
After an 8-K containing Item 4.02 (non-reliance on prior financials), or Item 4.01 where the auditor
**resigned**, the stock underperforms matched peers over 20 trading days.

## 2. Economic reason
Restatements and auditor exits signal governance and earnings-quality problems that take time to be
fully priced: litigation, delisting risk, management turnover. Attention is retail-only for small
issuers, and per Ben-Rephael et al. (TAR 2022) drift appears when institutional attention is
absent.

## 3. Prior evidence and decay
- **Item 4.02:** about -1.1% on day 1 and -2% over 20 days (vendor working paper, weak).
- **Restatements:** about -9% over 2 days in older data (Palmrose et al. 2004, CHECK).
- **Expected post-entry 20d after haircut:** -0.7%.

## 4. Definition
- **Source:** 8-K and 8-K/A with item 4.02 in `items`.
- **Item 4.01:** included only if the primary document text matches "resign" within the Item 4.01
  section. The regex is fixed: `\bresign(ed|ation)\b`.
- **available_at:** acceptance time. **Entry:** first tradable open after. **Direction:** short.
- **Holding:** 20 days.
- **Long-only "avoid" version:** reported as with H003.

## 5. Primary metric
20d `peer_resid_ret`, pess with borrow, vs random-event (8-K). Family F1.

## 6. Power
- **Expected events:** about 150-300/yr after the universe filter (CHECK).
- **Noise:** sd about 10%.
- **Validation (n about 600):** MDE about 1.1%. Probably underpowered; if so, say so in the result.
