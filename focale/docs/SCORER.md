# Website Scorer (`/analisi-sito/`)

A free tool: a business owner pastes the address of their site and gets a private, graded report
(score out of 100, category bars, the 5 fixes worth the most points, legal points to check), then
sees what we would build: our own demo site for that sector measured with the same rubric, the
three packages with the one that fits highlighted and the reason shown, and one call to action
(email + unticked consent) for a free preview. It is the main inbound lead magnet: Lorenzo does not
email strangers. The batch CLI lets Lorenzo score a private list of prospects to know what to say.

Research: `reports/Website Scorer studi fitness Milano.md` (fitness, graders, result pages, legal and
technical feasibility) and `reports/Requisiti siti per settore.md` (every sector, with a build
checklist per sector that is also meant for future client projects). Notes in `research_notes/`.

## Design DNA (Phase 0)

1. It is a page of the Focus Design site: same header, footer, Schibsted Grotesk, white paper, navy ink.
2. Brand blue #13307A for surfaces and bars; orange #FF6A1F only on the action buttons (navy text).
3. Inner-page opening (PageHead): text left, the page's picture right. Here the picture is a real
   number: our fitness demo measured with the same rubric.
4. One memorable element: the score ring, coloured by band, number counting up once.
5. Everything else quiet: category bars as thin hairline tracks, fixes as plain bordered cards.
6. Voice: "noi", plain Italian, no em dashes, no jargon (no "LCP", "CLS" in the copy).
7. Honest numbers only: measured or not shown. No fake progress, no countdowns, no comparisons.
8. Motion: transform and opacity only, inside prefers-reduced-motion: no-preference; no layout shift.
9. 44 px targets, visible focus, content readable before JavaScript (the form is plain HTML).
10. The navy band (section--sole) carries "Cosa possiamo fare noi", like the prices on the home.

## Architecture

| File | What it does |
| --- | --- |
| `src/scorer/rubric.json` | Versioned rubric: check library (title, why, fix in Italian), common block of points, one profile per sector (points, wording, vocabulary). Change it, bump `version`. |
| `src/scorer/sectors.ts` | Resolves a sector profile into a flat list of checks; guesses the sector from the page's words and schema type ("altro" if nothing matches). |
| `src/scorer/page.ts` | Reads signals from HTML only (no rendering). Hidden text is dropped, so hidden keywords earn nothing. |
| `src/scorer/checks.ts` | One deterministic function per check. |
| `src/scorer/perf.ts` | PageSpeed Insights: real-user data (CrUX) first, else the lab run in wide bands; `perfCacheable` keeps only the numbers. |
| `src/scorer/score.ts` | Total, categories, top 5 fixes, flags, package recommendation. |
| `src/scorer/safe-fetch.ts` | SSRF guard: http(s) only, ports 80/443, no credentials or IP literals or local names, every resolved address public (IPv4, IPv6, mapped), redirects re-checked (max 4), 10 s, 1.5 MB. Refuses social profiles and link pages. |
| `src/scorer/analyze.ts` | Fetch + PSI + score for every sector at once (the visitor can switch sector without a new fetch). Refuses near-empty JavaScript shells instead of scoring them wrongly. |
| `src/scorer/offer.json` | Packages and care plan from the brief, with per-sector lines. |
| `src/scorer/benchmark.json` | Written by the self-test: our demo sites' scores per sector (the "projected score"). |
| `src/scorer/consent.ts` | The consent text and its version, shared by the page and `/api/lead`. |
| `functions/api/score.ts` | Pages Function: same-origin only, rate limit 12/hour/IP, PSI numbers cached per URL per day. |
| `functions/api/lead.ts` | Pages Function: refuses without consent; stores only URL, score, sector, email, consent record. |
| `src/pages/analisi-sito/index.astro`, `src/scripts/scorer-ui.ts` | The page and the report drawing (text only, never innerHTML). |
| `src/pages/analisi-sito/esempio-fitness.astro` | "Studio Linea", the invented fitness studio demo (our template for the sector). |
| `scripts/scorer/selftest.ts` | Builds the benchmark and fails under 90 (CI: `.github/workflows/focale-scorer.yml`). |
| `scripts/scorer/cli.ts`, `batch.ts` | Terminal tools for Lorenzo. |
| `scripts/scorer/flow-check.ts` | Browser check of the page with the API answered by the real engine. |

## Sectors

`fitness`, `ospitalita`, `ristorazione`, `edilizia`, `salute`, `bellezza`, `professionisti`,
`immobiliare`, `negozio`, `eventi`, and `altro` (any other business: only universal checks).
Each totals exactly 100: common block (speed 20, Google and local 15, trust 10, accessibility 8,
legal 10, clarity 5) plus a 32-point block for what that sector's visitors need (booking, menu,
quote, portfolio, rooms and English, listings...). Flags (0 points): P.IVA everywhere; CIN for
hospitality; allergens for restaurants; health data in forms (health, fitness, beauty); promotions
in health advertising; energy class for real estate. Tests check every profile sums to 100.

Projected score per sector (benchmark): fitness = Studio Linea demo, edilizia = Arcadi demo,
eventi = Villa Ortensia demo. Other sectors show no number ("non ti diamo un numero inventato")
until we build and measure a demo for them. Casa Turati 3 (real, hospitality) lives in another repo
and is not in the benchmark yet.

## Determinism and honesty

