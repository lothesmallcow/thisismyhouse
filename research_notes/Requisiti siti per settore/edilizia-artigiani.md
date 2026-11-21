# Requisiti siti per settore: edilizia e artigiani (impresa edile/ristrutturazioni, idraulico, elettricista, serramentista, imbianchino, giardiniere, impiantista caldaie/clima) – Milano/Italia, stato a novembre 2026

> Research notes, 21/11/2026. Method caveat: most findings below come from web-search result summaries (snippet-level), not from full-page reads. Full fetches failed because these hosts are outside the session's allowed network: tinuiti.com, schema.org, provincia.bz.it (DM 37/2008 text). Treat every figure marked "(snippet)" as needing a re-check against the primary page before it is published or hard-coded into the rubric. Items marked "(not sourced in this session)" are background knowledge and are listed only to be verified. They are not facts.

---

## 1) Sub-sectors and primary conversion

### Takeaway
For every sub-sector the conversion is a contact that leads to a sopralluogo (site visit) and a preventivo. The channel depends on urgency. Urgent trades (idraulico, elettricista, caldaie in winter, fabbro/serrande) convert by phone call. Planned jobs (ristrutturazione, serramenti, imbianchino, giardino, installing a clima) convert through a quote form or WhatsApp with photos, then a sopralluogo. In Italy word of mouth (passaparola) still dominates. Google is the main channel for local search and reviews, and marketplaces (ProntoPro, Instapro, Habitissimo) compete for the same leads.

