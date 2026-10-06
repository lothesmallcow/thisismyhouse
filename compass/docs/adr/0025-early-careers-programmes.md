# 0025 · Early-careers programmes: names from trackers, offers from official pages

## Context

Spring weeks, insight days and first-year internships are listed together by a few public trackers
(the-trackr.com, trakvia.de, gorizzume.co.uk, intervyo.co.uk). Copying a tracker's listings would
reuse its database (protected in the EU and the UK even when public). Each programme's own page,
on the firm's site or its job board, is the authoritative source anyway: dates, place, eligibility.

## Decision

Two complementary paths, both read-only and polite (robots.txt, 5 s per host, no job platforms):

1. **Names from trackers** (`pipeline/programmes.ts`): once a week the tracker pages are read for the
   NAMES of the firms that run programmes (catalog companies mentioned, plus names written as the
   first cell of a row or the start of a list item next to a programme). Only the name, a kind
   ("spring week") and the host are kept (`programme_leads`). Dates and texts are not kept.
2. **Official pages**: each lead is checked on its own job board (ATS feed), its careers site
   (JSON-LD), or the official page found by web search (Tavily, shared daily cap): only the firm's
   own domain or its job board (`belongsTo`), never an aggregator. The page becomes an offer.
3. **Web search for students** (quick search and the daily run): queries by year of study (spring
   weeks early, summer internships later, graduate programmes last), career and country. Official
   pages found become offers; aggregator pages found only add names.

Extraction (`core/dates.ts`, `sources/web/programme-page.ts`, `core/extract.ts`), EN/IT/DE/FR:
deadline, opening date, when it runs, "rolling" review; who can apply (UK universities only, right
to work, visa sponsorship, restricted to a group, second year onwards, master's, graduation year).

Nothing is hidden for not fitting: the ranking lowers the score and says why (e.g. "Solo per
studenti di università del Regno Unito", "Per chi si laurea nel 2027, tu nel 2029", "Candidature
chiuse il ..."). Dates are shown as read from the page, with "check them on the official page".

## Limits

Pages drawn only by JavaScript (some Workday pages) give no text: they are skipped. Tracker layouts
change: names are taken from structure, so a new layout may yield fewer names until adjusted.
