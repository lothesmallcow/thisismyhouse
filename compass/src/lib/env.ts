// Typed access to configuration. Safe defaults: demo mode is ON unless explicitly "false".

export interface MailboxConfig {
  key: string; // "default" or the lower-case <KEY> of MAILBOX_<KEY>_USER
  user: string;
  password: string;
  imapHost: string;
  smtpHost: string;
}

/** The mailbox with this key, if its two variables are set. */
export function mailboxConfig(key: string | null | undefined): MailboxConfig | null {
  if (!key) return null;
  return env.mailboxes.find((m) => m.key === key.toLowerCase()) ?? null;
}

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
    const s = process.env.SESSION_SECRET;
    if (!s && !env.demoMode) throw new Error("SESSION_SECRET is required when DEMO_MODE=false");
    return s || "dev-only-insecure-secret";
  },
  /** "Collega Gmail" (Google sign-in, read-only): an OAuth client of a Google Cloud project, see docs/setup.md. */
  get google(): { clientId: string; clientSecret: string } {
    // Trimmed: a space or a new line pasted with the value is the most common reason Google refuses it.
    return { clientId: (process.env.GOOGLE_CLIENT_ID || "").trim(), clientSecret: (process.env.GOOGLE_CLIENT_SECRET || "").trim() };
  },
  get cronSecret(): string | undefined {
    return process.env.CRON_SECRET || undefined;
  },
  get appUrl(): string {
    return (process.env.APP_URL || "http://localhost:3000").trim().replace(/\/+$/, "");
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
  /** Every configured mailbox: MAILBOX_USER/MAILBOX_APP_PASSWORD is "default", MAILBOX_<KEY>_USER/_APP_PASSWORD adds more. */
  get mailboxes(): MailboxConfig[] {
    const out: MailboxConfig[] = [];
    const host = { imapHost: process.env.MAILBOX_IMAP_HOST || "imap.gmail.com", smtpHost: process.env.MAILBOX_SMTP_HOST || "smtp.gmail.com" };
    if (process.env.MAILBOX_USER && process.env.MAILBOX_APP_PASSWORD) {
      out.push({ key: "default", user: process.env.MAILBOX_USER, password: process.env.MAILBOX_APP_PASSWORD, ...host });
    }
    for (const [k, v] of Object.entries(process.env)) {
      const m = k.match(/^MAILBOX_([A-Z0-9]+)_USER$/);
      if (!m || !v) continue;
      const password = process.env[`MAILBOX_${m[1]}_APP_PASSWORD`];
      if (password) out.push({ key: m[1].toLowerCase(), user: v, password, ...host });
    }
    return out;
  },
  get adminAlertEmail(): string {
    return process.env.ADMIN_ALERT_EMAIL || "";
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
