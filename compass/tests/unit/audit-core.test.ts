// Tests added for the audit checklist: normalization, dedupe, ranking, applying, guardrails,
// replies, digest, and "break it on purpose" cases.
import fs from "node:fs";
import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractApplicationEmails, extractContract, extractHours, extractLanguages, extractRemote } from "@/lib/core/extract";
import { distanceKm, findPlace } from "@/lib/core/geo";
import { checkSend, DEFAULT_GUARDRAILS, effectiveDailyCap, inSendWindow, MAX_ATTACHMENT_BYTES, scheduleSend } from "@/lib/core/guardrails";
import { normalizeJob } from "@/lib/core/normalize";
import { NO_CHOICES, rankJob, type RankProfile } from "@/lib/core/rank";
import { RANK_WEIGHTS } from "@/lib/core/rank-config";
import { parseSalary } from "@/lib/core/salary";
import { DEFAULT_TEMPLATES, merge } from "@/lib/core/templates";
import { isItalianHoliday, romeParts } from "@/lib/core/time";
import { pickCv } from "@/lib/core/cv-pick";
import { schema, type DB } from "@/lib/db";
import { getTransport, OutboxTransport, SmtpTransport } from "@/lib/mail/transport";
import { digestCounts } from "@/lib/pipeline/digest";
import { scanMailbox } from "@/lib/pipeline/mailbox-scan";
import { approveApplication, cancelApplication, prepareEmailApplication, processQueue } from "@/lib/server/applications";
import { dedupeCandidates, listJobs, upsertRawJob } from "@/lib/server/jobs";
import { updateGuardrails } from "@/lib/server/settings";
import { seedAccounts } from "@/lib/seed";
import { parseAlert } from "@/lib/sources/alerts";
import { DemoMailbox } from "@/lib/sources/mail/demo";
import { parseRawEmail } from "@/lib/sources/mail/parse";
import { freshDb, seedPeople } from "./helpers/db";

const NOW = new Date("2026-10-05T07:00:00Z"); // Monday 09:00 Rome
const rng = () => 0.5;

describe("salary: the brief's examples", () => {
  it.each([
    ["RAL 28-32k", 28000, 32000, "annual_gross", false],
    ["28.000 - 32.000 € annui", 28000, 32000, "annual_unspecified", true],
    ["1.600 € netti/mese", 27700, 27700, "monthly_net", true],
    ["14 €/h", 29100, 29100, "hourly", true],
    ["CCNL Commercio 4° livello", 25500, 25500, "ccnl", true],
    ["stipendio commisurato all'esperienza", null, null, "unknown", false],
    ["", null, null, "unknown", false],
  ])("%s", (raw, min, max, basis, estimate) => {
    const s = parseSalary(raw);
    expect([s.minAnnualGross, s.maxAnnualGross, s.basis, s.isEstimate]).toEqual([min, max, basis, estimate]);
  });

  it("unknown salary stays visible under a pay filter (neutral, not zero)", async () => {
    const db = await freshDb();
    const [L] = await seedAccounts(db, { admin: { email: "a@example.com", password: "admin-password" }, people: [{ email: "u@example.com", password: "demo-password", name: "L", track: "lavoro" }] });
    await upsertRawJob(db, { source: "manual", url: null, title: "Senza stipendio", company: "A", location: "Torino" }, NOW);
    await upsertRawJob(db, { source: "manual", url: null, title: "Pagato poco", company: "B", location: "Torino", salaryText: "RAL 15.000 €" }, NOW);
    const r = await listJobs(db, L, { minNetMonthly: 1500 }, 50, NOW);
    expect(r.jobs.map((j) => j.title)).toEqual(["Senza stipendio"]);
  });
});

