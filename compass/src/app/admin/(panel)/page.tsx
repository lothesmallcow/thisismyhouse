import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { Button, Card, Chip, Notice, SectionTitle, Stat } from "@/components/ui";
import { effectiveDailyCap } from "@/lib/core/guardrails";
import { formatWhen } from "@/lib/core/time";
import { getDb, schema } from "@/lib/db";
import { env, mailboxConfig } from "@/lib/env";
import { sentTodayCount } from "@/lib/server/applications";
import { listPeople } from "@/lib/server/accounts";
import { getSettings, guardrailsFor } from "@/lib/server/settings";
import { adminKillSwitchAction } from "../actions";
import { AdminTitle, Table, td, th } from "./person";

export const metadata = { title: "Admin" };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  const s = await getSettings(db);
  const notes = await db.select().from(schema.notifications).where(eq(schema.notifications.audience, "admin")).orderBy(desc(schema.notifications.createdAt)).limit(10);
  const [{ jobs }] = await db.select({ jobs: sql<number>`count(*)` }).from(schema.jobs);
  const runs = await db.select().from(schema.jobRuns).orderBy(desc(schema.jobRuns.startedAt)).limit(6);
  const ppl = await listPeople(db);
  const now = new Date();
  const rows = await Promise.all(
    ppl.map(async ({ user, track }) => {
      const count = async (status: string) =>
        Number((await db.select({ n: sql<number>`count(*)` }).from(schema.applications).where(and(eq(schema.applications.userId, user.id), eq(schema.applications.status, status as never))))[0].n);
      const [{ n: visible }] = await db.select({ n: sql<number>`count(*)` }).from(schema.userJobs).where(eq(schema.userJobs.userId, user.id));
      const g = await guardrailsFor(db, user.id, s);
      return { user, track, visible: Number(visible), drafts: await count("draft"), queued: await count("queued"), today: await sentTodayCount(db, user.id, now), cap: effectiveDailyCap(g, now), g };
    }),
  );

  return (
    <>
      <Flash code={sp.msg} />
      <AdminTitle title="Panoramica" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Offerte in archivio" value={Number(jobs)} />
        <Stat label="Persone attive" value={ppl.filter((p) => p.user.active).length} hint={`${ppl.length} in tutto`} />
        <Stat label="Da inviare" value={rows.reduce((a, r) => a + r.drafts, 0)} hint={`${rows.reduce((a, r) => a + r.queued, 0)} in coda`} />
        <Stat label="Ultima raccolta" value={s.lastIngestAt ? formatWhen(new Date(s.lastIngestAt), now) : "mai"} />
      </div>

      <SectionTitle>Persone</SectionTitle>
      <Table label="Persone" minWidth={720}>
        <thead className="border-b border-line">
          <tr>
            {["Persona", "Cerca", "Offerte", "Da inviare", "Oggi / limite", "Casella", "Stato"].map((h) => (
              <th key={h} className={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.user.id}>
              <td className={td}>
                <Link href="/admin/utenti" className="font-medium text-ink no-underline">
                  {r.user.name || r.user.email}
                </Link>
              </td>
              <td className={td}>{r.track === "stage" ? "Stage" : "Lavoro"}</td>
              <td className={`${td} tabular-nums`}>{r.visible}</td>
              <td className={`${td} tabular-nums`}>
                {r.drafts}
                {r.queued ? ` (+${r.queued} in coda)` : ""}
              </td>
              <td className={`${td} tabular-nums`}>
                {r.today} / {r.cap}
              </td>
              <td className={td}>{r.user.mailboxKey ? `${r.user.mailboxKey}${!env.demoMode && !mailboxConfig(r.user.mailboxKey) ? " (non configurata)" : ""}` : "nessuna"}</td>
              <td className={td}>
                {!r.user.active ? <Chip tone="bad">disattivato</Chip> : r.g.killSwitch ? <Chip tone="warn">invii fermati</Chip> : r.g.autopilot ? <Chip tone="accent">pilota automatico</Chip> : <Chip>ok</Chip>}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="!p-4">
          <p className="text-[14px] font-semibold">Stato degli invii</p>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1.5 text-[13px]">
            <dt className="text-muted">DEMO_MODE</dt>
            <dd>{env.demoMode ? "true (simulato)" : "false"}</dd>
            <dt className="text-muted">Interruttore invio reale</dt>
            <dd>{s.realSending ? "acceso" : "spento"}</dd>
            <dt className="text-muted">Caselle configurate</dt>
            <dd>{env.demoMode ? "demo" : env.mailboxes.map((m) => m.key).join(", ") || "nessuna"}</dd>
          </dl>
          <Link href="/admin/invii" className="mt-2 inline-flex min-h-[32px] items-center text-[13px]">
            Regole di invio
          </Link>
        </Card>
        <Card className={`!p-4 ${s.guardrails.adminKillSwitch ? "border-bad/40 bg-bad-soft" : ""}`}>
          <p className="text-[14px] font-semibold">Ferma tutti gli invii</p>
          <p className="mt-1 text-[13px] text-muted">Blocca subito ogni invio di tutte le persone (le e-mail in coda tornano in Da inviare). Solo l&apos;amministratore può togliere questo blocco.</p>
          <form action={adminKillSwitchAction} className="mt-3">
            <input type="hidden" name="on" value={s.guardrails.adminKillSwitch ? "0" : "1"} />
            <Button variant={s.guardrails.adminKillSwitch ? "primary" : "danger"} size="sm">
              {s.guardrails.adminKillSwitch ? "Togli il blocco" : "Ferma tutti gli invii"}
            </Button>
          </form>
        </Card>
      </div>

      <SectionTitle>Avvisi</SectionTitle>
      {notes.length === 0 ? (
        <p className="text-[13.5px] text-muted">Nessun avviso: le fonti funzionano.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <Notice key={n.id} tone="warn">
              {formatWhen(n.createdAt, now)}: {n.text} {n.href && <Link href={n.href}>Apri</Link>}
            </Notice>
          ))}
        </div>
      )}

      <SectionTitle
        action={
          <span className="flex gap-3 text-[12.5px]">
            {[
              ["jobs", "Offerte"],
              ["applications", "Candidature"],
              ["sendlog", "Registro"],
            ].map(([k, l]) => (
              <a key={k} href={`/api/export/${k}`} download>
                {l} CSV
              </a>
            ))}
          </span>
        }
      >
        Ultime esecuzioni
      </SectionTitle>
      <Table label="Ultime esecuzioni" minWidth={640}>
        <thead className="border-b border-line">
          <tr>
            {["Lavoro", "Quando", "Esito", "Riepilogo"].map((h) => (
              <th key={h} className={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {runs.map((r) => (
            <tr key={r.id}>
              <td className={`${td} font-medium`}>{r.job}</td>
              <td className={td}>{formatWhen(r.startedAt, now)}</td>
              <td className={td}>{r.ok == null ? "in corso" : r.ok ? "ok" : "errore"}</td>
              <td className={`${td} max-w-[420px] break-words font-mono text-[11.5px] text-muted`}>{r.summary}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
