// Apply database migrations (local file or Turso), then add any new curated catalog entries.
import "./load-env";
import { getDb, migrateDb } from "../src/lib/db";
import { ensureCatalog } from "../src/lib/server/catalog";

await migrateDb(getDb());
await ensureCatalog(getDb());
console.log("Database ready.");
