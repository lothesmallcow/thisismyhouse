// The job sites worth an account and an alert, by country, track and career, and the senders of their
// alert e-mails (for a forwarding filter that sends Compass the alerts and nothing else).
import type { CountryCode } from "./geo";

export interface Platform {
  key: string;
  name: string;
  signup: string;
  why: string;
  countries: CountryCode[] | "all";
  /** Only for students. */
  students?: boolean;
  /** Only for these careers (sector slugs). */
  careers?: string[];
  /** Alert senders (addresses or domains) for the filter. */
  senders: string[];
}

const FINANCE = ["investment-banking", "private-equity", "venture-capital", "asset-management", "markets", "corporate-finance", "fintech", "banche-assicurazioni", "transaction-services"];

export const PLATFORMS: Platform[] = [
  { key: "linkedin", name: "LinkedIn", signup: "https://www.linkedin.com/signup", why: "Il più usato per stage e lavori d'ufficio: gli avvisi sono i più ricchi.", countries: "all", senders: ["jobalerts-noreply@linkedin.com", "jobs-noreply@linkedin.com", "jobs-listings@linkedin.com"] },
  { key: "indeed", name: "Indeed", signup: "https://secure.indeed.com/auth", why: "Il più grande per numero di annunci, anche piccole aziende.", countries: "all", senders: ["indeed.com"] },
  { key: "infojobs", name: "InfoJobs", signup: "https://www.infojobs.it", why: "Molto usato in Italia per lavori d'ufficio, vendita e servizi.", countries: ["IT"], senders: ["infojobs.it"] },
  { key: "efinancialcareers", name: "eFinancialCareers", signup: "https://www.efinancialcareers.com", why: "Specializzato in finanza: banche, fondi, consulenza finanziaria.", countries: "all", careers: FINANCE, senders: ["efinancialcareers.com"] },
  { key: "reed", name: "Reed", signup: "https://www.reed.co.uk/account/signup", why: "Tra i più usati nel Regno Unito.", countries: ["GB"], senders: ["reed.co.uk"] },
  { key: "brightnetwork", name: "Bright Network", signup: "https://www.brightnetwork.co.uk", why: "Stage e graduate scheme nel Regno Unito, per studenti.", countries: ["GB"], students: true, senders: ["brightnetwork.co.uk"] },
  { key: "stepstone", name: "StepStone", signup: "https://www.stepstone.de", why: "Il più usato in Germania.", countries: ["DE"], senders: ["stepstone.de"] },
  { key: "wttj", name: "Welcome to the Jungle", signup: "https://www.welcometothejungle.com", why: "Startup e aziende moderne, soprattutto in Francia.", countries: ["FR"], senders: ["welcometothejungle.com"] },
];

export function platformsFor(countries: CountryCode[], track: "lavoro" | "stage", careers: string[]): Platform[] {
  return PLATFORMS.filter(
    (p) =>
      (p.countries === "all" || p.countries.some((c) => countries.includes(c))) &&
      (!p.students || track === "stage") &&
      (!p.careers || p.careers.some((c) => careers.includes(c))),
  );
}

/** A Gmail search that matches only these platforms' alert e-mails (to create the forwarding filter). */
export function gmailFilter(platforms: Platform[]): string {
  return `from:(${platforms.flatMap((p) => p.senders).join(" OR ")})`;
}
