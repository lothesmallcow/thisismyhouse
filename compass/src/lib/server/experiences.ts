// One person's experience timeline: read from the CV (PDF text or pasted text), imported from a
// LinkedIn data export (Positions.csv / Education.csv, or the whole .zip), or typed in. Each entry
// is matched to the catalog (company and sector) so suggestions can build on real experience.
import { and, asc, desc, eq } from "drizzle-orm";
import { unzipSync, strFromU8 } from "fflate";
import { extractSector } from "../core/extract";
import { companyNameMatches } from "../core/rank";
import { escapeRe, fold, keyTokens } from "../core/text";
import { parseCvTimeline, parseLinkedInEducation, parseLinkedInPositions, type TimelineItem } from "../core/timeline";
import type { DB } from "../db";
import { schema } from "../db";
import { listCompanies, listSectors } from "./catalog";

export type Experience = typeof schema.experiences.$inferSelect;

/** Text of a PDF (CVs). Returns "" for anything unreadable (scans, protected files). */
export async function pdfText(data: Uint8Array): Promise<string> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const doc = await getDocumentProxy(new Uint8Array(data));
    const { text } = await extractText(doc, { mergePages: true });
    return text.replace(/[ \t]+\n/g, "\n").trim().slice(0, 30000);
  } catch {
    return "";
  }
}

export async function listExperiences(db: DB, userId: number): Promise<Experience[]> {
  return db
    .select()
    .from(schema.experiences)
    .where(eq(schema.experiences.userId, userId))
    .orderBy(desc(schema.experiences.current), desc(schema.experiences.endYear), desc(schema.experiences.startYear), asc(schema.experiences.id));
}

/** Which catalog company and sector an experience belongs to (by company name, then by words). */
async function matcher(db: DB, userId: number) {
  const companies = await listCompanies(db, userId, "all");
  const sectors = await listSectors(db, userId, "all");
  return (item: Pick<TimelineItem, "organization" | "title" | "description" | "kind">) => {
    const company = item.organization ? companies.find((c) => companyNameMatches(item.organization, c)) : undefined;
    if (company) return { catalogCompanyId: company.id, sectorId: company.sectorId };
    if (item.kind === "studio") return { catalogCompanyId: null, sectorId: null };
    // The sector whose words appear most ("Commessa in una boutique di moda": moda + boutique),
    // then the generic extraction rules ("commessa": vendita).
    const text = `${item.title}\n${item.organization}\n${item.description}`;
    const folded = fold(text);
    const hits = (s: (typeof sectors)[number]) =>
      [s.name, ...s.keywords].filter((k) => {
        const kt = keyTokens(k);
        // Whole words only: stems would make "scontrino medio" count as "media".
        return kt.length === 1 ? kt[0].length >= 4 && new RegExp(`(^|[^a-z0-9])${escapeRe(fold(k))}([^a-z0-9]|$)`).test(folded) : kt.length > 1 && folded.includes(fold(k));
      }).length;
    const best = sectors.map((s) => ({ s, n: hits(s) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n)[0];
    if (best) return { catalogCompanyId: null, sectorId: best.s.id };
    const byRule = extractSector(text);
    const named = byRule ? sectors.find((s) => s.name === byRule) : undefined;
    return { catalogCompanyId: null, sectorId: named?.id ?? null };
  };
}

/** Save timeline items. With `replaceSource`, earlier entries from the same source are replaced (re-import). */
export async function saveExperiences(db: DB, userId: number, items: TimelineItem[], source: "cv" | "linkedin" | "manuale", replaceSource = false): Promise<number> {
  const match = await matcher(db, userId);
  if (replaceSource) await db.delete(schema.experiences).where(and(eq(schema.experiences.userId, userId), eq(schema.experiences.source, source)));
  const rows = items
    .filter((i) => i.title || i.organization)
    .slice(0, 60)
    .map((i) => ({
      userId,
      source,
      kind: i.kind,
      title: i.title.slice(0, 160),
      organization: i.organization.slice(0, 160),
      city: i.city?.slice(0, 80) ?? null,
      startYear: i.startYear,
      startMonth: i.startMonth,
      endYear: i.endYear,
      endMonth: i.endMonth,
      current: i.current,
      description: i.description.slice(0, 2000),
      ...match(i),
    }));
  if (rows.length) await db.insert(schema.experiences).values(rows);
  return rows.length;
}

/** Read the timeline from a CV's text (replacing what an earlier CV reading produced). */
export async function importFromCvText(db: DB, userId: number, text: string): Promise<number> {
  return saveExperiences(db, userId, parseCvTimeline(text), "cv", true);
}

/**
 * LinkedIn data export: the .zip LinkedIn e-mails ("Settings > Data privacy > Get a copy of your
 * data"), or the Positions.csv / Education.csv files inside it. Nothing is fetched from LinkedIn.
 */
export async function importFromLinkedIn(db: DB, userId: number, files: { name: string; data: Uint8Array }[]): Promise<number> {
  const csvs = new Map<string, string>();
  for (const f of files) {
    if (/\.zip$/i.test(f.name)) {
      try {
        const entries = unzipSync(f.data, { filter: (e) => /(^|\/)(Positions|Education)\.csv$/i.test(e.name) && e.originalSize < 5_000_000 });
        for (const [name, bytes] of Object.entries(entries)) csvs.set(name.split("/").pop()!.toLowerCase(), strFromU8(bytes));
      } catch {
        // not a zip we can read: ignored
      }
    } else if (/\.csv$/i.test(f.name)) csvs.set(f.name.toLowerCase(), new TextDecoder().decode(f.data));
  }
  const items: TimelineItem[] = [];
  for (const [name, text] of csvs) {
    if (name.includes("position")) items.push(...parseLinkedInPositions(text));
    else if (name.includes("education")) items.push(...parseLinkedInEducation(text));
  }
  if (items.length === 0) return 0;
  return saveExperiences(db, userId, items, "linkedin", true);
}

export async function deleteExperience(db: DB, userId: number, id: number): Promise<void> {
  await db.delete(schema.experiences).where(and(eq(schema.experiences.id, id), eq(schema.experiences.userId, userId)));
}

/** Re-match every entry (after the catalog changed, or a new "Altro" company). */
export async function rematchExperiences(db: DB, userId: number): Promise<void> {
  const match = await matcher(db, userId);
  for (const e of await listExperiences(db, userId)) {
    const m = match(e);
    if (m.catalogCompanyId !== e.catalogCompanyId || m.sectorId !== e.sectorId) await db.update(schema.experiences).set(m).where(eq(schema.experiences.id, e.id));
  }
}
