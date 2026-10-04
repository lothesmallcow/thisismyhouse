# Goal
Build **Compass** (the brief calls it "Bussola"), a boomer-proof Italian job finder for one person: email alerts first, legal tiered web discovery second, rule-based parsing/ranking, three application lanes with strict sending guardrails, demo mode with fake data, plus a public "Abbonamento" (subscription) page with invented prices. Must be portfolio-grade (tests, CI, ADRs, README) and aesthetically pleasing. Spec: `BRIEF.md`

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
- [x] Tests, lint and typecheck pass (146 unit/integration, 10 e2e)
- [x] Every user-facing feature exercised in the running app (Playwright e2e on the production build)
- [x] README, CHANGELOG, ADRs, Italian guide (docs/come-si-usa.md)

## Plan
- [x] M0 research + ADRs
- [x] Scaffold Next 16 + TS + Tailwind 4 + Drizzle/libSQL, design system, auth
- [x] Core rule engine
- [x] Sources + ingestion pipeline + health
- [x] Her app, onboarding, applying lanes, automation
- [x] Admin area, metrics, landing, subscription page
- [x] PWA, docs, CI, scanning, screenshots
- [x] Full e2e verification
- [ ] Independent review against the Definition of Done (in progress at the time of writing)

## Waiting on you
Ordered by what unblocks the most. None of this is needed to try the demo.

1. **Mailbox**: create the dedicated Gmail, turn on 2-Step Verification, create an app password, put `MAILBOX_USER` / `MAILBOX_APP_PASSWORD` / `DIGEST_TO` / `CONTACT_EMAIL` in `.env` (never in chat). Then set up alert forwarding from her inbox. Steps: `docs/setup.md` §1-2. Unblocks: real alerts, replies, sending.
2. **Real alert samples**: after alerts start arriving, export 2-3 per platform, anonymize, add to `fixtures/emails/`. All three parsers are built on synthetic samples and marked "needs real sample".
3. **Adzuna terms**: their terms mention a 14-day evaluation period and a possible licence after that. Ask them (or read the current terms) whether ongoing personal, non-commercial use is fine. Until then keep it as is or switch it off in admin → Fonti.
4. **Free API keys** (no card): Adzuna (`ADZUNA_APP_ID/KEY`), Tavily (`TAVILY_API_KEY`). Jooble optional (500 requests lifetime).
5. **Permission points (I did not do these)**: create the dedicated public GitHub repo for Compass and move `compass/` there; create the Turso database and the Vercel project; deploy; add GitHub Actions secrets; switch on real sending. Steps: `docs/setup.md` §4-7.
6. **W2 site approvals**: no real site is approved (only a fake demo one). Candidates worth reviewing: inPA (inpa.gov.it, public-sector), local staffing agencies' "offerte" pages, target companies' "Lavora con noi" pages. Each needs its terms + robots.txt read and summarized before approval (admin → Siti).
7. **Company watchlist**: tell me (or add in admin → Aziende) which target companies she'd like; for each, find which ATS they use (look at their careers page URL: boards.greenhouse.io, jobs.lever.co, jobs.ashbyhq.com, jobs.smartrecruiters.com, apply.workable.com, *.jobs.personio.de).
8. **W3 decision**: read LinkedIn/Indeed/InfoJobs current terms on automated access (including for logged-out visitors) and decide. My view: not worth the risk for a modest benefit (ADR 0009). If yes, it should live in a private repo.
9. **Geodata licence**: `data/comuni.json` comes from opendatasicilia/comuni-italiani, whose coordinates file has no stated licence. Confirm or swap for the ODbL OpenStreetMap-derived dataset before the repo goes fully public (ADR 0007).
10. **Usability test (human)**: watch her use "Offerte" for 15 minutes without helping, then again after the applying screens; note where she hesitates.
11. **Subscription page**: prices are invented. If you ever charge real money, Vercel Hobby (non-commercial only) is no longer allowed, and you'd need a payment provider + Italian invoicing/VAT handling: talk to an accountant first.
12. **Her real profile**: when you set it up, she (or you) runs the onboarding wizard; CVs should not contain her codice fiscale or full home address.

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
- 2026-10-04 09:10 M0 research (Gmail app passwords, Gmail API testing tokens, Apps Script quotas, Adzuna/Jooble/Careerjet, Brave/Tavily/Google CSE/Bing, Vercel/Turso, D.Lgs. 96/2026, comuni datasets) | verified by web search | recorded in ADRs
- 2026-10-04 09:15 Core rule engine (salary, extract, geo, dedupe, rank, scam, guardrails, templates, cv, prompt) | 121 unit tests | 012ff30
- 2026-10-04 09:35 Schema, sources, pipeline, applications, replies, digest, metrics, seed | 146 tests incl. demo-mode pipeline integration | 224d46b
- 2026-10-04 09:45 UI: her app, wizard, admin, landing, subscription | next build + screenshots | bb74dfc
- 2026-10-04 10:00 E2E suite (10 flows), fixes: lost flash after #anchor redirect, missing help lines, CSS layer bug (white button text) | playwright 10/10 | 913bd33
- 2026-10-04 10:10 Scanning (personal-data script + gitleaks), CI, scheduled-jobs workflow, vercel.json, README, ADRs, setup guide, Italian guide, CHANGELOG | scan clean, gitleaks clean on repo files, lint/types clean
