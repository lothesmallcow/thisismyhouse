// The search benchmark, printed: for each search people type, precision of the first 5 and recall.
//   npx tsx scripts/bench-search.ts
import { createDb, migrateDb, setDb } from "../src/lib/db";
import { upsertRawJob } from "../src/lib/server/jobs";
import { runSearch } from "../src/lib/server/search";
import { seedAccounts } from "../src/lib/seed";
import { BENCH_ADS, BENCH_QUERIES, scoreQuery } from "../tests/bench/search-bench";

const NOW = new Date();
const handle = createDb(":memory:");
setDb(handle);
const db = handle.db;
await migrateDb(db);
const [user] = await seedAccounts(db, { admin: { email: "a@example.com", password: "admin-password" }, people: [{ email: "u@example.com", password: "demo-password", name: "Prova", track: "lavoro", mailboxKey: null }] });
const keyOf = new Map<number, string>();
for (const [i, a] of BENCH_ADS.entries()) {
  const r = await upsertRawJob(db, { source: "w1", url: `https://bench.example/${i}`, title: a.title, company: a.company, location: a.location, description: a.description.padEnd(130, " "), postedAt: NOW }, NOW);
  keyOf.set(r.jobId, a.key);
}
let p = 0;
let r = 0;
for (const q of BENCH_QUERIES) {
  const t = Date.now();
  const res = await runSearch(db, user, q.q, {}, 50, NOW);
  const s = scoreQuery(res.ids.map((id) => keyOf.get(id)!), q);
  if (process.env.SHOW) console.log("   ", res.mode, res.ids.map((id) => keyOf.get(id)).join(" "));
  p += s.precision;
  r += s.recall;
  console.log(`${q.q.padEnd(46)} P@5 ${s.precision.toFixed(2)}  R ${s.recall.toFixed(2)}  ${String(Date.now() - t).padStart(4)} ms${s.wrong.length ? `  WRONG: ${s.wrong.join(", ")}` : ""}`);
}
console.log(`\nAverage over ${BENCH_QUERIES.length} searches: precision@5 ${(p / BENCH_QUERIES.length).toFixed(2)}, recall ${(r / BENCH_QUERIES.length).toFixed(2)}`);
