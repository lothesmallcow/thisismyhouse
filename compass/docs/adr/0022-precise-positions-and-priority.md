# 0022 · Precise positions, two questionnaires, CV recommendations, job priority

Status: accepted · 2026-10-04

## Context
Generic roles ("venditrice moda", "impiegata") bring back hundreds of unrelated listings on the job
sites. New accounts did not all have time for a 12-step questionnaire. People's CVs already say
which positions fit them. And someone who needs a job next month should not see the same narrow
list as someone who can wait for the right one.

## Decision
- **Precise positions**: a generic role is turned into the 2-3 titles that listings in that sector
  use, at the person's level (sales in luxury: Client advisor, Sales associate lusso, Store manager
  lusso). The questionnaire says the role is too generic and proposes them, ticked; the search code
  uses them instead of the generic words.
- **Two questionnaires**: a new account first chooses the quick one (5 questions) or the complete
  one (12). The quick one can be completed later from the profile, answers kept.
- **Positions from the CV**: from the timeline and the CV text, Compass proposes what the person
  already did (as listings name it), the usual next step from their latest role, and job titles
  written in the CV. Each comes with its reason; nothing is added until the person ticks it. Shown
  in the CV step of the questionnaire, on the CV page and in Profilo → Posizioni cercate. At most 5
  roles are searched.
- **Job priority** (questionnaire and Profilo → Punteggio):
  - alta (needs a job soon): also the titles one step below, up to 5 searches per country, no
    penalty for a role below their level, "Molto adatta" from 64 and "Adatta" from 45;
  - media: as before (70 and 52);
  - bassa (can wait): only the best title per role, a double penalty for a role below their level,
    76 and 60.

## Consequences
Fewer wasted searches and less spam; more searches only for those who ask for them (alta). The
title tables are hand-made for the most common generic roles (sales and office work); other generic
roles are searched as written until a table is added.
