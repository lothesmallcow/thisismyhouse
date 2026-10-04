# 0018. Companies, industries and places for Italy, the UK, Germany and France

**Status:** accepted · 2026-10-04

## Context
People asked for "every company, position and industry" in Italy, the UK, Germany and France, and
to choose where they want to work (country, region, city) so that searches stay cheap. A complete
register of companies (millions of entities, mostly one-person firms) is neither available for free
nor useful: what matters is finding **open positions** at the employers that fit best.

## Decision
- **Offline reference data** in `data/world/`, built by `scripts/build-world-data.mjs` from open,
  reusable datasets (licences in `data/world/README.md`): ~12,400 towns with regions (GeoNames),
  all 1,047 NACE Rev. 2.1 codes in four languages, ~3,100 listed companies (FinanceDatabase).
  Wikidata, GLEIF and national registers were not reachable from the build environment; they can
  be added later through the same script.
- **One catalog**: listed companies and NACE industries go into `catalog_companies` /
  `catalog_sectors` with `source = borsa / nace`, each linked to the closest hand-made sector (so
  themes, suggestions and career paths work for them). They are browsable page by page and
  searchable on "Aziende", but not rendered as thousands of checkboxes. Loaded by
  `ensureDirectory` on migrate, skipped when unchanged.
- **Positions**: a curated list of ~180 roles in Italian, English, German and French
  (`src/lib/catalog/positions.ts`). The questionnaire suggests them; a role is searched in the
  language of each chosen country ("Contabile" → "Accountant" in London).
- **Where**: the questionnaire asks, optionally, countries and regions (plus other cities).
  Ranking pushes down jobs in countries not chosen and treats a chosen region as near.
- **Search budget, best fits first**: the job APIs are asked only for the chosen countries
  (Adzuna it/gb/de/fr), interleaved so each country gets its best search first, within the same
  9 calls per run. Company career feeds are capped at 25 per run: the admin's watchlist, then each
  person's chosen companies ordered by fit (country and region, experience and interests, size, a
  readable feed), the best half every day and the rest in rotation. The same applies to W1
  searches. Only open positions are fetched (APIs: last 7 days; feeds: current openings).
- **The position comes from the listing, never from the company**: a listing is judged on its own
  title (role or chosen sector in the title). At a chosen company an unrelated position gets only a
  small boost (+6 instead of +25) with the reason, and the company's description words don't count.
- **Places**: foreign towns match only real towns (5,000+ people) unless the country is named,
  never common words ("Reading"), and never when guessing from free text.

## Consequences
The data is a snapshot: re-run the build script now and then. Listed companies are a fraction of
employers (no SMEs); "Altro" stays the way to add any company. UK salaries from Adzuna are in
pounds and are left out rather than misread as euros.
