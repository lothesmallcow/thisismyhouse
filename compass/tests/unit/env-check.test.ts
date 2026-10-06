import { describe, expect, it } from "vitest";
import { assertEnv, checkEnv } from "@/lib/env-check";

const good = {
  DEMO_MODE: "false",
  SESSION_SECRET: "a".repeat(64),
  CRON_SECRET: "b".repeat(32),
  DATABASE_URL: "libsql://compass.example.turso.io",
  DATABASE_AUTH_TOKEN: "t",
  APP_URL: "https://compass.example",
  CONTACT_EMAIL: "contatto@compass.example",
  MAILBOX_USER: "x@example.com",
  MAILBOX_APP_PASSWORD: "p",
  ADMIN_ALERT_EMAIL: "io@example.com",
  PRIVACY_OWNER: "Persona Esempio",
};

describe("startup configuration check", () => {
  it("a complete real-mode config passes", () => {
    expect(checkEnv(good)).toEqual([]);
    expect(() => assertEnv(good)).not.toThrow();
  });
  it("real mode with a missing or weak variable refuses to start, naming it", () => {
    expect(() => assertEnv({ ...good, SESSION_SECRET: "change-me-to-a-long-random-string" })).toThrow(/SESSION_SECRET/);
    expect(() => assertEnv({ ...good, MAILBOX_APP_PASSWORD: "" })).toThrow(/MAILBOX_APP_PASSWORD/);
    expect(() => assertEnv({ ...good, DATABASE_AUTH_TOKEN: "" })).toThrow(/DATABASE_AUTH_TOKEN/);
    expect(() => assertEnv({ ...good, CONTACT_EMAIL: "" })).toThrow(/CONTACT_EMAIL/);
  });
  it("a missing privacy owner is a warning, not a stop", () => {
    expect(checkEnv({ ...good, PRIVACY_OWNER: "" })).toEqual([expect.objectContaining({ variable: "PRIVACY_OWNER", fatal: false })]);
  });
  it("demo mode only warns (nothing leaves the machine anyway)", () => {
    expect(() => assertEnv({ DEMO_MODE: "true" })).not.toThrow();
    expect(checkEnv({ DEMO_MODE: "true" }).every((p) => !p.fatal)).toBe(true);
  });
  it("demo mode is the default when DEMO_MODE is not set", () => {
    expect(() => assertEnv({})).not.toThrow();
  });
});

describe("the site's address", () => {
  it("on Vercel production: the project's production domain, whatever APP_URL says", async () => {
    const { env } = await import("@/lib/env");
    const keep = { ...process.env };
    process.env.APP_URL = "https://old-address.vercel.app";
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "compass-swart-gamma.vercel.app";
    expect(env.appUrl).toBe("https://compass-swart-gamma.vercel.app");
    process.env.VERCEL_ENV = "preview";
    expect(env.appUrl).toBe("https://old-address.vercel.app");
    process.env = keep;
  });
});
