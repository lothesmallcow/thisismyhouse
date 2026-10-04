// The "luxury retail in Milan" persona: a store manager in high fashion, open to watches, who wants
// a weighted score out of 100, the requirements of each listing against her CV, role sheets with pay
// by employer size in her area, companies to write to, folders, and a discreet search.
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { computeFit, DEFAULT_WEIGHTS, parseWeights } from "@/lib/core/fit";
import { checkRequirements, extractRequirements, workYears } from "@/lib/core/requirements";
import { findPlace } from "@/lib/core/geo";
import { scaledPay, sheetFor } from "@/lib/catalog/role-sheets";
import { schema, type DB } from "@/lib/db";
import { seedAccounts, seedDemo } from "@/lib/seed";
import { outreachTargets } from "@/lib/server/career";
import { addToFolder, createFolder, deleteFolder, folderJobs, listFolders, renameFolder } from "@/lib/server/folders";
import { listJobs, rerankUser } from "@/lib/server/jobs";
import { background } from "@/lib/server/person";
import { getProfile, updateProfile } from "@/lib/server/profile";
import { deleteAllMyData } from "@/lib/server/privacy";
import { freshDb } from "./helpers/db";

vi.mock("server-only", () => ({}));

describe("requirements in a listing, against the CV", () => {
  const cv = "store manager 2019 - oggi gestione del team di 12 persone, budget di vendita e kpi, clienteling, vendita nel lusso, boutique, laurea triennale in economia";
  it("reads years, degree and skills, and says what is missing", () => {
    const req = extractRequirements("Boutique Manager orologeria", "Richiesta esperienza nel settore orologi, gestione del team, clienteling. Almeno 6 anni di esperienza nel lusso. Laurea gradita.");
    expect(req.years).toBe(6);
    expect(req.degree).toBe(false); // "laurea gradita" is a plus, not a requirement
    expect(req.skills).toEqual(expect.arrayContaining(["Gestione di un team", "Clienteling e portafoglio clienti", "Vendita nel lusso", "Orologeria"]));
    const either = extractRequirements("Boutique manager", "Esperienza nel settore orologi o gioielli.");
    expect(either.skills).toContain("Orologeria o gioielleria"); // either one is enough
    expect(either.skills).not.toContain("Orologeria");
    const checks = checkRequirements(req, { years: 11, hasDegree: true, studying: false, text: cv });
    expect(checks.find((c) => c.label === "6 anni di esperienza")?.have).toBe("si");
    const watches = checks.find((c) => c.label === "Orologeria")!;
    expect(watches.have).toBe("no");
    expect(watches.note).toMatch(/vendita nel lusso.*spesso pres/); // a realistic tip for a career change
  });
  it("years of work from a timeline, overlaps counted once", () => {
    const now = new Date("2026-10-01");
    expect(workYears([{ kind: "lavoro", startYear: 2014, endYear: 2019, current: false }, { kind: "lavoro", startYear: 2019, endYear: null, current: true }, { kind: "studio", startYear: 2010, endYear: 2013, current: false }], now)).toBe(13); // Jan 2014 - Oct 2026
    expect(workYears([], now)).toBeNull();
  });
});

describe("fit score out of 100", () => {
  it("weighted parts, 50 when unknown, and their own weights change the order", () => {
    const f = [{ key: "role", points: 40, reason: "" }, { key: "distance", points: 20, reason: "" }];
    const def = computeFit(f, null);
    expect(def.parts.paga).toBe(50);
    expect(def.parts.ruolo).toBe(100);
    const placeFirst = computeFit(f, parseWeights({ ...DEFAULT_WEIGHTS, luogo: 50, ruolo: 0 }));
    expect(placeFirst.fit).toBeGreaterThan(computeFit([{ key: "role", points: 40, reason: "" }, { key: "distance", points: -25, reason: "" }], parseWeights({ ...DEFAULT_WEIGHTS, luogo: 50, ruolo: 0 })).fit);
  });
  it("hard limits hold whatever the weights", () => {
    const scam = [{ key: "role", points: 40, reason: "" }, { key: "scam", points: -40, reason: "" }];
    expect(computeFit(scam, parseWeights({ ruolo: 50 })).fit).toBeLessThanOrEqual(20);
    const otherJob = [{ key: "role", points: -10, reason: "" }, { key: "distance", points: 20, reason: "" }, { key: "salary", points: 10, reason: "" }];
    expect(computeFit(otherJob, null).fit).toBeLessThanOrEqual(48);
  });
});

describe("role sheets", () => {
  it("a listing title finds its sheet, the specific one first", () => {
    expect(sheetFor("Store Manager boutique alta moda")?.id).toBe("store-manager-lusso");
    expect(sheetFor("Watch Sales Associate")?.id).toBe("watch-specialist");
    expect(sheetFor("Boutique Manager orologeria")?.id).toBe("boutique-manager-gioielli");
    expect(sheetFor("Spring Insight Week")?.id).toBe("spring-week");
  });
  it("pay by employer size, adjusted to the place (and in pounds in London)", () => {
    const s = sheetFor("Store Manager")!;
    const milano = scaledPay(s, findPlace("Milano"));
    const bari = scaledPay(s, findPlace("Bari"));
    const london = scaledPay(s, findPlace("London"));
    expect(milano.top[0]).toBeGreaterThan(milano.mid[0]);
    expect(milano.mid[0]).toBeGreaterThan(milano.small[0]);
    expect(bari.top[1]).toBeLessThan(milano.top[1]);
    expect(london.currency).toBe("£");
    const ib = sheetFor("Analyst M&A")!;
    expect(scaledPay(ib, findPlace("London")).top[0]).toBeGreaterThan(scaledPay(ib, findPlace("Milano")).top[0]); // the finance premium
  });
});

