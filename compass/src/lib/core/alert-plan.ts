// The job alerts a person should create on LinkedIn, Indeed and InfoJobs, from their search code:
// the precise words in each country's language, the place, and the level filters already applied,
// so each alert brings the right offers to the mailbox Compass reads.
import type { CountryCode } from "./geo";
import { COUNTRIES } from "./geo";
import type { CodeQuery } from "./search-code";

export type AlertSite = "LinkedIn" | "Indeed" | "InfoJobs";
export type AlertLevel = "stage" | "junior" | "middle" | "senior";

export interface PlannedAlert {
  /** Stable key, for "done". */
  key: string;
  site: AlertSite;
  country: CountryCode;
  what: string;
  where: string;
  /** What is already filtered, in words ("Stage · ultimi 7 giorni · più recenti"). */
  filters: string;
  url: string;
}

/** At most this many searches per country: platforms cap alerts, and more means more noise. */
export const ALERTS_PER_COUNTRY = 4;

const INDEED: Record<CountryCode, string> = { IT: "it.indeed.com", GB: "uk.indeed.com", DE: "de.indeed.com", FR: "fr.indeed.com" };
// LinkedIn experience filter: 1 internship, 2 entry, 3 associate, 4 mid-senior.
const LI_LEVEL: Record<AlertLevel, string> = { stage: "1", junior: "1,2", middle: "2,3", senior: "3,4" };
const LEVEL_WORD: Record<AlertLevel, string> = { stage: "Stage", junior: "Entry level", middle: "Junior e associate", senior: "Associate e senior" };

export function levelFor(track: "lavoro" | "stage", years: number | null): AlertLevel {
  if (track === "stage") return "stage";
  if (years == null || years <= 2) return "junior";
  return years <= 6 ? "middle" : "senior";
}

/** From the person's API searches (one per term and country, already translated). */
export function planAlerts(queries: CodeQuery[], level: AlertLevel): PlannedAlert[] {
  const out: PlannedAlert[] = [];
  const perCountry = new Map<string, number>();
  for (const q of queries.filter((x) => x.channel === "api")) {
    const n = perCountry.get(q.country) ?? 0;
    if (n >= ALERTS_PER_COUNTRY) continue;
    perCountry.set(q.country, n + 1);
    // The level is a filter: take the "junior" word out of the search itself.
    const what = q.what.replace(/\s+junior$/i, "");
    const where = q.where || COUNTRIES.find((c) => c.code === q.country)!.name;
    const k = encodeURIComponent(what);
    const l = encodeURIComponent(where);
    const base = `${q.country}|${what.toLowerCase()}|${where.toLowerCase()}`;
    const li = new URLSearchParams({ keywords: what, location: where, f_E: LI_LEVEL[level], f_TPR: "r604800", sortBy: "DD", ...(level === "stage" ? { f_JT: "I" } : {}) });
    out.push({ key: `li|${base}`, site: "LinkedIn", country: q.country, what, where, filters: `${LEVEL_WORD[level]} · ultima settimana · più recenti`, url: `https://www.linkedin.com/jobs/search/?${li}` });
    const indeed = new URLSearchParams({ q: what, l: where, sort: "date", fromage: "7", ...(level === "stage" ? { jt: "internship" } : level === "junior" ? { explvl: "entry_level" } : {}) });
    out.push({ key: `in|${base}`, site: "Indeed", country: q.country, what, where, filters: `${level === "stage" ? "Stage · " : level === "junior" ? "Entry level · " : ""}ultimi 7 giorni · più recenti`, url: `https://${INDEED[q.country]}/jobs?${indeed}` });
    if (q.country === "IT") out.push({ key: `ij|${base}`, site: "InfoJobs", country: q.country, what, where, filters: "più recenti", url: `https://www.infojobs.it/offerte-lavoro?keyword=${k}&normalizedJobTitleIds=&provinceIds=&sortBy=PUBLICATION_DATE&location=${l}` });
  }
  return out;
}

/** How to save the open search as an alert, on each site, in two lines. */
export const HOW_TO: Record<AlertSite, string> = {
  LinkedIn: "In alto sopra i risultati attiva \"Imposta avviso\" (o la campanella), frequenza giornaliera, notifica via e-mail.",
  Indeed: "Clicca \"Ricevi nuove offerte via email\" (o la campanella) e conferma l'indirizzo e-mail.",
  InfoJobs: "Clicca \"Crea alert\" sopra i risultati, ricezione via e-mail.",
};

/** Who sends the alert e-mails, for a Gmail forwarding filter. */
export const ALERT_SENDERS = "from:(jobalerts-noreply@linkedin.com OR jobs-listings@linkedin.com OR alert@indeed.com OR noreply@infojobs.it)";
