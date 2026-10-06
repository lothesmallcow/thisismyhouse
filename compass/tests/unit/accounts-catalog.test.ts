// Multi-account Compass: isolation between people, accounts and invitations, the catalog
// ("Mi interessa", "Altro", suggestions), the focus switch, and internship ranking.
import { and, eq, inArray } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractDurationMonths, extractEligibility, extractJobType } from "@/lib/core/extract";
import { NO_CHOICES, rankJob, type RankJob, type RankProfile } from "@/lib/core/rank";
import { schema, type DB } from "@/lib/db";
import { OutboxTransport } from "@/lib/mail/transport";
import { approveRequest, createAccount, createInvite, listRequests, OPEN_SIGNUPS_PER_DAY, register, setActive } from "@/lib/server/accounts";
import { approveApplication, cancelApplication, getApplication, prepareEmailApplication, processQueue, updateDraft } from "@/lib/server/applications";
import { addCustomCompany, addCustomSector, ensureCatalog, getPrefs, listCompanies, listSectors, rankPrefs, setPref, setPrefs, slugify, suggestCompanies } from "@/lib/server/catalog";
import { canSee, getJob, listJobs, rerankUser, setApplicationEmail, upsertRawJob } from "@/lib/server/jobs";
import { deleteAccount } from "@/lib/server/privacy";
import { updateProfile } from "@/lib/server/profile";
import { setSetting } from "@/lib/server/settings";
import { freshDb, seedPeople, view } from "./helpers/db";

vi.mock("server-only", () => ({}));

const NOW = new Date("2026-10-05T07:00:00Z");
const rng = () => 0.5;
let db: DB;
let L: number;
let M: number;
beforeEach(async () => {
  db = await freshDb();
  ({ L, M } = await seedPeople(db, NOW));
});