describe("extraction in Italian and English", () => {
  it.each([
    ["Contratto a tempo indeterminato", "Permanent position", "indeterminato"],
    ["Contratto a tempo determinato", "Fixed-term contract of 6 months", "determinato"],
    ["Tirocinio retribuito", "Paid internship", "stage"],
  ])("contract: %s / %s", (it_, en, want) => {
    expect(extractContract(it_)).toBe(want);
    expect(extractContract(en)).toBe(want);
  });
  it("hours, remote, languages in both languages", () => {
    expect([extractHours("Orario part-time"), extractHours("Part time role")]).toEqual(["part", "part"]);
    expect([extractHours("Tempo pieno"), extractHours("Full-time position")]).toEqual(["full", "full"]);
    expect([extractRemote("Lavoro da remoto"), extractRemote("Fully remote work")]).toEqual(["remote", "remote"]);
    expect([extractRemote("Modalità ibrida"), extractRemote("Hybrid model")]).toEqual(["hybrid", "hybrid"]);
    expect([extractRemote("Lavoro in sede"), extractRemote("On-site role")]).toEqual(["onsite", "onsite"]);
    expect(extractLanguages("Richiesto inglese fluente")).toEqual([{ language: "inglese", level: "fluente" }]);
    expect(extractLanguages("Fluent English and good German")).toEqual([
      { language: "inglese", level: "fluente" },
      { language: "tedesco", level: "buono" },
    ]);
  });
});

describe("location", () => {
  it("Milano to Torino is about 125 km, offline", () => {
    const d = distanceKm(findPlace("Milano")!, findPlace("Torino")!);
    expect(d).toBeGreaterThan(120);
    expect(d).toBeLessThan(130);
  });
  it("misspelled or unknown city: no crash, no distance, text kept", () => {
    expect(findPlace("Torinoo")).toBeNull();
    const j = normalizeJob({ source: "manual", url: null, title: "X", location: "Atlantide" }, { lat: 45, lng: 7 });
    expect([j.city, j.distanceKm]).toEqual(["Atlantide", null]);
  });
});

describe("application e-mail detection", () => {
  it.each([
    ["Inviare il CV a selezione@rossi.example entro venerdì.", "selezione@rossi.example"],
    ["Le candidature vanno spedite a hr@bianchi.example indicando il riferimento.", "hr@bianchi.example"],
    ["Interested candidates should send their CV to jobs@acme.example", "jobs@acme.example"],
  ])("finds it: %s", (text, email) => {
    const r = extractApplicationEmails(`Annuncio.\n${text}\nGrazie.`);
    expect(r[0]).toEqual({ email, evidence: text });
  });
  it.each([
    ["Footer", "Rossi Srl · Via Roma 1 · info@rossi.example · P.IVA 0000"],
    ["Privacy", "Informativa privacy: titolare del trattamento dei dati dei candidati è Rossi Srl, dpo@rossi.example."],
  ])("finds nothing: %s", (_n, text) => expect(extractApplicationEmails(text)).toEqual([]));
});

