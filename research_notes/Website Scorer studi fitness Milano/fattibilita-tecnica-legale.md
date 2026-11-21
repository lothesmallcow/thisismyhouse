# Fattibilità tecnica e legale – Website Scorer (Cloudflare Pages Functions/Workers)

Research date: 2026-11-21. Network note: in this session developers.cloudflare.com, developer.chrome.com, garanteprivacy.it and cheatsheetseries.owasp.org could NOT be fetched (DNS blocked). Those items rely on search-result snippets and are marked "unverified – check primary page". developers.google.com was fetched directly.

## 1. PageSpeed Insights API v5, Lighthouse variability, repeatability

### Takeaway
PSI v5 is usable from a Worker (one GET, returns Lighthouse lab + CrUX field blocks), but Google itself warns that CrUX data will be removed from PSI and lab scores vary between runs. Field data from the CrUX API first, lab score only in coarse buckets, cached per URL per day.

### Cited Findings
- The key goes in as the query parameter `key=yourAPIKey`. The Get Started page does not mention an `X-Goog-Api-Key` header. Its sample request runs without a key. — [PSI Get Started](https://developers.google.com/speed/docs/insights/v5/get-started)
- The response holds `lighthouseResult` (categories/performance score, audits, Lighthouse version, fetchTime, run warnings), `loadingExperience` (CrUX for the URL) and `originLoadingExperience` (CrUX for the origin), plus `captchaResult` and `analysisUTCTimestamp`. — [PSI Get Started](https://developers.google.com/speed/docs/insights/v5/get-started)
- Google states: "We plan to discontinue including real-world data from the Chrome User Experience Report in this API". It recommends the CrUX API or CrUX History API instead. No date is given. — [PSI Get Started](https://developers.google.com/speed/docs/insights/v5/get-started)
- Release notes: Lighthouse 13.0 in PSI/API since 20 Oct 2025. CPU throttling was recalibrated on 5 Dec 2024 (mobile TBT goes up). Lighthouse 12.0 arrived on 10 May 2024 with breaking API changes (PWA category removed). There are no 2024–2026 notes on quota changes. — [PSI Release Notes](https://developers.google.com/speed/docs/insights/release_notes)
- Quota: third-party sources commonly cite 25,000 queries/day and 400 per 100 s per project. They disagree on per-user and per-minute values (for example 240/min, 60/100 s/user), so check them in the Cloud Console quotas page. — [Unlighthouse](https://unlighthouse.dev/learn-lighthouse/pagespeed-insights-api/rate-limits); [Google Groups](https://groups.google.com/g/pagespeed-insights-discuss/c/dB7hWmGAGsw)
- Lighthouse variability doc. Sources with high impact: page nondeterminism (ads, A/B tests), local network, client hardware, resource contention. Medium impact: tier-1 network, browser nondeterminism. Low impact: web server. Google recommends aggregating several runs (median, p90 or min); a 5-run median is "twice as stable" as one run. It gives no numeric variance range. Hosted labs (PSI/WebPageTest) are suggested when you can't control the environment. — [Lighthouse variability](https://developers.google.com/web/tools/lighthouse/variability)
- The CrUX API does not run Lighthouse, so it is faster. Google's codelab says PSI and the CrUX API return identical Core Web Vitals field data. — [Codelab PSI+CrUX](https://developers.google.com/codelabs/chrome-web-vitals-psi-crux?hl=en)

### Inferences
- Repeatable recipe: (1) CrUX API origin/URL p75 LCP/INP/CLS mapped to Google's good / needs-improvement / poor buckets. (2) If CrUX has no data, run PSI mobile and use the performance score only in 3 bands (for example ≥90 / 50–89 / <50), never raw points. (3) Cache the result per normalized URL + date in KV/D1 and show the cached value on repeat requests. (4) Store `lighthouseVersion` + `fetchTime` in the report.
- Latency: PSI runs a full Lighthouse load, typically tens of seconds (no official number found). Run it in `ctx.waitUntil`/Queue, or have the client poll, not inside a synchronous request.
- Display terms: I found no PSI-specific display or attribution term. The generic Google APIs Terms of Service apply (not fetched). Saying "dati Google PageSpeed Insights / CrUX, data X" is prudent. [lawyer/ToS check]

### Gaps
- Whether the `X-Goog-Api-Key` header works on PSI v5 (standard for Google APIs, but not documented on the PSI page). Test it empirically.
- Official PSI quota page and official PSI latency figures.
- Date when CrUX data is removed from PSI.

## 2. CrUX availability for small sites; CrUX API vs PSI

### Takeaway
Most small Milan gym sites will probably have no CrUX data at URL level, and many not even at origin level. Treat "no field data" as a neutral state, not a penalty.

### Cited Findings
- The CrUX API returns an error (404 NOT_FOUND) when there's no data for an origin or URL. Insufficient samples is one cause. — [CrUX API guide (web.dev)](https://web.dev/chrome-ux-report-api)
- Small sites with few monthly visitors may not appear. Google does not publish the threshold. A Google engineer said the "bottom bucket" of sites drops in and out of the dataset. Origin and URL lookups can differ (URL data present while origin data is absent, and vice versa). — [chrome-ux-report group](https://groups.google.com/a/chromium.org/g/chrome-ux-report/c/WELnLKkUHD0); [group thread](https://groups.google.com/a/chromium.org/g/chrome-ux-report/c/oFM-NNyrIuw)

### Inferences
- Query the origin first, then the URL. Score field data only when it's present, and normalize the score over the checks that were actually available.

### Gaps
- CrUX API quota (commonly reported as 150 queries/min, unverified: developer.chrome.com was blocked).

## 3. Plain HTML fetch vs headless rendering; "CTA above the fold" heuristics

### Takeaway
A plain `fetch()` of the HTML is enough for most link and markup checks on WordPress, Squarespace and Webflow (server-rendered). Wix and pure JS apps may be incomplete. Browser Rendering's free tier (10 min/day) is too small for a public tool. Leave "above the fold" out of the deterministic rubric, or put it behind rendering on a paid plan.

### Cited Findings
- Browser Rendering free plan: 10 browser-minutes/day (429 until the next UTC day), 3 concurrent browsers. Paid: 10 browser-hours/month and 10 concurrent included, then $0.09 per browser-hour and $2.00 per extra concurrent browser. Pricing is per Cloudflare's 2025-07-28 changelog. Paid concurrency is listed as 30 on older pages and 200 on newer ones. The product is being renamed "Browser Run". REST API rate limit on paid went from 180 to 600 req/min. — [CF BR limits](https://developers.cloudflare.com/browser-rendering/limits/); [CF BR pricing changelog 2025-07-28](https://developers.cloudflare.com/changelog/2025-07-28-br-pricing/) (snippets only, unverified)

### Inferences
- Without rendering, "CTA above the fold on mobile" can only be approximated, for example a booking/tel/wa.me link inside the first `<header>`/hero section, or within the first N KB of `<body>`. CSS, sticky bars, carousels and JS-injected widgets make this unreliable. Report it as "Pulsante di prenotazione nell'intestazione" (rilevato / non rilevato), not as "above the fold". Rendering at 390×844 with Browser Rendering could check the bounding box, at about $0.09/h. It is cheap per site but needs a paid Workers plan.
- Wix HTML often holds content in JSON islands. Searching the raw HTML for href patterns usually still finds links, but this is not verified here.

### Gaps
- Measured share of Milan fitness sites per builder, and how complete their non-rendered HTML is (needs a sample test).

## 4. Cookie banners / CMP detection and Garante 10 June 2021

### Takeaway
CMP presence can be detected deterministically from script hosts and markup. Whether a banner is compliant (reject button, X = reject, no pre-consent cookies) needs rendering + interaction and remains a legal judgement. The rubric should say "CMP rilevata: sì/no (quale)", not "conforme".

### Cited Findings
- Garante "Linee guida cookie e altri strumenti di tracciamento" of 10 June 2021 (GU n. 163, 9 July 2021, doc. web 9677876). Scrolling does not count as consent. Cookie walls are banned except in particular cases. The banner must link to the cookie policy and the preferences area. The guidelines apply from January 2022. Sources report that the consent request may be repeated no sooner than 6 months. The Garante still cites these guidelines in its decisions (for example the 4 June 2025 provvedimento). — [Garante doc 9677876](https://www.garanteprivacy.it/home/docweb/-/docweb-display/print/9677876); [Punto Informatico](https://www.punto-informatico.it/garante-privacy-vietati-scrolling-cookie-wall/); [Provv. 4/6/2025](https://www.garanteprivacy.it/home/docweb/-/docweb-display/print/10152729) (snippets; primary text not fetched)
- Automated tools (Consentcrawl) use headless Playwright to compare scripts and cookies before and after consent, and detect 25+ CMPs via CSS selectors. Research tools (Cookiescanner) compare banner detection methods. — [Consentcrawl](https://github.com/Liscor/consentcrawl); [Cookiescanner arXiv 2309.06196](https://ar5iv.labs.arxiv.org/html/2309.06196)

### Inferences
- Signature list (from background knowledge, verify against vendor docs): iubenda `cdn.iubenda.com` / `_iub`; Cookiebot `consent.cookiebot.com`; OneTrust `cdn.cookielaw.org` / `otSDKStub`; CookieYes `cdn-cookieyes.com`; Complianz `cmplz` classes / `complianz` plugin path.
- Commonly reported Garante points (X closes the banner = reject; "accetta" and "rifiuta" must have equal prominence) could not be read in the primary text in this session. [lawyer/verify]

### Gaps
- Exact Garante wording on the X command (snippets ambiguous); primary text blocked.

## 5. Detectability of content signals (schema, GBP, reviews, tel/wa.me, booking, privacy, HTTPS, P.IVA)

### Takeaway
All of these are string or DOM checks on the fetched HTML, so they are deterministic and fine for the rubric, with known false negatives when content is JS-injected or shown as an image.

### Cited Findings
- Since 2001, anyone with a P.IVA and a website for their business must show the P.IVA on the home page (art. 35 c.1 DPR 633/72, as amended by DPR 404/2001). Reported fines are €258–2,065; sources disagree, so verify. This also applies to ASDs with a P.IVA. — [Fiscomania](https://fiscomania.com/indicazioni-obbligatorie-siti-web); [PMI.it ASD](https://www.pmi.it/impresa/normativa/esperto/143885/sito-web-asd-regole.html)
- Art. 2250 c.c.: SpA/Srl must state sede, registro imprese, capitale and the fact of a "socio unico" in acts and correspondence. Commentary extends this to the website. — [Brocardi art. 2250](https://www.brocardi.it/codice-civile/libro-quinto/titolo-v/capo-i/art2250.html); [PMI.it](https://www.pmi.it/?p=65859)

### Inferences
- P.IVA regex: `\b(?:IT)?\d{11}\b` near "P.IVA|Partita IVA|VAT". Validate with the Luhn-like check digit to reduce false positives. A missing match does not prove a legal breach (it may be shown in an image or on another page). Wording: "P.IVA non trovata in home page".
- JSON-LD: parse `<script type="application/ld+json">` and check `@type` ∈ {LocalBusiness, ExerciseGym, SportsActivityLocation, HealthClub}. Microdata can be checked as a fallback.
- Links: `href^="tel:"`, `wa.me/`/`api.whatsapp.com`, `g.page`/`maps.app.goo.gl`/`google.com/maps`, booking hosts (mindbodyonline, sportclubby, gymdesk, glofox, teamup, momence), privacy link text "privacy|cookie". Hostnames for these platforms are not verified here.
- HTTPS: final URL scheme + HTTP→HTTPS redirect + no mixed `http://` src. Check the certificate implicitly through a successful fetch.

### Gaps
- Official booking-platform embed domains; review-widget signatures (Trustindex, Elfsight, etc.) not researched.

## 6. SSRF, Workers fetch behaviour, limits, rate limiting

### Takeaway
Workers run on Cloudflare's edge, not inside a private network, so classic metadata/RFC1918 SSRF is less severe. Still validate scheme/host/port/IP, follow redirects manually with re-validation, and cap size and time. Rate-limit per IP with the Rate Limiting binding plus Turnstile.

### Cited Findings
- Rate Limiting binding: `period` must be 10 or 60 s. The limit is per key **per Cloudflare location** (not global). Cloudflare's example uses 100/min. Described as open beta. — [CF rate-limit binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) (snippet)
- Workers Free: 100,000 requests/day (reset at 00:00 UTC), 10 ms CPU per invocation. — [CF Workers limits](https://developers.cloudflare.com/workers/platform/limits/index.md) (snippet)
- Fetching Cloudflare IPs directly gives error 1003. Workers' known-issues page has a "Fetch to IP addresses" section. Same-zone Worker-to-Worker fetch is governed by the `global_fetch_strictly_public` flag (error 1042). — [Error 1003](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1003); [Known issues](https://developers.cloudflare.com/workers/platform/known-issues/) (snippets)

### Inferences
- Implementation: accept only `http(s)`, ports 80/443, no userinfo, a hostname with a public TLD (reject IP literals, `localhost`, `.local`, `.internal`). Resolve via DoH (`1.1.1.1/dns-query`) and reject private/reserved v4/v6 (10/8, 172.16/12, 192.168/16, 127/8, 169.254/16, 100.64/10, ::1, fc00::/7, fe80::/10, ::ffff:mapped). Use `redirect: "manual"` with ≤5 hops, re-validating each `Location`. Use an AbortController timeout (about 8–10 s) and read the body as a stream, capping at about 2–3 MB. DoH plus fetch is not atomic (DNS-rebinding TOCTOU), which is acceptable given the edge has no private network. These are OWASP-style principles from background knowledge; the cheat sheet was not fetched.
- Free-plan 10 ms CPU is tight for HTML parsing of large pages. HTMLRewriter (streaming) or the Workers Paid plan (USD 5/month, unverified) is advisable.
- Turnstile (free, no Google) before every analysis, plus a binding limit of about 5 analyses/10 min per IP and per target URL, plus the per-URL daily cache (also avoids hammering third-party sites).

### Gaps
- Current subrequest limits (historically 50 per invocation on Free) and Turnstile pricing: not verified.

## 7. Lead form legal (GDPR, Garante), storing third-party URL/score, public comparison

### Takeaway
Marketing email needs a separate, unticked, specific consent. Store proof of consent. Don't publish rankings of named businesses without legal advice. [lawyer for all of section 7]

### Cited Findings
- Garante's consolidated line: marketing consent must be informed, specific, explicit, and not pre-ticked or set by default (2013 spam guidelines). It must be separate per purpose, and third-party transfer needs its own consent. Making acceptance of the privacy notice mandatory does not count as marketing consent (2017 newsletter decision). — [DirittoBancario](https://www.dirittobancario.it/?p=106574); [Garante 21/9/2017](https://garanteprivacy.it/garante/doc.jsp?ID=7221917); [Diritto.it Verisure](https://www.diritto.it/?p=243204)
- A 2026 Garante measure on email tracking pixels sets 29 October 2026 as the deadline to update notices, consents and revocation systems. Commentary disputes whether it needs one box or two. — [search snippet, Garante docweb 10201989](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/10201989) [verify]
- Comparative statements: unfair competition by denigration (art. 2598 n.2/n.3 c.c.). Comparative advertising (D.lgs. 145/2007) is lawful only if truthful and based on relevant, verifiable, representative criteria. Only competitors and their associations have standing (art. 2601). — [Brocardi art. 2598](https://www.brocardi.it/codice-civile/libro-quinto/titolo-x/capo-i/sezione-ii/art2598.html); [Il Sole 24 Ore](https://ntplusfisco.ilsole24ore.com/art/pubblicita-comparativa-denigratoria-se-non-e-veritiera-ADohgHMB)

### Inferences
- Form: email (required), URL analysed, optional name. Marketing checkbox unticked and separate from the request for the report. Store timestamp, IP hash, consent text version/hash, form version, source page. Use double opt-in.
- A URL and score of a business site is not personal data in itself, but a sole trader's name or email on the site can be. Keep only the extracted check results, not the full HTML, and set retention (for example 12 months). Add an informativa via iubenda: the form makes the project's "sito statico senza moduli" exception lapse.
- Since the studio is a competitor (a web agency selling sites), a public "classifica palestre Milano" with scores could be framed as denigration or comparative advertising. Safer: a private report only to whoever requested it, objective pass/fail checks with the method published, no aggregated public ranking of named businesses. [lawyer]

### Gaps
- No case law found on automated website "ratings" of named businesses (AGCM/Cassazione). EDPB 05/2020 consent guidelines were not fetched.

## 8. Same scorer in CI on our own sites

### Takeaway
Run the HTML checks against `npm run preview` (localhost) in CI. Lighthouse CI on localhost uses different hardware and network, so its numbers are not comparable with PSI on the public URL. Use PSI/CrUX only post-deploy.

### Cited Findings
- Google recommends a stable network (for example localhost), dedicated CI hardware (free/burstable CI is "typically volatile") and median-of-runs assertions. — [Lighthouse variability](https://developers.google.com/web/tools/lighthouse/variability)
- The PSI lab environment changed (CPU throttling recalibrated Dec 2024; LH 13 Oct 2025), so scores shift across versions. — [PSI Release Notes](https://developers.google.com/speed/docs/insights/release_notes)

### Inferences
- In CI, assert on deterministic checks (schema, P.IVA, footer, links, image formats) plus LHCI with `numberOfRuns: 5` and budgets on metrics, not the score. Post-deploy, call PSI on the Pages URL. Pitfalls: preview has no CDN/HTTP2/compression parity, `*.pages.dev` previews may send `noindex`, and CrUX will be empty for new sites.

### Gaps
- Lighthouse CI docs not fetched this session.
