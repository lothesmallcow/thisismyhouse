---
name: preregister-hypothesis
description: Draft and register a pre-registered trading hypothesis for edgelab. Use whenever a new research idea, signal, anomaly or strategy is proposed, before ANY returns are computed for it.
---
# Pre-register a hypothesis

1. Copy `HYPOTHESES/TEMPLATE.md` to `HYPOTHESES/H###_<slug>.md` (next free number; check `ls HYPOTHESES`).
2. Fill every section. Hard requirements:
   - Section 2 names who is on the other side and why they cannot or will not arbitrage it. If you
     cannot write this in 3 sentences, stop: the idea is pattern-mining.
   - Section 3 applies at least a 50% haircut to published effects.
   - Section 4 is specific enough that two people would write the same code.
   - ONE primary metric. Everything else is labelled secondary.
   - Section 6 computes the MDE and the forward stop rule with `edgelab.analytics.stats`
     (`min_detectable_effect`, `required_n`). Show the numbers. If the validation MDE is more than 2x
     the haircut effect, say "underpowered" in the title line of section 6.
   - If any feature comes from an LLM reading text, the hypothesis is FORWARD-ONLY (see CLAUDE.md rule 6).
3. Commit the file with `status: draft`. Discovery-period exploration may refine section 4.
   Every exploratory evaluation is logged via `stats.log_test(split="discovery")`.
4. Before the validation run: set `status: registered`, commit, then run
   `python -m edgelab.cli register HYPOTHESES/H###_<slug>.md`. That records the SHA-256 and commit.
   From then on the file is immutable. A changed idea gets a new id (H###b).
5. Run validation ONCE with the frozen spec. Log it. Apply Holm across the family. Write the result
   into `JOURNAL/` and update `hypotheses.status`.
