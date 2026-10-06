# Changelog

## 0.23.0 · 2026-10-06

- **Every profession, by every name it goes by**: all ESCO occupations of the European Commission
  (about 3,000, in Italian, English, German and French, with the other names people use and the
  skills each needs: data/world/occupations.json, refreshed by the "Compass data" workflow). "Sales
  manager", "Responsabile vendite", "Direttore commerciale" are the same job; each is searched in the
  language of each country.
- **The role step asks what they want**: the same job (or a similar one), a change they can name, or
  a change they want suggested; and the job they do now. Every role field suggests real titles while
  typing. "Suggest me" shows the jobs that need most of the skills they already have, with the share
  and the skills in common ("94% delle competenze · in comune: negoziare contratti…").
- **CV**: any occupation the CV names in full (two words or more) is recommended too.
- **Offers from the employers' own boards** (the ones banks and large companies use): Workday, Oracle
  Recruiting, Eightfold and Recruitee join Greenhouse, Lever, Ashby, SmartRecruiters, Workable and
  Personio, read through the public endpoint each career site itself uses. Big boards are searched with
  the roles people look for, not read whole.
- **A registry that grows by itself**: any offer link that belongs to one of those boards (a web
  result, an alert, a careers page) adds the employer's whole board; "Fai web scraping" and the runs
  every three hours also search those boards directly for everyone's roles and places, and read the
  boards found in rotation. Boards nobody chose keep only offers carrying one of the searched roles.
- Admin → Aziende accepts a pasted link to any offer to add its board.
- **The search code becomes a grammar of searches**, best first: the role in each place (job sites,
  API), the role on employers' boards, the role at each chosen company ("Sales manager" Gucci, on the
  boards and on LinkedIn, plus "Gucci lavora con noi"), the role in each chosen sector ("Sales
  manager moda Milano", API, job sites and boards), its English title in Italy and its other names,
  remote and part-time when wanted; students: internships and graduate programmes at their companies
  and in their sectors. Each runs at most once a day and in turn within the daily caps, so the whole
  list is worked through in a few days; each "Fai web scraping" takes one of each family first.
  Profilo → Il tuo codice shows them all.

## 0.22.7 · 2026-10-06

- **The site's address follows Vercel**: on production deployments links, e-mails and "Collega
  Gmail" use the project's production domain as Vercel reports it, so a stale APP_URL can no longer
  send people to a 404.
- **Admin password**: at least 6 characters (was 12), from the host's secrets as before.

## 0.22.6 · 2026-10-06

- **Sign-in**: after a wrong password you can retry at once; only 10 wrong ones in 15 minutes pause
  that account for one minute (was 5 wrong → 15 minutes). Longer locks set before are lifted.

## 0.22.5 · 2026-10-06

- **Admin account repaired at every deploy**: from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (at least 12
  characters) in the host's secrets, the admin is created if missing, or re-enabled with that password.
  Before, it was silently not created when the same e-mail was already a person's account (e-mails
  are unique): now the admin lives on the "+admin" alias of that e-mail, and signing in as admin with
  the plain e-mail ("Sono l'amministratore") finds it.

## 0.22.4 · 2026-10-06

- **Login**: "Sono l'amministratore" on the sign-in page opens the admin area with the admin account
  (same limits on wrong passwords); unticked, it is the usual sign-in.

## 0.22.3 · 2026-10-06

- **Company names from web results, fixed at the source**: the result-title parser no longer takes a
  place ("Milano, Lombardia") or the job site ("Reed.co.uk", "Indeed.com") for the company, and reads
  LinkedIn's "MUFG hiring … in London". Companies saved wrongly that way are emptied at deploy and
  guessed again from the text.
- **A name said once counts when it makes sense**: next to a company cue ("presso X", "X ·",
  "Company: X", "X is hiring") or in the first lines when it reads as a firm (two words, a legal form
  like SGR or SpA, an acronym like MUFG). Section words ("Requisiti", "Descrizione") never count.
- **Approved sites (W2)**: an offer whose data has no hiring organisation takes the site's owner from
  the page (name, title, logo, address).

## 0.22.2 · 2026-10-06

- **Offerte header**: the buttons sit together again; under them, one short line "3/3 ricerche
  rimaste · Aumenta ricerche".

## 0.22.1 · 2026-10-06

- **Checkout**: any complete card number is accepted for the trial (not only the test card). Still
  nothing typed in the card fields is sent or saved, and nothing is charged.

## 0.22.0 · 2026-10-06

- **Plans: Free, Plus, Premium** (`/piano`, lib/core/plans.ts). Free: 3 searches by hand a day,
  one an hour; Plus (4,99 €): 10, one every 15 minutes; Premium (9,99 €): 30, one every 5 minutes,
  with the AI assistant, AI cover letters and interview prep marked "In arrivo". The public price page
  shows the same plans (the old Essenziale / Compass / Famiglia list is gone).
- **"Fai web scraping" has a countdown**: "Prossima ricerca tra 42:13", and how many searches are
  left today; the nightly search is unchanged.
- **Payments are not live**: a paid plan starts as a free trial. The checkout page is ready (Aurora
  style), but its card fields are never sent and only the test card 4242 4242 4242 4242 is accepted,
  so nobody types a real card into a page that cannot charge it.
- **Plans right after the questionnaire** (`/benvenuto/piani`), with "Decido dopo"; the plan is in
  Profilo.
