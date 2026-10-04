// Letter templates with merge fields: {azienda}, {ruolo}, {citta}, {fonte}, {nome}.
// Plain text first: no HTML is generated from templates.

export const MERGE_FIELDS = ["azienda", "ruolo", "citta", "fonte", "nome"] as const;
export type MergeField = (typeof MERGE_FIELDS)[number];
export type MergeValues = Partial<Record<MergeField, string | null>>;

const FALLBACKS: Record<MergeField, string> = {
  azienda: "la vostra azienda",
  ruolo: "la posizione aperta",
  citta: "",
  fonte: "il vostro annuncio",
  nome: "",
};

export function merge(template: string, values: MergeValues): string {
  return template
    .replace(/\{(azienda|ruolo|citta|fonte|nome)\}/g, (_, k: MergeField) => {
      const v = values[k];
      return v && v.trim() ? v.trim() : FALLBACKS[k];
    })
    .replace(/[ \t]+([,.;:])/g, "$1")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Fields used in a template that are not known. */
export function unknownFields(template: string): string[] {
  return [...template.matchAll(/\{([a-z]+)\}/g)].map((m) => m[1]).filter((f) => !(MERGE_FIELDS as readonly string[]).includes(f));
}

export interface TemplateSeed {
  name: string;
  kind: "job" | "spontaneous";
  subject: string;
  body: string;
}

/** Default templates for job seekers: short, plain Italian. Nothing invented about anyone's experience. */
export const DEFAULT_TEMPLATES: TemplateSeed[] = [
  {
    name: "Candidatura semplice",
    kind: "job",
    subject: "Candidatura per {ruolo} | {nome}",
    body: `Buongiorno,

ho visto {fonte} per il ruolo di {ruolo} a {citta} e vorrei candidarmi.

In allegato trovate il mio curriculum. Sarei felice di raccontarvi di più in un colloquio, anche telefonico.

Grazie per l'attenzione.
Cordiali saluti,
{nome}`,
  },
  {
    name: "Candidatura con disponibilità",
    kind: "job",
    subject: "Candidatura per {ruolo} | {nome}",
    body: `Gentile {azienda},

vi scrivo per candidarmi alla posizione di {ruolo} che ho trovato tramite {fonte}.

Sono disponibile da subito e posso organizzarmi per un colloquio nei giorni e negli orari che preferite. Allego il mio curriculum.

Resto a disposizione per qualsiasi informazione.
Cordiali saluti,
{nome}`,
  },
  {
    name: "Candidatura spontanea",
    kind: "spontaneous",
    subject: "Candidatura spontanea | {nome}",
    body: `Buongiorno,

vi scrivo perché mi piacerebbe lavorare con {azienda}. Ho visto che sul vostro sito invitate a inviare candidature spontanee.

In allegato trovate il mio curriculum. Se in futuro si aprisse una posizione adatta al mio profilo, sarei felice di sentirvi.

Grazie per l'attenzione.
Cordiali saluti,
{nome}`,
  },
];

/** Default templates for students looking for an internship (Italian first, English for international firms). */
export const STAGE_TEMPLATES: TemplateSeed[] = [
  {
    name: "Candidatura per uno stage",
    kind: "job",
    subject: "Candidatura stage: {ruolo} | {nome}",
    body: `Buongiorno,

frequento l'università e vorrei candidarmi per {ruolo}, che ho trovato tramite {fonte}.

In allegato trovate il mio curriculum. Sarei felice di approfondire in un colloquio, anche online, e di raccontarvi perché {azienda} mi interessa.

Grazie per l'attenzione.
Cordiali saluti,
{nome}`,
  },
  {
    name: "Internship application (English)",
    kind: "job",
    subject: "Application: {ruolo} | {nome}",
    body: `Dear Hiring Team,

I am a university student and I would like to apply for the {ruolo} position at {azienda}, which I found through {fonte}.

Please find my CV attached. I would welcome the chance to discuss how I could contribute to your team.

Kind regards,
{nome}`,
  },
  {
    name: "Candidatura spontanea per stage",
    kind: "spontaneous",
    subject: "Candidatura spontanea per uno stage | {nome}",
    body: `Buongiorno,

frequento l'università e mi piacerebbe fare uno stage presso {azienda}. Ho visto che sul vostro sito invitate a inviare candidature spontanee.

In allegato trovate il mio curriculum. Se si aprisse un'opportunità adatta, sarei felice di sentirvi.

Grazie per l'attenzione.
Cordiali saluti,
{nome}`,
  },
];

export function templatesFor(track: "lavoro" | "stage"): TemplateSeed[] {
  return track === "stage" ? STAGE_TEMPLATES : DEFAULT_TEMPLATES;
}
