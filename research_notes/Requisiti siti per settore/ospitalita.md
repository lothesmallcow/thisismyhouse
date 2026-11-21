# Requisiti siti per settore – Ospitalità piccola (B&B, agriturismo, casa vacanze/affittacamere, hotel indipendente < ~30 camere), Italia / Lombardia, fine 2026

> Research method note (read first). Date of research: 21/11/2026. WebSearch worked; WebFetch was blocked for almost every host (normattiva.it, diritto.it, assolombarda.it, comune.siena.it, wordpress.org all returned "host not allowed" in this cloud session). Only regione.lombardia.it could be fetched in full. So most findings below rest on **search-result summaries/snippets**, not full-page reads. Every such item is marked **[snippet]**. Legal items whose primary text (Normattiva / Gazzetta Ufficiale) I could NOT open are marked **[primary text not read]**. Items that come only from my background knowledge and that I could not source are kept in "Inferences" or "Gaps" and marked **[unverified]**. To verify the legal core, someone has to allow `www.normattiva.it` and `www.ministeroturismo.gov.it` in the session network settings, or check by hand.

---

## 1) Sub-sectors and primary conversion

### Takeaway
On the site the visitor decides 4 things: "is it right for me (place, room, vibe)", "is it free on my dates", "how much does it cost", "can I trust it / is it cheaper or safer than Booking/Airbnb". The best conversion is an **integrated booking engine showing live availability and price**. Fallback conversions, roughly best to worst: availability-request form with dates, WhatsApp, phone, email. Direct bookings are worth more per booking than OTA ones, and the direct share has held steady in 2025.

