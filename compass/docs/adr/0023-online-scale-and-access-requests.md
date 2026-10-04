# 0023 · Online at register scale, access on request

Status: accepted · 2026-10-04

## Context
Compass goes online for invited people (Vercel Hobby + Turso free, EU region). Turso bills rows
read and written; with ~950,000 register companies, every search or company page was a full scan.
The owner also wants to approve every person before they can use it.

## Decision
- Company name search uses an FTS5 table (`catalog_companies_fts`, kept in sync by triggers);
  browsing, suggestions, the admin catalog and the person's short lists use indexes and stop at
  what they show; register rows are counted once at import and browsing counts at most 10,000.
  Checked on the full data: no query above ~20 ms, all plans on indexes.
- Registration mode `approval` is the default: a request creates an inactive account marked
  `pending_since`, e-mails `ADMIN_ALERT_EMAIL`, and waits for Approva/Rifiuta in Admin → Persone.
  Sign-in tells the person the request is pending only when the password is right.
- Online the registers default to Italy (`REGISTERS=IT`) to keep writes and storage small.

## Consequences
Search matches words by prefix (not any substring) for register companies. The free plans' limits
should be watched in the Turso dashboard during the first weeks; figures are not guaranteed.
