# 0003. Job APIs (free tiers)

**Status:** accepted · 2026-10-04 · re-verify: each provider's terms before going live

| API | Italy | Free tier | Fields | Decision |
|---|---|---|---|---|
| **Adzuna** | yes (`/jobs/it/`) | instant key, about 25 calls/min, 250/day, 2,500/month | title, ~500-char snippet, company, location, salary (sometimes predicted), contract type/time, created | **Built, on.** Predicted salaries are ignored, not used as facts. **Caveat:** Adzuna's terms mention a 14-day trial for validating data and a possible licence after that. Personal non-commercial use needs to be confirmed with them (see "Waiting on you") |
| **Jooble** | yes (key from it.jooble.org) | free key on request, but a **lifetime** quota of about 500 requests | title, snippet, salary text, company, link | **Built, off by default** (quota too small for daily use) |
| **Careerjet** | yes (`it_IT`) | v4 API needs an API key from the publisher programme | publisher-oriented (displaying results with tracking) | **Not built.** Built for job-board publishers, not personal pipelines; little added value over Adzuna |

All adapters go through `fetch -> raw -> parse -> normalize`, receive an injected `fetch`
(tests never hit the network) and run inside `runWithHealth()`.
