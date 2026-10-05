// "Collega Gmail": each person's own Gmail, connected with Google sign-in (read-only). Compass reads
// the job sites' alerts in it directly: no forwarding, no codes, no filters. The refresh token is
// stored encrypted; "Scollega" gives the access back to Google and deletes it.
import { and, eq } from "drizzle-orm";
import { decryptToken, encryptToken } from "../core/token-crypt";
import { PLATFORMS } from "../core/platforms";
import type { DB } from "../db";
import { schema } from "../db";
import { env } from "../env";
import type { FetchLike } from "../sources/http";
import { DemoMailbox } from "../sources/mail/demo";
import { GmailApiMailbox, GoogleAccessRevoked, refreshAccessToken, revokeGoogleToken, type GoogleClient } from "../sources/mail/gmail-api";
import type { Mailbox } from "../sources/mail/types";

/** Every job site's alert senders: the only e-mails Compass asks Gmail for. */
export const ALERT_SENDERS = [...new Set(PLATFORMS.flatMap((p) => p.senders))];

export const googleRedirectUri = () => `${env.appUrl}/api/google/callback`;
export const googleClient = (): GoogleClient | null => (env.google.clientId && env.google.clientSecret ? { ...env.google, redirectUri: googleRedirectUri() } : null);
/** "Collega Gmail" is offered when the OAuth client is set (always in demo, where it is simulated). */
export const gmailConnectAvailable = () => env.demoMode || googleClient() != null;

export interface MailConnection {
  email: string;
  connectedAt: Date;
  lastReadAt: Date | null;
  lastError: string | null;
}

export async function getMailConnection(db: DB, userId: number): Promise<MailConnection | null> {
  const r = await db.query.mailConnections.findFirst({ where: eq(schema.mailConnections.userId, userId) });
  return r ? { email: r.email, connectedAt: r.connectedAt, lastReadAt: r.lastReadAt ?? null, lastError: r.lastError ?? null } : null;
}

export async function saveMailConnection(db: DB, userId: number, email: string, refreshToken: string, now: Date): Promise<void> {
  const v = { email, refreshTokenEnc: encryptToken(refreshToken, env.sessionSecret), connectedAt: now, lastError: null, lastReadAt: null };
  await db.insert(schema.mailConnections).values({ userId, provider: "gmail", ...v }).onConflictDoUpdate({ target: schema.mailConnections.userId, set: v });
}

export async function deleteMailConnection(db: DB, userId: number, fetchImpl: FetchLike): Promise<void> {
  const r = await db.query.mailConnections.findFirst({ where: eq(schema.mailConnections.userId, userId) });
  if (!r) return;
  const token = decryptToken(r.refreshTokenEnc, env.sessionSecret);
  if (token && !env.demoMode) await revokeGoogleToken(fetchImpl, token);
  await db.delete(schema.mailConnections).where(eq(schema.mailConnections.userId, userId));
}

/** The connected Gmail of one person as a Mailbox (demo: the demo inbox). Null when it cannot be read. */
export async function connectionMailbox(db: DB, userId: number, fetchImpl: FetchLike): Promise<Mailbox | null> {
  const r = await db.query.mailConnections.findFirst({ where: eq(schema.mailConnections.userId, userId) });
  if (!r || r.lastError === "revoked") return null;
  if (env.demoMode) {
    const u = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
    return new DemoMailbox(db, u?.mailboxKey ?? "default");
  }
  const client = googleClient();
  const refresh = decryptToken(r.refreshTokenEnc, env.sessionSecret);
  if (!client || !refresh) return null;
  return new GmailApiMailbox(fetchImpl, async () => {
    try {
      return await refreshAccessToken(fetchImpl, client, refresh);
    } catch (e) {
      // Access removed in Google: stop trying, Collega le fonti asks to connect again.
      if (e instanceof GoogleAccessRevoked) await db.update(schema.mailConnections).set({ lastError: "revoked" }).where(eq(schema.mailConnections.userId, userId));
      throw e;
    }
  }, ALERT_SENDERS);
}

/** After a read: when it happened, and why it failed (if it did). */
export async function markMailRead(db: DB, userId: number, now: Date, error: unknown = null): Promise<void> {
  const lastError = error == null ? null : error instanceof GoogleAccessRevoked ? "revoked" : "error";
  await db.update(schema.mailConnections).set(error == null ? { lastReadAt: now, lastError } : { lastError }).where(eq(schema.mailConnections.userId, userId));
}

/** The active people with a connected Gmail (the daily runs read each one). */
export async function connectedPeople(db: DB): Promise<number[]> {
  const rows = await db
    .select({ id: schema.mailConnections.userId })
    .from(schema.mailConnections)
    .innerJoin(schema.users, eq(schema.users.id, schema.mailConnections.userId))
    .where(and(eq(schema.users.active, true), eq(schema.users.role, "user")));
  return rows.map((r) => r.id);
}
