// What to ask the job APIs and the search API for, per person: job titles for job seekers,
// "stage" + interests (and chosen companies) for students. Only in the countries they chose,
// in each country's language: fewer, better searches, so the free quotas last.
import { COUNTRIES, findPlace, homeCountries, type CountryCode } from "../core/geo";
import { translations } from "../catalog/positions";
import type { Profile } from "../server/profile";
import type { RankPrefs } from "../server/catalog";

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
  const home = findPlace(city);
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
