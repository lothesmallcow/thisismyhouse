// Career intelligence, all rule-based and explainable:
//  - interestProfile(): what a person's experience, choices, tastes and CV say about them,
//    as weighted sectors and broad themes ("lusso", "finanza"...), each with the reason why.
//  - suggestCompanies(): companies they have not chosen yet that fit that profile.
//  - careerPaths(): nearby sectors worth considering (luxury fashion -> yachts: both "lusso").
//  - fitWarnings(): chosen companies far from everything else they have told us.
import { and, eq } from "drizzle-orm";
import { STAGE_ADVICE, careerStage, type CareerStage } from "../core/career-stage";
import { THEME_LABELS, TASTES } from "../catalog/data";
import { extractSector } from "../core/extract";
import { fold, keyTokens } from "../core/text";
import { findPlace, homeCountries, type CountryCode } from "../core/geo";
import { companyNameMatches } from "../core/rank";
import { background } from "./person";
import type { DB } from "../db";
import { schema } from "../db";
import { directoryPool, getPrefs, listCompanies, listSectors, type Company, type Sector } from "./catalog";
import { getProfile, type Profile } from "./profile";

interface Weighted {
  weight: number;
  why: string;
  best: number; // the largest single contribution (its source is `why`)
}

export interface InterestProfile {
  sectors: Map<number, Weighted>;
  themes: Map<string, Weighted>;
  /** Weight from what the person did or said, without the companies they picked (used by fit warnings). */
  baseSectors: Map<number, Weighted>;
  baseThemes: Map<string, Weighted>;
  total: number;
  profile: Profile;
}

function add(map: Map<string | number, Weighted>, key: string | number, w: number, why: string) {
  const cur = map.get(key);
  if (!cur) map.set(key, { weight: w, why, best: w });
  else {
    cur.weight += w;
    if (w > cur.best) {
      cur.best = w;
      cur.why = why;
    }
  }
}

/** All themes of a company: its own plus those of its main and extra sectors. */
export function companyThemes(c: Company, sectorsById: Map<number, Sector>): string[] {
  const ids = [c.sectorId, ...c.extraSectorIds].filter((x): x is number => x != null);
  return [...new Set([...c.themes, ...ids.flatMap((id) => sectorsById.get(id)?.themes ?? [])])];
}

export function companySectorIds(c: Company): number[] {
  return [c.sectorId, ...c.extraSectorIds].filter((x): x is number => x != null);
}

