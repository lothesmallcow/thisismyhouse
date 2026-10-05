import { and, eq, isNull, or, sql, inArray } from "drizzle-orm";
import { TASTES } from "@/lib/catalog/data";
import { getDb, schema } from "@/lib/db";
import type { Sector } from "@/lib/server/catalog";
import { PillCheck } from "./ui";

/** How many companies with a readable site each career has in these countries (shown up to 200). */
async function companyCounts(ids: number[], countries: string[]): Promise<Map<number, number>> {
  const db = getDb();
  const c = schema.catalogCompanies;
  const readable = or(sql`${c.website} is not null`, sql`${c.careersUrl} is not null`, sql`${c.ats} is not null`);
  const where = (id: number) => and(eq(c.sectorId, id), or(inArray(c.country, countries), and(eq(c.source, "curato"), isNull(c.city))), readable);
  const rows = await Promise.all(ids.map(async (id) => [id, Number((await db.select({ n: sql<number>`count(*)` }).from(sql`(select 1 from ${c} where ${where(id)} limit 201)`))[0].n)] as const));
  return new Map(rows);
}

/** Several careers at once, grouped like the questionnaire's interests, each with its companies. */
export async function CareerPicker({ sectors, liked, countries }: { sectors: Sector[]; liked: Set<number>; countries: string[] }) {
  const curated = sectors.filter((s) => s.source === "curato");
  const bySlug = new Map(curated.map((s) => [s.slug, s]));
  const counts = await companyCounts(curated.map((s) => s.id), countries);
  const shown = new Set<string>();
  const groups = [...TASTES.map((t) => ({ label: t.label, items: t.sectors.filter((slug) => bySlug.has(slug) && !shown.has(slug) && shown.add(slug)).map((slug) => bySlug.get(slug)!) })), { label: "Altre carriere", items: curated.filter((s) => !shown.has(s.slug)) }].filter((g) => g.items.length);
  const count = (id: number) => {
    const n = counts.get(id) ?? 0;
    return n > 200 ? "200+" : String(n);
  };
  return (
    <div>
      {groups.map((g) => (
        <fieldset key={g.label} className="mt-4 first:mt-0">
          <legend className="mb-2 text-[13px] font-medium text-faint">{g.label}</legend>
          <div className="flex flex-wrap gap-2">
            {g.items.map((s) => (
              <PillCheck key={s.id} name="sector" value={String(s.id)} defaultChecked={liked.has(s.id)}>
                {s.name} <span className="text-faint">· {count(s.id)}</span>
              </PillCheck>
            ))}
          </div>
        </fieldset>
      ))}
      {curated.map((s) => (
        <input key={s.id} type="hidden" name="shown" value={s.id} />
      ))}
    </div>
  );
}
