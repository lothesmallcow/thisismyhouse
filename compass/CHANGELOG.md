# Changelog

## 0.20.3 · 2026-10-06

- "Scartate" is now called **Non mi interessano**, like the button (`/offerte/non-mi-interessano`; the
  old address redirects). A dismissal can be undone for **3 days**, then it leaves the list and stays
  blocked.

## 0.20.2 · 2026-10-06

- **Scartate** keeps each dismissal for 7 days, with how many days are left to undo it; then it leaves
  the list by itself and can no longer be undone. The offer stays blocked: it is not proposed again.

## 0.20.1 · 2026-10-06

- **"Non mi interessa" deletes, for good, and only that offer**: it leaves the person's account and is
  never proposed again, matched by the exact links it was found at and by the same ad (same title,
  company and city) on another site. Other roles at the same company, or the same role in another
  city, are untouched; other people are untouched. An offer only they could see (added by hand,
  their own alerts) is deleted altogether.
- **Scartate** (bottom of Offerte): the list of dismissals, each can be undone (the offer comes back if
  it is still around). Forgotten after six months. Old dismissals are converted at deploy.
- Migration 0019.

## 0.20.0 · 2026-10-06

- **Offers last a week**: an offer no source has shown for 7 days is deleted at the next run, with its
  scores. Kept: offers saved in a folder, applied to, added by hand, or with applications still open
  (deadline in the future). Pages stay clean and the database light.
- **"Non mi interessa" on every card** in Offerte: one click, the offer leaves the list and the page
  stays where it was (filters kept). It is still under "Offerte scartate".
- **Dismissed stays dismissed**: dismissals are remembered by the ad itself (6 months), so the same
  ad found again after the clean-up, or by a new search, comes back already dismissed.
- Migration 0018.

## 0.19.2 · 2026-10-06

- **Elimina il mio account** inside the app (Profilo, and on the first questionnaire screen for those
  who have not finished it): password and the word ELIMINA, then everything goes (account, data,
  Gmail access revoked at Google, settings) and the person is signed out. An administrator viewing
  someone's app cannot use it (Admin → Utenti instead).

## 0.19.1 · 2026-10-06

- Deleting an account or "Cancella tutti i miei dati" now also removes the person's Collega le fonti
  progress, the alerts they marked, Gmail's forwarding code and their last web scraping (they stayed
  in the settings table).

## 0.19.0 · 2026-10-06

- **"Cosa fai ora?"** is the first question: high school, bachelor's, master's, recent graduate, working
  less than 3 years, 3 years or more, career change. It decides the questionnaire (studies and
  activities for students, experience for workers) and can be changed from Profilo → Cosa fai ora.
- **La tua esperienza** (workers): years of experience, current role, when they could start (it also
  fills the "available from" answer for job sites). Counts until the CV timeline gives the years.
- **Cosa fai oltre allo studio?** (students): clubs, finance or consulting clubs, competitions,
  projects or startups, sport, volunteering, part-time jobs, time abroad, coding. They point the
  position suggestions like CV lines do (never searched as positions).
- **Studies by situation**: school and diploma year for high school, graduation year for recent
  graduates, expected graduation for students (programmes ask for it).
- **Where you can work without a visa** (EU, UK, US, Switzerland) in Dove: ads asking for the right to
  work score lower only when you would need a visa, with the reason.
- A recent graduate counts as "final year" for the ranking (graduate roles fit). Migration 0017.

## 0.18.0 · 2026-10-06

- **Programmes for students** (spring weeks, insight days, internships), found two ways:
  - public trackers are read once a week for the NAMES of the firms only; each firm's offer is then
    read from its own job board, careers site or official page (found by web search), never from the
    tracker;
  - for students, web search by year of study, career and country finds official programme pages
    directly ("Fai web scraping" and the daily run).
