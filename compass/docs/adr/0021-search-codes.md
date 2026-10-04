# 0021. Search codes: one batch of searches per set of answers

**Status:** accepted · 2026-10-04

## Context
With ~950,000 companies in the catalog, searching "everything" is neither possible nor allowed
(free quotas, no bulk crawling). Searches must follow what each person asked for, cost as little
as possible, and adapt when an answer changes.

## Decision
- The questionnaire becomes a **search code** of brackets: track, places (city and radius, region,
  country), roles (or sectors for students), level (junior/middle/senior/lead from the timeline, or
  the year of study), chosen sectors, hours and contract. Shown in Profilo → Codice di ricerca.
- The code produces a fixed **batch of searches**, each with a stable key: job API searches in
  the language of each country, web searches on the right sites per country (LinkedIn, Indeed,
  InfoJobs / Reed / StepStone / Welcome to the Jungle), and searches for the person's best-fitting
  companies (in rotation).
- **Shared and cached**: a key searched in the last 20 hours by anyone is not searched again; two
  people with the same brackets cost one search. Changing one answer changes only the keys that
  depend on it.
- **Big job sites**: LinkedIn and Indeed give no public job-search API (Indeed closed its publisher
  API; LinkedIn's is for partners). The code produces ready links to create the same searches as
  e-mail alerts on LinkedIn, Indeed and InfoJobs; Compass already reads those e-mails.

## Consequences
Cheaper and explainable. Better official APIs exist per country (Reed for the UK, Bundesagentur für
Arbeit for Germany, France Travail for France); each needs its terms reviewed and a free key, so
they are proposed, not enabled. Italy has no free national job API: alerts, web search and
company career pages are its sources.
