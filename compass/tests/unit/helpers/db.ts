import { createDb, migrateDb, setDb, type DB } from "@/lib/db";

/** A fresh in-memory database with all migrations applied. */
export async function freshDb(): Promise<DB> {
  const handle = createDb(":memory:");
  await migrateDb(handle.db);
  setDb(handle);
  return handle.db;
}
