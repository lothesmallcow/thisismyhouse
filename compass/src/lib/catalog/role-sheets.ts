// Role sheets: what a job is, what it takes, typical age and pay by size of employer, adjusted to
// where the person wants to work. Figures are Compass's indicative estimates (gross per year, Milan
// as the reference, 2025-26 market levels from public salary surveys and typical offers): useful to
// compare, not to negotiate with. Always shown with that warning and the date.
import type { Place } from "../core/geo";

export interface RoleSheet {
  id: string;
  title: string;
  sector: string;
  /** Matches a job title to this sheet. */
  match: RegExp;
  description: string;
  tasks: string[];
  skills: string[];
  /** Experience usually asked, in words. */
  experience: string;
  /** Typical age range of people in the role. */
  age: [number, number];
  /** Gross annual pay in Milan, thousands of euros, by employer size: large groups and top firms, medium, small. */
  pay: { top: [number, number]; mid: [number, number]; small: [number, number] };
  /** Pay is mostly variable or a reimbursement (internships, commission-based roles). */
  payNote?: string;
  /** Where people usually go next. */
  next: string[];
  /** Finance and consulting pay much more in London, Frankfurt and Paris than other roles do. */
  financePremium?: boolean;
}

const S = (
  id: string,
  title: string,
  sector: string,
  match: string,
  age: [number, number],
  pay: RoleSheet["pay"],
  experience: string,
  description: string,
  tasks: string[],
  skills: string[],
  next: string[],
  extra: Partial<RoleSheet> = {},
): RoleSheet => ({ id, title, sector, match: new RegExp(match, "i"), age, pay, experience, description, tasks, skills, next, ...extra });

