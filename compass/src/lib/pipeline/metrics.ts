// How well Compass finds offers, on the real data (counts only: CI logs are public). Coverage: offers
// in Italy first seen in the last 7 days, by source. Freshness: hours from publication to Compass, for
// those that say when they were published. Understanding: share of offers where the facts were read.
import { sql } from "drizzle-orm";
import type { DB } from "../db";

export async function searchMetrics(db: DB, now = new Date()) {
  const since = now.getTime() - 7 * 86_400_000;
  const bySource = await db.all<{ source: string; n: number }>(
    sql`select substr(s.source, 1, instr(s.source || ':', ':') - 1) as source, count(distinct j.id) as n from jobs j join job_sources s on s.job_id = j.id where j.first_seen_at >= ${since} and j.country = 'IT' group by 1 order by 2 desc`,
  );
  const delays = (
    await db.all<{ h: number }>(sql`select (first_seen_at - posted_at) / 3600000.0 as h from jobs where first_seen_at >= ${since} and posted_at is not null and posted_at <= first_seen_at`)
  )
    .map((r) => Number(r.h))
    .sort((a, b) => a - b);
  const q = (p: number) => (delays.length ? Math.round(delays[Math.min(delays.length - 1, Math.floor(p * delays.length))] * 10) / 10 : null);
  const [facts] = await db.all<{ total: number; years: number; edu: number; smart: number; salary: number; agency: number; old: number }>(
    sql`select count(*) as total,
      sum(json_extract(facts, '$.minYears') is not null) as years,
      sum(json_extract(facts, '$.education') is not null) as edu,
      sum(json_extract(facts, '$.smartDays') is not null) as smart,
      sum(salary_min is not null) as salary,
      sum(json_extract(facts, '$.agency') = 1) as agency,
      sum(json_extract(facts, '$.evergreen') = 1) as old
      from jobs where first_seen_at >= ${since}`,
  );
  return {
    italyLast7Days: Object.fromEntries(bySource.map((r) => [r.source, Number(r.n)])),
    hoursToCompass: { median: q(0.5), p90: q(0.9), sample: delays.length },
    facts: Object.fromEntries(Object.entries(facts ?? {}).map(([k, v]) => [k, Number(v ?? 0)])),
  };
}