describe("isolation between people", () => {
  it("a job from one person's alert e-mail is visible only to them", async () => {
    const hers = await db.query.jobs.findFirst({ where: eq(schema.jobs.company, "Ferramenta Colombo Srl") }); // her LinkedIn alert
    expect(await canSee(db, L, hers!.id)).toBe(true);
    expect(await canSee(db, M, hers!.id)).toBe(false);
    expect(await getJob(db, M, hers!.id)).toBeNull();
    expect((await listJobs(db, M, { q: "Ferramenta Colombo" }, 50, NOW)).jobs).toHaveLength(0);
  });

  it("a shared job (API) is visible to both, each with their own ranking and status", async () => {
    const shared = await db.query.jobs.findFirst({ where: eq(schema.jobs.company, "Servizi Clienti Esempio") }); // Adzuna
    const a = await view(db, L, shared!.id);
    const b = await view(db, M, shared!.id);
    expect(a && b).toBeTruthy();
    expect(a!.score).not.toBe(b!.score); // a customer-care job fits her, not an internship search
    await db.update(schema.userJobs).set({ status: "dismissed" }).where(and(eq(schema.userJobs.userId, L), eq(schema.userJobs.jobId, shared!.id)));
    expect((await view(db, M, shared!.id))!.status).not.toBe("dismissed");
  });

  it("someone else's application, draft or CV cannot be touched", async () => {
    const job = await db.query.jobs.findFirst({ where: eq(schema.jobs.company, "Ferramenta Colombo Srl") });
    expect(await prepareEmailApplication(db, M, job!.id)).toBeNull(); // he cannot even see the job
    const app = (await prepareEmailApplication(db, L, job!.id))!;
    expect(await getApplication(db, M, app.id)).toBeUndefined();
    expect((await approveApplication(db, M, app.id, NOW, rng)).ok).toBe(false);
    const hisCv = await db.query.cvs.findFirst({ where: eq(schema.cvs.userId, M) });
    await updateDraft(db, L, app.id, { cvId: hisCv!.id }); // his CV on her draft: ignored
    expect((await getApplication(db, L, app.id))!.cvId).not.toBe(hisCv!.id);
    const r = await approveApplication(db, L, app.id, NOW, rng);
    expect(await cancelApplication(db, M, app.id, new Date(NOW.getTime() + 60000))).toBe(false);
    await processQueue(db, (u) => new OutboxTransport(db, u.id), new Date(r.sendAt!.getTime() + 1000), rng);
    const out = await db.select().from(schema.outbox).where(eq(schema.outbox.kind, "application"));
    expect(out).toHaveLength(1);
    expect(out[0].userId).toBe(L);
    expect(out[0].attachmentName).toMatch(/Lucia/);
  });

  it("text pasted by one person never changes a job others can see", async () => {
    const shared = await db.query.jobs.findFirst({ where: eq(schema.jobs.company, "Servizi Clienti Esempio") });
    expect(await setApplicationEmail(db, M, shared!.id, "truffa.esempio@gmail.com", "a mano")).toBe(false);
    expect((await db.query.jobs.findFirst({ where: eq(schema.jobs.id, shared!.id) }))!.applicationEmail).not.toBe("truffa.esempio@gmail.com");
    // A manual paste that matches a shared thin job only adds a private link, it does not rewrite the text.
    const thin = await upsertRawJob(db, { source: "w1", url: "https://annunci.example/x/1", title: "Analista junior", company: "Esempio Spa", location: "Milano", thin: true }, NOW);
    await upsertRawJob(db, { source: "manual", url: "https://annunci.example/x/1", title: "Analista junior", company: "Esempio Spa", location: "Milano", description: "Testo incollato da Marco con un indirizzo: scrivete a soldi.facili.demo@gmail.com" }, NOW, { owners: [M] });
    const after = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, thin.jobId) });
    expect(after!.description).not.toMatch(/Marco/);
    expect(after!.applicationEmail).toBeNull();
  });

  it("deleting an account removes the person and only their private data", async () => {
    const before = (await db.select().from(schema.userJobs).where(eq(schema.userJobs.userId, L))).length;
    const keys = ["collega_", "alerts_done_", "forwarding_", "quick_search_", "quick_search_result_"].map((k) => `${k}${M}`);
    for (const key of [...keys, `collega_${L}`]) await db.insert(schema.settings).values({ key, value: "{}" }).onConflictDoNothing();
    await deleteAccount(db, M);
    expect(await db.select().from(schema.settings).where(inArray(schema.settings.key, keys))).toHaveLength(0); // Collega, alerts, last search...
    expect(await db.query.settings.findFirst({ where: eq(schema.settings.key, `collega_${L}`) })).toBeTruthy(); // not someone else's
    expect(await db.query.users.findFirst({ where: eq(schema.users.id, M) })).toBeUndefined();
    for (const t of [schema.cvs, schema.userJobs, schema.userPrefs, schema.templates, schema.applications]) {
      expect(await db.select().from(t).where(eq(t.userId, M))).toHaveLength(0);
    }
    expect(await db.query.catalogCompanies.findFirst({ where: eq(schema.catalogCompanies.slug, "esempio-advisory-partners") })).toBeUndefined(); // his "Altro"
    expect((await db.select().from(schema.userJobs).where(eq(schema.userJobs.userId, L))).length).toBe(before);
  });
});

