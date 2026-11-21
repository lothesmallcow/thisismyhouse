# Requisiti siti web – Ristorazione (ristorante, trattoria, pizzeria, bar/caffè, pasticceria/gelateria, enoteca) – Milano/Italia

> Research notes, 21/11/2026. **Method caveat (read first):** in this session the network blocked fetching most primary sources (eur-lex.europa.eu, fipe.it, salute.gov.it, schema.org, pos.toasttab.com, restaurantdive.com, cdn.jsdelivr.net all failed DNS). Only developers.google.com was fetched in full. Everything else comes from **search-result snippets/summaries** and is marked `[snippet]`. For legal facts, the official texts (EUR-Lex for Reg. 1169/2011, Normattiva/Gazzetta Ufficiale for D.Lgs. 231/2017 and DPR 633/72, Garante doc. web 9677876) **must be re-checked before they are turned into rubric rules**. Detection signals (keywords, regexes, URL patterns) are mostly my own engineering inferences and are labeled as such.

---

## 1) Sub-sectors and primary conversion

### Takeaway
The site's job is to send the visitor quickly to one action: **booking** (ristorante/trattoria/enoteca with seating), **phone call or WhatsApp** (trattoria, pizzeria, small places with no booking software), **delivery/takeaway order** (pizzeria, some bars and pasticcerie), or **walking in with directions** (bar/caffè, gelateria, pasticceria). Diners look at the website before they go: survey figures range from 32% "always" (Toast) to 77–85% "visit/usually look" (MGH, TouchBistro), and the menu is what they look for most.

