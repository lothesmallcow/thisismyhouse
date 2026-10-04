// Load test: 5,000 jobs in the database. Measures the Offerte query and a full rerank.
// Usage: DATABASE_URL=file:data/local/perf.db npx tsx scripts/perf-5000.ts
import "./load-env";
import { getDb, migrateDb, schema } from "../src/lib/db";
import { seedAccounts, seedDemo } from "../src/lib/seed";
import { listJobs, rerankAll } from "../src/lib/server/jobs";
import { rankJob } from "../src/lib/core/rank";
import { toRankProfile, getProfile } from "../src/lib/server/profile";

const db = getDb();
await migrateDb(db);
await seedAccounts(db, { userEmail: "demo@example.com", userPassword: "demo-compass", adminEmail: "admin@example.com", adminPassword: "admin-compass" });
await seedDemo(db, new Date());
const p = toRankProfile(await getProfile(db));
const cities = ["Torino", "Moncalieri", "Rivoli", "Chieri", "Milano", "Asti", "Nichelino", "Collegno"];
const titles = ["Impiegata amministrativa", "Segretaria", "Addetta vendite", "Magazziniere", "Receptionist", "Contabile", "Operatrice call center"];
const now = Date.now();
const rows = Array.from({ length: 5000 }, (_, i) => {
  const job = {
    title: `${titles[i % titles.length]} ${i}`,
    company: `Azienda Prova ${i % 900}`,
    description: "Annuncio di prova generato per il test di carico.",
    sector: null,
    distanceKm: (i * 7) % 90,
    remote: "unknown" as const,
    hours: (i % 3 === 0 ? "part" : "full") as "part" | "full",
    contract: "indeterminato" as const,
    minAnnualGross: null,
    maxAnnualGross: i % 4 === 0 ? 20000 + (i % 15000) : null,
    languages: [],
    postedAt: new Date(now - (i % 40) * 86400000),
    scamFlagCount: 0,
  };
  const r = rankJob(job, p, [], new Date());
  return {
    dedupeKey: `perf|${i}`,
    title: job.title,
    company: job.company,
    city: cities[i % cities.length],
    distanceKm: job.distanceKm,
    hours: job.hours,
    contract: job.contract,
    salaryMax: job.maxAnnualGross,
    postedAt: job.postedAt,
    firstSeenAt: job.postedAt,
    updatedAt: new Date(),
    score: r.score,
    level: r.level,
    reasons: r.reasons,
    factors: r.factors,
  };
});
for (let i = 0; i < rows.length; i += 500) await db.insert(schema.jobs).values(rows.slice(i, i + 500));
const t = async (label: string, f: () => Promise<unknown>) => {
  const s = performance.now();
  await f();
  console.log(`${label}: ${Math.round(performance.now() - s)} ms`);
};
await t("Offerte, first page (10)", () => listJobs(db, {}, 10));
await t("Offerte, first page again (warm)", () => listJobs(db, {}, 10));
await t("Offerte with 3 filters", () => listJobs(db, { maxKm: 20, hours: "part", days: 7 }, 10));
await t("Offerte after 'Mostra altre 10' x20 (200 rows)", () => listJobs(db, {}, 200));
const { updateProfile } = await import("../src/lib/server/profile");
await updateProfile(db, { maxKm: 10, hours: "part" }); // changes almost every job's score
await t("Full rerank of 5,000 jobs (after a profile change)", () => rerankAll(db));
