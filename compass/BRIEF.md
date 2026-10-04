# Claude Code brief: "Bussola", a personal job finder (v3)

## How to use this file
1. Put this file and the `.claude/` folder from the same zip into an empty project folder.
2. Start Claude Code in that folder and accept the folder trust prompt.
3. Type `/goal`. Claude Code works through this brief on its own and only stops for the permission points in the /goal skill (pushing, deploying, spending, real sends, gray-tier live requests, credentials).
4. Check `.goal/PROGRESS.md` whenever you want, especially the "Waiting on you" list.

---

## 1. Context and goals

I'm building a job-search tool for my mother, who is about to lose her job in Italy. Two audiences:

1. **Her, every day.** She's not a tech person. The app must be "boomer-proof": in Italian, warm, very simple, impossible to get lost in.
2. **Recruiters and interviewers, later.** This is also my portfolio project, so the repo must be public-ready: clean architecture, tests, CI, documentation, a demo mode with fake data, and zero personal data in the repo.

What it does:
- Collects job listings automatically: first from the job-alert emails she receives, then from the open web through legal discovery.
- Shows them in a simple, filtered, ranked list.
- Sends applications by email automatically where an ad accepts applications by email, with strong guardrails.
- Helps her apply everywhere else in as few taps as possible.
- Tracks applications and tells her when someone replies.

Urgency: she needs the job list in her hands within about a week. Ship the useful parts first, polish later.

---

## 2. Decisions already made (don't relitigate, but tell me if one is technically impossible)

- **Email alerts are the first source; web discovery is the second.** Her LinkedIn, Indeed and InfoJobs accounts are never touched by code: no logins, no automation, no risk of a ban.
- **Web discovery is tiered (section 4.5):** search-engine discovery through an official search API, clean scraping of sites that allow it, and an optional, off-by-default, logged-out fetch of single public job pages. No bulk crawling of job platforms.
- **€0/month target.** Free tiers only. Any cost or anything that needs a credit card needs my explicit approval.
- **No paid AI in v1.** All parsing, extraction and ranking is rule-based. Tailored CVs and letters are made outside the app, in the Claude chat on my subscription; the app only prepares a ready-to-paste prompt (section 6, Lane 2).
- **Autonomous sending is in scope, email only**, with the guardrails in section 7.
- **A dedicated Gmail account for the job search** (e.g. nome.cognome.lavoro@gmail.com). The app connects only to this account, never to her personal inbox. Alerts from her platform accounts get forwarded into it with Gmail filters, applications are sent from it, recruiter replies land in it.
- **Boomer-proof design is a requirement, not polish** (section 8).
- **Defaults where I haven't decided:** stack per section 9; she uses both phone and laptop.

---

## 3. Hard rules (non-negotiable)

- **Never log in, automate, or act on any of her platform accounts.** Never automate any platform's own apply flow (LinkedIn Easy Apply, Indeed Apply, InfoJobs, ATS forms like Workday/Greenhouse/Lever). No account creation on any platform, no CAPTCHA solving, no proxy rotation, no user-agent spoofing, no headless-browser tricks to avoid detection.
- **No bulk crawling** of LinkedIn, Indeed, InfoJobs or Glassdoor search or listing pages, logged in or out.
- **Single-page fetches from those platforms** are allowed only through the optional W3 module (section 4.5), only after I approve it, and only within its limits.
- **Every other new source needs my approval:** check its Terms of Service and robots.txt, summarize them in plain language, wait for my OK. Respect robots.txt everywhere.
- **Good citizenship:** respect rate limits, cache responses, back off on errors, use an honest User-Agent with a contact email, stop on 403/429.
- **Never invent or inflate experience** in any template or generated text.
- **Privacy:** her data lives only in our database and the dedicated mailbox. Never in the repo, never in logs (including CI logs, which are public on a public repo), never in error messages. One-click "delete all my data".
- **Secrets** only in `.env` (gitignored) or the hosting provider's secret store. Provide `.env.example`.

---

## 4. Data sources

