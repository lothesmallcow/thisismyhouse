// How to get job alerts on each site, for any search the person wants (not only Compass's
// suggestions): the search link with the useful filters, and the steps to save it as an alert that
// arrives by e-mail. Site menus change names now and then: the steps say what to look for.
import type { CountryCode } from "./geo";

export interface SiteGuide {
  /** The search page for these words and place (null when the site cannot be searched by link). */
  searchUrl: (what: string, where: string, country: CountryCode) => string | null;
  /** From the open search to an alert by e-mail. */
  steps: string[];
  /** Where to check that the alert e-mails are on. */
  check: string;
  /** Where to see, and change, the e-mail address of the account (the alerts go there). */
  email: string;
}

const q = encodeURIComponent;
const slug = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const INDEED: Record<CountryCode, string> = { IT: "it.indeed.com", GB: "uk.indeed.com", DE: "de.indeed.com", FR: "fr.indeed.com" };

export const SITE_GUIDES: Record<string, SiteGuide> = {
  linkedin: {
    searchUrl: (what, where) => `https://www.linkedin.com/jobs/search/?${new URLSearchParams({ keywords: what, location: where, f_TPR: "r604800", sortBy: "DD" })}`,
    steps: [
      "Apri la ricerca qui sotto (sei già sui risultati, ordinati dai più recenti).",
      "Se vuoi, restringi con i filtri in alto: \"Livello di esperienza\" (Stage, Entry level…), \"Tipo di lavoro\", \"Da remoto\".",
      "Sopra i risultati attiva l'interruttore \"Imposta avviso\" (Set alert).",
      "Nella finestrella scegli frequenza \"Ogni giorno\" e notifica \"E-mail e notifiche\".",
    ],
    check: "LinkedIn → foto in alto → Impostazioni → Comunicazioni → E-mail → \"Ricerca di lavoro\": \"Avvisi di offerte\" acceso.",
    email: "LinkedIn → foto in alto → Impostazioni → Accesso e sicurezza → \"Indirizzi e-mail\": aggiungi quella giusta e rendila principale.",
  },
  indeed: {
    searchUrl: (what, where, cc) => `https://${INDEED[cc]}/jobs?${new URLSearchParams({ q: what, l: where, sort: "date", fromage: "7" })}`,
    steps: [
      "Apri la ricerca qui sotto (offerte degli ultimi 7 giorni, le più recenti prima).",
      "Se vuoi, usa i filtri sopra i risultati: \"Tipo di contratto\" (Stage, Tempo pieno…), \"Distanza\", \"Livello\".",
      "Clicca \"Ricevi nuove offerte via email\" (o la campanella vicino alla ricerca).",
      "Conferma l'e-mail se Indeed te lo chiede: deve essere la stessa collegata a Compass.",
    ],
    check: "Indeed → il tuo profilo → \"Avvisi di lavoro\": l'avviso è nell'elenco, frequenza giornaliera.",
    email: "Indeed → il tuo profilo → Impostazioni account → \"Indirizzo e-mail\" → Modifica.",
  },
  infojobs: {
    searchUrl: (what, where) => `https://www.infojobs.it/offerte-lavoro?keyword=${q(what)}&location=${q(where)}&sortBy=PUBLICATION_DATE`,
    steps: [
      "Apri la ricerca qui sotto (ordinata per data di pubblicazione).",
      "Se vuoi, usa i filtri a sinistra: categoria, tipo di contratto, esperienza.",
      "Clicca \"Crea alert\" (la campanella sopra i risultati).",
      "Scegli ricezione via e-mail, ogni giorno.",
    ],
    check: "InfoJobs → Area personale → \"I miei alert\": l'alert è attivo.",
    email: "InfoJobs → Area personale → Impostazioni / Dati di accesso → \"E-mail\".",
  },
  efinancialcareers: {
    searchUrl: (what, where) => `https://www.efinancialcareers.com/jobs?${new URLSearchParams({ q: what, location: where })}`,
    steps: [
      "Apri la ricerca qui sotto.",
      "Restringi con i filtri: settore (Investment Banking, Asset Management…), livello (Graduate, Internship…).",
      "Clicca \"Create job alert\" / \"Crea avviso\" sopra i risultati.",
      "Frequenza giornaliera, invio all'e-mail del tuo account.",
    ],
    check: "eFinancialCareers → il tuo account → \"Job alerts\": l'avviso è attivo.",
    email: "eFinancialCareers → My account → Account settings → \"Email\".",
  },
  reed: {
    searchUrl: (what, where) => `https://www.reed.co.uk/jobs/${slug(what)}-jobs-in-${slug(where || "london")}`,
    steps: ["Apri la ricerca qui sotto.", "Usa i filtri a sinistra se servono (Graduate, Contract type…).", "Clicca \"Create job alert\" sopra i risultati, frequenza giornaliera."],
    check: "Reed → My account → \"Job alerts\".",
    email: "Reed → My account → Account settings → \"Email address\".",
  },
  brightnetwork: {
    searchUrl: () => "https://www.brightnetwork.co.uk/graduate-jobs/",
    steps: [
      "Bright Network non manda avvisi per una ricerca singola: li manda in base alle tue preferenze.",
      "Apri il tuo profilo → \"Preferences\" e scegli settori, tipo (Internship, Graduate scheme) e città.",
      "In \"Email preferences\" attiva le e-mail con le nuove opportunità.",
    ],
    check: "Bright Network → Account → \"Email preferences\": opportunità attive.",
    email: "Bright Network → Account → Settings → \"Email\".",
  },
  stepstone: {
    searchUrl: (what, where) => `https://www.stepstone.de/jobs/${slug(what)}${where ? `/in-${slug(where)}` : ""}`,
    steps: ["Apri la ricerca qui sotto.", "Usa i filtri (Berufserfahrung, Anstellungsart) se servono.", "Clicca \"Job-Agent erstellen\" (crea un avviso), invio giornaliero per e-mail."],
    check: "StepStone → Mein Konto → \"Job-Agenten\".",
    email: "StepStone → Mein Konto (o \"Il mio account\") → Einstellungen → \"E-Mail-Adresse\".",
  },
  wttj: {
    searchUrl: (what, where) => `https://www.welcometothejungle.com/fr/jobs?${new URLSearchParams({ query: what, aroundQuery: where })}`,
    steps: ["Apri la ricerca qui sotto.", "Usa i filtri (Contrat: Stage, CDI…; Expérience) se servono.", "Clicca \"Créer une alerte\" sopra i risultati, ricezione per e-mail."],
    check: "Welcome to the Jungle → il tuo profilo → \"Alertes\".",
    email: "Welcome to the Jungle → il tuo profilo → Impostazioni → \"E-mail\".",
  },
};
