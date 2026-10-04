// Apply database migrations (local file or Turso).
import "./load-env";
import { getDb, migrateDb } from "../src/lib/db";

await migrateDb(getDb());
console.log("Database ready.");