- Same HTML + same speed data + same sector = same report (tested).
- Speed: real-user data when Google has it (28 days, stable), otherwise one lab run read in wide
  bands. The speed numbers are cached per URL per day in KV, so a second run the same day matches.
- A check that could not be measured is "non misurato" and the total is the share of measured points
  (the report says it is partial).
- No reward for gaming: hidden text is ignored, repeating a keyword adds nothing (tested per sector).
- The scorer never claims legal compliance: cookies are "banner when needed", legal points are flags.

## Setup on Cloudflare Pages (Lorenzo)

Settings > Functions:
1. KV namespace binding `SCORER_KV` (create a namespace, e.g. `focus-scorer`). Without it the rate
   limit is per instance (weaker) and `/api/lead` answers 503 (the page then points to WhatsApp).
2. Secret `PSI_KEY`: a PageSpeed Insights API key (Google Cloud console, "PageSpeed Insights API",
   free quota). Without it Google often answers 429 and reports come out partial (no speed).
3. Optional secret `WEB3FORMS_KEY` to get an email for each request.
4. Plan: HTML parsing can exceed the Workers free plan's 10 ms CPU on big pages. If analyses fail
   with CPU errors, switch to Workers Paid (5 $/month).

Reading the requests: `npx wrangler kv key list --binding SCORER_KV --prefix lead:` then
`npx wrangler kv key get --binding SCORER_KV "<key>"`. Each request is kept 365 days, then KV
deletes it. Write in the privacy notice (iubenda) that this page collects URL, score, email and
consent for the free preview, kept 12 months.

## Privacy and security

- Stored: rate-limit counters (hashed IP, 1 hour), speed numbers per URL per day (2 days), and for
  requests only URL, score, sector, email and consent (time, text, version). Never page content.
- Reports are private: nothing is published, there is no ranking, no "X studios scored lower".
- `/api/*` answers only same-origin POSTs; CSP `connect-src 'self'` already covers it.
- No third-party request on page load (no Turnstile, no fonts or maps from others).

## Running it

```
npm test                         # 96 unit tests
npm run build && npm run preview # then, in another terminal:
npm run scorer:selftest          # our sites >= 90, rewrites benchmark.json
npx tsx scripts/scorer/flow-check.ts
PSI_KEY=... npm run scorer -- studio.it --settore fitness
PSI_KEY=... npm run scorer:batch -- prospects/studi-milano-esempio.txt
```

`prospects/` is git-ignored: results about other businesses stay on Lorenzo's computer.
Without `PSI_KEY` the CLI and the batch measure speed with Lighthouse on the same computer (Chrome
must be installed), so they work with no setup. In the batch, a social profile instead of a site is
reported as "NESSUN SITO PROPRIO": for prospecting that is a finding, not an error.

`npx tsx scripts/scorer/e2e-local.ts <local server> <public url> [sector]` runs the whole real
pipeline (HTTP fetch, redirects, reading, Lighthouse, scoring) on a site served locally under its
public address. `npx wrangler pages dev dist --kv SCORER_KV` runs the Functions in Cloudflare's own
runtime (checked on 21 Nov 2026: same-origin, private and social refusals, consent, KV storage).

### First real site: Casa Turati 3 (21 Nov 2026)

Our real client site (other repo, built locally) scored **84/100** as hospitality, recognised on
its own, real CIN found. Lost points: lab LCP 4,3 s (-7), phone number not tappable (-2), no
WhatsApp (-2), no direct-booking perk (-2), reviews mentioned but not linked (-2,5), description
too long (-1). P.IVA flag: a private host with one apartment may not have one. Under our own rule
(>= 90) it needs those fixes; it is not in the benchmark and nothing was changed in the client's
repo without Lorenzo.

## Phase 3 (real Milan sites): not run here

This build environment cannot reach outside sites (DNS and proxy blocked) and PSI answers 429
without a key. The batch command above, with the list in `prospects/studi-milano-esempio.txt`
(11 studios found during research), is ready to run on Lorenzo's computer.
Checks most likely to be noisy or unfair on real sites, to review first:
- `info.prices`: any "€" counts (also a share capital in the footer).
- `trust.team`: words like "team" or "staff" are common in menus.
- `conv.early`: some themes build the menu with JavaScript, so header links are not in the HTML.
- `legal.cookie`: a consent tool loaded through Google Tag Manager is invisible to us.
- `local.address`: the street pattern can miss unusual addresses or catch a random "via".
- Sector guess: pages that talk about several things (hotel with spa, gym with physiotherapy).
- Speed: lab runs differ between machines (CI vs PSI); bands are wide but borderline sites can move.

## Open decisions for Lorenzo

- Prices: the brief says 600 / 900 / 1.200 € + Cura 39 €/month; `/prezzi/` says 390 / 690 / 1.190 €
  and CLAUDE.md says "no monthly plan". The scorer follows the brief. Align them.
- Package contents in `offer.json` are adapted from `src/lib/plans.ts`: confirm them.
- `reports/Requisiti siti per settore.md` proposes 30 rubric changes (e.g. P.IVA as points with
  "not applicable" for private hosts, privacy only when there is a form, new checks). The clear bugs
  it found are fixed; the reweightings are left to you.
- Legal texts to verify on Normattiva (listed in that report); a lawyer should confirm the flags.
- The page is linked from the footer only, until the price conflict is solved.