export async function interestProfile(db: DB, userId: number): Promise<InterestProfile> {
  const profile = await getProfile(db, userId);
  const [sectors, companies, prefs, cvRows, exps] = await Promise.all([
    listSectors(db, userId, "all"),
    listCompanies(db, userId, "all"),
    getPrefs(db, userId),
    db.select({ text: schema.cvs.text }).from(schema.cvs).where(eq(schema.cvs.userId, userId)),
    db.select().from(schema.experiences).where(eq(schema.experiences.userId, userId)),
  ]);
  const sectorsById = new Map(sectors.map((s) => [s.id, s]));
  const companiesById = new Map(companies.map((c) => [c.id, c]));
  const base = { sectors: new Map<number, Weighted>(), themes: new Map<string, Weighted>() };
  const all = { sectors: new Map<number, Weighted>(), themes: new Map<string, Weighted>() };
  const both = (sid: number, w: number, why: string, isBase: boolean) => {
    for (const t of [all, ...(isBase ? [base] : [])]) {
      add(t.sectors as Map<string | number, Weighted>, sid, w, why);
      for (const th of sectorsById.get(sid)?.themes ?? []) add(t.themes as Map<string | number, Weighted>, th, w, why);
    }
  };
  const themeOnly = (th: string, w: number, why: string, isBase: boolean) => {
    for (const t of [all, ...(isBase ? [base] : [])]) add(t.themes as Map<string | number, Weighted>, th, w, why);
  };

  // 1. Experience: the strongest signal. Recent and current roles weigh more.
  const thisYear = new Date().getFullYear();
  for (const e of exps) {
    if (e.kind === "studio") continue;
    const recent = e.current || (e.endYear ?? 0) >= thisYear - 3 ? 1.5 : 1;
    const w = (e.kind === "lavoro" ? 3 : 1.5) * recent;
    const where = e.organization ? `${e.organization}, ${e.kind === "volontariato" ? "dove hai fatto volontariato" : "dove hai lavorato"}` : `la tua esperienza come ${e.title.toLowerCase()}`;
    const company = e.catalogCompanyId ? companiesById.get(e.catalogCompanyId) : undefined;
    if (company) {
      companySectorIds(company).forEach((sid, i) => both(sid, i === 0 ? w : w / 2, where, true));
      for (const th of company.themes) themeOnly(th, w, where, true);
    } else if (e.sectorId) both(e.sectorId, w, where, true);
  }
  // 2. Sectors chosen, 3. companies chosen (not in the base profile: a fit warning compares against the rest)
  for (const [sid, stance] of prefs.sectors) {
    const s = sectorsById.get(sid);
    if (stance === "like" && s) both(sid, 2, `${s.name}, tra i settori che hai scelto`, true);
  }
  for (const [cid, stance] of prefs.companies) {
    const c = companiesById.get(cid);
    if (stance !== "like" || !c) continue;
    companySectorIds(c).forEach((sid, i) => both(sid, i === 0 ? 2 : 1, `${c.name}, tra le aziende che hai scelto`, false));
    for (const th of c.themes) themeOnly(th, 2, `${c.name}, tra le aziende che hai scelto`, false);
  }
  // 4. Tastes from the questionnaire
  const slugToId = new Map(sectors.map((s) => [s.slug, s.id]));
  for (const t of TASTES.filter((t) => profile.tastes.includes(t.key))) {
    for (const slug of t.sectors) {
      const id = slugToId.get(slug);
      if (id) both(id, 1, `ti interessa: ${t.label.toLowerCase()}`, true);
    }
  }
  // 5. Roles sought, degree, CV words
  for (const r of profile.roles) {
    const name = extractSector(r);
    const s = sectors.find((x) => x.name === name);
    if (s) both(s.id, 2, `il ruolo che cerchi (${r.toLowerCase()})`, true);
  }
  const own = fold([...cvRows.map((r) => r.text), profile.degree, profile.presentation, ...exps.map((e) => `${e.title} ${e.description}`)].join("\n"));
  const ownTokens = new Set(keyTokens(own));
  for (const s of sectors) {
    const hit = [s.name, ...s.keywords].find((t) => {
      const k = keyTokens(t);
      if (k.length === 0) return false;
      return k.length === 1 ? ownTokens.has(k[0]) && k[0].length >= 4 : own.includes(fold(t));
    });
    if (hit) both(s.id, 1, `il tuo CV parla di “${hit}”`, true);
  }
  // Avoided sectors never count.
  for (const [sid, stance] of prefs.sectors) {
    if (stance === "avoid") {
      all.sectors.delete(sid);
      base.sectors.delete(sid);
    }
  }
  const total = [...all.themes.values()].reduce((a, x) => a + x.weight, 0);
  return { sectors: all.sectors, themes: all.themes, baseSectors: base.sectors, baseThemes: base.themes, total, profile };
}

const themeName = (t: string) => THEME_LABELS[t] ?? t;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// --- Suggestions --------------------------------------------------------------------------------

export interface Suggestion {
  company: Company;
  score: number;
  reason: string;
}

