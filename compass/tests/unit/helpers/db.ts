import { and, eq } from "drizzle-orm";
import { createDb, migrateDb, schema, setDb, type DB } from "@/lib/db";
import { seedAccounts, seedDemo } from "@/lib/seed";

/** A fresh in-memory database with all migrations applied. */
export async function freshDb(): Promise<DB> {
  const handle = createDb(":memory:");
  await migrateDb(handle.db);
  setDb(handle);
  return handle.db;
}

/** The two demo people: Lucia (job search, mailbox "default") and Marco (internships, mailbox "studente"). */
export async function seedPeople(db: DB, now: Date, opts: { onboarded?: boolean; student?: boolean } = {}) {
  const [L, M] = await seedAccounts(db, {
    admin: { email: "a@example.com", password: "admin-password" },
    people: [
      { email: "u@example.com", password: "demo-password", name: "Lucia Ferraro", track: "lavoro", mailboxKey: "default" },
      { email: "s@example.com", password: "demo-password", name: "Marco Bianchi", track: "stage", mailboxKey: "studente" },
    ],
  });
  await seedDemo(db, now, { onboarded: opts.onboarded, userId: L, studentId: opts.student === false ? undefined : M });
  return { L, M };
}

/** One person's view of a job (level, status, distance...). */
export async function view(db: DB, userId: number, jobId: number) {
  return db.query.userJobs.findFirst({ where: and(eq(schema.userJobs.userId, userId), eq(schema.userJobs.jobId, jobId)) });
}
