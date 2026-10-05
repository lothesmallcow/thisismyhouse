// "Collega Gmail": the token is encrypted at rest, only the job sites' alerts are asked for, a revoked
// access is noticed, and a connected Gmail's alerts reach that person only.
import fs from "node:fs";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { decryptToken, encryptToken } from "@/lib/core/token-crypt";
import { schema } from "@/lib/db";
import { readConnectedGmail } from "@/lib/pipeline/jobs";
import { ALERT_SENDERS, getMailConnection, saveMailConnection } from "@/lib/server/mail-connections";
import { alertQuery, exchangeCode, gmailAddress, GmailApiMailbox, googleAuthUrl, GoogleAccessRevoked, GoogleError, GMAIL_SCOPE, refreshAccessToken } from "@/lib/sources/mail/gmail-api";
import { signState, verifyState } from "@/lib/core/oauth-state";
import type { FetchLike } from "@/lib/sources/http";
import { freshDb, seedPeople } from "./helpers/db";

vi.mock("server-only", () => ({}));

const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json" } });
const client = { clientId: "id.example", clientSecret: "secret", redirectUri: "https://compass.example/api/google/callback" };

describe("tokens at rest", () => {
  it("encrypted, readable only with the same secret, tamper-proof", () => {
    const sealed = encryptToken("1//refresh-token", "secret-a");
    expect(sealed).not.toContain("refresh");
    expect(decryptToken(sealed, "secret-a")).toBe("1//refresh-token");
    expect(decryptToken(sealed, "secret-b")).toBeNull();
    const parts = sealed.split(".");
    parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith("AA") ? "BB" : "AA");
    expect(decryptToken(parts.join("."), "secret-a")).toBeNull();
    expect(encryptToken("x", "s")).not.toBe(encryptToken("x", "s")); // a fresh IV each time
  });
});

describe("the sign-in state (no cookie: works from any of the site's addresses)", () => {
  it("valid only for the same person, the same secret, within 15 minutes, untampered", () => {
    const now = new Date("2026-10-05T19:00:00Z");
    const st = signState(7, now, "sec");
    expect(verifyState(st, 7, new Date(now.getTime() + 60_000), "sec")).toBe(true);
    expect(verifyState(st, 8, now, "sec")).toBe(false); // someone else's sign-in
    expect(verifyState(st, 7, now, "other")).toBe(false);
    expect(verifyState(st, 7, new Date(now.getTime() + 16 * 60_000), "sec")).toBe(false);
    expect(verifyState(st.replace(/^7\./, "8."), 8, now, "sec")).toBe(false);
    expect(verifyState("", 7, now, "sec")).toBe(false);
  });
});

describe("Google's refusals say why (a short code, never tokens)", () => {
  it("wrong client, Gmail API off", async () => {
    const badClient: FetchLike = async () => json({ error: "invalid_client", error_description: "Unauthorized" }, 401);
    await expect(exchangeCode(badClient, client, "c")).rejects.toMatchObject({ code: "invalid_client" });
    const apiOff: FetchLike = async () => json({ error: { code: 403, status: "PERMISSION_DENIED", details: [{ reason: "SERVICE_DISABLED" }] } }, 403);
    const e = await gmailAddress(apiOff, "at").catch((x) => x);
    expect(e).toBeInstanceOf(GoogleError);
    expect(e.code).toBe("gmail-403:SERVICE_DISABLED");
  });
});

describe("Google sign-in and the Gmail API", () => {
  it("asks only to read, offline, with a state", () => {
    const u = new URL(googleAuthUrl(client, "st4te", "persona@example.com"));
    expect(u.searchParams.get("scope")).toBe(GMAIL_SCOPE);
    expect(u.searchParams.get("access_type")).toBe("offline");
    expect(u.searchParams.get("state")).toBe("st4te");
    expect(u.searchParams.get("redirect_uri")).toBe(client.redirectUri);
  });
  it("code → tokens; an access removed in Google is recognised", async () => {
    const ok: FetchLike = async () => json({ access_token: "at", refresh_token: "rt", scope: GMAIL_SCOPE });
    expect(await exchangeCode(ok, client, "c")).toEqual({ accessToken: "at", refreshToken: "rt", scope: GMAIL_SCOPE });
    const revoked: FetchLike = async () => json({ error: "invalid_grant" }, 400);
    await expect(refreshAccessToken(revoked, client, "rt")).rejects.toBeInstanceOf(GoogleAccessRevoked);
  });
  it("searches only the alert senders since the date, downloads only those", async () => {
    const raw = fs.readFileSync("fixtures/emails/linkedin-alert-1.eml");
    const asked: string[] = [];
    const fetchImpl: FetchLike = async (url, init) => {
      asked.push(url);
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer at");
      if (url.includes("/messages?")) return json({ messages: [{ id: "m1" }] });
      return json({ raw: raw.toString("base64url") });
    };
    const box = new GmailApiMailbox(fetchImpl, async () => "at", ALERT_SENDERS);
    const since = new Date("2026-10-01T00:00:00Z");
    const mails = await box.fetchSince(since);
    expect(mails).toHaveLength(1);
    expect(mails[0].from.address).toMatch(/linkedin\.com$/);
    const q = new URL(asked[0]).searchParams.get("q")!;
    expect(q).toBe(alertQuery(ALERT_SENDERS, since));
    expect(q).toContain("jobalerts-noreply@linkedin.com");
    expect(q).toContain(`after:${since.getTime() / 1000}`);
    expect(asked[1]).toMatch(/\/messages\/m1\?format=raw$/);
  });
});

describe("a connected Gmail", () => {
  it("its alerts are read for that person only, and the token is never stored in clear", async () => {
    const db = await freshDb();
    const now = new Date();
    const { L, M } = await seedPeople(db, now);
    await saveMailConnection(db, M, "s@example.com", "1//secret-refresh", now);
    const row = await db.query.mailConnections.findFirst({ where: eq(schema.mailConnections.userId, M) });
    expect(row!.refreshTokenEnc).not.toContain("secret-refresh");
    const r = await readConnectedGmail(db, M, now, 30); // demo: the demo inbox stands in for Gmail
    expect(r).not.toBeNull();
    expect((await getMailConnection(db, M))?.lastReadAt).toBeTruthy();
    const mine = await db.select().from(schema.jobSources).where(eq(schema.jobSources.userId, M));
    const theirs = await db.select().from(schema.jobSources).where(eq(schema.jobSources.userId, L));
    expect(mine.length).toBeGreaterThan(0);
    expect(theirs.every((s) => !mine.some((m) => m.id === s.id))).toBe(true);
  });
});
