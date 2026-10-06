// Seed the catalog, the admin account and, in demo mode, three fake people with a full dataset.
// Usage: tsx scripts/seed.ts [--if-empty] [--not-onboarded]
// Real mode: only the admin (SEED_ADMIN_*), plus one person if SEED_USER_EMAIL is set; everyone
// else is added from admin → Persone or with an invitation.
import "./load-env";
import { getDb } from "../src/lib/db";
import { env } from "../src/lib/env";
import { isEmpty, seedAccounts, seedDemo } from "../src/lib/seed";

const db = getDb();
const args = process.argv.slice(2);
if (args.includes("--if-empty") && !(await isEmpty(db))) {
  console.log("Database already has data: seed skipped.");
  process.exit(0);
}
// Online the demo admin password (written in this public repository) must never be used.
if (!env.demoMode && (!process.env.SEED_ADMIN_EMAIL || (process.env.SEED_ADMIN_PASSWORD ?? "").length < 6 || process.env.SEED_ADMIN_PASSWORD === "admin-compass")) {
  console.error("Real mode: set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 6 characters (in .env or the host's secrets). Nothing seeded.");
  process.exit(1);
}
const admin = { email: process.env.SEED_ADMIN_EMAIL || "admin@example.com", password: process.env.SEED_ADMIN_PASSWORD || "admin-compass" };
if (env.demoMode) {
  const [lucia, marco, chiara] = await seedAccounts(db, {
    admin,
    people: [
      { email: process.env.SEED_USER_EMAIL || "demo@example.com", password: process.env.SEED_USER_PASSWORD || "demo-compass", name: "Lucia Ferraro", track: "lavoro", mailboxKey: "default" },
      { email: "studente@example.com", password: "demo-compass", name: "Marco Bianchi", track: "stage", mailboxKey: "studente" },
      { email: "moda@example.com", password: "demo-compass", name: "Chiara Colombo", track: "lavoro", mailboxKey: "default" },
    ],
  });
  await seedDemo(db, new Date(), { onboarded: !args.includes("--not-onboarded"), userId: lucia, studentId: marco, fashionId: chiara });
  console.log("Demo data seeded: three fake people (office job search, internships, luxury retail), fake jobs, demo mailboxes.");
} else {
  const people = process.env.SEED_USER_EMAIL && process.env.SEED_USER_PASSWORD ? [{ email: process.env.SEED_USER_EMAIL, password: process.env.SEED_USER_PASSWORD, name: process.env.SEED_USER_NAME || "", track: (process.env.SEED_USER_TRACK === "stage" ? "stage" : "lavoro") as "stage" | "lavoro", mailboxKey: "default" }] : [];
  await seedAccounts(db, { admin, people });
  console.log(`Catalog and admin account ready${people.length ? ", plus one person" : ""}. No demo data in real mode.`);
}