Each source is an adapter behind a common interface: `fetch -> raw -> parse -> normalize`. A broken source never breaks the others. Track per-source health (last success, items found, parse failures, blocks) and alert me (admin) when a parser starts failing, since email templates and pages change.

### 4.1 Mailbox ingestion (first source)
- Read the dedicated mailbox, find job-alert emails, parse them with **one parser per sender template** (LinkedIn, Indeed, InfoJobs; later others like Adzuna, Jooble, Subito, agencies' alerts) plus a **generic fallback** that at least extracts job links and anchor text.
- Mark processed messages (label or stored message IDs) so nothing is parsed twice.
- Store raw emails only as long as needed; keep **anonymized** sample emails as test fixtures. I'll provide 2 or 3 real samples per platform once alerts are set up. Until then, build parsers against realistic synthetic fixtures and mark them "needs real sample".
- **Access method, decide and explain trade-offs:** IMAP + SMTP with a Google app password (needs 2-Step Verification; verify app passwords are still supported), Gmail API with an OAuth app in "testing" mode (check the refresh-token expiry problem), or Google Apps Script running inside the dedicated account. Pick the most reliable option that costs €0 and needs the least maintenance.

### 4.2 Job APIs (free tiers only)
Candidates to verify: Adzuna API, Jooble API, Careerjet API. Check they exist, cover Italy, have a free tier compatible with personal use, and what fields they return (salary? full description or snippet?). Use only via documented APIs with our own keys.

### 4.3 Public ATS job boards (company watchlist)
Public endpoints companies publish so their openings can be read: Greenhouse job board API, Lever postings API, Ashby, SmartRecruiters, Workable, Personio XML feeds. A `company_watchlist` table (name, ATS type, slug/URL, active), editable in the admin area. Help me find which target companies use which ATS.

### 4.4 Manual add
Paste a link or the ad text. Rule-based extraction fills what it can; she or I fill the rest in a short form.

### 4.5 Web discovery (second source, three tiers)

**W1, search-engine discovery (build it).**
- Use an **official search API**, never scraped search-result pages. As of this brief: Google's Custom Search JSON API is closed to new customers and shuts down on 1 January 2027, and Microsoft retired the Bing Search APIs in 2025, so don't build on either. Brave Search API currently gives about $5 of monthly credits (roughly 1,000 queries) but needs a card on file and reportedly has no spending cap. Verify current terms and look for alternatives with a real free tier, then recommend one. Anything needing a card goes to "Waiting on you".
- Build queries from her profile, for example `site:linkedin.com/jobs/view "impiegata amministrativa" Torino`, the same for `it.indeed.com` and `infojobs.it`, plus open-web queries like `"lavora con noi" segreteria Torino`.
- **Hard query cap in code** (default 25 per day, configurable), because the provider may not cap spending for us.
- Store results as thin records (title, snippet, URL, source domain, first seen). She opens the link in her own browser. W1 never fetches pages from LinkedIn, Indeed or InfoJobs.

**W2, clean scraping (build it).**
- Company career pages, small Italian job boards, staffing-agency sites, public-sector portals (e.g. inPA), each approved individually per section 3.
- Prefer **schema.org `JobPosting` structured data (JSON-LD)**, which sites publish for search engines and which often includes title, employmentType, jobLocation, datePosted, validThrough and baseSalary. Build one generic JSON-LD extractor, then site-specific parsers only where needed.
- Respect robots.txt, at most 1 request every 5 seconds per domain, conditional GETs and caching.

**W3, single public job pages from LinkedIn/Indeed/InfoJobs (optional, off by default, build last).**
- Purpose: enrich thin records (description, salary, contract) so filters and ranking work better.
- Logged out only, no cookies, no account, plain HTTP with an honest User-Agent. No headless browser, no proxies, no CAPTCHA handling.
- Only on demand: when she opens a job, or for the top 10 new "Molto adatta" jobs per day. Hard cap 20 fetches per day across all three platforms, at least 10 seconds apart.
- On the first 403, 429, login wall or CAPTCHA: stop W3 for the rest of the day and record it in source health.
- Behind a feature flag, off by default. Lives in a separate module (`private-sources/`) excluded from the public repo, with an ADR explaining the decision and the risks.
- Before enabling: summarize each platform's current terms on automated access, including whether they claim to apply to logged-out visitors, and wait for my explicit OK. Enabling it is my call, not yours.

---

## 5. Normalization, dedupe, ranking (all rule-based)

**Extraction rules** (with unit tests for each):
- Salary in Italian formats: "RAL 28-32k", "28.000 - 32.000 € annui", "1.600 € netti/mese", "14 €/h", "CCNL Commercio 4° livello". Normalize to annual gross where possible, store the original string, mark estimates as estimates, never silently mix gross and net. Since 7 June 2026 (D.Lgs. 96/2026) Italian ads must state pay or a pay range, but thin records often won't include it: treat "unknown" as neutral, not as a fail.
- Contract type, full/part-time, remote/hybrid/onsite, language requirements (e.g. "inglese fluente"), from keyword dictionaries in Italian and English.
- Location: map city names to coordinates using an **offline dataset of Italian municipalities** (comuni) with lat/lng; compute distance from her home. Use an online geocoder only as a fallback, within its usage policy, with caching.
- **Application email detection:** find addresses in the ad text where the ad asks to send a CV by email. Store with the sentence it came from as evidence.

**Dedupe:** fuzzy key from normalized company + title + city. Merge duplicates across email alerts, APIs, W1, W2 and W3; keep every source link.

**Ranking (explainable):** score from title/keyword match against her target roles and approved synonyms, distance, salary vs her floor (unknown = neutral), contract and hours fit, recency, language requirements, negative keywords and excluded companies. Show it to her as **three levels, not numbers**: "Molto adatta", "Adatta", "Poco adatta", with 1 or 2 short reasons generated from the rules ("A 12 km da casa", "Part-time come vuoi tu", "Chiede inglese fluente").

"Non mi interessa" asks one optional reason (too far, wrong role, pay too low, company) and adjusts future ranking in a way I can see and undo.

---

## 6. Applying: three lanes

**CV library:** she uploads 1 to 3 CV versions (PDF) labeled by role family (e.g. "Amministrazione", "Segreteria"). Rules pick the right one per job; she can override.

**Letter templates:** 2 or 3 short plain-Italian email templates with merge fields ({azienda}, {ruolo}, {citta}, {fonte}, {nome}). Subject like "Candidatura per {ruolo} | {nome}". Editable in the app.

### Lane 1: "Invio automatico" (email applications)
For jobs with a detected application email, and for spontaneous applications (below).
- **Mode A, "Approvo io" (default):** a "Da inviare" screen with ready applications. Each card shows company, role, which CV, the email preview, and two big buttons: "Invia" / "Salta". Plus "Invia tutte (N)".
- **Mode B, "Pilota automatico" (opt-in toggle in admin):** sends automatically jobs ranked "Molto adatta" that pass every guardrail in section 7.
- **Spontaneous applications ("Candidature spontanee"):** a list of local target companies with an application address the company itself publishes for that purpose (e.g. a "Lavora con noi" page). Store the URL where the address was published. One spontaneous application per company per 6 months. I add companies manually or via CSV; W1 and W2 can suggest candidates for me to approve.

### Lane 2: "Candidatura curata" (best matches, tailored by hand)
Button "Prepara con Claude": builds a ready-to-paste Italian prompt containing the job details, her CV text and clear instructions (tailor without inventing anything, output CV bullets + short cover letter), and copies it to the clipboard. We run it in the Claude chat. Then she pastes/uploads the result back, and the app sends it (if the job accepts email) or moves to Lane 3.

### Lane 3: "Candidati sul sito" (LinkedIn, Indeed, company forms)
No automation. The app opens the original link and shows a **"Kit candidatura"** with big "Copia" buttons for her standard answers (short presentation, availability, salary expectation, phone, email, LinkedIn URL) and her CV file. Then "Fatto, mi sono candidata" logs it.

### Replies
Scan the dedicated mailbox for replies to sent applications (thread/Message-ID first, sender domain as fallback). Notify her ("Hai ricevuto una risposta da Rossi Srl!") and suggest a status change she confirms with one tap.

---

## 7. Sending guardrails (all configurable in admin, with these defaults)

- **Daily cap:** 10 sends per day total (hard max 20). First week after go-live: 3 per day.
- **No repeats:** never the same job twice; same company at most once per 60 days (spontaneous: 6 months).
- **Send window:** Monday to Friday, 08:30 to 18:00 Italian time, spaced by a random 5 to 20 minutes.
- **Undo window:** every send (approved or autopilot) sits in a queue for 15 minutes with a visible "Annulla" before it actually goes out.
- **Kill switch:** a big "Ferma tutti gli invii" button for her and for me.
- **Scam and junk filter.** Never autopilot, and show a warning in approval mode, when the ad: asks for any payment, fee, course purchase or "investimento"; pushes contact only via WhatsApp/Telegram; promises unrealistic pay; is a generic "lavoro da casa, guadagna subito"; or uses a free-mail address whose name doesn't match the company. Keep the rules in one file so I can extend them.
- **Blocklist** of companies, domains and keywords.
- **Deliverability:** plain-text-first emails, one recipient per email, correct reply-to, PDF attachment under 2 MB, stay well inside Gmail sending limits.
- **Full log** of every email sent (to, when, which CV, which template, status), visible to her in plain words and to me in detail.
- **Demo mode:** with `DEMO_MODE=true`, sending is simulated end to end and nothing leaves the server. All development, all tests and the public demo use demo mode. Real sending is switched on only by me.

---

## 8. Boomer-proof design (hard requirements)

The test: someone who uses WhatsApp and Facebook, but has never installed an app on purpose, can use every screen without help.

- **Readable:** body text 18px minimum, large headings, high contrast (aim for WCAG AAA on text), no light-grey text, generous spacing.
- **Big and obvious:** buttons at least 48px tall with text labels (never icon-only), one main action per screen.
- **No hidden interactions:** no swipe gestures, no hover-only controls, no long-press, no infinite scroll ("Mostra altre 10" instead), no menus inside menus.
- **Few places to go:** bottom navigation with at most 4 items: "Offerte", "Da inviare", "Le mie candidature", "Aiuto". Admin settings hidden behind a separate admin login (me).
- **Plain warm Italian, "tu" form.** No English or tech words: no "match", "feed", "dashboard", "pipeline", "upload", "login". Say "carica", "offerte per te", "le mie candidature", "entra".
- **Confirm in words, always undoable:** "Sto per inviare la tua candidatura a Rossi Srl per il ruolo di Impiegata amministrativa. Confermi?" and then "Annulla" for 15 minutes.
- **Always say what's happening:** "Ultimo aggiornamento: oggi alle 8:00", "Nessuna offerta nuova oggi, ricontrollo domani mattina".
- **Nothing scary:** errors are one calm sentence saying what to do next, never codes or stack traces.
- **Help everywhere:** each screen has a one-sentence "Cosa faccio qui?".
- **Stay signed in** for a long time on her devices. Installable on the phone home screen (PWA). Works equally on phone and laptop.
- **The daily email is part of the UI:** every morning, an email to her normal inbox: "Buongiorno! 6 nuove offerte, 3 candidature pronte, 1 risposta ricevuta", with one big button that opens the app. Many days, this is the only thing she'll look at.

**Onboarding wizard (the app collects her profile):** one question per screen, progress "Passo 2 di 8", every step skippable and editable later:
1. Nome, telefono, email (used in templates).
2. Che lavoro cerchi? Multiple role titles, with suggested synonyms she confirms.
3. Dove? City + distance slider in km, plus "Va bene anche da casa".
4. Orario e contratto: full-time / part-time, contract types she accepts.
5. Stipendio minimo: net monthly, with a simple explanation; the app stores an approximate gross equivalent clearly marked as an estimate.
6. Lingue.
7. Carica il tuo CV (1 to 3 versions) + a short checklist tip: no tax code or full home address on the CV; include the usual GDPR consent line Italian recruiters expect.
8. Cose da evitare: sectors, companies, keywords.

**Usability test (human task, add to "Waiting on you"):** after the "Offerte" screens and after the applying screens, I watch her use the app for 15 minutes without helping. Fix whatever confused her.

---

## 9. Stack, hosting, portfolio

**Stack:** one language end to end. Default: Next.js (App Router) + TypeScript + Tailwind, a free-tier database (Postgres on Supabase/Neon, or SQLite via Turso), scheduled jobs via GitHub Actions cron or the host's cron. Propose an alternative only if clearly better, in 3 lines, and record it as an ADR.

**Hosting:** €0/month. Verify current free-tier terms (personal non-commercial use allowed? project pausing on inactivity? cron frequency limits? Actions minutes?). Must also run locally with one command. Simple auth: her account + my admin account. Deploying is a permission point: prepare everything, then ask me.

**Her devices:** phone and laptop.

**Portfolio requirements:**
- Public GitHub repo (creating and pushing it is a permission point). Secret and personal-data scanning (e.g. gitleaks) in pre-commit and CI. Seed script with realistic fake Italian jobs, companies and emails. `DEMO_MODE` used for the public demo. The `private-sources/` module is never published.
- README: the problem, screenshots/GIF, architecture diagram (Mermaid), how to run, and a **"Legal and ethical design"** section explaining the choices (email alerts first, tiered web discovery, no account automation, sending caps, scam filter, privacy).
- `docs/adr/`: one short Architecture Decision Record per major decision.
- CI on every push: lint, typecheck, tests. Tests never call real APIs, real websites or real mailboxes.
- Admin **metrics page:** jobs found per source, applications per lane, reply rate, time from posting to application. These numbers become my CV bullets, so make them accurate.

---

## 10. Later (version C): design the hooks now, don't build yet

- More sources, each approved individually.
- An optional AI enrichment provider behind an interface, off by default, never required.
- An optional browser extension that prefills application forms while she clicks "Submit" herself.
- Never, in any version: automating LinkedIn/Indeed/InfoJobs or any platform's apply flow, logging into her accounts, creating accounts, solving CAPTCHAs, bulk crawling job platforms.

---

## 11. Milestones

Under `/goal`, these are checkpoints: write a summary in `.goal/PROGRESS.md` and keep going. Stop only for the skill's permission points.

- **M0, plan + verification:** mailbox access method, each API source, search API options (W1), free-tier hosting terms, schema, stack, risks. Record decisions as ADRs; put anything needing me under "Waiting on you".
- **M1, skeleton + first data:** repo, CI, secret scanning, demo seed, database, LinkedIn-alert parser + generic fallback, one API source, plain list page. Goal: real jobs visible within ~1 week.
- **M2, her app + web discovery:** onboarding wizard, "Offerte" list with filters (pay range, distance, full/part-time, contract, sector, remote, recency), detail page, rule-based ranking with reasons. Indeed + InfoJobs alert parsers. W1 search discovery and W2 JSON-LD extractor.
- **M3, applying:** CV library, templates, Lane 3 kit, Lane 2 prompt export, Lane 1 in approval mode with every guardrail, all in demo mode. Real sending only when I switch it on, capped at 3/day.
- **M4, automation:** autopilot toggle, spontaneous applications, reply detection, daily digest email, scheduled ingestion.
- **M5, ship and show:** deployment ready at €0 (actual deploy after my OK), PWA install, one-page Italian guide for her ("Come si usa"), README, ADRs, screenshots, metrics page.
- **M6, optional W3:** the single-page enrichment module, built behind its flag and left off until I approve it.

---

## 12. How I want you to work

- Explain decisions in plain language. I'm learning and need to be able to explain every part of this in an interview.
- Ask before adding any paid service, heavy dependency or new data source.
- Small local commits with clear messages. Keep README and CHANGELOG updated.
- If something in this brief is wrong, outdated, impossible within the rules, or a bad idea, say so in `PROGRESS.md` under "Decisions" and pick the safest reasonable path.