export async function suggestCompanies(db: DB, userId: number, limit = 8, ip?: InterestProfile): Promise<Suggestion[]> {
  const p = ip ?? (await interestProfile(db, userId));
  const track = p.profile.track;
  const [curated, sectors, prefs] = await Promise.all([listCompanies(db, userId, track), listSectors(db, userId, "all"), getPrefs(db, userId)]);
  const sectorsById = new Map(sectors.map((s) => [s.id, s]));
  const avoided = new Set([...prefs.sectors].filter(([, s]) => s === "avoid").map(([id]) => id));
  // Listed companies too, but only in their sectors of interest and in the countries/regions they chose.
  const countries = homeCountries(p.profile.countries, p.profile.city);
  const topSectors = [...p.sectors.entries()].sort((a, b) => b[1].weight - a[1].weight).slice(0, 6).map(([id]) => id);
  const pool = await directoryPool(db, topSectors, { countries, regions: p.profile.regions, limit: 120 });
  const generated = (c: Company) => c.source === "borsa" || c.source === "registro";
  const inScope = (c: Company) => !generated(c) || countries.includes(c.country as CountryCode);
  const companies = [...curated, ...pool.filter((c) => !curated.some((x) => x.id === c.id))].filter(inScope);
  const out: Suggestion[] = [];
  for (const c of companies) {
    if (prefs.companies.has(c.id)) continue;
    const sids = companySectorIds(c);
    if (sids.some((s) => avoided.has(s))) continue;
    let score = 0;
    let bestReason = "";
    let best = 0;
    for (const [i, sid] of sids.entries()) {
      const w = p.sectors.get(sid);
      if (!w) continue;
      const contrib = w.weight * (i === 0 ? 1.5 : 1);
      score += contrib;
      if (contrib > best) {
        best = contrib;
        const name = sectorsById.get(sid)?.name ?? "Settore";
        bestReason = w.why.startsWith(`${name}, `) ? `${name}: un settore che hai scelto` : `${name}: ${w.why}`;
      }
    }
    for (const th of companyThemes(c, sectorsById)) {
      const w = p.themes.get(th);
      if (!w) continue;
      const contrib = w.weight * 0.5;
      score += contrib;
      if (contrib > best) {
        best = contrib;
        bestReason = `${cap(themeName(th))}: ${w.why}`;
      }
    }
    if (score < 1.5) continue;
    if (c.city && p.profile.city && fold(c.city) === fold(p.profile.city)) score += 1;
    if (c.region && p.profile.regions.includes(`${c.country}:${c.region}`)) score += 1;
    if (generated(c)) score += (c.size ?? 0) * 0.2 - 0.5; // hand-picked entries first at equal fit
    out.push({ company: c, score, reason: bestReason });
  }
  out.sort((a, b) => b.score - a.score || a.company.name.localeCompare(b.company.name));
  // Spread the list across sectors: the best of each sector first, then the second best, and so on.
  const bySector = new Map<number, Suggestion[]>();
  for (const s of out) bySector.set(s.company.sectorId ?? 0, [...(bySector.get(s.company.sectorId ?? 0) ?? []), s]);
  const groups = [...bySector.values()];
  const spread: Suggestion[] = [];
  for (let i = 0; spread.length < limit && groups.some((g) => g[i]); i++) {
    for (const g of groups.filter((g) => g[i]).sort((a, b) => b[i].score - a[i].score)) if (spread.length < limit) spread.push(g[i]);
  }
  return spread;
}

// --- Career paths ---------------------------------------------------------------------------------

