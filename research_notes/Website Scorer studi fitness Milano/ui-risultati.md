# UI patterns for score-based result pages (2024-2026): website scorer for fitness studios in Milan

Network note: developer.chrome.com and developer.mozilla.org could not be fetched (blocked in this session), so items from those sites come from search excerpts only. No NN/g or Baymard pages turned up on gauges or result pages. Apple Fitness rings and Spotify Wrapped were not researched with sources (see Gaps).

## How credit-score, fitness-tracker and Lighthouse pages present a score (format, colour bands, context, factors, next actions)

### Takeaway
The products agree on the pattern: one big number on a fixed scale, 3-4 named bands (label plus colour, never colour alone), then a list of contributing factors ranked by impact, each with a plain-language action. Bands are coarse on purpose, and Lighthouse says outright that 100 is not the target.

### Cited Findings
- Lighthouse bands: 0-49 red "Poor", 50-89 orange "Needs Improvement", 90-100 green "Good". Google says a perfect 100 is "extremely challenging to achieve and not expected", and going from 99 to 100 takes about as much metric improvement as going from 90 to 94 — [Chrome Developers, Lighthouse performance scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)
- Oura Readiness bands: 85-100 Optimal, 70-84 Good, 60-69 Fair, 0-59 "Pay attention". The score is built from 9 named "contributors" (sleep, activity balance, HRV, temperature and others) measured against the user's own baseline. An older Oura page lists 7 contributors and a different bottom band, so the sources conflict — [Oura support](https://support.ouraring.com/hc/en-us/articles/360057791533); [Oura blog](https://ouraring.com/blog/readiness-score/)
- WHOOP Recovery: 0-100% in three bands, each tied to an action: green 67-100 (ready for high strain), yellow 34-66 (moderate strain), red 0-33 (rest). It is computed once each morning and stays fixed through the day — [WHOOP Locker](https://whoop.com/thelocker/how-does-whoop-recovery-work-101); [WHOOP developer docs](https://developer.whoop.com/docs/whoop-101)
- Garmin Body Battery: 0-100 in four plain-language bands (0-25 low, 26-50 medium, 51-75 high, 76-100 very high reserve), with the inputs named (HRV, stress, sleep, activity) — [Garmin manual](https://www8.garmin.com/manuals/webhelp/venu/EN-US/GUID-87E1392B-2C55-40B7-A1FF-3AB9252DA0A0.html)
- Credit Karma sorts factors into High, Medium and Low impact (for example utilisation, payment history and derogatory marks as high; account age as medium; hard inquiries as low), so users know what to fix first. Its own pages are not consistent on which factor sits in which tier — [Credit Karma, credit score factors](https://www.creditkarma.com/advice/i/learn-credit-score-factors-story); [Credit Karma, what affects your scores](https://www.creditkarma.com/credit/i/what-affects-your-credit-scores)
- ClearScore gives each band an encouraging label (from "Let's start climbing" for Very poor up to "Soaring high" for Excellent). Experian UK has renamed "Poor/Very Poor" to "Fair/Low" and added a percentage breakdown of factor influence — [ClearScore ZA](https://www.clearscore.com/za/learn/credit-score-and-report/what-is-a-good); [Which?](https://www.which.co.uk/news/article/new-experian-credit-score-shake-up-find-out-what-you-new-score-means-aXDSN2L85TLP)
- CRIF Italia: no official source documents its visual scale. Unofficial guides disagree (1-100 versus bands above 750). CRIF's consumer app is METTINCONTO 365 (Mister Credit) — [Moneyside](https://www.moneyside.app/it/learn/banche/credit-score-crif-come-funziona); [sum.money](https://sum.money/it/score-creditizio/); [App Store](https://apps.apple.com/us/app/id1165414794)
- Gauges and dials are widely criticised for single values: they waste space and show no trend or comparison. Bullet graphs (bar plus band markers plus target) are the usual alternative. Defenders say gauges still read at a glance for a single KPI — [Tableau blog](https://www.tableau.com/es-mx/blog/bullet-graphs-beat-gauge-charts); [Domo](https://www.domo.com/learn/charts/gauge-chart)

### Inferences
- Use a ring or donut for the single overall number, which echoes Lighthouse, Oura and WHOOP. Use horizontal bars with band ticks (a light bullet-graph style) for the categories, because bars compare well and gauges do not.
- Use 3 bands (like Lighthouse and WHOOP), each with an Italian label plus an action ("Da sistemare / Migliorabile / Ottimo"), rather than 5. Fewer bands are easier for non-technical owners to read.
- Borrowing Lighthouse's line "100 is not expected" makes the page more honest and stops a 78 from reading as a failure.

### Gaps
- Exact current visuals of the Credit Karma, Experian and ClearScore dials were not verified. I found no official CRIF UI documentation.

## Motion patterns for result reveals, prefers-reduced-motion and screen readers

### Takeaway
A short ring-fill plus count-up is fine as long as the default is the final state with no motion, animation runs only under `prefers-reduced-motion: no-preference`, and assistive technology hears the final value once.

### Cited Findings
- Chrome's progress-ring guide builds on native `<progress>`, sets a 0 s transition by default and adds the duration only inside `prefers-reduced-motion: no-preference`. If the visible text differs from the number, the same text goes into `aria-valuetext` — [Chrome Developers, Progress ring](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-components/progress-ring)
- For JavaScript count-ups, check `matchMedia('(prefers-reduced-motion: reduce)')` and write the final value straight away. Don't announce every intermediate frame — [SVG animated infographic example](https://intro-web-tech.pages.dev/media/svg/examples/04_animated-infographic.html); [SVG Repo, progress ring](https://www.svgrepo.com/blog/svg-progress-ring-stroke-dasharray/)
- WCAG 2.3.3 Animation from Interactions (AAA): motion triggered by interaction must be possible to disable unless it is essential. Sufficient techniques are C39 (CSS reduced-motion query) and SCR40 (the same check in JS) — [W3C Understanding 2.3.3](https://w3c.github.io/wcag/understanding/animation-from-interactions.html)
- Status updates can use a polite live region (`aria-live="polite"`) so they are announced when the user is idle — [DEV, Lottie accessibility](https://dev.to/fazalshah/lottie-animations-and-accessibility-prefers-reduced-motion-aria-and-best-practices-51fo)

### Inferences
- Reveal order: overall ring (about 800 ms), then category bars staggered by about 80 ms, then the "top fixes" list fading in. Total under 1.5 s, with no reveal gating the content (everything is in the DOM and readable at once).
- A Wrapped-style multi-screen reveal is wrong here: it slows a busy owner down and hides the fixes behind taps (my judgement, not sourced).

### Gaps
- No primary source found for Spotify Wrapped or Apple ring reveal mechanics. Smashing and NN/g articles on result reveals were not retrieved.

## Perception research: anchoring, loss vs gain framing, goal-gradient, endowed progress, shame, red/green

### Takeaway
People push harder when they can see they are close to a goal (goal-gradient), and existing progress motivates (endowed progress). For prevention-type behaviour, gain framing ("points you can gain") does as well as or better than loss framing. Red/green must never carry meaning alone.

### Cited Findings
- Goal-gradient: in a coffee-card field study, time between purchases shrank by about 20% from the first stamp to the last. A 12-stamp card with 2 pre-filled stamps finished faster than a plain 10-stamp card (median about 10 vs 15 days) — [Kivetz, Urminsky & Zheng 2006, JMR (PDF)](https://business.columbia.edu/sites/default/files-efs/pubfiles/1200/goalgradient.pdf)
- Endowed progress: car-wash cards needing 8 washes, versus 10 with 2 pre-stamped. The pre-stamped group completed more and faster. The effect depends on perceived task completion, and the stated reason for the head start moderates it — [Nunes & Drèze 2006 (PDF)](https://msbfile03.usc.edu/digitalmeasures/jnunes/intellcont/Endowed%20Progress%20Effect-1.pdf)
- Framing: a meta-analysis of 93 studies (N=21,656) found gain-framed messages more persuasive for prevention behaviour. For detection behaviour, loss framing helps sometimes but not consistently, and attitudes and intentions barely move either way — [Gallagher & Updegraff 2012](https://link.springer.com/content/pdf/10.1007/s12160-011-9308-7.pdf); [JMIR 2021 meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC8485193/)
- Red-green colour deficiency affects roughly 7-10% of men. WCAG 1.4.1 (Level A) says colour cannot be the only means of conveying information; add text, an icon or a pattern — [A11y Project](https://a11yproject.com/posts/understanding-colourblindness); [Siteimprove](https://www.siteimprove.com/blog/color-blindness-accessibility/)

### Inferences
- The site's real score is honest endowed progress: "Hai già 62 punti su 100", followed by "+18 punti possibili con 3 interventi". That uses goal-gradient without inventing a head start.
- Anchoring: showing the projected score next to the current one anchors expectations, so it must be sober (see the next section).
- Avoid shame: labels like ClearScore's "start climbing" or Experian's "Low" instead of "Very poor" are the industry trend.

### Gaps
- No direct study found on shame versus encouragement in score feedback UIs, or on anchoring in self-assessment tools.

## Accessibility and performance of animated meters

### Takeaway
Use semantic `<meter>` or `role="meter"`, which fits a score better than a progressbar because a score is not task progress. Draw it in SVG or CSS with fixed dimensions, and animate only transform and opacity to keep CLS at 0.

### Cited Findings
- Meter and progress need `aria-valuenow`/min/max, plus `aria-valuetext` for human-readable text such as "62 su 100, migliorabile" — [Compound design system](https://compound.thephoenixgroup.com/latest/components/components/progress-circle/accessibility-CGtrzZDI-CGtrzZDI); [Chrome progress ring](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-components/progress-ring)
- Non-composited animations (those triggering style, layout or paint) can raise CLS. Animating only transform and opacity keeps work on the compositor — [Chrome, non-composited animations](https://developer.chrome.com/docs/lighthouse/performance/non-composited-animations); [Shopify dev docs](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-transform-for-animations)

### Inferences
- Ring fill via `stroke-dashoffset` triggers paint, not layout. It is cheap for a single ring, but bars should animate with `transform: scaleX()` from `transform-origin: left`, which also matches the project rule "transform/opacity only".
- No canvas: SVG stays crisp, can be styled with CSS tokens, and needs no JS for a static render.

### Gaps
- MDN's meter-role page could not be fetched to confirm screen-reader support for `<meter>` across browsers. Test with VoiceOver and NVDA.

## Honest good-better-best and "projected after" comparisons

### Takeaway
Present projections as estimates, as ranges where possible, with each assumption listed. Three tiers steer people to the middle (the compromise effect), so the middle tier must really be the best fit, not a decoy.

### Cited Findings
- Credit Karma calls its simulator "an educational tool... estimated outcomes and not predictions", and its help pages say it "does not predict or guarantee" future scores — [Credit Karma simulator](https://www.creditkarma.com/tools/credit-score-simulator); [Credit Karma help](https://sls-solbiz.zendesk.com/hc/en-us/articles/360045841934)
- Ordering tiers Best-Better-Good instead of Good-Better-Best raised revenue by up to 10% in a controlled experiment, by setting a higher reference point — [INSEAD Knowledge](https://knowledge.insead.edu/marketing/small-change-big-rewards)
- With three options, users tend to pick the middle (compromise effect). Decoys were first formalised by Huber, Payne & Puto (1982). This comes from practitioner summaries — [QUT](https://www.qut.edu.au/insights/business/the-decoy-effect-how-you-are-influenced-to-choose-without-really-knowing-it); [Wikipedia GBB](https://www.wikipedia.com/wiki/Good%E2%80%93better%E2%80%93best)

### Inferences
- Show the projected score as a range ("da 62 a circa 85-90") with a "Perché questa stima" disclosure that lists which fixes each package covers. Tie each tier to specific failed checks so the projected gain can be traced.
- Recommend the tier that matches the detected gaps, even if that is the cheapest one. Keep the order Good-Better-Best (don't use the BBG anchoring trick) to stay honest. All prices are `[TODO]` until the client supplies them.

### Gaps
- No rigorous study found on "projected after" score UIs specifically.

---

## 5-8 adaptable ideas (source, fit, confidence)
1. **Ring plus number plus band label**: an SVG ring with the number at its centre and an Italian label (Ottimo / Migliorabile / Da sistemare), using Lighthouse-style 3 bands and an icon per band. Fit: high. Confidence: high (Lighthouse, WHOOP, WCAG 1.4.1).
2. **"100 non è l'obiettivo" microcopy** next to the score, adapted from Lighthouse's own line. Fit: high for nervous owners. Confidence: high.
3. **Category bars as mini bullet graphs** with band ticks at 50 and 90, animated with `scaleX` and staggered under no-preference. Fit: high. Confidence: medium-high (Tableau/Few, Shopify/Chrome perf).
4. **Fixes ranked by impact, worded as points to gain** ("+8 punti: aggiungi orari e telefono cliccabile"), Credit Karma High/Medium/Low style, top 3 only. Fit: high. Confidence: medium (gain-framing evidence comes from health, not UI).
5. **Endowed-progress headline**: "Hai già 62 punti: ne mancano 28 a Ottimo". Fit: high. Confidence: medium-high (Nunes & Drèze, Kivetz).
6. **Honest projection panel**: current versus projected shown as a range, a "stima, non garanzia" note and per-fix traceability, Credit Karma simulator style. Fit: high. Confidence: high on the honesty pattern.
7. **Accessible reveal**: the final state is rendered in HTML first; `role="meter"` with `aria-valuetext`; count-up only under `prefers-reduced-motion: no-preference`; one polite announcement of the final value. Fit: high. Confidence: high (Chrome progress-ring guide, WCAG 2.3.3).
8. **Good-better-best with the fit-based tier highlighted** ("Consigliato per il tuo sito"), with the reason listed, and no decoy tier. Fit: medium-high. Confidence: medium (practitioner evidence only).
