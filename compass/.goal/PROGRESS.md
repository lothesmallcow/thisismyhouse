# Goal
Build **Compass** (the brief calls it "Bussola"), a boomer-proof Italian job finder for one person: email alerts first, legal tiered web discovery second, rule-based parsing/ranking, three application lanes with strict sending guardrails, demo mode with fake data, plus a public "Abbonamento" (subscription) page with invented prices. Must be portfolio-grade (tests, CI, ADRs, README) and aesthetically pleasing. Spec: `BRIEF.md`

## Definition of Done
- [ ] M0: research decisions recorded as ADRs (mailbox, job APIs, search API, hosting, stack, schema, risks)
- [ ] Runs locally with one command (`npm run demo`) in demo mode, from a clean checkout
- [ ] Demo seed: realistic fake Italian jobs, companies, emails; zero real personal data in the repo
- [ ] Email-alert parsers: LinkedIn, Indeed, InfoJobs (synthetic fixtures, "needs real sample") + generic fallback; processed messages never parsed twice
- [ ] Job API adapter (Adzuna) + ATS watchlist adapters (Greenhouse, Lever, Ashby, SmartRecruiters, Workable, Personio), fixtures only in tests
- [ ] Manual add (link or pasted text) with rule-based extraction
- [ ] W1 search discovery (provider interface + Tavily adapter, hard daily cap 25, thin records, never fetches platform pages)
- [ ] W2 JSON-LD extractor + polite fetcher (robots.txt, 5 s/domain, cache, conditional GET, stop on 403/429), approved-sites list
- [ ] W3: hook + flag only (off); fetcher not published (see Waiting on you)
- [ ] Extraction rules with unit tests: Italian salary formats, contract, hours, remote, languages, application email + evidence, location via offline comuni dataset + distance
- [ ] Dedupe across sources keeping every source link
- [ ] Explainable ranking: 3 levels + 1-2 Italian reasons; "Non mi interessa" with reason adjusts ranking visibly and undoably
- [ ] Onboarding wizard (8 steps, "Passo N di 8", skippable, editable later)
- [ ] "Offerte" list with filters (pay, distance, hours, contract, sector, remote, recency), "Mostra altre 10", detail page
- [ ] CV library (1-3 PDFs, role family, auto pick + override), letter templates with merge fields, editable
- [ ] Lane 1 approval mode: "Da inviare", Invia / Salta / Invia tutte, confirm in words, 15-minute "Annulla" queue
- [ ] Lane 1 autopilot toggle (admin, opt-in) obeying every guardrail
- [ ] Guardrails: daily cap (3/day first week, 10 default, 20 hard max), no repeats (job, company 60 d, spontaneous 6 mo), send window Mon-Fri 08:30-18:00 Europe/Rome, 5-20 min random spacing, kill switch, scam filter (one rules file), blocklist, plain-text-first, PDF < 2 MB, full send log
- [ ] Spontaneous applications list (manual + CSV import, published address + source URL)
- [ ] Lane 2 "Prepara con Claude" prompt export (copy) + paste-back
- [ ] Lane 3 "Kit candidatura" with Copia buttons + "Fatto, mi sono candidata"
- [ ] Reply detection (Message-ID/thread first, sender domain fallback) + notification + one-tap status confirm
- [ ] Daily digest email to her normal inbox (simulated in demo mode)
- [ ] Demo mode: nothing leaves the server; real sending only when admin switches it on AND DEMO_MODE=false
- [ ] Boomer-proof UI: >=18px body, AAA contrast, >=48px labeled buttons, 4-item bottom nav, plain "tu" Italian, "Cosa faccio qui?" on every screen, calm errors, PWA installable, long sessions
- [ ] Separate admin login + admin area (guardrails, sources health, watchlist, spontaneous, blocklist, ranking adjustments, templates, send log, metrics)
- [ ] Metrics page: jobs per source, applications per lane, reply rate, posting-to-application time
- [ ] "Cancella tutti i miei dati" (one click + confirmation)
- [ ] Public "Abbonamento" page (invented prices, clearly marked, no real payments)
- [ ] Aesthetically pleasing, consistent visual design (phone + laptop)
- [ ] Secret + personal-data scanning in pre-commit and CI; CI runs lint, typecheck, tests (never real APIs)
- [ ] Scheduled jobs: ingest, discover, queue, replies, digest (GitHub Actions cron + protected API routes)
- [ ] Deployment ready at EUR 0 (Vercel Hobby + Turso), not deployed
- [ ] Tests, lint and typecheck pass
- [ ] Every user-facing feature exercised in the running app (Playwright e2e)
- [ ] README (problem, screenshots, Mermaid architecture, how to run, "Legal and ethical design"), CHANGELOG, ADRs, Italian guide "Come si usa"

## Plan
- [ ] M0 research + ADRs
- [ ] Scaffold Next 16 + TS + Tailwind 4 + Drizzle/libSQL, design system, auth
- [ ] Core rule engine (pure, unit tested): salary, extract, geo, dedupe, rank, scam, guardrails, templates, cv pick, prompt
- [ ] Sources: mailbox (IMAP + fixture mailbox), email parsers, Adzuna, ATS, manual add, W1, W2, health
- [ ] Ingestion pipeline + dedupe + ranking persistence
- [ ] Her app: onboarding, Offerte, detail, Non mi interessa
- [ ] Applying: CVs, templates, lanes 1/2/3, queue, guardrails, send log, kill switch
- [ ] Automation: autopilot, spontaneous, replies, digest, scheduled jobs
- [ ] Admin area + metrics; subscription page; landing
- [ ] PWA, guide, README, ADRs, CI, scanning, screenshots
- [ ] Full e2e verification + independent review

## Waiting on you
(filled in as work progresses; see bottom of file for the final list)

## Decisions
- Project name is **Compass** (your instruction), UI copy stays Italian. The brief's "Bussola" is the Italian word for compass, so the UI shows "Compass" as the brand.
- Built in `compass/` inside `lothesmallcow/thisismyhouse` on branch `claude/zen-carson-uxhsg1`, because this cloud session can only push there. The brief wants its own public repo: creating it is a permission point, so it is under "Waiting on you".
- `thisismyhouse` is a **public** repo. So nothing personal goes in, and W3 (`private-sources/`) is gitignored and not built here.
- `.goal/PROGRESS.md` is committed (not gitignored as the skill suggests) because this container is wiped after the session; otherwise you'd never see this file. Delete it before publishing if you want.

## Log