describe("dedupe", () => {
  let db: DB;
  beforeEach(async () => {
    db = await freshDb();
  });
  it("LinkedIn alert + W1 + API = one job with three source links", async () => {
    const cache = await dedupeCandidates(db);
    const a = await upsertRawJob(db, { source: "email:linkedin", url: "https://www.linkedin.com/comm/jobs/view/4099999999/?trk=a", title: "Impiegata amministrativa", company: "Rossi S.r.l.", location: "Torino" }, NOW, { cache });
    const b = await upsertRawJob(db, { source: "w1", url: "https://it.linkedin.com/jobs/view/impiegata-amministrativa-at-rossi-4099999999", title: "Impiegata amministrativa", company: null, location: null, thin: true }, NOW, { cache });
    const c = await upsertRawJob(db, { source: "api:adzuna", url: "https://www.adzuna.it/details/1", title: "Impiegato amministrativo", company: "ROSSI SRL", location: "Torino, Piemonte", description: "Inviare il CV a hr@rossi.example" }, NOW, { cache });
    expect(new Set([a.jobId, b.jobId, c.jobId]).size).toBe(1);
    const srcs = await db.select().from(schema.jobSources).where(eq(schema.jobSources.jobId, a.jobId));
    expect(srcs.map((s) => s.source).sort()).toEqual(["api:adzuna", "email:linkedin", "w1"]);
  });
  it("same title and company in a different city are two jobs", async () => {
    const a = await upsertRawJob(db, { source: "manual", url: null, title: "Segretaria", company: "Rossi", location: "Torino" }, NOW);
    const b = await upsertRawJob(db, { source: "manual", url: null, title: "Segretaria", company: "Rossi", location: "Milano" }, NOW);
    expect(a.jobId).not.toBe(b.jobId);
  });
  it("company variants: Rossi S.r.l. / ROSSI SRL / Rossi", async () => {
    const ids = [];
    for (const company of ["Rossi S.r.l.", "ROSSI SRL", "Rossi"]) ids.push((await upsertRawJob(db, { source: "manual", url: null, title: "Contabile", company, location: "Torino" }, NOW)).jobId);
    expect(new Set(ids).size).toBe(1);
  });
  it("accents, apostrophes, emoji and very long strings display and dedupe", async () => {
    const long = "Addetta all'amministrazione ".repeat(20);
    const a = await upsertRawJob(db, { source: "manual", url: null, title: "Impiegata ✨ contabilità", company: "Caffè dell'Università", location: "Forlì" }, NOW);
    const b = await upsertRawJob(db, { source: "manual", url: null, title: "impiegata contabilita", company: "CAFFE DELL'UNIVERSITA", location: "Forli" }, NOW);
    expect(a.jobId).toBe(b.jobId);
    const j = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, a.jobId) });
    expect(j!.title).toBe("Impiegata ✨ contabilità");
    expect(j!.city).toBe("Forlì");
    const c = await upsertRawJob(db, { source: "manual", url: null, title: long, company: null, location: null }, NOW);
    const jc = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, c.jobId) });
    expect(jc!.title.length).toBeLessThanOrEqual(200);
  });
  it("no city, no company, no link: stored, not merged with anything", async () => {
    const a = await upsertRawJob(db, { source: "manual", url: null, title: "Segretaria" }, NOW);
    const b = await upsertRawJob(db, { source: "manual", url: null, title: "Segretaria" }, NOW);
    expect(a.jobId).not.toBe(b.jobId); // nothing to prove they are the same job
    const j = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, a.jobId) });
    expect([j!.city, j!.company, j!.lat]).toEqual([null, null, null]);
  });
});

describe("ranking", () => {
  const empty: RankProfile = { ...NO_CHOICES, roles: [], synonyms: [], maxKm: 20, remoteOk: true, hours: "any", contracts: [], minAnnualGross: null, languages: [], avoidKeywords: [], avoidCompanies: [], avoidSectors: [] };
  const job = { city: null, jobType: "unknown" as const, eligibility: [], title: "Impiegata", company: "Rossi", description: "", sector: null, distanceKm: null, remote: "unknown" as const, hours: "unknown" as const, contract: "unknown" as const, minAnnualGross: null, maxAnnualGross: null, languages: [], postedAt: NOW, scamFlagCount: 0 };
  it("weights live in one config file", () => {
    expect(RANK_WEIGHTS.avoidCompany).toBe(-100);
  });
  it("empty profile (onboarding skipped): no crash, no penalties, ordering by recency only", () => {
    const r = rankJob(job, empty, [], NOW);
    expect(r.factors.every((f) => f.points >= 0)).toBe(true);
    expect(r.level).toBe("poco"); // nothing to say it fits: shown, but not pushed
    expect(rankJob({ ...job, postedAt: new Date(NOW.getTime() - 40 * 86400000) }, empty, [], NOW).score).toBeLessThan(r.score);
  });
  it("an excluded company is Poco adatta whatever else it scores", () => {
    const best = { ...empty, roles: ["Impiegata"], avoidCompanies: ["Rossi Srl"], minAnnualGross: 1 };
    const r = rankJob({ ...job, distanceKm: 1, hours: "part", contract: "indeterminato", maxAnnualGross: 99999 }, best, [], NOW);
    expect(r.level).toBe("poco");
  });
  it("reasons come from the rules that fired", () => {
    const p = { ...empty, roles: ["Impiegata"], maxKm: 20 };
    const r = rankJob({ ...job, distanceKm: 6 }, p, [], NOW);
    expect(r.reasons.every((x) => r.factors.some((f) => f.reason === x))).toBe(true);
  });
});

