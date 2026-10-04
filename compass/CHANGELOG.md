# Changelog

## 0.2.0 · 2026-10-04

Hardening after an independent review and a full audit.

- **Sending**: her stop and the admin's stop are separate; scam rules recomputed at send time;
  one e-mail per queue run with real spacing; daily cap re-checked at send time; atomic claim
  (no double sends); stuck sends recovered and reported; real mode with sending off waits instead
  of pretending; first week starts at the first real send; Italian public holidays; "Invia tutte"
  sends exactly what she saw and never flagged drafts; digest independent of the sending switch.
- **Sources**: 403/429 pause the whole host; W2 follows redirects through robots.txt and never
  fetches job platforms; HTTP retries with backoff; W1 suggests spontaneous companies; W3 safety
  gate (caps, spacing, stop rules) with tests; optional Nominatim geocoder (off).
- **Security/privacy**: startup env validation in real mode; sign-in throttling; reply status
  whitelist; delete-all in one transaction; admin alerts by e-mail; CSV backup export.
- **UI**: axe-clean on 98 screens (WCAG A/AA + AAA contrast), all her text >= 18 px, no sideways
  scroll at 320 px; clearer copy found in a first-time-user walkthrough.
- **Performance**: batched re-ranking (5,000 jobs: 7.5 s -> 0.8 s).
- **Docs**: admin guide, Italian guide with screenshots, audit reports, LICENSE (MIT).

## 0.1.0 · 2026-10-04

First complete version, demo mode end to end.

- **M0** research recorded as ADRs 0001-0012 (mailbox access, job APIs, search API, hosting,
  geodata, guardrails, W3, auth, privacy).
- **M1** Next.js 16 + Drizzle/libSQL skeleton, CI, secret + personal-data scanning, demo seed,
  LinkedIn alert parser + generic fallback, Adzuna adapter, offers list.
- **M2** onboarding wizard (8 steps), filters, detail page, explainable ranking with
  "Non mi interessa" adjustments, Indeed and InfoJobs parsers, W1 (Tavily, capped) and W2
  (robots.txt, polite fetcher, JSON-LD), ATS watchlist (6 systems).
- **M3** CV library, letter templates, Lane 3 kit, Lane 2 Claude prompt, Lane 1 approval mode
  with every guardrail, kill switch, undo window, send log.
- **M4** autopilot toggle, spontaneous applications (+ CSV import), reply detection, daily digest,
  scheduled jobs (GitHub Actions + protected `/api/cron/*`).
- **M5** PWA (manifest, icons, offline page), Italian guide, README with Mermaid architecture and
  screenshots, admin metrics, public landing page and subscription page (invented prices,
  payments not active). Deployment prepared, not performed.
- **M6** W3 designed (flag, caps, health) but not shipped in this public repository.
