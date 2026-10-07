// The search code: a person's questionnaire turned into a few brackets (track, places, roles,
// level, sectors, hours/contract), and from the code a fixed batch of searches, each with a stable
// key. People with the same brackets share the same searches (made once), and changing one answer
// changes only the searches that depend on it: the others stay cached (ADR 0021).
import { specificTitles, translations } from "../catalog/positions";
import { COUNTRIES, type CountryCode } from "./geo";
import { fold } from "./text";

export interface CodeInput {
  track: "lavoro" | "stage";
  roles: string[];
  /** Chosen sectors, best first (name + a short keyword). */
  sectors: { slug: string; term: string }[];
  /** Chosen companies, best fits first (already prioritized and rotated). */
  companies: string[];
  /** One place per chosen country: a city with a radius, a region, or the whole country. */
  places: { country: CountryCode; where: string; distanceKm: number }[];
  /** Years of work (job seekers) or the study stage (students). */
  years: number | null;
  studyStage: "primi-anni" | "penultimo" | "ultimo" | null;
  hours: "full" | "part" | "any";
  contracts: string[];
  /** alta: also the titles one step below (more offers); bassa: only the best title per role. */
  priority?: "alta" | "media" | "bassa";
  /** The other names of their roles they accepted ("Direttore commerciale" for "Sales manager"). */
  synonyms?: string[];
  /** Remote work is fine. */
  remoteOk?: boolean;
}

export type Channel = "api" | "web";
export interface CodeQuery {
  key: string;
  channel: Channel;
  country: CountryCode;
  /** Words to search ("Store manager", "Accountant", "stage M&A"). */
  what: string;
  where: string;
  distanceKm: number;
  /** Web searches: only these sites. */
  sites?: string[];
  /** Words added to the role, never quoted with it: a company ("Gucci"), a sector ("moda"), "remote". */
  extra?: string;
  /** Which family of search it is (for the admin and the tests): role, board, company, sector, variant. */
  kind?: "ruolo" | "bacheca" | "azienda" | "settore" | "variante";
}

export interface SearchCode {
  /** e.g. "L · IT:Milano(15) · store-manager+client-advisor · senior · moda-lusso+gioielli · full" */
  code: string;
  brackets: { label: string; value: string }[];
  queries: CodeQuery[];
  /** Ready links to create the same alerts on the big job sites (opened and saved by the person). */
  alerts: { site: string; country: CountryCode; what: string; url: string }[];
}

