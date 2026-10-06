// Job titles people look for, in Italian, English, German and French, each with its closest sector.
// Used to suggest roles in the questionnaire and to search in the right language in each country
// (an Italian "Impiegata amministrativa" is an "Administrative Assistant" in London).
// Format: it | en | de | fr | sector slug | track (l = lavoro, s = stage, t = both)

import { allOccupations } from "./occupations";

const RAW = `
Impiegata amministrativa|Administrative assistant|Verwaltungsangestellte|Employée administrative|amministrazione|l
Impiegato amministrativo|Administrative clerk|Verwaltungsangestellter|Employé administratif|amministrazione|l
Addetta contabilità|Accounts assistant|Buchhalterin|Aide-comptable|amministrazione|l
Contabile|Accountant|Buchhalter|Comptable|amministrazione|t
Addetta paghe e contributi|Payroll administrator|Lohnbuchhalterin|Gestionnaire de paie|amministrazione|l
Addetta fatturazione|Billing clerk|Fakturistin|Agent de facturation|amministrazione|l
Responsabile amministrativo|Finance manager|Leiter Rechnungswesen|Responsable administratif et financier|amministrazione|l
Controller|Financial controller|Controller|Contrôleur de gestion|corporate-finance|t
Segretaria|Secretary|Sekretärin|Secrétaire|segreteria|l
Assistente di direzione|Executive assistant|Assistentin der Geschäftsführung|Assistante de direction|segreteria|l
Receptionist|Receptionist|Empfangsmitarbeiterin|Réceptionniste|segreteria|l
Addetta front office|Front office assistant|Front-Office-Mitarbeiterin|Chargée d'accueil|segreteria|l
Office manager|Office manager|Büroleiterin|Office manager|segreteria|l
Data entry|Data entry clerk|Datenerfasser|Opérateur de saisie|segreteria|l
Commessa|Sales assistant|Verkäuferin|Vendeuse|vendita|l
Addetta vendite|Retail assistant|Verkaufsmitarbeiterin|Conseillère de vente|vendita|l
Responsabile di negozio|Store manager|Filialleiterin|Responsable de magasin|vendita|l
Cassiera|Cashier|Kassiererin|Caissière|vendita|l
Visual merchandiser|Visual merchandiser|Visual Merchandiser|Visual merchandiser|moda-lusso|t
Client advisor|Client advisor|Kundenberaterin|Conseillère clientèle|moda-lusso|l
Sales associate lusso|Luxury sales associate|Luxus-Verkaufsberaterin|Conseillère de vente luxe|moda-lusso|l
Personal shopper|Personal shopper|Personal Shopper|Personal shopper|moda-lusso|l
Store manager lusso|Luxury store manager|Boutique-Managerin|Directrice de boutique luxe|moda-lusso|l
Addetta e-commerce|E-commerce assistant|E-Commerce-Mitarbeiterin|Chargée e-commerce|vendita|t
Agente di commercio|Sales agent|Handelsvertreter|Agent commercial|vendita|l
Account manager|Account manager|Account Manager|Chargé de compte|vendita|t
Key account manager|Key account manager|Key Account Manager|Key account manager|vendita|l
Business developer|Business development representative|Business Developer|Chargé de développement commercial|vendita|t
Operatrice call center|Call centre agent|Callcenter-Agentin|Téléconseillère|assistenza-clienti|l
Addetta assistenza clienti|Customer service advisor|Kundenservice-Mitarbeiterin|Chargée de clientèle|assistenza-clienti|l
Customer success|Customer success associate|Customer Success Manager|Customer success manager|assistenza-clienti|t
Magazziniere|Warehouse operative|Lagerist|Magasinier|logistica|l
Addetta logistica|Logistics coordinator|Logistikmitarbeiterin|Assistante logistique|logistica|l
Autista|Driver|Fahrer|Chauffeur|logistica|l
Corriere|Delivery driver|Kurierfahrer|Livreur|logistica|l
Responsabile acquisti|Purchasing manager|Einkaufsleiter|Responsable des achats|logistica|l
Buyer|Buyer|Einkäufer|Acheteur|logistica|t
Addetta spedizioni|Shipping clerk|Versandmitarbeiterin|Agent d'expédition|logistica|l
Supply chain analyst|Supply chain analyst|Supply-Chain-Analyst|Analyste supply chain|logistica|t
Operatrice socio sanitaria|Healthcare assistant|Pflegehelferin|Aide-soignante|sanita|l
Infermiera|Nurse|Krankenschwester|Infirmière|sanita|l
Badante|Care worker|Betreuungskraft|Auxiliaire de vie|sanita|l
Assistente alla poltrona|Dental nurse|Zahnmedizinische Fachangestellte|Assistante dentaire|sanita|l
Farmacista|Pharmacist|Apotheker|Pharmacien|sanita|l
Segretaria medica|Medical secretary|Arzthelferin|Secrétaire médicale|sanita|l
Cameriera|Waitress|Kellnerin|Serveuse|ristorazione|l
Cameriere|Waiter|Kellner|Serveur|ristorazione|l
Barista|Barista|Barista|Barista|ristorazione|l
Cuoco|Chef|Koch|Cuisinier|ristorazione|l
Aiuto cuoco|Kitchen assistant|Küchenhilfe|Commis de cuisine|ristorazione|l
Lavapiatti|Kitchen porter|Spüler|Plongeur|ristorazione|l
Receptionist d'albergo|Hotel receptionist|Hotelrezeptionistin|Réceptionniste d'hôtel|ospitalita-lusso|l
Concierge|Concierge|Concierge|Concierge|ospitalita-lusso|l
Guest relations|Guest relations executive|Guest Relations Managerin|Chargée de relations clients|ospitalita-lusso|l
Cameriera ai piani|Housekeeper|Zimmermädchen|Femme de chambre|ospitalita-lusso|l
Revenue manager|Revenue manager|Revenue Manager|Revenue manager|ospitalita-lusso|t
Addetta pulizie|Cleaner|Reinigungskraft|Agent d'entretien|pulizie|l
Portiere|Caretaker|Hausmeister|Gardien|pulizie|l
Addetta sicurezza|Security officer|Sicherheitsmitarbeiter|Agent de sécurité|pulizie|l
Insegnante|Teacher|Lehrerin|Enseignante|scuola|l
Educatrice|Early years educator|Erzieherin|Éducatrice|scuola|l
Tutor|Tutor|Nachhilfelehrer|Tuteur|scuola|t
Formatore|Trainer|Trainer|Formateur|scuola|l
Sviluppatore software|Software developer|Softwareentwickler|Développeur logiciel|informatica|t
Sviluppatore web|Web developer|Webentwickler|Développeur web|informatica|t
Tecnico informatico|IT support technician|IT-Supporttechniker|Technicien informatique|informatica|l
Sistemista|Systems administrator|Systemadministrator|Administrateur systèmes|informatica|l
Data analyst|Data analyst|Datenanalyst|Data analyst|ai-data|t
Data scientist|Data scientist|Data Scientist|Data scientist|ai-data|t
Machine learning engineer|Machine learning engineer|Machine Learning Engineer|Ingénieur machine learning|ai-data|t
Product manager|Product manager|Produktmanager|Chef de produit|startup|t
UX designer|UX designer|UX-Designer|Designer UX|design|t
Graphic designer|Graphic designer|Grafikdesigner|Graphiste|design|t
Interior designer|Interior designer|Innenarchitekt|Architecte d'intérieur|design|t
Architetto|Architect|Architekt|Architecte|studi-professionali|t
Geometra|Surveyor|Vermessungstechniker|Géomètre|edilizia|l
Elettricista|Electrician|Elektriker|Électricien|edilizia|l
Idraulico|Plumber|Installateur|Plombier|edilizia|l
Muratore|Bricklayer|Maurer|Maçon|edilizia|l
Ingegnere|Engineer|Ingenieur|Ingénieur|energia-industria|t
Operaio|Production operative|Produktionsmitarbeiter|Ouvrier de production|energia-industria|l
Tecnico manutentore|Maintenance technician|Instandhaltungstechniker|Technicien de maintenance|energia-industria|l
Addetta controllo qualità|Quality inspector|Qualitätsprüferin|Contrôleuse qualité|energia-industria|l
Meccanico|Mechanic|Mechaniker|Mécanicien|auto|l
Venditore auto|Car sales executive|Autoverkäufer|Vendeur automobile|auto|l
Sarta|Tailor|Schneiderin|Couturière|moda-lusso|l
Modellista|Pattern maker|Schnittdirektrice|Modéliste|moda-lusso|l
Product developer moda|Fashion product developer|Produktentwicklerin Mode|Chef de produit mode|moda-lusso|t
Merchandiser|Merchandiser|Merchandiserin|Merchandiser|moda-lusso|t
Addetta showroom|Showroom assistant|Showroom-Assistentin|Assistante showroom|moda-lusso|l
Orafa|Goldsmith|Goldschmiedin|Orfèvre|gioielli|l
Estetista|Beautician|Kosmetikerin|Esthéticienne|bellezza|l
Parrucchiera|Hairdresser|Friseurin|Coiffeuse|bellezza|l
Beauty advisor|Beauty advisor|Beauty-Beraterin|Conseillère beauté|bellezza|l
Agente immobiliare|Estate agent|Immobilienmaklerin|Agente immobilière|immobiliare|l
Property manager|Property manager|Immobilienverwalterin|Gestionnaire de biens|immobiliare|t
Agente di viaggio|Travel agent|Reiseverkehrskauffrau|Agente de voyages|turismo|l
Hostess|Flight attendant|Flugbegleiterin|Hôtesse de l'air|turismo|l
Guida turistica|Tour guide|Reiseleiterin|Guide touristique|turismo|l
Yacht crew|Yacht crew|Yacht-Crew|Équipage de yacht|nautica|l
Yacht broker|Yacht broker|Yachtmakler|Courtier en yachts|nautica|t
Hostess di bordo|Yacht stewardess|Stewardess auf Yachten|Hôtesse à bord|nautica|l
Addetta marketing|Marketing assistant|Marketing-Assistentin|Assistante marketing|media|t
Social media manager|Social media manager|Social Media Managerin|Social media manager|media|t
Content creator|Content creator|Content Creator|Créateur de contenu|media|t
Copywriter|Copywriter|Texter|Rédacteur publicitaire|media|t
Addetta stampa|Press officer|Pressereferentin|Attachée de presse|media|t
Giornalista|Journalist|Journalistin|Journaliste|media|t
Event manager|Event manager|Eventmanagerin|Chargée d'événementiel|media|t
Addetta risorse umane|HR assistant|Personalreferentin|Assistante RH|studi-professionali|t
Recruiter|Recruiter|Recruiterin|Chargée de recrutement|studi-professionali|t
Praticante avvocato|Trainee solicitor|Rechtsreferendarin|Avocate stagiaire|studi-professionali|t
Paralegal|Paralegal|Rechtsanwaltsfachangestellte|Assistante juridique|studi-professionali|t
Praticante commercialista|Trainee accountant|Steuerfachangestellte|Expert-comptable stagiaire|studi-professionali|t
Auditor|Auditor|Wirtschaftsprüfer|Auditeur|transaction-services|t
Addetto sportello bancario|Bank clerk|Bankkaufmann|Chargé d'accueil bancaire|banche-assicurazioni|l
Consulente finanziario|Financial adviser|Finanzberater|Conseiller financier|banche-assicurazioni|t
Agente assicurativo|Insurance agent|Versicherungsvertreter|Agent d'assurance|banche-assicurazioni|l
Analista crediti|Credit analyst|Kreditanalyst|Analyste crédit|banche-assicurazioni|t
Risk analyst|Risk analyst|Risikoanalyst|Analyste risques|banche-assicurazioni|t
Compliance analyst|Compliance analyst|Compliance-Analyst|Analyste conformité|banche-assicurazioni|t
Attuario|Actuary|Aktuar|Actuaire|banche-assicurazioni|t
Analista investment banking|Investment banking analyst|Investment-Banking-Analyst|Analyste en banque d'affaires|investment-banking|t
Stage M&A|M&A intern|Praktikum M&A|Stage fusions-acquisitions|investment-banking|s
Stage investment banking|Investment banking intern|Praktikum Investment Banking|Stage banque d'affaires|investment-banking|s
Summer analyst|Summer analyst|Summer Analyst|Summer analyst|investment-banking|s
Spring week|Spring week|Spring Week|Spring week|investment-banking|s
Insight day|Insight day|Insight Day|Journée découverte|investment-banking|s
Off-cycle internship|Off-cycle internship|Off-Cycle-Praktikum|Stage off-cycle|investment-banking|s
Analista private equity|Private equity analyst|Private-Equity-Analyst|Analyste private equity|private-equity|t
Stage private equity|Private equity intern|Praktikum Private Equity|Stage private equity|private-equity|s
Analista venture capital|Venture capital analyst|Venture-Capital-Analyst|Analyste capital-risque|venture-capital|t
Stage venture capital|Venture capital intern|Praktikum Venture Capital|Stage capital-risque|venture-capital|s
Analista asset management|Asset management analyst|Asset-Management-Analyst|Analyste gestion d'actifs|asset-management|t
Stage asset management|Asset management intern|Praktikum Asset Management|Stage gestion d'actifs|asset-management|s
Stage wealth management|Wealth management intern|Praktikum Wealth Management|Stage gestion de patrimoine|asset-management|s
Analista equity research|Equity research analyst|Aktienanalyst|Analyste actions|markets|t
Stage sales & trading|Sales and trading intern|Praktikum Sales & Trading|Stage salle des marchés|markets|s
Trader|Trader|Händler|Trader|markets|t
Analista finanziario|Financial analyst|Finanzanalyst|Analyste financier|corporate-finance|t
Stage corporate finance|Corporate finance intern|Praktikum Corporate Finance|Stage finance d'entreprise|corporate-finance|s
Stage tesoreria|Treasury intern|Praktikum Treasury|Stage trésorerie|corporate-finance|s
Stage FP&A|FP&A intern|Praktikum FP&A|Stage contrôle de gestion|corporate-finance|s
Business analyst|Business analyst|Business Analyst|Business analyst|consulting|t
Consulente strategico|Strategy consultant|Strategieberater|Consultant en stratégie|consulting|t
Stage consulenza strategica|Strategy consulting intern|Praktikum Strategieberatung|Stage conseil en stratégie|consulting|s
Consulente di management|Management consultant|Unternehmensberater|Consultant en management|consulting|t
Stage transaction services|Transaction services intern|Praktikum Transaction Services|Stage transaction services|transaction-services|s
Stage audit|Audit intern|Praktikum Wirtschaftsprüfung|Stage audit|transaction-services|s
Stage valuation|Valuation intern|Praktikum Bewertung|Stage évaluation|transaction-services|s
Stage due diligence|Due diligence intern|Praktikum Due Diligence|Stage due diligence|transaction-services|s
Stage fintech|Fintech intern|Praktikum Fintech|Stage fintech|fintech|s
Stage startup|Startup intern|Praktikum Startup|Stage startup|startup|s
Founder's associate|Founder's associate|Founder's Associate|Founder's associate|startup|t
Business operations|Business operations associate|Business Operations Associate|Chargé des opérations|startup|t
Growth analyst|Growth analyst|Growth Analyst|Analyste growth|startup|t
Stage data analyst|Data analyst intern|Praktikum Datenanalyse|Stage data analyst|ai-data|s
Stage AI|AI intern|Praktikum Künstliche Intelligenz|Stage intelligence artificielle|ai-data|s
Stage ricerca economica|Economic research intern|Praktikum Volkswirtschaft|Stage recherche économique|economics|s
Economista|Economist|Volkswirt|Économiste|economics|t
Research assistant|Research assistant|Wissenschaftliche Hilfskraft|Assistant de recherche|economics|s
Graduate programme|Graduate programme|Traineeprogramm|Programme graduate|investment-banking|s
Stage marketing|Marketing intern|Praktikum Marketing|Stage marketing|media|s
Stage risorse umane|HR intern|Praktikum Personal|Stage ressources humaines|studi-professionali|s
Stage legale|Legal intern|Praktikum Recht|Stage juridique|studi-professionali|s
Stage moda|Fashion intern|Praktikum Mode|Stage mode|moda-lusso|s
Stage retail lusso|Luxury retail intern|Praktikum Luxus-Einzelhandel|Stage retail luxe|moda-lusso|s
Stage buying|Buying intern|Praktikum Einkauf|Stage achats|moda-lusso|s
Stage hospitality|Hospitality intern|Praktikum Hotellerie|Stage hôtellerie|ospitalita-lusso|s
Stage nautica|Yachting intern|Praktikum Yachting|Stage nautisme|nautica|s
Stage supply chain|Supply chain intern|Praktikum Supply Chain|Stage supply chain|logistica|s
Stage software|Software engineering intern|Praktikum Softwareentwicklung|Stage développement logiciel|informatica|s
Stage ingegneria|Engineering intern|Praktikum Ingenieurwesen|Stage ingénieur|energia-industria|s
Stage vendite|Sales intern|Praktikum Vertrieb|Stage commercial|vendita|s
`;

