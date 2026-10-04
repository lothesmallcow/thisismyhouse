# Goal
Build **Compass** (the brief calls it "Bussola"), a boomer-proof Italian job finder for one person: email alerts first, legal tiered web discovery second, rule-based parsing/ranking, three application lanes with strict sending guardrails, demo mode with fake data, plus a public "Abbonamento" (subscription) page with invented prices. Must be portfolio-grade (tests, CI, ADRs, README) and aesthetically pleasing. Spec: `BRIEF.md`

**Extension (0.3.0, your messages of 2026-10-04):** several accounts (you and your mother), internships for you as a first-year BIEF student, a catalog of boutiques/banks/funds/brands with "Altro", suggestions from CV/experience/tastes, a focus switch (all jobs with choices first / only choices / only chosen companies), filters with questionnaire defaults, themes and multi-sector brands, a career panel, fit warnings, an experience timeline (CV or LinkedIn), redo/edit the questionnaire, year-of-study rules (spring weeks for first years, not Associate), and a professional minimal redesign.

## Definition of Done
- [x] M0: research decisions recorded as ADRs (mailbox, job APIs, search API, hosting, stack, schema, risks) — docs/adr/0001-0012
- [x] Runs locally with one command (`npm run demo`) in demo mode, from a clean checkout
- [x] Demo seed: realistic fake Italian jobs, companies, emails; zero real personal data in the repo (scan passes)
- [x] Email-alert parsers: LinkedIn, Indeed, InfoJobs (synthetic fixtures, "needs real sample") + generic fallback; processed messages never parsed twice
- [x] Job API adapter (Adzuna; Jooble off) + ATS adapters (Greenhouse, Lever, Ashby, SmartRecruiters, Workable, Personio); tests use fixtures only
- [x] Manual add (paste text, rule-based prefill in the browser)
- [x] W1 search discovery (Tavily, hard daily cap 25, counter bumped before the call, thin records, listing pages skipped)
- [x] W2 JSON-LD extractor + polite fetcher (robots.txt, 5 s/domain, cache, conditional GET, stop on 403/429), approved-sites list
- [x] W3: hook + flag only (off); fetcher not published (see Waiting on you)
- [x] Extraction rules with unit tests (salary, contract, hours, remote, languages, application email + evidence, location + distance)
- [x] Dedupe across sources keeping every source link
- [x] Explainable ranking: 3 levels + 1-2 Italian reasons; "Non mi interessa" adjusts ranking visibly and undoably
- [x] Onboarding wizard (8 steps, "Passo N di 8", skippable, editable later from Aiuto → Il mio profilo)
- [x] "Offerte" list with filters, "Mostra altre 10", detail page
- [x] CV library (1-3 PDFs, auto pick + override), letter templates with merge fields, editable
- [x] Lane 1 approval mode: Invia / Salta / Invia tutte, confirm in words, 15-minute "Annulla"
- [x] Lane 1 autopilot toggle (admin, opt-in) obeying every guardrail
- [x] Guardrails (caps, no repeats, send window, spacing, kill switch, scam filter, blocklist, PDF < 2 MB, plain text, full log)
- [x] Spontaneous applications (manual + CSV import, published address + source URL, 6-month rule)
- [x] Lane 2 "Prepara con Claude" prompt (copy) + paste-back
- [x] Lane 3 "Kit candidatura" with Copia buttons + "Fatto, mi sono candidata"
- [x] Reply detection (thread first, domain fallback) + notification + one-tap status confirm
- [x] Daily digest email (simulated in demo mode, once per Rome day)
- [x] Demo mode: nothing leaves the server; real sending needs DEMO_MODE=false AND admin switch AND mailbox
- [x] Boomer-proof UI checks automated in e2e (>=18px body, >=48px labelled targets, "Cosa faccio qui?" on every screen); 4-item bottom nav; PWA; 180-day sessions
- [x] Separate admin login + admin area
- [x] Metrics page from raw rows
- [x] "Cancella tutti i miei dati"
- [x] Public "Abbonamento" page (invented prices, clearly marked as not yet active)
- [x] Aesthetically pleasing design (checked by screenshots on phone and laptop)
- [x] Secret + personal-data scanning in pre-commit and CI; CI runs lint, typecheck, unit tests, build, e2e
- [x] Scheduled jobs (GitHub Actions workflow + protected /api/cron routes)
- [x] Deployment prepared at EUR 0 (docs/setup.md, vercel.json), not deployed (permission point)
- [x] Tests, lint and typecheck pass (245 unit/integration, 15 e2e, CI green)
- [x] Every user-facing feature exercised in the running app (Playwright e2e on the production build)
- [x] README, CHANGELOG, ADRs, Italian guide (docs/come-si-usa.md)

