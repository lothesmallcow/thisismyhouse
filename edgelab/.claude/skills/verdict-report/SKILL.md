---
name: verdict-report
description: Write the Phase 5 verdict for a forward-tested edgelab strategy (edge / no edge / inconclusive). Use only when a forward test has reached its pre-registered stop rule, or when Lorenzo asks for a verdict.
---
# Verdict report

Only when the forward test reached BOTH its pre-registered event count and 8 weeks. Otherwise write
"not yet: n=..., weeks=..." and stop.

1. Re-read the pre-registration. Verify its hash is unchanged (`governance.verify_prereg_unchanged`).
2. Primary metric exactly as registered, on forward data, pess costs: estimate, CI (block bootstrap),
   p-value, MDE for this n.
3. Versus controls: candidate minus random-event, candidate minus SPY, on matched dates.
4. Matched-control counterfactual (peer residuals), FF5+momentum regression alpha and t.
5. Deflated Sharpe with n_trials = all looks for the family in `test_log`.
6. Implementation: broker-vs-sim fill differences (if mirrored), shortfall breakdown, expired orders.
7. Consistency with validation-period estimate (same sign? within CI?).
8. Call, using these rules decided in advance:
   - **edge**: primary passes at the registered alpha on pess costs AND beats random-event AND sign
     matches validation.
   - **no edge**: CI excludes the haircut expected effect, or the sign is wrong.
   - **inconclusive**: everything else (usually: underpowered). Say what n would settle it.
9. Spawn a skeptic subagent with ONLY the data and the pre-registration (not your reasoning), told
   to find leakage, survivorship, multiple-testing or cost errors. Answer every objection in the report.
10. Write `JOURNAL/verdicts/<hyp_id>.md`, update `hypotheses.status`, `STATE.md`. Plain language
    summary for Lorenzo on top, 5 lines max.
