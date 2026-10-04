// The curated catalog people pick from ("Mi interessa" / "Da evitare"). Public company names
// only, no addresses or links invented: careers pages are found with a search link built at
// runtime. A city is given only where the office is well known; otherwise it stays empty.
// Anything missing is added by people with "Altro" (private to them until the admin shares it).

import type { CatalogTrack, CompanyKind } from "../db/schema";

export interface SectorSeed {
  slug: string;
  name: string;
  track: CatalogTrack;
  keywords: string[];
  themes?: string[]; // filled from SECTOR_THEMES below
}

export interface CompanySeed {
  name: string;
  kind: CompanyKind;
  sector: string; // main SectorSeed.slug
  track?: CatalogTrack; // default: from the kind
  aliases?: string[];
  city?: string;
  /** Other sectors the company is really in (Ferrari: auto, but also luxury fashion and lifestyle). */
  also?: string[];
  /** Themes of its own, beyond those of its sectors. */
  themes?: string[];
}

/** Broad themes. They connect sectors that look different but share a world: luxury fashion and yachts are both "lusso". */
export const THEME_LABELS: Record<string, string> = {
  lusso: "lusso",
  moda: "moda",
  abbigliamento: "abbigliamento",
  sartoria: "sartoria e artigianato",
  accessori: "accessori",
  "made-in-italy": "made in Italy",
  design: "design",
  bellezza: "bellezza",
  nautica: "nautica",
  motori: "motori",
  ingegneria: "ingegneria",
  ospitalita: "ospitalità",
  turismo: "turismo",
  food: "cibo e vino",
  retail: "negozi e retail",
  vendita: "vendita",
  clienti: "relazione con i clienti",
  finanza: "finanza",
  numeri: "numeri e analisi",
  consulenza: "consulenza",
  strategia: "strategia",
  tecnologia: "tecnologia",
  dati: "dati",
  startup: "startup",
  ufficio: "lavoro d'ufficio",
  "cura-persone": "cura delle persone",
  educazione: "educazione",
  logistica: "logistica",
  edilizia: "edilizia",
  impianti: "impianti",
  manuale: "lavoro manuale",
  energia: "energia",
  arte: "arte",
  cultura: "cultura",
  media: "media e comunicazione",
  sport: "sport",
  immobiliare: "immobiliare",
};

const SECTOR_THEMES: Record<string, string[]> = {
  "investment-banking": ["finanza", "consulenza", "numeri"],
  "private-equity": ["finanza", "numeri", "strategia"],
  "venture-capital": ["finanza", "startup", "tecnologia"],
  "asset-management": ["finanza", "numeri"],
  markets: ["finanza", "numeri", "dati"],
  "corporate-finance": ["finanza", "numeri", "ufficio"],
  consulting: ["consulenza", "strategia"],
  "transaction-services": ["finanza", "consulenza", "numeri"],
  fintech: ["finanza", "tecnologia", "startup"],
  startup: ["startup", "tecnologia", "strategia"],
  "ai-data": ["tecnologia", "dati"],
  economics: ["dati", "strategia"],
  amministrazione: ["ufficio", "numeri"],
  segreteria: ["ufficio", "clienti"],
  vendita: ["vendita", "retail", "clienti"],
  "assistenza-clienti": ["clienti"],
  logistica: ["logistica", "manuale"],
  sanita: ["cura-persone"],
  ristorazione: ["ospitalita", "food", "clienti"],
  pulizie: ["manuale"],
  scuola: ["educazione", "cura-persone"],
  informatica: ["tecnologia"],
  "moda-lusso": ["lusso", "moda", "abbigliamento", "made-in-italy", "retail"],
  gioielli: ["lusso", "accessori", "made-in-italy", "retail"],
  bellezza: ["bellezza", "retail"],
  design: ["design", "lusso", "made-in-italy"],
  food: ["food", "made-in-italy"],
  auto: ["motori", "ingegneria", "made-in-italy"],
  "arte-cultura": ["arte", "cultura"],
  turismo: ["turismo", "ospitalita", "clienti"],
  "banche-assicurazioni": ["finanza", "clienti", "ufficio"],
  immobiliare: ["immobiliare", "vendita"],
  "studi-professionali": ["ufficio"],
  "energia-industria": ["energia", "ingegneria"],
  nautica: ["lusso", "nautica", "made-in-italy", "ingegneria", "vendita"],
  "ospitalita-lusso": ["lusso", "ospitalita", "turismo", "clienti"],
  edilizia: ["edilizia", "impianti", "manuale"],
  sport: ["sport", "retail"],
  media: ["media", "cultura"],
};