export const ROLE_SHEETS: RoleSheet[] = [
  // --- Luxury, fashion, watches and jewellery retail -----------------------------------------------
  S("sales-associate-lusso", "Sales associate / Client advisor (lusso)", "moda-lusso", "sales associate|client advisor|consulente (di )?vendita|addett[oa] vendite (lusso|boutique)|client adviser|sales advisor(?!.*(watch|orolog))", [22, 40], { top: [26, 34], mid: [22, 28], small: [20, 24] }, "0-3 anni in vendita; inglese buono, una terza lingua aiuta", "Segue i clienti in boutique dal primo contatto alla vendita e dopo: consiglio, prova, servizio post vendita, relazione nel tempo.", ["Accoglienza e vendita assistita", "Clienteling: agenda clienti, contatti, eventi", "Conoscenza del prodotto e delle collezioni", "Obiettivi individuali di vendita"], ["Vendita nel lusso", "Clienteling e portafoglio clienti", "Lingue (inglese, spesso cinese, arabo, russo)"], ["Senior client advisor", "Assistant store manager", "Personal shopper / VIC advisor"], { payNote: "Spesso con premi sulle vendite (5-20% in più)." }),
  S("store-manager-lusso", "Store manager (moda e lusso)", "moda-lusso", "store manager|boutique manager|responsabile (di )?(negozio|boutique|punto vendita)|direttore (di )?(negozio|boutique)", [30, 50], { top: [45, 70], mid: [36, 48], small: [30, 38] }, "5+ anni in retail, di cui 2+ alla guida di un team", "Guida una boutique: vendite, persone, servizio, immagine del marchio e conti del negozio.", ["Budget e KPI del negozio (sell-out, conversione, scontrino medio)", "Gestione e formazione del team", "Clienti importanti e eventi", "Stock, visual e standard del marchio"], ["Gestione di un team", "Obiettivi e KPI di vendita", "Clienteling e portafoglio clienti", "Vendita nel lusso"], ["Area manager", "Retail operations manager", "Store manager di flagship"], { payNote: "Più un bonus annuale, di solito 10-30% della RAL." }),
  S("assistant-store-manager", "Assistant store manager", "moda-lusso", "assistant (store|boutique) manager|vice (responsabile|direttore)|deputy (store )?manager", [27, 42], { top: [34, 45], mid: [28, 36], small: [25, 30] }, "3+ anni di vendita, primi passi di coordinamento", "Affianca lo store manager e lo sostituisce: turni, apertura e chiusura, team, obiettivi.", ["Turni e coordinamento della squadra", "Vendita in prima persona", "Inventari e riassortimenti"], ["Gestione di un team", "Vendita nel lusso", "Inventario e stock"], ["Store manager"]),
  S("area-manager-retail", "Area manager retail", "moda-lusso", "area manager|district manager|regional (retail )?manager|responsabile di zona", [33, 55], { top: [60, 90], mid: [48, 62], small: [40, 50] }, "8+ anni in retail, esperienza da store manager", "Segue più negozi in un'area: risultati, persone, aperture, standard.", ["Obiettivi e conti di più negozi", "Selezione e crescita degli store manager", "Visite e piani d'azione"], ["Gestione di un team", "Obiettivi e KPI di vendita", "Patente B"], ["Retail director", "Country manager retail"], { payNote: "Più auto aziendale e bonus." }),
  S("visual-merchandiser", "Visual merchandiser", "moda-lusso", "visual merchandis", [24, 40], { top: [30, 42], mid: [26, 32], small: [22, 26] }, "2+ anni, spesso con un percorso in design o moda", "Cura vetrine, allestimenti e esposizione del prodotto perché vendano.", ["Vetrine e lanci", "Layout del negozio", "Linee guida del marchio"], ["Visual merchandising"], ["Visual manager", "Retail design"]),
  S("wholesale-account", "Wholesale / showroom account manager", "moda-lusso", "wholesale|showroom|account manager.*(moda|fashion|lusso|luxury)|sales manager (wholesale|showroom)", [27, 45], { top: [40, 60], mid: [32, 44], small: [28, 35] }, "3+ anni di vendita B2B nella moda", "Vende le collezioni ai negozi multimarca e ai department store, nelle campagne vendita in showroom.", ["Campagne vendita e appuntamenti in showroom", "Ordini e sell-in", "Relazione con buyer e department store"], ["Wholesale / B2B", "Obiettivi e KPI di vendita", "Inglese fluente"], ["Area sales manager wholesale", "Head of wholesale"]),
  S("crm-clienteling", "CRM e clienteling manager", "moda-lusso", "crm|clienteling manager|client(ele)? (development|relationship) manager", [28, 45], { top: [45, 65], mid: [36, 48], small: [30, 38] }, "4+ anni tra negozio e marketing clienti", "Disegna come il marchio coltiva i suoi clienti: dati, programmi, eventi, strumenti per i negozi.", ["Programmi per i clienti importanti", "Dati e segmentazione", "Strumenti per il personale di vendita"], ["Clienteling e portafoglio clienti", "Excel", "E-commerce e digitale"], ["Head of CRM", "Customer experience director"]),
  S("buyer-moda", "Buyer / merchandise planner (moda)", "moda-lusso", "\\bbuyer\\b|merchandis(e|ing) planner|merchandiser\\b|planner", [26, 45], { top: [40, 60], mid: [32, 42], small: [28, 34] }, "2+ anni, forte con i numeri", "Decide cosa comprare e in che quantità per negozi e online, in base a vendite e budget.", ["Acquisti per collezione", "Analisi delle vendite", "Allocazione dello stock"], ["Excel", "Inventario e stock", "Obiettivi e KPI di vendita"], ["Senior buyer", "Head of buying"]),
  S("watch-specialist", "Sales advisor orologeria / watch specialist", "gioielli", "(watch|orolog).*(advisor|specialist|consultant|sales|vendit)|(advisor|specialist|consulente|sales).*(watch|orolog)", [24, 45], { top: [28, 40], mid: [24, 30], small: [21, 26] }, "1-3 anni nella vendita di alta gamma; conoscenza del prodotto (anche da corso)", "Vende orologi di alta gamma: spiega meccanica, modelli e storia, gestisce liste d'attesa e clienti fedeli.", ["Vendita e consulenza sul prodotto", "Clienteling e liste d'attesa", "Assistenza e post vendita"], ["Orologeria", "Vendita nel lusso", "Clienteling e portafoglio clienti"], ["Boutique manager orologeria", "Brand manager orologi"], { payNote: "Premi sulle vendite frequenti." }),
  S("boutique-manager-gioielli", "Boutique manager orologi e gioielli", "gioielli", "(boutique|store|shop) manager.*(watch|orolog|gioiell|jewel)|(watch|orolog|gioiell|jewel).*(boutique|store) manager|responsabile.*(gioielleria|orologeria)", [30, 50], { top: [48, 70], mid: [38, 50], small: [32, 40] }, "5+ anni nel lusso con team; il prodotto si impara, la clientela no", "Guida una boutique di orologi o gioielli: vendite, clienti molto alto spendenti, sicurezza, team.", ["Budget e clienti chiave", "Team e formazione", "Rapporto con il marchio"], ["Gestione di un team", "Vendita nel lusso", "Orologeria", "Gioielleria"], ["Area manager", "Retail director"], { payNote: "Bonus significativi legati al fatturato." }),
  S("brand-ambassador", "Brand ambassador / boutique events", "moda-lusso", "brand ambassador|event (manager|coordinator).*(boutique|retail|luxury)|ambassador", [24, 38], { top: [30, 42], mid: [26, 32], small: [22, 26] }, "2+ anni a contatto con clienti di alta gamma", "Rappresenta il marchio con clienti e partner: eventi, presentazioni, relazioni.", ["Eventi e presentazioni", "Relazioni con clienti e partner"], ["Vendita nel lusso", "Clienteling e portafoglio clienti"], ["Brand manager", "Client relations manager"]),
  S("ecommerce-manager", "E-commerce manager", "moda-lusso", "e-?commerce (manager|specialist|coordinator)|digital (sales|commerce) manager|omnichannel", [27, 45], { top: [50, 75], mid: [38, 52], small: [32, 40] }, "4+ anni nel digitale", "Fa crescere le vendite online: sito, marketplace, campagne, dati.", ["Vendite e conversione online", "Campagne e assortimento online", "Dati e reportistica"], ["E-commerce e digitale", "Excel", "Obiettivi e KPI di vendita"], ["Head of e-commerce", "Digital director"]),
  // --- Sales elsewhere ------------------------------------------------------------------------------
  S("key-account", "Key account manager", "vendita", "key account|account executive|account manager", [28, 50], { top: [50, 75], mid: [40, 52], small: [33, 42] }, "4+ anni di vendita B2B", "Segue i clienti più importanti dell'azienda: contratti, crescita, rinnovi.", ["Piani per cliente", "Trattative e contratti", "Previsioni di vendita"], ["Wholesale / B2B", "Salesforce", "Obiettivi e KPI di vendita"], ["Sales manager", "Head of sales"]),
  S("sales-manager", "Sales manager", "vendita", "sales manager|responsabile commerciale|direttore commerciale|head of sales", [32, 55], { top: [60, 95], mid: [45, 62], small: [38, 48] }, "7+ anni, di cui 3+ con un team", "Guida le vendite di un'area o di un canale: obiettivi, team, clienti chiave.", ["Budget e previsioni", "Team di vendita", "Trattative importanti"], ["Gestione di un team", "Obiettivi e KPI di vendita", "Wholesale / B2B"], ["Sales director", "Country manager"], { payNote: "Più bonus, spesso 15-30%." }),
  S("yacht-broker", "Yacht sales / broker", "nautica", "yacht (broker|sales)|vendita yacht|sales (manager|executive).*yacht|nautica.*vendit", [28, 55], { top: [45, 90], mid: [35, 55], small: [28, 40] }, "Esperienza di vendita di alta gamma; il prodotto si impara", "Vende o intermedia yacht nuovi e usati: clienti molto alto spendenti, fiere, trattative lunghe.", ["Saloni nautici e clienti internazionali", "Trattative e contratti", "Rete di broker"], ["Vendita nel lusso", "Inglese fluente", "Clienteling e portafoglio clienti"], ["Sales director", "Broker indipendente"], { payNote: "Gran parte del guadagno è a provvigione: le cifre variano moltissimo." }),
  S("luxury-hotel-guest", "Guest relations manager (hotel di lusso)", "ospitalita-lusso", "guest relation|guest experience|concierge|front office manager", [25, 45], { top: [32, 45], mid: [27, 34], small: [24, 28] }, "2+ anni in hotel o servizio clienti di alta gamma", "Cura l'esperienza degli ospiti più importanti, dalla prenotazione alla partenza.", ["Ospiti VIP e richieste speciali", "Coordinamento con i reparti", "Reclami e fidelizzazione"], ["Clienteling e portafoglio clienti", "Lingue"], ["Front office manager", "Hotel manager"]),
  S("luxury-real-estate", "Agente immobiliare di lusso", "immobiliare", "agente immobiliare|real estate (agent|advisor)|consulente immobiliare", [28, 55], { top: [40, 90], mid: [30, 50], small: [24, 36] }, "Esperienza di vendita; patentino di mediatore in Italia", "Vende e affitta immobili di pregio: valutazioni, visite, trattative.", ["Acquisizione di immobili", "Visite e trattative", "Rete di clienti"], ["Vendita nel lusso", "Patente B"], ["Responsabile d'agenzia"], { payNote: "Soprattutto provvigioni: le cifre sono molto variabili." }),
  S("auto-premium-sales", "Consulente vendita auto premium", "auto", "(vendit|sales).*(auto|car|automotive)|car sales|venditore auto|product genius", [25, 50], { top: [35, 60], mid: [28, 40], small: [24, 32] }, "1-3 anni di vendita", "Vende auto di alta gamma in concessionaria: prove, configurazioni, finanziamenti.", ["Clienti e prove su strada", "Configurazione e trattativa", "Post vendita"], ["Vendita nel lusso", "Patente B", "Obiettivi e KPI di vendita"], ["Sales manager di concessionaria"], { payNote: "Con provvigioni." }),
  // --- Office jobs ----------------------------------------------------------------------------------
  S("impiegata-amministrativa", "Impiegata/o amministrativa/o", "amministrazione", "impiegat[oa] amministrativ|addett[oa] amministrazione|administrative (assistant|clerk)|back office amministrativo|assistente amministrativ", [25, 60], { top: [30, 38], mid: [26, 31], small: [23, 27] }, "1-5 anni; diploma di ragioneria o laurea in economia", "Tiene in ordine documenti, fatture, pagamenti e rapporti con fornitori, banche e commercialista.", ["Fatture e prima nota", "Scadenziario clienti e fornitori", "Rapporti con banche e consulenti"], ["Contabilità", "Excel", "SAP / gestionali"], ["Contabile senior", "Responsabile amministrativa"]),
  S("contabile", "Contabile", "amministrazione", "\\bcontabile\\b|accountant|addett[oa] contabilit|bookkeeper", [26, 60], { top: [34, 45], mid: [28, 35], small: [25, 30] }, "3+ anni di contabilità generale", "Registra e controlla i conti dell'azienda fino al bilancio, con il commercialista.", ["Contabilità generale", "Chiusure mensili e bilancio", "IVA e adempimenti"], ["Contabilità", "Excel", "SAP / gestionali"], ["Responsabile amministrativa", "Controller"]),
  S("segretaria-direzione", "Assistente di direzione / segretaria", "segreteria", "assistente di direzione|executive assistant|segretari[ao]( di direzione)?|personal assistant", [25, 55], { top: [35, 50], mid: [28, 35], small: [24, 28] }, "2+ anni; inglese buono", "Organizza il lavoro di un manager o di un ufficio: agenda, viaggi, documenti, contatti.", ["Agenda e viaggi", "Documenti e presentazioni", "Primo contatto con clienti e partner"], ["Excel", "PowerPoint", "Inglese"], ["Office manager", "Executive assistant del CEO"]),
  S("receptionist", "Receptionist", "segreteria", "receptionist|front office|addett[oa] (all')?accoglienza|centralinista", [20, 50], { top: [26, 32], mid: [23, 27], small: [21, 24] }, "0-2 anni", "Accoglie visitatori e clienti, gestisce telefono, posta e sale riunioni.", ["Accoglienza", "Centralino e posta", "Prenotazioni"], ["Lingue", "Excel"], ["Office manager", "Assistente di direzione"]),
  // --- Students and graduates: finance, consulting, data -----------------------------------------------
  S("spring-week", "Spring week / insight programme", "investment-banking", "spring (week|insight)|insight (day|week|programme|program)|discovery (day|programme)", [18, 22], { top: [0, 0], mid: [0, 0], small: [0, 0] }, "Primo o secondo anno di università; nessuna esperienza richiesta", "Pochi giorni dentro una banca o una società di consulenza: presentazioni, casi, colloqui informali. Spesso porta a uno stage l'anno dopo.", ["Workshop e casi pratici", "Incontri con analisti e manager", "A volte un colloquio per lo stage estivo"], ["Interesse per la finanza", "Inglese fluente", "Excel"], ["Summer internship del penultimo anno"], { payNote: "Di solito non pagati, a volte con rimborso spese (viaggio e alloggio).", financePremium: true }),
  S("stage-ib", "Stage in investment banking / M&A", "investment-banking", "(stage|intern|internship|tirocinio).*(m&a|investment banking|corporate finance|advisory)|(m&a|investment banking).*(stage|intern)|summer analyst", [20, 25], { top: [14, 24], mid: [10, 15], small: [8, 12] }, "Studenti dal secondo/terzo anno; Excel e basi di valutazione", "Affianca il team su operazioni di fusione, acquisizione e finanza: analisi, modelli, presentazioni.", ["Analisi di aziende e settori", "Modelli finanziari", "Presentazioni per i clienti"], ["Modelli finanziari e valutazioni", "Excel", "PowerPoint", "Inglese fluente"], ["Analyst"], { payNote: "Valori annualizzati del rimborso mensile (in Italia 800-2.000 € al mese; a Londra molto di più).", financePremium: true }),
  S("analyst-ib", "Analyst investment banking / M&A", "investment-banking", "\\banalyst\\b.*(m&a|investment banking|corporate finance|advisory)|(m&a|investment banking).*\\banalyst\\b", [22, 27], { top: [50, 70], mid: [40, 52], small: [32, 42] }, "Neolaureati con stage in finanza", "Prepara analisi, modelli e documenti per le operazioni: lunghe ore, apprendimento rapido.", ["Modelli e valutazioni", "Documenti per gli investitori", "Due diligence con i consulenti"], ["Modelli finanziari e valutazioni", "Excel", "PowerPoint"], ["Associate", "Private equity"], { payNote: "Più bonus annuale.", financePremium: true }),
  S("analyst-pe", "Analyst private equity", "private-equity", "private equity|investment (analyst|associate)|\\bpe analyst", [23, 30], { top: [55, 80], mid: [42, 55], small: [35, 45] }, "1-3 anni in banca d'affari o consulenza", "Valuta aziende in cui investire e segue quelle in portafoglio.", ["Analisi di investimenti", "Modelli LBO", "Monitoraggio delle partecipate"], ["Modelli finanziari e valutazioni", "Excel"], ["Associate", "Investment manager"], { financePremium: true }),
  S("business-analyst-consulting", "Business analyst (consulenza strategica)", "consulting", "business analyst|associate consultant|strategy (analyst|consultant)|consulente (strategico|di management)|junior consultant", [22, 28], { top: [45, 60], mid: [35, 45], small: [30, 36] }, "Neolaureati; problem solving e casi", "Lavora su progetti per aziende clienti: analisi, interviste, raccomandazioni.", ["Analisi e modelli", "Interviste ed esperti", "Presentazioni al cliente"], ["Excel", "PowerPoint", "Inglese fluente"], ["Consultant", "Ruoli in azienda (strategy, M&A interno)"], { financePremium: true }),
  S("audit-ts", "Audit / transaction services associate", "transaction-services", "audit (associate|assistant)|revisore|transaction services|due diligence|valuation (analyst|associate)", [22, 30], { top: [32, 42], mid: [28, 34], small: [25, 30] }, "Neolaureati in economia", "Controlla bilanci (audit) o analizza aziende nelle operazioni (transaction services).", ["Verifica dei bilanci", "Due diligence finanziarie", "Report"], ["Contabilità", "Excel"], ["Senior", "Corporate finance"], { financePremium: true }),
  S("data-analyst", "Data analyst", "ai-data", "data analyst|business intelligence|bi analyst|analista dati", [23, 40], { top: [38, 52], mid: [32, 40], small: [28, 34] }, "0-3 anni; SQL ed Excel", "Trasforma dati in risposte: report, cruscotti, analisi per decidere.", ["Report e cruscotti", "Query e pulizia dei dati", "Analisi ad hoc"], ["Python o SQL", "Excel"], ["Senior data analyst", "Data scientist"]),
];

