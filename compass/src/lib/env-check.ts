// Startup configuration check. In real mode (DEMO_MODE=false) a missing or weak required
// variable stops the server at startup with a clear message, instead of failing later.
// In demo mode the same problems are only warnings.

export interface EnvProblem {
  variable: string;
  message: string;
  fatal: boolean;
}

const WEAK_SECRETS = new Set(["", "change-me-to-a-long-random-string", "change-me-too", "dev-only-insecure-secret"]);

export type Env = Record<string, string | undefined>;

export function checkEnv(e: Env = process.env): EnvProblem[] {
  const real = (e.DEMO_MODE ?? "true").toLowerCase() === "false";
  const out: EnvProblem[] = [];
  const need = (variable: string, ok: boolean, message: string, fatalInReal = true) => {
    if (!ok) out.push({ variable, message, fatal: real && fatalInReal });
  };
  const secret = e.SESSION_SECRET ?? "";
  need("SESSION_SECRET", !WEAK_SECRETS.has(secret) && secret.length >= 32, "must be a random string of at least 32 characters (e.g. `openssl rand -hex 32`)");
  need("CRON_SECRET", !WEAK_SECRETS.has(e.CRON_SECRET ?? "") && (e.CRON_SECRET ?? "").length >= 16, "must be a random string of at least 16 characters");
  need("DATABASE_URL", Boolean(e.DATABASE_URL), "is required (libsql://... for Turso, file:... locally)");
  if ((e.DATABASE_URL ?? "").startsWith("libsql://")) need("DATABASE_AUTH_TOKEN", Boolean(e.DATABASE_AUTH_TOKEN), "is required for a Turso database");
  need("APP_URL", /^https?:\/\//.test(e.APP_URL ?? ""), "must be the public URL of the app (used in the morning e-mail)");
  need("CONTACT_EMAIL", /@/.test(e.CONTACT_EMAIL ?? ""), "is required: every outbound request carries it in an honest User-Agent");
  need("MAILBOX_USER", Boolean(e.MAILBOX_USER), "is required: the main mailbox reads alerts and sends e-mails (MAILBOX_<KEY>_USER adds more)");
  need("MAILBOX_APP_PASSWORD", Boolean(e.MAILBOX_APP_PASSWORD), "is required (Gmail app password, see docs/setup.md)");
  for (const k of Object.keys(e)) {
    const m = k.match(/^MAILBOX_([A-Z0-9]+)_USER$/);
    if (m) need(`MAILBOX_${m[1]}_APP_PASSWORD`, Boolean(e[`MAILBOX_${m[1]}_APP_PASSWORD`]), `is required because ${k} is set`);
  }
  need("PRIVACY_OWNER", Boolean(e.PRIVACY_OWNER?.trim()), "should name who runs this Compass (shown on /privacy, the privacy notice)", false);
  need("ADMIN_ALERT_EMAIL", /@/.test(e.ADMIN_ALERT_EMAIL ?? ""), "should be your inbox for alerts when a source breaks", false);
  return out;
}

export function assertEnv(e: Env = process.env): void {
  const problems = checkEnv(e);
  const fatal = problems.filter((p) => p.fatal);
  for (const p of problems.filter((x) => !x.fatal)) {
    if ((e.DEMO_MODE ?? "true").toLowerCase() === "false") console.warn(`[compass] ${p.variable} ${p.message}`);
  }
  if (fatal.length) {
    throw new Error(
      `Compass cannot start in real mode (DEMO_MODE=false). Fix these in .env or in the host's secrets:\n` +
        fatal.map((p) => `  - ${p.variable} ${p.message}`).join("\n"),
    );
  }
}
