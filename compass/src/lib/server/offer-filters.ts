// The filters of the "Offerte" page, read from its address (?q=…&luogo=…&esperienza=…). Shared by the
// page and by saved searches, which keep that address and are run again for their alerts.
import { CONTRACT_LABELS, SECTORS } from "../core/extract";
import { BENEFIT_LABELS, EDUCATION_LABELS, SENIORITY_LABELS, type Education } from "../core/job-facts";
import { parsePlaceValue, placesFromProfile, type WherePlace } from "../core/where";
import { defaultFilters, type JobFilters } from "./jobs";
import type { Profile } from "./profile";

export type SP = Record<string, string | string[] | undefined>;
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
export const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const list = <T,>(v: T[]) => (v.length ? [...new Set(v)] : undefined);

export const TYPE_OPTIONS = [
  ["lavoro", "Lavoro"],
  ["stage", "Stage"],
  ["programma", "Programmi per studenti"],
] as const;

/** Address keys that are filters (touching one means the questionnaire's defaults stop applying). */
export const FILTER_KEYS = [
  "netto", "orario", "contratto", "settore", "casa", "giorni", "q", "tipo", "vista", "punteggio", "ordina",
  "esperienza", "livello", "titolo", "benefit", "smart", "facile", "agenzie", "vecchie", "protette", "nuove", "azienda",
] as const;

export function filtersFromParams(sp: SP, profile: Profile) {
  const touched = FILTER_KEYS.some((k) => one(sp[k])) || one(sp.tutte) === "1";
  const defaults = touched ? {} : defaultFilters(profile);
  const vista = one(sp.vista) || (defaults.focus ?? "tutte");
  // Places: the profile's until the person picks others here ("luogo" present, "-" = every place).
  const mine = placesFromProfile(profile);
  const picked = sp.luogo !== undefined;
  const places = picked ? all(sp.luogo).map(parsePlaceValue).filter((x): x is WherePlace => x != null) : mine;
  const placesRemote = picked ? all(sp.luogo).includes("remoto") : profile.remoteOk;
  const placesKey = (l: WherePlace[], remote: boolean) => [...l.map((p) => `${p.kind}|${p.country}|${p.name}`).sort(), remote ? "remoto" : ""].join(",");
  // Applying the filters with the profile's places unchanged is not a change.
  const placesChanged = picked && placesKey(places, placesRemote) !== placesKey(mine, profile.remoteOk);
  const years = one(sp.esperienza);
  const filters: JobFilters = {
    ...defaults,
    places,
    placesRemote,
    minNetMonthly: Number(one(sp.netto)) || defaults.minNetMonthly,
    hours: (one(sp.orario) as "full" | "part") || undefined,
    contracts: list(all(sp.contratto).filter((c) => c in CONTRACT_LABELS && c !== "unknown")),
    sectors: list(all(sp.settore).filter((x) => SECTORS.some(([n]) => n === x))),
    remote: one(sp.casa) === "1" || undefined,
    days: Number(one(sp.giorni)) || undefined,
    q: one(sp.q).trim() || undefined,
    types: list(all(sp.tipo).filter((t): t is "lavoro" | "stage" | "programma" => TYPE_OPTIONS.some(([k]) => k === t))),
    focus: vista === "aziende" || vista === "preferite" ? vista : undefined,
    show: one(sp.mostra) === "scartate" ? "scartate" : undefined,
    minFit: Number(one(sp.punteggio)) || undefined,
    sort: ["recenti", "paga", "scadenza"].includes(one(sp.ordina)) ? (one(sp.ordina) as "recenti" | "paga" | "scadenza") : undefined,
    maxYears: years !== "" && !Number.isNaN(Number(years)) ? Number(years) : undefined,
    seniority: list(all(sp.livello).filter((x) => x in SENIORITY_LABELS)),
    maxEducation: one(sp.titolo) in EDUCATION_LABELS ? (one(sp.titolo) as Education) : undefined,
    benefits: list(all(sp.benefit).filter((x) => x in BENEFIT_LABELS)),
    minSmartDays: Number(one(sp.smart)) || undefined,
    easyApply: one(sp.facile) === "1" || undefined,
    noAgencies: one(sp.agenzie) === "no" || undefined,
    hideOld: one(sp.vecchie) === "no" || undefined,
    protectedOnly: one(sp.protette) === "1" || undefined,
    unseen: one(sp.nuove) === "1" || undefined,
    company: one(sp.azienda).trim() || undefined,
  };
  return { filters, touched, defaults, vista, places, placesRemote, placesChanged, mine };
}

/** How many filters are on (shown on the "Filtri" button). */
export function activeFilters(f: JobFilters, placesChanged: boolean): number {
  const keys = ["minNetMonthly", "hours", "contracts", "sectors", "remote", "days", "types", "minFit", "sort", "maxYears", "seniority", "maxEducation", "benefits", "minSmartDays", "easyApply", "noAgencies", "hideOld", "protectedOnly", "unseen", "company"] as const;
  return (placesChanged ? 1 : 0) + keys.filter((k) => f[k] !== undefined).length;
}

/** The address of a search, kept for saved searches (without paging and one-off messages). */
export function searchAddress(sp: SP): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (["msg", "n", "salvata"].includes(k)) continue;
    for (const x of all(v)) if (x) p.append(k, x);
  }
  return p.toString();
}
