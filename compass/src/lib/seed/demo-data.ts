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
