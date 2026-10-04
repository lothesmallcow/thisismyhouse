// Load test: 5,000 shared jobs, two people. Measures the Offerte query and a full re-rank.
// Usage: DATABASE_URL=file:data/local/perf.db npx tsx scripts/perf-5000.ts
import "./load-env";
import { getDb, migrateDb, schema } from "../src/lib/db";
import { seedAccounts, seedDemo } from "../src/lib/seed";
import { listJobs, rerankAll, rerankUser } from "../src/lib/server/jobs";
import { updateProfile } from "../src/lib/server/profile";

// It writes 10,000 synthetic rows: never into the demo or a real database.
if (!/perf[^/]*\.db$/.test(process.env.DATABASE_URL ?? "")) {
  console.error("Run it on its own database: DATABASE_URL=file:data/local/perf.db npx tsx scripts/perf-5000.ts");
  process.exit(1);
}
const db = getDb();
await migrateDb(db);
const [lucia, marco] = await seedAccounts(db, {
  admin: { email: "admin@example.com", password: "admin-compass" },
  people: [
    { email: "demo@example.com", password: "demo-compass", name: "Lucia Ferraro", track: "lavoro" },
    { email: "studente@example.com", password: "demo-compass", name: "Marco Bianchi", track: "stage", mailboxKey: "studente" },
  ],
});
await seedDemo(db, new Date(), { userId: lucia, studentId: marco });
const cities: [string, number, number][] = [["Torino", 45.07, 7.69], ["Moncalieri", 45.0, 7.68], ["Rivoli", 45.07, 7.51], ["Milano", 45.46, 9.19], ["Asti", 44.9, 8.21]];
const titles = ["Impiegata amministrativa", "Segretaria", "Addetta vendite", "Magazziniere", "Summer Analyst Intern", "Stage M&A", "Operatrice call center"];
const now = Date.now();
const rows = Array.from({ length: 5000 }, (_, i) => {
  const [city, lat, lng] = cities[i % cities.length];
  const postedAt = new Date(now - (i % 40) * 86400000);
  return {
    dedupeKey: `perf|${i}`,
    title: `${titles[i % titles.length]} ${i}`,
    company: `Azienda Prova ${i % 900}`,
    city,
    lat,
    lng,
    description: "Annuncio di prova generato per il test di carico.",
    hours: i % 3 === 0 ? "part" : "full",
    contract: "indeterminato",
    jobType: i % 7 >= 4 && i % 7 <= 5 ? "stage" : "lavoro",
    salaryMax: i % 4 === 0 ? 20000 + (i % 15000) : null,
    postedAt,
    firstSeenAt: postedAt,
    updatedAt: new Date(),
  };
});
for (let i = 0; i < rows.length; i += 500) {
  const ids = await db.insert(schema.jobs).values(rows.slice(i, i + 500)).returning({ id: schema.jobs.id });
  await db.insert(schema.jobSources).values(ids.map((r) => ({ jobId: r.id, source: "api:adzuna", seenAt: new Date() })));
}
const t = async (label: string, f: () => Promise<unknown>) => {
  const s = performance.now();
  await f();
  console.log(`${label}: ${Math.round(performance.now() - s)} ms`);
};
await t("Full re-rank, both people (first time, 2 x 5,000 rows written)", () => rerankAll(db));
await t("Offerte, first page (10)", () => listJobs(db, lucia, {}, 10));
await t("Offerte, first page again (warm)", () => listJobs(db, lucia, {}, 10));
await t("Offerte with 3 filters", () => listJobs(db, lucia, { maxKm: 20, hours: "part", days: 7 }, 10));
await t("Offerte, student, only chosen companies", () => listJobs(db, marco, { focus: "aziende" }, 10));
await t("Offerte after 'Mostra altre 10' x20 (200 rows)", () => listJobs(db, lucia, {}, 200));
await updateProfile(db, lucia, { maxKm: 10, hours: "part" }); // changes almost every job's score
await t("Re-rank one person after a profile change", () => rerankUser(db, lucia));
