// Every occupation of ESCO (European Commission), in Italian, English, German and French, with the other
// names people use and the skills each one needs (data/world/occupations.json, written by
// scripts/import-esco-api.mjs). Used to pin a typed role to a real occupation, to suggest the precise
// one while typing, and to suggest where a career can move: occupations that need many of the same
// skills. Server side only (read once from disk).
import { fold } from "../core/text";

export interface Occupation {
  id: string;
  it: string;
  en: string;
  de: string;
  fr: string;
  /** ISCO-08 unit group (4 digits), "" when unknown. */
  isco: string;
  alt: { it: string[]; en: string[] };
  /** Essential and optional skills, as indices into `skills`. */
  ess: number[];
  opt: number[];
}

interface Data {
  /** Skill names (Italian). */
  skills: string[];
  occupations: Occupation[];
}

let data: Data | null = null;
let index: { occ: Occupation; names: string[] }[] | null = null;

function load(): Data {
  if (data) return data;
  data = { skills: [], occupations: [] };
  if (typeof window !== "undefined") return data;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("node:path") as typeof import("node:path");
    const file = path.join(process.cwd(), "data/world/occupations.json");
    if (fs.existsSync(file)) data = JSON.parse(fs.readFileSync(file, "utf8")) as Data;
  } catch {
    /* no data: the hand-made positions only */
  }
  return data;
}

/** Tests: a small set instead of the file. */
export function setOccupationsForTest(d: Data | null) {
  data = d;
  index = null;
}

const key = (s: string) => fold(s).replace(/[^a-z0-9+#&]+/g, " ").trim();

function names(): { occ: Occupation; names: string[] }[] {
  if (index) return index;
  index = load().occupations.map((occ) => ({ occ, names: [...new Set([occ.it, occ.en, occ.de, occ.fr, ...occ.alt.it, ...occ.alt.en].filter(Boolean).map(key))] }));
  return index;
}

export const occupationCount = () => load().occupations.length;
export const allOccupations = (): Occupation[] => load().occupations;

/** The occupation a typed role is, by any of its names in four languages (exact, after folding). */
export function findOccupation(role: string): Occupation | null {
  const k = key(role);
  if (!k) return null;
  return names().find((x) => x.names.includes(k))?.occ ?? null;
}

/**
 * Occupations matching what someone is typing, best first: a name that is it, one that starts with
 * it, then one containing all its words. Each comes with the name that matched (shown under it).
 */
export function searchOccupations(q: string, limit = 8): { occ: Occupation; matched: string }[] {
  const k = key(q);
  if (k.length < 2) return [];
  const words = k.split(" ");
  const scored: { occ: Occupation; matched: string; score: number }[] = [];
  for (const x of names()) {
    let best = 0;
    let matched = "";
    for (const n of x.names) {
      const s = n === k ? 100 : n.startsWith(k) ? 60 - Math.min(20, n.length - k.length) / 2 : words.every((w) => n.split(" ").some((t) => t.startsWith(w))) ? 30 - Math.min(20, n.length / 4) : 0;
      if (s > best) {
        best = s;
        matched = n;
      }
    }
    // Italian and English preferred names weigh a little more than the other names.
    if (best) scored.push({ occ: x.occ, matched, score: best + (matched === key(x.occ.it) || matched === key(x.occ.en) ? 5 : 0) });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.occ.it.length - b.occ.it.length)
    .slice(0, limit)
    .map(({ occ, matched }) => ({ occ, matched }));
}

/** The other names of an occupation (Italian and English), for searching it the ways listings write it. */
export function occupationNames(occ: Occupation, max = 8): string[] {
  const own = new Set([key(occ.it), key(occ.en)]);
  return [...new Set([...occ.alt.it, ...occ.alt.en])].filter((n) => !own.has(key(n))).slice(0, max);
}

export interface CareerMove {
  occ: Occupation;
  /** 0-100: how much of what the new job needs they already do. */
  score: number;
  /** A few skills both need (Italian), for the "why". */
  shared: string[];
}

/**
 * Where a career can go from an occupation: the occupations that need the most of the same skills
 * (what the new job needs that the old one already had), a little more when they sit in the same
 * ISCO group. The occupation itself and near-copies of its name are left out.
 */
export function careerMoves(from: Occupation, limit = 8): CareerMove[] {
  const d = load();
  const mine = new Set([...from.ess, ...from.opt]);
  const mineEss = new Set(from.ess);
  if (!mine.size) return [];
  const out: CareerMove[] = [];
  for (const o of d.occupations) {
    if (o.id === from.id || !o.ess.length) continue;
    // Share of the target's essential skills already in the person's job (essential ones count double).
    let have = 0;
    const shared: number[] = [];
    for (const s of o.ess) {
      if (mineEss.has(s)) {
        have += 2;
        shared.push(s);
      } else if (mine.has(s)) have += 1;
    }
    let score = (have / (2 * o.ess.length)) * 100;
    if (o.isco && from.isco) score += o.isco.slice(0, 3) === from.isco.slice(0, 3) ? 8 : o.isco.slice(0, 2) === from.isco.slice(0, 2) ? 4 : 0;
    if (score < 15) continue;
    out.push({ occ: o, score: Math.min(100, Math.round(score)), shared: shared.slice(0, 3).map((i) => d.skills[i] ?? "").filter(Boolean) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