### Cited Findings
- 63% of Italian artigiani find new customers only through passaparola. About a quarter use digital tools to promote their services, against 58% across Europe (snippet, original survey not traced). — [PMI.it](https://www.pmi.it/?p=471112)
- Google is the preferred platform for local search and for reading and leaving reviews for 86% of respondents. The source is a Camera di Commercio Pordenone-Udine deck that cites Partoo 2023 (snippet, 2023 data). — [CCIAA Pordenone-Udine, slide "Credibilità aziendale"](https://www.pno.camcom.it/sites/default/files/contenuto_redazione/Innovazione%20e%20impresa%20digitale/PID/2023-2024%20EID/2023-10-11_EID_Slide%2011_Credibilit%C3%A0%20aziendale.pdf)
- 73% of Italian companies surveyed already use WhatsApp to talk to customers and prospects, and about 81% use it mainly for customer care. This is not trade-specific. — [Agenda Digitale](https://www.agendadigitale.eu/mercati-digitali/whatsapp-nelle-aziende-italiane-come-cambia-il-rapporto-coi-clienti)
- On Instapro, firms receive requests from their area and usually answer within 24–48 hours. This sets the benchmark response time customers expect from marketplace competitors (2019 article, possibly outdated). — [VareseNews](https://www.varesenews.it/2019/01/dovete-ristrutturare-ma-non-sapete-a-chi-rivolgervi/790019/?output=pdf)
- ProntoPro: Italian requests grew more than 70% in 2024 over 2023 and revenue grew 84% ([Fortune Italia](https://www.fortuneita.com/?p=354470)). In October 2026 it reported more than 50 million requests worldwide in the past year and +22% revenue in Italy ([Avvenire](https://avvenire.it/economia/oltre-50-milioni-le-richieste-alla-piattaforma-prontopro_114367)). (snippet)
- US benchmark, Tinuiti 2025 Home Services Marketing Study: licensing/insurance and price rank above reviews as hiring factors overall, but online reviews are the top factor for Gen Z and millennials. 64% consulted Google reviews, and Facebook came second (snippet; full page not reachable). — [Tinuiti](https://tinuiti.com/?p=21795), [Tinuiti report p.10](https://reports.tinuiti.com/tinuiti-home-services-marketing-study/page-10.html)
- US roofing survey (fielded fall 2024): more than half of homeowners name experience and reputation as the main hiring factors, and 34% call it the single most important factor. — [Roofing Contractor](https://roofingcontractor.com/articles/100649-2025-homeowner-roofing-survey-tracking-the-journey)

### Inferences
- Primary conversion by sub-sector, to drive the rubric weights:

| Sub-sector | Typical urgency | Primary CTA | Secondary CTA | Key proof |
|---|---|---|---|---|
| Idraulico | high (perdite, scarichi) | phone call (`tel:`) | WhatsApp with photo | pronto intervento hours, zones/response time, abilitazione DM 37 lett. E/D |
| Elettricista | medium-high (guasti) | phone call | WhatsApp, form | DM 37 lett. A/B, dichiarazione di conformità |
| Caldaie / climatizzatori | seasonal peaks | phone (guasto), form (installazione) | WhatsApp | F-gas certification (clima), DM 37 lett. C/D, brands served, bonus info |
| Impresa edile / ristrutturazioni | low, high ticket | quote form + sopralluogo | phone, WhatsApp | portfolio prima/dopo, process steps, patente a crediti, insurance, bonus |
| Serramentista | low | form/sopralluogo, showroom visit | phone | products/brands, posa certificata, bonus/ecobonus, showroom address |
| Imbianchino | low-medium | form with photos / WhatsApp | phone | portfolio, tempi, pulizia cantiere |
| Giardiniere | recurring | form / WhatsApp | phone | portfolio, zones, maintenance contracts |

- An idraulico or caldaista whose homepage has no visible `tel:` link above the fold on mobile should fail the conversion criterion outright.
- Because marketplaces (Instapro, 24–48 h) anchor expectations, a stated response time ("ti rispondiamo entro 24 ore", "sopralluogo gratuito entro X giorni") is a competitive differentiator. A client should only state it if it is true (CLAUDE.md: never invent it).

### Gaps
- No Italian study found that measures the split between phone, form and WhatsApp for trades leads. Google Local Services, Houzz, Angi/HomeAdvisor and Checkatrade conversion data were not retrieved: tinuiti.com was blocked and the other searches returned only vendor-sourced figures.
- No Italian data found on before/after portfolios, guarantees or click-to-call effects. All the effect-size evidence is US/vendor data.

---

## 2) Must-have elements ranked by impact (evidence + detectability + detection signals)

### Takeaway
Ranked by likely impact: (1) a tappable phone, WhatsApp and quote CTA; (2) areas served plus the address/sede; (3) Google reviews, with a rating of 4 or more stars; (4) a portfolio with real before/after photos; (5) services listed by trade; (6) credentials (abilitazioni DM 37, F-gas, patente a crediti, insurance); (7) process steps and sopralluogo; (8) pronto intervento or hours; (9) a stated response time or guarantees; (10) bonus edilizi info, kept current. Legal footer items (P.IVA etc.) are mandatory, but they are compliance criteria, not conversion drivers. Most items are detectable from homepage HTML with Italian keyword lists. Photo authenticity and the truth of claims are not.

### Cited Findings
- Reviews: 91% of homeowners rely on online reviews before picking a contractor ([ACHR News, Sept 2024](https://www.achrnews.com/articles/155206-91-of-homeowners-rely-on-online-reviews-before-picking-contractor)). 96% use online reviews to choose a plumber ([PM Magazine](https://www.pmmag.com/articles/97380-study-96-of-homeowners-use-online-reviews-to-select-plumber)). Both are US, vendor-adjacent.
- 87% of homeowners say they will not hire a company rated below 4 stars (Scorpion report, vendor). — [Contracting Business](https://www.contractingbusiness.com/industry-news/news/55358917/scorpion-report-shows-homeowners-outpacing-home-services-marketing)
- 80% read negative reviews and look at how the business responds (Local Impact, n=1,068). 73% use Google for business reviews. — [Local Impact](https://localimpact.com/research/how-consumers-choose-home-service-providers)
- Licensing/insurance and price rank above reviews overall (Tinuiti 2025, snippet). — [Tinuiti](https://tinuiti.com/?p=21795)
- Experience and reputation are the top hiring factors for more than half of homeowners. — [Roofing Contractor](https://roofingcontractor.com/articles/100649-2025-homeowner-roofing-survey-tracking-the-journey)
- Caveat on all of the above: the figures come mostly from vendors of reputation or marketing services, with different question wording, so they are not comparable with each other (search-tool assessment of the same sources). — [HomeStars](https://homestars.com/pro-centre/?p=1279), [Birdeye](https://birdeye.com/resources/guides/the-benefits-of-online-reviews-for-home-service-providers)
- Google Local Services Ads screen businesses with background checks and require appropriate licences and insurance where applicable. Screening takes 3–4 weeks on average. EMEA requirements vary by country, so licences and insurance are what Google itself treats as the trust baseline. — [Google Local Services Help](https://support.google.com/localservices/answer/12174778?hl=en), [Google Business IT – Local Service Ads](https://business.google.com/it/ad-solutions/local-service-ads/)

### Inferences
Ranked checklist (impact = judgement from the evidence above plus the sector's urgency profile; detectability is from homepage HTML only):

| # | Must-have | Impact | Evidence basis | Auto-detectable | Detection signals (homepage HTML) |
|---|---|---|---|---|---|
| 1 | Click-to-call phone visible on mobile, plus WhatsApp and a quote CTA | Very high | urgent-trade behaviour; WhatsApp adoption in IT | **Yes** | `href="tel:`; `wa.me/`, `api.whatsapp.com/send`, `whatsapp://`; CTA text `richiedi (un )?preventivo`, `preventivo gratuito`, `chiama( ora)?`, `scrivici su whatsapp`, `prenota (un )?sopralluogo`; check position (first 1–2 screens / in header) = partial |
| 2 | Areas served + sede | Very high (local intent) | Google local search dominance | **Yes** | `zone servite`, `operiamo a`, `interveniamo in`, `Milano e provincia`, `hinterland`, lists of comuni/municipi (e.g. `Sesto San Giovanni`, `Monza`, `Cinisello`), `areaServed` in JSON-LD; PostalAddress |
| 3 | Reviews (Google) with rating ≥4 and link to profile | High | 87% won't hire <4★ (vendor); 73–86% use Google for reviews | **Partial** (presence yes; authenticity no) | `recensioni`, `dicono di noi`, `★`, `stelle`, links `g.page/`, `maps.app.goo.gl`, `google.com/maps/place`, `search.google.com/local/writereview`; widget scripts (see §4); `AggregateRating` in JSON-LD (warning: self-serving review markup is not eligible for rich results – not verified this session) |
| 4 | Portfolio / lavori realizzati, before/after | High (ristrutturazioni, imbianchino, serramenti, giardini) | experience/reputation top factor | **Partial** | `lavori realizzati`, `i nostri lavori`, `progetti`, `portfolio`, `prima e dopo`, `prima/dopo`, `galleria`; count of `<img>`/`<picture>` in gallery section; stock-photo detection is not possible from HTML (filename hints like `shutterstock`, `istock`, `adobestock`, `unsplash` = partial) |
| 5 | Services by trade, each with own page | High (SEO + clarity) | – | **Yes** | nav links/headings: `ristrutturazioni chiavi in mano`, `rifacimento bagno`, `impianto elettrico`, `quadro elettrico`, `manutenzione caldaia`, `installazione climatizzatore`, `sostituzione serramenti`, `tinteggiatura`, `cartongesso`, `manutenzione giardini`, `potatura`; internal links `/servizi/` |
| 6 | Credentials | High (licensing/insurance top factor in US data; legal in IT) | Tinuiti; Google LSA screening | **Partial** (claims yes, validity no) | `D.M. 37/2008`, `DM 37/08`, `abilitat[oi]`, `dichiarazione di conformità`, `certificazione F-gas`, `patentino F-gas`, `iscritt[oa] al Registro F-gas`, `patente a crediti`, `attestazione SOA`, `assicurazione RC`, `polizza`, `CNA`, `Confartigianato`, `Assistenza Edile`/`Cassa Edile` |
| 7 | Process steps (contatto → sopralluogo → preventivo → lavori → collaudo/consegna) | Medium-high (planned jobs) | no hard data | **Yes** | `come lavoriamo`, `il nostro metodo`, ordered lists with `sopralluogo`, `preventivo dettagliato`, `consegna`, `collaudo` |
| 8 | Pronto intervento / hours | Very high for idraulico, elettricista, caldaie; low otherwise | urgency | **Yes** | `pronto intervento`, `24 ore su 24`, `24/7`, `h24`, `urgenze`, `reperibilità`, `anche festivi`; `openingHours`/`OpeningHoursSpecification` in JSON-LD; `orari` |
| 9 | Response time / guarantees | Medium | marketplace benchmark 24–48 h | **Yes** (claim only) | `entro 24 ore`, `risposta in giornata`, `sopralluogo gratuito`, `preventivo gratuito`, `garanzia`, `anni di garanzia`, `prezzi trasparenti` |
| 10 | Team / chi siamo / years in business | Medium | experience/reputation factor | **Partial** | `chi siamo`, `dal 19xx/20xx`, `anni di esperienza`, team photos, names (`titolare`) |
| 11 | Bonus edilizi info, dated | Medium (ristrutturazioni, serramenti, clima/caldaie) | rules change yearly (§3) | **Yes** (presence + staleness) | `bonus ristrutturazione`, `ecobonus`, `detrazione 50%`, `36%`, `bonus mobili`, `conto termico`; **staleness flags**: `superbonus 110`, `sconto in fattura`, `cessione del credito`, `65%` presented as current, any year ≤2024 next to "bonus" |
| 12 | Legal footer (P.IVA etc.) + privacy/cookie | Mandatory (compliance) | §3 | **Yes** | regex `P\.?\s?IVA\s*:?\s*\d{11}`, `REA\s*:?\s*[A-Z]{2}[-\s]?\d+`, `C\.F\.`, `capitale sociale`, `socio unico`, `PEC`; links `privacy`, `cookie`; consent tool scripts (§4) |
| 13 | Mobile performance / no third-party embeds at load | Medium | – | **Yes** | `<iframe src="https://www.google.com/maps/embed`, `youtube.com/embed`, `fonts.googleapis.com`, `recaptcha` (also a GDPR flag) |

### Gaps
- No experimental evidence found for any single element's lift (before/after portfolios, guarantees, process steps) in the trades. The ranking is judgement anchored on survey data.
- Google's guidance on self-serving `AggregateRating` was not re-verified this session.

---

## 3) Legal and credential items visible online (with sources)

### Takeaway
Mandatory on the site: the P.IVA on the homepage (art. 35 DPR 633/72, with Ris. 60/E/2006 extending it to purely promotional sites; fine €250–2,000). For società: art. 2250 c.c. data (sede, registro imprese/REA, capitale sociale versato, socio unico). For ditte individuali: art. 2199 c.c. Privacy/cookie compliance, where a quote form triggers the GDPR art. 13 notice. The rest are sector credentials that are not legally required on the website but are strong trust signals and must be true: abilitazione DM 37/2008 (letters A–G, visible on the visura camerale), F-gas (DPR 146/2018 + Reg. UE 2024/573), patente a crediti (since 1/10/2024 for anyone working in cantieri), SOA (only for public works ≥€150,000). Bonus edilizi in 2026: 50% for the abitazione principale, 36% for other homes, cap €96,000, cut to 36%/30% scheduled for 2027. Fossil-only boilers have been excluded since 1/1/2025.

### Cited Findings
**P.IVA and company data**
- Art. 35 DPR 633/72 requires the P.IVA on the homepage of the "eventuale" website. Agenzia Entrate Ris. 60/E/2006 extends this to sites used only for advertising, not just e-commerce. Fine €250–2,000 (art. 11 D.Lgs. 471/1997). — [Fiscomania](https://fiscomania.com/indicazioni-obbligatorie-siti-web), [Diritto.it](https://www.diritto.it/l-indicazione-della-partita-iva-sul-sito-web-e-obbligatoria/), [Brocardi art. 35](https://www.brocardi.it/testo-unico-iva/titolo-ii/art35.html) (secondary sources; Normattiva text not fetched)
- Art. 2250 c.c., amended in 2009, applies to company websites and email: ragione sociale, sede, registro imprese/number, capitale sociale (versato), and whether there is a socio unico. Ditte individuali fall under art. 2199 c.c. instead (registro imprese + REA). Putting the data in the footer is the common practice. — [Fiscomania](https://fiscomania.com/indicazioni-obbligatorie-siti-web), [PMI.it](https://www.pmi.it/?p=65859), [FiscoeTasse](https://www.fiscoetasse.com/normativa-prassi/1004-partita-iva-sito-web.html)

**Abilitazione impiantisti – D.M. 22 gennaio 2008 n. 37**
- Art. 1 c.2 lett. a): impianti di produzione, trasformazione, trasporto, distribuzione e utilizzazione dell'energia elettrica, protezione scariche atmosferiche, automazione porte/cancelli/barriere. Lett. c): riscaldamento, climatizzazione, condizionamento e refrigerazione di qualsiasi natura, including evacuation of combustion products and condensate. — [ANCE, estratto art. 1 DM 37/2008](https://ance.it/wp-content/uploads/archive/11765-Estratto%20art_1%20DM%2037_2008.pdf); consolidated text on [Normattiva](https://www.normattiva.it/eli/stato/DECRETO/2008/01/22/37/CONSOLIDATED/20150715)
- The visura camerale must show the letters the firm is enabled for and a responsabile tecnico who meets art. 4. Without one, the firm is not abilitata. Limited abilitazioni are possible within letters A/B/C. — [CCIAA Ravenna, decisioni Conservatori](https://ra.camcom.gov.it/registro-imprese/impiantisti/normativa-impiantisti/Decisioni%20congiunte%20Conservatori%20su%20DM%2037.pdf), [CCIAA Pavia modello requisiti](https://www.pv.camcom.gov.it/files/Impiantisti2023/All_2_Modello%20Requisiti%2037L_modifiche_202301.pdf)
- Letters B, D, E, F, G are (unverified in this session, from the search tool's background): B electronic/telecom, D gas, E idrico-sanitari, F ascensori, G antincendio. Check them against Normattiva art. 1 c.2.

**F-gas (clima, pompe di calore, refrigerazione)**
- DPR 146/2018 is the national framework. Persons need certification for installation, repair, maintenance, decommissioning, leak checks and recovery. Firms that install or maintain fixed air-conditioning and heat pumps need company certification (art. 8 c.1) and registration in the national telematic register (art. 15, MASE). Interventions are reported to the Banca Dati. — [MASE modulo iscrizione imprese](https://mase.gov.it/sites/default/files/archivio/allegati/clima/FGAS/11_IMPRESE_iscrizione.pdf), [CCIAA Firenze webinar F-gas 15/10/2025](https://www.fi.camcom.gov.it/sites/default/files/uploads/Fgas_webinar_15.10.2025_CCIAA%20FI%20(1).pdf)
- Reg. (UE) 2024/573 is in force. Existing certificates must be adapted to the new certification programmes within 3 years of entry into force. Implementing regs 2024/2473 (F-Gas portal registration) and 2024/2195 (format of communications) also apply. — [Certifico vademecum F-gas, update 24/10/2025](https://certifico.com/component/acym/archive/772-vademecum-decreto-f-gas-2025-update-24-ottobre-2025)
- The register is public, so a certification claim can be checked against it (portal: fgas.it, not fetched). — [CCIAA Firenze Banca Dati FGAS](https://www.fi.camcom.gov.it/sites/default/files/uploads/Registri_Albi_Certificazioni/Ambiente/Convegni_e_Seminari/BancaDati%20FGAS.pdf)

**Patente a crediti (art. 27 D.Lgs. 81/2008)**
- Required since 1/10/2024 for firms and lavoratori autonomi working in cantieri temporanei o mobili, whether or not they are imprese edili (so it also covers impiantisti, imbianchini and serramentisti who work in cantieri). It starts at 30 crediti, and below 15 a firm cannot work. — [Infobuild](https://www.infobuild.it/patente-a-crediti-come-mettersi-in-regola-obbligo/), [IPSOA 17/02/2026](https://www.ipsoa.it/documents/quotidiano/2026/02/17/patente-crediti-decreto-sicurezza-cambia-imprese), [CNG](https://www.cng.it/documents/d/guest/patente_a_crediti_in_edilizia)
- 2026 changes: D.L. Sicurezza 159/2025 (lavoro nero from 1/1/2026). Decreto INL n. 24 of 6/3/2026 set up regional commissions for recovering credits. INL note 4634 of 24/6/2026 covers recovery of credits, with an online form since 3/7/2026. Deadlines for extra credits change from 2027 (news of 12/11/2026). — [ildiritto.it](https://ildiritto.it/?p=4110), [Fiscal Focus 12/11/2026](https://www.fiscal-focus.it/news,190001) (snippet)
- In 2025, 479,020 patenti were issued. The INL inspection irregularity rate in construction was 71.8%. — [Quotidiano.net](https://www.quotidiano.net/cronaca/cantieri-175-morti-in-un-8354c44a) (snippet)

**SOA (public works only)**
- SOA attestation is required for public works ≥€150,000 (art. 100 c.4 D.Lgs. 36/2023 + Allegato II.12) and is necessary and sufficient for qualification. D.Lgs. 209/2024 amended art. 100. Below €150k, other evidence is enough. It is irrelevant for private-customer trades sites. — [codiceappalti.it Allegato II.12](https://www.codiceappalti.it/DLGS_36_2023/Allegato_II_12_Sistema_di_qualificazione_e_requisiti_per_gli_esecutori_di_lavori_/12902), [ANCE 11/2025](https://ance.it/2025/11/appalti-di-lavori-anac-ribadisce-la-sufficienza-della-soa-e-censura-gli-accordi-quadro-senza-progetto/?print=pdf)

**Bonus edilizi (current 2026)**
- Legge di Bilancio 2026 (L. 199/2025): bonus ristrutturazione at 50% for the abitazione principale and 36% for other homes, cap €96,000 per unit, 10 yearly instalments. The cut to 36%/30% moved to 2027. Sources disagree on 2028 onwards (30% flat?). Bonus mobili extended for 2026 at 50%, cap €5,000. — [Sky TG24 07/01/2026](https://tg24.sky.it/economia/2026/01/07/bonus-casa-2026-aliquote), [ItaliaOggi](https://www.italiaoggi.it/diritto-e-fisco/legge-di-bilancio-2026-tutte-le-novita-su-ristrutturazioni-e-bonus-edilizi-i1ktott7), [Informazione Fiscale](https://www.informazionefiscale.it/Bonus-casa-2026-proroga-novita-Legge-di-Bilancio)
- Since 1/1/2025, single fossil-fuel boilers (including gas condensing boilers) are excluded from ecobonus and bonus ristrutturazione, and that is unchanged in 2026. Factory hybrids (heat pump + condensing boiler), heat pumps, biomass and micro-cogeneration remain eligible. Heat pumps on the abitazione principale get 50% in 2026 (comma 22 LdB 2026). Conto Termico is a direct grant of up to 65% (details disputed between sources). — [Sky TG24 20/10/2026](https://tg24.sky.it/economia/2026/10/20/bonus-caldaia-2026-scadenza-domande), [Money.it](https://www.money.it/bonus-caldaia-2026-guida-incentivi-detrazioni-sostituzione-caldaie), [Immergas vademecum 06/2026](https://www.immergas.com/media/Articoli/6a3e533157cf61b4915afb0b/VADEMECUM_BONUS-CASA_06-2026.pdf)

**Cookie/privacy**
- Garante cookie guidelines of 10/6/2021 (doc. web 9677876, GU 9/7/2021): the banner needs a reject option (closing with the "X" = reject), scrolling is not consent, cookie walls are generally banned, the banner links to the extended notice and preferences, and it must not be re-shown excessively (6 months is cited). — [Garante doc. 9677876](https://www.garanteprivacy.it/home/docweb/-/docweb-display/print/9677876), [iubenda](https://www.iubenda.com/it/help/31253-uso-dei-cookie-nuove-regole-proposte-dal-garante-privacy)

### Inferences
- For the rubric: P.IVA on the homepage = hard compliance criterion (detectable by regex). For società, REA + capitale sociale + sede in the footer = hard criterion. "Socio unico" and PEC can only be checked against business data.
- Quote forms and WhatsApp widgets that load third-party scripts change the legal status of the site. Under the project's CLAUDE.md rule, a quote form moves the site out of the "informativa breve" exception, so the iubenda texts are required.
- Credential claims are detectable but not verifiable from HTML. The rubric should score "claim present + specific" (e.g. "abilitati DM 37/08 lettere A, C, D") higher than generic "certificati". A manual QA step can check the claim against the visura and the F-gas register.
- Bonus content is a staleness risk. Flag any site still advertising Superbonus 110%, sconto in fattura/cessione del credito as available to the general public, or 50% "su tutte le case" without the prima-casa distinction.

### Gaps
- DURC (D.M. 30/1/2015, INPS/INAIL/Casse Edili) and the obligation, or not, to show insurance (RC professionale/RCT) on a website were not researched with sources this session. As far as I know neither is a website-display obligation; verify.
- Codice del consumo art. 59 (exceptions to the 14-day withdrawal right for off-premises contracts, e.g. urgent repairs requested by the consumer) was not confirmed. A 2026 decree adds a new "Titolo II-bis" on repair of goods, scope unverified. — [Normattiva 26G00191](https://www.normattiva.it/eli/id/2026/10/07/26G00191/ORIGINAL)
- DM 37 letters B, D–G and art. 7 (dichiarazione di conformità) not verified from the primary text because the PDF host was blocked.
- Whether the 2028+ bonus rate is 30% flat is not settled. Check the Agenzia Entrate guide.

---

## 4) Platform detection list

### Takeaway
The main Italian quote marketplaces are ProntoPro, Instapro (Werkspot group) and Habitissimo (which absorbed Preventivi.it in 2020), plus Houzz for ristrutturazioni/design. Linking to them is a weak signal: it shows reviews exist, but it sends leads to competitors. Detection is by link domains and widget script hosts.

### Cited Findings
- Habitissimo (Spanish, founded 2009) acquired the Italian Preventivi.it in 2020. — [EconomyUp](https://www.economyup.it/proptech/ristrutturazione-casa-che-cosa-propone-in-italia-la-spagnola-habitissimo/)
- Instapro.it launched in Italy in 2014 and is linked to the Werkspot group. — [Infobuild](https://www.infobuild.it/?p=550727), [LeggiOggi](https://www.leggioggi.it/?p=19978)
- ProntoPro operates in 14 countries and merged with Armut in 2022. Only customers who used the platform can leave reviews. — [Forbes Italia](https://forbes.it/2023/08/08/prontopro-piattaforma-aiuta-trovare-professionista-giusto/), [CB Insights](https://www.cbinsights.com/compare/habitissimo-vs-prontopro), [Avvenire](https://avvenire.it/economia/oltre-50-milioni-le-richieste-alla-piattaforma-prontopro_114367)
- Google Local Services Ads ("Google Verificato"/"Google Garantito") exist with an Italian help centre and business page. Category availability in Italy (idraulici etc.) was not confirmed. — [Google LSA help IT](https://support.google.com/localservices/?hl=it), [Google Business IT](https://business.google.com/it/ad-solutions/local-service-ads/)

### Inferences
Detection patterns. The URL and host patterns are technical knowledge, not sourced this session; validate them on live sites before relying on them.

| Category | Platform | Signals in homepage HTML |
|---|---|---|
| Marketplace | ProntoPro | `prontopro.it/` links, ProntoPro badge images |
| Marketplace | Instapro | `instapro.it/` links/badges |
| Marketplace | Habitissimo | `habitissimo.it/` links, badge widget |
| Marketplace | Houzz | `houzz.it/` / `houzz.com/` links, "Best of Houzz" badge images |
| Marketplace | Preventivi.it | `preventivi.it/` |
| Reviews | Google | `g.page/`, `maps.app.goo.gl/`, `google.com/maps/place`, `search.google.com/local/writereview?placeid=`, `place_id` |
| Reviews widget | Trustpilot | `widget.trustpilot.com`, `class="trustpilot-widget"` |
| Reviews widget | Elfsight / Trustindex / EmbedSocial | `elfsight.com` / `elfsightcdn.com`, `cdn.trustindex.io`, `embedsocial.com` |
| Messaging | WhatsApp | `wa.me/39…`, `api.whatsapp.com/send?phone=`, `whatsapp://send`; floating-button plugins (e.g. `joinchat`, `click-to-chat`, `wp-whatsapp`) |
| Phone | click-to-call | `href="tel:+39…"` |
| Forms | WP forms / SaaS | `wpcf7` (Contact Form 7), `wpforms`, `gform_` (Gravity), `elementor-form`, `formspree.io`, `getform.io`, `tally.so`, `typeform.com`, `jotform`, `forms.gle`/`docs.google.com/forms` (privacy flag), `netlify` form attribute |
| Anti-spam | reCAPTCHA / Turnstile / hCaptcha | `google.com/recaptcha`, `challenges.cloudflare.com/turnstile`, `hcaptcha.com` |
| Consent / legal | iubenda, Cookiebot, CookieYes, Complianz | `cdn.iubenda.com`, `iubenda.com/privacy-policy/`, `consent.cookiebot.com`, `cdn-cookieyes.com`, `cmplz` |
| Third-party at load (CLAUDE.md fail) | Google Maps embed, YouTube, Google Fonts | `google.com/maps/embed`, `youtube.com/embed`, `fonts.googleapis.com`, `fonts.gstatic.com` |
| Booking | Calendly etc. (sopralluogo booking) | `calendly.com`, `cal.com` |

### Gaps
- Whether Habitissimo Italy is still a separate brand in 2026 or has been merged into another group was not confirmed. Habitissimo and Instapro data found is mostly pre-2025.
- No current market-share data for the Italian marketplaces.

---

## 5) Schema.org types

### Takeaway
`HomeAndConstructionBusiness` (subtype of `LocalBusiness`) has eight subtypes: `Electrician`, `GeneralContractor`, `HVACBusiness`, `HousePainter`, `Locksmith`, `MovingCompany`, `Plumber`, `RoofingContractor`. Use `areaServed` for the zones. There is no specific type for serramentista or giardiniere, so fall back to `HomeAndConstructionBusiness` (or `LocalBusiness`) and describe the services with `makesOffer`/`Service`.

### Cited Findings
- The subtype list above, with parent LocalBusiness ("a LocalBusiness that provides services around homes and buildings"), comes from schema.org-generated library docs. schema.org itself was not reachable. — [Hackage metadata docs](https://hackage.haskell.org/package/metadata-0.4.2.0/docs/Text-HTML5-MetaData-Schema-HomeAndConstructionBusiness.html), [Google Gmail markup reference](https://developers.google.cn/gmail/markup/reference/types/HomeAndConstructionBusiness?hl=en)

### Inferences
- Mapping: idraulico → `Plumber`; elettricista → `Electrician`; caldaie/clima → `HVACBusiness`; impresa edile/ristrutturazioni → `GeneralContractor`; imbianchino → `HousePainter`; coperture/lattoniere → `RoofingContractor`; serramentista, giardiniere → `HomeAndConstructionBusiness` (multi-type arrays are possible, e.g. `["Plumber","HVACBusiness"]`).
- Fields to check: `name`, `address` (PostalAddress), `telephone`, `areaServed` (City/AdministrativeArea, e.g. Milano + comuni), `openingHoursSpecification` (pronto intervento 24/7), `vatID` (P.IVA), `url`, `image`, `sameAs` (Google profile, social), `hasOfferCatalog`/`makesOffer`. All of these can be detected from JSON-LD.

### Gaps
- Not verified on schema.org whether newer subtypes or pending terms exist (e.g. for landscaping). Google's current LocalBusiness rich-result guidance was not re-read this session.

---

## 6) Tone and common mistakes

### Takeaway
Reassurance beats pressure: trust is built with concrete, checkable facts (who, where, credentials, real photos, reviews, clear process). Urgency language fits only real pronto intervento services. Common mistakes on Italian trades sites: no P.IVA or legal footer, stock photos, phone number not tappable, no zones, outdated bonus claims (Superbonus/sconto in fattura), Google Maps or YouTube embeds and Google Fonts loading without consent, forms without a privacy notice, and generic "qualità e professionalità" copy.

### Cited Findings
- 80% read negative reviews and judge the business's reply, so showing a calm, documented response style builds trust. — [Local Impact](https://localimpact.com/research/how-consumers-choose-home-service-providers)
- Licensing/insurance and experience/reputation outrank other factors (US). — [Tinuiti](https://tinuiti.com/?p=21795), [Roofing Contractor](https://roofingcontractor.com/articles/100649-2025-homeowner-roofing-survey-tracking-the-journey)
- A 71.8% irregularity rate in construction inspections in 2025 means customer distrust is rational, and verifiable compliance claims (patente a crediti, abilitazioni) set a firm apart. — [Quotidiano.net](https://www.quotidiano.net/cronaca/cantieri-175-morti-in-un-8354c44a) (snippet)
- Missing the P.IVA on the homepage carries a fine of €250–2,000. — [Fiscomania](https://fiscomania.com/indicazioni-obbligatorie-siti-web)
- The cookie banner must allow reject, and scrolling is not consent. — [Garante 9677876](https://www.garanteprivacy.it/home/docweb/-/docweb-display/print/9677876)
- The bonus rules changed in 2025 and 2026 (fossil boilers excluded, rates split by prima casa), so older copy is wrong. — [Sky TG24](https://tg24.sky.it/economia/2026/01/07/bonus-casa-2026-aliquote), [Sky TG24 caldaie](https://tg24.sky.it/economia/2026/10/20/bonus-caldaia-2026-scadenza-domande)
- CNA has a 2026 document on the use of the "artigianale" claim, so that wording may carry rules or guidance (not read). — [CNA, L'utilizzo del claim artigianale](https://marketing.cna.it/wp-content/uploads/2026/05/LUTILIZZO-DEL-CLAIM-ARTIGIANALE-2.pdf)

### Inferences
- Detectable mistake flags for the rubric: no `tel:` link; phone only as an image; P.IVA missing; `superbonus`/`110%`/`sconto in fattura` presented as current; copyright year ≤2023 in the footer; Maps/YouTube iframes at load; `fonts.googleapis.com`; a form without a privacy link or checkbox text (`informativa`, `privacy`); generic slogans only (`qualità`, `professionalità`, `serietà`, `cortesia` with no numbers or facts); stock-image filenames; no address or zone; "pronto intervento 24h" claimed while the opening hours say otherwise (cross-check).
- Tone: in Italian, use "tu" or a neutral impersonal register consistently. Avoid fake scarcity ("ultimi posti", countdowns). Concrete reassurance is better: "sopralluogo e preventivo scritto prima di iniziare", "prezzi indicati nel preventivo", "puliamo il cantiere a fine lavori". Each claim needs client confirmation and a `[TODO]` when missing (project rule).
- Price display: trades customers want price transparency, but stated prices are client facts and must never be invented.

### Gaps
- No Italian consumer study found on tone preferences or on scam/abusive-practice warnings (e.g. AGCM cases on "pronto intervento" call-centre pricing). Worth a targeted search: AGCM fined fake locksmith/plumber networks in the past (not sourced this session).

---

## 7) Open doubts

### Takeaway
The main uncertainties: no Italian conversion data by channel; marketplace status in 2026 (Habitissimo); bonus rates from 2027 onwards; the F-gas transition to Reg. 2024/573 (an Italian implementing decree is apparently still pending); several primary texts (DM 37, art. 35, art. 2250, Codice del consumo art. 59) read only through secondary sources.

### Cited Findings
- No Italian implementing decree for Reg. (UE) 2024/573 was found, and accredited-body rules and FAQs are still expected. — [Certifico vademecum 10/2025](https://certifico.com/component/acym/archive/772-vademecum-decreto-f-gas-2025-update-24-ottobre-2025)
- Bonus rates for 2027–2033 differ between press sources. — [Quotidiano.net](https://www.quotidiano.net/speciali/servizi/bonus-edilizi-2026-le-nuove-regole-tra-sconti-sulla-prima-abitazione-e-tagli-ai-redditi-c4fb2d38), [FiscoeTasse](https://www.fiscoetasse.com/new-rassegna-stampa/2812-bonus-casa-2026-proroga-delle-aliquote-attuali.html)
- The Legge di Bilancio 2027 is being discussed in November 2026, so the bonus figures may change again from 1/1/2027 (inference from the timing; no source read on the 2027 manovra).

### Inferences
- The rubric should store bonus rules as a dated config (valid_from/valid_to), not hard-coded, and re-check them every January.
- Credential checks should be "claim present" (auto) plus "claim verified" (manual: visura camerale, F-gas register, INL patente portal).

### Gaps
- Network hosts to allow for a follow-up pass: schema.org, tinuiti.com, provincia.bz.it (DM 37 PDF); also normattiva.it and agenziaentrate.gov.it should be fetched directly for the primary texts.
- Not researched: Checkatrade/Houzz/Angi conversion data, Google's position on review markup, AGCM cases on trades call centres, DURC and insurance display, the Lombardy-specific register for impianti termici (CURIT) relevant to caldaie maintenance (not sourced).
