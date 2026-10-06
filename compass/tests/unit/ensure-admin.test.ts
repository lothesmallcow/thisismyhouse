// The admin account comes from the host's secrets at every deploy, even when its e-mail is also a
// person's account.
import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { adminAlias, createAccount as createUser, ensureAdmin } from "@/lib/server/accounts";
import { verifyPassword } from "@/lib/server/passwords";
import { schema } from "@/lib/db";
import { freshDb } from "./helpers/db";

vi.mock("server-only", () => ({}));

describe("ensureAdmin", () => {
  it("creates it, then gives it the password of the secrets and re-enables it", async () => {
    const db = await freshDb();
    expect(await ensureAdmin(db, "Boss@Example.com", "first-password-long")).toBe("created");
    await db.update(schema.users).set({ active: false }).where(eq(schema.users.email, "boss@example.com"));
    expect(await ensureAdmin(db, "boss@example.com", "second-password-long")).toBe("updated");
    const a = (await db.query.users.findFirst({ where: eq(schema.users.email, "boss@example.com") }))!;
    expect(a.role).toBe("admin");
    expect(a.active).toBe(true);
    expect(await verifyPassword("second-password-long", a.passwordHash)).toBe(true);
  });
  it("an e-mail that is a person's account: the admin lives on its +admin alias, the person is untouched", async () => {
    const db = await freshDb();
    await createUser(db, { email: "me@example.com", password: "person-password-1", name: "Me", track: "lavoro" });
    expect(await ensureAdmin(db, "me@example.com", "admin-password-long")).toBe("alias");
    expect(adminAlias("me@example.com")).toBe("me+admin@example.com");
    const person = (await db.query.users.findFirst({ where: eq(schema.users.email, "me@example.com") }))!;
    expect(person.role).toBe("user");
    const admin = (await db.query.users.findFirst({ where: eq(schema.users.email, "me+admin@example.com") }))!;
    expect(admin.role).toBe("admin");
  });
});
