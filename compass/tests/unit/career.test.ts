// Career intelligence: experience timeline (CV, LinkedIn export), themes across sectors,
// suggestions, career paths, fit warnings, and brands that live in more than one sector.
import { eq } from "drizzle-orm";
import { strToU8, zipSync } from "fflate";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatPeriod, parseCsv, parseCvTimeline, parseLinkedInEducation, parseLinkedInPositions } from "@/lib/core/timeline";
import { schema, type DB } from "@/lib/db";
import { createAccount } from "@/lib/server/accounts";
import { careerPaths, companyThemes, fitWarnings, interestProfile, studentAdvice, suggestCompanies } from "@/lib/server/career";
import { ensureCatalog, listCompanies, listSectors, setPref, slugify } from "@/lib/server/catalog";
import { importFromCvText, importFromLinkedIn, listExperiences, pdfText, saveExperiences } from "@/lib/server/experiences";
import { listJobs, upsertRawJob } from "@/lib/server/jobs";
import { updateProfile } from "@/lib/server/profile";
import { textPdf } from "@/lib/seed/pdf";
import { freshDb, seedPeople } from "./helpers/db";

vi.mock("server-only", () => ({}));
const NOW = new Date("2026-10-05T07:00:00Z");

describe("timeline parsing", () => {
  it("reads dated lines, sections, bullets, months and 'oggi' from a CV", () => {
    const t = parseCvTimeline(
      [
        "Anna Esempio",
        "ESPERIENZE PROFESSIONALI",
        "mar 2019 – oggi Sales Associate presso Kiton, Milano",
        "- Clientela internazionale, vendita su appuntamento",
        "03/2015 - 02/2019 | Commessa | Zara | Napoli",
        "ISTRUZIONE",
        "2010 - 2014 Laurea in Economia, Università di Napoli",
        "COMPETENZE",
        "2020 - 2021 questa riga non è un'esperienza",
      ].join("\n"),
    );
    expect(t).toHaveLength(3);
    expect(t[0]).toMatchObject({ kind: "lavoro", title: "Sales Associate", organization: "Kiton", city: "Milano", startYear: 2019, startMonth: 3, current: true });
    expect(t[0].description).toMatch(/Clientela internazionale/);
    expect(t[1]).toMatchObject({ title: "Commessa", organization: "Zara", city: "Napoli", startYear: 2015, endYear: 2019, endMonth: 2, current: false });
    expect(t[2]).toMatchObject({ kind: "studio", title: "Laurea in Economia", organization: "Università di Napoli" });
    expect(formatPeriod(t[0])).toBe("03/2019 – oggi");
  });

  it("reads a LinkedIn export (CSV with quotes, commas and line breaks)", () => {
    const positions = 'Company Name,Title,Description,Location,Started On,Finished On\nKiton,Sales Associate,"Vendita, clienti\nVIP",Milano,Mar 2019,\n"Zara, Inditex",Commessa,,Napoli,Mar 2015,Feb 2019\n';
    const p = parseLinkedInPositions(positions);
    expect(p).toHaveLength(2);
    expect(p[0]).toMatchObject({ organization: "Kiton", title: "Sales Associate", startYear: 2019, startMonth: 3, current: true, description: "Vendita, clienti\nVIP" });
    expect(p[1]).toMatchObject({ organization: "Zara, Inditex", endYear: 2019, endMonth: 2, current: false });
    const e = parseLinkedInEducation("School Name,Start Date,End Date,Notes,Degree Name,Activities\nUniversità Esempio,2010,2014,,Laurea in Economia,\n");
    expect(e[0]).toMatchObject({ kind: "studio", organization: "Università Esempio", title: "Laurea in Economia", startYear: 2010, endYear: 2014 });
    expect(parseCsv("")).toEqual([]);
  });
});

