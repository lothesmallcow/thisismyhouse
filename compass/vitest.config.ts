import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // Tests never touch the network: every adapter receives a fake fetch.
    env: { DEMO_MODE: "true", DATABASE_URL: "file::memory:" },
  },
});