describe("applying", () => {
  it("templates render cleanly for 5 different jobs (no leftover placeholders)", () => {
    const jobs = [
      { azienda: "Rossi Srl", ruolo: "Impiegata amministrativa", citta: "Torino", fonte: "il vostro annuncio su Indeed", nome: "Lucia Ferraro" },
      { azienda: null, ruolo: "Segretaria", citta: null, fonte: null, nome: "Lucia Ferraro" },
      { azienda: "Caffè dell'Arte", ruolo: "Cassiera", citta: "Forlì", fonte: "il vostro sito", nome: "Lucia" },
      { azienda: "Studio Bianchi", ruolo: "Receptionist part-time", citta: "Moncalieri", fonte: "il vostro annuncio online", nome: "" },
      { azienda: "Acme", ruolo: "Back office", citta: "Rivoli", fonte: "il vostro annuncio", nome: "Lucia Ferraro" },
    ];
    for (const t of DEFAULT_TEMPLATES) for (const v of jobs) {
      const out = merge(t.subject + "\n" + t.body, v);
      expect(out).not.toMatch(/[{}]/);
      expect(out).not.toMatch(/ ,| \./);
    }
  });
  it("CV picker: three job types", () => {
    const cvs = [
      { id: 1, label: "CV Amministrazione", roleFamily: "Amministrazione", isDefault: true },
      { id: 2, label: "CV Segreteria", roleFamily: "Segreteria", isDefault: false },
      { id: 3, label: "CV Vendita", roleFamily: "Vendita", isDefault: false },
    ];
    expect(pickCv(cvs, { title: "Impiegata contabile", sector: null })!.id).toBe(1);
    expect(pickCv(cvs, { title: "Centralinista", sector: null })!.id).toBe(2);
    expect(pickCv(cvs, { title: "Commessa", sector: null })!.id).toBe(3);
  });
});

describe("guardrails at the boundaries", () => {
  it("first week: the 4th send on day 2 is refused (moved to the next working day)", () => {
    const goLive = new Date("2026-10-05T06:00:00Z");
    const day2 = new Date("2026-10-06T07:00:00Z"); // Tuesday 09:00
    const s = { ...DEFAULT_GUARDRAILS, goLiveAt: goLive };
    expect(effectiveDailyCap(s, day2)).toBe(3);
    const three = [7.2, 7.5, 7.8].map((h) => new Date(Date.UTC(2026, 9, 6, Math.floor(h), (h % 1) * 60)));
    const t = scheduleSend(day2, s, three, rng)!;
    expect(romeParts(t).day).toBe(7);
  });
  it("after the first week the cap is 10, never above 20", () => {
    expect(effectiveDailyCap({ ...DEFAULT_GUARDRAILS, goLiveAt: new Date("2026-09-01") }, NOW)).toBe(10);
    expect(effectiveDailyCap({ ...DEFAULT_GUARDRAILS, dailyCap: 21 }, NOW)).toBe(20);
  });
  it("Sunday, public holidays, New Year's Eve, 29 February, DST nights", () => {
    const sunday = new Date("2026-10-04T08:00:00Z");
    expect(inSendWindow(sunday, DEFAULT_GUARDRAILS)).toBe(false);
    expect(romeParts(scheduleSend(sunday, DEFAULT_GUARDRAILS, [], rng)!).weekday).toBe(1);
    // 31 Dec 2026 (Thursday) evening -> 1 Jan is a holiday -> Friday 2 Jan 2027
    const nye = romeParts(scheduleSend(new Date("2026-12-31T17:30:00Z"), DEFAULT_GUARDRAILS, [], rng)!);
    expect([nye.year, nye.month, nye.day]).toEqual([2027, 1, 4].slice(0, 0).length ? [] : [2027, 1, 4]); // 2 Jan is Saturday
    expect(isItalianHoliday({ year: 2027, month: 3, day: 29 })).toBe(true); // Pasquetta 2027
    // 29 Feb 2028 (Tuesday) 10:00 is a normal working day
    expect(inSendWindow(new Date("2028-02-29T09:00:00Z"), DEFAULT_GUARDRAILS)).toBe(true);
    // DST night: Monday 26 Oct 2026 08:30 Rome is 07:30 UTC (winter time)
    const afterDst = romeParts(scheduleSend(new Date("2026-10-25T20:00:00Z"), DEFAULT_GUARDRAILS, [], rng)!);
    expect([afterDst.day, afterDst.hour]).toEqual([26, 8]);
  });
  it("a 5 MB CV is refused", () => {
    const r = checkSend(
      { jobId: 1, company: "A", title: "x", description: "", recipient: "a@a.example", spontaneous: false, level: "molto", scamFlags: [], attachmentBytes: 5 * 1024 * 1024 },
      { mode: "manual", settings: DEFAULT_GUARDRAILS, history: [], blocklist: { companies: [], domains: [], keywords: [] }, now: NOW },
    );
    expect(r.blockers.map((b) => b.code)).toEqual(["attachment-too-big"]);
    expect(MAX_ATTACHMENT_BYTES).toBe(2 * 1024 * 1024);
  });
});

