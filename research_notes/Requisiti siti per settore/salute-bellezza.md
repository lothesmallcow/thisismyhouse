# Requisiti siti per settore – Salute e Bellezza (Milano / Italia, stato a nov. 2026)

Scope: two separate sub-groups.
- **SALUTE (H)**: dentista / studio odontoiatrico, fisioterapista, osteopata, psicologo, nutrizionista (biologo o dietista o medico), medico specialista privato.
- **BELLEZZA (B)**: estetista / centro estetico, parrucchiere / barbiere (acconciatore), centro benessere / spa, nail salon.

Research method note: in this session web *fetch* was blocked by the network sandbox (hosts like omceopr.it and ordinepsicologi.piemonte.it failed to resolve), so every finding below comes from search-engine result summaries/snippets, not full-page reads. Treat all legal wording as **snippet-level** until checked on Normattiva / Gazzetta Ufficiale / the ordine's PDF. Items marked **[training knowledge, not verified this session]** come from prior knowledge and must be re-verified before they are hard-coded into the scorer.

---

## 1) Sub-sectors and primary conversion

### Takeaway
Health: phone is still the dominant booking channel in Italy, but online booking (own site or MioDottore) is a strong and growing second; the conversion block should offer phone + online booking + (where acceptable) WhatsApp, plus a non-clinical request form. Beauty: online booking 24/7 is the main lever (about half of bookings happen outside opening hours according to Treatwell), with WhatsApp/phone as backup.

