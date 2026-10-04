// Realistic but entirely FAKE Italian demo data. Companies are invented, e-mail domains use
// the reserved ".example" TLD, people do not exist.
import type { RawJob, SourceKind } from "../core/normalize";

export const DEMO_PROFILE = {
  name: "Lucia Ferraro",
  phone: "333 000 0000",
  email: "lucia.ferraro.lavoro@example.com",
  linkedinUrl: "https://www.linkedin.com/in/esempio-lucia-ferraro",
  roles: ["Impiegata amministrativa", "Segretaria"],
  synonyms: ["Addetta contabilità", "Receptionist", "Back office amministrativo", "Assistente amministrativa"],
  city: "Torino",
  maxKm: 20,
  remoteOk: true,
  hours: "any" as const,
  contracts: ["indeterminato", "determinato", "somministrazione"],
  minNetMonthly: 1300,
  languages: [{ language: "inglese", level: "base" as const }],
  avoidSectors: [],
  avoidCompanies: [],
  avoidKeywords: ["porta a porta", "provvigioni"],
  presentation:
    "Mi chiamo Lucia, ho lavorato per molti anni in amministrazione: prima nota, fatturazione, rapporti con fornitori e clienti. Sono precisa, organizzata e mi piace il lavoro di squadra.",
  availability: "Disponibile da subito, sia part-time sia tempo pieno.",
  salaryExpectation: "In linea con il CCNL di riferimento, indicativamente 1.400 € netti al mese.",
};

export const DEMO_CV_LINES = [
  "Lucia Ferraro (profilo di prova)",
  "Torino - lucia.ferraro.lavoro@example.com - 333 000 0000",
  "",
  "ESPERIENZA",
  "2009 - oggi  Impiegata amministrativa, Azienda Esempio Srl, Torino",
  "  - Prima nota, registrazione fatture, scadenziario clienti e fornitori",
  "  - Rapporti con banche e commercialista, archivio documenti",
  "2002 - 2009  Segretaria, Studio Esempio, Torino",
  "  - Accoglienza clienti, agenda, centralino, corrispondenza",
  "",
  "ISTRUZIONE",
  "Diploma di ragioneria",
  "",
  "COMPETENZE",
  "Excel, gestionali contabili, posta elettronica. Inglese di base.",
  "",
  "Autorizzo il trattamento dei miei dati personali ai sensi del Reg. UE 2016/679 (GDPR).",
];

interface Spec {
  title: string;
  company: string;
  city: string;
  source: SourceKind;
  days: number; // days ago
  salary?: string;
  extra?: string;
  email?: string;
}