const INTERNSHIP: Record<string, string> = { it: "stage", en: "internship", de: "Praktikum", fr: "stage" };
/** Where the jobs of each country are, for the web searches (official API sources aside). */
const SITES: Record<CountryCode, string[]> = {
  IT: ["linkedin.com", "it.indeed.com", "infojobs.it"],
  GB: ["linkedin.com", "uk.indeed.com", "reed.co.uk"],
  DE: ["linkedin.com", "de.indeed.com", "stepstone.de"],
  FR: ["linkedin.com", "fr.indeed.com", "welcometothejungle.com"],
};
const slug = (s: string) => fold(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** Employers' own boards (searched with the role: each result also reveals a whole board). */
const BOARDS = ["myworkdayjobs.com", "oraclecloud.com", "boards.greenhouse.io", "jobs.lever.co", "jobs.ashbyhq.com", "jobs.smartrecruiters.com", "apply.workable.com", "jobs.personio.de", "recruitee.com"];

/** Level bracket from years of work: what a listing title should look like. */
/** The words to send: the role, then the company, sector or "remote" (never quoted together). */
export const queryWords = (q: Pick<CodeQuery, "what" | "extra">, quote = false) => `${quote ? `"${q.what}"` : q.what}${q.extra ? ` ${q.extra}` : ""}`;

export function levelBracket(years: number | null): "junior" | "middle" | "senior" | "lead" | "?" {
  if (years == null) return "?";
  return years <= 2 ? "junior" : years <= 5 ? "middle" : years <= 10 ? "senior" : "lead";
}

export function buildSearchCode(i: CodeInput): SearchCode {
  const level = i.track === "stage" ? (i.studyStage ?? "?") : levelBracket(i.years);
  const lv = level === "junior" || level === "middle" || level === "senior" || level === "lead" ? level : "?";
  const roleKeys = i.track === "stage" ? i.sectors.slice(0, 3).map((s) => s.slug) : [...new Set(i.roles.flatMap((r) => specificTitles(r, lv, i.sectors.map((s) => s.slug))))].slice(0, 3).map(slug);
  const placeKey = (p: CodeInput["places"][number]) => `${p.country}${p.where ? `:${p.where}` : ""}${p.distanceKm ? `(${p.distanceKm})` : ""}`;
  const brackets = [
    { label: "Percorso", value: i.track === "stage" ? "Stage" : "Lavoro" },
    { label: "Dove", value: i.places.map(placeKey).join(" + ") || "IT" },
    { label: i.track === "stage" ? "Settori" : "Ruoli", value: roleKeys.join(" + ") || "-" },
    { label: "Livello", value: level },
    { label: "Settori scelti", value: i.sectors.slice(0, 3).map((s) => s.slug).join(" + ") || "-" },
    { label: "Orario e contratto", value: [i.hours, ...i.contracts].join(" + ") },
    { label: "Priorità", value: i.priority ?? "media" },
  ];
  const code = [i.track === "stage" ? "S" : "L", brackets[1].value, brackets[2].value, level, brackets[4].value, brackets[5].value].join(" · ");

  // The words to search, in the language of each country.
  const termsFor = (lang: "it" | "en" | "de" | "fr"): string[] => {
    if (i.track === "stage") {
      const t = i.sectors.slice(0, 6).map((s) => `${INTERNSHIP[lang]} ${s.term}`); // several careers at once
      return t.length ? t : [INTERNSHIP[lang]];
    }
    // Generic roles ("venditrice moda") become the precise titles listings use, for this level.
    const below: Record<string, "junior" | "middle" | "senior" | "lead" | "?"> = { lead: "senior", senior: "middle", middle: "junior", junior: "junior", "?": "?" };
    const sectors = i.sectors.map((s) => s.slug);
    const base = i.roles.flatMap((r) => specificTitles(r, lv, sectors));
    const pool = i.priority === "alta" ? [...base, ...i.roles.flatMap((r) => specificTitles(r, below[lv], sectors))] : i.priority === "bassa" ? i.roles.map((r) => specificTitles(r, lv, sectors)[0]) : base;
    // Several careers chosen: one title each, up to six (the shared caches and daily caps keep it cheap).
    const precise = [...new Set(pool)].slice(0, Math.max(i.priority === "alta" ? 5 : 3, Math.min(6, i.roles.length)));
    const roles = precise.map((r) => (lang === "it" ? r : (translations(r, [lang])[0] ?? r)));
    // Early careers: the junior form of the role is what the listings say (unless only the best is wanted).
    return level === "junior" && i.priority !== "bassa" ? roles.map((r) => `${r} junior`) : roles;
  };
  const queries: CodeQuery[] = [];
  const add = (q: Omit<CodeQuery, "key">) => {
    const key = `${q.channel}|${q.country}|${fold(q.what)}${q.extra ? `+${fold(q.extra)}` : ""}|${fold(q.where)}|${q.distanceKm}|${q.sites && q.sites.length > 3 ? "bacheche" : (q.sites ?? []).join(",")}`;
    if (!queries.some((x) => x.key === key)) queries.push({ ...q, key });
  };
  // Every country gets its best search before any country gets a second one.
  const per = i.places.map((p) => ({ p, terms: termsFor(COUNTRIES.find((c) => c.code === p.country)!.lang) }));
  for (let k = 0; k < 5; k++) for (const { p, terms } of per) if (terms[k]) add({ channel: "api", country: p.country, what: terms[k], where: p.where, distanceKm: p.distanceKm });
  for (let k = 0; k < 3; k++) {
    for (const { p, terms } of per) {
      if (!terms[k]) continue;
      for (const site of SITES[p.country]) add({ channel: "web", country: p.country, what: terms[k], where: p.where, distanceKm: 0, sites: [site] });
    }
  }
  // Chosen companies: "<company> <role or internship> <place>" on the open web (careers pages included).
  for (const c of i.companies.slice(0, 4)) {
    const p = i.places[0];
    if (!p) break;
    const lang = COUNTRIES.find((x) => x.code === p.country)!.lang;
    add({ channel: "web", country: p.country, what: `${c} ${i.track === "stage" ? INTERNSHIP[lang] : (termsFor(lang)[0] ?? "careers")}`, where: p.where, distanceKm: 0, kind: "azienda" });
  }

  // --- The rest of the grammar: every useful combination, best first. Each search runs at most once
  // a day (shared cache) and within the daily caps, so the list is worked through over the days.
  const home = per[0];
  if (home) {
    const p = home.p;
    const lang = COUNTRIES.find((x) => x.code === p.country)!.lang;
    const roles = home.terms.slice(0, 3);
    // In Italy many listings use the English title ("Sales manager", "Business analyst").
    const english = lang === "it" && i.track === "lavoro" ? [...new Set(i.roles.flatMap((r) => translations(r, ["en"])))].filter((t) => !roles.some((r) => fold(r) === fold(t))).slice(0, 2) : [];
    const synonyms = (i.synonyms ?? []).filter((s) => !roles.some((r) => fold(r) === fold(s))).slice(0, 4);
    const sectorWords = i.sectors.slice(0, 3).map((s) => s.term);
    // 1. Employers' own boards (Workday, Oracle, Greenhouse…): role and place.
    for (const r of [...roles, ...english]) add({ channel: "web", country: p.country, what: r, where: p.where, distanceKm: 0, sites: BOARDS, kind: "bacheca" });
    // 2. The role at each chosen company: on the boards (no place: big firms list it their way), on LinkedIn.
    for (const c of i.companies.slice(0, 4)) {
      for (const r of roles.slice(0, 2)) {
        add({ channel: "web", country: p.country, what: r, extra: c, where: "", distanceKm: 0, sites: BOARDS, kind: "azienda" });
        add({ channel: "web", country: p.country, what: r, extra: c, where: p.where, distanceKm: 0, sites: ["linkedin.com"], kind: "azienda" });
      }
      add({ channel: "web", country: p.country, what: `${c} ${lang === "it" ? "lavora con noi" : "careers"}`, where: "", distanceKm: 0, kind: "azienda" });
    }
    // 3. The role in each chosen sector ("Sales manager moda Milano"): job sites, the API, the boards.
    for (const s of sectorWords) {
      for (const r of roles.slice(0, 2)) {
        add({ channel: "api", country: p.country, what: r, extra: s, where: p.where, distanceKm: p.distanceKm, kind: "settore" });
        for (const site of SITES[p.country].slice(0, 2)) add({ channel: "web", country: p.country, what: r, extra: s, where: p.where, distanceKm: 0, sites: [site], kind: "settore" });
        add({ channel: "web", country: p.country, what: r, extra: s, where: "", distanceKm: 0, sites: BOARDS, kind: "settore" });
      }
    }
    // 4. The other names of the role, and its English title in Italy: the API and the job sites.
    for (const t of [...english, ...synonyms]) {
      add({ channel: "api", country: p.country, what: t, where: p.where, distanceKm: p.distanceKm, kind: "variante" });
      for (const site of SITES[p.country]) add({ channel: "web", country: p.country, what: t, where: p.where, distanceKm: 0, sites: [site], kind: "variante" });
    }
    // 5. Remote and part-time, when they said so.
    for (const r of roles.slice(0, 2)) {
      if (i.remoteOk) add({ channel: "api", country: p.country, what: r, extra: lang === "it" ? "da remoto" : "remote", where: "", distanceKm: 0, kind: "variante" });
      if (i.hours === "part") add({ channel: "api", country: p.country, what: r, extra: "part time", where: p.where, distanceKm: p.distanceKm, kind: "variante" });
    }
    // 6. Students: internships and graduate programmes at their companies and in their sectors, on the boards.
    if (i.track === "stage") {
      for (const c of i.companies.slice(0, 4)) add({ channel: "web", country: p.country, what: INTERNSHIP.en, extra: c, where: "", distanceKm: 0, sites: BOARDS, kind: "azienda" });
      for (const s of sectorWords) add({ channel: "web", country: p.country, what: i.studyStage === "ultimo" ? "graduate program" : INTERNSHIP.en, extra: s, where: p.where, distanceKm: 0, sites: BOARDS, kind: "settore" });
    }
  }

  const alerts: SearchCode["alerts"] = [];
  for (const { p, terms } of per) {
    const what = terms[0];
    if (!what) continue;
    const where = p.where || COUNTRIES.find((c) => c.code === p.country)!.name;
    const q = encodeURIComponent(what);
    const l = encodeURIComponent(where);
    alerts.push({ site: "LinkedIn", country: p.country, what, url: `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}` });
    const indeed = { IT: "it.indeed.com", GB: "uk.indeed.com", DE: "de.indeed.com", FR: "fr.indeed.com" }[p.country];
    alerts.push({ site: "Indeed", country: p.country, what, url: `https://${indeed}/jobs?q=${q}&l=${l}` });
    if (p.country === "IT") alerts.push({ site: "InfoJobs", country: p.country, what, url: `https://www.infojobs.it/offerte-lavoro?keyword=${q}&provinceIds=` });
  }
  return { code, brackets, queries, alerts };
}