export const KIND_LABELS: Record<CompanyKind, string> = {
  boutique: "Boutique di advisory",
  banca: "Banche d'investimento e banche",
  fondo: "Fondi: private equity, venture capital, asset management",
  consulenza: "Consulenza",
  startup: "Startup e fintech",
  brand: "Brand e grandi aziende",
  azienda: "Altre aziende",
  programma: "Programmi per studenti",
};

/** Kinds shown first, per track. */
export const KIND_ORDER: Record<"lavoro" | "stage", CompanyKind[]> = {
  stage: ["boutique", "banca", "fondo", "consulenza", "startup", "brand", "programma", "azienda"],
  lavoro: ["brand", "azienda", "banca", "consulenza", "startup", "boutique", "fondo", "programma"],
};

export const SECTORS: SectorSeed[] = (<SectorSeed[]>[
  // Students: finance, consulting, startups
  { slug: "investment-banking", name: "Investment banking e M&A", track: "stage", keywords: ["investment banking", "m&a", "mergers", "acquisitions", "fusioni e acquisizioni", "financial advisory", "corporate finance advisory", "ecm", "dcm", "leveraged finance", "debt advisory"] },
  { slug: "private-equity", name: "Private equity", track: "stage", keywords: ["private equity", "buyout", "growth equity", "portfolio companies"] },
  { slug: "venture-capital", name: "Venture capital", track: "stage", keywords: ["venture capital", "vc fund", "seed investing", "startup investing", "dealflow", "deal flow"] },
  { slug: "asset-management", name: "Asset management e wealth", track: "stage", keywords: ["asset management", "wealth management", "investment management", "portfolio management", "gestione patrimoni", "sgr"] },
  { slug: "markets", name: "Mercati: trading e research", track: "stage", keywords: ["sales & trading", "sales and trading", "trading", "equity research", "fixed income", "global markets", "capital markets", "research analyst"] },
  { slug: "corporate-finance", name: "Finanza d'impresa", track: "stage", keywords: ["corporate finance", "fp&a", "financial planning", "controllo di gestione", "controlling", "treasury", "tesoreria", "investor relations", "finance department"] },
  { slug: "consulting", name: "Consulenza strategica", track: "stage", keywords: ["management consulting", "strategy consulting", "consulenza strategica", "consulenza direzionale", "business analyst", "strategy analyst"] },
  { slug: "transaction-services", name: "Transaction services e deals", track: "stage", keywords: ["transaction services", "due diligence", "deal advisory", "valuation", "valutazioni", "financial due diligence", "deals"] },
  { slug: "fintech", name: "Fintech", track: "stage", keywords: ["fintech", "payments", "pagamenti digitali", "neobank", "insurtech", "open banking"] },
  { slug: "startup", name: "Startup e imprenditorialità", track: "stage", keywords: ["startup", "start-up", "founders associate", "founder's associate", "business development", "growth", "venture builder", "imprenditorialita"] },
  { slug: "ai-data", name: "AI e dati", track: "stage", keywords: ["intelligenza artificiale", "artificial intelligence", "machine learning", "data analyst", "data scientist", "data science", "analytics", "llm"] },
  { slug: "economics", name: "Ricerca economica e policy", track: "stage", keywords: ["economic research", "ricerca economica", "economist", "economista", "policy analyst", "think tank"] },
  // Jobs: the names of the first ten match the sectors the extraction rules detect in ads
  { slug: "amministrazione", name: "Amministrazione e contabilità", track: "lavoro", keywords: ["amministrativa", "amministrativo", "contabilità", "contabile", "fatturazione", "paghe"] },
  { slug: "segreteria", name: "Segreteria e reception", track: "lavoro", keywords: ["segretaria", "segretario", "receptionist", "centralinista", "front office", "assistente di direzione"] },
  { slug: "vendita", name: "Vendita e negozi", track: "lavoro", keywords: ["commessa", "commesso", "addetta vendite", "addetto vendite", "sales assistant", "cassiera", "negozio"] },
  { slug: "assistenza-clienti", name: "Assistenza clienti", track: "lavoro", keywords: ["customer care", "customer service", "call center", "assistenza clienti", "help desk"] },
  { slug: "logistica", name: "Logistica e magazzino", track: "lavoro", keywords: ["magazzino", "magazziniere", "logistica", "spedizioni", "carrellista"] },
  { slug: "sanita", name: "Sanità e assistenza", track: "lavoro", keywords: ["oss", "infermiera", "infermiere", "assistenza anziani", "badante", "caregiver"] },
  { slug: "ristorazione", name: "Ristorazione e hotel", track: "lavoro", keywords: ["cameriera", "cameriere", "cuoco", "barista", "aiuto cuoco", "receptionist hotel"] },
  { slug: "pulizie", name: "Pulizie e servizi", track: "lavoro", keywords: ["pulizie", "custode", "portineria"] },
  { slug: "scuola", name: "Scuola e formazione", track: "lavoro", keywords: ["insegnante", "educatrice", "educatore", "docente", "segreteria scolastica"] },
  { slug: "informatica", name: "Informatica", track: "tutti", keywords: ["software", "sviluppatore", "developer", "it support"] },
  // Both
  { slug: "moda-lusso", name: "Moda e lusso", track: "tutti", keywords: ["moda", "fashion", "luxury", "lusso", "boutique", "abbigliamento", "atelier", "sartoria", "pelletteria", "accessori"] },
  { slug: "gioielli", name: "Gioielleria e orologeria", track: "tutti", keywords: ["gioielleria", "gioielli", "jewellery", "jewelry", "orologeria", "orologi", "watches", "orafo"] },
  { slug: "bellezza", name: "Cosmesi e profumeria", track: "tutti", keywords: ["cosmetica", "cosmetics", "profumeria", "beauty", "skincare", "make-up", "fragranze"] },
  { slug: "design", name: "Arredamento e design", track: "tutti", keywords: ["arredamento", "interior design", "showroom", "mobili", "furniture", "illuminazione", "design"] },
  { slug: "food", name: "Alimentare, vino e ristorazione di marca", track: "tutti", keywords: ["food", "alimentare", "beverage", "enoteca", "vino", "wine", "gastronomia", "fmcg", "largo consumo"] },
  { slug: "auto", name: "Auto e motori", track: "tutti", keywords: ["automotive", "automobili", "motori", "pneumatici", "motorsport"] },
  { slug: "arte-cultura", name: "Arte, antiquariato e cultura", track: "tutti", keywords: ["galleria d'arte", "antiquariato", "casa d'aste", "auction", "museo", "fondazione culturale", "editoria"] },
  { slug: "turismo", name: "Turismo e viaggi", track: "tutti", keywords: ["turismo", "agenzia viaggi", "tour operator", "travel", "hospitality"] },
  { slug: "banche-assicurazioni", name: "Banche e assicurazioni", track: "tutti", keywords: ["banca", "bank", "assicurazioni", "insurance", "sportello bancario"] },
  { slug: "immobiliare", name: "Immobiliare", track: "tutti", keywords: ["immobiliare", "real estate", "agenzia immobiliare", "property"] },
  { slug: "studi-professionali", name: "Studi professionali", track: "lavoro", keywords: ["studio legale", "studio notarile", "studio commercialista", "studio professionale"] },
  { slug: "energia-industria", name: "Energia e industria", track: "tutti", keywords: ["energia", "energy", "utilities", "industria", "manufacturing", "aerospazio", "infrastrutture"] },
  { slug: "nautica", name: "Nautica e yacht", track: "tutti", keywords: ["yacht", "nautica", "cantiere navale", "superyacht", "imbarcazioni", "boat"] },
  { slug: "ospitalita-lusso", name: "Hotel e ospitalità di lusso", track: "tutti", keywords: ["luxury hotel", "hotel di lusso", "resort", "concierge", "guest relations", "hospitality"] },
  { slug: "edilizia", name: "Edilizia e impianti", track: "lavoro", keywords: ["edilizia", "cantiere", "idraulico", "idraulica", "impianti", "elettricista", "termoidraulica", "muratore"] },
  { slug: "sport", name: "Sport e outdoor", track: "tutti", keywords: ["sport", "outdoor", "fitness", "articoli sportivi", "sportswear"] },
  { slug: "media", name: "Media, editoria e comunicazione", track: "tutti", keywords: ["media", "editoria", "giornalismo", "comunicazione", "pubblicità", "advertising", "marketing"] },
]).map((x) => ({ ...x, themes: SECTOR_THEMES[x.slug] ?? [] }));