describe("sending in the database", () => {
  let db: DB;
  let L: number;
  beforeEach(async () => {
    db = await freshDb();
    ({ L } = await seedPeople(db, NOW, { student: false }));
  });
  const emailJobs = async () =>
    (
      await db
        .select({ j: schema.jobs })
        .from(schema.userJobs)
        .innerJoin(schema.jobs, eq(schema.jobs.id, schema.userJobs.jobId))
        .where(sql`${schema.userJobs.userId} = ${L} and ${schema.jobs.applicationEmail} is not null and ${schema.userJobs.status} != 'applied' and json_array_length(${schema.jobs.scamFlags}) = 0`)
        .orderBy(schema.jobs.id)
    ).map((r) => r.j);

  it("demo mode: the real SMTP transport is never used, even with the admin switch on", async () => {
    const prev = { ...process.env };
    process.env.DEMO_MODE = "true";
    process.env.MAILBOX_USER = "x@example.com";
    process.env.MAILBOX_APP_PASSWORD = "pw";
    const spy = vi.spyOn(SmtpTransport.prototype, "send");
    const t = getTransport(db, true, { id: L, mailboxKey: "default" }, "Lucia");
    expect(t).toBeInstanceOf(OutboxTransport);
    const app = (await prepareEmailApplication(db, L, (await emailJobs())[0].id))!;
    const r = await approveApplication(db, L, app.id, NOW, rng);
    await processQueue(db, t, new Date(r.sendAt!.getTime() + 1000), rng);
    expect(spy).not.toHaveBeenCalled();
    expect((await db.select().from(schema.outbox)).length).toBe(1);
    spy.mockRestore();
    process.env = prev;
  });

  it("e-mail is plain text, one recipient, CV attached", async () => {
    const sent: Parameters<OutboxTransport["send"]>[0][] = [];
    const t = { real: false, send: async (m: (typeof sent)[0]) => (sent.push(m), { messageId: "<m@x>", simulated: true }) };
    const app = (await prepareEmailApplication(db, L, (await emailJobs())[0].id))!;
    const r = await approveApplication(db, L, app.id, NOW, rng);
    await processQueue(db, t, new Date(r.sendAt!.getTime() + 1000), rng);
    expect(sent).toHaveLength(1);
    expect(sent[0].html).toBeUndefined();
    expect(sent[0].text.length).toBeGreaterThan(50);
    expect(sent[0].to).not.toMatch(/[,;]/);
    expect(sent[0].attachment!.contentType).toBe("application/pdf");
    expect(sent[0].attachment!.content.length).toBeLessThan(MAX_ATTACHMENT_BYTES);
  });

  it("Annulla really stops the send (the queue runner sends nothing afterwards)", async () => {
    const app = (await prepareEmailApplication(db, L, (await emailJobs())[0].id))!;
    const r = await approveApplication(db, L, app.id, NOW, rng);
    expect(await cancelApplication(db, L, app.id, new Date(NOW.getTime() + 60000))).toBe(true);
    const out = await processQueue(db, new OutboxTransport(db), new Date(r.sendAt!.getTime() + 3600000), rng);
    expect(out.sent).toBe(0);
    expect(await db.select().from(schema.outbox)).toHaveLength(0);
  });

  it("two queue runners at the same time never send the same e-mail twice", async () => {
    const app = (await prepareEmailApplication(db, L, (await emailJobs())[0].id))!;
    const r = await approveApplication(db, L, app.id, NOW, rng);
    const at = new Date(r.sendAt!.getTime() + 1000);
    const [a, b] = await Promise.all([processQueue(db, new OutboxTransport(db), at, rng), processQueue(db, new OutboxTransport(db), at, rng)]);
    expect(a.sent + b.sent).toBe(1);
    expect(await db.select().from(schema.outbox)).toHaveLength(1);
  });

  it("the daily cap is re-checked at send time (approvals racing for the last slot)", async () => {
    await updateGuardrails(db, { dailyCap: 1 });
    const jobs = await emailJobs();
    const a1 = (await prepareEmailApplication(db, L, jobs[0].id))!;
    const a2 = (await prepareEmailApplication(db, L, jobs[1].id))!;
    // Both approved "at the same moment" from two devices: force both into the same slot.
    await approveApplication(db, L, a1.id, NOW, rng);
    await approveApplication(db, L, a2.id, NOW, rng);
    const slot = new Date(NOW.getTime() + 20 * 60000);
    await db.update(schema.applications).set({ sendAt: slot }).where(eq(schema.applications.status, "queued"));
    const out = await processQueue(db, new OutboxTransport(db), new Date(slot.getTime() + 1000), rng);
    expect(out.sent).toBe(1);
    expect(out.held).toBe(1);
  });
});

