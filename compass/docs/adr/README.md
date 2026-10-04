# Architecture Decision Records

One short record per major decision: context, decision, consequences, how to reverse.
Facts about third-party services were checked on 2026-10-04 and can change; each ADR says
what to re-verify.

| # | Decision |
|---|---|
| [0001](0001-stack.md) | Next.js 16 + TypeScript + Tailwind 4 + Drizzle + libSQL/Turso |
| [0002](0002-mailbox-access.md) | Dedicated Gmail via IMAP + SMTP with an app password |
| [0003](0003-job-apis.md) | Adzuna first, Jooble off by default, Careerjet not built |
| [0004](0004-w1-search-provider.md) | W1 search via Tavily, hard daily cap in code |
| [0005](0005-hosting.md) | Vercel Hobby + Turso free + GitHub Actions cron, EUR 0 |
| [0006](0006-rule-based-extraction-and-ranking.md) | Rule-based extraction and explainable ranking, no AI |
| [0007](0007-offline-geodata.md) | Offline comuni dataset for distances |
| [0008](0008-sending-guardrails-and-demo-mode.md) | Two-key real sending, guardrails checked twice |
| [0009](0009-w3-optional-enrichment.md) | W3 kept out of the public repo and off |
| [0010](0010-auth.md) | Own sessions, scrypt, separate admin cookie |
| [0011](0011-privacy-and-data.md) | What is stored, where, and how it is deleted |
| [0012](0012-project-location-and-name.md) | Name "Compass", code in `compass/` for now |
| [0013](0013-send-queue.md) | Send queue: atomic claim, one per run, cap at send time, recovery |
| [0014](0014-accounts-and-visibility.md) | Several people: shared jobs, per-person scores and data, invitations |
| [0015](0015-catalog-themes-and-career.md) | Catalog with themes and extra sectors, focus switch, career suggestions, student year rules |
| [0016](0016-experience-timeline.md) | Timeline from the CV text or LinkedIn's data export (the API gives no work history) |
| [0017](0017-redesign.md) | A quieter, professional design with the same accessibility floor |
| [0018](0018-world-reference-data.md) | Companies, industries and places for IT/UK/DE/FR; searches only where people want, best fits first |
