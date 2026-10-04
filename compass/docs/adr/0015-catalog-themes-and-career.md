# 0015. Catalog, themes and career suggestions (rules, no AI)

**Status:** accepted · 2026-10-04

## Context
People want to pick the companies and sectors they care about, see more of those, and get ideas
beyond their current sector ("from luxury fashion to yachts"). The niche sectors of real users
will never all be in a list.

## Decision
- **Curated catalog** in code (`src/lib/catalog/data.ts`): sectors with keywords and broad
  **themes** (lusso, finanza, moda, mare, ospitalità...), companies with a kind (boutique, bank,
  fund, brand...), a main sector, **extra sectors** and their own themes. A brand is never only its
  primary sector (Ferrari: cars, plus luxury fashion and sport). `ensureCatalog` updates curated
  rows on every migrate and never touches what people added.
- **"Altro"**: anyone can add a sector or company; it stays private to them until the admin shares it.
- **Preferences** (`user_prefs`): like or avoid, per sector or company. They feed the ranking
  (named weights in `rank-config.ts`) and the **focus switch**: all jobs with choices first, only
  choices, or only chosen companies.
- **Interest profile**: weighted sectors and themes from experiences (strongest, recent counts
  more), chosen sectors, chosen companies, tastes, roles sought and CV words, each with the reason
  why. Suggestions and career paths are the sectors/companies that share the most weight with it,
  spread across sectors; each shows where the idea comes from.
- **Fit warning**: when a chosen company shares no theme or sector with the rest of the profile
  (and the profile is strong enough to judge), a gentle note, never a block.
- **Students**: `careerStage(year, length)` maps the year of study to what fits (spring weeks and
  insight days early, summer internships in the penultimate year, graduate programmes in the
  final year); the ranking rewards those and pushes down Associate/Senior titles.

## Consequences
Explainable and testable, but only as good as the catalog: themes and role ideas are hand-written
and must be extended by hand. The application deadlines in the student advice are general
guidance, said so on screen.