const FINANCE_CITY: Record<string, number> = { London: 1.65, "Frankfurt am Main": 1.3, Paris: 1.35, Munich: 1.25 };

/** Pay multiplier against Milan for a place (and currency). */
export function payFactor(place: Pick<Place, "country" | "region" | "name"> | null, sheet: RoleSheet): { factor: number; currency: "€" | "£"; where: string } {
  if (!place) return { factor: 1, currency: "€", where: "Milano (riferimento)" };
  if (place.country === "IT") {
    const r = place.region;
    const north = ["Lombardia"];
    const richer = ["Trentino-Alto Adige", "Emilia-Romagna", "Veneto", "Piemonte", "Lazio", "Liguria", "Friuli-Venezia Giulia", "Valle d'Aosta", "Toscana"];
    const centre = ["Marche", "Umbria", "Abruzzo"];
    const f = north.includes(r) ? (place.name === "Milano" ? 1 : 0.96) : richer.includes(r) ? 0.93 : centre.includes(r) ? 0.88 : 0.82;
    return { factor: f, currency: "€", where: `${place.name}, ${r}` };
  }
  const finance = sheet.financePremium ? FINANCE_CITY[place.name] : undefined;
  const base = place.country === "GB" ? (place.name === "London" ? 1.45 : 1.15) : place.country === "DE" ? (["Bavaria", "Hesse", "Hamburg", "Baden-Wurttemberg"].includes(place.region) ? 1.35 : 1.2) : place.region === "Île-de-France" ? 1.3 : 1.1;
  const factor = finance ?? base;
  // In pounds for the UK (indicative exchange rate 0.85).
  return place.country === "GB" ? { factor: factor * 0.85, currency: "£", where: `${place.name}, ${place.region}` } : { factor, currency: "€", where: `${place.name}, ${place.region}` };
}

