// Full-text search over every offer (SQLite FTS5): title, company and text, accents ignored, ranked by
// relevance (BM25, the title weighs most). Kept in step with the jobs table by triggers. Built when the
// database is migrated; if the database cannot host it, search falls back to matching words in titles.
import { sql } from "drizzle-orm";
import type { DB } from "../db";
import type { ParsedQuery, QueryConcept } from "../core/query";
import { fold } from "../core/text";

const BODY = "substr(coalesce(%.description, ''), 1, 6000) || ' ' || coalesce(%.city, '')";
const body = (alias: string) => BODY.replaceAll("%", alias);

let available: boolean | null = null;

/** Create the index, its triggers, and fill it with the offers it lacks. Safe to run at every deploy. */
export async function ensureSearchIndex(db: DB): Promise<boolean> {
  try {
    await db.run(sql.raw(`create virtual table if not exists jobs_fts using fts5(title, company, body, tokenize = 'unicode61 remove_diacritics 2')`));
    await db.run(sql.raw(`create trigger if not exists jobs_fts_ai after insert on jobs begin insert into jobs_fts(rowid, title, company, body) values (new.id, new.title, coalesce(new.company, ''), ${body("new")}); end`));
    await db.run(sql.raw(`create trigger if not exists jobs_fts_ad after delete on jobs begin delete from jobs_fts where rowid = old.id; end`));
    await db.run(
      sql.raw(
        `create trigger if not exists jobs_fts_au after update of title, company, description, city on jobs begin delete from jobs_fts where rowid = old.id; insert into jobs_fts(rowid, title, company, body) values (new.id, new.title, coalesce(new.company, ''), ${body("new")}); end`,
      ),
    );
    await db.run(sql.raw(`insert into jobs_fts(rowid, title, company, body) select j.id, j.title, coalesce(j.company, ''), ${body("j")} from jobs j where j.id not in (select rowid from jobs_fts)`));
    available = true;
  } catch {
    available = false;
  }
  return available;
}

async function hasIndex(db: DB): Promise<boolean> {
  if (available != null) return available;
  try {
    await db.run(sql.raw("select rowid from jobs_fts limit 1"));
    available = true;
  } catch {
    available = false;
  }
  return available;
}

/** For tests: forget whether the index exists (a fresh database). */
export const resetSearchIndexState = () => {
  available = null;
};

const clean = (s: string) => fold(s).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** One way of writing it, as FTS5 understands it: a phrase, the last word also as a prefix ("amministrativ*"). */
function term(alt: string): string | null {
  let t = clean(alt);
  if (!t) return null;
  // One Italian word: its gender and number do not matter ("impiegata" finds "impiegato", "impiegati").
  if (!t.includes(" ") && t.length >= 6 && /[aeio]$/.test(t)) t = t.slice(0, -1);
  const last = t.split(" ").at(-1)!;
  return last.length >= 4 ? `"${t}"*` : `"${t}"`;
}

function conceptExpr(c: QueryConcept, titleOnly: boolean): string | null {
  const alts = [...new Set(c.alternatives.map(term).filter((x): x is string => !!x))];
  if (!alts.length) return null;
  const any = alts.length === 1 ? alts[0] : `(${alts.join(" OR ")})`;
  return c.field === "title" && titleOnly ? `{title company} : ${any}` : any;
}

/**
 * The FTS5 query for a search: every concept must be there (any of its alternatives); a role in the
 * title. `relaxed`: the role anywhere in the offer; `anyConcept`: at least one concept.
 */
export function matchExpression(q: ParsedQuery, mode: "strict" | "relaxed" | "any" = "strict"): string | null {
  const parts = q.concepts.map((c) => conceptExpr(c, mode === "strict")).filter((x): x is string => !!x);
  if (!parts.length) return null;
  const positive = mode === "any" ? `(${parts.join(" OR ")})` : parts.join(" AND ");
  const not = q.excludes.map((e) => term(e.word)).filter(Boolean);
  return not.length ? `${positive} NOT (${not.join(" OR ")})` : positive;
}

/** Offers matching, best first (lower BM25 = better), at most `limit`. null when there is no index. */
export async function searchIds(db: DB, expr: string, limit = 3000): Promise<{ id: number; rank: number }[] | null> {
  if (!(await hasIndex(db))) return null;
  try {
    const rows = await db.all<{ id: number; rank: number }>(sql`select rowid as id, bm25(jobs_fts, 8.0, 4.0, 1.0) as rank from jobs_fts where jobs_fts match ${expr} order by rank limit ${limit}`);
    return rows.map((r) => ({ id: Number(r.id), rank: Number(r.rank) }));
  } catch {
    return [];
  }
}

/** Offers carrying any of these words (for exclusions when nothing else is searched). */
export async function idsWithWords(db: DB, words: string[]): Promise<number[] | null> {
  const terms = words.map(term).filter(Boolean);
  if (!terms.length) return [];
  const r = await searchIds(db, terms.join(" OR "), 20000);
  return r?.map((x) => x.id) ?? null;
}