export interface Position {
  it: string;
  en: string;
  de: string;
  fr: string;
  sector: string;
  track: "lavoro" | "stage" | "tutti";
}

const CURATED: Position[] = RAW.trim()
  .split("\n")
  .map((line) => {
    const [it, en, de, fr, sector, t] = line.split("|");
    return { it, en, de, fr, sector, track: t === "l" ? "lavoro" : t === "s" ? "stage" : "tutti" };
  });

/** "Verkaufsassistent/Verkaufsassistentin" → "Verkaufsassistent": the first form is searched. */
const firstForm = (s: string) => s.split("/")[0].trim();

/**
 * Every ESCO occupation in four languages, when imported (scripts/import-esco.ts writes
 * data/world/positions-esco.json; ESCO, European Commission). Read once, server side.
 */
function escoPositions(): Position[] {
  if (typeof window !== "undefined") return [];
  // The full import (data/world/occupations.json): every occupation, with its four names.
  const all = allOccupations();
  if (all.length) return all.map((o) => ({ it: firstForm(o.it), en: firstForm(o.en), de: firstForm(o.de), fr: firstForm(o.fr), sector: "", track: "tutti" as const }));
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("node:path") as typeof import("node:path");
    const file = path.join(process.cwd(), "data/world/positions-esco.json");
    if (!fs.existsSync(file)) return [];
    const rows = JSON.parse(fs.readFileSync(file, "utf8")) as [string, string, string, string, string, string[]][];
    return rows.map(([it, en, de, fr]) => ({ it: firstForm(it), en: firstForm(en), de: firstForm(de), fr: firstForm(fr), sector: "", track: "tutti" as const }));
  } catch {
    return [];
  }
}

