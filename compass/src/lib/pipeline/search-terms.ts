// What to ask the job APIs and the search API for, per person: job titles for job seekers,
// "stage" + interests (and chosen companies) for students. Only in the countries they chose,
// in each country's language: fewer, better searches, so the free quotas last.
import { STUDENT_ROLE } from "../core/cv-positions";
import { COUNTRIES, findPlace, homeCountries, type CountryCode } from "../core/geo";
import { findPosition, POSITIONS, translations } from "../catalog/positions";
import { inArray } from "drizzle-orm";
import { careerStage } from "../core/career-stage";
import { buildSearchCode, type CodeQuery, type SearchCode } from "../core/search-code";
import type { DB } from "../db";
import { schema } from "../db";
import { getPrefs, listSectors, rankPrefs, type RankPrefs } from "../server/catalog";
import { prioritizedCompanies, todaysPicks } from "../server/career";
import { background } from "../server/person";
import { getProfile, type Profile } from "../server/profile";

export interface ApiSearch {
  country: CountryCode;
  what: string;
  /** City or region; empty = the whole country. */
  where: string;
  distanceKm: number;
}

export interface SearchPlan {
  /** Keywords for job APIs (Adzuna "what"), in the home country's language. */
  apiTerms: string[];
  /** Interests for students (sector words). */
  interests: string[];
  companies: string[];
  city: string;
  radiusKm: number;
  /** One place per chosen country (home city, another city they chose, a region, or the whole country). */
  places: { country: CountryCode; where: string; distanceKm: number }[];
  /** API searches, best first: every country gets its first term before any country gets a second. */
  searches: ApiSearch[];
}

const shortTerm = (s: { name: string; keywords: string[] }) => s.keywords[0] ?? s.name;
const INTERNSHIP: Record<string, string> = { it: "stage", en: "internship", de: "Praktikum", fr: "stage" };

export function searchPlan(p: Profile, prefs: RankPrefs): SearchPlan {
  const city = p.city || (p.track === "stage" ? "Milano" : "Torino");
  const companies = prefs.likedCompanies.map((c) => c.name);
  // No city chosen (only regions or whole countries): no home town in the searches.
  const home = p.city ? findPlace(p.city) : null;
  const countries = homeCountries(p.countries, p.city);
  const places = countries.map((cc) => {
    if (home?.country === cc) return { country: cc, where: home.name, distanceKm: p.maxKm || 30 };
    const extra = p.extraPlaces.map((x) => findPlace(x)).find((x) => x?.country === cc);
    if (extra) return { country: cc, where: extra.name, distanceKm: 30 };
    const region = p.regions.find((r) => r.startsWith(`${cc}:`));
    return { country: cc, where: region ? region.slice(3) : "", distanceKm: 0 };
  });
  const interests = prefs.likedSectors.map(shortTerm).slice(0, 3);
  const termsFor = (lang: "it" | "en" | "de" | "fr"): string[] => {
    if (p.track === "stage") return interests.length ? interests.map((t) => `${INTERNSHIP[lang]} ${t}`) : [INTERNSHIP[lang], lang === "it" ? "internship" : ""].filter(Boolean);
    return p.roles.map((r) => (lang === "it" ? r : (translations(r, [lang])[0] ?? r)));
  };
  const perCountry = places.map((pl) => termsFor(COUNTRIES.find((c) => c.code === pl.country)!.lang).slice(0, 3).map((what) => ({ ...pl, what })));
  const searches: ApiSearch[] = [];
  for (let i = 0; i < 3; i++) for (const list of perCountry) if (list[i]) searches.push(list[i]);
  const homeLang = COUNTRIES.find((c) => c.code === (home?.country ?? "IT"))!.lang;
  return { apiTerms: termsFor(homeLang).slice(0, 3), interests, companies, city, radiusKm: p.track === "stage" ? p.maxKm || 30 : p.maxKm, places, searches };
}

// --- Search codes (ADR 0021) ---------------------------------------------------------------------

/** A person's search code and its batch of searches, from their questionnaire and choices. */
export async function searchCodeFor(db: DB, userId: number, now = new Date()): Promise<SearchCode> {
  const profile = await getProfile(db, userId);
  const plan = searchPlan(profile, await rankPrefs(db, userId));
  const prefs = await getPrefs(db, userId);
  const sectors = (await listSectors(db, userId)).filter((s) => prefs.sectors.get(s.id) === "like").map((s) => ({ slug: s.slug, term: s.keywords[0] ?? s.name }));
  const day = Math.floor(now.getTime() / 86_400_000);
  const companies = todaysPicks((await prioritizedCompanies(db, userId)).map((x) => x.company.name), 4, day);
  const bg = await background(db, userId, profile);
  return buildSearchCode({
    track: profile.track,
    roles: careerRoles(profile.roles.filter((r) => !STUDENT_ROLE.test(r)), sectors.map((s) => s.slug), profile.track), // "Studente" is not a position to search
    sectors,
    companies,
    places: plan.places,
    years: bg.person.years,
    studyStage: profile.track === "stage" ? careerStage(profile.studyYear, profile.degreeYears) : null,
    hours: profile.hours,
    contracts: profile.contracts,
    priority: profile.priority,
  });
}

/**
 * The positions searched: those written, then one for each chosen career not covered yet
 * ("Consulenza strategica" chosen → "Consulente strategico"), so several careers are searched at once.
 */
const CAREER_TITLE: Record<string, string> = { consulting: "Consulente strategico", "transaction-services": "Transaction services analyst" };

export function careerRoles(roles: string[], careers: string[], track: "lavoro" | "stage"): string[] {
  if (track === "stage") return roles; // students search by career already ("stage" + the career)
  const covered = new Set(roles.map((r) => findPosition(r)?.sector).filter(Boolean));
  const extra = careers
    .filter((c) => !covered.has(c))
    .map((c) => CAREER_TITLE[c] ?? POSITIONS.find((p) => p.sector === c && p.track !== "stage")?.it)
    .filter((t): t is string => Boolean(t));
  return [...new Set([...roles, ...extra])].slice(0, 6);
}

/** Searches not made in the last `hours` (by anyone): the rest are already in the database. */
export async function freshQueries(db: DB, queries: CodeQuery[], now: Date, hours = 20): Promise<CodeQuery[]> {
  if (queries.length === 0) return [];
  const done = await db.select().from(schema.searchCache).where(inArray(schema.searchCache.key, queries.map((q) => q.key)));
  const recent = new Set(done.filter((d) => now.getTime() - d.lastRunAt.getTime() < hours * 3_600_000).map((d) => d.key));
  return queries.filter((q) => !recent.has(q.key));
}

export async function markSearched(db: DB, key: string, items: number, now: Date): Promise<void> {
  await db.insert(schema.searchCache).values({ key, lastRunAt: now, items }).onConflictDoUpdate({ target: schema.searchCache.key, set: { lastRunAt: now, items } });
}