### Cited Findings
- SiteMinder 2025 Hotel Booking Trends: direct bookings "remained remarkably stable in 2025", despite predictions that AI would erode or amplify the channel. [snippet] — [PhocusWire](https://www.phocuswire.com/hotel-direct-bookings-steady-siteminder-report-2025)
- Average booking value by channel in 2025: hotel website US$516, wholesalers US$445, GDS US$392, OTAs US$312. In 2024: US$519 direct vs US$320 OTA. [snippet] — [PhocusWire 2025](https://www.phocuswire.com/hotel-direct-bookings-steady-siteminder-report-2025); [PhocusWire 2024](https://www.phocuswire.com/siteminder-hotel-booking-channels-2024)
- SiteMinder 2026 report: 40% of U.S. travelers now book directly (hotel website, phone or email), up from 36%, against a **global average of 28%**. [snippet] — [The Host Report](https://www.thehostreport.com/news/40-of-u-s-travelers-plan-to-book-direct-in-2026)
- Share of direct bookings at independent hotels. **Sources conflict:** one aggregator says independents average 55.2% direct vs 42.7% for chains (secondary, unclear method) — [hotelsoftwarecompared.com](https://hotelsoftwarecompared.com/en/hotel-direct-booking-statistics). A vendor benchmark cites Cloudbeds for OTAs taking ~63% of independent-hotel bookings in 2025 — [Pixel & Polish](https://pixelandpolish.com/folio/the-boutique-hotel-direct-booking-benchmark). Both [snippet], both second-hand.
- Lombardy classifies its accommodation as alberghiere (hotel), non alberghiere (incl. B&B, case per vacanza CAV, affittacamere/foresterie), and "alloggi o porzioni di alloggi dati in locazione per finalità turistiche" under L. 431/98 (locazione turistica by private hosts). — [Regione Lombardia – CIR](https://www.regione.lombardia.it/cultura-turismo-e-sport/imprese-e-professioni-turistiche/codice-identificativo-di-riferimento-cir) (fetched); [Regione Lombardia – non alberghiere](https://www.regione.lombardia.it/cultura-turismo-e-sport/imprese-e-professioni-turistiche/strutture-ricettive-non-alberghiere)
- Agriturismo in Lombardia is a separate legal regime under agriculture (l.r. 31/2008, Titolo X + r.r. 4/2008), not the tourism law l.r. 27/2015. [snippet] — [Regione Lombardia – Agriturismo](https://www.regione.lombardia.it/agricoltura/agriturismo-enoturismo-e-oleoturismo/agriturismo-in-regione-lombardia)

### Inferences
- Primary conversion by sub-sector (my synthesis, not a sourced ranking):
  - **Small hotel (10–30 rooms):** booking engine (button "Prenota" / "Verifica disponibilità" → engine with dates/rate). Phone stays second.
  - **B&B / affittacamere (1–6 rooms):** booking engine if they already use a channel manager (Octorate, Smoobu, Kross, etc.). Otherwise a date-based availability-request form + WhatsApp. In Milan, many small B&Bs live mostly on Booking.com/Airbnb, so the site's job is often "the direct, cheaper alternative".
  - **Casa vacanze / locazione turistica (private host, no P.IVA):** WhatsApp/form + availability calendar (iCal synced from Airbnb/Booking) is the usual setup. A booking engine with online payment is possible (Smoobu, Lodgify, Octorate).
  - **Agriturismo:** mixed. Rooms via booking engine or request form; restaurant via phone/WhatsApp; experiences (fattoria didattica, degustazioni) via form. Often 2 conversions on the same homepage ("Prenota il soggiorno" + "Prenota un tavolo").
- For scoring: give the highest score to "dates + price visible without leaving the site, or in one click", then a form with arrival/departure/guests, then WhatsApp/tel only.

### Gaps
- No primary Phocuswright data was reachable. No reliable conversion-rate benchmark (sessions → bookings) for independent-hotel booking engines; the vendor benchmark defines the metric but gives no number.
- No Italy-specific data (Federalberghi, Hotrec, ISTAT) on direct vs OTA share for small properties. Searches found nothing usable.

---

## 2) Must-have elements ranked by impact (evidence + detectability)

### Takeaway
What moves direct bookings in the surveys: **flexibility/control over changes**, **perks** (upgrade, breakfast, late check-out) more than raw price, a **clearly cheaper or equal direct price**, and the confidence to book (live availability, clear policies). I found no solid sector studies on photos per room, mobile speed or multilingual sites; those stay best practice and should get lower weight in the rubric.

### Cited Findings
- 66% of travelers who book direct say it is because it gives them more control over changes. [snippet] — [The Host Report](https://www.thehostreport.com/news/40-of-u-s-travelers-plan-to-book-direct-in-2026)
- 61% prefer direct booking for more lenient cancellation and modification policies (Hotel News Resource figure, cited by Yahoo Travel). [snippet] — [Yahoo Travel](https://travel.yahoo.com/advice/travel-tips/articles/why-no-longer-book-hotels-160230037.html)
- A Software Advice + Google survey (~2,500 travelers) found **experience perks, not lower price**, are the top direct-booking incentive: free room upgrade first, room service second at 23%. [snippet] — [Hotelia](https://hotelia.io/blog/direct-booking-incentives)
- A 2025 VRT test of 30 hotels found the direct rate cheaper in 80% of cases, by ~13% on average. But a BVA BDRC survey found only 32% of travelers think the hotel website has the best rate (28% in 2018), against 36% confidence in OTAs. [snippet] — [Yahoo Travel](https://travel.yahoo.com/advice/travel-tips/articles/why-no-longer-book-hotels-160230037.html); [Hospitality.today](https://www.hospitality.today/article/uk-direct-hotel-bookings-gain-ground)
- Loyalty: 33% of Americans list loyalty programs among their top 3 reasons to return to a hotel (9 points above the global average). [snippet] — [Hotel Tech Report news](https://hoteltechreport.com/news/american-travelers-most-likely-to-book-hotel-directly-show-strongest-commitment-to-loyalty-programs-new-siteminder-report)
- Google Hotels is a common starting point for travelers (anecdotal, one travel writer). [snippet] — [Yahoo Travel](https://travel.yahoo.com/advice/travel-tips/articles/why-no-longer-book-hotels-160230037.html)
- Google requires that hotel structured-data values match what is visible on the page, for price accuracy checks. — [Google Hotel Price Structured Data](https://developers.google.com/hotels/hotel-prices/structured-data/hotel-price-structured-data) [snippet]

### Inferences — ranked checklist (rubric draft)

Weight: H = high, M = medium, L = low. Detect: Y = from homepage HTML, P = partial (heuristic), N = human only.

| # | Element | Impact | Evidence basis | Detect | Detection signals (homepage HTML) |
|---|---|---|---|---|---|
| 1 | **Booking CTA above the fold** ("Prenota", "Prenota ora", "Verifica disponibilità", "Controlla disponibilità", "Richiedi disponibilità", "Book now", "Check availability") | H | conversion logic; booking engine = live availability | Y | `<a>`/`<button>` with those texts in the first viewport; `href` to booking-engine domain (§4); `tel:` / `wa.me` |
| 2 | **Integrated booking engine** (live availability + price) | H | direct booking value $516 vs $312 OTA; control/flexibility drivers | Y | vendor domains/scripts in §4; `<iframe src=…>`; date inputs `type="date"`, names `checkin/arrivo/data_arrivo/checkout/partenza/adulti/ospiti` |
| 3 | **Date-picker / search widget** on homepage (arrival, departure, guests) | H | lowers friction to see price | Y | `<form>` with 2 date fields + guests; text "Arrivo", "Partenza", "Ospiti", "Adulti", "Bambini", "Notti" |
| 4 | **Direct-booking advantage stated** ("Miglior prezzo garantito", "Prenota direttamente", "Best rate guarantee", "-10% prenotando sul sito", "colazione inclusa", "late check-out", "cancellazione gratuita") | H | perks > price; only 32% believe site is cheapest → must be said | Y | regex on those Italian/English phrases |
| 5 | **Clear cancellation / payment policy** ("Cancellazione gratuita fino a…", "Pagamento in struttura", "caparra", "acconto", "non rimborsabile") | H | 61–66% book direct for flexibility/control | P | keywords on homepage or link to "Condizioni", "Politiche", "Termini di prenotazione" |
| 6 | **Rooms/units page with photos per room**, size m², beds, max guests, amenities | H | best practice; no study found | P | link "Camere", "Le nostre camere", "Appartamenti", "Rooms"; count `<img>` per room section; text "m²/mq", "letto matrimoniale", "max N ospiti" |
| 7 | **Prices or "a partire da €"** visible | M-H | price transparency; Google requires visible = marked-up price | Y | regex `€\s?\d+`, "a partire da", "da € … a notte", "prezzo a notte" |
| 8 | **Contact one tap away**: `tel:` link, WhatsApp `wa.me/39…` or `api.whatsapp.com`, email `mailto:` | H (small B&B/agri) | primary fallback conversion | Y | `href^="tel:"`, `wa.me`, `api.whatsapp.com/send`, `mailto:` |
| 9 | **Location / how to get there**: full address, distance from metro/station/Fiera/Duomo (Milan) or from motorway exit/town (agri), map as link | H | location is a top decision factor (best practice; not sourced) | P | address regex (via/viale/piazza + CAP 5 digits); "MM1/MM2/M3/M4/M5", "fermata", "stazione Centrale", "km da"; `google.com/maps`, `maps.app.goo.gl`, `goo.gl/maps` link (an embed iframe = third-party request, against our rules) |
| 10 | **Reviews / social proof** with source (Google, TripAdvisor, Booking score) | M-H | trust; no study found in this run | P | widget domains §4; text "recensioni", "voto", "/10", "★"; `aggregateRating` in JSON-LD |
| 11 | **Check-in / check-out times** and key rules (pets, parking, breakfast, self check-in) | M | reduces pre-booking questions | Y | "Check-in", "Check-out", "dalle ore", "entro le ore", "animali ammessi", "parcheggio", "colazione" |
| 12 | **Multilingual EN (+DE/FR for lakes, Franciacorta, Oltrepò; ZH/ES for Milan)** | M | international demand; no study found | Y | `<link rel="alternate" hreflang="en">`, `/en/` path, language switcher, `<html lang>` |
| 13 | **Mobile speed** (LCP < 2.5 s, images AVIF/WebP, no heavy sliders) | M | best practice; no sector study found | Y (with Lighthouse) | Lighthouse/PSI; `<img>` without width/height; >1 MB hero; carousel libraries (slick, swiper, revslider) |
| 14 | **Legal block** (CIN, CIR, P.IVA, ragione sociale, privacy/cookie) | Mandatory | §3 | Y | regex in §3 |
| 15 | **Tassa di soggiorno stated** (amount or "esclusa, da pagare in struttura") | M (trust; avoids surprise at check-in) | §3 | Y | "tassa di soggiorno", "imposta di soggiorno", "city tax", "tourist tax" |
| 16 | **Structured data** LodgingBusiness/Hotel/BedAndBreakfast | M (SEO/Google Hotels) | §5 | Y | `<script type="application/ld+json">` with `@type` in §5 |
| 17 | **Agriturismo extras**: products, restaurant/menu, "km 0", fattoria didattica, girasole mark | M (agri only) | §3 | P | "agriturismo", "prodotti dell'azienda", "fattoria didattica", "km 0", "degustazione", image alt/filename "girasole"/"agriturismo-italia" |
| 18 | **Photo quality / truthful photos, warmth of copy, owner presence** | M | §6 | N | human review |

### Gaps
- No found study measuring the uplift from photos per room, map/location section, review widgets, best-rate guarantee badges, multilingual pages or mobile speed **for hotels**. The ranking above for those items is judgment, not data. Searching vendor reports (SiteMinder "Hotel Booking Trends", Google/Think with Google travel studies, Expedia Group "Traveler Value Index") with page access is the next step.
- No Hotrec or Federalberghi survey data surfaced in searches.

---

## 3) Italian legal obligations visible on the site

### Takeaway
On every page or at least the homepage of an Italian accommodation site you should expect: **CIN** (national code, mandatory in every advert since 2/11/2024; fines from 2/1/2025), **CIR** in Lombardy (regional code, still mandatory alongside the CIN), **P.IVA on the homepage** for any business (art. 35 DPR 633/72), privacy + cookie info that follows the Garante's 2021 guidelines, and, for trust rather than law, tassa di soggiorno info. Private hosts with up to 2 short-let units can run without P.IVA. **From 2026 the business presumption starts at the 3rd unit** (it used to be the 5th).

### Cited Findings

**CIN – Codice Identificativo Nazionale (art. 13-ter DL 18/10/2023 n. 145, conv. L. 191/2023)** [primary text not read: normattiva.it blocked]
- The CIN must be shown **outside the building** and **in every advert, published and communicated anywhere**. Both the owner/manager and intermediaries/portals are responsible. [snippet] — [TeamSystem](https://www.teamsystem.com/magazine/horeca/cin-affitti-brevi-strutture-ricettive-esposizione-annunci-sanzioni/); [Studio Mudol](https://www.studiomudol.it/locazioni-turistiche-e-brevi-modalita-di-esposizione-del-cin/)
- Ministry FAQ: when the host publishes the advert directly, responsibility falls on the host (relevant: the client's **own website** is an advert they publish). [snippet] — [Fiscomania](https://fiscomania.com/cin-affitti-brevi/); [Chekin – FAQ Ministero](https://chekin.com/it/blog/faq-ministero-turismo-cin/)
- Applies to **strutture ricettive** (hotels, B&B, agriturismi, etc.) and to properties let for tourist/short stays. Comma 9 sanctions "il titolare di una struttura ricettiva priva di CIN" and whoever lets units without a CIN. [snippet] — [Fabiana Nesi, commercialista](https://fabiananesicommercialista.com/2024/02/17/la-disciplina-delle-locazioni-brevi-alla-luce-del-dl-145-2023-e-gli-obblighi-ex-art-109-tulps/)
- **Sanctions (comma 9):** no CIN at all: €800–8,000 depending on the size of the property. Failure to display/indicate the CIN: €500–5,000 **per structure/unit**, plus **immediate removal of the non-compliant advert**. [snippet] — [Fabiana Nesi](https://fabiananesicommercialista.com/2024/02/17/la-disciplina-delle-locazioni-brevi-alla-luce-del-dl-145-2023-e-gli-obblighi-ex-art-109-tulps/); [Studio Mudol](https://www.studiomudol.it/locazioni-turistiche-e-brevi-modalita-di-esposizione-del-cin/). Note: some commercial sites give other figures (€600–6,000; "up to €8,000 for non-display"); these look wrong — [blog.alberghi.it](https://blog.alberghi.it/cin-cose-e-come-ottenere-il-codice-identificativo-nazionale/), [facilebb](https://facilebb.it/guida/cin-codice-identificativo-nazionale-guida). The €500–5,000 / €800–8,000 pair is the one most sources and professional firms give.
- **Comma 8:** whoever runs tourist/short lets **as a business** (also via intermediaries) must file a SCIA with the SUAP; missing SCIA: €2,000–10,000. [snippet] — [Fabiana Nesi](https://fabiananesicommercialista.com/2024/02/17/la-disciplina-delle-locazioni-brevi-alla-luce-del-dl-145-2023-e-gli-obblighi-ex-art-109-tulps/)
- **Dates:** BDSR portal went live in autumn 2024 (Ministry notice in GU, 3/9/2024). Display obligation in force from 2/11/2024. Deadline to obtain the CIN extended to 1/1/2025, so fines apply from 2/1/2025. [snippet] — [Gazzetta Ufficiale – Ministero del Turismo avviso](https://www.gazzettaufficiale.it/eli/id/2024/09/03/TX24ADA8917/p2); [Fiscomania](https://fiscomania.com/cin-affitti-brevi/); [Centro Consumatori Italia](https://centroconsumatoriitalia.it/avviso-per-tutte-le-strutture-ricettive-da-gennaio-e-obbligatorio-il-cin/)
- Ministry FAQ last updated around **16 January 2026** (CIN, safety devices, SCIA) — I could not read the update. [snippet] — [diritto.it](https://www.diritto.it/affitti-brevi-faq-turismo-2026-cin-sicurezza-scia/)
- The Ministry published a "BDSR Lens" presentation in June 2026 (likely a tool for checking CINs in adverts; content not read). [snippet] — [MiTur BDSR Lens PDF](https://www.ministeroturismo.gov.it/wp-content/uploads/2026/06/MiTur-presentazione-BDSR-Lens.pdf)
- CIN format (from general guides, not confirmed on the primary text): `IT` + ISTAT code of the comune (6 digits) + letter for type + progressive. Example shape seen in guides: `IT015146C2XXXXXXXX`. [unverified; sourced only to commercial guides such as [Lodgify](https://www.lodgify.com/blog/it/codice-cin-affitti-brevi/)]

**CIR – Lombardy (art. 38 c. 8-bis l.r. 27/2015; DGR XII/169 of 19/04/2023)**
- "All accommodation regulated by l.r. 27/15", including apartments let for tourist purposes under L. 431/98, must hold the CIR. It is generated in the **ROSS1000** system after the SCIA (hotels, B&B, etc.) or CIA (CAV, apartments) goes through the Comune → Provincia/Città Metropolitana. It must be advertised "secondo le indicazioni di legge". Page inserted 01/03/2026, updated 13/10/2026. — [Regione Lombardia – CIR](https://www.regione.lombardia.it/cultura-turismo-e-sport/imprese-e-professioni-turistiche/codice-identificativo-di-riferimento-cir) (fetched)
- The law requires the CIR in "pubblicità, promozione e commercializzazione" of the offer. [snippet] — same page, via search summary
- The CIN did **not** replace the CIR in Lombardy; CIR obligations under l.r. 27/2015 remain, and new properties must get the CIR before applying for the CIN. [snippet] — [Assolombarda – codice identificativo case vacanze](https://www.assolombarda.it/governance/gruppi/turistico/informazioni/codice-identificativo-per-case-e-appartamenti-vacanze); [Informativa CIN – Regione Lombardia flussi turistici](https://www.flussituristici.servizirl.it/Turismo5/res/Informativa_CIN.pdf)
- A Regione Lombardia clarification document on the CIR after **l.r. 7/2025** (which amended l.r. 27/2015) exists; not read. [snippet] — [chiarimenticir.pdf](https://www.regione.lombardia.it/content/dam/rl/canali-tematici-servizi/07-cultura-turismo-e-sport/07-imprese-turistiche/red-codice-identificativo-di-riferimento-cir/allegati/chiarimenticir.pdf)
- The CIR obligation on adverts (e.g. Airbnb) dates back to 1/11/2018 in Lombardy. [snippet] — [VareseNews 2018](https://www.varesenews.it/2018/10/case-vacanza-affitti-brevi-lobbligo-del-codice-cir-discutere/764094/?output=pdf)

**P.IVA and private hosts**
- Art. 35 c. 1 DPR 633/1972 (as amended by DPR 404/2001, from 1/12/2001): every VAT-registered business must show its **P.IVA on the homepage** of its website, including purely promotional sites. Fine: €258.23–2,065.83 (art. 11 c. 1 lett. a DLgs 472/1997). Agenzia Entrate Risoluzione n. 60 of 6/5/2006 is cited as confirming this for non-e-commerce sites. [snippet; mostly old sources, 2001–2008; not checked for later changes] — [Fiscomania – indicazioni obbligatorie siti web](https://fiscomania.com/indicazioni-obbligatorie-siti-web); [PMI.it](https://www.pmi.it/impresa/normativa/news/2230/obbligo-p-iva-in-homepage-parte-ii.html); [Fiscozen](https://www.fiscozen.it/guide/partita-iva-sito-web/)
- **Private host (locazione turistica / affitti brevi, no P.IVA):** from **1/1/2026** the presumption of business activity starts with the **3rd** short-let unit (previously more than 4). Up to 2 units: private, cedolare secca possible. With P.IVA, the cedolare secca no longer applies. Long-term contracts (4+4, 3+2) do not count. Cedolare rates: sources conflict (21% on the 1st unit and 26% on the 2nd, vs 26% for both). [snippet] — [Fiscomania](https://fiscomania.com/affitti-brevi-partita-iva-terzo-immobile/); [We Wealth](https://www.we-wealth.com/news/affitti-brevi-airbnb-2026-tre-case-partita-iva); [Fondazione Nazionale Commercialisti, 16/02/2026](https://www.fondazionenazionalecommercialisti.it/filemanager/active/01860/2026_02_16_Il_regime_fiscale_delle_locazioni_turistiche-a.pdf?fid=1860)

**Tassa / imposta di soggiorno – Milano**
- Milano 2026: **€9.50 per person per night** for B&B, case vacanza and short lets; hotels 4–5★ €10, 3★ €7.40, 2★ €5, 1★ €4; case per ferie €7; hostels/campsites €3 (delibera n. 1418 of 13/11/2025; the higher rates are tied to the Milano-Cortina 2026 Olympics). [snippet] — [Hostaway](https://www.hostaway.com/it/vacation-rental-guide/tourist-tax/italy/milan/); [Holidu](https://www.holidu.it/magazine/tassa-di-soggiorno-milano-2026); [Euronews](https://it.euronews.com/2025/11/13/olimpiadi-milano-cortina-nel-capoluogo-lombardo-tassa-di-soggiorno-fino-a-10-euro-a-notte)
- The Giunta has published the **2027 rates** (delibera n. 1481 of 12 November, presumably 2026); amounts not found. Do not use the 2025 figures (e.g. €6.30 B&B) or the €4.80 "halving" draft. [snippet] — [Assolombarda – tariffe 2027](https://www.assolombarda.it/governance/gruppi/turistico/informazioni/milano-pubblicate-le-tariffe-dellimposta-di-soggiorno-valide-per-il-2027); [Greenme (draft, superseded)](https://www.greenme.it/?p=1501056)

**Agriturismo (Lombardia)**
- Regime: l.r. 31/2008 Titolo X + r.r. 4/2008. All agritourism businesses must use the **national "Agriturismo Italia" mark (girasole)** (art. 158 c. 3 l.r. 31/2008). Classification is **mandatory** in Lombardy; the company plate can be downloaded from the portal. The certificato di connessione (art. 152) and the number of meals recognized (art. 157) are part of the authorization. Start requires a SCIA to the Comune (art. 154). [snippet] — [Regione Lombardia – classificazione, marchio e simbolo](https://www.regione.lombardia.it/agricoltura/agriturismo-enoturismo-e-oleoturismo/classificazione-agriturismi--marchio-e-simbolo); [Regione Lombardia – agriturismo](https://www.regione.lombardia.it/agricoltura/agriturismo-enoturismo-e-oleoturismo/agriturismo-in-regione-lombardia); [agriturismo.it](https://www.agriturismo.it/it/extra/aprire-un-agriturismo-in-lombardia-505)

**Cookie / privacy**
- Garante Privacy "Linee guida cookie e altri strumenti di tracciamento", 10 June 2021 (provv. n. 231, GU 9/7/2021): closing the banner with "X" = no consent, only technical cookies. **Scrolling is not consent**. The choice should not be re-asked for 6 months. "Reject" must be as visible as "Accept" (law-firm summary). [snippet] — [Garante – doc. 9677876](https://www.garanteprivacy.it/home/docweb/-/docweb-display/print/9677876); [iubenda](https://www.iubenda.com/it/help/31253); [Cybersecurity360](https://www.cybersecurity360.it/legal/privacy-dati-personali/cookie-le-nuove-linee-guida-del-garante-privacy-suggerimenti-pratici-per-le-aziende/)

### Inferences — detection signals for the legal block
- **CIN:** regex `\bIT\d{6}[A-Z]\d[A-Z0-9]{6,8}\b` (approximate; tune on real sites) + label "CIN" / "Codice Identificativo Nazionale". Treat a missing CIN as a **critical** fail for every lodging type, own website included (inference from "every advert" + host responsibility; confirm with the Jan-2026 FAQ).
- **CIR (Lombardy):** label "CIR" / "Codice Identificativo di Riferimento" + a code that starts with the 6-digit ISTAT comune code (Milano = 015146), e.g. `015146-CNI-00123` / `015146-BEB-…` patterns. [unverified format, check real CIRs from ROSS1000]
- **P.IVA:** regex `(P\.?\s?IVA|Partita IVA|VAT)\s*[:n.°]*\s*(IT)?\s?\d{11}` in the homepage HTML (footer is fine). A private host without P.IVA must not have one: the rubric should accept "Locazione turistica – CIN … – CIR …" without P.IVA, **only** if ≤ 2 units.
- **Privacy/Cookie:** links containing "privacy", "cookie", "informativa"; iubenda script `cdn.iubenda.com` / `embeds.iubenda.com` or other CMP (Cookiebot `consent.cookiebot.com`, Complianz `cmplz`, CookieYes `cdn-cookieyes.com`). Human check: reject button present, no tracking before consent. Automated check: load the page without a click and list third-party requests.
- **Tassa di soggiorno:** keywords "imposta di soggiorno", "tassa di soggiorno", "city tax", "non inclusa", "da pagare in loco".
- **Agriturismo:** keyword "agriturismo" in the name/title requires legal status. Check for the girasole mark (image alt/filename) and the classification ("girasoli", "spighe"? classification symbol not confirmed in Lombardy). Human check.
- Existing studio rule (CLAUDE.md of the starter) already requires a legal footer from business.json; for hospitality, add **CIN + CIR** fields to business.json and the footer.

### Gaps
- I could not read art. 13-ter on Normattiva, nor the Ministry FAQ (Jan 2026 version). The exact text on "annunci" (does it explicitly name the operator's own website?), the CIN format and any 2026 changes to fines need checking at the source.
- Lombardy l.r. 7/2025 changes to the CIR and the chiarimenti PDF: not read. Lombardy-specific CIR fines: not found.
- Number of the 2026 budget law that lowered the threshold to 3 units: not confirmed from a primary source (only commercial/professional sites).
- Milano 2027 imposta di soggiorno rates: not found. Rates for other Lombardy comuni (lakes, Bergamo, Brescia, Franciacorta, Valtellina): not researched.
- Agriturismo: no source specifying what the **website** must show (mark, classification, meal count). Needs r.r. 4/2008 artt. 8–9 text (consiglionline.lombardia.it).
- Whether the "affittacamere"/B&B classification must appear on the site in Lombardy: not found.

---

## 4) Vendor / platform detection list

### Takeaway
Italian small properties mostly use Italian/Zucchetti-group engines (Simple Booking, Vertical Booking, Beddy, Octorate) or vacation-rental tools (Smoobu, Lodgify, Krossbooking, Scidoo). Detection = look for the vendor domain in `href`, `iframe src`, `script src` or `form action`. Only a few domains were confirmed in this run; the rest are from my background knowledge and must be confirmed on real HTML before going into the scorer.

### Cited Findings
- **Octorate** (Rome; Zucchetti group): booking engine for hotels, B&Bs, vacation rentals; hosted engine at **`book.octorate.com`** (path `/octobook/site/reservation/…`). [snippet] — [book.octorate.com](https://book.octorate.com/octobook/site/reservation/welcome.xhtml); [Octorate booking engine](https://www.octorate.com/booking-engine/); [Hotel Tech Report](https://hoteltechreport.com/marketing/hotel-booking-engine/octorate-booking-engine)
- **Simple Booking** (Zucchetti group): booking engine + channel manager + rate shopper; product domain **`simplebooking.travel`**, contact domain `simplebooking.it`. [snippet] — [Trustpilot](https://nz.trustpilot.com/review/simplebooking.travel); [hotelminder](https://www.hotelminder.com/best-hotel-website-booking-engines)
- **Vertical Booking** (Zucchetti group): CRS with booking engine, channel manager, meta-search; domain **`verticalbooking.com`** (`secure.verticalbooking.com` seen as hosted endpoint). [snippet] — [Vertical Booking integrations](https://www.verticalbooking.com/en/connectivity/integrations/); [LinkedIn](https://www.linkedin.com/company/verticalbooking/)
- **Kross Booking** (Italian): tracked by BuiltWith as a widget technology; listed among Google connectivity partners. [snippet] — [BuiltWith – Kross Booking](https://trends.builtwith.com/widgets/Kross-Booking); [Google connectivity partners](https://developers.google.com/hotels/connectivity-partners)
- **Scidoo**: booking engine linked to the Scidoo PMS. [snippet] — [Scidoo booking engine](https://www.scidoo.com/en/booking-engine)
- **Beddy** (Zucchetti), **Bookassist** (embeddable engine): exist and are used in Italy; no embed details found. [snippet] — [hotelminder](https://www.hotelminder.com/best-hotel-website-booking-engines)
- A WordPress plugin ("Astro Booking Engine") supports Octorate, Simple Booking, Vertical Booking, Scidoo, Kross and others, and accepts either a property code or the full booking-engine URL, which suggests that a full vendor URL usually appears in the site's HTML. [snippet] — [WordPress plugin](https://wordpress.org/plugins/astro-booking-engine/)

### Inferences — detection table (domains marked [unverified] are from background knowledge; confirm on 3–5 real sites each before use)

| Vendor | Type | Signals (href / iframe / script / form action) | Status |
|---|---|---|---|
| Octorate | BE + CM (IT) | `book.octorate.com`, `octorate.com`, `octobook` | confirmed domain |
| Simple Booking | BE (IT, Zucchetti) | `simplebooking.travel`, `simplebooking.it`, `/ibe/` path, `sbm` JS [path/JS unverified] | domain confirmed |
| Vertical Booking | CRS/BE (IT, Zucchetti) | `verticalbooking.com`, `secure.verticalbooking.com`, `reservations.verticalbooking.com` [2nd unverified] | domain confirmed |
| Kross Booking | BE + PMS (IT) | `kross.travel`, `krossbooking.com` [unverified exact hosts] | vendor confirmed |
| Scidoo | BE + PMS (IT) | `scidoo.com`, `booking.scidoo.com` [subdomain unverified] | vendor confirmed |
| Beddy | BE + CM (IT, Zucchetti) | `beddy.io` [unverified] | vendor confirmed |
| Bookassist | BE (IE, strong in IT) | `bookassist.org`, `bookassist.com` [unverified] | vendor confirmed |
| Smoobu | CM + BE (vacation rental) | `login.smoobu.com`, `smoobu.com/…/booking` [unverified] | not sourced in this run |
| Lodgify | VR site + BE | `lodgify.com`, `checkout.lodgify.com` [unverified] | not sourced |
| Ericsoft | PMS + BE (IT) | `ericsoft.com`, `booking.ericsoft…` [unverified] | not sourced |
| Passepartout (Welcome/Hotel) | PMS (IT) | `passepartout.net` [unverified] | not sourced |
| Bedzzle, Blastness, 5stelle*, HotelCinquestelle, Leonardo/Bookingexpert, Cloudbeds, SiteMinder (TheBookingButton), Mews, Hotelrunner | BE | `bedzzle.com`, `blastness.com`, `5stelle.it`/`hotelcinquestelle.com`, `bookingexpert`, `hotels.cloudbeds.com`, `direct-book.com` / `thebookingbutton.com`, `app.mews.com/distributor`, `hotelrunner.com` [all unverified] | not sourced |
| Booking.com (OTA link out) | OTA | `booking.com/hotel/it/…` | pattern from general knowledge |
| Airbnb (OTA link out) | OTA | `airbnb.it/rooms/…`, `airbnb.com/rooms/…` | general knowledge |
| Expedia/Hotels.com, Agriturismo.it, Agriturismi.it | OTA/portal | `expedia.it`, `hotels.com`, `agriturismo.it`, `agriturismi.it` | general knowledge |
| TripAdvisor widget | reviews | `tripadvisor.it`/`.com` links, `www.jscache.com/wejs?…` widget script [unverified] | not sourced |
| Google reviews widgets | reviews | Elfsight (`elfsightcdn.com`, `apps.elfsight.com`), Trustindex (`cdn.trustindex.io`), `g.page/r/…/review`, `search.google.com/local/writereview` [unverified] | not sourced |
| TrustYou / ReviewPro / Booking.com badge | reviews | `trustyou.com` widget, `reviewpro.com`, Booking "review score" badge [unverified] | not sourced |
| WhatsApp | conversion | `wa.me/39…`, `api.whatsapp.com/send?phone=39…` | general knowledge |
| Google Maps embed | third-party load | `<iframe src="https://www.google.com/maps/embed?…">` = privacy/speed negative; link `maps.app.goo.gl` / `google.com/maps/…` = fine | general knowledge |

Scoring note (inference): OTA links as the **only** booking path ("Prenota su Booking.com") are a negative signal for direct booking (commission ~15–18% is commonly cited, not sourced here). OTA review score shown as social proof is positive.

### Gaps
- No vendor developer docs could be opened, so no confirmed iframe/script snippets. Next step: fetch 3–5 real Italian hotel/B&B homepages per vendor (e.g. from BuiltWith lists) and log the exact hosts.
- Market-share data for engines in Italy: not found.

---

## 5) Schema.org types

### Takeaway
Use JSON-LD with the most specific type: `Hotel`, `BedAndBreakfast`, `Hostel`, `Motel`, `Resort`, `VacationRental` (or `Accommodation`/`Apartment` + `containsPlace`), all under `LodgingBusiness` (a `LocalBusiness`). Key properties: `checkinTime`, `checkoutTime`, `amenityFeature` (LocationFeatureSpecification), `address`, `geo`, `telephone`, `priceRange`, `starRating`, `petsAllowed`, `numberOfRooms`, `aggregateRating`, `makesOffer`. Values must match what is visible on the page.

### Cited Findings
- Hierarchy: Thing > Place > LocalBusiness > **LodgingBusiness** > **Hotel**. `amenityFeature` (type `LocationFeatureSpecification`) = "an amenity feature (e.g. a characteristic or service) of the Accommodation". `checkinTime` = "the earliest someone may check into a lodging establishment". [snippet] — [schema.org/Hotel (attic mirror)](https://attic.schema.org/Hotel); [SemanticWeb::Schema::LodgingBusiness](https://metacpan.org/pod/release/RRWO/SemanticWeb-Schema-v9.0.0/lib/SemanticWeb/Schema/LodgingBusiness.pm)
- Google Hotels recommends **JSON-LD**. Its hotel-price markup uses `Hotel` + `HotelRoom`, with `checkinTime`/`checkoutTime` inside `makesOffer` (`Offer` + `LodgingReservation`). **Structured-data values must match the visible information on the website.** [snippet] — [Google Hotel Price Structured Data Reference](https://developers.google.com/hotels/hotel-prices/structured-data/hotel-price-structured-data)

### Inferences
- `BedAndBreakfast`, `Hostel`, `Motel`, `Resort`, `Campground`, `VacationRental` are LodgingBusiness subtypes in schema.org. `starRating` (Rating), `petsAllowed`, `numberOfRooms`, `availableLanguage` are LodgingBusiness properties. [unverified in this run; background knowledge, check schema.org/LodgingBusiness]
- Agriturismo: no dedicated type. Use `LodgingBusiness` (or `BedAndBreakfast`) + `additionalType` pointing to a Wikidata/agritourism concept, and, if there is a restaurant, a separate `Restaurant` node (inference).
- Google's **VacationRental** structured data (for vacation-rental listings) exists for partners. [unverified]
- Detection: parse `<script type="application/ld+json">`, check `@type` in {Hotel, BedAndBreakfast, LodgingBusiness, VacationRental, Hostel, Resort}, and required fields (name, address, telephone, geo, checkinTime, image). Mismatch between JSON-LD and visible text (price, phone) = flag.

### Gaps
- Could not open schema.org/BedAndBreakfast or Google's VacationRental docs to confirm the property lists.

---

## 6) Tone and common mistakes

### Takeaway
The data says guests book direct for control, flexibility and perks, and many still believe OTAs are cheaper. So the copy should **reassure and make the direct advantage concrete** (clear cancellation, direct contact with the owner, a real perk), not push with fake urgency. I found no sourced study on tone; the points below are expert judgment.

### Cited Findings
- Flexibility/control (61–66%) and perks (upgrade first) are the main stated reasons to book direct; only 32% of guests believe the hotel site offers the best rate. [snippet] — [The Host Report](https://www.thehostreport.com/news/40-of-u-s-travelers-plan-to-book-direct-in-2026); [Hotelia](https://hotelia.io/blog/direct-booking-incentives); [Hospitality.today](https://www.hospitality.today/article/uk-direct-hotel-bookings-gain-ground)
- Google: marked-up prices must match visible prices (a mismatch hurts trust and eligibility). [snippet] — [Google](https://developers.google.com/hotels/hotel-prices/structured-data/hotel-price-structured-data)
- Cookie banners that treat scrolling as consent or hide "reject" break the Garante's rules. [snippet] — [Garante](https://www.garanteprivacy.it/home/docweb/-/docweb-display/print/9677876)

### Inferences (judgment, not sourced)
- **Reassures:** owner's name and face ("Vi accoglie Maria"), real photos of every room, honest distances ("12 minuti a piedi dalla M2 Lambrate"), clear "cosa è incluso", cancellation terms in plain words, "Prenota direttamente: stesso prezzo o meglio + colazione / late check-out", phone and WhatsApp with response times, review score with its source, CIN/CIR visible (signals legitimacy).
- **Feels pushy / damages trust:** fake scarcity ("Solo 1 camera rimasta!" on a static site), countdown timers, pop-ups on entry, auto-playing video/music, "Miglior prezzo garantito" with no conditions, prices "a partire da" that never appear in the engine.
  - Note: fake urgency claims can also be an unfair commercial practice under the Codice del Consumo (DLgs 206/2005) [unverified in this run; legal check needed].
- **Common mistakes on Italian small hospitality sites (to score):**
  1. "Prenota" button that opens a generic contact form with no dates, or an email address only.
  2. Booking engine in a new domain with a different look/language, or a broken iframe on mobile.
  3. Site only in Italian (Milan, Lake Como/Garda, Franciacorta: largely foreign demand).
  4. Heavy sliders, 5–10 MB hero images, Revolution Slider/WordPress themes → slow LCP on mobile.
  5. Google Maps / YouTube / Google Fonts / TripAdvisor widget loaded before consent (privacy + speed).
  6. Missing CIN/CIR/P.IVA in the footer; old "Codice Struttura" only.
  7. No prices anywhere; no check-in times; no parking/arrival info (key for agriturismi reached by car).
  8. Outdated content (2019 offers, Expo 2015 references, "nuovo" COVID protocols).
  9. Agriturismo using "agriturismo" in the name without the mark/legal status, or a site that hides the restaurant opening days.
  10. Copy full of generic adjectives ("accogliente, elegante, raffinato") and no concrete facts.

### Gaps
- No sourced study (Italian or international) on tone/urgency effects in small hospitality, or on the frequency of these mistakes on Italian sites. A sample audit of ~30 Milan B&B / Lombardy agriturismo sites would give our own baseline.

---

## 7) Open doubts

### Takeaway
The legal core (CIN fines, CIR, P.IVA on homepage, cookie rules) is consistent across many secondary sources, but none of the primary texts could be opened in this session. Verify before using it in client copy or in the scorer.

### Cited Findings
- Sources disagree on CIN fine amounts (€500–5,000 vs €600–6,000 vs "up to €8,000 for non-display"). — [Fiscomania](https://fiscomania.com/cin-affitti-brevi/); [blog.alberghi.it](https://blog.alberghi.it/cin-cose-e-come-ottenere-il-codice-identificativo-nazionale/); [facilebb](https://facilebb.it/guida/cin-codice-identificativo-nazionale-guida)
- Sources disagree on the 2026 cedolare rates for the 2nd unit. — [Fiscomania](https://fiscomania.com/affitti-brevi-partita-iva-terzo-immobile/); [fiscoturismo](https://www.fiscoturismo.it/blog/cedolare-secca-affitti-brevi-partita-iva)
- Direct-share figures for independent hotels conflict (55% direct vs 63% OTA). — [hotelsoftwarecompared](https://hotelsoftwarecompared.com/en/hotel-direct-booking-statistics); [Pixel & Polish](https://pixelandpolish.com/folio/the-boutique-hotel-direct-booking-benchmark)

### Inferences
- Treat "CIN on the owner's own website" as mandatory (strong reading of "ogni annuncio … ovunque" + host responsibility), but confirm with the January-2026 Ministry FAQ.

### Gaps (to-do list for verification)
1. Read art. 13-ter DL 145/2023 on Normattiva (current text, commi 6, 8, 9) and the Ministry FAQ (version 2026) — needs `www.normattiva.it` and `www.ministeroturismo.gov.it` allowed in the session network settings, or a manual check.
2. Read Regione Lombardia "chiarimenticir.pdf" and l.r. 7/2025 (CIR changes, Lombardy fines, CIR format).
3. Confirm the 2026 budget law article that set the 3-unit threshold (Agenzia Entrate / Gazzetta Ufficiale).
4. Milano imposta di soggiorno 2027 rates (delibera 1481/2026) and rates for the comuni where clients actually are.
5. r.r. Lombardia 4/2008 artt. 8–9 and l.r. 31/2008 art. 158: what an agriturismo must show in advertising/web.
6. Confirm the art. 35 DPR 633/72 homepage rule and fine are still current (sources are 2001–2008).
7. Confirm booking-engine domains/scripts on real sites (table in §4); find market-share data for Italy.
8. Find hard data on photos/map/reviews/multilingual/mobile speed → direct booking (SiteMinder, Google, Expedia Group); none found here.
9. Does the CIN also have to appear on social profiles (Instagram/Facebook) and Google Business Profile? Not researched.
10. Price-parity clauses: Booking.com's narrow parity clauses in Italy (Legge 124/2017 banned rate parity for hotels) — background knowledge only [unverified]; relevant to "miglior prezzo sul sito" claims.
