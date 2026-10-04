// Typed access to configuration. Safe defaults: demo mode is ON unless explicitly "false".

export const env = {
  get demoMode(): boolean {
    return (process.env.DEMO_MODE ?? "true").toLowerCase() !== "false";
  },
  get databaseUrl(): string {
    return process.env.DATABASE_URL || "file:data/local/compass.db";
  },
  get databaseAuthToken(): string | undefined {
    return process.env.DATABASE_AUTH_TOKEN || undefined;
  },
  get sessionSecret(): string {
    return process.env.SESSION_SECRET || "dev-only-insecure-secret";
  },
  get cronSecret(): string | undefined {
    return process.env.CRON_SECRET || undefined;
  },
  get appUrl(): string {
    return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  },
  get contactEmail(): string {
    return process.env.CONTACT_EMAIL || "";
  },
  mailbox: {
    get user() {
      return process.env.MAILBOX_USER || "";
    },
    get password() {
      return process.env.MAILBOX_APP_PASSWORD || "";
    },
    get imapHost() {
      return process.env.MAILBOX_IMAP_HOST || "imap.gmail.com";
    },
    get smtpHost() {
      return process.env.MAILBOX_SMTP_HOST || "smtp.gmail.com";
    },
    get configured() {
      return Boolean(process.env.MAILBOX_USER && process.env.MAILBOX_APP_PASSWORD);
    },
  },
  get digestTo(): string {
    return process.env.DIGEST_TO || "";
  },
  get adzuna() {
    return { appId: process.env.ADZUNA_APP_ID || "", appKey: process.env.ADZUNA_APP_KEY || "" };
  },
  get joobleKey(): string {
    return process.env.JOOBLE_API_KEY || "";
  },
  get tavilyKey(): string {
    return process.env.TAVILY_API_KEY || "";
  },
};

/** Honest User-Agent for every outbound request (brief section 3, good citizenship). */
export function userAgent(): string {
  const contact = env.contactEmail ? `; contact: ${env.contactEmail}` : "";
  return `CompassJobFinder/0.1 (personal job search, low volume${contact})`;
}