### Definition of Done: extension 0.3.0
- [x] Accounts: invitations (HMAC, shown once), admin-created accounts, registration closed/invite/open, deactivate/delete, admin "Apri la sua app"
- [x] Data separated per person (jobs shared, `user_jobs` per person, private alert sources stay private); migration 0003 moves the old single-person data (tested on legacy rows)
- [x] One mailbox per person optional (`MAILBOX_<KEY>_*`); digest to each person's address
- [x] Stage track: own 12-step questionnaire, job type/eligibility/duration extraction, ranking by year of study, English templates, student search queries
- [x] Catalog: ~180 companies (boutiques, banks, funds, consulting, startups, brands incl. fashion, yachts, luxury hotels), sectors with themes, extra sectors per brand, "Altro" private until shared
- [x] Suggestions from CV, experiences, tastes, choices; career paths with roles; fit warnings; student year advice
- [x] Focus switch + filters (min net pay, km, type, contract, hours, sector, days, search) with defaults from the questionnaire, saveable
- [x] Experience timeline from CV PDF text or LinkedIn data export; manual add/delete
- [x] Redo the questionnaire (answers kept) or edit single steps
- [x] Redesign (Inter, light/dark, top bar + 5 tabs); 234 screens audited, 0 axe violations, 0 overflow
- [x] 287 unit/integration tests, 19 e2e, simulate-week passes, load test 2 people × 5,000 jobs

## Plan
- [x] M0 research + ADRs
- [x] Scaffold Next 16 + TS + Tailwind 4 + Drizzle/libSQL, design system, auth
- [x] Core rule engine
- [x] Sources + ingestion pipeline + health
- [x] Her app, onboarding, applying lanes, automation
- [x] Admin area, metrics, landing, subscription page
- [x] PWA, docs, CI, scanning, screenshots
- [x] Full e2e verification
- [x] Independent review against the Definition of Done (15 findings, all fixed with tests)
- [x] Full audit checklist answered with evidence: `.goal/AUDIT.md`

## Waiting on you
Ordered by what unblocks the most. None of this is needed to try the demo (`npm run demo`).

