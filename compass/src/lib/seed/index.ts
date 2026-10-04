// Seeding: catalog and first accounts (always), demo data (demo mode). Used by scripts/seed.ts and tests.
// Two demo people show both modes: Lucia (job search) and Marco (internships, with catalog choices).
import fs from "node:fs";
import path from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { findPlace } from "../core/geo";
import type { DB } from "../db";
import { schema } from "../db";
import type { Track } from "../db/schema";
import { setUpPerson } from "../server/accounts";
import { addCustomCompany, ensureCatalog, setPref } from "../server/catalog";
import { importFromCvText } from "../server/experiences";
import { hashPassword } from "../server/passwords";
import { updateProfile } from "../server/profile";
import { dedupeCandidates, rankContexts, rerankAll, upsertRawJob } from "../server/jobs";
import { DEMO_CV_LINES, DEMO_PROFILE, DEMO_SPONTANEOUS, DEMO_STUDENT, DEMO_STUDENT_CV_LINES, DEMO_STUDENT_PREFS, demoJobs, demoStageJobs } from "./demo-data";
import { textPdf } from "./pdf";

export async function isEmpty(db: DB): Promise<boolean> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(schema.users);
  return Number(n) === 0;
}

export interface SeedPerson {
  email: string;
  password: string;
  name: string;
  track: Track;
  mailboxKey?: string | null;
}

/** The admin account and any number of people (idempotent by e-mail). Returns the people's ids in order. */
export async function seedAccounts(db: DB, a: { admin: { email: string; password: string }; people: SeedPerson[] }): Promise<number[]> {
  await ensureCatalog(db);
  const admin = a.admin.email.toLowerCase();
  if (!(await db.query.users.findFirst({ where: eq(schema.users.email, admin) }))) {
    await db.insert(schema.users).values({ role: "admin", email: admin, name: "Admin", passwordHash: await hashPassword(a.admin.password) });
  }
  const ids: number[] = [];
  for (const p of a.people) {
    const email = p.email.toLowerCase();
    let u = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
    if (!u) {
      [u] = await db
        .insert(schema.users)
        .values({ role: "user", email, name: p.name, passwordHash: await hashPassword(p.password), mailboxKey: p.mailboxKey === undefined ? "default" : p.mailboxKey })
        .returning();
      await setUpPerson(db, u.id, p.name, p.track);
    }
    ids.push(u.id);
  }
  return ids;
}