const SPECS: Spec[] = [
  { title: "Impiegata amministrativa", company: "Ferramenta Colombo Srl", city: "Torino", source: "email:linkedin", days: 0, salary: "RAL 24-26k", email: "lavoro@ferramentacolombo.example", extra: "Contratto a tempo indeterminato, full time." },
  { title: "Addetta contabilità generale", company: "Edilnord Costruzioni Spa", city: "Settimo Torinese", source: "email:indeed", days: 1, salary: "1.450 € netti al mese", extra: "Tempo determinato 12 mesi, finalizzato all'assunzione." },
  { title: "Segretaria di direzione", company: "Gruppo Ventura Holding", city: "Torino", source: "email:linkedin", days: 2, extra: "Richiesto inglese fluente. Tempo pieno.", email: "hr@gruppoventura.example" },
  { title: "Receptionist part-time", company: "Hotel Lingotto Esempio", city: "Torino", source: "email:infojobs", days: 1, salary: "9,50 €/h lordi", extra: "Part-time 24 ore settimanali, turni mattina." },
  { title: "Impiegata ufficio clienti", company: "Acqua Viva Distribuzione Srl", city: "Collegno", source: "api:adzuna", days: 3, salary: "CCNL Commercio 4° livello", extra: "Tempo indeterminato. Orario 9-13 / 14-18." },
  { title: "Assistente amministrativa", company: "Studio Legale Ghione", city: "Torino", source: "email:generic", days: 4, extra: "Part-time mattina, 20 ore settimanali.", email: "segreteria@studioghione.example" },
  { title: "Addetta fatturazione", company: "Trasporti Piemonte Srl", city: "Orbassano", source: "email:linkedin", days: 5, salary: "RAL 23.000 €", extra: "Contratto a tempo indeterminato." },
  { title: "Back office commerciale", company: "Infissi Moderni Snc", city: "Chieri", source: "email:indeed", days: 6, extra: "Tempo pieno. Richiesta conoscenza di Excel.", email: "info.lavoro@infissimoderni.example" },
  { title: "Impiegata amministrativa contabile", company: "Cantine del Roero", city: "Alba", source: "api:adzuna", days: 2, salary: "28.000 - 30.000 € annui", extra: "Sede ad Alba, 60 km da Torino." },
  { title: "Centralinista", company: "Poliambulatorio Esempio", city: "Rivoli", source: "email:infojobs", days: 7, salary: "1.200 € netti/mese", extra: "Part-time pomeriggio." },
  { title: "Operatrice data entry", company: "DataServizi Italia", city: "Torino", source: "w1", days: 3, extra: "Lavoro da remoto possibile 2 giorni a settimana." },
  { title: "Addetta segreteria scolastica", company: "Istituto Paritario San Giorgio", city: "Moncalieri", source: "email:linkedin", days: 9, extra: "Contratto a tempo determinato fino a giugno.", email: "segreteria@istitutosangiorgio.example" },
  { title: "Impiegata ufficio acquisti", company: "Meccanica Valsusa Srl", city: "Avigliana", source: "email:indeed", days: 12, salary: "RAL 25-27k", extra: "Inglese buono (B1). Tempo pieno." },
  { title: "Customer care in lingua italiana", company: "Servizi Clienti Esempio", city: "Torino", source: "api:adzuna", days: 1, salary: "1.300 € lordi al mese", extra: "Lavoro da casa, part-time 30 ore." },
  { title: "Addetta vendite", company: "Abbigliamento Moda Esempio", city: "Torino", source: "email:infojobs", days: 2, extra: "Turni nel weekend. Part-time." },
  { title: "Impiegata amministrativa", company: "Ospedale Privato Esempio", city: "Pinerolo", source: "email:linkedin", days: 4, extra: "Contratto in somministrazione, 6 mesi.", salary: "1.400 € netti al mese" },
  { title: "Addetta paghe e contributi", company: "Studio Paghe Bellini", city: "Torino", source: "email:generic", days: 15, extra: "Richiesta esperienza in elaborazione cedolini.", email: "studio.bellini.esempio.demo@gmail.com" },
  { title: "Lavoro da casa imbustamento", company: "Opportunità Subito", city: "Torino", source: "email:generic", days: 1, extra: "Guadagna subito lavorando da casa! Richiesta quota di iscrizione di 49 euro per il kit.", email: "esempio.finto.demo.compass@gmail.com" },
  { title: "Venditrice porta a porta", company: "Energia Casa Esempio", city: "Torino", source: "email:indeed", days: 2, extra: "Compenso a provvigioni, auto propria." },
  { title: "Segretaria amministrativa", company: "Autofficina Greco Snc", city: "Nichelino", source: "manual", days: 3, extra: "Part-time 25 ore. Inserimento immediato.", email: "officinagreco@officinagreco.example" },
  { title: "Impiegata contabile senior", company: "Revisori Associati Esempio", city: "Milano", source: "api:adzuna", days: 5, salary: "RAL 34-38k", extra: "Inglese fluente richiesto. Sede a Milano." },
  { title: "Addetta front office", company: "Palestra Esempio Fitness", city: "Grugliasco", source: "email:linkedin", days: 8, salary: "8,50 €/ora", extra: "Part-time serale." },
  { title: "Assistente alla poltrona", company: "Studio Dentistico Esempio", city: "Torino", source: "email:indeed", days: 6, extra: "Richiesto attestato ASO." },
  { title: "Impiegata ufficio personale", company: "Cooperativa Sociale Esempio", city: "Venaria Reale", source: "email:infojobs", days: 10, extra: "Tempo indeterminato, part-time 30 ore.", salary: "1.350 € netti al mese", email: "selezione@coopesempio.example" },
];

