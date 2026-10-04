import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run the real production build in demo mode against a throwaway database.
// No real network, no real mailbox, no real e-mail.
const PORT = 3100;
const env = {
  DEMO_MODE: "true",
  DATABASE_URL: "file:data/local/e2e.db",
  REGISTERS: "none", // the ~950,000 register companies are not needed for the flows
  SESSION_SECRET: "e2e-session-secret-0123456789abcdef",
  CRON_SECRET: "e2e-cron-secret",
  APP_URL: `http://localhost:${PORT}`,
  SEED_USER_EMAIL: "demo@example.com",
  SEED_USER_PASSWORD: "demo-compass",
  SEED_ADMIN_EMAIL: "admin@example.com",
  SEED_ADMIN_PASSWORD: "admin-compass",
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"], browserName: "chromium" } },
  ],
  webServer: {
    command: `rm -f data/local/e2e.db* && npx tsx scripts/migrate.ts && npx tsx scripts/seed.ts && npx tsx scripts/run-job.ts ingest && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/entra`,
    timeout: 240_000,
    reuseExistingServer: false,
    env,
  },
});