/** Full demo dataset for Lucia (job search). `onboarded=false` leaves the questionnaire to be filled in by hand. */
export async function seedDemo(db: DB, now = new Date(), opts: { onboarded?: boolean; userId?: number; studentId?: number } = {}) {
  await ensureCatalog(db);
  const userId = opts.userId ?? (await db.query.users.findFirst({ where: and(eq(schema.users.role, "user")), orderBy: (u, { asc }) => [asc(u.id)] }))!.id;
  const home = findPlace(DEMO_PROFILE.city)!;
  await updateProfile(db, userId, {
    ...DEMO_PROFILE,
    lat: home.lat,
    lng: home.lng,
    tastes: ["ordine", "persone"],
    onboardingStep: opts.onboarded === false ? 1 : 99,
    onboardedAt: opts.onboarded === false ? null : now,
  });
  const sector = async (slug: string) => (await db.query.catalogSectors.findFirst({ where: eq(schema.catalogSectors.slug, slug) }))!.id;
  if (opts.onboarded !== false) {
    await setPref(db, userId, "sector", await sector("amministrazione"), "like");
    await setPref(db, userId, "sector", await sector("segreteria"), "like");
  }

  const pdf = textPdf(DEMO_CV_LINES, "CV Lucia Ferraro (demo)");
  await db.insert(schema.cvs).values([
    { userId, label: "CV Amministrazione", roleFamily: "Amministrazione", filename: "CV-Lucia-Ferraro-Amministrazione.pdf", size: pdf.length, data: pdf, text: DEMO_CV_LINES.join("\n"), isDefault: true },
    { userId, label: "CV Segreteria", roleFamily: "Segreteria", filename: "CV-Lucia-Ferraro-Segreteria.pdf", size: pdf.length, data: pdf, text: DEMO_CV_LINES.join("\n"), isDefault: false },
  ]);
  if (opts.onboarded !== false) await importFromCvText(db, userId, DEMO_CV_LINES.join("\n"));

  await db.insert(schema.companyWatchlist).values([
    { name: "Esempio Tech", ats: "greenhouse", slug: "esempiotech" },
    { name: "Esempio Lever", ats: "lever", slug: "esempiolever" },
  ]);
  await db.insert(schema.approvedSites).values({
    name: "Esempio Demo Spa (sito carriere)",
    startUrl: "https://careers.esempio-demo.example/lavora-con-noi",
    termsSummary: "Sito di prova per la modalità demo (non esiste davvero).",
    robotsSummary: "User-agent: * · Disallow: /area-riservata/ · Allow: /",
    approved: true,
    approvedAt: now,
  });
  await db.insert(schema.spontaneousCompanies).values(DEMO_SPONTANEOUS.map((c) => ({ ...c, userId, status: "approved" as const })));
  await db.insert(schema.blocklist).values([
    { kind: "keyword", value: "quota di iscrizione" },
    { kind: "domain", value: "guadagnifacili.example" },
  ]);

  // Demo mailboxes: the synthetic alert e-mails (the ingest job will read them). "stage-*" files go to the student's mailbox.
  const dir = path.join(process.cwd(), "fixtures/emails");
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".eml") && !f.startsWith("reply"))) {
    const raw = fs.readFileSync(path.join(dir, f), "utf8").replace(/^Date: .*$/m, `Date: ${new Date(now.getTime() - 3600000).toUTCString()}`);
    const messageId = raw.match(/^Message-ID:\s*(<[^>]+>)/im)?.[1] ?? `<${f}@demo>`;
    const mailboxKey = f.startsWith("stage-") ? "studente" : "default";
    await db.insert(schema.demoInbox).values({ messageId, raw, mailboxKey, receivedAt: new Date(now.getTime() - 3600000) }).onConflictDoNothing();
  }

  // A realistic backlog of jobs. Alert-e-mail jobs are private to their owner, like real ones.
  const cache = await dedupeCandidates(db);
  const contexts = await rankContexts(db);
  for (const j of demoJobs(now)) {
    const first = new Date(j.postedAt!.getTime() + 2 * 3600000);
    await upsertRawJob(db, j, first < now ? first : now, { cache, contexts, owners: j.source.startsWith("email:") || j.source === "manual" ? [userId] : undefined });
  }
  if (opts.studentId) await seedStudent(db, opts.studentId, now);
  await rerankAll(db, now);

  // A short history so "Candidature" and the metrics have something to show.
  const byCompany = async (company: string) => (await db.query.jobs.findFirst({ where: eq(schema.jobs.company, company) })) ?? null;
  const ferr = await byCompany("Istituto Paritario San Giorgio");
  const coop = await byCompany("Cooperativa Sociale Esempio");
  const site = await byCompany("Meccanica Valsusa Srl");
  const cv = await db.query.cvs.findFirst({ where: eq(schema.cvs.userId, userId) });
  const day = (n: number) => new Date(now.getTime() - n * 86400000);
  const applied = (jobId: number) => db.update(schema.userJobs).set({ status: "applied" }).where(and(eq(schema.userJobs.userId, userId), eq(schema.userJobs.jobId, jobId)));
  if (ferr) {
    const [a] = await db
      .insert(schema.applications)
      .values({ userId, jobId: ferr.id, lane: "email", status: "sent", company: ferr.company, role: ferr.title, toEmail: ferr.applicationEmail, subject: `Candidatura per ${ferr.title} | Lucia Ferraro`, body: "(testo di prova)", cvId: cv?.id, sentAt: day(6), messageId: "<compass.demo.1@example.com>", simulated: true, createdAt: day(6), updatedAt: day(6) })
      .returning();
    await applied(ferr.id);
    await db.insert(schema.sendLog).values({ userId, applicationId: a.id, toEmail: a.toEmail!, company: a.company, role: a.role, cvLabel: cv?.label, templateName: "Candidatura semplice", status: "simulated", detail: "Modalità prova", at: day(6) });
  }
  if (coop) {
    const [a] = await db
      .insert(schema.applications)
      .values({ userId, jobId: coop.id, lane: "email", status: "replied", company: coop.company, role: coop.title, toEmail: coop.applicationEmail, subject: `Candidatura per ${coop.title} | Lucia Ferraro`, body: "(testo di prova)", cvId: cv?.id, sentAt: day(9), replyAt: day(7), messageId: "<compass.demo.2@example.com>", simulated: true, createdAt: day(9), updatedAt: day(7) })
      .returning();
    await applied(coop.id);
    await db.insert(schema.sendLog).values({ userId, applicationId: a.id, toEmail: a.toEmail!, company: a.company, role: a.role, cvLabel: cv?.label, templateName: "Candidatura semplice", status: "simulated", detail: "Modalità prova", at: day(9) });
    await db.insert(schema.replies).values({
      userId,
      applicationId: a.id,
      fromEmail: "selezione@coopesempio.example",
      fromName: "Ufficio Personale",
      subject: "Re: Candidatura per Impiegata ufficio personale",
      snippet: "Buongiorno Lucia, grazie per la candidatura. Le proponiamo un colloquio martedì alle 9:30 presso la nostra sede.",
      matchedBy: "thread",
      suggestedStatus: "interview",
      receivedAt: day(7),
    });
  }
  if (site) {
    await db.insert(schema.applications).values({ userId, jobId: site.id, lane: "site", status: "applied_site", company: site.company, role: site.title, sentAt: day(3), createdAt: day(3), updatedAt: day(3) });
    await applied(site.id);
  }
}

