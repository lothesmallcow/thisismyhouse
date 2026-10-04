# 0005. Hosting at EUR 0

**Status:** proposed (deploying is a permission point) · 2026-10-04 · re-verify: free-tier terms

| Piece | Choice | Free-tier facts (Oct 2026) |
|---|---|---|
| Web app | **Vercel Hobby** | for personal, non-commercial use; cron jobs on Hobby run **at most once a day** (more frequent expressions fail to deploy), timing only within the hour, UTC |
| Database | **Turso free** | 100 databases, 5 GB storage, 500M rows read / 10M rows written per month; free databases no longer cold-start |
| Scheduled jobs | **GitHub Actions** cron (`.github/workflows/scheduled-jobs.yml`) | free and unlimited minutes for **public** repos (2,000 min/month for private); **scheduled workflows are disabled after 60 days without repository activity** on public repos |

Rejected: Supabase free (projects pause after about a week of inactivity), Neon free (fine, but
SQLite keeps local dev simpler).

## Decision
- The app (UI + `/api/cron/*`) on Vercel; Vercel Cron only for the daily digest.
- Frequent jobs (queue every 15 minutes in the send window, replies every 2 hours) on GitHub
  Actions, running `scripts/run-job.ts` directly against Turso.
- Locally: `npm run demo` (one command).

## Consequences
- The 60-day inactivity rule: any commit or a manual run keeps the schedule alive; the admin
  page shows the last runs so a silent stop is visible.
- Public CI logs: the job runner prints counts only and redacts anything that looks like an
  e-mail address.
