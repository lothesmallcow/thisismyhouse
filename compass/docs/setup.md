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
   DIGEST_TO=her normal e-mail address (for the morning e-mail)
   CONTACT_EMAIL=an address websites can contact about our requests
   ```

## 2. Forward the job alerts

In **her** LinkedIn / Indeed / InfoJobs accounts (by hand, in the browser), create job alerts for
her roles and city, delivered to her normal inbox. Then in her normal Gmail:
Settings → Forwarding → add the dedicated address; then create filters
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

## 4. Database (Turso, free)

```bash
turso db create compass
turso db show compass --url        # -> DATABASE_URL (libsql://...)
turso db tokens create compass     # -> DATABASE_AUTH_TOKEN
```
Then `npm run db:migrate` and `npm run db:seed` with `DEMO_MODE=false` and your own
`SEED_USER_*` / `SEED_ADMIN_*` passwords (seed creates the two accounts and the letter templates,
no fake data in real mode). Change both passwords from the admin "Accessi" page afterwards.

## 5. Hosting (Vercel Hobby, free)

1. Import the repository in Vercel (root directory `compass/` while it lives in `thisismyhouse`).
2. Environment variables: everything from `.env.example`, with `DEMO_MODE=false`,
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
