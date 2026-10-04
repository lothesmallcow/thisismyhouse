# Compass

**A calm, rule-based job finder for one person in Italy.** Compass reads the job-alert e-mails
she already receives, adds openings from free job APIs, company career feeds and a capped
web search, ranks everything with explainable rules, and helps her apply in a few taps:
by e-mail with strict guardrails, or on the company site with a copy-paste kit.

It is built for someone who uses WhatsApp but has never installed an app on purpose: plain
warm Italian, 19 px text, AAA contrast, big labelled buttons, four places to go, and an
"Annulla" on everything that leaves the house.

| Offers (phone) | One offer | Replies |
|---|---|---|
| ![Offerte](docs/screenshots/phone-offerte.png) | ![Offerta](docs/screenshots/phone-offerta.png) | ![Candidature](docs/screenshots/phone-candidature.png) |

| Landing | Subscription | Admin: sources health |
|---|---|---|
| ![Landing](docs/screenshots/landing.png) | ![Abbonamento](docs/screenshots/abbonamento.png) | ![Fonti](docs/screenshots/admin-fonti.png) |

## The problem

Looking for work in Italy means LinkedIn, Indeed, InfoJobs, agencies and company sites, each
with its own alerts, duplicates, scams and forms. The person who most needs a clear list is often
the one least comfortable with all of that. Compass turns it into one short, ranked, explained list
and a guided way to apply, without ever touching her platform accounts.

## What it does

- **Collects** jobs from the alert e-mails forwarded to a dedicated Gmail (LinkedIn, Indeed,
  InfoJobs parsers + a generic fallback), the Adzuna API, public ATS feeds of companies on a
  watchlist (Greenhouse, Lever, Ashby, SmartRecruiters, Workable, Personio), approved career
  sites via schema.org `JobPosting`, a capped official search API (Tavily), and manual paste.
- **Normalizes** Italian salaries (RAL, net monthly, hourly, CCNL levels; estimates labelled),
  contract, hours, remote, languages, distance from home (offline comuni dataset), application
  e-mail with evidence, and **dedupes** across sources keeping every link.
- **Ranks** with named rules into *Molto adatta / Adatta / Poco adatta* plus 1-2 reasons
  ("A 8 km da casa", "Chiede inglese fluente"). "Non mi interessa" teaches it, visibly and undoably.
- **Applies** in three lanes: (1) e-mail applications she approves with one tap, or an opt-in
  autopilot; (2) "Prepara con Claude": a ready-to-paste prompt for a tailored letter, no AI
  inside the app; (3) a "Kit candidatura" with copy buttons for site forms.
- **Guards** every send: daily cap, Mon-Fri 08:30-18:00, 15-minute undo, no repeats, scam filter,
  blocklist, kill switch, full log, and **demo mode** where nothing leaves the server.
- **Follows up**: detects recruiter replies (thread first, domain fallback), suggests the new
  status, and sends a one-button "Buongiorno!" e-mail every morning.
- **Shows the numbers**: admin metrics (jobs per source, applications per lane, reply rate,
  posting-to-application time).

## Architecture

```mermaid
flowchart LR
  subgraph Sources["Sources (each behind fetch → raw → parse → normalize)"]
    MB["Dedicated Gmail<br/>IMAP (alerts + replies)"]
    API["Adzuna / Jooble API"]
    ATS["ATS feeds<br/>Greenhouse, Lever, ..."]
    W1["W1: Tavily search<br/>(cap 25/day)"]
    W2["W2: approved sites<br/>robots.txt, 5 s/domain, JSON-LD"]
    MAN["Manual paste"]
  end
  subgraph Core["Rule engine (pure, unit tested)"]
    N["normalize<br/>salary · contract · geo · e-mail"]
    D["dedupe"]
    R["rank + reasons"]
    S["scam rules"]
  end
  DB[("libSQL / Turso")]
  subgraph App["Next.js app"]
    HER["Her app (Italian, PWA)<br/>Offerte · Da inviare · Candidature · Aiuto"]
    ADM["Admin area"]
  end
  Q["Send queue<br/>guardrails ×2"]
  OUT["SMTP (real)<br/>or outbox (demo)"]
  CRON["GitHub Actions cron<br/>+ Vercel daily cron"]

  MB & API & ATS & W1 & W2 & MAN --> N --> D --> R --> DB
  S --> R
  DB <--> HER
  DB <--> ADM
  HER -- "Invia" --> Q --> OUT
  CRON --> Sources
  CRON --> Q
  MB -- replies --> DB
```

Code map:

