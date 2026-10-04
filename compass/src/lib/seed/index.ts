// Seeding: first accounts (always), demo data (demo mode). Used by scripts/seed.ts and tests.
import fs from "node:fs";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { findPlace } from "../core/geo";
import { DEFAULT_TEMPLATES } from "../core/templates";
import type { DB } from "../db";
import { schema } from "../db";
import { hashPassword } from "../server/passwords";
import { updateProfile } from "../server/profile";
import { dedupeCandidates, rerankAll, upsertRawJob } from "../server/jobs";
import { DEMO_CV_LINES, DEMO_PROFILE, DEMO_SPONTANEOUS, demoJobs } from "./demo-data";
import { textPdf } from "./pdf";

export async function isEmpty(db: DB): Promise<boolean> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(schema.users);
  return Number(n) === 0;
}

export async function seedAccounts(db: DB, a: { userEmail: string; userPassword: string; adminEmail: string; adminPassword: string }) {
  for (const [role, email, pw] of [
    ["user", a.userEmail, a.userPassword],
    ["admin", a.adminEmail, a.adminPassword],
  ] as const) {
    const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email.toLowerCase()) });
    if (!existing) await db.insert(schema.users).values({ role, email: email.toLowerCase(), passwordHash: await hashPassword(pw) });
  }
}

export async function seedTemplates(db: DB) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(schema.templates);
  if (Number(n) > 0) return;
  await db.insert(schema.templates).values(DEFAULT_TEMPLATES.map((t, i) => ({ ...t, isDefault: i === 0 || t.kind === "spontaneous" })));
}

/** Full demo dataset. `onboarded=false` leaves the wizard to be filled in by hand. */
export async function seedDemo(db: DB, now = new Date(), opts: { onboarded?: boolean } = {}) {
  await seedTemplates(db);
  const home = findPlace(DEMO_PROFILE.city)!;
  await updateProfile(db, {
    ...DEMO_PROFILE,
    lat: home.lat,
    lng: home.lng,
    onboardingStep: opts.onboarded === false ? 1 : 9,
    onboardedAt: opts.onboarded === false ? null : now,
  });

  const pdf = textPdf(DEMO_CV_LINES, "CV Lucia Ferraro (demo)");
  await db.insert(schema.cvs).values([
    { label: "CV Amministrazione", roleFamily: "Amministrazione", filename: "CV-Lucia-Ferraro-Amministrazione.pdf", size: pdf.length, data: pdf, text: DEMO_CV_LINES.join("\n"), isDefault: true },
    { label: "CV Segreteria", roleFamily: "Segreteria", filename: "CV-Lucia-Ferraro-Segreteria.pdf", size: pdf.length, data: pdf, text: DEMO_CV_LINES.join("\n"), isDefault: false },
  ]);

  await db.insert(schema.companyWatchlist).values([
    { name: "Esempio Tech", ats: "greenhouse", slug: "esempiotech" },
    { name: "Esempio Lever", ats: "lever", slug: "esempiolever" },
  ]);
  await db.insert(schema.approvedSites).values({
    name: "Esempio Demo Spa (sito carriere)",
    startUrl: "https://careers.esempio-demo.example/lavora-con-noi",
    termsSummary: "Sito di prova per la modalità demo. robots.txt consente /lavora-con-noi/.",
    approved: true,
  });
  await db.insert(schema.spontaneousCompanies).values(DEMO_SPONTANEOUS.map((c) => ({ ...c, status: "approved" as const })));
  await db.insert(schema.blocklist).values([
    { kind: "keyword", value: "quota di iscrizione" },
    { kind: "domain", value: "guadagnifacili.example" },
  ]);

  // Demo mailbox: the synthetic alert e-mails (the ingest job will read them).
  const dir = path.join(process.cwd(), "fixtures/emails");
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".eml") && !f.startsWith("reply"))) {
    const raw = fs.readFileSync(path.join(dir, f), "utf8").replace(/^Date: .*$/m, `Date: ${new Date(now.getTime() - 3600000).toUTCString()}`);
    const messageId = raw.match(/^Message-ID:\s*(<[^>]+>)/im)?.[1] ?? `<${f}@demo>`;
    await db.insert(schema.demoInbox).values({ messageId, raw, receivedAt: new Date(now.getTime() - 3600000) }).onConflictDoNothing();
  }

  // A realistic backlog of jobs.
  const cache = await dedupeCandidates(db);
  for (const j of demoJobs(now)) {
    const first = new Date(j.postedAt!.getTime() + 2 * 3600000);
    await upsertRawJob(db, j, first < now ? first : now, cache);
  }
  await rerankAll(db, now);

  // A short history so "Le mie candidature" and the metrics have something to show.
  const ferr = await db.query.jobs.findFirst({ where: eq(schema.jobs.company, "Istituto Paritario San Giorgio") });
  const coop = await db.query.jobs.findFirst({ where: eq(schema.jobs.company, "Cooperativa Sociale Esempio") });
  const site = await db.query.jobs.findFirst({ where: eq(schema.jobs.company, "Meccanica Valsusa Srl") });
  const cv = await db.query.cvs.findFirst();
  const day = (n: number) => new Date(now.getTime() - n * 86400000);
  if (ferr) {
    const [a] = await db
      .insert(schema.applications)
      .values({ jobId: ferr.id, lane: "email", status: "sent", company: ferr.company, role: ferr.title, toEmail: ferr.applicationEmail, subject: `Candidatura per ${ferr.title} | Lucia Ferraro`, body: "(testo di prova)", cvId: cv?.id, sentAt: day(6), messageId: "<compass.demo.1@example.com>", simulated: true, createdAt: day(6), updatedAt: day(6) })
      .returning();
    await db.update(schema.jobs).set({ status: "applied" }).where(eq(schema.jobs.id, ferr.id));
    await db.insert(schema.sendLog).values({ applicationId: a.id, toEmail: a.toEmail!, company: a.company, role: a.role, cvLabel: cv?.label, templateName: "Candidatura semplice", status: "simulated", detail: "Modalità prova", at: day(6) });
  }
  if (coop) {
    const [a] = await db
      .insert(schema.applications)
      .values({ jobId: coop.id, lane: "email", status: "replied", company: coop.company, role: coop.title, toEmail: coop.applicationEmail, subject: `Candidatura per ${coop.title} | Lucia Ferraro`, body: "(testo di prova)", cvId: cv?.id, sentAt: day(9), replyAt: day(7), messageId: "<compass.demo.2@example.com>", simulated: true, createdAt: day(9), updatedAt: day(7) })
      .returning();
    await db.update(schema.jobs).set({ status: "applied" }).where(eq(schema.jobs.id, coop.id));
    await db.insert(schema.sendLog).values({ applicationId: a.id, toEmail: a.toEmail!, company: a.company, role: a.role, cvLabel: cv?.label, templateName: "Candidatura semplice", status: "simulated", detail: "Modalità prova", at: day(9) });
    await db.insert(schema.replies).values({
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
    await db.insert(schema.applications).values({ jobId: site.id, lane: "site", status: "applied_site", company: site.company, role: site.title, sentAt: day(3), createdAt: day(3), updatedAt: day(3) });
    await db.update(schema.jobs).set({ status: "applied" }).where(eq(schema.jobs.id, site.id));
  }
}
