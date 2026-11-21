# Universal baseline for any small Italian local business website ("Altro" fallback category) + cross-sector Italian legal minimum

Research date: 2026-11-21. **Network note:** in this session these hosts could NOT be fetched (DNS blocked): brocardi.it, istat.it, web.dev (garanteprivacy.it, developer.chrome.com, brightlocal.com were also blocked in an earlier session, see `../Website Scorer studi fitness Milano/fattibilita-tecnica-legale.md`). developers.google.com WAS fetched directly. Everything else comes from **search-result summaries (snippet-level)** and is marked as such. Items marked **[BK]** are background knowledge not verified with a source this session: treat as "to verify" before publishing. Legal points must be re-checked on Normattiva / Gazzetta Ufficiale / gpdp.it before they go into user-facing copy.

---

## 1) What every visitor needs (sector-independent)

### Takeaway
Across 10+ years of surveys the answer is stable: visitors of a local business site want **contact details, opening hours, address/directions, what the business does (products/services), and prices**, plus **proof** (reviews). Accuracy matters as much as presence: outdated contact info actively deters. Almost all hard data is US/UK consumer surveys; no equivalent Italian dataset on visitor needs was found.

### Cited Findings
- Google/Ipsos/Purchased "Understanding Consumers' Local Search Behavior" (May 2014): the most common local searches on smartphones were **business hours (54%), directions (53%), address (50%)**; 18% of local smartphone searches led to a purchase within a day vs 7% of non-local ones; Google advised featuring address, directions, phone and click-to-call, especially on mobile. OLD (2014), snippet-level — [Google Ads blog 2014](https://adwords.googleblog.com/2014/05/new-research-location-extends-relevance.html); [Think with Google](https://thinkwithgoogle.com/advertising-channels/search/how-advertisers-can-extend-their-relevance-with-search); [Search Engine Land](https://searchengineland.com/research-56-percent-go-searches-carry-local-intent-190655)
- UK and German follow-ups (2015): business hours were the most searched item across all UK verticals; in Germany address and directions led for retail verticals. There is also an **Italy-specific Click-to-Call report (2014)** from Think with Google (not opened) — [UK 2015 PDF](https://www.thinkwithgoogle.com/_qs/documents/2915/Google_Local_Search_Behavior_UK_2015_1.pdf); [DE PDF](https://www.thinkwithgoogle.com/_qs/documents/4135/Report_Google_Local_Search_Behavior_DE_1.pdf); [Click to Call Italy 2014](https://www.thinkwithgoogle.com/_qs/documents/2819/Click-to-Call-Italy-Report_2014.pdf)
- BrightLocal 2014–2016 "what consumers want from local business websites": top single items were product/service list, **price list, phone number, physical address, opening hours** (each ~10–12% as top pick in a "pick up to 3" question); 18–34s rank opening hours first; men are more put off by missing phone or prices. Snippet-level, old — [BrightLocal 2014](https://www.brightlocal.com/research/what-local-consumers-want-most-from-local-business-websites/); [BrightLocal 2016 gender/age](https://www.brightlocal.com/research/gender-age-what-consumers-want-from-local-business-websites/); [MarketingCharts](https://www.marketingcharts.com/wp/online/most-important-info-to-display-on-local-biz-websites-according-to-consumers-39761/)
- BrightLocal "Consumer Search Behavior" 2025: **contact information and opening hours ranked #1, 85% "important"** (secondary summary, not verified on the primary page) — [BrightLocal consumer search behavior](https://www.brightlocal.com/research/consumer-search-behavior-decisions/)
- 56% of US consumers expect the business website to have the most accurate contact information; 50% would be deterred if contact information on the website was out of date — [YouGov](https://yougov.com/articles/23435-56-us-consumers-expect-local-business-websites-hav); [BrightLocal local business websites](https://brightlocal.com/research/local-business-websites/)
- Vistaprint 2017 (1,818 US consumers): 49.7% say outdated contact info leaves a bad impression; 28.9% consider a site outdated if not updated for >6 months (vendor, old) — [MarketingProfs](https://www.marketingprofs.com/charts/2017/31952/the-biggest-mistakes-small-businesses-make-with-their-websites)
- BrightLocal Local Consumer Review Survey **2026** (published 11 Feb 2026, 1,002 US adults): **97% read reviews** for local businesses; **visiting the business website is the most common step after a positive review (54%)**; Google 71% as review source; AI tools used for local recommendations reportedly rose from 6% (2025) to 45% (secondary, treat with caution); 74% care only about reviews from the last 3 months and 47% won't use a business with <20 reviews (secondary summary) — [BrightLocal LCRS](https://www.brightlocal.com/research/local-consumer-review-survey/); [PinMeTo summary](https://www.pinmeto.com/news/brightlocal-local-consumer-review-survey-2026/); [DesignRush](https://news.designrush.com/small-business-website-after-good-review)
- Hosting Advice 2024 (500 US consumers, vendor): 75% skipped an online purchase because of an outdated/unprofessional-looking website; 92% feel more confident when the site runs smoothly — [Hosting Advice](https://www.hostingadvice.com/studies/smb-websites-survey/)
- Italy, Istat "Imprese e ICT – Anno 2025" (15 Dec 2025): "sito web" replaced "use of two social media" as one of the 12 Digital Intensity Index indicators in 2025; the large-vs-SME digital gap widened from ~20 pts (2023) to 25 (2024) to 37 (2025) (overall digital technologies, not website only). Exact % of firms with a website NOT retrieved (istat.it blocked) — [Istat comunicato](https://www.istat.it/comunicato-stampa/imprese-e-ict-anno-2025/); [Statreport ICT2025](https://www.key4biz.it/wp-content/uploads/2025/12/Statreport_ICT2025.pdf)

### Inferences
- The universal "first five" for the Altro category: **(1) how to contact (tap-to-call/email/WhatsApp/form), (2) what you do, (3) where (address + directions link), (4) when (hours or "su appuntamento"), (5) proof (reviews/real photos)**. Prices are high on consumer wish-lists but are sector-sensitive (see §5), so they should be a low-weight bonus in Altro, not a penalty.
- Because 54% go to the website *after* reading a positive review (LCRS 2026), the website's job for a generic local business is mainly confirmation + contact, which justifies putting contactability and NAP above design/SEO in the weights.
- Accuracy cannot be checked from HTML alone; the scorer can only check presence and internal consistency (same phone in header/footer/schema; see §2 NAP).

### Gaps
- No Italian visitor-needs survey found (no Osservatorio Politecnico / Istat data on what visitors look for; Osservatorio results not surfaced by search). Istat's ICT survey covers enterprises with **≥10 employees** [BK], so most micro local businesses are outside it.
- NNGroup and Baymard pages on small-business/contact info were not retrieved this session.
- Google/Ipsos local study has not been repeated publicly since 2014–2016 as far as found; recent figures are BrightLocal (US).

---

## 2) Universal checks ranked by impact (evidence, detectability, detection signals)

### Takeaway
A fair Altro grade should weight **contactability, clarity of offer, location/hours and mobile usability** highest (strongest consumer evidence), then **speed and HTTPS** (Google standards, correlational conversion evidence), then **Italian legal presence** (binary, high consequence), then trust/freshness and technical SEO. All of these are detectable from the homepage HTML plus the PSI/Lighthouse response.

### Cited Findings (supporting evidence for the checks)
- Core Web Vitals "good" thresholds at the **75th percentile**: **LCP ≤2.5 s (poor >4.0 s), INP ≤200 ms (poor >500 ms), CLS ≤0.1 (poor >0.25)**; a page passes when all three meet "good" at p75 — [web.dev thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds) (snippet-level; web.dev blocked)
- "Milliseconds make millions" (Deloitte Ireland + Fifty-Five, **commissioned by Google**): 37 European/US brand sites, >30M sessions; a **0.1 s improvement** across four speed metrics was associated with **+8.4% retail conversions, +9.2% retail AOV, +10.1% travel conversions**. It is an observational, correlational study of large brands, not SMBs — [web.dev case study](https://web.dev/case-studies/milliseconds-make-millions); [Deloitte](https://www2.deloitte.com/ie/en/pages/consulting/articles/milliseconds-make-millions.html)
- Lighthouse performance score = weighted metrics (TBT 30%, LCP 25%, CLS 25%, FCP 10%, SI 10%); Lighthouse 13 is in PSI since 20 Oct 2025; lab scores vary between runs; Google says CrUX field data will be removed from the PSI API (no date) — see [previous notes, fattibilita-tecnica-legale.md](../Website%20Scorer%20studi%20fitness%20Milano/fattibilita-tecnica-legale.md) citing [PSI Get Started](https://developers.google.com/speed/docs/insights/v5/get-started) and [PSI release notes](https://developers.google.com/speed/docs/insights/release_notes)
- Google LocalBusiness structured data (fetched): **required `name`, `address` (PostalAddress)**; recommended `telephone` (with country code), `url` (must work), `openingHoursSpecification` (dayOfWeek, opens/closes hh:mm:ss, validFrom/validThrough for seasonal closures), `geo` (≥5 decimals), `priceRange` (<100 chars), `menu`, `servesCuisine`, `department`; `aggregateRating`/`review` **only for sites that capture reviews about *other* businesses** (self-serving reviews not eligible); use the **most specific subtype**; `additionalType` not supported; LocalBusiness is a subtype of Organization — [Google Search Central, LocalBusiness](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- Generic graders weight roughly Performance 30 / SEO 30 / Mobile 30 / Security 10 (HubSpot, medium-low confidence) and are sector-agnostic; local auditors score listing completeness/consistency and reviews instead — [previous notes, graders-esistenti.md](../Website%20Scorer%20studi%20fitness%20Milano/graders-esistenti.md)

### Proposed Altro rubric (weights = judgment informed by the evidence above; not empirically derived)

| # | Check (IT label) | Weight | Evidence strength | Detectable from | Detection signals |
|---|---|---|---|---|---|
| 1 | **Contattabilità** (telefono cliccabile, email, WhatsApp o modulo) | 16 | High (Google/Ipsos 2014; BrightLocal 2014–2025; YouGov) | HTML | `a[href^="tel:"]`, `a[href^="mailto:"]`, `wa.me/` or `api.whatsapp.com`, `<form>`; Italian phone regex `(\+39\s?)?0\d{1,4}[\s.]?\d{4,8}` / `3\d{2}[\s.]?\d{6,7}`; bonus if a contact CTA is in the first viewport (needs render/screenshot or DOM position heuristic) |
| 2 | **Cosa fai, chiaro** (servizio + città nel titolo/H1) | 10 | Medium-high (product/service list top item in BrightLocal) | HTML | `<title>` and first `<h1>` non-empty, not "Home"/"Benvenuti"; contains a city/comune name (match against ISTAT comuni list) and a noun that is not the business name only |
| 3 | **Dove** (indirizzo testuale + link mappa) | 10 | High (address/directions 50–53% Google/Ipsos) | HTML | address regex `(via|viale|piazza|corso|largo|vicolo|strada)\s+[^\n,]{2,40},?\s*\d{0,4}`, CAP `\b\d{5}\b`; link to `google.com/maps`, `maps.app.goo.gl`, `goo.gl/maps`, `maps.apple.com`, `openstreetmap.org`; note: an iframe embed of Google Maps counts for "where" but is a third-party request (see §3) |
| 4 | **Quando** (orari o "su appuntamento") | 6 | High (hours 54%; LCRS/BrightLocal 2025 #1) | HTML | day names `lun|mar|mer|gio|ven|sab|dom` + time pattern `\d{1,2}[:.]\d{2}`; or text "su appuntamento"/"orari"; schema `openingHoursSpecification` |
| 5 | **Mobile** (viewport, testo leggibile, layout) | 10 | High (local searches are mobile-first) | HTML + PSI | `<meta name="viewport" content="width=device-width…">`; Lighthouse audits `viewport`, `font-size` (SEO), content-width; mobile strategy PSI run |
| 6 | **Velocità** (CWV) | 10 | Medium (Google standard; conversion link is correlational, brand-scale) | PSI | Field CWV p75 from `loadingExperience`/CrUX API when present; otherwise Lighthouse lab LCP/CLS/TBT in coarse buckets (good / needs improvement / poor), never raw 0–100 |
| 7 | **HTTPS** | 8 | High as baseline (browser "Non sicuro" warning) [BK for ranking-signal history] | HTTP probe + PSI | `http://` → 301 to `https://`; valid certificate; Lighthouse `is-on-https` (also flags mixed content) |
| 8 | **Obblighi legali** (P.IVA in home, privacy, cookie) | 15 (7+4+4) | Legal (binary) | HTML + PSI network log | see §3 (P.IVA regex + check digit; `privacy`/`cookie` links in footer; trackers loaded before consent) |
| 9 | **Prove di fiducia** (recensioni, foto reali, chi siamo) | 5 | High for reviews (97% read, LCRS 2026) but weakly detectable | HTML | links to Google reviews (`g.page/r/`, `search.google.com/local/writereview`, `maps` place URLs), Trustpilot/TripAdvisor widgets, words "recensioni/dicono di noi"; `<img>` count with non-stock filenames; "chi siamo" link |
| 10 | **Sito curato / aggiornato** | 5 | Medium (Vistaprint, Hosting Advice — vendor) | HTML | see §4 neglect signals (negative points) |
| 11 | **SEO tecnico di base** (title, meta description, schema LocalBusiness, lang) | 5 | Medium (Google docs) | HTML + PSI | `<meta name="description">`, `<html lang="it">`, JSON-LD `@type` ∈ LocalBusiness subtypes with `name`+`address`; Lighthouse SEO audits (`document-title`, `meta-description`, `http-status-code`, `is-crawlable`) |
| | **Totale** | **100** | | | |

- **NAP consistency (in-page):** normalise phone numbers (strip spaces, `+39`) and compare header/footer/`tel:`/JSON-LD `telephone`; compare JSON-LD `address` with visible address. Mismatch = small penalty. Comparison with **Google Business Profile** requires the Places API (paid per call) and fuzzy matching → keep optional/off by default (see §6).

### Inferences
- Honest claim on speed: "Siti più lenti perdono visitatori; Google considera le Core Web Vitals un riferimento" — do **not** claim "+8% conversioni per voi": the Deloitte figure is correlational, Google-commissioned and measured on big retail/travel brands.
- CrUX field data will often be **missing** for tiny local sites (not enough Chrome traffic) [BK]; the scorer must fall back to lab data and say so ("dati di laboratorio, possono variare").
- Weight of HTTPS is set lower than contactability because nearly all modern hosting gives HTTPS by default; its absence is mostly a neglect signal.
- Lighthouse 13 restructured many performance audits into "insights" [BK, check audit IDs against the live response]: do not hard-code audit IDs without testing against a real PSI v5 response.

### Gaps
- No study found linking speed to **lead-gen / phone-call** conversions for small local businesses; the Deloitte lead-gen breakdown (if any) was not retrievable (web.dev blocked).
- The widely quoted Google/SOASTA "53% of mobile visits are abandoned after 3 s" (2016–2017) was not re-verified; treat as outdated/unsafe to quote.
- Google's page-experience documentation (that good CWV do not guarantee ranking; relevance dominates) was not fetched this session [BK].

---

## 3) Italian legal minimum on a website (cross-sector)

### Takeaway
Four checks are cross-sector and automatable: **(a) P.IVA in homepage** (any VAT-registered business, even a showcase site), **(b) company data for società** (sede, registro imprese/REA, capitale versato, socio unico, "in liquidazione") per art. 2250 c.c., **(c) privacy notice** (GDPR art. 13, mandatory as soon as there is a form/email collection), **(d) cookie compliance** (banner with equal-prominence reject only if non-technical cookies/trackers are used; scrolling ≠ consent; cookie wall unlawful). **Accessibility (EAA)** is not a legal check for most showcase sites of micro-enterprises. PEC on the website is good practice but **no source found making it a website-display obligation**.

### Cited Findings
**(a) P.IVA**
- Art. 35 c.1 DPR 633/1972 (as amended in 2001): every VAT holder with a website related to its activity must show the P.IVA on the **homepage**, even if the site is purely promotional; confirmed by Agenzia delle Entrate **Risoluzione 60/E del 16/05/2006** — [FiscoeTasse](https://www.fiscoetasse.com/normativa-prassi/1004-partita-iva-sito-web.html); [Filodiritto](https://www.filodiritto.com/indicazione-numero-partita-iva-nel-sito-web-articolo-35-comma-1-del-dprn-633-del-1972); [Diritto.it](https://www.diritto.it/l-indicazione-della-partita-iva-sul-sito-web-e-obbligatoria/) (snippet-level)
- Sanction reported as **€258.23–€2,065.83** (art. 11 D.Lgs. 471/1997; some sources round to €250–2,000); Agenzia Entrate offices (e.g. Liguria) have issued fines — [Il Commercialista Online](https://www.ilcommercialistaonline.it/?p=11260); [Punto Informatico](https://www.punto-informatico.it/niente-piva-in-home-page-multato/); [PMI.it](https://www.pmi.it/?p=179483). Sources disagree on the exact legal basis of the sanction.
- **Change in 2027:** the new **Testo unico IVA, D.Lgs. 19 gennaio 2026 n. 10** (GU n. 24 del 30/01/2026, S.O. n. 4) is in force but **applies from 1 January 2027**; it reorganises DPR 633/72 (171 articles; sanctions moved to a separate testo unico). A search summary says its **art. 68** derives from art. 35 DPR 633/72 — not verified on the text — [ItaliaOggi](https://www.italiaoggi.it/diritto-e-fisco/testo-unico-iva-in-gazzetta-ufficiale-in-vigore-dal-2027-a5ymcktw); [InformazioneFiscale](https://www.informazionefiscale.it/testo-unico-iva-dlgs-10-2026-analisi-novita); [Wolters Kluwer](https://www.wolterskluwer.com/it-it/expert-insights/nuovo-testo-unico-iva-2026)
- Applies also to ASD with P.IVA — [PMI.it ASD](https://www.pmi.it/impresa/normativa/esperto/143885/sito-web-asd-regole.html) (via previous notes)

**(b) Company data (società only)**
- Art. 2250 c.c.: in acts and correspondence, companies subject to Registro Imprese registration must state **sede, ufficio del registro and numero d'iscrizione**; SpA/SApA/Srl the **capitale effettivamente versato** (from last balance sheet); whether **in liquidazione**; SpA/Srl whether they have a **socio unico**. A later comma requires companies that have "uno spazio elettronico destinato alla comunicazione collegato ad una rete telematica ad accesso pubblico" (i.e. a website; Cass. n. 6194/2011 cited) to provide these same data through it — [Brocardi art. 2250 (snippet)](https://brocardi.it/codice-civile/libro-quinto/titolo-v/capo-i/art2250.html); [MioLegale](https://miolegale.it/codici/codice-civile/art-2250/); [PMI.it](https://www.pmi.it/?p=51780). Exact wording of the website comma not verified on Normattiva.
- PEC: companies must register a PEC in the Registro Imprese via Comunicazione unica — [search summary, Registro Imprese circolare](https://www.registroimprese.it/documents/20195/4621042/Circolare_6_maggio_2016.pdf/e35f239f-d191-4d02-90dd-fef50f9509d3). No source found requiring PEC **on the website** under art. 2250.

**(c)–(d) Privacy and cookies (Garante)**
- Garante "Linee guida cookie e altri strumenti di tracciamento", **provvedimento n. 231 del 10 giugno 2021**, GU n. 163 del 9/7/2021, compliance deadline 6 months (fully applicable from **10 January 2022**) — [Garante docweb 9677876](https://www.garanteprivacy.it/home/docweb/-/docweb-display/print/9677876); [iubenda summary](https://www.iubenda.com/it/help/31253) (snippet-level; gpdp.it not fetched)
- **Scrolling is not consent**; **cookie wall unlawful** unless an equivalent service is offered without consent (case-by-case); refusing must be as easy as accepting: an "X" closing the banner (= reject) or a "Rifiuta/Continua senza accettare" button with equal graphic prominence — [Garante docweb 9677876](https://www.garanteprivacy.it/home/docweb/-/docweb-display/print/9677876); [Legiscope](https://www.legiscope.com/blog/cookie-linee-guida-garante.html); [Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/italian-garante-publishes-updated-guidelines-on-cookies-and-other-tracking-technologies)

**Accessibility (EAA)**
- D.Lgs. 82/2022 (transposing Dir. 2019/882): **microenterprises providing services are exempt** from service accessibility requirements; microenterprise = **<10 persons and annual turnover or balance sheet total ≤ €2M** (art. 2(1)(bb)); the exemption covers services, not products; applicable from **28 June 2025**; AGID Linee guida on accessibility of services (art. 21) published, current version reported March 2026 — [AGID news 11/03/2026](https://www.agid.gov.it/index.php/it/notizie/european-accessibility-act-eaa-pubblicate-le-linee-guida-agid-sullaccessibilita-dei-servizi); [Portolano Cavallo](https://portolano.it/newsletter/portolano-cavallo-inform-digital-ip/italy-transposes-european-accessibility-act-directive-ue-2019882); [CCPC microenterprise guidelines](https://ccpc.ie/business/?p=51685)
- The EAA's website scope is e-commerce/consumer services (selling or booking online); a pure showcase site is generally considered outside the core obligation, but commentators disagree — [Agenda Digitale](https://www.agendadigitale.eu/?p=231278); [iubenda EAA guide](https://www.iubenda.com/it/help/179096-eaa-compliance/)

### Inferences (with detection signals)
- **P.IVA check (7 pts):** regex `(P\.?\s?IVA|Partita\s+IVA|VAT|C\.F\.\s*e\s*P\.IVA)\D{0,15}(IT)?\s?(\d{11})` on homepage text; validate the 11-digit Luhn-type check digit to cut false positives. Not found → "P.IVA non trovata in home page" (it may be in an image or another page: say "non trovata", not "manca"). Also applies to professionals and ditte individuali.
- **Company data (conditional, inside the 7 legal pts or a separate N/A-able check):** trigger only if the text contains `S\.?r\.?l\.?|S\.?p\.?A\.?|S\.?r\.?l\.?s|S\.?a\.?s\.?|S\.?n\.?c\.?|società`; then look for `REA|R\.E\.A\.|[A-Z]{2}\s?-\s?\d{5,7}`, `capitale sociale|cap\. soc\.` with `i\.v\.|interamente versato|€`, `socio unico|unipersonale` (cannot know if it *should* be there: report as info, not fail), `sede legale`. Ditta individuale / professionista → N/A.
- **Privacy (4 pts):** link with text/href matching `privacy|informativa|trattamento dei dati` in footer. Hard fail only if a `<form>` (or `mailto:`/newsletter input) exists and no privacy link exists (GDPR art. 13 [BK]). If no form and no trackers, missing privacy = small penalty.
- **Cookie (4 pts, conditional):** use the PSI/Lighthouse network requests (Lighthouse loads the page **without any consent**). If requests go to known trackers at load (`google-analytics.com`, `googletagmanager.com/gtag`, `connect.facebook.net`, `analytics.tiktok.com`, `static.hotjar.com`, `bat.bing.com`, `doubleclick.net`) → "tracciamento prima del consenso" (fail). If trackers exist and a CMP is present (`cdn.iubenda.com`, `consent.cookiebot.com`, `cdn.cookielaw.org`, `cdn-cookieyes.com`, `cmplz`) → pass on presence; "reject button equal prominence" cannot be verified reliably without rendering (flag as manual). If **no** non-technical cookies/trackers → banner **not** required (Garante: technical cookies need only the informativa [BK on exact wording]) → pass; do NOT penalise the absence of a banner.
- **Third-party requests at load** (Google Fonts `fonts.googleapis.com`/`fonts.gstatic.com`, Maps embed, YouTube iframe, reCAPTCHA): report as "richieste a terzi" info/small penalty, not a legal fail: no Italian ruling found (the German LG München I, 20/01/2022 on Google Fonts is [BK], not Italian law).
- **Accessibility:** score as usability (Lighthouse accessibility category, `lang`, image `alt`, contrast) with neutral wording; never say "illegale" for a micro showcase site. If an online shop/booking with payment is detected *and* the business is not micro (unknown to the scorer), add only an informational note.
- **Regulated professions** (avvocati, notai, commercialisti, medici, architetti…): D.Lgs. 70/2003 art. 7 [BK] requires, for information-society service providers, name, address, contact email, REA, P.IVA and for regulated professions the **ordine/albo, titolo professionale e Stato**. Detect profession keywords → suggest "iscrizione all'Ordine/Albo" as a soft check. Whether a showcase site is an "information society service" is debated → soft check only.

### Gaps
- Exact text of art. 2250 c.c. website comma (added by L. 88/2009 [BK]) and the sanction for breaching it: not verified on Normattiva (brocardi.it blocked).
- Which article of D.Lgs. 10/2026 will carry the homepage P.IVA rule from 1/1/2027, and whether the sanction reference moves to the testo unico sanzioni (D.Lgs. 173/2024 [BK]): not verified. Scorer copy should cite "obbligo di legge (art. 35 DPR 633/72; dal 2027 Testo unico IVA)" only after checking.
- Garante cookie guidelines full text (6-month re-proposal rule, analytics cookies assimilated to technical cookies with IP masking and no cross-referencing [BK], Google Analytics provvedimento 2022 and EU-US DPF 2023 [BK]) not fetched (gpdp.it blocked).
- GDPR form wording (checkbox vs informativa link; legal basis art. 6.1.b for answering a request [BK]): no authoritative Italian source fetched.

---

## 4) Neglect signals (detectable, negative points in "Sito curato / aggiornato")

### Takeaway
Neglect is detectable mostly from cheap HTML/HTTP signals. Consumer surveys (vendor-run) support that "outdated" impressions cost trust, but **no source specifically measured the footer copyright year**; use it as a light signal, combined with stronger ones.

### Cited Findings
- 28.9% of consumers consider a small business site outdated if not updated in >6 months; 49.7% dislike outdated contact info (Vistaprint 2017, vendor) — [MarketingProfs](https://www.marketingprofs.com/charts/2017/31952/the-biggest-mistakes-small-businesses-make-with-their-websites)
- 75% skipped a purchase due to outdated/unprofessional site (Hosting Advice 2024, vendor) — [Hosting Advice](https://www.hostingadvice.com/studies/smb-websites-survey/)
- "Inaccurate or stale content" and an old fixed-width desktop layout are listed as typical signs of an outdated site (agency checklists, opinion) — [Sikich](https://www.sikich.com/insight/6-signs-your-company-website-is-out-of-date/); [UENI](https://ueni.com/blog/signs-business-needs-new-website/)
- Lighthouse `is-on-https` and `viewport` audits are part of PSI — [previous notes](../Website%20Scorer%20studi%20fitness%20Milano/fattibilita-tecnica-legale.md)

### Inferences (signal → detection → suggested severity)
- **Solo http / certificato scaduto** → no 301 to https, TLS error → strong.
- **No viewport meta** (desktop-only site) → absent `meta[name=viewport]` → strong.
- **"Sito in costruzione"** → regex `sito in costruzione|under construction|coming soon|lavori in corso|stiamo lavorando` on a near-empty page (<150 words) → strong (likely cap the total grade).
- **Default CMS placeholders** → `Just another WordPress site|Un nuovo sito WordPress|Hello world!|Ciao mondo!|Lorem ipsum|Sample Page|Pagina di esempio` → strong.
- **Flash** → `<embed|object` with `.swf` or `application/x-shockwave-flash` (Flash EOL 31/12/2020 [BK]) → strong.
- **Old CMS via generator meta** → `<meta name="generator" content="WordPress X.Y">` (compare with current major), `Joomla! 1.5/2.5/3.x` (Joomla 3 EOL Aug 2023 [BK]), old Drupal 7 (EOL Jan 2025 [BK]) → medium. Absent generator ≠ up-to-date.
- **Old jQuery** → `jquery[.-]?(1\.|2\.|3\.[0-4]\.)` in script src or `jQuery.fn.jquery` (<3.5 has known XSS CVEs [BK]) → medium. Lighthouse's old "vulnerable libraries" audit may no longer exist in v13 [BK].
- **Copyright year** → `(©|&copy;|copyright)\s*(\d{4})(\s*[-–]\s*(\d{4}))?`; take the latest year; ≤ current year − 2 → light (many sites never update it; and JS-generated years read fine).
- **Missing favicon** → no `link[rel~=icon]` and `/favicon.ico` 404 → light.
- **Broken links** → HEAD-check internal links on homepage (cap ~20) for 4xx/5xx; Lighthouse `http-status-code` for the page itself → medium if >10% broken.
- **Mixed content / console errors** → Lighthouse best-practices audits (`is-on-https` mixed content, `errors-in-console`) → light.
- **Layout fossils** → `<frameset>`, `<marquee>`, `<font>`, table-based layout (`<table` with many nested tables and no `<main>/<header>`) → light.
- **Instagram-only / no own site** → submitted URL host is `instagram.com`, `facebook.com`, `linktr.ee`, `business.site` (Google Business Profile websites were shut down in 2024 [BK]) → do not score as a website; return "nessun sito proprio" with a dedicated message.
- **Unreachable / parked domain** → DNS fail, 5xx, or parking page signatures (`sedo`, `This domain is for sale`, `dominio in vendita`) → grade not computed.

### Gaps
- No evidence on how much a stale copyright year specifically affects trust; no Italian data on neglected SMB sites.
- Current EOL dates for WordPress branches (WordPress officially supports only the latest branch, security backports to older ones [BK]) need checking on wordpress.org before use in copy.

---

## 5) Checks that are unfair across sectors (keep out of Altro, or make conditional)

### Takeaway
Anything tied to a business model (booking, e-commerce, price lists, menus, reviews widgets, WhatsApp, social feeds) is unfair in a generic category. Generic graders avoid the issue by being sector-agnostic (performance/SEO/mobile/security only); vertical value comes from sector-specific checks. The fair pattern for Altro: **score only universal checks, mark conditional checks "non applicabile" and re-normalise weights** instead of failing them.

### Cited Findings
- Generic graders (HubSpot, PSI/Lighthouse, GTmetrix) use the same categories for every site; no two tools agree on categories or weights; vertical tools exist only from vendors (e.g. salon/fitness platforms) — [previous notes, graders-esistenti.md](../Website%20Scorer%20studi%20fitness%20Milano/graders-esistenti.md)
- Google's own LocalBusiness guidance varies by type: `menu`/`servesCuisine` only for food establishments; `aggregateRating`/`review` not for self-serving reviews — [Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- Men are more put off by missing prices (BrightLocal 2016), but price display is a consumer preference, not a universal requirement — [BrightLocal 2016](https://www.brightlocal.com/research/gender-age-what-consumers-want-from-local-business-websites/)

### Inferences
Unfair in Altro (do not penalise; at most show as "idea" if detected sector makes it relevant):
- **Prenotazione online** — unfair for notai, avvocati, commercialisti, artigiani su preventivo, B2B, negozi senza appuntamento.
- **Prezzi/listino** — unfair for professions where fees depend on the case, for building trades (preventivo), and sensitive in health (rules on sanitary advertising [BK]). Treat as bonus only.
- **E-commerce / pagamenti online** — model-dependent.
- **Orari fissi** — appointment-only professionals: accept "su appuntamento" as pass.
- **Indirizzo fisico** — service-area businesses (idraulici, imprese a domicilio) may legitimately hide it; accept "zona servita" + sede legale (società must show sede anyway under art. 2250).
- **Recensioni sul sito / testimonianze** — some professions have deontological limits on testimonials/advertising (e.g. forensic and medical codes [BK]); count only as bonus.
- **WhatsApp, Instagram feed, chat** — channel preference, not quality.
- **Menu, galleria lavori, team page** — sector-specific (ristoranti, artigiani, studi).
- **Lighthouse "SEO 100" or "Performance 90+"** — not a fair hard target for anyone; use bands.
- Fairness mechanism: Lighthouse itself excludes not-applicable audits from category scores [BK]; mirror this — each check returns `pass | fail | n/a`, and the final score = Σ(weight×pass)/Σ(weight of applicable checks).

### Gaps
- No public documentation found of a grader that adapts weights by sector; Yext/BrightLocal/Semrush local audit sector handling not researched this session.

---

## 6) Open doubts

### Takeaway
The biggest uncertainties are legal citations that change in 2027, unverifiable Garante details (site blocked), and the lack of Italian/SMB-specific evidence on visitor needs and speed.

### Cited Findings
- Testo unico IVA applies from 1/1/2027; homepage P.IVA rule's new article number unconfirmed — [Fiscal Focus](https://www.fiscal-focus.it/news-24/ore-09-43-testo-unico-iva-pubblicazione-in-gu-attesa-in-settimana-efficacia-dal-1deg-gennaio-2027,3,181148); [PMI.it roadmap](https://www.pmi.it/impresa/contabilita-e-fisco/486921/nuovo-testo-unico-iva-transizione-2027.html)
- PSI may drop CrUX field data (no date) → field CWV source must move to CrUX API — [PSI Get Started](https://developers.google.com/speed/docs/insights/v5/get-started)
- AI tools for local recommendations reportedly jumped to 45% (BrightLocal-related page, secondary, not verified) — [Digital Applied](https://www.digitalapplied.com/blog/online-review-statistics-2026-consumer-trust-data); [BrightLocal LCRS](https://www.brightlocal.com/research/local-consumer-review-survey/)

### Inferences / doubts to resolve
1. **PEC in footer:** the project's CLAUDE.md lists PEC among footer data; no source found making PEC display a legal duty under art. 2250. Keep as best practice in our own sites, but the scorer should not fail a site for missing PEC.
2. **Art. 2250 scope:** applies to società only, not to ditte individuali/professionisti; the scorer cannot know the legal form except from text ("S.r.l." etc.) → conditional check, wording "se sei una società…".
3. **"Socio unico"**: cannot be verified from outside (needs visura) → informational only.
4. **Cookie banner equal-prominence reject**: needs rendering/clicking; HTML+PSI only gives CMP presence and pre-consent trackers.
5. **GBP/NAP consistency**: requires Places API (cost, ToS on storing data) and fuzzy matching; also GBP "inconsistent NAP hurts ranking" is mostly SEO-industry lore, not found in Google docs this session (Google's LocalBusiness doc says nothing on GBP matching — [Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/local-business)).
6. **Weights** are judgment calls; validate by grading a sample of ~30 real Altro sites by hand and checking rank agreement.
7. **AI visibility** (schema, clear NAP text) may matter more as AI-driven local discovery grows, but evidence is a single secondary figure.
8. **EAA**: microenterprise exemption depends on headcount/turnover, which the scorer cannot see; only informational wording is safe.
9. Hosts to allow for verification: gpdp.it/garanteprivacy.it, normattiva.it, brocardi.it, istat.it, web.dev, brightlocal.com, agenziaentrate.gov.it.

### Gaps
- Primary-text verification of: art. 2250 c.c. website comma; Risoluzione 60/E/2006; Garante 10/06/2021 text; D.Lgs. 82/2022 art. 2; D.Lgs. 70/2003 art. 7; Istat 2025 website percentages. All pending network access.
