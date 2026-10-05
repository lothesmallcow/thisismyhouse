// The "state" of a sign-in with Google: signed (HMAC) and bound to the person and the time, so the
// answer can only complete the connection that person started, in the last 15 minutes. No cookie:
// it works whichever of the site's addresses the person used.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const MAX_AGE_MS = 15 * 60_000;
const mac = (body: string, secret: string) => createHmac("sha256", secret).update(`oauth-state:${body}`).digest("base64url");

export function signState(userId: number, now: Date, secret: string): string {
  const body = `${userId}.${now.getTime()}.${randomBytes(9).toString("base64url")}`;
  return `${body}.${mac(body, secret)}`;
}

export function verifyState(state: string, userId: number, now: Date, secret: string): boolean {
  const parts = state.split(".");
  if (parts.length !== 4) return false;
  const body = parts.slice(0, 3).join(".");
  const want = Buffer.from(mac(body, secret));
  const got = Buffer.from(parts[3]);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return false;
  const at = Number(parts[1]);
  return Number(parts[0]) === userId && Number.isFinite(at) && now.getTime() - at >= -60_000 && now.getTime() - at <= MAX_AGE_MS;
}