describe("accounts and invitations", () => {
  const input = { email: "nuova@example.com", password: "una-password-lunga", name: "Nuova Persona", track: "stage" as const };

  it("by default anyone can ask: the account waits for the admin, who is told by e-mail and approves it", async () => {
    const r = await register(db, input, NOW);
    if (!r.ok) throw new Error(r.error);
    expect(r.pending).toBe(true);
    expect(await db.query.users.findFirst({ where: eq(schema.users.id, r.userId) })).toMatchObject({ active: false, pendingSince: NOW });
    expect((await listRequests(db)).map((u) => u.email)).toEqual(["nuova@example.com"]);
    const toAdmin = (await db.select().from(schema.outbox)).filter((m) => m.kind === "account");
    expect(toAdmin.map((m) => m.subject)).toEqual(["Compass: nuova richiesta di accesso"]);
    expect(await approveRequest(db, r.userId)).toBe(true);
    expect(await db.query.users.findFirst({ where: eq(schema.users.id, r.userId) })).toMatchObject({ active: true, pendingSince: null });
    expect((await db.select().from(schema.outbox)).some((m) => m.kind === "account" && /approvato/.test(m.subject))).toBe(true);
    expect(await approveRequest(db, r.userId)).toBe(false); // only requests can be approved
    expect(await approveRequest(db, M)).toBe(false); // a deactivated person is not a request
    // With a valid invitation there is no wait; a wrong code is an error, not a request.
    const code = await createInvite(db, "", NOW);
    const invited = await register(db, { ...input, email: "invitata@example.com", invite: code }, NOW);
    expect(invited.ok && !invited.pending).toBe(true);
    expect(await register(db, { ...input, email: "sbagliata@example.com", invite: "NOPE" }, NOW)).toEqual({ ok: false, error: "invite" });
  });

  it("invitation only: sign-up needs a valid, unused invitation", async () => {
    await setSetting(db, "registration", "invite");
    expect(await register(db, input, NOW)).toEqual({ ok: false, error: "invite" });
    const code = await createInvite(db, "per Nuova", NOW);
    const r = await register(db, { ...input, invite: code.toLowerCase() }, NOW);
    expect(r.ok).toBe(true);
    const again = await register(db, { ...input, email: "altra@example.com", invite: code }, NOW);
    expect(again).toEqual({ ok: false, error: "invite" }); // one use only
    const expired = await createInvite(db, "", new Date(NOW.getTime() - 15 * 86400000));
    expect(await register(db, { ...input, email: "terza@example.com", invite: expired }, NOW)).toEqual({ ok: false, error: "invite" });
  });

  it("a new person gets a profile, their own templates and a ranked view of shared jobs only", async () => {
    await setSetting(db, "registration", "open");
    const r = await register(db, input, NOW);
    if (!r.ok) throw new Error(r.error);
    const p = await db.query.profile.findFirst({ where: eq(schema.profile.userId, r.userId) });
    expect(p).toMatchObject({ track: "stage", name: "Nuova Persona", onboardedAt: null });
    const tpl = await db.select().from(schema.templates).where(eq(schema.templates.userId, r.userId));
    expect(tpl.some((t) => /stage/i.test(t.name))).toBe(true);
    const seen = await db.select().from(schema.userJobs).where(eq(schema.userJobs.userId, r.userId));
    expect(seen.length).toBeGreaterThan(0);
    for (const s of seen) {
      const srcs = await db.select().from(schema.jobSources).where(eq(schema.jobSources.jobId, s.jobId));
      expect(srcs.some((x) => x.userId == null)).toBe(true);
    }
  });

  it("closed registration, duplicates, short passwords, and the daily cap on open sign-up", async () => {
    await setSetting(db, "registration", "closed");
    expect(await register(db, input, NOW)).toEqual({ ok: false, error: "closed" });
    expect(await createAccount(db, { ...input, email: "u@example.com" })).toEqual({ ok: false, error: "exists" });
    expect(await createAccount(db, { ...input, password: "corta" })).toEqual({ ok: false, error: "password" });
    await setSetting(db, "registration", "open");
    await db.insert(schema.usageCounters).values({ counter: "signups", day: "2026-10-05", count: OPEN_SIGNUPS_PER_DAY });
    expect(await register(db, input, NOW)).toEqual({ ok: false, error: "limit" });
  });

  it("a deactivated person is skipped by every job and loses their sessions", async () => {
    await db.insert(schema.sessions).values({ id: "x", userId: M, expiresAt: new Date(NOW.getTime() + 86400000) });
    await setActive(db, M, false);
    expect(await db.select().from(schema.sessions).where(eq(schema.sessions.userId, M))).toHaveLength(0);
    const { runDigest } = await import("@/lib/pipeline/digest");
    const r = await runDigest(db, (u) => new OutboxTransport(db, u.id), NOW);
    expect(r[M]).toBeUndefined();
    expect(r[L]).toBe("sent");
  });
});

