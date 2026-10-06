// Sessions: an opaque random token in an httpOnly cookie, its HMAC stored in the DB.
// Long-lived (180 days) so people stay signed in on their phone and laptop. The admin has a
// separate cookie, and can open one person's app at a time ("Apri l'app di ...").
import "server-only";
import { and, asc, eq, gt } from "drizzle-orm";
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
  name: string;
}

/** The person whose app is being shown. `viewer` says who is looking: themselves or the admin. */
export interface AppUser extends SessionUser {
  viewer: "self" | "admin";
}

export const VIEW_AS_COOKIE = "compass_view_as";

export type SignInResult = "ok" | "wrong" | "locked" | "pending";

/** Wrong passwords before a pause, and the pause: short, enough to stop someone guessing by machine. */
export const MAX_FAILURES = 10;
export const LOCK_MINUTES = 1;
/** Wrong passwords are counted within this window. */
const WINDOW_MINUTES = 15;

export async function signIn(email: string, password: string, role: Role): Promise<SignInResult> {
  const db = getDb();
  const key = `${role}:${email.trim().toLowerCase()}`;
  const now = new Date();
  const attempt = await db.query.loginAttempts.findFirst({ where: eq(schema.loginAttempts.key, key) });
  // Locks longer than today's pause (set by older versions) no longer hold.
  if (attempt?.lockedUntil && attempt.lockedUntil > now && attempt.lockedUntil.getTime() - now.getTime() <= LOCK_MINUTES * 60000) return "locked";
  const plain = email.trim().toLowerCase();
  let user = await db.query.users.findFirst({ where: and(eq(schema.users.email, plain), eq(schema.users.role, role)) });
  // The admin whose e-mail is also a person's account lives on "name+admin@domain" (ensureAdmin).
  if (!user && role === "admin" && plain.includes("@")) {
    const [local, domain] = plain.split("@");
    user = await db.query.users.findFirst({ where: and(eq(schema.users.email, `${local}+admin@${domain}`), eq(schema.users.role, "admin")) });
  }
  const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;
  // A request not yet approved: say so, but only to whoever knows the password.
  if (user && passwordOk && !user.active && user.pendingSince) return "pending";
  if (!user || !user.active || !passwordOk) {
    // A new count when the window is over, after a pause, or over an older, longer lock.
    const fresh =
      !attempt ||
      now.getTime() - attempt.firstAt.getTime() > WINDOW_MINUTES * 60000 ||
      (attempt.lockedUntil != null && (attempt.lockedUntil <= now || attempt.lockedUntil.getTime() - now.getTime() > LOCK_MINUTES * 60000));
    const failures = fresh ? 1 : attempt.failures + 1;
    const row = { key, failures, firstAt: fresh ? now : attempt.firstAt, lockedUntil: failures >= MAX_FAILURES ? new Date(now.getTime() + LOCK_MINUTES * 60000) : null };
    await db.insert(schema.loginAttempts).values(row).onConflictDoUpdate({ target: schema.loginAttempts.key, set: row });
    return failures >= MAX_FAILURES ? "locked" : "wrong";
  }
  await db.delete(schema.loginAttempts).where(eq(schema.loginAttempts.key, key));
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.insert(schema.sessions).values({ id: tokenId(token), userId: user.id, expiresAt });
  await db.update(schema.users).set({ lastLoginAt: now }).where(eq(schema.users.id, user.id));
  const jar = await cookies();
  jar.set(role === "admin" ? `${SESSION_COOKIE}_admin` : SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return "ok";
}

async function userFromCookie(name: string): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(name)?.value;
  if (!token) return null;
  const db = getDb();
  const row = await db
    .select({ id: schema.users.id, role: schema.users.role, email: schema.users.email, name: schema.users.name })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, tokenId(token)), gt(schema.sessions.expiresAt, new Date()), eq(schema.users.active, true)))
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

/**
 * The app pages. A signed-in person sees their own data; the admin sees the person chosen with
 * "Apri l'app di ..." (or the first one). Every query below this uses the returned id.
 */
export async function requireUser(): Promise<AppUser> {
  const u = await currentUser();
  if (u?.role === "user") return { ...u, viewer: "self" };
  const admin = await currentAdmin();
  if (!admin) redirect("/entra");
  const db = getDb();
  const jar = await cookies();
  const wanted = Number(jar.get(VIEW_AS_COOKIE)?.value);
  const people = await db
    .select({ id: schema.users.id, role: schema.users.role, email: schema.users.email, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.role, "user"))
    .orderBy(asc(schema.users.id));
  const person = people.find((p) => p.id === wanted) ?? people[0];
  if (!person) redirect("/admin/utenti?msg=nessun-utente");
  return { ...person, viewer: "admin" };
}

/** Admin only: choose whose app "Apri l'app" shows. */
export async function setViewAs(userId: number): Promise<void> {
  const jar = await cookies();
  jar.set(VIEW_AS_COOKIE, String(userId), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
}

/** Sign in right after creating an account. */
export async function startSession(userId: number): Promise<void> {
  const db = getDb();
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.insert(schema.sessions).values({ id: tokenId(token), userId, expiresAt });
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, userId));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
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