describe("catalog: brands in more than one sector, themes", () => {
  let db: DB;
  beforeEach(async () => {
    db = await freshDb();
    await ensureCatalog(db);
  });

  it("Ferrari is cars and also luxury fashion and sport; yachts and luxury fashion share 'lusso'", async () => {
    const sectors = new Map((await db.select().from(schema.catalogSectors)).map((s) => [s.id, s]));
    const bySlug = new Map([...sectors.values()].map((s) => [s.slug, s]));
    const ferrari = (await db.query.catalogCompanies.findFirst({ where: eq(schema.catalogCompanies.slug, "ferrari") }))!;
    expect(ferrari.sectorId).toBe(bySlug.get("auto")!.id);
    expect(ferrari.extraSectorIds).toEqual(expect.arrayContaining([bySlug.get("moda-lusso")!.id, bySlug.get("sport")!.id]));
    expect(companyThemes(ferrari, sectors)).toEqual(expect.arrayContaining(["motori", "lusso", "moda", "sport"]));
    expect(bySlug.get("nautica")!.themes).toContain("lusso");
    expect(bySlug.get("moda-lusso")!.themes).toEqual(expect.arrayContaining(["lusso", "abbigliamento"]));
  });

  it("re-running ensureCatalog refreshes curated themes but never touches entries added with Altro", async () => {
    const nautica = (await db.query.catalogSectors.findFirst({ where: eq(schema.catalogSectors.slug, "nautica") }))!;
    await db.update(schema.catalogSectors).set({ themes: [] }).where(eq(schema.catalogSectors.id, nautica.id));
    const [mine] = await db.insert(schema.catalogSectors).values({ slug: "x", name: "X", themes: ["mio"], createdByUserId: null, shared: false }).returning();
    await db.update(schema.catalogSectors).set({ createdByUserId: null }).where(eq(schema.catalogSectors.id, mine.id));
    await ensureCatalog(db);
    expect((await db.query.catalogSectors.findFirst({ where: eq(schema.catalogSectors.id, nautica.id) }))!.themes).toContain("lusso");
    expect((await db.query.catalogSectors.findFirst({ where: eq(schema.catalogSectors.id, mine.id) }))!.themes).toEqual(["mio"]); // not in the curated list
  });
});

describe("experience -> suggestions, career paths, fit warnings", () => {
  let db: DB;
  let A: number;
  beforeEach(async () => {
    db = await freshDb();
    await ensureCatalog(db);
    const r = await createAccount(db, { email: "anna@example.com", password: "una-password-lunga", name: "Anna", track: "lavoro" });
    if (!r.ok) throw new Error(r.error);
    A = r.userId;
    await importFromCvText(db, A, "ESPERIENZE\n2019 - oggi Sales Associate, Kiton, Milano\n2015 - 2019 Commessa, Boutique Esempio di moda, Napoli");
  });

  it("experiences are matched to catalog companies and sectors", async () => {
    const exps = await listExperiences(db, A);
    const kiton = (await db.query.catalogCompanies.findFirst({ where: eq(schema.catalogCompanies.slug, "kiton") }))!;
    expect(exps.find((e) => e.organization === "Kiton")!.catalogCompanyId).toBe(kiton.id);
    const moda = (await db.query.catalogSectors.findFirst({ where: eq(schema.catalogSectors.slug, "moda-lusso") }))!;
    expect(exps.find((e) => /Boutique/.test(e.organization))!.sectorId).toBe(moda.id); // "moda", "boutique": sector words
  });

  it("someone from luxury fashion is pointed to yachts and luxury hotels, with the reason", async () => {
    const ip = await interestProfile(db, A);
    expect(ip.themes.get("lusso")!.why).toMatch(/Kiton, dove hai lavorato/);
    const paths = await careerPaths(db, A, 8, ip);
    const slugs = paths.map((p) => p.sector.slug);
    expect(slugs).toEqual(expect.arrayContaining(["nautica", "ospitalita-lusso"]));
    const yachts = paths.find((p) => p.sector.slug === "nautica")!;
    expect(yachts.reason).toMatch(/^Lusso/);
    expect(yachts.reason).toMatch(/Kiton/);
    expect(yachts.examples.map((c) => c.name)).toEqual(expect.arrayContaining(["Ferretti Group"]));
    expect(yachts.roles.join(" ")).toMatch(/Yacht sales/);
    expect(slugs).not.toContain("edilizia");
    const sugg = await suggestCompanies(db, A, 12, ip);
    expect(sugg.length).toBeGreaterThan(3);
    expect(sugg.some((s) => s.company.name === "Ferrari")).toBe(true); // a car brand, but also luxury fashion
  });

  it("choosing a plumbing/construction company after Kiton gets a gentle warning; a yacht builder does not", async () => {
    const webuild = (await db.query.catalogCompanies.findFirst({ where: eq(schema.catalogCompanies.slug, "webuild") }))!;
    const ferretti = (await db.query.catalogCompanies.findFirst({ where: eq(schema.catalogCompanies.slug, slugify("Ferretti Group")) }))!;
    await setPref(db, A, "company", webuild.id, "like");
    await setPref(db, A, "company", ferretti.id, "like");
    const w = await fitWarnings(db, A);
    expect(w.get(webuild.id)).toMatch(/Potrebbe non essere la scelta più adatta/);
    expect(w.get(webuild.id)).toMatch(/lusso/);
    expect(w.has(ferretti.id)).toBe(false);
  });

  it("no warnings for someone we know little about", async () => {
    const r = await createAccount(db, { email: "nuovo@example.com", password: "una-password-lunga", name: "N", track: "lavoro" });
    if (!r.ok) throw new Error(r.error);
    const webuild = (await db.query.catalogCompanies.findFirst({ where: eq(schema.catalogCompanies.slug, "webuild") }))!;
    await setPref(db, r.userId, "company", webuild.id, "like");
    expect((await fitWarnings(db, r.userId)).size).toBe(0);
  });
});

