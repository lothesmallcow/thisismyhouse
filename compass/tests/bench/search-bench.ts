// The search benchmark: realistic Italian ads and the searches people type, with the ads each search
// should find. Precision@5 (of the first 5, how many are right) and recall (of the right ones, how
// many are found) are checked in tests/unit/search-bench.test.ts and printed by scripts/bench-search.ts.

export interface BenchAd {
  key: string;
  title: string;
  company: string;
  location: string;
  description: string;
}

const A = (key: string, title: string, company: string, location: string, description: string): BenchAd => ({ key, title, company, location, description });

export const BENCH_ADS: BenchAd[] = [
  A("amm-to-1", "Impiegata amministrativa", "Studio Ferri", "Torino", "Gestione prima nota, fatturazione attiva e passiva, rapporti con le banche. Richiesta esperienza di almeno 2 anni. Contratto a tempo indeterminato, full time."),
  A("amm-to-2", "Impiegato amministrativo contabile part-time", "Logistica Po Srl", "Moncalieri (TO)", "Registrazioni contabili, scadenzario clienti e fornitori. Part-time 25 ore settimanali. Buoni pasto."),
  A("amm-mi-1", "Addetta amministrazione", "Bianchi Group", "Milano", "Supporto all'ufficio amministrativo, data entry, archiviazione. Anche prima esperienza."),
  A("amm-ag", "Impiegata amministrativa", "Randstad Italia", "Torino", "Per importante azienda cliente cerchiamo impiegata amministrativa. Contratto in somministrazione."),
  A("segr-to", "Segretaria di direzione", "Avvocati Associati", "Torino", "Agenda dell'avvocato, telefonate, accoglienza clienti. Inglese buono. Full time."),
  A("segr-med", "Segretaria studio medico part-time", "Poliambulatorio Salus", "Torino", "Accettazione pazienti, prenotazioni. Part-time mattina."),
  A("recep", "Receptionist", "Hotel Excelsior", "Torino", "Front office, check-in e check-out, lavoro su turni anche festivi. Inglese fluente."),
  A("ass-amm-txt", "Assistente di direzione", "Acme Spa", "Torino", "Supporto alla direzione, attività di segreteria e amministrazione."),
  A("sm-moda-mi", "Sales Manager Moda", "Maison Rossi", "Milano", "Guiderai le vendite wholesale del brand di moda in Italia. Esperienza di almeno 5 anni nel fashion. Auto aziendale."),
  A("sm-lusso-mi", "Area Sales Manager Luxury", "Gioielli Bellini", "Milano", "Gestione degli agenti e dei clienti multimarca del lusso. Trasferte frequenti."),
  A("sm-steel", "Sales Manager", "Acciaierie Nord", "Brescia", "Vendita di prodotti siderurgici a clienti industriali. Esperienza nel settore metallurgico."),
  A("dir-vend", "Direttore delle vendite", "Lusso SpA", "Milano", "Brand di moda e lusso cerca direttore delle vendite per il mercato italiano."),
  A("sales-ass", "Sales Assistant", "Maison Rossi", "Milano", "Riporterai al sales manager della boutique di moda. Vendita al cliente finale."),
  A("store-mi", "Store Manager", "Boutique Venezia", "Milano", "Gestione del negozio di abbigliamento di lusso, del team e degli obiettivi di vendita."),
  A("stage-mkt-mi", "Stage Marketing", "Brand Beauty Srl", "Milano", "Tirocinio di 6 mesi nel team marketing: social media, campagne, analisi dati. Rimborso 800 euro."),
  A("stage-mkt-rm", "Marketing Intern", "Tech Roma Srl", "Roma", "Internship in digital marketing, 6 months, Rome office."),
  A("mkt-mgr", "Marketing Manager", "Brand Beauty Srl", "Milano", "Responsabile del marketing con almeno 7 anni di esperienza."),
  A("stage-fin", "Stage Amministrazione e Finanza", "Banca Alpina", "Milano", "Tirocinio curriculare in amministrazione e finanza."),
  A("cont-bg-1", "Contabile junior", "Studio Verdi", "Bergamo", "Contabilità ordinaria e semplificata, anche senza esperienza: ti formiamo noi. Full time."),
  A("cont-bg-2", "Impiegata contabile part-time", "Ferramenta Orobica", "Bergamo", "Prima nota e liquidazioni IVA. Part-time 20 ore. Anche prima esperienza."),
  A("cont-sen", "Senior Accountant", "Big Four Advisory", "Bergamo", "Almeno 8 anni di esperienza in bilancio e consolidato. Laurea in economia."),
  A("cont-ag", "Contabile", "Gi Group", "Bergamo", "Per conto di nostra azienda cliente ricerchiamo un contabile. Lavoro su turni."),
  A("cass-1", "Cassiera part-time", "Supermercati Sole", "Torino", "Cassa e rifornimento scaffali, part-time 24 ore su turni. Anche senza esperienza."),
  A("cass-2", "Addetto cassa e vendita", "Discount Più", "Collegno (TO)", "Addetto cassa part-time, weekend inclusi."),
  A("comm-1", "Commessa abbigliamento", "Negozio Stile", "Torino", "Vendita assistita in negozio di abbigliamento, full time."),
  A("mag-1", "Magazziniere con patentino muletto", "Trasporti Veloci", "Piacenza", "Carico e scarico merci, uso del carrello elevatore. Patente B. Turni."),
  A("mag-2", "Addetto magazzino", "Logistica Po Srl", "Torino", "Picking e preparazione ordini. Turni diurni."),
  A("inf-1", "Infermiere", "Clinica San Luca", "Torino", "Infermiere per reparto di medicina, turni anche notturni. Laurea in infermieristica."),
  A("oss-1", "Operatore socio sanitario (OSS)", "RSA Il Giardino", "Torino", "OSS per struttura per anziani, turni."),
  A("dev-1", "Sviluppatore Java", "Software House Srl", "Milano", "Sviluppo backend Java Spring. Smart working 3 giorni a settimana."),
  A("dev-2", "Frontend Developer React", "Startup Roma", "Roma", "Full remote. React, TypeScript."),
  A("dev-3", "Software Engineer", "Fintech Spa", "Milano", "Backend engineer Go e Kubernetes, hybrid 2 days in the office."),
  A("cook-1", "Cuoco capo partita", "Ristorante Da Mario", "Torino", "Cucina piemontese, turni serali."),
  A("wait-1", "Cameriere di sala", "Ristorante Da Mario", "Torino", "Servizio ai tavoli, anche prima esperienza."),
  A("cp-1", "Impiegato amministrativo - categorie protette", "Assicurazioni Unite", "Torino", "Assunzione riservata agli iscritti alle categorie protette (L. 68/99). Contabilità e archivio."),
  A("old-1", "Candidatura spontanea", "Acme Spa", "Torino", "Inviaci il tuo CV per future opportunità di lavoro in amministrazione."),
];

