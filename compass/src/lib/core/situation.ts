// "Cosa fai ora?": the first question. It decides which questionnaire someone gets (student or job
// seeker), what the ranking assumes (a recent graduate is past the "final year"), and the help texts.
export type Situation = "superiori" | "triennale" | "magistrale" | "neolaureato" | "junior" | "esperto" | "cambio";

export const SITUATIONS: { key: Situation; label: string; hint: string; track: "stage" | "lavoro" }[] = [
  { key: "superiori", label: "Vado alle superiori", hint: "Esperienze estive, summer school, primi stage", track: "stage" },
  { key: "triennale", label: "Faccio la triennale", hint: "Spring week, insight day, stage estivi", track: "stage" },
  { key: "magistrale", label: "Faccio la magistrale (o un master)", hint: "Summer internship, stage curriculari, graduate programme", track: "stage" },
  { key: "neolaureato", label: "Mi sono appena laureato/a", hint: "Graduate programme, stage extracurriculari, primo lavoro", track: "stage" },
  { key: "junior", label: "Lavoro da meno di 3 anni", hint: "Il passo successivo o un ruolo simile", track: "lavoro" },
  { key: "esperto", label: "Lavoro da 3 anni o più", hint: "Ruoli del tuo livello, anche più in alto", track: "lavoro" },
  { key: "cambio", label: "Voglio cambiare settore o ruolo", hint: "Ruoli dove conta quello che sai fare, non solo il titolo", track: "lavoro" },
];

export const situationOf = (key: string | null | undefined) => SITUATIONS.find((s) => s.key === key) ?? null;

/** Students: the activities that tell more than a short CV. */
export const ACTIVITIES: { key: string; label: string; words: string }[] = [
  { key: "associazione", label: "Associazione o club universitario", words: "associazione studentesca club universitario student association" },
  { key: "finanza-club", label: "Club di finanza o investimenti", words: "finance club investing club investimenti mercati finanziari trading" },
  { key: "consulting-club", label: "Club di consulenza o case competition", words: "consulting club case competition consulenza strategia" },
  { key: "competizioni", label: "Competizioni (trading, business, hackathon)", words: "competizione competition hackathon trading challenge business game" },
  { key: "progetto", label: "Progetto personale o startup", words: "startup progetto imprenditoria founder fondatore app" },
  { key: "sport", label: "Sport a livello agonistico", words: "sport agonistico capitano squadra" },
  { key: "volontariato", label: "Volontariato", words: "volontariato volunteering" },
  { key: "lavoretti", label: "Lavoretti (part-time, estivi, ripetizioni)", words: "lavoro part-time estivo ripetizioni" },
  { key: "estero", label: "Esperienze all'estero (scambio, Erasmus)", words: "erasmus exchange estero international" },
  { key: "coding", label: "Programmazione o dati", words: "python coding programmazione data analysis dati" },
];

export const NOTICE: { key: string; label: string }[] = [
  { key: "subito", label: "Posso iniziare subito" },
  { key: "1-mese", label: "Entro un mese" },
  { key: "2-3-mesi", label: "Due o tre mesi (preavviso)" },
  { key: "oltre", label: "Più di tre mesi" },
];

export const WORK_RIGHTS: { key: string; label: string }[] = [
  { key: "UE", label: "Unione Europea (sei cittadino/a UE)" },
  { key: "GB", label: "Regno Unito" },
  { key: "US", label: "Stati Uniti" },
  { key: "CH", label: "Svizzera" },
];

/** "Dove puoi lavorare senza visto?" from a form (only when the field was on the page). */
export const workRightsOf = (f: FormData) => (f.get("workRightsShown") ? { workRights: f.getAll("workRight").map(String).filter((w) => WORK_RIGHTS.some((x) => x.key === w)) } : {});

const EU = new Set(["IT", "DE", "FR"]);

/** Would working there need a visa they do not have? `country` "" = a place outside the four we cover (unknown). */
export function needsVisa(country: string | null | undefined, rights: string[], homeCountries: string[] = []): boolean {
  if (!country) return country === "" && !rights.includes("US") && !rights.includes("CH");
  if (country === "GB") return !rights.includes("GB");
  if (EU.has(country)) return !rights.includes("UE") && !homeCountries.includes(country);
  return true;
}
