# 0019. A fit score out of 100, in seven readable parts

**Status:** accepted · 2026-10-04

## Context
People find it hard to weigh role, experience, requirements, place, pay and their own preferences
together, and want one number they can trust, with the option to decide what matters more.

## Decision
- The explainable factors of the ranking (ADR 0006) are grouped into **seven parts**: role,
  experience, requirements, place, pay, conditions, choices. Each part is 0-100 from its factors
  (50 = the listing doesn't say). The **score** is their weighted average.
- **Default weights**: role 25, experience 15, requirements 15, place 15, pay 10, conditions 5,
  choices 15; students: role 30, experience 5, choices 20. People can change them (Profilo →
  Punteggio); nothing needs touching.
- **Hard limits** whatever the weights: a clearly wrong role ≤ 50, a different job with nothing
  from their sectors or experience ≤ 48, too far or under the pay floor ≤ 60, avoided words or
  sectors ≤ 35, a likely scam ≤ 20, an avoided company or the current employer ≤ 10.
- **Levels** come from the score: Molto adatta ≥ 70, Adatta ≥ 52. Lists are sorted by score.
- **Experience** comes from the timeline: same sector, nearby sector (shared theme), level vs years.
- **Requirements** are read from the listing (years, degree, ~20 skills, languages) and checked
  against the CV and timeline only (wishes are not experience). Shown one by one with tips.
- **The position is the listing's**, never the company's (ADR 0018).

## Consequences
Scores are comparable across sources and people can see exactly why. The calibration is by rules
and demo data; real listings will show where weights need tuning (`rank-config.ts`, `fit.ts`).