const PARAGRAPHS = (s: Spec) =>
  [
    `${s.company} cerca una figura come ${s.title.toLowerCase()} per la sede di ${s.city}.`,
    "Attività principali: gestione documenti, rapporti con clienti e fornitori, supporto all'ufficio.",
    s.extra ?? "",
    s.salary ? `Retribuzione: ${s.salary}.` : "",
    s.email ? `Inviare il curriculum a ${s.email} indicando il riferimento dell'annuncio.` : "Per candidarsi usare il pulsante sul sito dell'annuncio.",
  ]
    .filter(Boolean)
    .join("\n");

export function demoJobs(now: Date): RawJob[] {
  return SPECS.map((s, i) => ({
    source: s.source,
    url: demoUrl(s, i),
    title: s.title,
    company: s.company,
    location: s.city,
    description: PARAGRAPHS(s),
    salaryText: s.salary ?? null,
    postedAt: new Date(now.getTime() - s.days * 86400000 - 3600000 * (i % 7)),
  }));
}

function demoUrl(s: Spec, i: number): string {
  switch (s.source) {
    case "email:linkedin":
      return `https://www.linkedin.com/jobs/view/${4100000000 + i}`;
    case "email:indeed":
      return `https://it.indeed.com/viewjob?jk=demo${(1000 + i).toString(16)}`;
    case "email:infojobs":
      return `https://www.infojobs.it/torino/offerta/of-idemo${1000 + i}`;
    case "api:adzuna":
      return `https://www.adzuna.it/details/${4800000000 + i}`;
    default:
      return `https://annunci.example/offerta/${1000 + i}`;
  }
}

export const DEMO_SPONTANEOUS = [
  { name: "Panificio Gallo", email: "lavoro@panificiogallo.example", sourceUrl: "https://www.panificiogallo.example/lavora-con-noi", city: "Torino" },
  { name: "Ottica Vigna", email: "candidature@otticavigna.example", sourceUrl: "https://www.otticavigna.example/lavora-con-noi", city: "Moncalieri" },
  { name: "Farmacia Comunale Esempio", email: "personale@farmaciaesempio.example", sourceUrl: "https://www.farmaciaesempio.example/candidature", city: "Torino" },
];

// --- The demo student (internship search). Fictional person, fictional companies. -------------

export const DEMO_STUDENT = {
  name: "Marco Bianchi",
  phone: "333 000 0000",
  email: "marco.bianchi.stage@example.com",
  linkedinUrl: "https://www.linkedin.com/in/esempio-marco-bianchi",
  roles: [],
  synonyms: [],
  city: "Milano",
  maxKm: 25,
  remoteOk: true,
  hours: "any" as const,
  contracts: [],
  minNetMonthly: 700,
  hideBelowMin: false,
  languages: [{ language: "inglese", level: "fluente" as const }, { language: "spagnolo", level: "base" as const }],
  avoidSectors: [],
  avoidCompanies: [],
  avoidKeywords: [],
  university: "Università (esempio), Milano",
  degree: "Economia e finanza",
  studyYear: 1,
  degreeYears: 3,
  graduationYear: 2029,
  periods: ["estate"],
  extraPlaces: ["Londra"],
  paidOnly: false,
  tastes: ["finanza", "imprenditoria", "tecnologia"],
  focus: "tutte" as const,
  presentation: "Primo anno di economia e finanza. Mi interessano M&A, startup e mercati; ho esperienza di lavoro in squadra in attività di volontariato e associazioni studentesche.",
  availability: "Disponibile per uno stage estivo (giugno-settembre) o part-time durante il semestre.",
  salaryExpectation: "Rimborso spese in linea con la policy aziendale.",
};