### Cited Findings
- MioDottore survey: phone remains the main booking method (53%), while 24% would like to book via online platforms — [sanita-digitale.com](https://www.sanita-digitale.com/tendenze/miodottore-come-cambia-il-coinvolgimento-del-paziente-nel-percorso-di-cura/) (snippet; survey year not visible).
- A "recent" MioDottore survey: 40% of Italian patients prefer to book online and 84% read reviews before choosing a professional — reported in search summary of MioDottore pages, e.g. [connect.miodottore.it](https://connect.miodottore.it/quando-i-pazienti-prenotano-e-quando-no-guida-alla-visibilit%C3%A0-online-tra-stagionalit%C3%A0-profilo-e-investimento) (snippet; exact page/year not confirmed — vendor data).
- MioDottore commercial page claims 85% of patients prefer online medical booking (no year/method) — [pro.miodottore.it](https://pro.miodottore.it/blog/dottori/topic/marketing/post/4-motivi-per-i-quali-tu-e-tuoi-pazienti-amerete-le-prenotazioni-online) (vendor marketing, low weight).
- Older MioDottore survey (1,000 respondents): 30% of Italians searched and booked visits online in 2018 — [Focus Online](https://www.focus-online.it/news_dettaglio.php?id=5661&testo=tecno&da=ricerca) (outdated).
- Case study SIOM: 63% of bookings from digital channels; online bookings overtook phone bookings from January 2026; from 90 to 270+ bookings/month — [pro.miodottore.it](https://pro.miodottore.it/storie-di-successo/da-90-a-oltre-270-prenotazioni-al-mese-la-crescita-digitale-di-siom) (vendor case study).
- Third-party blog cites "Osservatorio Sanità Digitale Politecnico di Milano 2025": 73% of Italians would like to book directly from the practice website, only 28% of practices offer it — [ivemind.com](https://ivemind.com/en/blog/website-online-booking-medical-practices/) (**unverified secondary citation; original report not found**).
- Treatwell: about half of bookings are made online outside opening hours; salons can receive up to 50% of appointments outside opening times; another Treatwell guide says 47% — [Treatwell partners blog](https://www.treatwell.it/partners/risorse/blog/software-saloni-perche-passare-al-digitale/), [Treatwell riprenotare](https://www.treatwell.it/partners/risorse/blog/far-riprenotare-i-clienti-del-salone/) (vendor estimates).
- Treatwell Italy: ~15,000 partner salons, 5+ million bookings/year in Italy — [Italia Economy](https://italiaeconomy.it/treatwell-il-beauty-diventa-digitale/) (date unclear).

### Inferences
| Sub-sector | Primary conversion | Secondary |
|---|---|---|
| H Dentista | Telefono (prima visita) + prenotazione online / richiesta appuntamento | WhatsApp, form "richiedi una prima visita" |
| H Fisioterapista / osteopata | Prenotazione online (MioDottore, Calendly-like) + telefono | WhatsApp |
| H Psicologo | Contatto riservato: email/telefono/form "primo colloquio"; spesso MioDottore/Unobravo-like | Videoconsulto info |
| H Nutrizionista | Prenotazione online + telefono | WhatsApp |
| H Medico specialista | Telefono / MioDottore / iDoctors | Form |
| B Parrucchiere/barbiere | Prenota online 24/7 (Treatwell/Fresha/Booksy/Planity) | WhatsApp, telefono |
| B Estetista / nail | Prenota online + WhatsApp | Telefono |
| B Spa / centro benessere | Prenota online / acquisto pacchetti, gift card | Telefono, email |
- Health conversion data is almost all vendor-produced (Docplanner/MioDottore); treat percentages as directional, not as benchmarks.

### Gaps
- No independent (non-vendor) Italian study found on conversion drivers for health or beauty sites; Politecnico Osservatorio figure unverified.
- No Fresha/Booksy/Planity Italian data retrieved.

---

## 2) Must-have elements ranked by impact (with detectability)

Detectability legend: **Y** = reliably detectable from homepage HTML; **P** = partial/heuristic; **N** = not detectable automatically.

### 2A. SALUTE (health)

### Takeaway
Highest impact: a clear contact/booking block (tel link + online booking), visible services, practitioner identity with Albo/Ordine registration, location/map link, reviews (off-site via MioDottore/Google), mobile usability, and legally mandatory identity data (P.IVA, titolare, direttore sanitario for structures). Price display is legally allowed (Bersani/DPR 137/2012) but promotional pricing (sconti, offerte) is restricted by comma 525.

### Cited Findings
- 84% of patients read reviews before choosing (MioDottore survey, vendor) — [connect.miodottore.it](https://connect.miodottore.it/quando-i-pazienti-prenotano-e-quando-no-guida-alla-visibilit%C3%A0-online-tra-stagionalit%C3%A0-profilo-e-investimento) (snippet).
- Price and overall costs, titles, specialisations, service characteristics are legally permitted content of informative advertising (Bersani L. 248/2006 art. 2; DPR 137/2012 art. 4 c.1 "la struttura dello studio professionale e i compensi richiesti per le prestazioni") — [Normattiva DPR 137/2012](https://www.normattiva.it/eli/stato/DECRETO_DEL_PRESIDENTE_DELLA_REPUBBLICA/2012/08/07/137/CONSOLIDATED); [L. 248/2006 PDF](https://www.odmeo.re.it/wp-content/uploads/2015/04/L_248-2006.pdf); confirmed as still permitted after the 2023 rewrite of comma 525 — [studiolegaledelliponti.eu](https://www.studiolegaledelliponti.eu/pubblicita-delle-strutture-sanitarie-private-le-novita-del-2023/).
- Comma 525 (current text, after DL 69/2023 conv. L. 103/2023) excludes "qualsiasi elemento di carattere attrattivo e suggestivo, tra cui comunicazioni contenenti offerte, sconti e promozioni, che possa determinare il ricorso improprio a trattamenti sanitari" — [Lexology / Studio Stefanelli](https://www.studiolegalestefanelli.it/it/approfondimenti/il-dl-n-692023-modifica-le-regole-e-i-divieti-della-pubblicita-sanitaria-cosa-cambia-rispetto-a-prima), [itacalab.it](https://itacalab.it/le-nuove-regole-della-pubblicita-commerciale-in-ambito-sanitario/) (secondary; verify on Normattiva).
- FNOVI guideline (veterinary, but same comma 525 framework) on websites: must comply with D.Lgs. 70/2003 and show name/ragione sociale, recapito professionale/sede legale and number of autorizzazione sanitaria; no banner/pop-up advertising — [FNOVI appendix PDF](https://mail.fnovi.it/sites/default/files/_Pubblicit%C3%A0%20Sanitaria%20-%20LineeGuida%20-%20Appendice.pdf) (analogy only; medici/odontoiatri ordini have similar regolamenti, e.g. [OMCeO Reggio Emilia regolamento](https://www.odmeo.re.it/wp-content/uploads/2020/01/Regolamentoinformazionesanitaria.pdf)).
- Physiotherapy: Albo registration is mandatory to practise — [FNOFI OFI Catanzaro](https://fnofi.it/ofi-catanzaro/wp-content/uploads/sites/14/2024/01/ISCRIZIONE-ALLALBO-DELLORDINE-PROFESSIONALE-1.pdf); FNOFI pubblicità document restates DPR 137/2012 art. 4 — [FNOFI Catanzaro pubblicità](https://fnofi.it/ofi-catanzaro/wp-content/uploads/sites/14/2025/02/pubblicita.pdf).

### Inferences – Health checklist (ranked)
| # | Element | Why / evidence | Det. | Detection signals (homepage HTML) |
|---|---|---|---|---|
| 1 | Telefono cliccabile above the fold | Phone = 53% of bookings (MioDottore) | Y | `href="tel:`; text "Chiama", "Telefono", `+39 02` (Milano) |
| 2 | Prenotazione online / richiesta appuntamento | Growing channel; vendor surveys | Y | links/scripts to miodottore.it, docplanner, idoctors.it, dottori.it, calendly.com, cal.com; words "Prenota", "Prenota una visita", "Prenota online", "Prima visita", "Richiedi appuntamento" |
| 3 | Elenco prestazioni / servizi | Core informative content allowed by Bersani | Y/P | headings "Prestazioni", "Servizi", "Trattamenti", "Cure", sector terms (implantologia, ortodonzia, igiene dentale, riabilitazione, terapia manuale, psicoterapia, piano alimentare) |
| 4 | Professionista identificato + titolo + iscrizione Albo/Ordine (numero) | Deontology/ordini require truthful titles; registration mandatory | P | "iscritto/a all'Albo", "Ordine dei Medici", "OMCeO Milano", "Albo degli Odontoiatri", "Ordine degli Psicologi della Lombardia", "Ordine dei Fisioterapisti", "TSRM PSTRP", "n. iscrizione", regex `(albo|ordine)[^.]{0,80}n\.?\s?\d+`; "Dott.", "Dott.ssa" |
| 5 | Direttore sanitario (strutture/società, esp. odontoiatriche) | L.145/2018 c.536 + L.124/2017 | P | "Direttore Sanitario", "Dir. San.", "Responsabile sanitario"; required only for structures, not single-professional studio |
| 6 | Autorizzazione sanitaria (strutture) | Ordini guidelines (FNOVI analogy) | P | "Autorizzazione sanitaria", "aut. n.", "ATS Milano", "SCIA"; N for single professionals where not needed |
| 7 | Indirizzo + link mappa (non embed) | Local intent; CLAUDE.md rule | Y | `<address>`, "Via ... Milano", CAP `201\d\d`, links `maps.google`, `google.com/maps`, `maps.app.goo.gl`, `goo.gl/maps`; flag iframe `google.com/maps/embed` as third-party request |
| 8 | Orari / modalità di ricevimento | Practical | Y/P | "Orari", "Lun", "Lunedì", "su appuntamento", `openingHours` in JSON-LD |
| 9 | Recensioni (link a MioDottore/Google, no testimonianze costruite) | 84% read reviews (vendor) | P | links to miodottore.it profile, `g.page`, `search.google.com/local/writereview`, widget names (Trustindex, Elfsight); see legal caution in §3 |
| 10 | Prezzi / tariffe (informative, no sconti) | Allowed (Bersani, DPR 137/2012 art.4) | P | "€", "Tariffe", "Costo della prima visita", "Onorario"; RED FLAG words: "sconto", "offerta", "promo", "gratis", "% di sconto", "Black Friday", "prima visita gratuita" |
| 11 | Mobile-ready | General UX | Y | `<meta name="viewport"`, responsive CSS; Lighthouse |
| 12 | P.IVA in homepage | DPR 633/72 art.35 [training knowledge] | Y | regex `P\.?\s?IVA[:\s]*\d{11}`, "Partita IVA" |
| 13 | Privacy + cookie policy links, banner only if non-technical cookies | GDPR / Garante 10/6/2021 | Y | links "Privacy", "Cookie", iubenda.com scripts, cookiebot, CMP |
| 14 | Note on percorso/accessibilità, convenzioni (assicurazioni, SSN no/si) | Practical trust | P | "convenzionato", "fondi integrativi", "UniSalute", "accessibile" |
| 15 | Bio/CV, formazione, aree di specializzazione | Credentials allowed content | P | "Chi sono", "Curriculum", "Formazione", "Specializzazione in", "Laurea in" |

### 2B. BELLEZZA (beauty)

### Takeaway
Highest impact: a 24/7 "Prenota" button (platform or own), listino prezzi/servizi, WhatsApp/phone, photos of real work and the salon, reviews, location and hours. Price display is also an operational/regulatory norm (tariffe esposte, municipal/regional rules). Avoid medical/therapeutic claims: by law the estetista excludes therapeutic services.

### Cited Findings
- ~50% / 47% of salon bookings occur outside opening hours (Treatwell) — [Treatwell blog](https://www.treatwell.it/partners/risorse/blog/software-saloni-perche-passare-al-digitale/).
- Treatwell app sells: book at any hour, read reviews, cancel/reschedule 24/7 without phone calls — [App Store](https://apps.apple.com/it/app/treatwell-la-bellezza-%C3%A8-qui/id814443140).
- Municipal/regional rules for acconciatori/estetisti include the obligation and modalities of "esposizione dei prezzi e delle tariffe professionali praticati al pubblico" — e.g. [Comune di Piacenza regolamento](https://www.comune.piacenza.it/s3/5141/allegati/documenti-e-dati/atto-normativo/regolamenti/regolamenti-criteri-e-indirizziattivit-economiche-commercio-regolamenti/regolamento-acconciatore-estetista-tatuatore_approvato.pdf), [Comune di Cuneo](https://www.comune.cuneo.it/fileadmin/comune_cuneo/content/amm_organiz/attivita_promozionali_produttive/regolamenti/Regolamento_att_acconciatore_estetista.pdf) (these concern in-shop display, not the website).
- L. 1/1990 art. 1 c.3: "Sono escluse dall'attività di estetista le prestazioni dirette in linea specifica ed esclusiva a finalità di carattere terapeutico" — [MIMIT PDF](https://www.mimit.gov.it/images/stories/normativa/legge1_1990-attivita-estetista.pdf), [Regione Veneto](https://www.regione.veneto.it/static/www/attivita-produttive/L11990.pdf).
- Acconciatori: qualification under L. 174/2005; estetisti under L. 1/1990 — [CCIAA Ravenna](https://ra.camcom.gov.it/rec-albi-ruoli/albo-imprese-artigiane/normativa-e-direttive-regionali-1/legge-n.-174-del-17-agosto-2005).

### Inferences – Beauty checklist (ranked)
| # | Element | Why | Det. | Detection signals |
|---|---|---|---|---|
| 1 | Pulsante "Prenota" 24/7 above the fold | ~half bookings off-hours | Y | links to treatwell.it, fresha.com, booksy.com, planity.com, uala.it, wavy, phorest, calendly; text "Prenota ora", "Prenota online", "Prenota appuntamento" |
| 2 | Listino / prezzi per servizio | Price transparency; in-shop obligation; key for choice | Y/P | "Listino", "Prezzi", "Tariffe", "€", "a partire da", "da €"; tables/lists with service + price |
| 3 | WhatsApp + telefono | Preferred quick channel | Y | `wa.me/`, `api.whatsapp.com/send`, `whatsapp://`, `tel:` |
| 4 | Servizi elencati per categoria | Search/choice | Y/P | "Taglio", "Piega", "Colore", "Balayage", "Barba", "Manicure", "Semipermanente", "Ceretta", "Pulizia viso", "Massaggio", "Percorso spa", "Day spa" |
| 5 | Foto reali di lavori e del salone | Trust; visual sector | P | count of `<img>`/`<picture>`, gallery section "Galleria", "Lavori", Instagram links |
| 6 | Recensioni | Social proof (platform ratings) | P | Treatwell/Fresha/Google rating widgets, "recensioni", stars, `aggregateRating` |
| 7 | Indirizzo, mappa link, orari | Local | Y | as health |
| 8 | Team / stilisti | Personal choice of operator | P | "Team", "Il nostro staff", names |
| 9 | Gift card / pacchetti (spa, estetica) | Revenue | P | "Gift card", "Buono regalo", "Pacchetti", "Abbonamento" |
| 10 | Policy cancellazione/ritardo | Reduces no-show | P | "cancellazione", "disdetta", "24 ore" |
| 11 | P.IVA, privacy, cookie | Legal | Y | as health |
| 12 | No medical claims | L.1/1990 art.1 c.3; consumer law | P | RED FLAG words: "cura", "terapeutico", "guarisce", "elimina la cellulite definitivamente", "dimagrimento garantito", "medicale", "laser medicale", "anti-caduta clinicamente", "risultati garantiti" |

### Gaps
- No Italian study quantifying the effect of price lists or bios on conversion for either group.
- No source found on whether website price display is mandatory for beauty (rules found concern display in the shop).

---

## 3) Legal rules with sources

### Takeaway
Health sites in Italy may publish only "informative" advertising: titles, specialisations, service characteristics, prices and costs (Bersani 2006 / DPR 137/2012) but no attractive/suggestive elements such as offers, discounts, promotions that may lead to improper recourse to treatment (L. 145/2018 c.525 as rewritten in 2023). Ordini control compliance; dental/health structures need a direttore sanitario. Health data in forms is art. 9 GDPR special-category data. Beauty: no therapeutic claims (L. 1/1990), price display rules are local and in-shop.

### Cited Findings
**Health advertising**
- L. 248/2006 (conv. DL 223/2006 "Bersani") art. 2: removed bans on informative advertising of titles, specialisations, service characteristics, price and overall costs, "secondo criteri di trasparenza e veridicità del messaggio il cui rispetto è verificato dall'ordine" — [L. 248/2006 PDF](https://venezia.ordingegneri.it/wp-content/uploads/sites/100/2024/05/Legge_4_agosto_2006_n_248.pdf); Corte Cost. 443/2007 upheld — [cortecostituzionale.it](https://www.cortecostituzionale.it/elenco-massime/singola/15356).
- DPR 137/2012 art. 4 c.1: "È ammessa con ogni mezzo la pubblicità informativa avente ad oggetto l'attività delle professioni regolamentate, le specializzazioni, i titoli posseduti attinenti alla professione, la struttura dello studio professionale e i compensi richiesti per le prestazioni"; c.2: functional to the object, truthful, correct, no breach of professional secrecy, not equivocal, misleading or denigratory — [Normattiva](https://www.normattiva.it/eli/stato/DECRETO_DEL_PRESIDENTE_DELLA_REPUBBLICA/2012/08/07/137/CONSOLIDATED); [FNOFI](https://fnofi.it/ofi-catanzaro/wp-content/uploads/sites/14/2025/02/pubblicita.pdf).
- L. 145/2018 art. 1 c.525 original (2019): communications of private health structures and of iscritti agli albi "funzionali a garantire la sicurezza dei trattamenti sanitari, escluso qualsiasi elemento di carattere promozionale o suggestivo" — [OMCeO Frosinone PDF](https://www.ordinemedicifrosinone.it/fr/attachments/article/13/Nuove%20disposizioni%20in%20materia%20di%20pubblicit%C3%A0%20sanitaria(1).pdf), [FNOVI](https://fnovi.it/node/47871).
- c.525 rewritten by DL 69/2023 (conv. L. 103/2023, in force Aug 2023): now excludes "qualsiasi elemento di carattere attrattivo e suggestivo, tra cui comunicazioni contenenti offerte, sconti e promozioni, che possa determinare il ricorso improprio a trattamenti sanitari" — [Studio Stefanelli](https://www.studiolegalestefanelli.it/it/approfondimenti/il-dl-n-692023-modifica-le-regole-e-i-divieti-della-pubblicita-sanitaria-cosa-cambia-rispetto-a-prima), [Lexology](https://www.lexology.com/library/detail.aspx?g=c855c817-fb0c-4ab9-8311-b6a18fbd81f4), [Studio Delli Ponti](https://www.studiolegaledelliponti.eu/pubblicita-delle-strutture-sanitarie-private-le-novita-del-2023/). Commentators disagree on scope: some read it as a near-general ban, others say only what is attractive/suggestive enough to cause improper treatment is excluded (same sources). **Verify current text on Normattiva.**
- Enforcement (c.536): ordini act disciplinarily and report to AGCOM (not AGCM) for sanctions against client companies — [itacalab](https://itacalab.it/le-nuove-regole-della-pubblicita-commerciale-in-ambito-sanitario/), [Portolano Cavallo](https://portolano.it/newsletter/portolano-cavallo-inform-life-sciences/the-2019-budget-law-restricts-the-scope-of-health-services-advertising).
- Direttore sanitario: c.536 L.145/2018 requires private health structures (incl. dental) to have a direttore sanitario iscritto all'ordine of the territory where the structure operates; a later amendment proposal allowed registration in another ordine with communication to the local one (approval not confirmed) — [Quotidiano Sanità](https://www.quotidianosanita.it/?p=84206), [OMCeO RE COM 15](https://www.odmeo.re.it/wp-content/uploads/2022/01/COM_15.pdf). L. 124/2017 (Concorrenza) required dental structures run by companies to have a direttore sanitario iscritto all'albo degli odontoiatri — [Quotidiano Sanità](https://www.quotidianosanita.it/governo-e-parlamento/ddl-concorrenza-approvato-emendamento-su-direttore-sanitario-per-societ-odontoiatriche-andi-si-poteva-fare-di-pi-su-societ-di-capitali/). In polyspecialist clinics whose DS is not an odontoiatra, a "responsabile dei servizi odontoiatrici" is required — same QS source.
- L. 175/1992 (pubblicità sanitaria) is cited by CAO president Senna as prohibiting attractive/suggestive elements such as discounts/promotions; TAR Genova confirmed partial legitimacy — [Quotidiano Sanità](https://www.quotidianosanita.it/?p=62063).
- FNOMCeO Codice di Deontologia Medica 2014 (mod. 2016) artt. 55–57: art. 56 "Pubblicità informativa sanitaria" must be "veritiera, corretta e funzionale all'oggetto dell'informazione, mai equivoca, ingannevole e denigratoria"; Ordine provinciale verifies; comparative advertising of services not allowed — [OMCeO RE allegato artt. 55-57](https://www.odmeo.re.it/wp-content/uploads/2024/07/Medici-e-uguale-Odontoiatri-Informazione-e-pubblicita-sanitaria-da-inserire-come-allegato-CDM-Artt-55-56-e-57.pdf), [AGCM I738 2013](https://www.agcm.it/dotcmsDOC/allegati-news/I738_provv_13_set_2013.pdf) (snippet). AGCM fined FNOMCeO in 2014 for restricting advertising — [Quotidiano Sanità](https://www.quotidianosanita.it/lavoro-e-professioni/antitrust-fnomceo-difenderemo-l-autonomia-e-l-indipendenza-della-nostra-deontologia/).
- CNOP Codice deontologico psicologi, revision in force 1 Dec 2023; art. 40 "Pubblicità professionale": informative advertising on titles, specialisations, service characteristics, price and overall costs, transparent and truthful, verified by the Ordine — [psy.it vigente](https://www.psy.it/la-professione-psicologica/codice-deontologico-degli-psicologi-italiani/codice-deontologico-vigente/), [OP Veneto PDF](https://www.ordinepsicologiveneto.it/wp-content/uploads/2023/12/CODICE-DEONTOLOGICO-DELLE-PSICOLOGHE-E-DEGLI-PSICOLOGI-ITALIANI.pdf), [OP FVG](https://www.ordinepsicologifvg.it/images/professione/CDPI__2023_clean_1_dicembre_2023.pdf). The code does not explicitly mention reviews; an OP Lazio vademecum (Mar 2023) addresses online self-presentation — [sistemarecensioni.it](https://sistemarecensioni.it/blog/marketing-psicologi) (secondary).
- Fisioterapisti: Albo since L. 3/2018 (Lorenzin) within FNO TSRM-PSTRP — [L. 3/2018 PDF](https://www.fisioterapia.unifi.it/upload/sub/Legge%203-2018.pdf); in 2022 a DM created separate Ordini dei Fisioterapisti and their federation (FNOFI) — [TSRM-PSTRP circolare 59/2022](https://www.tsrm-pstrp.org/wp-content/uploads/2022/12/Circolare-59-2022-adempimenti-a-seguito-della-pubblicazione-del-DM-Ordini-Fisioterapisti-e-relativa-Federazione-nazionale.pdf). So in 2026 the correct reference is "Ordine dei Fisioterapisti (OFI) di …", not TSRM-PSTRP.
- Testimonials, before/after photos: **no explicit national rule found** in the sources; they fall under the "attrattivo e suggestivo" test of c.525 and deontology (veritiera, non equivoca). Ordini/CAO have asked for preventive control and sanctions against misleading dental ads (Vitaldent fined by AGCM) — [Quotidiano Sanità](https://www.quotidianosanita.it/?p=59462), [FNOMCeO lettera](https://portale.fnomceo.it/wp-content/uploads/2022/10/LETTERA-SU-PUBBLICITA-SANITARIA.pdf).

**GDPR / health data**
- Garante "Compendio" on platforms connecting patients and health professionals (2024): booking and document-sharing; account creation and booking are treated as an administrative service requested by the user, not traceable to care purposes under art. 9(2)(h) — [Garante PDF](https://www.garanteprivacy.it/documents/10160/0/Compendio+sul+trattamento+dei+dati+personali+attraverso+piattaforme+volte+a+mettere+in+contatto+i+pazienti+con+i+professionisti+sanitari+accessibili+via+web+e+app.pdf/7fc9ca53-f078-af9b-248d-a71dee74da07?version=2.0&download=true), [Federprivacy](https://www.federprivacy.org/informazione/garante-privacy/siti-e-app-per-il-contatto-tra-medico-e-paziente-le-indicazioni-del-garante-per-la-privacy), [DottNet 1/4/2024](https://www.dottnet.it/articolo/32536110/garante-privacy-come-utilizzare-siti-e-app-che-mettono-in-contatto-medici-e-pazienti) (snippet; legal basis detail not read).
- Practice guidance: contact forms should collect only callback data; a free-text "describe your symptoms" field collects unneeded health data; privacy notice next to each form; cookie banner per Garante guidelines of 10 June 2021 — [doctor-web.it](https://www.doctor-web.it/modulo-contatto-studio-medico-privacy/), [appuntoo.com](https://appuntoo.com/blog/gdpr-studio-medico/) (secondary blogs).

**Identity / commerce**
- Website identity data for health per ordini guidance: D.Lgs. 70/2003 (e-commerce: name/ragione sociale, address, contacts, registration, P.IVA) — [FNOVI appendix](https://mail.fnovi.it/sites/default/files/_Pubblicit%C3%A0%20Sanitaria%20-%20LineeGuida%20-%20Appendice.pdf).
- DPR 633/72 art. 35: P.IVA must appear on the website homepage — **[training knowledge, not verified this session]**; verify on Normattiva.

**Beauty**
- L. 1/1990 art. 1 c.3 excludes therapeutic services from estetista activity — [MIMIT](https://www.mimit.gov.it/images/stories/normativa/legge1_1990-attivita-estetista.pdf).
- Comuni control tariff display and health rules; can suspend activity after warning (art. 10 L.1/1990 referenced in regional regulations) — [Regione Piemonte doc](https://www.regione.piemonte.it/web/media/13420/download) (snippet).
- Medicina estetica (filler, botox, laser medicale) is a medical act and falls under health advertising rules, a frequent grey area for platforms — [Filodiritto](https://www.filodiritto.com/medicina-estetica-e-piattaforme-digitali-come-trovare-il-medico-estetico-tra-vuoti-normativi-e-nuove-tutele) (snippet).

### Inferences
- Scorer legal red flags (health): "sconto", "offerta", "promozione", "gratis/gratuito" (esp. "prima visita gratuita", "igiene gratis"), "% off", countdowns, "il migliore", "n.1", "senza dolore garantito", "risultati garantiti", comparative claims vs. competitors, before/after galleries, patient testimonials with names/photos. Detectable as keyword presence: **Y** (presence), **N** (legal judgement). Report as "da verificare", not as "violazione".
- Health required identity (to score): titolare name + title, Ordine + n. iscrizione, P.IVA, sede; for structures also direttore sanitario (name + ordine) and autorizzazione sanitaria.
- Osteopata: profession recognised as sanitaria by L. 3/2018 but albo/ordine status in 2026 not verified here — treat "iscrizione albo" as not yet scoreable for osteopaths.
- Nutrizionista: can be biologo (Ordine dei Biologi / FNOB), dietista (Ordine TSRM-PSTRP) or medico; the scorer should accept any of these ordini [training knowledge].

### Gaps
- Exact current text of c.525 and c.536 not read on Normattiva (fetch blocked).
- No authoritative source on before/after photos or testimonials in health; OMCeO Milano/CAO Milano specific guidance not retrieved.
- FNOFI codice deontologico text and any rule on showing albo number online not found.
- Osteopati albo status 2026; Ordine dei Biologi rules on nutritionist advertising: not researched.
- Beauty: no AGCM decisions on centri estetici medical claims retrieved.

---

## 4) Platform detection list

### Takeaway
Detect platforms by outbound link domains and script src. Health: MioDottore (Docplanner), iDoctors, Dottori.it, Calendly/Cal.com. Beauty: Treatwell (merged with Uala, 2022), Fresha (formerly Shedul), Booksy, Planity, Phorest. Patterns below are mostly from training knowledge and must be validated on real sites.

### Cited Findings
- MioDottore is the Italian brand of the Docplanner group — [TechPrincess](https://techprincess.it/docplanner-google-miodottore/); app id `it.docplanner` — [Google Play](https://play.google.com/store/apps/details?id=it.docplanner).
- Treatwell and Uala merged into one group under the Treatwell name (completed Sept 2022) — [Spa Business](https://www.spabusiness.com/wellness-news/Treatwell-completes-merger-with-Uala/350041), [Treatwell](https://www.treatwell.it/partners/risorse/blog/treatwell-uala-si-uniscono-unico-gruppo/).
- Koalendar can be embedded on site or MioDottore/Google profile — [Koalendar](https://koalendar.com/it/software-prenotazioni-per/medico); Cal.com embed — [cal.com](https://cal.com/it/embed).

### Inferences – detection table [patterns from training knowledge, verify]
| Platform | Group | Signals in HTML |
|---|---|---|
| MioDottore / Docplanner | H | `miodottore.it/`, `docplanner.com`, `platform.docplanner.com/js/widget.js`, class `zl-url`, `data-zlw-` attrs |
| iDoctors | H | `idoctors.it` |
| Dottori.it | H | `dottori.it` |
| Prenota Visita / altri | H | `prenotavisita` (domain unverified), `doctolib` (not in IT, ignore), `unobravo.com`, `serenis` (psicologi online) |
| Calendly | H/B | `calendly.com/`, `assets.calendly.com/assets/external/widget.js` |
| Cal.com / Koalendar / SimplyBook / Setmore | H/B | `cal.com/`, `koalendar.com`, `simplybook.`, `setmore.com` |
| Treatwell (+Uala) | B | `treatwell.it/salone/`, `widget.treatwell`, `uala.it`, `uala.com` |
| Fresha (ex Shedul) | B | `fresha.com/`, `fresha.com/a/`, `fresha.com/book-now/`, `shedul.com` |
| Booksy | B | `booksy.com/it-it/`, `booksy.com/widget` |
| Planity | B | `planity.com/` |
| Phorest | B | `phorest.com`, `phorest.me` |
| Wavy | B | `wavy` (domain unverified) |
| WhatsApp | both | `wa.me/`, `api.whatsapp.com/send`, `whatsapp://` |
| Telefono | both | `tel:` |
| Mappa | both | `google.com/maps`, `maps.app.goo.gl`, `goo.gl/maps`; embed `google.com/maps/embed` (third-party load) |
| Privacy/cookie | both | `iubenda.com`, `cdn.iubenda.com`, `cookiebot.com`, `cookieyes` |

### Gaps
- No official MioDottore/Treatwell/Fresha/Booksy widget documentation retrieved; exact script URLs unverified.
- Prenota Visita and Wavy domains not confirmed.

---

## 5) Schema.org types

### Takeaway
Health: Dentist, Physician (with subtypes IndividualPhysician / PhysiciansOffice since schema.org v24, Jan 2024), MedicalClinic, MedicalBusiness; Physiotherapy is a MedicalSpecialty value, not a type. Beauty: HealthAndBeautyBusiness subtypes BeautySalon, HairSalon, DaySpa, NailSalon, HealthClub.

### Cited Findings
- Schema.org v24.0 (9 Jan 2024) split Physician into IndividualPhysician (single practitioner, under MedicalOrganization, with `practicesAt`) and PhysiciansOffice (practice, under MedicalBusiness) — [Schema App](https://www.schemaapp.com/schema-app-news/schema-org-v24-0-release-changes-to-physician-schema-markup/).
- MedicalClinic, Physician, Dentist moved to health-lifesci extension; canonical URIs unchanged, no markup broken — [Search Influence](https://searchinfluence.com/?p=19112).
- Physiotherapy is a member of the MedicalSpecialty enumeration, used as value of `medicalSpecialty` — [Schema App summary](https://www.schemaapp.com/schema-app-news/schema-org-v24-0-release-changes-to-physician-schema-markup/), [google.schema.org/MedicalSpecialty](https://google.schema.org/MedicalSpecialty). (Note: schema.org also lists a `Physiotherapy` type under MedicalBusiness [training knowledge]; it is ambiguous — check schema.org/Physiotherapy.)
- HealthAndBeautyBusiness subtypes BeautySalon, DaySpa, HairSalon, HealthClub, NailSalon, TattooParlor — **[training knowledge, schema.org pages not fetched]**: https://schema.org/HealthAndBeautyBusiness

### Inferences
| Business | Recommended @type | Key props |
|---|---|---|
| Dentista | `Dentist` | name, address, telephone, openingHoursSpecification, geo, url, priceRange, `employee`/`member` as IndividualPhysician? (dentists: Person with `hasCredential`) |
| Medico specialista | `IndividualPhysician` (person) or `PhysiciansOffice`/`MedicalClinic` | `medicalSpecialty`, `practicesAt` |
| Fisioterapista | `MedicalBusiness` (+ `medicalSpecialty: Physiotherapy`) or `Physiotherapy` | |
| Psicologo | `MedicalBusiness` + `medicalSpecialty: Psychiatric`? or `LocalBusiness`/`ProfessionalService` — no exact type | |
| Osteopata, nutrizionista | `MedicalBusiness` (`medicalSpecialty: Dietetic` for nutrition) | |
| Parrucchiere / barbiere | `HairSalon` | |
| Estetista | `BeautySalon` | |
| Nail | `NailSalon` | |
| Spa | `DaySpa` | |
- Detectable: **Y** (parse `application/ld+json`, check `@type`).
- Do NOT add `aggregateRating`/`review` built from own-site testimonials (Google self-serving review policy) [training knowledge].

### Gaps
- schema.org pages not fetched; no exact type for psychologist.

---

## 6) Tone and common mistakes

### Takeaway
Health tone: calm, factual, credible, no pressure, no promises, no discounts — this is not only style but law (c.525, art. 56 CDM, art. 40 CDPI, DPR 137/2012 art. 4). Beauty tone: warm, aspirational, still truthful; no therapeutic or guaranteed-result claims.

### Cited Findings
- Required qualities of health advertising: "veritiera, corretta e funzionale all'oggetto", "mai equivoca, ingannevole e denigratoria"; comparative forbidden (CDM art. 56) — [OMCeO RE](https://www.odmeo.re.it/wp-content/uploads/2024/07/Medici-e-uguale-Odontoiatri-Informazione-e-pubblicita-sanitaria-da-inserire-come-allegato-CDM-Artt-55-56-e-57.pdf).
- Common dental ad problem: discounted/low-price offers and foreign/low-cost chains; CAO asks AGCOM and FIEG to block misleading messages — [Quotidiano Sanità](https://www.quotidianosanita.it/lavoro-e-professioni/odontoiatri-pubblicit-sanitaria-all-estero-il-cao-scrive-a-agcom-e-fieg-aiutateci-a-bloccare-i-messaggi-ingannevoli/), [Quotidiano.net](https://www.quotidiano.net/cronaca/dentisti-prezzi-bassi-1.1943004).
- Forms asking for symptoms collect unneeded health data — [doctor-web.it](https://www.doctor-web.it/modulo-contatto-studio-medico-privacy/).
- FNOVI analogy: no banner/pop-up ads on health websites — [FNOVI](https://mail.fnovi.it/sites/default/files/_Pubblicit%C3%A0%20Sanitaria%20-%20LineeGuida%20-%20Appendice.pdf).

### Inferences – common mistakes (scorer checks)
Health:
- Offers/sconti/"prima visita gratuita", countdowns, pop-up promos (c.525) — keyword **Y**.
- Missing Ordine + numero iscrizione, or vague titles ("specialista" without specialisation) — **P**.
- Missing direttore sanitario on clinic/società sites — **P**.
- Symptom free-text field / upload referti in contact form — **P** (detect `<textarea>` + labels "sintomi", "motivo della visita", `input type=file`).
- Google Maps iframe, YouTube embed, Google Fonts → third-party requests before consent — **Y**.
- Stock photos of smiling models instead of real studio/team — **N/P**.
- Before/after galleries, patient testimonials — **P** ("prima e dopo", "testimonianze", "dicono di noi").
- Superlatives: "il migliore", "n.1 a Milano", "garantito", "indolore", "miracoloso" — **Y**.
Beauty:
- No booking button or booking only by phone — **Y**.
- No prices ("prezzi in salone") — **Y**.
- Therapeutic claims ("cura", "terapia", "elimina definitivamente") — **Y** keyword.
- Medicina estetica offered by a centro estetico without named medico — **P**.
- Instagram-only content, no service list — **P**.

### Gaps
- No Italian sector study cataloguing common site mistakes; list above is inferred from rules.

---

## 7) Open doubts

### Takeaway
Key uncertainties remain on exact legal texts (not read in full), testimonials/before-after rules, platform script patterns, and health-data boundaries for the scorer.

### Cited Findings
- Commentators disagree on how broad the 2023 c.525 ban is — [Studio Stefanelli](https://www.studiolegalestefanelli.it/it/approfondimenti/il-dl-n-692023-modifica-le-regole-e-i-divieti-della-pubblicita-sanitaria-cosa-cambia-rispetto-a-prima), [Studio Delli Ponti](https://www.studiolegaledelliponti.eu/pubblicita-delle-strutture-sanitarie-private-le-novita-del-2023/).
- AGCM and AGCOM criticised the 2019 restrictions as disproportionate; EU Commissioner Breton said the bans don't harm competition — [Quotidiano Sanità](https://www.quotidianosanita.it/?p=119085).

### Inferences
- **Health data and the scorer**: the scorer only fetches public HTML and must never submit forms, open booking flows, follow logged-in patient areas or store form contents. Features that bring health data into the *client's* site: booking forms with "motivo della visita", symptom textareas, file upload of referti/prescrizioni, intake/anamnesi questionnaires, chat widgets, patient areas, email newsletters segmented by condition, analytics/pixels on booking pages (reveal that a person seeks a given care). For psicologi, even the fact of contacting the professional can reveal health information — treat all psicologo contact forms as sensitive. Our build checklist: prefer tel/WhatsApp/MioDottore (platform is the data controller/processor) over own forms; if a form is needed, only name + phone/email + preferred time, no free-text clinical field, plus privacy notice (iubenda).
- Under CLAUDE.md: a health site with a booking/contact form or MioDottore widget is no longer "sito statico senza moduli/embed" → privacy/cookie texts must come from iubenda.
- Beauty booking data is ordinary personal data; but some treatments (e.g. laser, trichology) may reveal health conditions — keep forms minimal too.

### Gaps
- Exact current text of L.145/2018 c.525/c.536, DPR 633/72 art.35, D.Lgs 70/2003 art.7 not verified on Normattiva in this session.
- OMCeO Milano / CAO Milano / OP Lombardia / OFI Milano-specific guidelines not retrieved.
- Whether MioDottore widget on own site counts as a third-party request at page load (very likely yes: it loads a script) – needs testing.
- Whether showing the albo number on the site is mandatory (vs. recommended) for each profession: no explicit source found.
- Osteopati (albo status), nutrizionisti (Ordine Biologi rules) not researched.
- Independent conversion benchmarks (non-vendor) missing for both groups.