describe("catalog", () => {
  it("is seeded once, idempotently, with sectors and companies for both tracks", async () => {
    const n = (await db.select().from(schema.catalogCompanies)).length;
    await ensureCatalog(db);
    expect((await db.select().from(schema.catalogCompanies)).length).toBe(n);
    const stage = await listCompanies(db, M, "stage");
    expect(stage.some((c) => c.kind === "boutique")).toBe(true);
    const lavoro = await listCompanies(db, L, "lavoro");
    expect(lavoro.some((c) => c.kind === "boutique")).toBe(false); // advisory boutiques are for the internship search
    expect(lavoro.some((c) => c.kind === "brand")).toBe(true);
    expect((await listSectors(db, L, "lavoro")).map((s) => s.name)).toContain("Moda e lusso");
  });

  it("“Altro” adds a private entry, reuses an existing one with the same name, and is not shown to others", async () => {
    const id = (await addCustomSector(db, L, "Restauro di tessuti antichi", "lavoro"))!;
    expect((await getPrefs(db, L)).sectors.get(id)).toBe("like");
    expect((await listSectors(db, L)).some((s) => s.id === id)).toBe(true);
    expect((await listSectors(db, M)).some((s) => s.id === id)).toBe(false);
    expect(await addCustomSector(db, M, "restauro di TESSUTI antichi", "stage")).toBe(id); // same slug
    expect((await listSectors(db, M)).some((s) => s.id === id)).toBe(true); // now his choice too
    const lazard = await db.query.catalogCompanies.findFirst({ where: eq(schema.catalogCompanies.slug, slugify("Lazard")) });
    expect(await addCustomCompany(db, L, { name: "LAZARD" }, "lavoro")).toBe(lazard!.id); // no duplicate of a curated entry
  });

  it("setPrefs only changes the entries shown on the form", async () => {
    const all = await listSectors(db, M);
    const [a, b, c] = all.map((s) => s.id);
    await setPrefs(db, M, "sector", "like", [a, b], [a, b]);
    await setPrefs(db, M, "sector", "like", [c], [c]); // another form: a and b stay
    const p = await getPrefs(db, M);
    expect([p.sectors.get(a), p.sectors.get(b), p.sectors.get(c)]).toEqual(["like", "like", "like"]);
    await setPrefs(db, M, "sector", "like", [], [a]);
    expect((await getPrefs(db, M)).sectors.has(a)).toBe(false);
  });

  it("chosen companies rank higher, and 'only my choices' hides the rest", async () => {
    const job = await upsertRawJob(db, { source: "api:adzuna", url: "https://www.adzuna.it/details/9", title: "Summer Analyst Intern", company: "Lazard Frères Banque", location: "Milano", description: "Internship di 10 settimane, paid internship." }, NOW);
    const liked = await view(db, M, job.jobId);
    expect(liked!.presetMatch).toBe("company"); // Lazard is one of his demo choices; "Frères Banque" still matches
    expect(liked!.factors.some((f) => f.key === "company-liked")).toBe(true);
    const all = await listJobs(db, M, {}, 200, NOW);
    const only = await listJobs(db, M, { focus: "aziende" }, 200, NOW);
    expect(only.total).toBeLessThan(all.total);
    expect(only.jobs.every((j) => j.presetMatch === "company")).toBe(true);
    const mixed = await listJobs(db, M, { focus: "preferite" }, 200, NOW);
    expect(mixed.jobs.every((j) => j.presetMatch === "company" || j.presetMatch === "sector")).toBe(true);
    expect(mixed.total).toBeGreaterThanOrEqual(only.total);
  });

  it("avoiding a company sends its offers to the bottom", async () => {
    const lazard = await db.query.catalogCompanies.findFirst({ where: eq(schema.catalogCompanies.slug, "lazard") });
    const job = await upsertRawJob(db, { source: "api:adzuna", url: "https://www.adzuna.it/details/10", title: "M&A Intern", company: "Lazard", location: "Milano", description: "Stage di 6 mesi." }, NOW);
    await setPref(db, M, "company", lazard!.id, "avoid");
    await rerankUser(db, M, NOW);
    expect((await view(db, M, job.jobId))!.level).toBe("poco");
  });

  it("suggestions come from his sectors, tastes and CV, never repeat a choice, and say why", async () => {
    const s = await suggestCompanies(db, M, 8);
    expect(s.length).toBeGreaterThan(0);
    const prefs = await getPrefs(db, M);
    expect(s.every((x) => !prefs.companies.has(x.company.id))).toBe(true);
    expect(s.every((x) => x.reason.length > 5)).toBe(true);
    expect(new Set(s.map((x) => x.company.sectorId)).size).toBeGreaterThan(1); // spread across sectors
    // Someone with a fashion CV and taste gets fashion brands.
    const fashion = "ESPERIENZE\n2015 - oggi Addetta vendite, Boutique di moda e accessori di lusso (esempio), Torino";
    await db.update(schema.cvs).set({ text: fashion }).where(eq(schema.cvs.userId, L));
    const { importFromCvText } = await import("@/lib/server/experiences");
    await importFromCvText(db, L, fashion); // the timeline is read again from the new CV
    await updateProfile(db, L, { tastes: ["moda"], roles: [] });
    const hers = await suggestCompanies(db, L, 5);
    const moda = await db.query.catalogSectors.findFirst({ where: eq(schema.catalogSectors.slug, "moda-lusso") });
    expect(hers[0].company.sectorId).toBe(moda!.id);
  });

  it("the ranking sees catalog choices as names and words", async () => {
    const p = await rankPrefs(db, M);
    expect(p.likedCompanies.map((c) => c.name)).toEqual(expect.arrayContaining(["Lazard", "Esempio Advisory Partners"]));
    expect(p.likedSectors.map((c) => c.name)).toContain("Investment banking e M&A");
    expect(p.avoidSectors.map((c) => c.name)).toContain("Sanità e assistenza");
  });
});

