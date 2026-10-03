---
hyp_id: PC1
title: (POSITIVE CONTROL) Earnings 8-Ks (item 2.02) show a much larger |gap| than matched non-event stocks
status: draft
author: claude
created: 2026-10-03
---
Not a trading hypothesis. It is a pipeline check that MUST pass before any Phase 2 result is trusted.

**Claim:** mean |gap return| (previous close to first tradable open) for item 2.02 8-Ks is at least
2x the mean |gap| of the same signal's matched peers.

**Expected:** about 3-5x. Earnings move stocks overnight.

**If it fails:** acceptance times, first_tradable_open, or the bar data are misaligned.
- Stop all research and fix.
- The ratio also gets computed for a placebo where every timestamp is shifted by +2 trading days.
  That ratio must collapse to about 1x.

Not part of family F1. No multiple-testing correction applies.