/** Catalog choices of the demo student: real sector names, real catalog companies as preferences only, plus one "Altro". */
export const DEMO_STUDENT_PREFS = {
  sectors: ["investment-banking", "venture-capital", "startup", "fintech"],
  avoidSectors: ["sanita"],
  companies: ["lazard", "houlihan-lokey", "vitale-and-co", "satispay", "p101"],
  custom: [{ name: "Esempio Advisory Partners", kind: "boutique" as const, sector: "investment-banking" }],
};

export const DEMO_STUDENT_CV_LINES = [
  "Marco Bianchi (profilo di prova)",
  "Milano - marco.bianchi.stage@example.com",
  "",
  "ISTRUZIONE",
  "2026 - oggi  Economia e finanza (primo anno), Università (esempio)",
  "2021 - 2026  Liceo scientifico, Milano",
  "",
  "ESPERIENZE",
  "2026 - oggi  Membro, Associazione studentesca di finanza (esempio), Milano",
  "  - Analisi di bilanci e presentazioni di società quotate",
  "2025 - 2025  Commesso estivo, Negozio di articoli sportivi (esempio), Milano",
  "",
  "VOLONTARIATO",
  "2023 - 2025  Volontario, Biblioteca di quartiere (esempio), Milano",
  "",
  "COMPETENZE",
  "Excel, PowerPoint, basi di Python. Inglese fluente, spagnolo base.",
];

interface StageSpec {
  title: string;
  company: string;
  city: string;
  source: SourceKind;
  days: number;
  text: string;
  email?: string;
}

const STAGE_SPECS: StageSpec[] = [
  { title: "Stage M&A Analyst", company: "Esempio Advisory Partners", city: "Milano", source: "api:adzuna", days: 1, text: "Stage di 6 mesi nel team M&A: supporto a valutazioni, pitch book e due diligence. Rimborso spese mensile. Aperto anche a studenti del primo anno con forte interesse per la finanza.", email: "careers@esempioadvisory.example" },
  { title: "Summer Internship Investment Banking", company: "Banca d'Affari Esempio", city: "Milano", source: "w1", days: 2, text: "Summer internship di 10 settimane nella divisione investment banking. Rivolto a studenti al penultimo anno di laurea triennale o magistrale. Paid internship." },
  { title: "Spring Insight Week Finanza", company: "Gruppo Bancario Esempio", city: "Milano", source: "api:adzuna", days: 3, text: "Spring insight week di 3 giorni per studenti del primo anno: incontri con i team di M&A, mercati e asset management." },
  { title: "Venture Capital Intern", company: "Fondo Venture Esempio", city: "Milano", source: "w1", days: 2, text: "Internship di 4 mesi nel team investimenti: analisi di startup, dealflow, ricerche di mercato. Rimborso spese. Inglese fluente.", email: "jobs@fondoventure.example" },
  { title: "Founder's Associate (stage)", company: "Startup Pagamenti Esempio", city: "Milano", source: "email:linkedin", days: 0, text: "Stage di 6 mesi a supporto dei fondatori: business development, analisi dati, progetti speciali. Ibrido, 2 giorni da remoto. Rimborso spese 800 euro al mese." },
  { title: "Graduate Programme Corporate Finance", company: "Industria Esempio Spa", city: "Torino", source: "api:adzuna", days: 4, text: "Graduate programme di 18 mesi per neolaureati in economia, laurea conseguita con ottimi voti." },
  { title: "Equity Research Intern", company: "Esempio Capital Markets", city: "Londra", source: "w1", days: 5, text: "Off-cycle internship in equity research (6 months). Open to students in any year of study. Paid internship. Fluent English required." },
  { title: "Stage Marketing Digitale", company: "Agenzia Comunicazione Esempio", city: "Milano", source: "api:adzuna", days: 2, text: "Stage di 6 mesi nel team social media e contenuti. Stage curriculare non retribuito." },
  { title: "Senior Financial Controller", company: "Gruppo Industriale Esempio", city: "Milano", source: "api:adzuna", days: 1, text: "Almeno 7 anni di esperienza in controllo di gestione. Contratto a tempo indeterminato.", email: "hr@gruppoindustriale.example" },
  { title: "Strategy Consulting Intern", company: "Consulenza Strategica Esempio", city: "Milano", source: "w1", days: 6, text: "Internship di 6 mesi in progetti di strategia per grandi aziende. Per laureandi in economia o ingegneria." },
];

