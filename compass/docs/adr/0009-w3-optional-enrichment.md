# 0009. W3: single public job pages from LinkedIn/Indeed/InfoJobs

**Status:** designed, **not built in this repository**, off · 2026-10-04

## Context
The brief allows an optional module that, logged out and with strict limits (20 fetches/day,
10 s apart, stop on the first 403/429/login wall/CAPTCHA), enriches thin records. It must live in
`private-sources/`, excluded from the public repository, and be enabled only after the owner's
explicit OK on each platform's current terms.

## Decision
- The hook exists: `w3Enabled` setting (default `false`), `w3` source kind, `usage_counters`
  table for the daily cap, health tracking with day-long pause on blocks.
- The fetcher itself is **not** written here, because this repository is public and the code
  would be lost if kept only in this cloud container. `private-sources/` is in `.gitignore`.

## Risks to weigh before enabling
- LinkedIn's User Agreement prohibits scraping and automated access, and LinkedIn has litigated
  this; Indeed's and InfoJobs' terms also restrict automated access. Whether those terms bind a
  logged-out visitor is legally contested, and an IP block could affect her normal browsing.
- Benefit is modest: most thin records can be opened by her in one tap.

## Next step (needs the owner)
Read the current terms, decide, then build it in a private repository that imports this one.
