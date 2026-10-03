---
hyp_id: H005
title: Material 8-Ks filed Friday after-hours drift more than the same items filed Mon-Thu during market hours
status: draft
author: claude
created: 2026-10-03
---
## 1. Claim
For 8-Ks with items 1.01, 1.02, 2.01, 2.05, 2.06, 4.01, 4.02 or 5.02 (material events), the
absolute 5-day post-entry residual move continues in the direction of the gap more when the filing
was accepted Friday 16:00-22:00 ET than when accepted Monday-Thursday 09:30-16:00 ET.

## 2. Economic reason
Limited attention. Firms time bad news for low-attention windows, and investors process less on
Fridays and in the evening (DellaVigna and Pollet 2009). Slower processing means more drift.

## 3. Prior evidence and decay
- **DellaVigna and Pollet (JF 2009):** Friday announcements get 15% less immediate response and 70%
  more delayed response.
- **Michaely, Rubin, Vedrashko (JAE 2016):** the Friday-evening effect is the largest.
- **Decay:** high risk.

## 4. Definition
- **Signal direction:** sign of the gap return (previous close to entry open). Momentum: trade in
  the gap's direction.
- **Treatment:** Friday after-hours filings. **Control:** Mon-Thu market-hours filings, same item set.
- **Entry:** first tradable open after the filing. **Holding:** 5 days.

## 5. Primary metric
Difference in mean 5d `peer_resid_ret` (signed by gap direction) between treatment and control.
Family F1.

## 6. Power
- **Treatment events:** about 2,000/yr. **Control:** many more.
- **Noise:** sd about 8%.
- **Validation:** MDE about 0.3%.