/** Roles worth searching for in each sector, for job seekers and for students. */
export const ROLE_IDEAS: Record<string, { lavoro: string[]; stage: string[] }> = {
  "investment-banking": { lavoro: ["Analyst M&A", "Associate corporate finance"], stage: ["Summer Analyst M&A", "Stage in boutique di advisory"] },
  "private-equity": { lavoro: ["Analyst private equity", "Portfolio operations"], stage: ["Stage investment team", "Off-cycle private equity"] },
  "venture-capital": { lavoro: ["Analyst venture capital", "Platform associate"], stage: ["Stage VC: dealflow e analisi startup"] },
  "asset-management": { lavoro: ["Analista portafogli", "Client relationship"], stage: ["Stage asset management", "Stage wealth management"] },
  markets: { lavoro: ["Equity research analyst", "Sales & trading"], stage: ["Stage equity research", "Summer Analyst markets"] },
  "corporate-finance": { lavoro: ["Controller", "FP&A analyst", "Tesoreria"], stage: ["Stage amministrazione e finanza", "Stage FP&A"] },
  consulting: { lavoro: ["Business analyst", "Consultant"], stage: ["Stage consulenza strategica", "Summer internship consulting"] },
  "transaction-services": { lavoro: ["Analyst transaction services", "Valuation"], stage: ["Stage deals / due diligence"] },
  fintech: { lavoro: ["Business analyst fintech", "Operations"], stage: ["Stage business development fintech"] },
  startup: { lavoro: ["Business developer", "Operations manager"], stage: ["Founder's associate", "Stage growth"] },
  "ai-data": { lavoro: ["Data analyst", "Product analyst"], stage: ["Stage data analysis", "Stage AI / prodotto"] },
  economics: { lavoro: ["Economista", "Policy analyst"], stage: ["Stage ricerca economica"] },
  amministrazione: { lavoro: ["Impiegata amministrativa", "Addetta contabilità"], stage: ["Stage amministrazione"] },
  segreteria: { lavoro: ["Segretaria di direzione", "Receptionist"], stage: ["Stage office management"] },
  vendita: { lavoro: ["Addetta vendite", "Store manager"], stage: ["Stage retail"] },
  "assistenza-clienti": { lavoro: ["Customer care", "Client service"], stage: ["Stage customer experience"] },
  logistica: { lavoro: ["Addetto magazzino", "Impiegato logistica"], stage: ["Stage supply chain"] },
  sanita: { lavoro: ["OSS", "Addetta accettazione"], stage: ["Stage gestione sanitaria"] },
  ristorazione: { lavoro: ["Cameriera di sala", "Receptionist hotel"], stage: ["Stage hospitality"] },
  pulizie: { lavoro: ["Addetta pulizie", "Custode"], stage: [] },
  scuola: { lavoro: ["Segreteria scolastica", "Educatrice"], stage: ["Stage formazione"] },
  informatica: { lavoro: ["Sviluppatore", "IT support"], stage: ["Stage sviluppo software"] },
  "moda-lusso": { lavoro: ["Client advisor", "Sales associate", "Visual merchandiser"], stage: ["Stage retail lusso", "Stage merchandising", "Stage finance in maison"] },
  gioielli: { lavoro: ["Client advisor gioielleria", "Addetta vendite orologi"], stage: ["Stage retail gioielleria"] },
  bellezza: { lavoro: ["Beauty advisor", "Addetta profumeria"], stage: ["Stage marketing beauty"] },
  design: { lavoro: ["Addetta showroom", "Sales arredamento"], stage: ["Stage showroom", "Stage marketing design"] },
  food: { lavoro: ["Addetta vendite enoteca", "Sales food"], stage: ["Stage trade marketing", "Stage finance FMCG"] },
  auto: { lavoro: ["Consulente vendite auto", "Client advisor"], stage: ["Stage marketing automotive", "Stage controllo di gestione"] },
  "arte-cultura": { lavoro: ["Addetta galleria", "Assistente casa d'aste"], stage: ["Stage casa d'aste", "Stage museo"] },
  turismo: { lavoro: ["Consulente di viaggio", "Receptionist"], stage: ["Stage tour operator"] },
  "banche-assicurazioni": { lavoro: ["Addetta sportello", "Consulente assicurativa"], stage: ["Stage retail banking"] },
  immobiliare: { lavoro: ["Agente immobiliare", "Property manager"], stage: ["Stage real estate"] },
  "studi-professionali": { lavoro: ["Segretaria studio legale", "Assistente studio"], stage: ["Stage studio professionale"] },
  "energia-industria": { lavoro: ["Impiegata acquisti", "Back office tecnico"], stage: ["Stage finanza industriale"] },
  nautica: { lavoro: ["Yacht sales assistant", "Client relations nautica", "Charter assistant"], stage: ["Stage sales nautica", "Stage marketing yacht"] },
  "ospitalita-lusso": { lavoro: ["Guest relations", "Concierge", "Front office hotel di lusso"], stage: ["Stage guest experience", "Stage revenue management"] },
  edilizia: { lavoro: ["Impiegata ufficio tecnico", "Idraulico", "Elettricista"], stage: ["Stage project control"] },
  sport: { lavoro: ["Addetta vendite sport", "Store manager"], stage: ["Stage marketing sportivo"] },
  media: { lavoro: ["Assistente comunicazione", "Social media"], stage: ["Stage comunicazione", "Stage marketing"] },
};

