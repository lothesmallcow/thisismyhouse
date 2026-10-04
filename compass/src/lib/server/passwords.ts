// Password hashing with Node's built-in scrypt (no extra dependency).
import { randomBytes, scrypt as _scrypt, timingSafeEqual, createHmac } from "node:crypto";
import { promisify } from "node:util";
import { env } from "../env";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltHex, keyHex] = stored.split("$");
  if (algo !== "scrypt" || !saltHex || !keyHex) return false;
  const key = await scrypt(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(keyHex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Session ids in the DB are an HMAC of the cookie token, so a DB leak can't be replayed. */
export function tokenId(token: string): string {
  return createHmac("sha256", env.sessionSecret).update(token).digest("hex");
}
