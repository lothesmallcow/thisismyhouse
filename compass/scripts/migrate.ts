// Apply database migrations (local file or Turso), then add any new catalog entries
// (hand-made list, then the listed companies and NACE industries of data/world/).
import "./load-env";
import { getDb, migrateDb } from "../src/lib/db";
import { ensureCatalog, ensureDirectory, ensureRegisters } from "../src/lib/server/catalog";
import { backfillJobPlaces, convertOldDismissals, mergeDuplicateJobs } from "../src/lib/server/jobs";
import { backfillCompanies } from "../src/lib/server/company-guess";

await migrateDb(getDb());
await backfillJobPlaces(getDb());
await convertOldDismissals(getDb());
await backfillCompanies(getDb());
await mergeDuplicateJobs(getDb());
await ensureCatalog(getDb());
const dir = await ensureDirectory(getDb());
// ~950,000 register companies (a few minutes the first time). REGISTERS=IT,GB limits them; REGISTERS=none skips (CI, tests).
const which = (process.env.REGISTERS ?? "IT,GB,DE,FR").toUpperCase();
const reg = which === "NONE" ? 0 : await ensureRegisters(getDb(), which.split(",").map((s) => s.trim()).filter(Boolean), (s) => console.log(s));
console.log(dir.skipped && !reg ? "Database ready." : `Database ready (added ${dir.companies} listed companies, ${dir.sectors} NACE industries, ${reg} register companies).`);
