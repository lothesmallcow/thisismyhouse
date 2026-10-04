# 0002. Mailbox access: IMAP + SMTP with an app password

**Status:** accepted · 2026-10-04 · re-verify: Google app-password policy

## Context
A dedicated Gmail account receives forwarded job alerts and recruiter replies, and sends the
applications. Three options were compared.

| Option | Pros | Cons (as of Oct 2026) |
|---|---|---|
| **IMAP + SMTP with app password** | Simple, standard, works from any host and from GitHub Actions; no Google Cloud project | Needs 2-Step Verification; app passwords still supported for consumer accounts in 2026, but Google could restrict them later |
| Gmail API, OAuth app in "Testing" | Fine-grained scopes | Refresh tokens **expire every 7 days** in Testing; going to Production with restricted `gmail.*` scopes requires Google verification (and a security assessment for restricted scopes). Not realistic for a personal tool |
| Google Apps Script inside the account | Free, no credentials leave Google | Consumer quotas: about **100 recipients/day** for sending and **90 min/day** of trigger runtime; logic split across two languages/runtimes; harder to test |

Note: the January 2027 Gmail changes (end of Gmailify, POP fetch and third-party "Send as")
do **not** affect Gmail's own IMAP access.

## Decision
IMAP (read) + SMTP (send) with an app password, behind a `Mailbox` interface
(`src/lib/sources/mail/`). Processed Message-IDs are stored in our DB, so nothing is parsed twice
and the mailbox is never modified. In demo mode a `DemoMailbox` serves synthetic e-mails through
the same RFC 822 parser.

## Consequences
- Credentials: `MAILBOX_USER`, `MAILBOX_APP_PASSWORD` in `.env` / host secrets only.
- If Google ends app passwords, the Apps Script route is the fallback: a script could forward raw
  alerts to an endpoint of ours. The `Mailbox` interface keeps that change local.
