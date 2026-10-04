# Changelog

## 0.9.0 · 2026-10-04

Ready to go online, invite or request only.

- **Access on request** (now the default): anyone with the link asks for access, the admin gets an
  e-mail and approves or rejects in Admin → Persone; the person is told by e-mail. An invitation
  still lets someone in at once.
- **Built for an online database billed by rows read**: company search through a full-text index,
  browsing and suggestions through indexes, counts capped or stored; no page reads the ~950,000
  register rows any more (each now reads about what it shows, measured on the full data).
- **Going online** (`docs/online.md`, in Italian): Turso + Vercel (EU region) + GitHub Actions,
  with a one-click `setup` job; registers loaded online default to Italy (`REGISTERS`).
- Privacy notice at `/privacy` (owner from `PRIVACY_OWNER`), linked from sign-up.
- Real mode refuses to seed an admin without its own password (the demo one is public).
- Try it in a GitHub Codespace in one click (`.devcontainer`).

## 0.8.0 · 2026-10-04

- **Precise positions**: generic roles ("venditrice moda") become the titles listings use, by
  sector and level (Client advisor, Sales associate lusso, Store manager lusso); the questionnaire
  explains why and the search code uses them.
- **Quick or complete questionnaire**: new accounts choose at the start (5 or 12 questions); the
  quick one can be completed later from the profile.
- **Positions from the CV**: roles already done, the usual next step, and titles in the CV, each
  with its reason; the person ticks what to search (CV step, CV page, Profilo → Posizioni cercate).
- **Job priority** (alta, media, bassa): wider searches and gentler thresholds when a job is needed
  soon, only the best titles and stricter thresholds when there is time.

## 0.7.0 · 2026-10-04

- **Search codes**: the questionnaire becomes brackets (places, roles, level, sectors, hours and
  contract) and a fixed batch of searches; shared between people with the same brackets, not
  repeated within 20 hours, and only the affected searches change when an answer changes.
  Profilo → Codice di ricerca shows the code, its searches and ready links to create the same
  alerts on LinkedIn, Indeed and InfoJobs.

## 0.6.1 · 2026-10-04

- **951,647 real companies loaded** from the official registers: UK (Companies House + GLEIF)
  367,124, Germany 228,040, Italy 206,517, France 149,966. Live companies only (no dormant, funds,
  branches); loaded by `npm run db:migrate` once (about 90 s), searchable and browsable on Aziende.

## 0.6.0 · 2026-10-04

Every company and every job title, as far as the open data goes.

- **Official registers**: importers for Companies House (UK), INSEE SIRENE (France),
  OffeneRegister (Germany), the GLEIF golden copy (any country) and a plain CSV (e.g. Italy); only
  live companies, SIC/NAF → NACE sectors, city → region; filters by region, city, sector, size and
  limit; dry run. Register companies are searchable, browsable, and used in suggestions.
- **ESCO**: every EU occupation (~3,000) in Italian, English, German and French, imported from the
  official files, used by the questionnaire and by the searches in each country's language.
- **Listed companies**: now all ~3,300 of the four countries, also those without an industry tag.
- Tested on fake samples in each official layout (`fixtures/registers/`, `fixtures/esco/`).

## 0.5.0 · 2026-10-04

Tested against a persona: a store manager in high fashion in Milan, open to watches, still employed.

- **Fit score out of 100** in seven parts (role, experience, requirements, place, pay, conditions,
  choices), optional weights in Profilo → Punteggio, hard limits; levels and order from the score;
  minimum-score filter and sort (best fit, newest, best paid).
- **Requirements check** on every offer: years, degree, skills, languages against the CV and the
  timeline, with tips for each gap; "either-or" requirements read as one.
- **Experience** in the score: same sector, nearby sector (career change), level vs years.
- **Role sheets** (30 roles): tasks, skills, experience, typical age, pay by employer size adapted
  to region and country; offers without pay show the estimate.
- **Dove proporti**: companies in your field and in nearby fields, region first, and a "Scrivi"
  flow for spontaneous applications (address published by the company, same guardrails).
- **Folders**: named folders for saved offers, three starter ones with demo offers.
- **Discreet search**: the current employer is never suggested or contacted and scores ≤ 10.
- **Demo**: a third fake person (luxury retail, Milan). Persona review in
  `docs/audit/persona-luxury-retail.md`.
- **Tests**: 316 unit/integration, 21 end-to-end.

## 0.4.0 · 2026-10-04

Four countries, the whole catalog, and searches that spend the free quotas on the best fits.

- **Where to work** (optional, in the questionnaire): countries (Italy, UK, Germany, France),
  regions, other cities. Ranking pushes down other countries and treats a chosen region as near.
  Foreign cities by Italian names too ("Londra", "Monaco di Baviera").
- **Catalog**: ~3,100 listed companies of the four countries and all 1,047 NACE industries in four
  languages, browsable and searchable on "Aziende" (by name, city, activity), filtered by the
  person's countries and regions; suggestions and career paths use them too.