/** The hand-made positions first (they carry a sector), then ESCO's, without repeats. */
export const POSITIONS: Position[] = (() => {
  const seen = new Set(CURATED.map((p) => p.it.toLowerCase()));
  return [...CURATED, ...escoPositions().filter((p) => !seen.has(p.it.toLowerCase()))];
})();

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const BY_NAME = new Map(POSITIONS.flatMap((p) => [p.it, p.en, p.de, p.fr].map((n) => [norm(n), p] as const)));

/** The position a typed role refers to, in any of the four languages. */
export function findPosition(role: string): Position | undefined {
  return BY_NAME.get(norm(role));
}

/** Positions for the questionnaire suggestions of one track. */
export function positionsFor(track: "lavoro" | "stage"): Position[] {
  // The questionnaire suggests the hand-made roles plus, when imported, every ESCO occupation.
  return POSITIONS.filter((p) => p.track === track || p.track === "tutti");
}

/** How many positions are known (hand-made + ESCO). */
export const positionCount = () => POSITIONS.length;

/** The same role in the languages of the chosen countries ("Contabile" → "Accountant", "Buchhalter"). */
export function translations(role: string, langs: ("it" | "en" | "de" | "fr")[]): string[] {
  const p = findPosition(role);
  if (!p) return [];
  return [...new Set(langs.map((l) => p[l]).filter((t) => norm(t) !== norm(role)))];
}

