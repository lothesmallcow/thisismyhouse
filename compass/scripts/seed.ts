// Seed the first accounts and, in demo mode, a full fake dataset.
// Usage: tsx scripts/seed.ts [--if-empty] [--not-onboarded]
import "./load-env";
import { getDb } from "../src/lib/db";
import { env } from "../src/lib/env";
import { isEmpty, seedAccounts, seedDemo, seedTemplates } from "../src/lib/seed";

const db = getDb();
const args = process.argv.slice(2);
if (args.includes("--if-empty") && !(await isEmpty(db))) {
  console.log("Database already has data: seed skipped.");
  process.exit(0);
}
await seedAccounts(db, {
  userEmail: process.env.SEED_USER_EMAIL || "demo@example.com",
  userPassword: process.env.SEED_USER_PASSWORD || "demo-compass",
  adminEmail: process.env.SEED_ADMIN_EMAIL || "admin@example.com",
  adminPassword: process.env.SEED_ADMIN_PASSWORD || "admin-compass",
});
if (env.demoMode) {
  await seedDemo(db, new Date(), { onboarded: !args.includes("--not-onboarded") });
  console.log("Demo data seeded (fake jobs, fake profile, demo mailbox).");
} else {
  await seedTemplates(db);
  console.log("Accounts and default letter templates created. No demo data in real mode.");
}