export interface CareerPath {
  sector: Sector;
  score: number;
  sharedThemes: string[];
  reason: string;
  examples: Company[];
  roles: string[];
  chosen: boolean;
}

/** Sectors close to the person's profile, explained by the themes they share. */
export async function careerPaths(db: DB, userId: number, limit = 6, ip?: InterestProfile): Promise<CareerPath[]> {
  const p = ip ?? (await interestProfile(db, userId));
  const track = p.profile.track;
  const [sectors, companies, prefs] = await Promise.all([listSectors(db, userId, track), listCompanies(db, userId, track), getPrefs(db, userId)]);
  const sectorsById = new Map((await listSectors(db, userId, "all")).map((s) => [s.id, s]));
  const strong = [...p.themes.entries()].sort((a, b) => b[1].weight - a[1].weight);
  // A few big listed employers per sector, in their countries and regions, as extra examples.
  const pool = await directoryPool(db, sectors.map((s) => s.id), { countries: homeCountries(p.profile.countries, p.profile.city), regions: p.profile.regions, limit: 300 });
  const poolBySector = new Map<number, Company[]>();
  for (const c of pool) if (c.sectorId != null) poolBySector.set(c.sectorId, [...(poolBySector.get(c.sectorId) ?? []), c].slice(0, 4));
  const out: CareerPath[] = [];
  for (const s of sectors) {
    if (prefs.sectors.get(s.id) === "avoid") continue;
    const shared = s.themes.filter((t) => p.themes.has(t)).sort((a, b) => p.themes.get(b)!.weight - p.themes.get(a)!.weight);
    let score = shared.reduce((a, t) => a + p.themes.get(t)!.weight, 0) + (p.sectors.get(s.id)?.weight ?? 0) * 0.5;
    if (score < 2) continue;
    const top = shared[0];
    const reason = top
      ? `${cap(themeName(top))}${shared[1] ? ` · ${themeName(shared[1])}` : ""}: ${p.themes.get(top)!.why}`
      : p.sectors.get(s.id)?.why ?? "";
    const listed = poolBySector.get(s.id) ?? [];
    const examples = [...companies, ...listed]
      .filter((c) => companySectorIds(c).includes(s.id) && prefs.companies.get(c.id) !== "avoid")
      .map((c) => ({ c, n: companyThemes(c, sectorsById).filter((t) => p.themes.has(t)).length + (c.city && p.profile.city && fold(c.city) === fold(p.profile.city) ? 1 : 0) + (c.source === "curato" ? 1 : 0) }))
      .sort((a, b) => b.n - a.n || a.c.name.localeCompare(b.c.name))
      .slice(0, 4)
      .map((x) => x.c);
    const chosen = prefs.sectors.get(s.id) === "like";
    if (chosen) score *= 0.6; // already chosen: still shown, after the new ideas
    out.push({ sector: s, score, sharedThemes: shared.slice(0, 3), reason, examples, roles: ROLE_IDEAS[s.slug]?.[track] ?? [], chosen });
  }
  void strong;
  return out.sort((a, b) => Number(a.chosen) - Number(b.chosen) || b.score - a.score).slice(0, limit);
}

// --- Fit warnings ---------------------------------------------------------------------------------

/**
 * A chosen company that shares nothing with the person's experience, chosen sectors, tastes or CV
 * gets a gentle note (it is advice, never a block). Only when we know enough about them.
 */
