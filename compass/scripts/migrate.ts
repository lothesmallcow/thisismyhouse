// Apply database migrations (local file or Turso), then add any new catalog entries
// (hand-made list, then the listed companies and NACE industries of data/world/).
import "./load-env";
import { getDb, migrateDb } from "../src/lib/db";
import { ensureCatalog, ensureDirectory } from "../src/lib/server/catalog";

await migrateDb(getDb());
await ensureCatalog(getDb());
const dir = await ensureDirectory(getDb());
console.log(dir.skipped ? "Database ready." : `Database ready (added ${dir.companies} listed companies and ${dir.sectors} NACE industries).`);