export function demoStageJobs(now: Date): RawJob[] {
  return STAGE_SPECS.map((s, i) => ({
    source: s.source,
    url: s.source === "email:linkedin" ? `https://www.linkedin.com/jobs/view/${4199900000 + i}` : s.source === "api:adzuna" ? `https://www.adzuna.it/details/${4899900000 + i}` : `https://carriere.example/stage/${2000 + i}`,
    title: s.title,
    company: s.company,
    location: s.city,
    description: [s.text, s.email ? `Inviare CV e lettera a ${s.email}.` : "Candidature tramite il sito."].join("\n"),
    salaryText: null,
    postedAt: new Date(now.getTime() - s.days * 86400000 - 3600000 * (i % 5)),
  }));
}

// --- Third demo person: a store manager in high fashion, Milan, open to watches and jewellery -----

export const DEMO_FASHION = {
  name: "Chiara Colombo",
  phone: "333 000 0000",
  email: "chiara.colombo.lavoro@example.com",
  linkedinUrl: "",
  roles: ["Store manager", "Client advisor"],
  synonyms: ["Boutique manager", "Responsabile di negozio"],
  city: "Milano",
  maxKm: 15,
  remoteOk: false,
  hours: "full" as const,
  contracts: ["indeterminato"],
  minNetMonthly: 2200,
  hideBelowMin: false,
  languages: [{ language: "inglese", level: "fluente" as const }, { language: "francese", level: "base" as const }],
  avoidSectors: [],
  avoidCompanies: [],
  avoidKeywords: ["porta a porta"],
  countries: ["IT"],
  regions: ["IT:Lombardia"],
  extraPlaces: [],
  tastes: ["lusso", "moda"],
  focus: "tutte" as const,
  presentation: "Store manager nella moda di lusso a Milano, prima sales associate. Guido un team, seguo i clienti più importanti e i risultati del negozio. Valuto anche l'orologeria e la gioielleria.",
  availability: "Preavviso di un mese.",
  salaryExpectation: "In linea con il ruolo e l'esperienza.",
};

export const DEMO_FASHION_PREFS = {
  sectors: ["moda-lusso", "gioielli"],
  companies: ["bulgari", "panerai", "damiani"],
};

export const DEMO_FASHION_CV_LINES = [
  "Chiara Colombo (profilo di prova)",
  "Milano - chiara.colombo.lavoro@example.com",
  "",
  "ESPERIENZE",
  "2019 - oggi Store Manager, Maison Esempio Moda, Milano",
  "- Gestione del team di 12 persone, turni e formazione",
  "- Budget di vendita e KPI del negozio: sell-out, conversione, scontrino medio",
  "- Clienteling e portafoglio clienti internazionale, eventi per clienti VIC",
  "2014 - 2019 Sales Associate, Boutique Esempio Alta Moda, Milano",
  "- Vendita nel lusso, clienteling, visual merchandising del corner",
  "",
  "ISTRUZIONE",
  "2010 - 2013 Laurea triennale in Economia e Management, Università Esempio, Milano",
  "",
  "LINGUE",
  "Inglese fluente, francese base",
  "COMPETENZE",
  "Excel, CRM e clienteling, gestione inventario e stock",
];