export async function fitWarnings(db: DB, userId: number, ip?: InterestProfile): Promise<Map<number, string>> {
  const p = ip ?? (await interestProfile(db, userId));
  const out = new Map<number, string>();
  const baseTotal = [...p.baseThemes.values()].reduce((a, x) => a + x.weight, 0);
  if (baseTotal < 4) return out;
  const [companies, sectors, prefs] = await Promise.all([listCompanies(db, userId, "all"), listSectors(db, userId, "all"), getPrefs(db, userId)]);
  const sectorsById = new Map(sectors.map((s) => [s.id, s]));
  const topThemes = [...p.baseThemes.entries()].sort((a, b) => b[1].weight - a[1].weight).filter(([, w]) => w.weight >= 2).map(([t]) => t);
  const topNames = topThemes.slice(0, 2).map(themeName);
  for (const c of companies) {
    if (prefs.companies.get(c.id) !== "like") continue;
    const sids = companySectorIds(c);
    if (sids.length === 0) continue; // an "Altro" company without a sector: we cannot tell
    if (sids.some((s) => p.baseSectors.has(s))) continue;
    const themes = companyThemes(c, sectorsById);
    if (themes.some((t) => topThemes.includes(t))) continue;
    const sector = sectorsById.get(sids[0])?.name.toLowerCase() ?? "un altro settore";
    out.set(c.id, `Potrebbe non essere la scelta più adatta: ${c.name} è nel settore ${sector}, lontano da ${topNames.join(" e ")} della tua esperienza e dei tuoi interessi. Se è un cambio voluto, va benissimo.`);
  }
  return out;
}

// --- Students ------------------------------------------------------------------------------------

export function studentAdvice(p: Profile): { stage: CareerStage; best: string; tips: string[] } | null {
  if (p.track !== "stage") return null;
  const stage = careerStage(p.studyYear, p.degreeYears);
  return stage ? { stage, ...STAGE_ADVICE[stage] } : null;
}

/** The person's strongest themes, for the "Il tuo profilo in breve" chips. */
export function topThemes(p: InterestProfile, n = 5): { theme: string; label: string; why: string }[] {
  return [...p.themes.entries()]
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, n)
    .map(([t, w]) => ({ theme: t, label: themeName(t), why: w.why }));
}

export async function experienceCount(db: DB, userId: number): Promise<number> {
  return (await db.select({ id: schema.experiences.id }).from(schema.experiences).where(and(eq(schema.experiences.userId, userId)))).length;
}

// --- Search priority -----------------------------------------------------------------------------
// A person may choose (or be suggested) hundreds of companies. The searches for open positions are
// limited (free API quotas, one request at a time per site), so each run spends them on the best fits
// first and rotates through the rest over the following days. Nothing is searched "in bulk".

export interface PrioritizedCompany {
  company: Company;
  score: number;
}

/** Chosen companies ordered by how well they fit: place, experience and interests, size, a readable feed. */
export async function prioritizedCompanies(db: DB, userId: number, ip?: InterestProfile): Promise<PrioritizedCompany[]> {
  const p = ip ?? (await interestProfile(db, userId));
  const prefs = await getPrefs(db, userId);
  const liked = (await listCompanies(db, userId)).filter((c) => prefs.companies.get(c.id) === "like");
  const sectorsById = new Map((await listSectors(db, userId)).map((s) => [s.id, s]));
  const countries = homeCountries(p.profile.countries, p.profile.city);
  const regions = p.profile.regions;
  return liked
    .map((c) => {
      let score = 0;
      for (const sid of companySectorIds(c)) score += p.baseSectors.get(sid)?.weight ?? 0;
      for (const th of companyThemes(c, sectorsById)) score += (p.baseThemes.get(th)?.weight ?? 0) * 0.5;
      if (countries.includes(c.country as CountryCode)) score += 4;
      else score -= 6; // chosen, but outside the countries they look at: searched last
      if (c.region && regions.includes(`${c.country}:${c.region}`)) score += 3;
      score += (c.size ?? 2) * 0.5;
      if (c.ats && c.atsSlug) score += 1;
      return { company: c, score };
    })
    .sort((a, b) => b.score - a.score || a.company.name.localeCompare(b.company.name));
}