- **Positions**: ~180 roles in Italian, English, German and French, suggested in the
  questionnaire and searched in each country's language.
- **Searches**: job APIs only in the chosen countries (Adzuna it/gb/de/fr); company feeds and web
  searches capped per run, best fits first and the rest in rotation; feeds keep offers in the
  chosen countries.
- **The position is the listing's**: a chosen company boosts a listing fully only when the
  listing's own title fits the roles or sectors wanted; otherwise a small boost and a clear reason
  ("ruolo diverso"), and company boilerplate in the description no longer counts as a match.
- **Fixes**: "Londra" now matches ads in "London"; UK pay in pounds is not read as euros.
- **Tests**: 302 unit/integration, 20 end-to-end.

## 0.3.0 · 2026-10-04

Several people, internships for students, a catalog of companies and a career panel.

- **Accounts**: invitations or admin-created accounts; registration closed / by invite / open;
  jobs shared, scores and everything personal per person; admin "open their app"; one mailbox per
  person optional (`MAILBOX_<KEY>_*`); `DIGEST_TO` replaced by each person's digest address.
- **Students**: a `stage` track with its own questionnaire (university, year, periods, paid
  only); internships, spring weeks, insight days and graduate programmes recognised; ranking by
  year of study (first years: spring weeks, not Associate roles); English letter templates.
- **Catalog**: ~180 boutiques, banks, funds, consulting firms, startups and brands, with extra
  sectors and themes; "Altro" for anything missing (private until shared); like/avoid choices.
- **Focus and filters**: all jobs with choices first / only choices / only chosen companies;
  minimum net pay, type, contract, hours, sector, search; defaults from the questionnaire,
  saveable.
- **Career panel**: experience timeline from the CV (PDF text) or a LinkedIn data export;
  career paths and company suggestions by shared themes; a gentle fit warning; advice for the
  year of study; redo the questionnaire or change single answers.
- **Design**: new professional, minimal UI with dark mode; 234 screens audited, 0 axe issues.
- **Tests**: 287 unit/integration (incl. migration of legacy data and isolation between people),
  19 end-to-end flows.

## 0.2.0 · 2026-10-04

Hardening after an independent review and a full audit.

- **Sending**: her stop and the admin's stop are separate; scam rules recomputed at send time;
  one e-mail per queue run with real spacing; daily cap re-checked at send time; atomic claim
  (no double sends); stuck sends recovered and reported; real mode with sending off waits instead
  of pretending; first week starts at the first real send; Italian public holidays; "Invia tutte"
  sends exactly what she saw and never flagged drafts; digest independent of the sending switch.
- **Sources**: 403/429 pause the whole host; W2 follows redirects through robots.txt and never
  fetches job platforms; HTTP retries with backoff; W1 suggests spontaneous companies; W3 safety
  gate (caps, spacing, stop rules) with tests; optional Nominatim geocoder (off).
- **Security/privacy**: startup env validation in real mode; sign-in throttling; reply status
  whitelist; delete-all in one transaction; admin alerts by e-mail; CSV backup export.
- **UI**: axe-clean on 98 screens (WCAG A/AA + AAA contrast), all her text >= 18 px, no sideways
  scroll at 320 px; clearer copy found in a first-time-user walkthrough.
- **Performance**: batched re-ranking (5,000 jobs: 7.5 s -> 0.8 s).
- **Docs**: admin guide, Italian guide with screenshots, audit reports, LICENSE (MIT).

## 0.1.0 · 2026-10-04

First complete version, demo mode end to end.

- **M0** research recorded as ADRs 0001-0012 (mailbox access, job APIs, search API, hosting,
  geodata, guardrails, W3, auth, privacy).
- **M1** Next.js 16 + Drizzle/libSQL skeleton, CI, secret + personal-data scanning, demo seed,
  LinkedIn alert parser + generic fallback, Adzuna adapter, offers list.
- **M2** onboarding wizard (8 steps), filters, detail page, explainable ranking with
  "Non mi interessa" adjustments, Indeed and InfoJobs parsers, W1 (Tavily, capped) and W2
  (robots.txt, polite fetcher, JSON-LD), ATS watchlist (6 systems).
- **M3** CV library, letter templates, Lane 3 kit, Lane 2 Claude prompt, Lane 1 approval mode
  with every guardrail, kill switch, undo window, send log.
- **M4** autopilot toggle, spontaneous applications (+ CSV import), reply detection, daily digest,
  scheduled jobs (GitHub Actions + protected `/api/cron/*`).
- **M5** PWA (manifest, icons, offline page), Italian guide, README with Mermaid architecture and
  screenshots, admin metrics, public landing page and subscription page (invented prices,
  payments not active). Deployment prepared, not performed.
- **M6** W3 designed (flag, caps, health) but not shipped in this public repository.
