# Admin guide (for you)

Short and practical. Everything is in the admin area: `/admin/entra` (separate login).

## People and passwords
Admin → **Persone**:
- **Crea un account** (name, e-mail, password of 10+ characters, track *lavoro* or *stage*), or
  **Crea invito** (in *Inviti*): a link valid 14 days, shown once, for one person to sign up alone.
- Per person: mailbox key (`default`, or e.g. `studente` if `MAILBOX_STUDENTE_*` is set), the
  address for the morning e-mail, a new password, deactivate, delete (type ELIMINA).
- **Apri la sua app** shows Compass exactly as that person sees it, to help them; a bar at the
  top says so and takes you back.
- Who can sign up on their own: Admin → **Fonti** → *Registrazione* (closed, by invite, open).
After 5 wrong attempts an account is locked for 15 minutes (on purpose).

## Catalog (companies and sectors people can choose)
Admin → **Catalogo**: the curated list plus what people added with "Altro". Entries added by a
person are private to them until you press **Rendi visibile a tutti**. You can fix a company's city or its
ATS (system and slug) so its offers are read directly from its careers site.

## Add a company to follow
1. Open the company's careers page and look at the address of the job list:
   `boards.greenhouse.io/<slug>`, `jobs.lever.co/<slug>`, `jobs.ashbyhq.com/<slug>`,
   `jobs.smartrecruiters.com/<slug>`, `apply.workable.com/<slug>`, `<slug>.jobs.personio.de`.
2. Admin → **Aziende (ATS)** → name, system, slug → **Aggiungi**. Next collection picks it up
   (only offers located in Italy are kept).

## Add a W2 site (company "Lavora con noi" page, small job board, agency, inPA)
Admin → **Siti (W2)** → **Proponi un sito**. It stays OFF until you write the summary of its
terms of use and of robots.txt and press **Ho controllato: approva** (the date is stored).
Job platforms (LinkedIn, Indeed, InfoJobs, Glassdoor) are refused here by design.

## Read source health
Admin → **Fonti**. One row per source: last success, last run (items found), total, read
errors, blocks, status. "attenzione" means: the e-mail template probably changed (parser found
nothing), the site blocked us (paused until tomorrow), or the password/key was rejected.
Problems also appear on **Panoramica** and, if `ADMIN_ALERT_EMAIL` is set, arrive by e-mail.
**Esegui ora** runs any scheduled job by hand.

## Sending rules, autopilot, stop
Admin → **Invii e regole**: daily cap (max 20), first-week cap, window, spacing, undo minutes
(never below 15), cooldowns, **Pilota automatico** (off by default; sends only "Molto adatta"
offers that pass every rule, never suspicious ones).
Admin → **Panoramica** → **Ferma tutti gli invii**: your stop. She cannot lift it; she has her
own red button for her stop.

## Switch demo mode off (going live)
Follow `docs/setup.md` in order. In short: real values in `.env` / host secrets with
`DEMO_MODE=false` (the server refuses to start if a required variable is missing), then Admin →
Invii e regole → **Accendi l'invio reale**. The first real send starts the first week (3/day).

## W3 and the geocoder
- **W3** (single public pages from the platforms) is not in this repository. Admin → Fonti shows
  it as off. Read ADR 0009 before deciding anything.
- **Geocoder online** (OpenStreetMap Nominatim, for places outside the comuni list): Admin →
  Fonti → tick it → Salva. Off by default.

## Backups
Admin → **Panoramica** → **Scarica** offerte / candidature / registro invii (CSV).

## Demo tools
Admin → **Posta demo** (demo mode only): see every e-mail Compass "sent", run the queue now on a
simulated clock, simulate a recruiter's reply.
