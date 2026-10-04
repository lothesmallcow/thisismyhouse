# 0011. Privacy and data

**Status:** accepted · 2026-10-04

- Her data lives only in our database and the dedicated mailbox. Never in the repository
  (fixtures use invented people and `.example` domains), never in logs (the job runner prints
  counts and redacts e-mail-like strings; source errors are sanitized), never in error pages
  (one calm sentence, no stack traces).
- Raw e-mails are not stored: alerts are parsed in memory; only Message-IDs are kept to avoid
  re-parsing. Reply snippets (400 characters) are stored so she can see who answered.
- "Cancella tutti i miei dati" deletes profile, CVs, jobs, applications, replies, send log,
  outbox, notifications and caches in one step (accounts remain so she can sign in again).
- Secret and personal-data scanning: `scripts/scan-personal-data.mjs` (tax codes, IBANs, phone
  numbers, e-mails on real domains, API keys) and gitleaks, in the pre-commit hook and in CI.