1. **Mailbox** (unblocks real alerts, replies, sending): create the dedicated Gmail, 2-Step Verification, app password; set `MAILBOX_USER`, `MAILBOX_APP_PASSWORD`, `CONTACT_EMAIL`, `ADMIN_ALERT_EMAIL` in `.env` (never in chat). For your own mailbox add `MAILBOX_STUDENTE_USER` / `MAILBOX_STUDENTE_APP_PASSWORD` and pick `studente` for your account in Admin → Persone (or share the default one). Then forward the platform alerts to it. `docs/setup.md` §1-2.
2. **Real alert samples** (unblocks trustworthy parsers): after alerts start arriving, export 2-3 per platform, anonymize, add to `fixtures/emails/`. All three parsers are built on synthetic samples.
3. **Free API keys** (no card): Adzuna (`ADZUNA_APP_ID/KEY`) and Tavily (`TAVILY_API_KEY`). And **confirm Adzuna's terms** allow ongoing personal non-commercial use (their terms mention a 14-day evaluation).
4. **Permission points I did not do**: create the dedicated public repo and move `compass/` there; Turso database; Vercel project; GitHub Actions secrets; deploy; switch real sending on. `docs/setup.md` §4-7.
5. **W2 sites**: choose real sites (inPA, local agencies, target companies' "Lavora con noi"), write the terms + robots.txt summaries in admin → Siti, approve.
6. **Company watchlist**: which target companies, and which ATS they use (admin → Aziende; how-to in `docs/guida-admin.md`).
7. **W3 decision**: read LinkedIn/Indeed/InfoJobs terms on automated access and decide. The safety gate exists; the fetcher does not (ADR 0009). My recommendation: don't.
8. **Geocoder**: OK to switch on OpenStreetMap Nominatim as a fallback for places outside the comuni list? (admin → Fonti, off by default.)
9. **Geodata licence**: confirm the opendatasicilia coordinates can be used publicly, or I swap to the ODbL OpenStreetMap dataset (ADR 0007).
10. **On her phone, once live**: install the PWA ("Aggiungi a schermata Home"), check the morning e-mail looks right in Gmail, try airplane mode once.
11. **Usability test**: watch her use "Offerte" for 15 minutes without helping, then again after the applying screens.
12. **Small decisions**: MIT licence OK? Lane 2 paste-only (no file upload back) OK? Delete `.goal/` notes before publishing?
13. **Subscription page**: prices are invented. If you ever charge, Vercel Hobby (non-commercial) is no longer allowed and you need payments + Italian invoicing/VAT: talk to an accountant first.
14. **Keep the schedule alive**: GitHub disables scheduled workflows after 60 days without commits on a public repo.
15. **Your mother's niche sector**: I don't know it, so it is not in the catalog. She can add it with "Altro" (sector and companies), or tell me the sector and 10-20 companies and I add them with themes.
16. **Your timeline**: upload your real CV in the app (not in the repo) or the LinkedIn export zip (LinkedIn → Settings → Data privacy → Get a copy of your data → Positions + Education). LinkedIn's API does not give work history, so "connect LinkedIn" is not possible.
17. **Eligibility check**: many spring weeks and insight programmes are for students in a specific year and some have minimum-age or right-to-work rules (e.g. London). The app's year rules are general; check each programme's page.

## Decisions
- Project name is **Compass** (your instruction); UI copy stays Italian.
- Built in `compass/` inside `lothesmallcow/thisismyhouse` on branch `claude/zen-carson-uxhsg1`, because this session can only push there (ADR 0012). Root `.github/workflows/compass-ci.yml` runs CI for it; `compass/.github/workflows/` is ready for the standalone repo.
- `thisismyhouse` is a **public** repo: nothing personal goes in; W3 (`private-sources/`) is gitignored and not built.
- `.goal/PROGRESS.md` is committed (the skill says gitignore `.goal/`), because this container is wiped after the session. Delete it before publishing if you want.
- Mailbox: IMAP+SMTP with app password, not Gmail API (7-day token expiry in Testing) nor Apps Script (quotas, split runtime). ADR 0002.
- W1 provider: Tavily (1,000 free credits/month, no card). Brave needs a card with no spending cap; Google CSE is closed to new customers; Bing retired. ADR 0004.
- Hosting: Vercel Hobby + Turso + GitHub Actions cron (Vercel Hobby crons are once a day only). ADR 0005.
- Careerjet not built (publisher API, needs a key, little extra value). Jooble built but off (lifetime quota ~500).
- Adzuna "predicted" salaries are ignored (not facts).
- Brief point "first week after go-live: 3 per day": go-live = the first time the admin switches real sending on.
- Brief says "Hard max 20" for daily cap: enforced in code and in the admin form; "undo window" can be raised but never lowered below 15 minutes.
- Manual add never fetches the pasted link (a pasted LinkedIn link would otherwise become a W3 fetch): she pastes the text, rules prefill the form.
- Demo "Invia la coda adesso" tool: outside the send window it records the simulated send at 10:00 of the next weekday rather than bypassing the window.
- Italian number formatting: "1200 €" (CLDR Italian does not group 4-digit numbers); fine.

## Log
- 2026-10-04 13:00 Extension 0.3.0: accounts + migration 0003, per-person server layer, catalog + Altro, focus/filters, stage track, redesign, themes/career panel/fit warnings/timeline/redo questionnaire, year-of-study rules | 287 unit, 19 e2e, audit-ui 234 screens 0 axe, simulate-week OK, perf 2×5,000 | this commit
- 2026-10-04 09:10 M0 research (Gmail app passwords, Gmail API testing tokens, Apps Script quotas, Adzuna/Jooble/Careerjet, Brave/Tavily/Google CSE/Bing, Vercel/Turso, D.Lgs. 96/2026, comuni datasets) | verified by web search | recorded in ADRs
- 2026-10-04 09:15 Core rule engine (salary, extract, geo, dedupe, rank, scam, guardrails, templates, cv, prompt) | 121 unit tests | 012ff30
- 2026-10-04 09:35 Schema, sources, pipeline, applications, replies, digest, metrics, seed | 146 tests incl. demo-mode pipeline integration | 224d46b
- 2026-10-04 09:45 UI: her app, wizard, admin, landing, subscription | next build + screenshots | bb74dfc
- 2026-10-04 10:00 E2E suite (10 flows), fixes: lost flash after #anchor redirect, missing help lines, CSS layer bug (white button text) | playwright 10/10 | 913bd33
- 2026-10-04 10:10 Scanning (personal-data script + gitleaks), CI, scheduled-jobs workflow, vercel.json, README, ADRs, setup guide, Italian guide, CHANGELOG | scan clean, gitleaks clean on repo files, lint/types clean
- 2026-10-04 10:20 Independent review (subagent): 15 findings incl. 3 high (silent fake sends in real mode, scam flags not recomputed, her "Riattiva" lifting the admin stop) | all fixed + regression tests | 98f8bf7
- 2026-10-04 10:40 UI audit: axe on 98 screens (0 violations after fixes), 320 px reflow, keyboard focus; security e2e (auth matrix, XSS, throttling) | CI green | bba2764
- 2026-10-04 10:50 Load test 5,000 jobs (rerank 7.5 s -> 0.8 s), demo-week simulation | aa7470a
- 2026-10-04 11:00 Docs (admin guide, Italian guide with screenshots, LICENSE, ADR 0013), first-time-user walkthrough fixes | 271a1b1
- 2026-10-04 11:15 Audit checklist answered in `.goal/AUDIT.md` with evidence; stricter PDF check, Salta test | this commit