const DEFAULT_TRACK: Record<CompanyKind, CatalogTrack> = {
  boutique: "stage",
  banca: "tutti",
  fondo: "stage",
  consulenza: "stage",
  startup: "stage",
  brand: "tutti",
  azienda: "tutti",
  programma: "stage",
};

export function companyTrack(c: CompanySeed): CatalogTrack {
  return c.track ?? DEFAULT_TRACK[c.kind];
}

const boutique = (name: string, city?: string, aliases?: string[]): CompanySeed => ({ name, kind: "boutique", sector: "investment-banking", city, aliases });
const bank = (name: string, aliases?: string[], city?: string): CompanySeed => ({ name, kind: "banca", sector: "investment-banking", aliases, city });
const fund = (name: string, sector: string, city?: string, aliases?: string[]): CompanySeed => ({ name, kind: "fondo", sector, city, aliases });
const consult = (name: string, sector = "consulting", aliases?: string[]): CompanySeed => ({ name, kind: "consulenza", sector, aliases });
const startup = (name: string, sector: string, city?: string, aliases?: string[]): CompanySeed => ({ name, kind: "startup", sector, city, aliases });
const brand = (name: string, sector: string, aliases?: string[], extra?: Partial<CompanySeed>): CompanySeed => ({ name, kind: "brand", sector, aliases, ...extra });