describe("internships: extraction and ranking", () => {
  it.each([
    ["Summer Analyst - M&A", "", "stage"],
    ["Stage area amministrazione", "", "stage"],
    ["Spring Insight Week 2027", "", "programma"],
    ["Senior Financial Controller", "", "lavoro"],
    ["Analyst", "Tirocinio extracurriculare di 6 mesi con rimborso spese mensile", "stage"],
    ["Impiegata", "Almeno 5 anni di esperienza in contabilità", "lavoro"],
    ["Business Analyst", "Unisciti al nostro team.", "unknown"],
  ])("%s -> %s", (title, text, type) => expect(extractJobType(title, text)).toBe(type));

  it("eligibility and duration", () => {
    expect(extractEligibility("Per laureandi o neolaureati in economia")).toEqual(expect.arrayContaining(["fine-studi"]));
    expect(extractEligibility("Per laureandi o neolaureati in economia")).not.toContain("laurea-richiesta");
    expect(extractEligibility("Graduate programme for recent graduates")).toContain("laurea-richiesta");
    expect(extractEligibility("Open to penultimate year students")).toContain("penultimo-anno");
    expect(extractEligibility("Students in any year of study are welcome. Paid internship.")).toEqual(expect.arrayContaining(["primo-anno", "retribuito"]));
    expect(extractEligibility("Stage curriculare non retribuito")).toContain("non-retribuito");
    expect(extractEligibility("Richiesti almeno 3 anni di esperienza")).toContain("esperienza");
    expect(extractDurationMonths("Stage di 6 mesi")).toBe(6);
    expect(extractDurationMonths("a 3-month internship")).toBe(3);
    expect(extractDurationMonths("Graduate programme di 18 mesi")).toBeNull();
  });

  const student: RankProfile = {
    ...NO_CHOICES,
    track: "stage",
    roles: [],
    synonyms: [],
    maxKm: 25,
    remoteOk: true,
    hours: "any",
    contracts: [],
    minAnnualGross: null,
    languages: [{ language: "inglese", level: "fluente" }],
    avoidKeywords: [],
    avoidCompanies: [],
    avoidSectors: [],
    likedSectors: [{ name: "Investment banking e M&A", keywords: ["investment banking", "m&a"] }],
    likedCompanies: [{ name: "Lazard", aliases: [] }],
    studyYear: 1,
    degreeYears: 3,
    extraPlaces: ["Londra"],
  };
  const job: RankJob = { title: "M&A Intern", company: "Boutique Esempio", description: "", sector: null, distanceKm: 3, remote: "onsite", hours: "unknown", contract: "stage", minAnnualGross: null, maxAnnualGross: null, languages: [], postedAt: NOW, scamFlagCount: 0, city: "Milano", jobType: "stage", eligibility: [] };

  it("an internship in a chosen sector, nearby, is Molto adatta; a regular job is not", () => {
    expect(rankJob(job, student, [], NOW).level).toBe("molto");
    expect(rankJob({ ...job, title: "Senior Associate M&A", jobType: "lavoro" }, student, [], NOW).level).not.toBe("molto");
  });
  it("first-year students: degree required or penultimate-year only drop, first-year welcome rises", () => {
    const base = rankJob(job, student, [], NOW).score;
    expect(rankJob({ ...job, eligibility: ["laurea-richiesta"] }, student, [], NOW).score).toBeLessThan(base);
    expect(rankJob({ ...job, eligibility: ["penultimo-anno"] }, student, [], NOW).score).toBeLessThan(base);
    const second = { ...student, studyYear: 2 };
    expect(rankJob({ ...job, eligibility: ["penultimo-anno"] }, second, [], NOW).score).toBe(rankJob(job, second, [], NOW).score); // second year of three is the penultimate
    expect(rankJob({ ...job, eligibility: ["primo-anno"] }, student, [], NOW).score).toBeGreaterThan(base);
  });
  it("other cities chosen count as close; outside chosen sectors is said", () => {
    const r = rankJob({ ...job, city: "Londra", distanceKm: null }, student, [], NOW);
    expect(r.reasons.join(" ")).toMatch(/Londra/);
    const off = rankJob({ ...job, title: "Marketing Intern" }, student, [], NOW);
    expect(off.factors.find((f) => f.key === "sector-liked")?.points).toBeLessThan(0);
    expect(off.presetMatch).toBeNull();
  });
  it("year of study: first years see spring weeks first; associate-level roles drop; final year accepts graduate roles", async () => {
    const spring = { ...job, title: "Spring Insight Week M&A", jobType: "programma" as const };
    const summer = { ...job, title: "Summer Analyst M&A", jobType: "stage" as const };
    const associate = { ...job, title: "Associate M&A", jobType: "lavoro" as const };
    const graduate = { ...job, title: "Graduate Analyst", jobType: "lavoro" as const, eligibility: ["laurea-richiesta" as const] };
    const y1 = student;
    const y2 = { ...student, studyYear: 2 };
    const y3 = { ...student, studyYear: 3 };
    // First year: the spring week beats the summer analyst internship; associate is Poco adatta.
    expect(rankJob(spring, y1, [], NOW).score).toBeGreaterThan(rankJob(summer, y1, [], NOW).score);
    expect(rankJob(spring, y1, [], NOW).reasons.join(" ")).toMatch(/Ideale per il tuo anno/);
    expect(rankJob(associate, y1, [], NOW).level).toBe("poco");
    expect(rankJob(associate, y1, [], NOW).factors.some((f) => f.key === "seniority")).toBe(true);
    // Penultimate year: the summer internship comes first.
    expect(rankJob(summer, y2, [], NOW).score).toBeGreaterThan(rankJob(spring, y2, [], NOW).score);
    // Final year: a graduate role is acceptable, not a "regular job" penalty.
    expect(rankJob(graduate, y3, [], NOW).score).toBeGreaterThan(rankJob(graduate, y1, [], NOW).score + 20);
    // Master's (2 years): the first year is the summer internship year.
    const { careerStage } = await import("@/lib/core/career-stage");
    expect([careerStage(1, 3), careerStage(2, 3), careerStage(3, 3), careerStage(1, 2), careerStage(2, 2), careerStage(3, 5)]).toEqual(["primi-anni", "penultimo", "ultimo", "penultimo", "ultimo", "primi-anni"]);
  });
  it("a student programme is penalised in a job search", () => {
    const seeker: RankProfile = { ...student, ...NO_CHOICES, roles: ["Impiegata"] };
    expect(rankJob({ ...job, title: "Spring Insight Week", jobType: "programma" }, seeker, [], NOW).level).toBe("poco");
  });
});