- **Dates read from every offer**, in English, Italian, German and French: deadline ("Scade il 16
  ottobre, tra 10 giorni", in amber in the last week), opening date, when the programme runs ("Si
  svolge 20-22 aprile 2027") and "rolling" review ("candidati presto"). New order "Scadenza più vicina".
- **Who can apply**, read from the ad: UK universities only, right to work / no visa sponsorship,
  visa sponsorship, restricted to a group, second year onwards, master's only, graduation year. Never
  hidden: the score goes down and the reason is shown ("Per chi si laurea nel 2027, tu nel 2029").
  Closed applications also score low, with the date.
- Migrations 0015 (job dates) and 0016 (programme leads). ADR 0025.

## 0.17.2 · 2026-10-06

- Offerte → Filtri: Tipo, Contratto and Settore take several choices at once (pills you tick), e.g.
  Lavoro + Stage, indeterminato + determinato, two or three sectors. Nothing ticked = all. Offers that
  do not state the contract stay visible.

## 0.17.1 · 2026-10-05

- Collega Gmail, more robust: the sign-in state is signed and bound to the person (no cookie), so it
  works whichever of the site's Vercel addresses was used; the connection starts from APP_URL; the
  Google client ID, secret and APP_URL are trimmed (a pasted space or new line broke them).
- A failed connection now says why on Collega le fonti (wrong client ID/secret, return address not
  matching, Gmail API off, expired sign-in...) with the return address and client ID in use to compare
  in Google Cloud, and logs the short code in Vercel → Logs (never tokens).

## 0.17.0 · 2026-10-05

- **Collega Gmail**: one click with Google sign-in (read-only) instead of forwarding, confirmation code
  and filter. Compass asks Gmail only for the job sites' alert e-mails (a search on their senders), never
  the rest of the mailbox, and reads the last 30 days at once, then on every scheduled run and on
  "Controlla ora". "Scollega Gmail" revokes the access at Google; so do "Cancella tutti i miei dati" and
  deleting an account. The token is stored encrypted (AES-256-GCM). A revoked access is noticed and
  the page asks to connect again. Forwarding stays for Outlook, other providers, or by choice.
- Needs a Google OAuth client (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`): docs/setup.md section 2,
  ADR 0024. Without it, Collega le fonti offers forwarding as before.

## 0.16.3 · 2026-10-05

- Collega le fonti, Gmail: when Gmail answers "Non puoi specificare il tuo indirizzo email", the e-mail
  is the very mailbox Compass reads, so no forwarding is needed. The page explains it, and "È la mia
  Gmail: collegala" links it for the person signed in with that address. Anyone else is told how the
  administrator links it (Admin → Utenti → Casella: default), so nobody can claim someone else's mailbox.
- The same-mailbox check ignores case, spaces, +tags, Gmail dots and googlemail.
- Step by step made precise: exact Gmail clicks (from a computer, the right account, Inoltro →
  Aggiungi → Avanti → Procedi → OK, where the code field appears, Verifica, "Disattiva inoltro",
  importing the filter file by name) and a final check. Outlook steps also name each button, warn
  about work or university accounts, and end with a final check.

## 0.16.2 · 2026-10-05

- **Offerte → Filtri → Luoghi** replaces "Distanza": it starts from the profile's places (cities,
  regions, countries, and remote when accepted) and can be changed there just to try, without touching
  the profile ("Torna ai luoghi del profilo"). A city includes its province. Offers that do not say
  where they are stay visible. The "nuove" count follows the same places.
- Fixed: offers from New York showed up for people who chose only Italy. Career pages of global firms
  list offers worldwide and were all saved: now only those in the person's countries are kept (as for
  the official job boards). "New York" was also read as York in England: places outside the four
  countries are no longer matched to their towns, and JSON-LD offers carry their country.
- Jobs record their country and region (migration 0013, filled in for existing jobs at deploy).
- "Non mi interessa: è troppo lontano" no longer adds a kilometre limit.

## 0.16.1 · 2026-10-05

- **Dove without map or kilometres**: places are chips (a city, a region or a whole country) added by
  typing and picking a suggestion, as many as wanted, in the questionnaire and in Profilo → Dove. The
  first city is "your city"; only regions or countries also work. The map (its tiles now need a key)
  and the distance slider are gone.

## 0.16.0 · 2026-10-05

- **Dove** (Profilo): an interactive map with the main city and its radius, more countries each with
  its city, click on the map to choose a town, city suggestions as you type, regions; it replaces the
  countries part of "Carriere e paesi".
- **Posizioni e carriere** (Profilo): "Cerchi ora" first, then the positions of each chosen career to
  add with a tick (as in the questionnaire), the CV suggestions, every known position as a suggestion,
  and the careers (several at once); up to six positions searched.
- Collega le fonti: step 3 suggests starting from the two or three alerts that matter most (marked
  "consigliato"); step 4 explains that the first alert can take hours or a day or two.
- Subtle entrance animations (none with reduced motion).

## 0.15.2 · 2026-10-05

- Collega le fonti is now a 4-step wizard, one step per screen: the e-mail first (why Compass needs
  the alert e-mails), with only the chosen provider's steps (Gmail, Outlook or other); then the
  accounts, the alerts and the check. Progress is remembered; Gmail's "Disattiva inoltro" is called out
  so only the alerts are forwarded.

## 0.15.1 · 2026-10-05

- Collega le fonti: the Gmail forwarding filter as a file to import in one click; steps for iCloud,
  Libero and Yahoo; tips for alerts that bring the right offers; Offerte points there until the
  first alerts arrive.

## 0.15.0 · 2026-10-05

- **Collega le fonti** (guided, 5 steps): the job sites worth an account for each person's
  countries, track and careers (LinkedIn, Indeed, InfoJobs, eFinancialCareers, Reed, Bright
  Network, StepStone, Welcome to the Jungle); the exact alerts to create, each a link to the search
  already filtered (words in each country's language, place, internship/entry level, newest first)
  with "Fatto"; how to forward only the alerts to Compass from Gmail, Outlook or others; and a check
  of which platforms' alerts have arrived.
- **Personal Compass address** for everyone (mailbox+cmp-<tag>@…): forwarded alerts are theirs only,
  no password is shared; Gmail's forwarding confirmation code is read and shown to them; "Controlla
  ora" reads the mailbox on demand.
- **Salva in Compass**: a browser bookmark that, on the job page someone is looking at (their own
  click), opens Compass's "Aggiungi" form already filled in (schema.org data, page blocks or the
  selected text).

## 0.14.0 · 2026-10-04

- **Carriere e paesi** (Profilo, and a line on Offerte): choose several careers at once (investment
  banking, strategy consulting, asset management...) and several countries, each with its city.
  Every career adds its position to the searches and all its companies to the web scraping, in all
  the chosen countries; global firms (Goldman Sachs, McKinsey...) count in every country.

## 0.13.0 · 2026-10-04

- **Offers arrive rolling**: during "Fai web scraping" each site's offers are saved as soon as that
  site is done and the page refreshes every 5 seconds with the running count; the automatic run
  now goes every 3 hours (not only in the morning), reading different job boards and sites each time.

## 0.12.0 · 2026-10-04

- **Every company of the sector**: "Fai web scraping" and the daily run read the chosen companies
  and every company of the sectors of the positions searched ("Investment banking analyst" → every
  investment bank and boutique in the person's countries), biggest first, new ones at each click;
  avoided companies and the current employer never.
- Official websites of the catalog's banks, boutiques, funds, consultancies and startups.
- A career page that links to Greenhouse, Lever, Ashby, SmartRecruiters, Workable or Personio is
  read through that official feed.
- Up to 12 sites and 15 job boards per click; 40 boards a day in the daily run.

## 0.11.0 · 2026-10-04

- **"Fai web scraping"** on Offerte: one click reads, in the background and within a minute, the
  chosen companies' job boards and their own career pages, the career pages of the listed companies
  in the chosen sectors, and (with a free search key) LinkedIn, Indeed and InfoJobs results from a
  search engine, shown without opening those sites. At most every 10 minutes per person; the page
  updates by itself and says what was read and found.
- Career pages are scraped politely (robots.txt, one request every 5 s per site, never job
  platforms); a careers page once found is remembered and read again in the daily run.

## 0.10.0 · 2026-10-04

- **First search right away**: when someone finishes the questionnaire (and with "Cerca ora" on
  Offerte, at most every 30 minutes), a search runs in the background for them instead of waiting
  for the next morning; then the daily runs carry on.
- **Company job boards found on their own**: for the chosen companies Compass tries their public
  Greenhouse, SmartRecruiters and Workable boards, keeps one only when the published name matches,
  and reads it; no key needed. Looked for again at most once a month.
- **"Da dove arrivano le tue offerte"** on Offerte: which sources are on, ready links to create the
  LinkedIn, Indeed and InfoJobs alerts, and what an admin key would add.
- **Students**: positions recommended from the CV follow where studies and activities point
  (e.g. finance, markets) with the reason; past leadership and passion roles (coach, captain,
  club founder, goalkeeper), studies and "Studente" are never proposed.
- CV reading: letter-spaced headings ("I S T R U Z I O N E") are sections.

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