export function scaledPay(sheet: RoleSheet, place: Pick<Place, "country" | "region" | "name"> | null) {
  const { factor, currency, where } = payFactor(place, sheet);
  const r = ([a, b]: [number, number]) => [Math.round(a * factor), Math.round(b * factor)] as [number, number];
  return { top: r(sheet.pay.top), mid: r(sheet.pay.mid), small: r(sheet.pay.small), currency, where };
}

export const TIER_LABELS = { top: "Grandi gruppi e marchi di punta", mid: "Aziende medie", small: "Piccole realtà e boutique indipendenti" } as const;

/** The sheet for a job title ("Store Manager - Milano" → store manager). */
export function sheetFor(title: string): RoleSheet | undefined {
  // The more specific sheets first: a "Watch Sales Associate" is a watch specialist.
  const first = ["watch-specialist", "boutique-manager-gioielli", "assistant-store-manager", "spring-week", "stage-ib", "analyst-ib", "crm-clienteling", "ecommerce-manager"];
  return [...first.map((id) => ROLE_SHEETS.find((s) => s.id === id)!), ...ROLE_SHEETS].find((s) => s.match.test(title));
}

export function sheetById(id: string): RoleSheet | undefined {
  return ROLE_SHEETS.find((s) => s.id === id);
}

export const SHEETS_AS_OF = "2025-26";