export const COMPANIES: CompanySeed[] = [
  // Advisory boutiques and independent investment banks
  boutique("Lazard", "Milano"),
  boutique("Rothschild & Co", "Milano", ["Rothschild"]),
  boutique("Houlihan Lokey", "Milano"),
  boutique("Lincoln International", "Milano"),
  boutique("Alantra", "Milano"),
  boutique("Vitale & Co", "Milano", ["Vitale"]),
  boutique("Equita", "Milano", ["Equita SIM", "Equita Group"]),
  boutique("Ethica Group", "Milano", ["Ethica Corporate Finance"]),
  boutique("Fineurop Soditic", "Milano"),
  boutique("Evercore"),
  boutique("PJT Partners"),
  boutique("Moelis & Company", undefined, ["Moelis"]),
  boutique("Perella Weinberg Partners", undefined, ["Perella Weinberg", "PWP"]),
  boutique("Centerview Partners"),
  boutique("DC Advisory"),
  boutique("Oaklins"),
  boutique("Clairfield International", undefined, ["Clairfield"]),
  boutique("Arma Partners"),
  // Banks
  bank("Mediobanca", [], "Milano"),
  bank("Intesa Sanpaolo", ["IMI CIB", "Intesa Sanpaolo IMI Corporate & Investment Banking"], "Milano"),
  bank("UniCredit", [], "Milano"),
  bank("Banca Akros", [], "Milano"),
  bank("Intermonte", ["Intermonte SIM"], "Milano"),
  bank("Goldman Sachs"),
  bank("J.P. Morgan", ["JPMorgan", "JP Morgan", "JPMorgan Chase"]),
  bank("Morgan Stanley"),
  bank("BofA Securities", ["Bank of America", "BofA"]),
  bank("Citi", ["Citigroup", "Citibank"]),
  bank("Barclays"),
  bank("Deutsche Bank"),
  bank("UBS"),
  bank("BNP Paribas"),
  bank("HSBC"),
  bank("Jefferies"),
  bank("Nomura"),
  bank("Société Générale", ["Societe Generale", "SocGen"]),
  bank("Crédit Agricole CIB", ["Credit Agricole CIB", "Crédit Agricole"]),
  // Private equity
  fund("Permira", "private-equity"),
  fund("CVC Capital Partners", "private-equity", undefined, ["CVC"]),
  fund("Bain Capital", "private-equity"),
  fund("KKR", "private-equity"),
  fund("Carlyle", "private-equity", undefined, ["The Carlyle Group"]),
  fund("Blackstone", "private-equity"),
  fund("EQT", "private-equity"),
  fund("Ardian", "private-equity"),
  fund("Investindustrial", "private-equity"),
  fund("Clessidra", "private-equity", "Milano"),
  fund("Ambienta", "private-equity", "Milano"),
  fund("Wise Equity", "private-equity", "Milano"),
  fund("Alto Partners", "private-equity", "Milano"),
  fund("NB Renaissance", "private-equity", "Milano"),
  fund("Fondo Italiano d'Investimento", "private-equity", "Milano"),
  fund("Tamburi Investment Partners", "private-equity", "Milano", ["TIP"]),
  // Venture capital
  fund("P101", "venture-capital", "Milano"),
  fund("United Ventures", "venture-capital", "Milano"),
  fund("360 Capital", "venture-capital"),
  fund("CDP Venture Capital", "venture-capital", "Roma"),
  fund("LVenture Group", "venture-capital", "Roma"),
  fund("Italian Angels for Growth", "venture-capital"),
  // Asset management
  fund("Eurizon", "asset-management", "Milano"),
  fund("Generali Asset Management", "asset-management", undefined, ["Generali Investments"]),
  fund("Amundi", "asset-management"),
  fund("Anima", "asset-management", "Milano", ["Anima SGR"]),
  fund("Kairos Partners", "asset-management", "Milano", ["Kairos"]),
  fund("Azimut Holding", "asset-management", "Milano", ["Azimut SGR"]),
  fund("Banca Mediolanum", "asset-management", undefined, ["Mediolanum"]),
  fund("Fideuram", "asset-management", undefined, ["Fideuram Intesa Sanpaolo Private Banking"]),
  fund("FinecoBank", "asset-management", "Milano", ["Fineco"]),
  fund("Algebris", "asset-management"),
  fund("BlackRock", "asset-management"),
  fund("Pictet", "asset-management"),
  // Consulting
  consult("McKinsey & Company", "consulting", ["McKinsey"]),
  consult("Boston Consulting Group", "consulting", ["BCG"]),
  consult("Bain & Company", "consulting", ["Bain"]),
  consult("Roland Berger"),
  consult("Oliver Wyman"),
  consult("Kearney", "consulting", ["A.T. Kearney"]),
  consult("Strategy&", "consulting", ["Strategy& PwC"]),
  consult("EY-Parthenon", "consulting", ["EY Parthenon"]),
  consult("Arthur D. Little"),
  consult("L.E.K. Consulting", "consulting", ["LEK Consulting"]),
  consult("Simon-Kucher", "consulting", ["Simon Kucher"]),
  consult("Accenture"),
  consult("Bip", "consulting", ["Business Integration Partners"]),
  consult("TEHA Group", "consulting", ["The European House - Ambrosetti", "Ambrosetti"]),
  consult("Prometeia", "economics"),
  consult("Deloitte", "transaction-services", ["Deloitte Financial Advisory", "Monitor Deloitte"]),
  consult("KPMG", "transaction-services", ["KPMG Advisory"]),
  consult("PwC", "transaction-services", ["PricewaterhouseCoopers", "PwC Deals"]),
  consult("EY", "transaction-services", ["Ernst & Young"]),
  // Startups and fintech
  startup("Satispay", "fintech", "Milano"),
  startup("Scalapay", "fintech", "Milano"),
  startup("Moneyfarm", "fintech"),
  startup("Young Platform", "fintech", "Torino"),
  startup("Qonto", "fintech"),
  startup("Revolut", "fintech"),
  startup("Stripe", "fintech"),
  startup("Bending Spoons", "startup", "Milano"),
  startup("Casavo", "immobiliare", "Milano"),
  startup("Prima Assicurazioni", "fintech", "Milano", ["Prima"]),
  startup("Everli", "startup", "Milano"),
  startup("Translated", "ai-data", "Roma"),
  startup("B4i - Bocconi for Innovation", "startup", "Milano", ["B4i", "Bocconi for Innovation"]),
  // Brands and large companies
  brand("Ferrero", "food", [], { themes: ["vendita"] }),
  brand("Barilla", "food"),
  brand("Lavazza", "food"),
  brand("Campari Group", "food", ["Campari", "Davide Campari"]),
  brand("Illy", "food", ["illycaffè"]),
  brand("Ferrari", "auto", [], { also: ["moda-lusso", "sport"], themes: ["lusso"] }), // cars, but also fashion, lifestyle and Formula 1
  brand("Pirelli", "auto", [], { also: ["sport", "arte-cultura"], themes: ["design"] }),
  brand("Stellantis", "auto", ["Fiat"]),
  brand("Lamborghini", "auto", ["Automobili Lamborghini"], { also: ["moda-lusso"], themes: ["lusso"] }),
  brand("EssilorLuxottica", "moda-lusso", ["Luxottica"], { also: ["bellezza"], themes: ["tecnologia", "accessori"] }),
  brand("Prada Group", "moda-lusso", ["Prada", "Miu Miu"], { also: ["nautica", "food"], themes: ["accessori"] }), // Luna Rossa sailing, Marchesi pastry
  brand("Giorgio Armani", "moda-lusso", ["Armani"], { also: ["design", "ospitalita-lusso", "bellezza"] }), // Armani Casa, Armani Hotels, beauty
  brand("Moncler", "moda-lusso", [], { also: ["sport"] }),
  brand("Brunello Cucinelli", "moda-lusso"),
  brand("Ferragamo", "moda-lusso", ["Salvatore Ferragamo"], { also: ["ospitalita-lusso"], themes: ["accessori"] }),
  brand("Tod's", "moda-lusso", ["Tods"], { themes: ["accessori"] }),
  brand("Zegna", "moda-lusso", ["Ermenegildo Zegna"]),
  brand("OTB", "moda-lusso", ["Diesel", "Only The Brave"]),
  brand("Max Mara", "moda-lusso", ["Max Mara Fashion Group"]),
  brand("Dolce&Gabbana", "moda-lusso", ["Dolce & Gabbana"]),
  brand("Valentino", "moda-lusso"),
  brand("Versace", "moda-lusso", [], { also: ["design"] }),
  brand("Gucci", "moda-lusso"),
  brand("Bottega Veneta", "moda-lusso", [], { themes: ["accessori", "sartoria"] }),
  brand("Etro", "moda-lusso"),
  brand("Golden Goose", "moda-lusso"),
  brand("Kering", "moda-lusso", [], { also: ["gioielli", "bellezza"] }),
  brand("LVMH", "moda-lusso", [], { also: ["gioielli", "bellezza", "food", "ospitalita-lusso"] }),
  brand("Rinascente", "moda-lusso", [], { also: ["bellezza", "design", "food"], themes: ["vendita"] }),
  brand("Bulgari", "gioielli", ["Bvlgari"], { also: ["ospitalita-lusso", "bellezza"] }), // Bulgari Hotels, fragrances
  brand("Pomellato", "gioielli"),
  brand("Damiani", "gioielli"),
  brand("Panerai", "gioielli", [], { also: ["nautica"] }),
  brand("Intercos", "bellezza"),
  brand("KIKO Milano", "bellezza", ["Kiko"]),
  brand("L'Oréal", "bellezza", ["L'Oreal", "Loreal"]),
  brand("Davines", "bellezza"),
  brand("Kartell", "design", [], { themes: ["retail"] }),
  brand("B&B Italia", "design"),
  brand("Cassina", "design"),
  brand("Poltrona Frau", "design"),
  brand("Flos", "design"),
  brand("Molteni&C", "design", ["Molteni"]),
  brand("Generali", "banche-assicurazioni", ["Assicurazioni Generali"], { also: ["immobiliare", "asset-management"] }),
  brand("Enel", "energia-industria"),
  brand("Eni", "energia-industria"),
  brand("Leonardo", "energia-industria", [], { also: ["informatica"], themes: ["tecnologia"] }),
  brand("Snam", "energia-industria"),
  brand("Feltrinelli", "arte-cultura", [], { also: ["media"], themes: ["retail"] }),
  brand("Sotheby's", "arte-cultura", ["Sothebys"], { also: ["immobiliare"], themes: ["lusso", "vendita"] }),
  brand("Christie's", "arte-cultura", ["Christies"], { themes: ["lusso", "vendita"] }),
  // Luxury tailoring and fashion houses
  brand("Kiton", "moda-lusso", [], { themes: ["sartoria"], city: "Napoli" }),
  brand("Loro Piana", "moda-lusso", [], { themes: ["sartoria"] }),
  brand("Brioni", "moda-lusso", [], { themes: ["sartoria"] }),
  brand("Isaia", "moda-lusso", [], { themes: ["sartoria"], city: "Napoli" }),
  brand("Stefano Ricci", "moda-lusso", [], { themes: ["sartoria"], also: ["design"] }),
  brand("Fendi", "moda-lusso", [], { also: ["design"], themes: ["accessori"] }),
  // Yachts
  brand("Ferretti Group", "nautica", ["Ferretti", "Riva", "Wally", "Pershing", "CRN"]),
  brand("Azimut Benetti", "nautica", ["Azimut Yachts", "Benetti"]),
  brand("Sanlorenzo", "nautica", ["Sanlorenzo Yachts"]),
  brand("The Italian Sea Group", "nautica", ["Perini Navi", "Admiral"]),
  // Luxury hospitality
  brand("Belmond", "ospitalita-lusso", ["Hotel Cipriani", "Belmond Hotel Cipriani"]),
  brand("Four Seasons", "ospitalita-lusso", ["Four Seasons Hotels"]),
  brand("Rosewood Hotels", "ospitalita-lusso", ["Rosewood"]),
  brand("Aman", "ospitalita-lusso", ["Aman Resorts"]),
  brand("Lungarno Collection", "ospitalita-lusso", [], { city: "Firenze" }),
  // Construction, utilities, sport, media
  brand("Webuild", "edilizia", ["Salini Impregilo"], { also: ["energia-industria"] }),
  brand("A2A", "energia-industria", [], { also: ["edilizia"] }),
  brand("Hera", "energia-industria", ["Gruppo Hera"], { also: ["edilizia"] }),
  brand("Technogym", "sport", [], { also: ["design"], themes: ["tecnologia"] }),
  brand("Decathlon", "sport", [], { themes: ["vendita"] }),
  brand("Mediaset", "media", ["MFE", "MFE-MediaForEurope"]),
  brand("RCS MediaGroup", "media", ["RCS", "Corriere della Sera"]),
];