describe("imports", () => {
  it("a LinkedIn .zip export becomes a timeline; a re-import replaces it instead of duplicating", async () => {
    const db = await freshDb();
    await ensureCatalog(db);
    const r = await createAccount(db, { email: "z@example.com", password: "una-password-lunga", name: "Z", track: "stage" });
    if (!r.ok) throw new Error(r.error);
    const zip = zipSync({
      "Basic_LinkedInDataExport/Positions.csv": strToU8("Company Name,Title,Description,Location,Started On,Finished On\nSatispay,Intern,,Milano,Jun 2026,Sep 2026\n"),
      "Basic_LinkedInDataExport/Education.csv": strToU8("School Name,Start Date,End Date,Notes,Degree Name,Activities\nUniversità Esempio,2026,,,,\n"),
      "Basic_LinkedInDataExport/Connections.csv": strToU8("not,read\n"),
    });
    expect(await importFromLinkedIn(db, r.userId, [{ name: "export.zip", data: zip }])).toBe(2);
    expect(await importFromLinkedIn(db, r.userId, [{ name: "export.zip", data: zip }])).toBe(2);
    const exps = await listExperiences(db, r.userId);
    expect(exps).toHaveLength(2);
    expect(exps.find((e) => e.organization === "Satispay")!.catalogCompanyId).not.toBeNull();
    expect(await importFromLinkedIn(db, r.userId, [{ name: "x.zip", data: strToU8("not a zip") }])).toBe(0);
    await saveExperiences(db, r.userId, [{ kind: "lavoro", title: "Barista", organization: "", city: null, startYear: 2025, startMonth: null, endYear: 2025, endMonth: null, current: false, description: "" }], "manuale");
    expect(await listExperiences(db, r.userId)).toHaveLength(3); // manual entries are kept by imports
  });

  it("reads the text of an uploaded PDF CV", async () => {
    const text = await pdfText(new Uint8Array(textPdf(["Mario Esempio", "2019 - oggi Addetto vendite, Kiton, Napoli"], "cv")));
    expect(text).toMatch(/2019 - oggi Addetto vendite, Kiton, Napoli/);
    expect(await pdfText(new Uint8Array([1, 2, 3]))).toBe("");
  });
});

describe("students: what fits their year", () => {
  it("advice by year, and the demo first-year student sees programmes and internships first", async () => {
    const db = await freshDb();
    const { M } = await seedPeople(db, NOW);
    const p = await db.query.profile.findFirst({ where: eq(schema.profile.userId, M) });
    expect(studentAdvice(p!)!.stage).toBe("primi-anni");
    expect(studentAdvice(p!)!.best).toMatch(/Spring week/);
    expect(studentAdvice({ ...p!, studyYear: 2 })!.best).toMatch(/Summer internship/);
    await upsertRawJob(db, { source: "api:adzuna", url: "https://www.adzuna.it/details/77", title: "Associate, M&A", company: "Banca Esempio", location: "Milano", description: "Almeno 3 anni di esperienza in M&A." }, NOW);
    const all = (await listJobs(db, M, {}, 100, NOW)).jobs;
    const associate = all.find((j) => j.title === "Associate, M&A")!;
    expect(associate.level).toBe("poco");
    expect(associate.factors.map((f) => f.key)).toContain("seniority");
    const spring = all.find((j) => /Spring Insight/.test(j.title))!;
    expect(spring.level).toBe("molto");
    expect(spring.reasons.join(" ")).toMatch(/Ideale per il tuo anno/);
  });

  it("changing the year re-ranks: in the penultimate year the summer internship rises", async () => {
    const db = await freshDb();
    const { M } = await seedPeople(db, NOW);
    const before = (await listJobs(db, M, {}, 100, NOW)).jobs.find((j) => /Summer Internship Investment Banking/.test(j.title))!;
    await updateProfile(db, M, { studyYear: 2 });
    const { rerankUser } = await import("@/lib/server/jobs");
    await rerankUser(db, M, NOW);
    const after = (await listJobs(db, M, {}, 100, NOW)).jobs.find((j) => /Summer Internship Investment Banking/.test(j.title))!;
    expect(after.score).toBeGreaterThan(before.score);
    void listCompanies;
    void listSectors;
  });
});