// --- Generic roles → specific positions -------------------------------------------------------------
// "Venditrice moda" on a job site brings back hundreds of unrelated listings. A generic role is turned
// into the precise titles that listings use, for the person's sector and level (ADR 0021).

const GENERIC_WORDS = new Set(
  "venditrice venditore venditori commessa commesso addetta addetto addetti vendite vendita sales seller shop assistant impiegata impiegato impiegati lavoro ufficio operaia operaio generico generica varie qualsiasi negozio retail boutique moda lusso abbigliamento fashion luxury gioielli gioielleria orologi orologeria amministrazione amministrativa amministrativo nel nella di del della in e".split(" "),
);
const SALES = /vendit|commess|vendite|vendita|sales|seller|negozio|retail|boutique|shop/;
const ADMIN = /impiegat|amministr|ufficio/;
type Level = "junior" | "middle" | "senior" | "lead" | "?";
const TITLES: Record<string, Partial<Record<string, Record<Level, string[]>>>> = {
  sales: {
    "moda-lusso": { junior: ["Sales associate lusso", "Client advisor"], middle: ["Client advisor", "Sales associate lusso"], senior: ["Store manager lusso", "Client advisor"], lead: ["Store manager lusso", "Responsabile di negozio"], "?": ["Client advisor", "Sales associate lusso", "Store manager lusso"] },
    gioielli: { junior: ["Client advisor", "Sales associate lusso"], middle: ["Client advisor", "Personal shopper"], senior: ["Store manager lusso", "Client advisor"], lead: ["Store manager lusso", "Responsabile di negozio"], "?": ["Client advisor", "Store manager lusso"] },
    default: { junior: ["Addetta vendite", "Commessa"], middle: ["Addetta vendite", "Visual merchandiser"], senior: ["Responsabile di negozio", "Addetta vendite"], lead: ["Responsabile di negozio", "Key account manager"], "?": ["Addetta vendite", "Responsabile di negozio"] },
  },
  admin: {
    default: { junior: ["Impiegata amministrativa", "Addetta contabilità"], middle: ["Impiegata amministrativa", "Contabile"], senior: ["Contabile", "Responsabile amministrativo"], lead: ["Responsabile amministrativo", "Controller"], "?": ["Impiegata amministrativa", "Contabile"] },
  },
};

/** Is this a generic role ("venditrice moda", "impiegata") rather than a job title? */
export function isGenericRole(role: string): boolean {
  if (findPosition(role) && !/^(commessa|commesso|addetta vendite)$/i.test(role.trim())) return false;
  const words = norm(role).split(/[^a-z0-9]+/).filter(Boolean);
  return words.length > 0 && words.every((w) => GENERIC_WORDS.has(w));
}

/**
 * The precise titles for a role at a level. Specific roles stay as they are; generic ones become
 * the 2-3 titles that listings in that sector actually use.
 */
export function specificTitles(role: string, level: Level = "?", likedSectors: string[] = []): string[] {
  if (!isGenericRole(role)) return [role];
  const t = norm(role);
  const family = SALES.test(t) ? "sales" : ADMIN.test(t) ? "admin" : null;
  if (!family) return [role];
  const sector = /moda|lusso|abbigliamento|fashion|luxury/.test(t) ? "moda-lusso" : /gioiell|orolog/.test(t) ? "gioielli" : (likedSectors.find((s) => TITLES[family][s]) ?? "default");
  const table = TITLES[family][sector] ?? TITLES[family].default!;
  return table[level] ?? table["?"];
}