/**
 * `n` items for today's run: the best half every day, the other slots rotating through the rest
 * (a different slice each day), so over a few days every choice gets its turn.
 */
export function todaysPicks<T>(ordered: T[], n: number, day: number): T[] {
  if (ordered.length <= n) return ordered;
  const fixed = Math.ceil(n / 2);
  const rest = ordered.slice(fixed);
  const slots = n - fixed;
  const start = (day * slots) % rest.length;
  return [...ordered.slice(0, fixed), ...[...rest.slice(start), ...rest.slice(0, start)].slice(0, slots)];
}

// --- Companies to write to (spontaneous applications) ----------------------------------------------

export interface OutreachTarget {
  company: Company;
  sector: string;
  /** Why it is here: same field as their work, or a nearby field (with the shared theme). */
  why: string;
}

/**
 * Companies to propose themselves to without a job ad: in their field, and in nearby fields for a
 * career change. Their regions and countries first, the current employer never.
 */
export async function outreachTargets(db: DB, userId: number, limit = 12): Promise<{ inField: OutreachTarget[]; shift: OutreachTarget[] }> {
  const profile = await getProfile(db, userId);
  const bg = await background(db, userId, profile);
  const sectors = await listSectors(db, userId);
  const prefs = await getPrefs(db, userId);
  const byName = new Map(sectors.map((s) => [s.name, s]));
  const sameIds = new Set([...bg.experienceSectors.filter((x) => x.relation === "same").map((x) => byName.get(x.name)?.id), ...[...prefs.sectors].filter(([, st]) => st === "like").map(([id]) => id)].filter((x): x is number => x != null));
  const near = new Map(bg.experienceSectors.filter((x) => x.relation === "near").map((x) => [byName.get(x.name)?.id, x.theme] as const).filter(([id]) => id != null && !sameIds.has(id!)) as [number, string | undefined][]);
  const countries = homeCountries(profile.countries, profile.city);
  const scope = { countries, regions: profile.regions };
  const pool = [
    ...(await listCompanies(db, userId)),
    ...(await directoryPool(db, [...sameIds, ...near.keys()], { ...scope, limit: 150 })),
  ];
  const seen = new Set<number>();
  const current = bg.currentEmployers;
  const ok = (c: Company) =>
    !seen.has(c.id) &&
    prefs.companies.get(c.id) !== "avoid" &&
    !current.some((n) => companyNameMatches(c.name, { name: n, aliases: [] })) &&
    ((c.source !== "borsa" && c.source !== "registro") || countries.includes(c.country as CountryCode));
  const homeRegion = profile.city ? findPlace(profile.city)?.region : undefined;
  // Hand-picked brands first (they are the employers people mean), then place, then size.
  const rank = (c: Company) => (c.source === "curato" ? 4 : 0) + (c.region && profile.regions.includes(`${c.country}:${c.region}`) ? 2 : 0) + (c.region && c.region === homeRegion ? 1 : 0) + (countries.includes(c.country as CountryCode) ? 1 : 0) + (c.size ?? 1) * 0.5;
  const sectorName = (id: number | null) => sectors.find((s) => s.id === id)?.name ?? "";
  const pick = (ids: Set<number> | Map<number, string | undefined>, why: (c: Company) => string) => {
    const out = pool
      .filter((c) => companySectorIds(c).some((id) => ids.has(id)) && ok(c))
      .sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name))
      .slice(0, limit)
      .map((c) => ({ company: c, sector: sectorName(c.sectorId), why: why(c) }));
    out.forEach((t) => seen.add(t.company.id));
    return out;
  };
  const inField = pick(sameIds, () => "Nel tuo campo");
  for (const c of pool) if (companySectorIds(c).some((id) => sameIds.has(id))) seen.add(c.id); // in their field: not a change
  const shift = pick(near, (c) => {
    const theme = companySectorIds(c).map((id) => near.get(id)).find(Boolean);
    return theme ? `Settore vicino: in comune ${theme}` : "Settore vicino al tuo";
  });
  return { inField, shift };
}