/** The demo student: profile, catalog choices (including one "Altro"), CV, internships. */
export async function seedStudent(db: DB, userId: number, now = new Date()) {
  const home = findPlace(DEMO_STUDENT.city)!;
  await updateProfile(db, userId, { ...DEMO_STUDENT, lat: home.lat, lng: home.lng, track: "stage", onboardingStep: 99, onboardedAt: now });
  for (const slug of DEMO_STUDENT_PREFS.sectors) {
    const s = await db.query.catalogSectors.findFirst({ where: eq(schema.catalogSectors.slug, slug) });
    if (s) await setPref(db, userId, "sector", s.id, "like");
  }
  for (const slug of DEMO_STUDENT_PREFS.avoidSectors) {
    const s = await db.query.catalogSectors.findFirst({ where: eq(schema.catalogSectors.slug, slug) });
    if (s) await setPref(db, userId, "sector", s.id, "avoid");
  }
  for (const slug of DEMO_STUDENT_PREFS.companies) {
    const c = await db.query.catalogCompanies.findFirst({ where: eq(schema.catalogCompanies.slug, slug) });
    if (c) await setPref(db, userId, "company", c.id, "like");
  }
  for (const c of DEMO_STUDENT_PREFS.custom) {
    const s = await db.query.catalogSectors.findFirst({ where: eq(schema.catalogSectors.slug, c.sector) });
    await addCustomCompany(db, userId, { name: c.name, kind: c.kind, sectorId: s?.id ?? null, city: "Milano" }, "stage");
  }
  const pdf = textPdf(DEMO_STUDENT_CV_LINES, "CV Marco Bianchi (demo)");
  await db.insert(schema.cvs).values({ userId, label: "CV Finanza", roleFamily: "Finanza", filename: "CV-Marco-Bianchi.pdf", size: pdf.length, data: pdf, text: DEMO_STUDENT_CV_LINES.join("\n"), isDefault: true });
  await importFromCvText(db, userId, DEMO_STUDENT_CV_LINES.join("\n"));
  const cache = await dedupeCandidates(db);
  const contexts = await rankContexts(db);
  for (const j of demoStageJobs(now)) {
    await upsertRawJob(db, j, j.postedAt! < now ? j.postedAt! : now, { cache, contexts, owners: j.source.startsWith("email:") ? [userId] : undefined });
  }
}