### Cited Findings
- 85% of US diners "always or usually" look up a restaurant's website before dining (TouchBistro 2024 US Diner Trends Report, survey fielded Sept 2023, ±3%) — [TouchBistro American Diner Report 2024](https://www.touchbistro.com/wp-content/uploads/2022/09/American_Diner_Report_2024_Final.pdf) `[snippet]`
- Toast diner survey: 32% always check restaurant websites before visiting, 51% sometimes, 14% rarely, 4% never (the snippet dates it 2026; I could not open the page to confirm date or sample size) — [Toast](https://pos.toasttab.com/blog/on-the-line/restaurant-reviews-and-ratings-data) `[snippet]`
- 77% of diners visit a restaurant's website before dining in or ordering out (MGH, 2019) — [Restaurant Dive](https://www.restaurantdive.com/news/77-of-diners-visit-restaurant-websites-before-going-survey-finds/562008/); [MGH 2019 infographic](https://mma.prnewswire.com/media/967462/1MGH_2019_Restaurant_Infographic.pdf?p=pdf) `[snippet]`
- Of those, 70% had been put off a purchase by the site itself (navigation, readability, menu) — [Tripleseat citing MGH](https://tripleseat.com/blog/4-rules-to-follow-for-digital-restaurant-menus/) `[snippet]`
- "93% of people check online menus before visiting a restaurant", attributed to OpenTable; I only found it quoted secondhand by Popmenu and not the original study — [Popmenu](https://get.popmenu.com/post/every-restaurant-needs-interactive-menu) `[snippet, secondhand]`
- Italy: digital marketing campaigns account for 31% of bookings (Incrementoo survey reported by BeverFood; method not given) — [BeverFood, "Ristorazione 2025: prenotazioni digitali e fidelizzazione"](https://www.beverfood.com/ristorazione-2025-prenotazioni-digitali-e-fidelizzazione/) `[snippet]`
- OpenTable launched in Italy in Dec 2019, starting in Milan with 170+ restaurants — [StartupItalia](https://startupitalia.eu/64992-20191217-opentable-sbarca-in-italia-170-ristoranti-a-milano) `[snippet]`

### Inferences
- Primary conversion by sub-sector (an engineering model, not taken from a source):
  | Sub-sector | Primary conversion | Secondary | Typical homepage CTA (IT) |
  |---|---|---|---|
  | Ristorante / fine dining | Online booking (widget or platform) | Phone, gift card, private events | "Prenota un tavolo", "Prenota ora" |
  | Trattoria / osteria | Phone (often no booking software) | Booking platform, directions | "Chiama", "Prenota al telefono" |
  | Pizzeria | Phone/WhatsApp for takeaway + delivery apps | Booking | "Ordina", "Asporto", "Consegna a domicilio" |
  | Bar / caffè | Walk-in (directions + hours) | Events, aperitivo booking | "Come arrivare", "Orari" |
  | Pasticceria / gelateria | Walk-in + pre-orders (torte su ordinazione) | Phone/WhatsApp, delivery apps | "Ordina la tua torta", "Vieni a trovarci" |
  | Enoteca / wine bar | Booking + walk-in; sometimes e-shop | Events/degustazioni | "Prenota", "Degustazioni", "Shop" |
- Most of the survey evidence is from the US and was produced by software vendors (Toast, TouchBistro, Popmenu, Tripleseat, MGH). Use it to say what matters, not as exact numbers for Milan.

### Gaps
- I found no Italian survey (FIPE, TheFork Italia, Osservatorio) giving the share of Italian diners who check the website vs Google/TheFork/Instagram before choosing. FIPE's site could not be reached.
- No Italian data on phone vs online booking split for small restaurants.

---

## 2) Must-have elements ranked by impact (evidence, detectability, detection signals)

### Takeaway
In order of impact: **(1) menu as HTML text with prices, (2) opening hours as text, (3) one-tap conversion (tel:/booking/order), (4) address + Maps link, (5) fast mobile page, (6) real photos, (7) reviews/social proof, (8) allergen info, (9) legal footer (P.IVA etc.), (10) structured data**. Items 1–4 and 9–10 can mostly be detected from homepage HTML. Speed and photo quality need extra tools.

### Cited Findings
- **PDF menus lose customers:** in a 2023 Popmenu survey of 1,000 US consumers, 49% would go to another restaurant if they hit a PDF menu on mobile (30% in 2021) — [Popmenu industry report](https://get.popmenu.com/toolkit/6-things-diners-wish-restaurant-owners-knew-about-online-ordering) `[snippet, vendor]`
- 41% name a hard-to-read menu as their biggest pet peeve when ordering online, and nearly 1 in 3 leave immediately on a PDF menu — [Popmenu](https://get.popmenu.com/post/every-restaurant-needs-interactive-menu) `[snippet, vendor]`
- **Mobile:** 33% had given up ordering because the site wasn't mobile-friendly (MMR 2019, 1,101 US adults) — [MGH/MMR 2019 infographic](https://mma.prnewswire.com/media/967462/1MGH_2019_Restaurant_Infographic.pdf?p=pdf) `[snippet]`
- **QR/paper menus:** restaurants brought paper menus back after complaints about QR menus, and 45% of customers say they don't want to read a menu via QR — [PYMNTS 2024](https://www.pymnts.com/restaurant-technology/2024/restaurants-reintroduce-paper-menus-amid-customer-complaints-about-qr-codes/); [Audacy](https://www.audacy.com/national/news/45-of-customers-dont-want-to-read-menus-on-a-qr-code); [Toast QR insights](https://pos.toasttab.com/blog/on-the-line/qr-code-menu-insights) `[snippet]`
- **Google** recommends that food businesses provide: `menu` ("the fully-qualified URL of the menu"), `servesCuisine`, `openingHoursSpecification`, `priceRange` (<100 chars), `telephone` ("primary contact method"), `geo` (≥5 decimals), `url`. Only `name` and `address` are required. Use "the most specific LocalBusiness sub-type possible", e.g. `Restaurant` — [Google Search Central, Local Business structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business) (fetched in full)
- **Booking widget:** TheFork's widget is an iframe at `widget.thefork.com/<id>`. The ID is in TheFork Manager > Impostazioni > Integrazioni > Widget di prenotazione, the embed is 100% wide and ≥800px tall with `allow="payment *"`, and `utm_campaign`/`utm_medium` are passed through — [CentralApp help](https://help.centralapp.com/en/articles/12637428-thefork-integration) `[snippet, third party]`
- TheFork also offers a digital menu product (ForkMenu). Italian digital-menu vendors include My Contactless Menu (60 languages, €19.90/month after a 30-day trial) and MenuForma (menu + ordering + delivery) — [Gambero Rosso](https://www.gamberorosso.it/notizie/i-menu-digitali-come-funzionano-e-quali-sono-le-realta-italiane/); [Itinerari nel Gusto](https://www.itinerarinelgusto.it/blog/il-successo-di-menuforma-tra-i-ristoranti-italiani-menu-digitale-ordini-e-consegne-0573) `[snippet; prices may be outdated]`
- **Price display at the venue** (not specifically online): dishes and prices must be stated in writing (since D.Lgs. 84/2000, transposing Dir. 98/6/CE), the menu must be "ben visibile e leggibile" from outside, and *coperto*/*servizio* must appear on the price list — [Studio Cataldi](https://www.studiocataldi.it/articoli/19261-bar-ristoranti-e-mense-il-menu-e-obbligatorio.asp); [consumatori.it e-book](https://www.consumatori.it/wp-content/uploads/2023/01/E-BOOK_RISTORANTI_DEFINITIVO-2.pdf); [Zanichelli](https://online.scuola.zanichelli.it/enogastronomiasala/files/2010/06/diritti-del-cliente.pdf) `[snippet]`

### Inferences – ranked checklist with detection signals (my engineering proposals; keyword lists to be tuned on real samples)

| # | Must-have | Why (evidence) | Auto-detectable from homepage HTML? | Detection signals |
|---|---|---|---|---|
| 1 | **Menu as HTML text, linked from the homepage (not just PDF, image or QR)** | PDF/hard-to-read menu → 30–49% leave (Popmenu); menu is the most-checked item (OpenTable/Popmenu) | **Partial** (homepage + 1 hop to the menu page) | Nav/link text `Menù|Menu|Carta|Il nostro menu|Le pizze|Listino|Carta dei vini|I gusti` (gelateria); bad sign: menu link `href$=".pdf"`, menu inside `<img>` only, links to `menu.*qr`, `mycontactlessmenu`, `issuu.com`, `drive.google.com`; good sign: many dish names with prices in text on the menu page |
| 2 | **Prices on the menu** | Price is decisive for choosing; must already be shown at the venue (D.Lgs. 84/2000) | **Partial** (menu page) | Regex `€\s?\d{1,3}([.,]\d{2})?` or `\d{1,3}[.,]\d{2}\s?€` found ≥N times; `coperto` with an amount |
| 3 | **Opening hours as text, with closing day and holidays** | Hours are a primary pre-visit lookup (Google lists `openingHoursSpecification`) | **Yes** | `Orari|Orario|Aperti|Chiuso|Giorno di chiusura|lun|mar|mer|gio|ven|sab|dom|lunedì…domenica|pranzo|cena|aperitivo|ferie|chiusura estiva`; time regex `\b([01]?\d|2[0-3])[:.][0-5]\d\b`; JSON-LD `openingHoursSpecification`; **check it matches the Google Business Profile** (needs the Places API → "partial") |
| 4 | **One-tap primary CTA above the fold** (booking / call / order) | Conversion; "telephone = primary contact method" (Google) | **Yes** | `href^="tel:"` (+ text `Chiama|Telefona|Prenota al telefono`); `wa.me/`, `api.whatsapp.com/send`; booking vendor domains (section 4); text `Prenota|Prenota un tavolo|Prenotazioni|Riserva`; order text `Ordina|Ordina online|Asporto|Take away|Consegna a domicilio|Delivery` |
| 5 | **Full address + Maps link (directions)** | Walk-in conversion for bar/gelateria | **Yes** | `google.com/maps`, `maps.app.goo.gl`, `goo.gl/maps`, `maps.apple.com`, `waze.com/ul`; text `Come arrivare|Indicazioni|Dove siamo`; Italian address regex `(Via|Viale|Corso|Piazza|P\.za|Largo|Alzaia|Ripa)\s+…\d+,?\s*\d{5}\s+Milano`; negative (per house rule): `<iframe src*="google.com/maps/embed">` |
| 6 | **Fast and usable on mobile** | 33% gave up over a non-mobile site (MMR 2019) | **Partial** | `<meta name="viewport">`; HTML+JS weight; number of third-party scripts; hero image size/format (avif/webp); real score needs Lighthouse/PageSpeed or CrUX |
| 7 | **Real photos of dishes and the venue** | Photos drive choice (vendor claims; no hard number found) | **Partial** | Count of `<img>`/`<picture>`, Italian `alt` text (`piatto|pizza|sala|dehors|bancone|vetrina`); stock image hosts (`unsplash`, `shutterstock`, `istockphoto`) as a negative; quality cannot be detected |
| 8 | **Reviews / social proof** | Reviews strongly shape choice (Toast review data page) | **Partial** | Widgets: `elfsight`, `trustindex`, TheFork rating badge, Tripadvisor `tripadvisor.*/WidgetEmbed`; text `recensioni|dicono di noi|★`; links to Google reviews (`g.page/`, `search.google.com/local/writereview`); **invented reviews are a red flag (house rule)** |
| 9 | **Allergen info / dietary info** | Legal for ordering online (section 3); useful to coeliacs etc. | **Partial** | `allergeni|allergie|intolleranze|Reg\.? (UE|CE) 1169/2011|14 allergeni|senza glutine|gluten free|AIC|vegano|vegetariano|chiedere al personale|informazioni sugli allergeni`; numbered allergen legend on the menu |
| 10 | **Legal footer: P.IVA (+ for companies: ragione sociale, sede, REA, capitale, socio unico, PEC)** | Required by law on the homepage (art. 35 DPR 633/72) | **Yes** | Regex `P\.?\s?IVA|Partita\s+IVA|VAT` + `\b\d{11}\b` (also `IT\d{11}`); `REA|R\.E\.A\.|MI-\d{6,7}`; `Cap(itale)?\.? soc(iale)?`; `socio unico`; `PEC|@pec\.|@legalmail\.` |
| 11 | **Privacy + cookie policy links and a compliant banner (if non-technical cookies are used)** | Garante guidelines 2021 | **Yes** (presence) / **Partial** (compliance) | Links `privacy|informativa|cookie policy`; vendors `cdn.iubenda.com`, `iubenda.com/privacy-policy/`, `consent.cookiebot.com`, `cookie-script.com`, `cdn.cookielaw.org` (OneTrust), `complianz`; third-party trackers loaded before consent (`googletagmanager.com`, `connect.facebook.net`, `google-analytics.com`) = flag |
| 12 | **Structured data JSON-LD with the specific type** | Google recommendation | **Yes** | `<script type="application/ld+json">` with `@type` in {Restaurant, CafeOrCoffeeShop, Bakery, IceCreamShop, BarOrPub, Winery, FastFoodRestaurant}; properties `servesCuisine`, `hasMenu`/`menu`, `acceptsReservations`, `openingHoursSpecification`, `telephone`, `address`, `geo`, `priceRange` |
| 13 | **Delivery / takeaway links (if offered)** | Conversion for pizzeria/pasticceria | **Yes** | Domains in section 4; text `Asporto|Ritiro|Consegna|Ordina su` |
| 14 | **English version (Milan: tourists, Design Week, fairs)** | Inference: Milan has a large international audience | **Yes** | `hreflang="en"`, `/en/` links, `lang` switcher `EN|English` |
| 15 | **Events / private dining / gift cards / pre-orders (cakes)** | Secondary revenue | **Partial** | `eventi|cene private|feste|catering|buono regalo|gift card|torte su ordinazione|ordina la torta|degustazioni` |
| 16 | **Contact form or email** | Fallback channel | **Yes** | `mailto:`, `<form>` (if present → the privacy notice must cover the form) |

- Suggested scoring weights for the rubric (proposal): tier A (25 pts each, about 70% of total): menu HTML+prices, hours, primary CTA, address/maps. Tier B: mobile/speed, photos, reviews. Tier C (gating/compliance, pass/fail): P.IVA, privacy/cookie, allergen statement when online ordering is offered.

### Gaps
- No hard, non-vendor figures on photos and reviews tied to website conversion (rather than to platform listings).
- Could not open the Toast review page for star-rating thresholds or Google-vs-TripAdvisor shares.
- I found no source on how much **consistency between the website and the Google Business Profile** (hours, phone) matters. Google's own Business Profile guidelines were not fetched.

---

## 3) Legal obligations visible online (Italy/EU)

### Takeaway
What applies **for certain**: P.IVA on the homepage (all VAT payers), privacy/cookie rules (GDPR + Garante 2021 guidelines), and the full company identification for società (art. 2250 c.c., *not verified in this session*). Allergens: at the venue, allergen info is mandatory for non-prepacked food (Reg. 1169/2011 art. 9(1)(c) + 44; D.Lgs. 231/2017 art. 19). **If the site takes orders (distance selling)**, the mandatory food info, allergens included, must be available **before the purchase is concluded** (art. 14 Reg. 1169/2011). A simple "showcase" site with a menu but no ordering: I found **no** explicit rule requiring allergen info online, but best practice is an allergen legend or statement. I found **no** law requiring a menu or prices to be published online.

### Cited Findings
**Allergens**
- Reg. (UE) 1169/2011 requires allergen information always, including for non-prepacked foods (art. 9(1)(c) and art. 44) — [Camera di Commercio Torino, Giovannini slides](https://www.lab-to.camcom.it/media/events/attachment/Giovannini_Luca_08112021.pdf); [Assolombarda FAQ Reg. 1169/2011](https://assolombarda.it/governance/gruppi/turistico/informazioni/faq-su-regolamento-1169-2011) `[snippet]`
- **Distance selling (art. 14):** "Nel caso della vendita a distanza devono essere disponibili, prima della conclusione dell'acquisto, tutte le indicazioni obbligatorie, ad eccezione del termine minimo di conservazione" (lot and TMC/expiry at delivery). Recital 27: mandatory info should be available before purchase. Art. 14 applies to B2C only — [CCIAA Genova guide](https://www.ge.camcom.gov.it/it/tutela/etichettatura/sportello-etichettatura-e-sicurezza-alimentare-1/materiale/guida_genova.pdf); [CCIAA Torino slides](https://www.lab-to.camcom.it/media/events/attachment/Rossella_Gallio_09112022.pdf); [legislation.gov.uk art. 14 (retained EU text)](https://legislation.gov.uk/eur/2011/1169/article/14/data.pdf) `[snippet]`
- Practical guidance for webshops: a link to all mandatory allergen data for each ingredient — [WKO (Austrian chamber), Italian-language allergen info](https://www.wko.at/tourismus-freizeitwirtschaft/gastronomie/allergeninfos-italienisch) `[snippet, not Italian authority]`
- EU Commission Notice of 13/7/2017 on allergen info for non-prepacked foods — [copy on CCIAA Verona](https://vr.camcom.gov.it/sites/default/files/uploads/normativa/Comunicazione%20Commissione%20UE%2013_7_2017.pdf) (not read; title only)
- **D.Lgs. 15/12/2017 n. 231, art. 19** covers foods offered unpackaged to the final consumer or to collectivities. A sign (*cartello*) or equivalent must show at least the name of the food and the ingredient list, with allergens — [informaimpresa](https://www.informaimpresa.it/?p=40494); [text on CCIAA Verona](https://vr.camcom.gov.it/sites/default/files/uploads/normativa/DLGS%20231_2017.pdf); [MIPAAF-ICQRF note 10/5/2018](https://www.alimenti-salute.it/doc/2018.05.10_Nota_MIPAAF_ICQRF_Chiarimenti_applicazione_su_D.Lgs_231_2017.pdf) `[snippet]`
- Sanctions: omitting allergen info carries €3,000–24,000; other non-prepacked violations €1,000–8,000. D.Lgs. 231/2017 also sanctions breaches of the art. 14 distance-selling rules — [FIPE "allergici sanzioni"](https://fipe.it/wp-content/uploads/2021/12/allergici_sanzioni_web.pdf); [CCIAA Torino](https://www.lab-to.camcom.it/media/events/attachment/Cristina_Gariglio_09112022.pdf) `[snippet; sources not fully consistent, verify on Normattiva]`
- **Ministero della Salute note DGISAN n. 3674 of 6/2/2015** (ristorazione): info may be given "direttamente e per iscritto" via menu, blackboards or signs. A sign may say that full allergen documentation is available on request from staff. "Può contenere…" is only for cases where cross-contamination can't be ruled out — [Regione Puglia presentation](https://sanita.puglia.it/documents/20182/26606334/Allegato+B+_Presentazione+regionale+Allergici+o+Intolleranti/b8f83cd9-0218-4517-a91f-c6c9b09b183f); [Il Fatto Alimentare](https://ilfattoalimentare.it/allergeni-cartello-unico-bar-mense-ristoranti.html) `[snippet]`. One commentator says the circolare carried no sanctions of its own (later D.Lgs. 231/2017 added them) — [Il Fatto Alimentare](https://ilfattoalimentare.it/allergeni-ristoranti-dario-dongo.html) `[snippet]`

**P.IVA**
- Art. 35 c.1 DPR 633/1972 (as amended by DPR 404/2001): the VAT number must be shown "nella home page dell'eventuale sito web". Agenzia Entrate Ris. 60/E of 16/5/2006 applies this to all VAT payers, even for purely promotional sites. It must be visible on the homepage, not only on inner pages — [Brocardi art. 35](https://www.brocardi.it/testo-unico-iva/titolo-ii/art35.html); [FiscoeTasse](https://www.fiscoetasse.com/normativa-prassi/1004-partita-iva-sito-web.html); [diritto.it](https://www.diritto.it/l-indicazione-della-partita-iva-sul-sito-web-e-obbligatoria/) `[snippet]`
- Sanction €250–2,000 (art. 11 D.Lgs. 471/1997) — [Fiscomania](https://fiscomania.com/indicazioni-obbligatorie-siti-web); [PMI.it](https://www.pmi.it/?p=179483) `[snippet; amounts may have changed with the 2024 sanctions reform – verify]`

**Cookies/privacy**
- Garante "Linee guida cookie e altri strumenti di tracciamento", 10/6/2021, published in GU n. 163 of 9/7/2021, with 6 months to comply. The banner needs a reject option ("X" = continue without cookies, which must be the default). Scrolling is not consent. Cookie walls are banned (with exceptions). The choice can't be asked again for 6 months. Technical cookies need no consent (art. 122 Codice Privacy) — [Garante doc. web 9677876](https://www.garanteprivacy.it/home/docweb/-/docweb-display/print/9677876); [iubenda summary](https://www.iubenda.com/it/help/31253); [Punto Informatico](https://www.punto-informatico.it/garante-privacy-vietati-scrolling-cookie-wall/) `[snippet]`

**Prices**
- Price display at the venue (menu outside, coperto/servizio listed) comes from national law (D.Lgs. 84/2000), with regional rules for pubblici esercizi (Lombardia: L.R. 6/2010 Testo unico commercio). I did **not** find the specific price-display article — [Regione Lombardia pubblici esercizi](https://www.regione.lombardia.it/attivita-produttive-imprese/commercio/pubblici-esercizi); [L.R. 6/2010 text](https://www.bosettiegatti.eu/INFO/norme/lombardia/2010_006_L_commercio.htm) `[snippet]`

### Inferences
- Rubric rule: **P.IVA on homepage = hard legal fail if missing** (detectable).
- Rubric rule: **online ordering present (own system) → allergen info must be reachable before checkout**; if missing, flag "legal risk". Orders that go through Deliveroo/Glovo/Just Eat/Uber Eats happen on the platform, so the platform page carries the duty, not the restaurant site (my reading of art. 14; verify).
- Rubric rule: **showcase site with an online menu** → recommend an allergen legend (14 allergens numbered) or the statement "Per informazioni su allergeni e intolleranze rivolgersi al personale" (wording modeled on the 2015 note's "on request" option). Score as best practice, not a legal fail.
- Showing prices online is not mandated, but if shown they should match the in-store list, including coperto (to avoid misleading-practice issues under the Codice del Consumo; not researched).
- Companies (srl/snc etc.): art. 2250 c.c. adds ragione sociale, sede, REA, capitale sociale (versato), socio unico. Not verified this session; it matches the project's existing footer rule.

### Gaps
- Exact text of Reg. 1169/2011 art. 14(2) (my recollection: for non-prepacked foods sold at a distance, the art. 44 particulars, allergens included, must be available per art. 14(1)) — **verify on EUR-Lex** (host blocked).
- Whether Italy's national rules under art. 44 (D.Lgs. 231/2017 art. 19) explicitly cover delivery/asporto by restaurants via their own website — no authoritative answer found.
- Current amount of the P.IVA sanction after D.Lgs. 87/2024 (sanctions reform) — not checked.
- European Accessibility Act (D.Lgs. 82/2022, in force for e-commerce services from 28/6/2025) and its micro-enterprise exemption: not researched this session. Possibly relevant only for restaurants with their own online ordering.
- Any Milan municipal rule on online menus: none found.

---

## 4) Platform detection list (booking, delivery, ordering, menus)

### Takeaway
Detect by **link/iframe/script domains** on the homepage. Patterns marked "verified" were seen in a source. The others are commonly seen patterns that **must be checked against live sites** before use.

### Cited Findings
- TheFork: iframe `https://widget.thefork.com/<restaurantId>` — [CentralApp](https://help.centralapp.com/en/articles/12637428-thefork-integration); WordPress plugin "TheFork Widgets" (shortcode, floating button) — [wordpress.org](https://wordpress.org/plugins/thefork-widgets/) `[snippet]`
- CoverManager: SDK `https://sdk.covermanager.com/v1/sdk.min.js`, booking iframe on `bookings.covermanager.com` (CoverManager T; CoverManager K uses another plugin) — [WordPress plugin "CoverManager T Reservation Widget"](https://wordpress.org/plugins/?p=377981) `[snippet]`
- Quandoo: has an embeddable responsive booking widget (script domain not shown) — [Quandoo](https://restaurants.quandoo.com/en-gb/solutions/restaurant-booking-widget) `[snippet]`
- GoTable: `gotable.app/widget/<id>/floating.js|inline.js` — [GoTable widget API](https://www.gotable.app/developer/widget-api) `[snippet]`
- Formitable: embed script loading `formitable-sdk` — [Formitable](https://formitable.com/en/developers/widget/) `[snippet]`
- OpenTable reservations need an OpenTable Restaurant ID (GoDaddy integration) — [GoDaddy IT](https://www.godaddy.com/it/help/add-restaurant-reservation-with-opentable-27247) `[snippet]`
- Uber Eats store URLs: `ubereats.com/store/<slug>/<id>` (verified on US examples) — [Uber Eats example](https://www.ubereats.com/store/milanos-pizzeria/_QlER73MTamBJMStnAAyLw)
- Just Eat (UK) store URLs: `just-eat.co.uk/restaurants-<slug>/menu` (Italy is assumed to follow the same pattern on justeat.it) — [Just Eat UK example](https://www.just-eat.co.uk/restaurants-milano-bl6/menu)
- Other Italian tools: TeamSystem Reservations, Tableo, Eat App, Digiristo (booking/management); My Contactless Menu, ForkMenu, MenuForma (digital menu/ordering); Wix Restaurants (built-in ordering + booking) — [Gambero Rosso](https://www.gamberorosso.it/notizie/i-menu-digitali-come-funzionano-e-quali-sono-le-realta-italiane/); [TeamSystem](https://www.teamsystem.com/magazine/horeca/gestione-prenotazioni-ristorante/); [Capterra Tableo](https://www.capterra.it/software/1032685/tableo); [Capterra Digiristo](https://www.capterra.it/software/1083254/Digiristo); [Wix](https://support.wix.com/it/article/wix-restaurants-una-panoramica) `[snippet]`

### Inferences – detection table (✔ = pattern seen in a source above; ? = from general knowledge, verify on live sites)
| Category | Vendor | Patterns to match in href/src |
|---|---|---|
| Booking | TheFork / LaFourchette | ✔ `widget.thefork.com`; ? `thefork.it/ristorante/`, `module.lafourchette.com`, `lafourchette.com` |
| Booking | CoverManager | ✔ `sdk.covermanager.com`, `bookings.covermanager.com`; ? `covermanager.com/reserve/` |
| Booking | Quandoo | ? `quandoo.it/place/`, `booking-widget.quandoo.com` |
| Booking | OpenTable | ? `opentable.it/r/`, `opentable.com/widget/reservation/loader`, `rid=` |
| Booking | GoTable | ✔ `gotable.app/widget/` |
| Booking | Formitable | ✔ `formitable` (sdk) |
| Booking | Plateform | ? `plateform.app` / `plateform.it` (domain **not confirmed**) |
| Booking | Resy | ? `widgets.resy.com`, `resy.com/cities/` |
| Booking | SevenRooms | ? `sevenrooms.com/reservations/`, `sevenrooms.com/widget` |
| Booking | Tableo / Eat App / TeamSystem | ? `tableo.com`, `eatapp.co`, `reservations.teamsystem` (unverified) |
| Delivery | Uber Eats | ✔ `ubereats.com/store/` (Italy: `ubereats.com/it/store/` ?) |
| Delivery | Just Eat | ✔ pattern `restaurants-<slug>/menu`; ? `justeat.it` |
| Delivery | Deliveroo | ? `deliveroo.it/it/menu/milano/` |
| Delivery | Glovo | ? `glovoapp.com/it/it/milano/` |
| Own ordering / menu | Wix Restaurants, MenuForma, My Contactless Menu, ForkMenu | ? `wixrestaurants`, `menuforma`, `mycontactlessmenu`, `menu.thefork` (verify) |
| Contact | WhatsApp | ? `wa.me/`, `api.whatsapp.com/send` |
| Reviews | Tripadvisor / Google / widgets | ? `tripadvisor.it`, `g.page`, `elfsight`, `trustindex` |
| Consent | iubenda / Cookiebot | ? `cdn.iubenda.com`, `consent.cookiebot.com` |

### Gaps
- No official vendor docs fetched for Quandoo, OpenTable, Resy, SevenRooms, Plateform, Deliveroo, Glovo, Just Eat Italy. Plateform's domain and its Italian presence were not confirmed.
- No market-share data for booking platforms in Milan (TheFork is assumed dominant; not sourced).

---

## 5) Schema.org types

### Takeaway
Use the most specific `FoodEstablishment` subtype. Recommended properties: `name`, `address`, `telephone`, `url`, `geo`, `openingHoursSpecification`, `servesCuisine`, `menu`/`hasMenu`, `priceRange`, `acceptsReservations`, `image`.

### Cited Findings
- Google: required `name`, `address`. Recommended `servesCuisine`, `menu` (full URL), `openingHoursSpecification` (object or array), `priceRange` (<100 chars), `telephone`, `geo` (≥5 decimals), `url`. "Use the most specific LocalBusiness sub-type possible" (e.g. `Restaurant`). Multiple types allowed as an array, `additionalType` not supported. `acceptsReservations` not mentioned. The restaurant carousel (needs `image`) is limited to registered providers — [Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/local-business) (fetched in full)

### Inferences
- Mapping (from schema.org vocabulary as I know it; schema.org could not be fetched): ristorante/trattoria/osteria/pizzeria → `Restaurant` (pizzeria + `servesCuisine: "Pizza"`; fast takeaway → `FastFoodRestaurant`); bar/caffè → `CafeOrCoffeeShop` (cocktail bar/pub → `BarOrPub`); pasticceria/panificio → `Bakery`; gelateria → `IceCreamShop`; enoteca/wine bar → `BarOrPub` or `Winery` (producer only) — consider `["BarOrPub","Store"]` if it sells bottles. `FoodEstablishment` properties: `acceptsReservations` (Boolean/URL/Text), `hasMenu` (Menu/URL/Text; `menu` is the older name), `servesCuisine`, `starRating`.
- Rubric: JSON-LD present + correct subtype + hours + telephone = full points. Check that JSON-LD hours/phone match the visible text and the GBP.

### Gaps
- Could not verify on schema.org whether `menu` is formally superseded by `hasMenu`, or the current subtype list.

---

## 6) Tone and common mistakes

### Takeaway
Typical failures: **PDF/photo/QR-only menus, no prices, hours missing or outdated, no click-to-call, Instagram/Facebook link in place of content, slow image-heavy homepages, Google Maps/YouTube embeds and trackers before consent, missing P.IVA**. Tone: warm and concrete (dishes, place, people), Italian first, English for Milan. Urgency language ("ultimi tavoli!") is rare in Italian dining and risky unless true.

### Cited Findings
- PDF menu on mobile → 49% would leave (2023) — [Popmenu](https://get.popmenu.com/toolkit/6-things-diners-wish-restaurant-owners-knew-about-online-ordering) `[snippet, vendor]`
- Non-mobile-friendly site → 33% abandoned an order — [MGH 2019](https://mma.prnewswire.com/media/967462/1MGH_2019_Restaurant_Infographic.pdf?p=pdf) `[snippet]`
- QR-only menus are disliked (45% don't want them); paper menus are coming back — [Audacy](https://www.audacy.com/national/news/45-of-customers-dont-want-to-read-menus-on-a-qr-code); [Restaurant Business](https://www.restaurantbusinessonline.com/technology/customers-really-dont-qr-code-menus) `[snippet]`
- 70% of website visitors had been discouraged by the site (navigation, readability, menu) — [Tripleseat](https://tripleseat.com/blog/4-rules-to-follow-for-digital-restaurant-menus/) `[snippet]`
- Cookie banners with scroll-as-consent or no reject option breach the Garante guidelines — [Punto Informatico](https://www.punto-informatico.it/garante-privacy-vietati-scrolling-cookie-wall/) `[snippet]`

### Inferences (practitioner checklist, unsourced, to validate on a sample of Milan sites)
- Mistakes to detect automatically: menu link to `.pdf`; menu as image; "Seguici su Instagram" as the only content; hours only in an image or missing; `©2019`-style outdated footer year or old seasonal menus ("Menu Natale 2022"); autoplay video/audio (`<audio autoplay>`, `<video autoplay>` without `muted`); splash/intro pages; Google Maps/YouTube iframes; `googletagmanager`/`facebook` pixel loaded with no consent tool; no `tel:` link; phone only in an image; missing P.IVA; "Coming soon"/template text (`Lorem ipsum`); a broken booking button (link to a defunct TheFork page); prices without `coperto` stated.
- Tone norms (to put in the build checklist): plain, warm Italian; real names of dishes, producers and owners (only if provided by the client – house rule: no invented facts); avoid fake scarcity; CTA verbs: "Prenota", "Chiama", "Ordina", "Vieni a trovarci".

### Gaps
- No Italian study of the most common restaurant website errors found. The list above should be validated by crawling ~50 Milan restaurant homepages.
- No data on autoplay music/video specifically (commonly cited, unsourced).

---

## 7) Open doubts

### Takeaway
The main open points are legal precision (verify the texts) and Italian-specific behaviour data.

### Cited Findings
- Sources disagree on whether art. 35 applies to purely informational sites: one says no, Agenzia Entrate Ris. 60/E says yes — [FiscoeTasse](https://www.fiscoetasse.com/rassegna-stampa/7693-iva-sito-web-con-partita-anche-senza-vendite.html) vs [supporthost](https://supporthost.com/it/sito-web-senza-partita-iva/) `[snippet]`. The project should follow Ris. 60/E (always show it).
- The allergen sanction tables are not reported consistently across secondary sources — [FIPE](https://fipe.it/wp-content/uploads/2021/12/allergici_sanzioni_web.pdf) vs [Il Fatto Alimentare](https://ilfattoalimentare.it/allergeni-ristoranti-dario-dongo.html) `[snippet]`

### Inferences
- Before the rubric uses legal rules as "hard fail", run a short legal check with hosts eur-lex.europa.eu, normattiva.it, gazzettaufficiale.it, salute.gov.it and fipe.it allowed in the network settings.

### Gaps
1. Exact text of art. 14(2) and art. 44 of Reg. 1169/2011, and the EU Commission 2017 Notice Q&A on distance selling of non-prepacked foods (delivery from a restaurant site).
2. Does D.Lgs. 231/2017 art. 19 require allergen info to be shown **online** for takeaway orders placed by phone/WhatsApp from the website? Unclear.
3. Current P.IVA sanction amount after the 2024 reform.
4. Lombardia L.R. 6/2010: exact price-display article and whether a 2024 amendment (L.R. 20/2024) changed anything.
5. Accessibility (EAA) for restaurants with their own online ordering: does the micro-enterprise exemption cover most clients?
6. Italian/Milan diner behaviour data (FIPE Rapporto Ristorazione, TheFork Italia reports) could not be accessed.
7. Plateform, Quandoo, OpenTable, Deliveroo, Glovo, Just Eat Italy URL/script patterns need live verification.
8. Whether TheFork's widget loads third-party cookies (it would then need consent under the project's "no third-party requests on load" rule). Probably yes; it should be loaded on click or used as a plain link.
