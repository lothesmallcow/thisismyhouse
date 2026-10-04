# 0008. Sending guardrails and demo mode

**Status:** accepted · 2026-10-04

## Decision
- **Two keys for real e-mail**: `DEMO_MODE=false` in the environment **and** the admin switch
  "Accendi l'invio reale" (and a configured mailbox). Otherwise every e-mail goes to the
  `outbox` table. Development, tests and the public demo always use demo mode.
- `checkSend()` (pure, `src/lib/core/guardrails.ts`) runs **when she approves** and **again
  right before sending**: kill switch, valid single recipient, never the same job twice, same
  company once per 60 days (spontaneous: 182 days), blocklist (company/domain/keyword), PDF
  under 2 MB, scam flags (warning when she approves, blocker for autopilot), autopilot only for
  "Molto adatta".
- `scheduleSend()`: at least 15 minutes from now (the "Annulla" window), 5-20 random minutes
  after the previous send, Monday-Friday 08:30-18:00 Europe/Rome (DST-safe), daily cap 10
  (3/day in the first week after go-live, hard max 20).
- The kill switch pulls queued e-mails back to "Da inviare".
- Plain-text e-mails, one recipient, reply-to the dedicated mailbox, full send log.

## Consequences
Autopilot can never send something she would have been warned about. The scam rules live in
one file (`scam-rules.ts`) so they are easy to extend.
