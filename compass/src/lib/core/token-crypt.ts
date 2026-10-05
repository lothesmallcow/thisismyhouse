// Encryption at rest for the tokens people grant Compass (Google refresh tokens): AES-256-GCM with a
// key derived from SESSION_SECRET, so a copy of the database alone reveals nothing. Changing
// SESSION_SECRET makes stored tokens unreadable: people then simply connect again.
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const key = (secret: string) => Buffer.from(hkdfSync("sha256", secret, "compass-token-salt", "compass-mail-token-v1", 32));

export function encryptToken(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(secret), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

/** Null when the token was encrypted with another secret or was tampered with. */
export function decryptToken(sealed: string, secret: string): string | null {
  const [v, iv, tag, body] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !body) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", key(secret), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(body, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