interface FashionSpec { title: string; company: string; city: string; days: number; text: string; salary?: string; email?: string }
const FASHION_SPECS: FashionSpec[] = [
  { title: "Store Manager boutique alta moda", company: "Atelier Esempio Milano", city: "Milano", days: 1, text: "Cerchiamo uno Store Manager per la boutique di via Esempio. Requisiti: almeno 5 anni di esperienza nel retail di lusso, gestione di un team, obiettivi di vendita e KPI, clienteling. Inglese fluente. Contratto a tempo indeterminato, full time.", salary: "RAL 48.000 - 55.000 € più bonus", email: "careers@atelieresempio.example" },
  { title: "Boutique Manager orologeria", company: "Orologeria Esempio Milano", city: "Milano", days: 2, text: "Boutique di alta orologeria cerca Boutique Manager. Richiesta esperienza nel settore orologi o gioielli, gestione del team, clienteling e portafoglio clienti. Almeno 6 anni di esperienza nel lusso. Laurea gradita.", salary: "RAL 50.000 € più premi" },
  { title: "Watch Specialist / Sales Advisor", company: "Esempio Haute Horlogerie", city: "Milano", days: 3, text: "Watch specialist per boutique monomarca: vendita di orologi di alta gamma, clienteling, liste d'attesa. Conoscenza dell'orologeria richiesta; formazione sul prodotto fornita. Inglese fluente. Tempo indeterminato.", salary: "RAL 34.000 € più premi" },
  { title: "Area Manager Retail Lombardia", company: "Gruppo Moda Esempio", city: "Bergamo", days: 4, text: "Area Manager per 6 negozi in Lombardia. Almeno 8 anni di esperienza nel retail, di cui 3 come store manager. Gestione di team, budget e KPI. Patente B. Tempo indeterminato.", salary: "RAL 60.000 € più auto aziendale" },
  { title: "Client Advisor", company: "Maison Esempio Brescia", city: "Brescia", days: 2, text: "Client advisor per boutique di moda di lusso. Esperienza di 2 anni nella vendita nel lusso, clienteling, inglese fluente. Tempo indeterminato." },
  { title: "Store Manager", company: "Maison Esempio Moda", city: "Milano", days: 1, text: "Store manager per la nostra boutique di Milano: gestione del team, KPI, clienteling. Tempo indeterminato." },
  { title: "Junior Sales Assistant", company: "Outlet Esempio", city: "Milano", days: 5, text: "Addetto/a vendite junior, anche prima esperienza. Part time, contratto a tempo determinato." },
  { title: "CRM e Clienteling Manager", company: "Brand Lusso Esempio", city: "Milano", days: 6, text: "Disegnerai i programmi per i clienti più importanti del brand. 4 anni tra negozio e marketing clienti, CRM, Excel. Laurea in economia o marketing.", salary: "RAL 45.000 €" },
  { title: "Yacht Sales Manager", company: "Cantiere Esempio", city: "Genova", days: 7, text: "Vendita di yacht a clienti internazionali, saloni nautici. Esperienza di vendita nel lusso, inglese fluente. Tempo indeterminato." },
  { title: "Store Manager", company: "Esempio Fashion Torino", city: "Torino", days: 3, text: "Store manager per negozio di abbigliamento premium. 5 anni di esperienza, gestione team. Tempo indeterminato." },
];

export function demoFashionJobs(now: Date): RawJob[] {
  return FASHION_SPECS.map((s, i) => ({
    source: "api:adzuna" as const,
    url: `https://www.adzuna.it/details/${4899950000 + i}`,
    title: s.title,
    company: s.company,
    location: s.city,
    description: [s.text, s.email ? `Inviare CV a ${s.email}.` : "Candidature tramite il sito."].join("\n"),
    salaryText: s.salary ?? null,
    postedAt: new Date(now.getTime() - s.days * 86400000 - 3600000 * (i % 5)),
  }));
}
