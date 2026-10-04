# 0006. Rule-based extraction and explainable ranking

**Status:** accepted · 2026-10-04

## Decision
No paid AI in v1. Everything is deterministic and unit tested (`src/lib/core/`):
- **Salary** (`salary.ts`): "RAL 28-32k", "28.000 - 32.000 € annui", "1.600 € netti/mese", "14 €/h",
  "CCNL Commercio 4° livello". Normalized to annual gross; the original string is kept; anything
  derived from net/monthly/hourly/CCNL tables is flagged **"stima"**; gross and net are never
  mixed silently. Unknown is neutral (since D.Lgs. 96/2026, in force from 7 June 2026, ads must
  state pay or a range, but thin records often won't carry it).
- **Contract, hours, remote, languages, sector** (`extract.ts`): Italian + English dictionaries.
- **Application e-mail** detection with the sentence it came from as evidence; privacy-notice
  and no-reply addresses ignored.
- **Dedupe** (`dedupe.ts`): normalized company + title + city, fuzzy title match within the
  same company/city, canonical URLs (LinkedIn/Indeed ids), every source link kept.
- **Ranking** (`rank.ts`): a sum of named factors, each with an Italian reason. Shown as three
  levels, never numbers. "Non mi interessa" adds ONE visible, undoable adjustment.

## Consequences
Every ranking can be explained in an interview from `job.factors`. The admin "Classifica" page
shows the breakdown. The optional AI enrichment hook of version C would add a factor, not
replace the rules.
