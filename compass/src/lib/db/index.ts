// Database connection. libSQL works with a local file (development, demo) and with Turso
// (production) through the same client, so there is one code path.

import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
import * as schema from "./schema";

export type DB = LibSQLDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __compassDb?: { db: DB; client: Client } };

export function createDb(url: string, authToken?: string): { db: DB; client: Client } {
  if (url.startsWith("file:") && !url.includes(":memory:")) {
    fs.mkdirSync(path.dirname(url.slice(5)), { recursive: true });
  }
  const client = createClient({ url, authToken });
  return { db: drizzle(client, { schema }), client };
}

/** The app-wide database (cached across hot reloads in development). */
export function getDb(): DB {
  if (!globalForDb.__compassDb) globalForDb.__compassDb = createDb(env.databaseUrl, env.databaseAuthToken);
  return globalForDb.__compassDb.db;
}

/** Swap the database (tests use an in-memory one). */
export function setDb(handle: { db: DB; client: Client }): void {
  globalForDb.__compassDb = handle;
}

export async function migrateDb(db: DB): Promise<void> {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
}

export { schema };