| Path | What |
|---|---|
| `src/lib/core/` | Pure rules: `salary`, `extract`, `geo`, `dedupe`, `rank`, `scam-rules`, `guardrails`, `templates`, `cv-pick`, `prompt`, `normalize`, `time` |
| `src/lib/sources/` | Adapters: `mail/` (IMAP + demo mailbox), `alerts/` (per-template parsers), `api/`, `ats/`, `web/` (W1, robots, polite fetcher, JSON-LD) |
| `src/lib/pipeline/` | Jobs: `ingest`, `discover`, `mailbox-scan`, `digest`, source `health`, `jobs` (runner) |
| `src/lib/server/` | Repositories and services: jobs, applications/queue, replies, profile, settings, auth, metrics, privacy |
| `src/app/` | Pages: `(public)` landing + subscription, `(app)` her four sections, `(setup)` onboarding, `admin/` |
| `fixtures/` | Synthetic alert e-mails and HTTP responses used by tests and demo mode |
| `docs/adr/` | Architecture Decision Records |

## Run it

Requirements: Node 20.9+.

```bash
cd compass
cp .env.example .env      # demo mode is the default: nothing ever leaves the machine
npm install
npm run demo              # migrate + seed fake data + start on http://localhost:3000
```

- Her app: `http://localhost:3000/entra` with `demo@example.com` / `demo-compass`
- Admin: `http://localhost:3000/admin/entra` with `admin@example.com` / `admin-compass`
- Fill the list from the demo sources: admin → Fonti → "Raccogli offerte" (or `npm run job:ingest`).

| Command | |
|---|---|
| `npm run demo` | one-command local start in demo mode |
| `npm run check` | lint + typecheck + unit tests + personal-data scan |
| `npm test` | Vitest: 243 unit and integration tests (rules, parsers, sources, pipeline, guardrails, races, edge dates) |
| `npm run build && npm run test:e2e` | Playwright: 15 end-to-end flows on a phone viewport (incl. auth matrix, XSS, axe) |
| `npm run simulate:week` | a full demo week on a simulated clock, every step checked against the database |
| `npm run audit:ui` | every screen at 360/1280 px: axe, text and target sizes, keyboard focus, zoom (needs a running demo) |
| `npm run job:<ingest\|discover\|queue\|replies\|digest>` | run a scheduled job by hand |
| `npm run hooks:install` | install the pre-commit secret/personal-data scan |
| `node scripts/screenshots.mjs` | regenerate the README screenshots from a running demo |

Going live (real mailbox, real sending, hosting) is described step by step in
[docs/setup.md](docs/setup.md). Day-to-day admin tasks: [docs/guida-admin.md](docs/guida-admin.md).
Her one-page guide (Italian, printable): [docs/come-si-usa.md](docs/come-si-usa.md).
Audit evidence (accessibility report, error states, load test, demo week): [docs/audit/](docs/audit/).

## Legal and ethical design

- **Email alerts first.** The platforms already send her alerts; reading her own mailbox is the
  least intrusive way to get their listings. **Her LinkedIn, Indeed and InfoJobs accounts are
  never touched by code**: no logins, no automation of any "Easy Apply" or ATS form, no account
  creation, no CAPTCHA solving, no proxies, no user-agent tricks.
- **Tiered web discovery.** W1 uses an official search API with a hard daily cap and stores
  only thin records she opens herself. W2 reads only sites the admin approved after reading their
  terms and robots.txt, one request every 5 seconds per domain, cached, conditional GETs, honest
  User-Agent with a contact address, and stops on the first 403/429. W3 (single public platform
  pages) is designed but deliberately not shipped (ADR 0009). No bulk crawling of job platforms.
- **Sending caps.** E-mail applications only where an ad asks for them or a company publishes an
  address for spontaneous applications. Max 10/day (3/day the first week, never above 20),
  working hours only, randomly spaced, one company per 60 days, a 15-minute undo and a kill switch.
- **Scam filter.** Ads asking for money, pushing WhatsApp-only contact, promising unrealistic pay,
  "work from home, earn now", or using a free-mail address unrelated to the company are flagged;
  autopilot never sends them.
- **Honesty.** Templates and the Claude prompt forbid inventing or inflating experience.
- **Privacy.** Her data lives only in the database and the dedicated mailbox, never in the repo
  or logs; one click deletes everything. Pay transparency (D.Lgs. 96/2026) is respected by
  treating unknown pay as neutral, never as a reason to hide an ad.

## The subscription page

`/abbonamento` presents Compass as a product with three plans (Essenziale free, Compass
4,90 €/month, Famiglia 8,90 €/month). **The prices are invented** for the portfolio, and the page
says plainly that online payments are not active; no payment provider is integrated.

## Status

MIT licensed. See [CHANGELOG.md](CHANGELOG.md) and the decisions in [docs/adr/](docs/adr/). Parsers were built
against synthetic alert e-mails and are marked "needs real sample" until real (anonymized)
samples are added (see `fixtures/emails/README.md`).
