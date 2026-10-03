---
hyp_id: H006
title: (FORWARD-ONLY) LLM-scored surprise/tone of 8-K text predicts 1-5 day residual returns in small caps
status: draft
author: claude
created: 2026-10-03
---
## 1. Claim
A fixed-prompt LLM score of 8-K "news surprise × direction" ranks next 1-5 day `peer_resid_ret`
(information coefficient > 0) for small and mid caps.

## 2. Economic reason
Unstructured filings are tedious to read. Small-cap 8-Ks get little attention, so information is
priced slowly. LLMs cut the reading cost to near zero, but this is exactly the edge that is being
competed away (Lopez-Lira and Tang: Sharpe 6.5 in 2021, 1.2 in 2024).

## 3. Why forward-only
LLM look-ahead bias (see docs/LITERATURE.md). Any historical test with a model trained after the
text date is contaminated. Only filings accepted after the model's training cutoff count.

## 4. Definition (to be completed in Phase 2b)
- **Model:** fixed version id, temperature 0, fixed prompt (hash logged in `sensor_outputs`).
- **API:** paid Anthropic API key, not the subscription.
- **Score:** `{direction:-1..1, surprise:0..1, certainty:0..1}`.
- **Signal:** direction × surprise, top/bottom decile within the day.
- **Shadow phase:** 6 weeks logged only, no trades. IC and decile spreads measured.
- **Forward test:** the shadow-phase spec is then registered unchanged and traded for N events from
  the power calculation.

## 6. Power
- **Events:** about 300 8-Ks/day; after the universe filter about 120/day; the top and bottom deciles
  give about 25 signals/day.
- **Noise:** sd about 6% at 3d.
- **Over 30 trading days:** n = 750 and MDE = 0.6%.
- **IC test:** detecting IC = 0.03 needs about 9,000 scored filings, roughly 3.5 months of shadow data.

## 9. Cost
- **Haiku-class model with the Batch API:** estimate before approval. Rough guess $2-10/month if
  only universe-filtered 8-Ks are scored and documents are truncated.
- **Needs Lorenzo's approval:** this is a new paid service.