export interface BenchQuery {
  q: string;
  /** Ads that are right for it. */
  right: string[];
  /** Ads that must not come up. */
  wrong?: string[];
}

export const BENCH_QUERIES: BenchQuery[] = [
  { q: "impiegata amministrativa Torino", right: ["amm-to-1", "amm-to-2", "amm-ag", "cp-1"], wrong: ["amm-mi-1", "sm-steel"] },
  { q: "impiegata amministrativa Torino senza agenzie", right: ["amm-to-1", "amm-to-2", "cp-1"], wrong: ["amm-ag"] },
  { q: "segretaria Torino", right: ["segr-to", "segr-med", "ass-amm-txt"], wrong: ["recep", "cass-1"] },
  { q: "segretaria part-time", right: ["segr-med"], wrong: ["segr-to"] },
  { q: "sales manager moda Milano", right: ["sm-moda-mi", "dir-vend", "sm-lusso-mi"], wrong: ["sm-steel", "sales-ass"] },
  { q: "sales manager", right: ["sm-moda-mi", "sm-lusso-mi", "sm-steel", "dir-vend"], wrong: ["sales-ass", "store-mi"] },
  { q: "store manager lusso Milano", right: ["store-mi"], wrong: ["sales-ass"] },
  { q: "stage marketing Milano", right: ["stage-mkt-mi"], wrong: ["mkt-mgr", "stage-mkt-rm"] },
  { q: "stage marketing", right: ["stage-mkt-mi", "stage-mkt-rm"], wrong: ["mkt-mgr"] },
  { q: "contabile senza esperienza Bergamo", right: ["cont-bg-1", "cont-bg-2", "cont-ag"], wrong: ["cont-sen"] },
  { q: "contabile Bergamo -turni", right: ["cont-bg-1", "cont-bg-2", "cont-sen"], wrong: ["cont-ag"] },
  { q: "cassiera part time Torino", right: ["cass-1", "cass-2"], wrong: ["comm-1"] },
  { q: "magazziniere", right: ["mag-1", "mag-2"], wrong: ["cass-1"] },
  { q: "infermiere Torino", right: ["inf-1"], wrong: ["oss-1"] },
  { q: "sviluppatore da remoto", right: ["dev-2"], wrong: ["cook-1"] },
  { q: "developer Milano", right: ["dev-1", "dev-3"], wrong: ["dev-2"] },
  { q: "cameriere Torino", right: ["wait-1"], wrong: ["cook-1"] },
  { q: "amministrativo categorie protette", right: ["cp-1"], wrong: ["amm-to-1"] },
];

/** Precision of the first 5 (of what is shown, how much is right) and recall (of the right ones, how many are found). */
export function scoreQuery(found: string[], q: BenchQuery) {
  const top = found.slice(0, 5);
  const precision = top.length ? top.filter((k) => q.right.includes(k)).length / top.length : 0;
  const recall = q.right.filter((k) => found.includes(k)).length / q.right.length;
  const wrong = (q.wrong ?? []).filter((k) => found.includes(k));
  return { precision, recall, wrong };
}
