# 0014. Several people: accounts, shared jobs, private everything else

**Status:** accepted · 2026-10-04

## Context
Compass started for one person. It now serves a few (a job seeker and a university student, and
whoever the admin invites), each with their own profile, CV, choices and applications. Many job
ads are useful to more than one person, but some come from one person's private alert e-mails.

## Decision
- **Jobs are shared, judgements are not.** The `jobs` table holds the ad once; `user_jobs` holds
  each person's distance, score, level, reasons, status and whether it matches their choices.
- **Visibility**: a person sees a job only if at least one of its sources is shared
  (`job_sources.user_id` null: APIs, ATS, W1/W2) or belongs to them (their alert e-mails, their
  manual paste). A private addition never enriches a job other people already see.
- **Everything personal carries `user_id`** (CVs, templates, applications, send log, replies,
  outbox, notifications, preferences, experiences) and every server function takes the person's
  id and checks ownership; the CV download route serves only the owner (or the admin).
- **Accounts**: registration is `closed`, `invite` (default) or `open` (20 a day). Invitation
  codes are stored only as an HMAC and shown once. The admin can open a person's app to help
  (`compass_view_as`), and can deactivate or delete an account.
- **Mailboxes**: `MAILBOX_USER` is "default", `MAILBOX_<KEY>_USER` adds more; `users.mailbox_key`
  links a person to one. The morning e-mail goes to each person's digest address.
- **Migration 0003** moves the single-person data to the first account (tested on legacy rows).

## Consequences
Re-ranking is per person (1.1 s for 5,000 jobs each). Every new table must get a `user_id` and an
isolation test; `tests/unit/accounts-catalog.test.ts` and the e2e security suite check that one
person never sees another's data.
