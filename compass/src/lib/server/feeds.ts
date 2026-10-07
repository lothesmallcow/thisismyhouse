// The registry of employers' boards Compass knows: every board learned from an offer link (a web
// result, an alert, a careers page) is kept on its company in the catalog, so the next runs read the
// whole board, not just the one offer. New employers are added as "scoperta" (discovered).
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import type { CountryCode } from "../core/geo";
import type { RawJob } from "../core/normalize";
import { feedFromUrl, type Feed } from "../sources/ats/feeds";
import type { DB } from "../db";
import { schema } from "../db";
import { canonicalCompany } from "./company-guess";

/** "barclays.wd3.myworkdayjobs.com/External" → "Barclays", "point72" → "Point72". */
export function feedName(f: Feed): string {
  const base =
    f.ats === "avature"
      ? f.slug.split("/")[0].split(".").find((p) => !/^(?:careers?|jobs?|www|karriere|apply|recruiting)$/i.test(p)) ?? f.slug
      : f.ats === "workday" || f.ats === "oracle" || f.ats === "eightfold"
        ? (f.ats === "eightfold" ? f.slug.split("/")[1]?.split(".")[0] : f.slug.split(".")[0]) || f.slug
        : f.slug;
  return base
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

/**
 * Keep a board on its company: the catalog company of that name gets it when it has none; an unknown
 * employer becomes a "scoperta" entry. Returns the company id (null when nothing could be named).
 */
export async function registerFeed(db: DB, feed: Feed, company: string | null, country: CountryCode | null = null): Promise<number | null> {
  const c = schema.catalogCompanies;
  const same = await db.query.catalogCompanies.findFirst({ where: and(eq(c.ats, feed.ats), sql`lower(${c.atsSlug}) = ${feed.slug.toLowerCase()}`) });
  if (same) return same.id;
  const name = (company && (await canonicalCompany(db, company))) || feedName(feed);
  if (!name) return null;
  const known = await db.query.catalogCompanies.findFirst({ where: and(sql`lower(${c.name}) = ${name.toLowerCase()}`, sql`${c.source} != 'registro'`) });
  if (known) {
    if (!known.ats) await db.update(c).set({ ats: feed.ats, atsSlug: feed.slug, atsCheckedAt: new Date() }).where(eq(c.id, known.id));
    return known.id;
  }
  const [row] = await db
    .insert(c)
    .values({ slug: `scoperta-${feed.ats}-${slugify(feed.slug)}`, name, kind: "azienda", source: "scoperta", shared: true, country: country ?? "IT", ats: feed.ats, atsSlug: feed.slug, atsCheckedAt: new Date() })
    .onConflictDoNothing()
    .returning({ id: c.id });
  return row?.id ?? null;
}

/** Every board behind these offers' links, registered. Returns how many boards were new to Compass. */
export async function learnFeeds(db: DB, jobs: RawJob[]): Promise<number> {
  let added = 0;
  const seen = new Set<string>();
  for (const j of jobs) {
    const f = j.url ? feedFromUrl(j.url) : null;
    if (!f || seen.has(`${f.ats}:${f.slug}`)) continue;
    seen.add(`${f.ats}:${f.slug}`);
    const c = schema.catalogCompanies;
    const before = await db.query.catalogCompanies.findFirst({ where: and(eq(c.ats, f.ats), sql`lower(${c.atsSlug}) = ${f.slug.toLowerCase()}`) });
    if (before) continue;
    if ((await registerFeed(db, f, j.company ?? null)) != null) added++;
  }
  return added;
}

/** Boards found on their own (not chosen by anyone yet), newest first. */
export async function discoveredFeeds(db: DB, limit = 200) {
  const c = schema.catalogCompanies;
  return db
    .select({ id: c.id, name: c.name, ats: c.ats, atsSlug: c.atsSlug })
    .from(c)
    .where(and(eq(c.source, "scoperta"), isNotNull(c.ats), isNotNull(c.atsSlug)))
    .orderBy(desc(c.id))
    .limit(limit);
}

/** Boards read whole (not searched by keyword): an offer missing from them is gone. */
export const FULL_BOARDS = new Set(["greenhouse", "lever", "ashby", "workable", "personio", "recruitee", "teamtailor"]);

/**
 * After reading a whole board: its offers we hold that are no longer on it are marked "scaduto"
 * (the employer took them down), the same day rather than when the 7-day clean-up runs.
 * `present`: every link the board listed this time. Returns how many were closed.
 */
export async function closeMissing(db: DB, feed: Feed, present: string[], now = new Date()): Promise<number[]> {
  if (!FULL_BOARDS.has(feed.ats)) return [];
  const here = new Set(present.map((u) => u.replace(/\/+$/, "")));
  const s = schema.jobSources;
  const rows = await db.select({ jobId: s.jobId, url: s.url }).from(s).where(eq(s.source, `ats:${feed.ats}`));
  const slug = feed.slug.toLowerCase();
  const gone = new Set<number>();
  const still = new Set<number>();
  for (const r of rows) {
    if (!r.url) continue;
    const f = feedFromUrl(r.url);
    if (!f || f.ats !== feed.ats || f.slug.toLowerCase() !== slug) continue;
    if (here.has(r.url.replace(/\/+$/, ""))) still.add(r.jobId);
    else gone.add(r.jobId);
  }
  const closed: number[] = [];
  for (const id of gone) {
    if (still.has(id)) continue; // another link of the same offer is still listed
    const job = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, id) });
    if (!job || (job.eligibility as string[]).includes("scaduto")) continue;
    await db.update(schema.jobs).set({ eligibility: [...(job.eligibility as string[]), "scaduto"] as typeof job.eligibility, updatedAt: now }).where(eq(schema.jobs.id, id));
    closed.push(id);
  }
  return closed;
}
