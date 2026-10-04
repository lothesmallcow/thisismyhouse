// Sessions: an opaque random token in an httpOnly cookie, its HMAC stored in the DB.
// Long-lived (180 days) so she stays signed in on her phone and laptop.
import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, schema } from "../db";
import { newToken, tokenId, verifyPassword } from "./passwords";

export const SESSION_COOKIE = "compass_session";
export const SESSION_DAYS = 180;

export type Role = "user" | "admin";
export interface SessionUser {
  id: number;
  role: Role;
  email: string;
}

export async function signIn(email: string, password: string, role: Role): Promise<boolean> {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: and(eq(schema.users.email, email.trim().toLowerCase()), eq(schema.users.role, role)),
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return false;
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.insert(schema.sessions).values({ id: tokenId(token), userId: user.id, expiresAt });
  const jar = await cookies();
  jar.set(role === "admin" ? `${SESSION_COOKIE}_admin` : SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return true;
}

async function userFromCookie(name: string): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(name)?.value;
  if (!token) return null;
  const db = getDb();
  const row = await db
    .select({ id: schema.users.id, role: schema.users.role, email: schema.users.email })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, tokenId(token)), gt(schema.sessions.expiresAt, new Date())))
    .get();
  return row ?? null;
}

export async function currentUser(): Promise<SessionUser | null> {
  return userFromCookie(SESSION_COOKIE);
}

export async function currentAdmin(): Promise<SessionUser | null> {
  const a = await userFromCookie(`${SESSION_COOKIE}_admin`);
  return a?.role === "admin" ? a : null;
}

/** Her pages. The admin may also look at them. */
export async function requireUser(): Promise<SessionUser> {
  const u = (await currentUser()) ?? (await currentAdmin());
  if (!u) redirect("/entra");
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const a = await currentAdmin();
  if (!a) redirect("/admin/entra");
  return a;
}

export async function signOut(role: Role): Promise<void> {
  const jar = await cookies();
  const name = role === "admin" ? `${SESSION_COOKIE}_admin` : SESSION_COOKIE;
  const token = jar.get(name)?.value;
  if (token) await getDb().delete(schema.sessions).where(eq(schema.sessions.id, tokenId(token)));
  jar.delete(name);
}