describe("the persona, end to end in the database", () => {
  let db: DB;
  let C: number;
  let L: number;
  const NOW = new Date("2026-10-05T07:00:00Z");
  beforeAll(async () => {
    db = await freshDb();
    const ids = await seedAccounts(db, {
      admin: { email: "admin@example.com", password: "admin-compass" },
      people: [
        { email: "l@example.com", password: "demo-compass", name: "L", track: "lavoro" },
        { email: "m@example.com", password: "demo-compass", name: "M", track: "stage" },
        { email: "c@example.com", password: "demo-compass", name: "C", track: "lavoro" },
      ],
    });
    [L, , C] = ids;
    await seedDemo(db, NOW, { onboarded: true, userId: ids[0], studentId: ids[1], fashionId: ids[2] });
  }, 60_000);

  it("her best matches are luxury retail leadership in Milan; region before other regions; the current employer last", async () => {
    const { jobs } = await listJobs(db, C, {}, 50, NOW);
    expect(jobs[0].title).toBe("Store Manager boutique alta moda");
    expect(jobs.slice(0, 5).every((j) => j.level === "molto")).toBe(true);
    const brescia = jobs.findIndex((j) => j.city === "Brescia");
    const torino = jobs.findIndex((j) => j.title === "Store Manager" && j.city === "Torino");
    expect(brescia).toBeLessThan(torino); // in her region, before another region
    const current = jobs.find((j) => j.company === "Maison Esempio Moda")!;
    expect(current.fit).toBeLessThanOrEqual(10);
    expect(current.reasons[0]).toMatch(/azienda attuale/);
    const unrelated = jobs.find((j) => j.title === "Senior Financial Controller")!;
    expect(unrelated.level).toBe("poco");
  });

  it("the watch boutique: a real fit, with the one gap named", async () => {
    const { jobs } = await listJobs(db, C, { q: "orologeria" }, 5, NOW);
    const req = extractRequirements(jobs[0].title, jobs[0].description);
    const checks = checkRequirements(req, (await background(db, C, await getProfile(db, C))).person);
    expect(checks.filter((c) => c.have === "no").map((c) => c.label)).toEqual(["Orologeria o gioielleria"]);
  });

  it("her own weights: making place count more and role less changes the score", async () => {
    const before = (await listJobs(db, C, { q: "Torino" }, 5, NOW)).jobs.find((j) => j.city === "Torino")!.fit;
    await updateProfile(db, C, { fitWeights: parseWeights({ ...DEFAULT_WEIGHTS, luogo: 50 }) });
    await rerankUser(db, C, NOW);
    const after = (await listJobs(db, C, { q: "Torino" }, 5, NOW)).jobs.find((j) => j.city === "Torino")!.fit;
    expect(after).toBeLessThan(before);
    await updateProfile(db, C, { fitWeights: null });
    await rerankUser(db, C, NOW);
  });

  it("companies to write to: her field and nearby fields, never the current employer", async () => {
    const t = await outreachTargets(db, C, 10);
    expect(t.inField.length).toBeGreaterThan(3);
    expect(t.shift.some((x) => ["nautica", "ospitalita-lusso"].some(() => /lusso/.test(x.why)))).toBe(true);
    const all = [...t.inField, ...t.shift].map((x) => x.company.name);
    expect(all).not.toContain("Maison Esempio Moda");
    expect(new Set(all).size).toBe(all.length);
  });

  it("folders: starter ones with demo offers, rename, create, delete; nobody else's", async () => {
    const folders = await listFolders(db, C);
    expect(folders.map((f) => f.name)).toEqual(["Candidarsi presto", "Da tenere d'occhio", "Per cambiare settore"]);
    expect(folders[0].count).toBe(2);
    expect(await renameFolder(db, C, folders[2].id, "Orologi e gioielli")).toBe(true);
    const id = (await createFolder(db, C, "Colloqui"))!;
    const { jobs } = await listJobs(db, C, {}, 1, NOW);
    expect(await addToFolder(db, C, id, jobs[0].id)).toBe(true);
    expect((await folderJobs(db, C, id))!.jobs[0].id).toBe(jobs[0].id);
    expect(await addToFolder(db, L, id, jobs[0].id)).toBe(false); // not her folder
    expect(await folderJobs(db, L, id)).toBeNull();
    expect(await deleteFolder(db, L, id)).toBe(false);
    expect(await deleteFolder(db, C, id)).toBe(true);
    expect((await listFolders(db, C)).map((f) => f.name)).toContain("Orologi e gioielli"); // starters are not re-created
  });

  it("delete-all removes her folders too", async () => {
    await deleteAllMyData(db, C);
    expect(await db.select().from(schema.folders).where(eq(schema.folders.userId, C))).toHaveLength(0);
    expect(await db.select().from(schema.folderItems).where(and(eq(schema.folderItems.userId, C)))).toHaveLength(0);
  });
});
