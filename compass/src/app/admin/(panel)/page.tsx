import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { IconStop } from "@/components/icons";
import { Button, Card, Notice, SectionTitle } from "@/components/ui";
import { effectiveDailyCap } from "@/lib/core/guardrails";
import { formatWhen } from "@/lib/core/time";
import { getDb, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { realSendingActive } from "@/lib/mail/transport";
import { sentTodayCount } from "@/lib/server/applications";
import { getSettings } from "@/lib/server/settings";
import { adminKillSwitchAction } from "../actions";

export const metadata = { title: "Admin" };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  const s = await getSettings(db);
  const notes = await db.select().from(schema.notifications).where(eq(schema.notifications.audience, "admin")).orderBy(desc(schema.notifications.createdAt)).limit(10);
  const counts = await db
    .select({ status: schema.applications.status, n: sql<number>`count(*)` })
    .from(schema.applications)
    .groupBy(schema.applications.status);
  const c = (k: string) => Number(counts.find((x) => x.status === k)?.n ?? 0);
  const [{ jobs }] = await db.select({ jobs: sql<number>`count(*)` }).from(schema.jobs);
  const runs = await db.select().from(schema.jobRuns).orderBy(desc(schema.jobRuns.startedAt)).limit(6);
  const real = realSendingActive(s.realSending);
  const stat = (label: string, value: string | number, sub?: string) => (
    <Card className="!p-5">
      <p className="text-[0.92rem] font-bold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 font-serif text-[2.2rem] font-semibold leading-none">{value}</p>
      {sub && <p className="mt-1 text-[0.95rem] text-ink-soft">{sub}</p>}
    </Card>
  );
  return (
    <>
      <Flash code={sp.msg} />
      <h1 className="text-[2.2rem] font-semibold">Panoramica</h1>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stat("Offerte in archivio", Number(jobs))}
        {stat("Da inviare", c("draft"), `${c("queued")} in coda`)}
        {stat("Inviate oggi", await sentTodayCount(db), `limite oggi: ${effectiveDailyCap(s.guardrails, new Date())}`)}
        {stat("Risposte", c("replied") + c("interview") + c("offer") + c("rejected"), `${c("interview")} colloqui`)}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="font-bold">Stato degli invii</p>
          <ul className="mt-2 space-y-1 text-[1rem]">
            <li>DEMO_MODE: <strong>{env.demoMode ? "true (simulato)" : "false"}</strong></li>
            <li>Invio reale (interruttore admin): <strong>{s.realSending ? "acceso" : "spento"}</strong></li>
            <li>Casella configurata: <strong>{env.mailbox.configured ? "sì" : "no"}</strong></li>
            <li>Risultato: <strong>{real ? "le e-mail partono davvero" : "le e-mail finiscono nell'outbox (simulate)"}</strong></li>
            <li>Pilota automatico: <strong>{s.guardrails.autopilot ? "acceso" : "spento"}</strong></li>
            <li>Ultima raccolta: <strong>{s.lastIngestAt ? formatWhen(new Date(s.lastIngestAt)) : "mai"}</strong></li>
          </ul>
          <Link href="/admin/invii" className="mt-3 inline-block font-bold">
            Regole di invio
          </Link>
        </Card>
        <Card className={s.guardrails.adminKillSwitch || s.guardrails.killSwitch ? "border-rose-ink/40 bg-rose/50" : ""}>
          <p className="font-bold">Ferma tutti gli invii</p>
          <p className="mt-1 text-ink-soft">Blocca subito ogni invio, anche quelli in coda (tornano in &ldquo;Da inviare&rdquo;). Lei non può togliere questo blocco.</p>
          {s.guardrails.killSwitch && <p className="mt-2 font-bold text-rose-ink">Anche lei ha fermato gli invii dalla sua app.</p>}
          <form action={adminKillSwitchAction} className="mt-4">
            <input type="hidden" name="on" value={s.guardrails.adminKillSwitch ? "0" : "1"} />
            <Button variant={s.guardrails.adminKillSwitch ? "primary" : "danger"} wide>
              <IconStop /> {s.guardrails.adminKillSwitch ? "Togli il blocco dell'amministratore" : "Ferma tutti gli invii"}
            </Button>
          </form>
        </Card>
      </div>

      <SectionTitle>Backup</SectionTitle>
      <div className="flex flex-wrap gap-3">
        {[
          ["jobs", "Offerte (CSV)"],
          ["applications", "Candidature (CSV)"],
          ["sendlog", "Registro invii (CSV)"],
        ].map(([k, l]) => (
          <a key={k} href={`/api/export/${k}`} download className="inline-flex min-h-[48px] items-center rounded-xl border-2 border-navy px-4 font-bold no-underline">
            Scarica {l}
          </a>
        ))}
      </div>

      <SectionTitle>Avvisi per te</SectionTitle>
      {notes.length === 0 ? (
        <p className="text-ink-soft">Nessun avviso. Le fonti funzionano.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <Notice key={n.id} tone="warn">
              {formatWhen(n.createdAt)}: {n.text} {n.href && <Link href={n.href}>Apri</Link>}
            </Notice>
          ))}
        </div>
      )}

      <SectionTitle>Ultime esecuzioni programmate</SectionTitle>
      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full text-left text-[0.98rem]">
          <thead className="bg-paper">
            <tr>
              <th className="px-4 py-2">Lavoro</th>
              <th className="px-4 py-2">Quando</th>
              <th className="px-4 py-2">Esito</th>
              <th className="px-4 py-2">Riepilogo</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-t border-line align-top">
                <td className="px-4 py-2 font-bold">{r.job}</td>
                <td className="px-4 py-2">{formatWhen(r.startedAt)}</td>
                <td className="px-4 py-2">{r.ok == null ? "in corso" : r.ok ? "ok" : "errore"}</td>
                <td className="max-w-[420px] break-words px-4 py-2 font-mono text-[0.8rem] text-ink-soft">{r.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
