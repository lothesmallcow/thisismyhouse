# Going live: setup checklist

Everything below needs a human (accounts, credentials, approvals). Do the steps in order; the
app keeps working in demo mode until the last one.

## 1. Dedicated Gmail account

1. Create a new Gmail account just for the job search (e.g. `nome.cognome.lavoro@gmail.com`).
2. Turn on **2-Step Verification** (Google Account → Security).
3. Create an **app password** (Google Account → Security → App passwords), name it "Compass".
4. In `.env` (never in chat, never in git):
   ```
   MAILBOX_USER=(the new Gmail address)
   MAILBOX_APP_PASSWORD=the 16-character app password
   CONTACT_EMAIL=an address websites can contact about our requests
   ADMIN_ALERT_EMAIL=your inbox, for alerts when a source breaks
   ```
   The morning e-mail goes to each person's "e-mail per il riepilogo" (Admin → Persone), or to
   the address they sign in with if that is empty.

   **A second person with their own mailbox** (e.g. the student account): repeat steps 1-3 for a
   second Gmail and add `MAILBOX_<KEY>_USER` and `MAILBOX_<KEY>_APP_PASSWORD`, for example
   `MAILBOX_STUDENTE_USER` / `MAILBOX_STUDENTE_APP_PASSWORD`. Then in Admin → Persone set that
   person's mailbox to `studente`. Applications leave from their mailbox, their alerts are read
   from it, and nobody else sees what arrives there. People can also share the default mailbox.

   With `DEMO_MODE=false` the server **refuses to start** if a required variable is missing or
   weak (it prints which one), so mistakes show up at deploy time, not weeks later.

## 2. Forward the job alerts

For each person, in **their** LinkedIn / Indeed / InfoJobs accounts (by hand, in the browser), create job alerts for
her roles and city, delivered to their normal inbox. Then in that normal Gmail:
Settings → Forwarding → add their dedicated address; then create filters
`from:(jobalerts-noreply@linkedin.com OR jobs-listings@linkedin.com OR alert@indeed.com OR noreply@infojobs.it)`
→ "Forward to" the dedicated address. (Or set the alerts to the dedicated address directly.)

After a few days, save 2-3 real alerts per platform as `.eml`, **anonymize** them, and add them
to `fixtures/emails/` with a test (the parsers are marked "needs real sample" until then).

## 3. API keys (free, no card)

- **Adzuna**: sign up at developer.adzuna.com → `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`. Before relying
  on it, confirm with Adzuna that ongoing personal, non-commercial use is fine (their terms
  mention a 14-day evaluation period).
- **Tavily** (W1): sign up at tavily.com, free plan → `TAVILY_API_KEY`.
- **Jooble** (optional): request a key at it.jooble.org/api/about → `JOOBLE_API_KEY`. Only about
  500 requests in total, so leave it off unless needed.

Adzuna covers Italy, the UK, Germany and France with the same key; Compass only asks for the
countries people chose in the questionnaire (Italy when nobody chose).

## 4. Database (Turso, free)

```bash
turso db create compass
turso db show compass --url        # -> DATABASE_URL (libsql://...)
turso db tokens create compass     # -> DATABASE_AUTH_TOKEN
```
Then `npm run db:migrate` (it also loads the ~3,100 listed companies and the NACE industries
from `data/world/`, once) and `npm run db:seed` with `DEMO_MODE=false` and your own
`SEED_USER_*` / `SEED_ADMIN_*` passwords (seed creates the first person, the admin and the
letter templates, no fake data in real mode). Change both passwords afterwards.

**More people.** Admin → Persone: create an account directly, or create an invitation link
(valid 14 days, shown once). Admin → Fonti → "Registrazione" decides who can sign up:
`chiuso`, `solo con invito` (default) or `aperto` (at most 20 new accounts a day). Each person
has their own profile, CV, companies, applications and morning e-mail; the admin can open any
person's app ("Apri la sua app") to help them.

### 4b. Every company and every job title (optional, open data)

The demo catalog has the ~3,300 listed companies of Italy, the UK, Germany and France. To add the
whole registers (ADR 0020), download the files on your computer and import them:

| Country | File | Where | Licence |
|---|---|---|---|
| UK | `BasicCompanyDataAsOneFile-*.zip` (unzip) | download.companieshouse.gov.uk/en_output.html | Open Government Licence |
| France | `StockEtablissement_utf8.zip` (unzip) | data.gouv.fr, "Base Sirene des entreprises" | Licence Ouverte |
| Germany | `de_companies_ocdata.jsonl.bz2` (bunzip2) | offeneregister.de | CC0 |
| Any (LEI) | GLEIF golden copy, level 1 CSV | gleif.org/en/lei-data/gleif-golden-copy | CC0 |
| Italy | your own CSV: `name,country,city,industry,nace,website,employees` | e.g. exported from a provider you have rights to | yours |

```bash
npx tsx scripts/import-register.ts --format companies-house --file BasicCompanyDataAsOneFile.csv --dry-run
npx tsx scripts/import-register.ts --format companies-house --file BasicCompanyDataAsOneFile.csv --regions GB:England --nace 47,46,64,70
npx tsx scripts/import-register.ts --format sirene --file StockEtablissement_utf8.csv --min-employees 10
npx tsx scripts/import-register.ts --format offeneregister --file de_companies_ocdata.jsonl --cities München,Berlin,Hamburg,Frankfurt am Main
npx tsx scripts/import-register.ts --format gleif --file gleif-level1.csv
```
Filter by region, sector (`--nace`) or size: all UK companies are ~5 million rows. Every job title
in four languages: download the ESCO CSV for it, en, de, fr (esco.ec.europa.eu → Download), put the
four `occupations_<lang>.csv` in a folder and run `npx tsx scripts/import-esco.ts --dir <folder>`.

## 5. Hosting (Vercel Hobby, free)

1. Import the repository in Vercel (root directory `compass/` while it lives in `thisismyhouse`).
2. Environment variables: everything from `.env.example` (including any `MAILBOX_<KEY>_*`), with `DEMO_MODE=false`,
   a long random `SESSION_SECRET` and `CRON_SECRET`, `APP_URL` = the Vercel URL.
3. `vercel.json` schedules the daily digest; Vercel sends `CRON_SECRET` automatically.

## 6. Scheduled jobs (GitHub Actions, free on public repos)

In the repository settings add the secrets listed at the top of
`compass/.github/workflows/scheduled-jobs.yml` and the variable `DEMO_MODE=false`. (While Compass
lives inside `thisismyhouse`, copy that workflow to the root `.github/workflows/` and add
`working-directory: compass`.) Scheduled workflows stop after 60 days without commits on a
public repo: the admin "Panoramica" shows the last runs.

## 7. Real sending (last)

1. Admin → Invii e regole → check the rules.
2. "Accendi l'invio reale". The first week sends at most 3 per day.
3. Watch the "Registro invii" for the first days.

## 8. Usability test (human)

After she has used "Offerte" for a couple of days, and again after the applying screens:
sit next to her for 15 minutes without helping, note where she hesitates, fix those first.