- **Lighter deployments**: the company registers (22 MB, used only by the migration script) and
  libsql's unused musl build are kept out of the server functions (about 54 MB → 22 MB each), and
  branch pushes (`claude/*`) no longer make preview deployments on Vercel.

## 0.21.5 · 2026-10-06

- **Company = the name the page repeats most**, when nothing states it: the whole text of the offer's
  page (from the search API's copy of the page, or our own visit) is scanned, catalog companies count
  double, and menus, roles, places, months and the job site's own name never count. On job sites and
  aggregators (Reed, Bright Network, eFinancialCareers…) only the job's own data, the company in the
  address and the text count, never the site's name. The lookup now also runs on "Cerca ora" (10
  offers per click), not only in the nightly run, and offers already looked at are looked at again.
- **Expired ads**: a page that says so ("Annuncio di lavoro scaduto", "No longer accepting
  applications", "This job has expired"…) marks the offer "Annuncio scaduto", ranked very low. An ad
  published more than two weeks ago with no deadline ahead says "Potrebbe essere scaduta: controlla
  prima di candidarti" (over a month: "Probabilmente scaduta") and ranks lower.
- **Gmail**: the first reading goes back 10 days instead of a month (older alerts are often closed).
- Cards say "Pubblicata …" when the ad's date is known, "Trovata …" otherwise.

## 0.21.4 · 2026-10-06

- **The bank's name from its own page**: offers that arrive without a company (web results, some
  alerts) get it from the code of the page they link to, the way a person sees it at a glance:
  structured data (the job's hiring organisation), the site's name, the tab title ("… | Citi
  Careers"), the logo's alt text, the copyright line, the address (job-board slug or domain); in the
  catalog's spelling when it is a catalog company, otherwise from the page's text. One polite visit
  per offer (robots.txt respected, at most 25 a run); LinkedIn, Indeed, InfoJobs and Glassdoor are
  never visited. Once named, an offer that turns out to be one we already had is merged.
- **No more company logos** on the cards (they showed a "?" when the company was unknown); the
  DuckDuckGo icons line is gone from the privacy page.

## 0.21.3 · 2026-10-06

- **Collega le fonti**: after "Ce l'ho già" (or "Crea") a small panel says that site's alerts must
  arrive at the mailbox Compass reads (the Gmail you linked, or the one of step 1), where the site
  shows the account's e-mail and how to change it, and where alert e-mails are turned on.
- **Company recognised from the whole ad**: besides title and link, a sentence that states it
  ("Azienda: X", "About X", "X è una società…", "X is a leading…"), then the catalog companies in the
  opening lines, then the one the whole text names most (a client named once among others is not
  taken). Company names given by the source take the catalog's spelling ("JPMorgan" → "J.P. Morgan").
- **Fewer duplicate offers**: the same company written another way ("J.P. Morgan" / "JPMorgan",
  "Intesa San Paolo" / "Intesa Sanpaolo") is one company; a copy without the company matches the one
  with it when the title (three words or more) and the city are the same. Duplicates already stored
  are merged at deploy: the older offer keeps every link, folder, application and person.

## 0.21.2 · 2026-10-06

- **Collega le fonti, accounts**: for each site "Ce l'ho già" or "Crea" (opens the sign-up page);
  the answer is saved at once and remembered, and the alert guides then cover those sites.
- **Collega le fonti, alerts**: besides the recommended alerts, "I tuoi avvisi, per qualunque lavoro":
  write what and where, Compass prepares the search on each of your sites (LinkedIn, Indeed,
  InfoJobs, eFinancialCareers, Reed, StepStone, Welcome to the Jungle; Bright Network by
  preferences) with the step-by-step to save it as a daily e-mail alert and where to check it is on.
  A "sito per sito" guide is always there too.

## 0.21.1 · 2026-10-06

- **Non mi interessa** on a card is instant: the card goes at once, no reload, no jump to the top, no
  message (the server forgets the offer in the background). Still undoable for 3 days in "Non mi
  interessano".
- **Mi interessa** (theme blue) next to it: pick a folder in one click or create one, then back to the
  same spot in the list.
- **Company names found more often**: from the title ("Analyst presso Banca X", "X is hiring"), from
  the link (LinkedIn's "…-at-intesa-sanpaolo-…"), or from the first catalog company named in the title
  or the opening text, in the catalog's spelling. Offers saved without a company are fixed at deploy.
- **Company logos** on the cards: the company site's icon when its site is known (catalog or the
  offer's own link), otherwise its initial. Icons come from DuckDuckGo's icon service (only the
  company's domain is sent); privacy page updated.

## 0.21.0 · 2026-10-06

- **New look, "Aurora"**: Compass's own light-blue palette (airy background, sky-blue accent, page
  titles on a blue gradient band) with an Apple-like finish: frosted-glass top and bottom bars, SF Pro
  on Apple devices (Inter elsewhere), pill-shaped buttons and controls, rounder cards with soft depth.
  Dark mode follows the same palette.
- **Subtle motion**: buttons give way slightly the moment they are pressed, cards lift on hover, each
  section fades in when opened, offer lists arrive one card after another, filters open softly, the
  active tab settles with a small spring. Nothing loops; all of it stops when the system asks for less
  motion.
- Offer cards: a coloured bar on the left by fit (green very fit, amber fit, grey less fit), the score
  large on the right, "Nuova" as a badge next to the title.
- Offerte: views and search in one panel, Filtri with an icon and an arrow that turns, level headings
  with a coloured dot.
- Layout only: no behaviour, text, link or route changed.

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