/** Personal tastes asked in the questionnaire, each pointing at catalog sectors. */
export const TASTES: { key: string; label: string; sectors: string[] }[] = [
  { key: "finanza", label: "Finanza e mercati", sectors: ["investment-banking", "private-equity", "venture-capital", "asset-management", "markets", "corporate-finance", "fintech", "banche-assicurazioni"] },
  { key: "imprenditoria", label: "Startup e nuove imprese", sectors: ["startup", "venture-capital", "fintech"] },
  { key: "tecnologia", label: "Tecnologia e AI", sectors: ["ai-data", "informatica", "fintech"] },
  { key: "strategia", label: "Strategia e problem solving", sectors: ["consulting", "transaction-services", "economics"] },
  { key: "moda", label: "Moda e lusso", sectors: ["moda-lusso", "gioielli"] },
  { key: "bellezza", label: "Bellezza e benessere", sectors: ["bellezza"] },
  { key: "design", label: "Design e arredamento", sectors: ["design"] },
  { key: "cibo", label: "Cibo e vino", sectors: ["food", "ristorazione"] },
  { key: "motori", label: "Auto e motori", sectors: ["auto"] },
  { key: "arte", label: "Arte e cultura", sectors: ["arte-cultura"] },
  { key: "viaggi", label: "Viaggi e ospitalità", sectors: ["turismo", "ristorazione"] },
  { key: "persone", label: "Lavorare con le persone", sectors: ["vendita", "assistenza-clienti", "sanita", "scuola"] },
  { key: "ordine", label: "Organizzazione e numeri", sectors: ["amministrazione", "segreteria", "corporate-finance"] },
  { key: "energia", label: "Energia e industria", sectors: ["energia-industria", "auto"] },
];
