# 0004. W1 search provider: Tavily

**Status:** accepted · 2026-10-04 · re-verify: provider pricing

## Context
W1 discovers job links through an **official search API**, never scraped result pages.

| Provider | Status (Oct 2026) | Card | Notes |
|---|---|---|---|
| Google Custom Search JSON API | closed to new customers, shuts down 1 Jan 2027 | - | not an option |
| Bing Search APIs | retired in 2025 | - | not an option |
| Brave Search API | free plan replaced by about $5/month of credits (~1,000 queries) | **required** | no default spending cap: overage is billed |
| **Tavily** | free "Researcher" plan, **1,000 credits/month**, basic search = 1 credit | **not required** | official API with its own index; `include_domains` acts like `site:` |
| SerpAPI / Serper | free tiers exist | varies | they scrape Google results, which the brief rules out |

## Decision
**Tavily** behind a `SearchProvider` interface (`src/lib/sources/web/w1.ts`).
- Hard cap **in code**: default 25 queries/day, admin-configurable, never above 100
  (`W1_HARD_MAX`). The counter is incremented **before** each call.
- 25/day x 30 = 750 < 1,000 free credits.
- Results are stored as thin records; listing/search pages are filtered out; W1 never fetches
  LinkedIn, Indeed or InfoJobs pages.

## Reversal
Add another `SearchProvider` (e.g. Brave, only with a card and a budget you approve).
