# 0013. Send queue: spacing, races and recovery

**Status:** accepted · 2026-10-04 (from the independent review)

## Context
Several runners can touch the queue (GitHub Actions cron, Vercel cron, the admin's "run now").
Two approvals can land in the same minute. A runner can die after deciding to send.

## Decision
- **Atomic claim**: a runner moves a row `queued -> sending` with a conditional UPDATE; only the
  runner that gets the row back sends it. Two runners at once send it once (test).
- **One e-mail per run**: anything else due is moved to the next free slot computed from the
  real history (5-20 min spacing, window, holidays, cap). No bursts at 08:30 (test).
- **Cap at send time**: the daily cap is re-checked right before sending, so racing approvals
  cannot exceed it (test).
- **Recovery**: a row in `sending` for more than 10 minutes becomes `failed` and the admin is
  notified (the e-mail may or may not have left; she is never told it was sent).
- **Real mode, sending switch off**: the queue holds; nothing is simulated or logged as sent.
- **First week**: starts at the first real send, not when a switch is flipped in demo mode.
