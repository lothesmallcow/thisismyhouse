// "Collega Gmail": the person's own Gmail, read through the Gmail API with Google sign-in and the
// read-only scope. Only the job sites' alert e-mails are ever requested (a server-side search on
// their senders), so the rest of the mailbox is never downloaded. Nothing is changed or deleted.
import type { FetchLike } from "../http";
import { parseRawEmail } from "./parse";
import type { InboundEmail, Mailbox } from "./types";

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const API = "https://gmail.googleapis.com/gmail/v1/users/me";

/** Access was removed in Google (or expired): the person has to connect again. */
export class GoogleAccessRevoked extends Error {
  constructor() {
    super("google-access-revoked");
  }
}

/**
 * A refusal from Google, with only its short code ("invalid_client", "redirect_uri_mismatch",
 * "gmail-403:accessNotConfigured"...): safe to show and log, never the body (it may carry tokens).
 */
export class GoogleError extends Error {
  constructor(public code: string) {
    super(`google:${code}`);
  }
}
const safeCode = (v: unknown) => (typeof v === "string" ? v.replace(/[^A-Za-z0-9_.:-]/g, "").slice(0, 60) : "");

export interface GoogleClient {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function googleAuthUrl(c: Pick<GoogleClient, "clientId" | "redirectUri">, state: string, loginHint?: string): string {
  const q = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: c.redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline", // a refresh token, to read the alerts every day
    prompt: "consent", // always return the refresh token, also when connecting again
    state,
    ...(loginHint ? { login_hint: loginHint } : {}),
  });
  return `${AUTH}?${q}`;
}

async function tokenCall(fetchImpl: FetchLike, body: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetchImpl(TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body).toString() });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (data.error === "invalid_grant") throw new GoogleAccessRevoked();
  if (!res.ok) throw new GoogleError(safeCode(data.error) || `token-${res.status}`);
  return data;
}

export async function exchangeCode(fetchImpl: FetchLike, c: GoogleClient, code: string): Promise<{ accessToken: string; refreshToken: string | null; scope: string }> {
  const d = await tokenCall(fetchImpl, { code, client_id: c.clientId, client_secret: c.clientSecret, redirect_uri: c.redirectUri, grant_type: "authorization_code" });
  return { accessToken: String(d.access_token ?? ""), refreshToken: typeof d.refresh_token === "string" ? d.refresh_token : null, scope: String(d.scope ?? "") };
}

export async function refreshAccessToken(fetchImpl: FetchLike, c: Pick<GoogleClient, "clientId" | "clientSecret">, refreshToken: string): Promise<string> {
  const d = await tokenCall(fetchImpl, { refresh_token: refreshToken, client_id: c.clientId, client_secret: c.clientSecret, grant_type: "refresh_token" });
  return String(d.access_token ?? "");
}

/** Gives the access back (Scollega): best effort, the stored token is deleted anyway. */
export async function revokeGoogleToken(fetchImpl: FetchLike, token: string): Promise<void> {
  await fetchImpl("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }).toString() }).catch(() => undefined);
}

async function api<T>(fetchImpl: FetchLike, token: string, path: string): Promise<T> {
  const res = await fetchImpl(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new GoogleAccessRevoked();
  if (!res.ok) {
    // e.g. 403 "accessNotConfigured" / "SERVICE_DISABLED": the Gmail API is off in the Google project.
    const e = ((await res.json().catch(() => ({}))) as { error?: { status?: string; errors?: { reason?: string }[]; details?: { reason?: string }[] } }).error;
    throw new GoogleError(`gmail-${res.status}:${safeCode(e?.details?.[0]?.reason ?? e?.errors?.[0]?.reason ?? e?.status)}`);
  }
  return (await res.json()) as T;
}

export async function gmailAddress(fetchImpl: FetchLike, token: string): Promise<string> {
  return (await api<{ emailAddress: string }>(fetchImpl, token, "/profile")).emailAddress;
}

/** The Gmail search for these senders' e-mails since a date ("from:(a OR b) after:1700000000"). */
export function alertQuery(senders: string[], since: Date): string {
  return `from:(${senders.join(" OR ")}) after:${Math.floor(since.getTime() / 1000)}`;
}

export class GmailApiMailbox implements Mailbox {
  constructor(
    private fetchImpl: FetchLike,
    private accessToken: () => Promise<string>,
    private senders: string[],
    private max = 200,
  ) {}

  async fetchSince(since: Date): Promise<InboundEmail[]> {
    const token = await this.accessToken();
    const ids: string[] = [];
    let page: string | undefined;
    do {
      const q = new URLSearchParams({ q: alertQuery(this.senders, since), maxResults: "100", ...(page ? { pageToken: page } : {}) });
      const r = await api<{ messages?: { id: string }[]; nextPageToken?: string }>(this.fetchImpl, token, `/messages?${q}`);
      ids.push(...(r.messages ?? []).map((m) => m.id));
      page = r.nextPageToken;
    } while (page && ids.length < this.max);
    const out: InboundEmail[] = [];
    // A few at a time: well within Gmail's per-user quota.
    for (let i = 0; i < Math.min(ids.length, this.max); i += 8) {
      const batch = await Promise.all(
        ids.slice(i, i + 8).map((id) => api<{ raw?: string }>(this.fetchImpl, token, `/messages/${id}?format=raw`).catch((e) => (e instanceof GoogleAccessRevoked ? Promise.reject(e) : { raw: undefined }))),
      );
      for (const m of batch) if (m.raw) out.push(await parseRawEmail(Buffer.from(m.raw, "base64url")));
    }
    return out;
  }
}
