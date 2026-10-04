// Migration 0003 turns the single-person database into a multi-account one without losing data:
// her ranking/actions move to user_jobs, her rows get her account id, her private sources stay hers.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { describe, expect, it } from "vitest";
import { createDb } from "@/lib/db";

function legacyFolder(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "compass-mig-"));
  fs.mkdirSync(path.join(dir, "meta"));
  const journal = JSON.parse(fs.readFileSync("drizzle/meta/_journal.json", "utf8"));
  journal.entries = journal.entries.slice(0, 3);
  fs.writeFileSync(path.join(dir, "meta/_journal.json"), JSON.stringify(journal));
  for (const e of journal.entries) fs.copyFileSync(`drizzle/${e.tag}.sql`, path.join(dir, `${e.tag}.sql`));
  return dir;
}

describe("migration 0003 (accounts)", () => {
  it("keeps her data and assigns it to her account", async () => {
    const { db, client } = createDb(":memory:");
    await migrate(db, { migrationsFolder: legacyFolder() });
    const now = Date.now();
    await client.executeMultiple(`
      INSERT INTO users (id, role, email, password_hash) VALUES (1, 'admin', 'a@example.com', 'x'), (2, 'user', 'lei@example.com', 'y');
      INSERT INTO profile (id, name) VALUES (1, 'Lucia');
      INSERT INTO jobs (id, dedupe_key, title, first_seen_at, updated_at, score, level, status, distance_km, reasons) VALUES
        (10, 'k1', 'Impiegata', ${now}, ${now}, 60, 'molto', 'dismissed', 4.5, '["Vicina"]'),
        (11, 'k2', 'Segretaria', ${now}, ${now}, 20, 'adatta', 'new', NULL, '[]');
      INSERT INTO job_sources (job_id, source, seen_at) VALUES (10, 'email:linkedin', ${now}), (11, 'api:adzuna', ${now});
      INSERT INTO applications (id, job_id, lane, status) VALUES (5, 10, 'email', 'sent');
      INSERT INTO cvs (label, role_family, filename, size, data) VALUES ('CV', 'Generale', 'cv.pdf', 3, x'255044');
      INSERT INTO notifications (audience, text) VALUES ('user', 'ciao'), ('admin', 'fonte');
      INSERT INTO settings (key, value) VALUES ('guardrails', '{"dailyCap":10,"killSwitch":true,"autopilot":false,"goLiveAt":null}'), ('lastDigestDay', '"2026-10-03"');
    `);
    await migrate(db, { migrationsFolder: "drizzle" });

    const rows = async (sql: string) => (await client.execute(sql)).rows;
    expect(await rows("SELECT user_id, job_id, score, level, status, distance_km FROM user_jobs ORDER BY job_id")).toEqual([
      expect.objectContaining({ user_id: 2, job_id: 10, score: 60, level: "molto", status: "dismissed", distance_km: 4.5 }),
      expect.objectContaining({ user_id: 2, job_id: 11, score: 20, level: "adatta", status: "new" }),
    ]);
    expect((await rows("SELECT count(*) n FROM job_sources"))[0].n).toBe(2);
    expect(await rows("SELECT source, user_id FROM job_sources ORDER BY job_id")).toEqual([
      expect.objectContaining({ source: "email:linkedin", user_id: 2 }),
      expect.objectContaining({ source: "api:adzuna", user_id: null }),
    ]);
    expect((await rows("SELECT user_id FROM profile"))[0].user_id).toBe(2);
    expect((await rows("SELECT user_id FROM applications"))[0].user_id).toBe(2);
    expect((await rows("SELECT user_id FROM cvs"))[0].user_id).toBe(2);
    expect(await rows("SELECT audience, user_id FROM notifications ORDER BY id")).toEqual([
      expect.objectContaining({ audience: "user", user_id: 2 }),
      expect.objectContaining({ audience: "admin", user_id: null }),
    ]);
    expect((await rows("SELECT mailbox_key FROM users WHERE id = 2"))[0].mailbox_key).toBe("default");
    const us = JSON.parse(String((await rows("SELECT value FROM settings WHERE key = 'user:2'"))[0].value));
    expect(us).toEqual({ killSwitch: true, autopilot: false, goLiveAt: null, lastDigestDay: "2026-10-03" });
    client.close();
  });
});