describe("replies vs alerts, digest counts", () => {
  it("a job newsletter from a company she applied to is NOT taken as a reply", async () => {
    const db = await freshDb();
    const { L } = await seedPeople(db, NOW, { student: false });
    // she applied to an agency at lavorosereno.example
    await db.insert(schema.applications).values({ userId: L, lane: "email", status: "sent", company: "Agenzia Lavoro Sereno", toEmail: "selezione@lavorosereno.example", messageId: "<m1@x>", sentAt: new Date(NOW.getTime() - 86400000) });
    const raw = fs.readFileSync("fixtures/emails/generic-agency-alert-1.eml", "utf8").replace(/^Date: .*$/m, `Date: ${NOW.toUTCString()}`);
    await db.delete(schema.demoInbox);
    await db.insert(schema.demoInbox).values({ messageId: "<alert-gen-4001@lavorosereno.example>", raw, receivedAt: NOW });
    const s = await scanMailbox(db, new DemoMailbox(db), [L], new Date(NOW.getTime() + 1000));
    expect(s.replies).toBe(0);
    expect(s.alerts).toBe(1);
  });

  it("digest counts match direct database queries", async () => {
    const db = await freshDb();
    const { L } = await seedPeople(db, NOW);
    const c = await digestCounts(db, L, NOW);
    const since = NOW.getTime() - 86400000;
    const all = await db.select({ j: schema.jobs, v: schema.userJobs }).from(schema.userJobs).innerJoin(schema.jobs, eq(schema.jobs.id, schema.userJobs.jobId)).where(eq(schema.userJobs.userId, L));
    expect(c.newJobs).toBe(all.filter(({ j, v }) => j.firstSeenAt.getTime() >= since && v.level !== "poco" && v.status !== "dismissed").length);
    expect(c.ready).toBe((await db.select().from(schema.applications).where(sql`${schema.applications.userId} = ${L} and ${schema.applications.status} = 'draft'`)).length);
    expect(c.replies).toBe((await db.select().from(schema.replies).where(eq(schema.replies.userId, L))).filter((r) => r.receivedAt.getTime() >= since).length);
  });
});

describe("break it on purpose: alert e-mails", () => {
  it("malformed and empty e-mails do not crash and yield no jobs", async () => {
    const garbage = await parseRawEmail("this is not an e-mail at all \u0000\u0001");
    expect(parseAlert(garbage).jobs).toEqual([]);
    const empty = await parseRawEmail("");
    expect(parseAlert(empty).jobs).toEqual([]);
  });
  it("an alert with 200 jobs is parsed completely", async () => {
    const cards = Array.from({ length: 200 }, (_, i) => `<table><tr><td><a href="https://www.linkedin.com/comm/jobs/view/${4100000000 + i}/">Impiegata ${i}</a><p>Azienda ${i} · Torino, Piemonte, Italia</p></td></tr></table>`).join("");
    const e = await parseRawEmail(`From: LinkedIn <jobalerts-noreply@linkedin.com>\r\nSubject: 200 offerte\r\nMessage-ID: <big@x>\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<html><body>${cards}</body></html>`);
    const r = parseAlert(e);
    expect(r.jobs).toHaveLength(200);
    expect(r.jobs[199]).toMatchObject({ title: "Impiegata 199", company: "Azienda 199" });
  });
});
