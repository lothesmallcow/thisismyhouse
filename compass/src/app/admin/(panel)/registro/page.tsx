import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { PersonTabs, pickPerson } from "../person";

export const metadata = { title: "Registro invii" };

export default async function RegistroPage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  const { list, current } = await pickPerson(sp.u);
  const uid = current?.id ?? 0;
  const log = await db.select().from(schema.sendLog).where(eq(schema.sendLog.userId, uid)).orderBy(desc(schema.sendLog.at)).limit(200);
  const apps = await db.select().from(schema.applications).where(eq(schema.applications.userId, uid)).orderBy(desc(schema.applications.createdAt)).limit(100);
  const fmt = (d: Date | null) => (d ? d.toLocaleString("it-IT", { timeZone: "Europe/Rome" }) : "-");
  return (
    <>
      <h1 className="text-[22px] font-semibold">Registro invii</h1>
      <div className="mt-4"><PersonTabs list={list} current={current} path="/admin/registro" /></div>
      <p className="text-[13.5px] text-muted">Ogni e-mail: a chi, quando, con quale CV e quale lettera, e com&apos;è andata.</p>
      <div tabIndex={0} role="region" aria-label="Contenuto scorrevole" className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[860px] text-left text-[13px]">
          <thead className="bg-subtle">
            <tr>
              {["Quando", "A", "Azienda", "Ruolo", "CV", "Lettera", "Esito", "Dettaglio"].map((h) => (
                <th key={h} className="px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {log.map((l) => (
              <tr key={l.id} className="border-t border-line align-top">
                <td className="px-3 py-2">{fmt(l.at)}</td>
                <td className="px-3 py-2">{l.toEmail}</td>
                <td className="px-3 py-2">{l.company}</td>
                <td className="px-3 py-2">{l.role}</td>
                <td className="px-3 py-2">{l.cvLabel}</td>
                <td className="px-3 py-2">{l.templateName}</td>
                <td className="px-3 py-2 font-semibold">{l.status}</td>
                <td className="px-3 py-2 font-mono text-[11.5px]">{l.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mt-10 text-[18px] font-semibold">Tutte le candidature</h2>
      <div tabIndex={0} role="region" aria-label="Contenuto scorrevole" className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[860px] text-left text-[13px]">
          <thead className="bg-subtle">
            <tr>
              {["#", "Canale", "Modo", "Stato", "Azienda", "A", "Programmata", "Inviata", "Avvisi"].map((h) => (
                <th key={h} className="px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id} className="border-t border-line align-top">
                <td className="px-3 py-2">{a.id}</td>
                <td className="px-3 py-2">{a.lane}</td>
                <td className="px-3 py-2">{a.mode}</td>
                <td className="px-3 py-2 font-semibold">{a.status}</td>
                <td className="px-3 py-2">{a.company}</td>
                <td className="px-3 py-2">{a.toEmail}</td>
                <td className="px-3 py-2">{fmt(a.sendAt)}</td>
                <td className="px-3 py-2">{fmt(a.sentAt)}</td>
                <td className="px-3 py-2 text-[12px]">{a.warnings.map((w) => w.code).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
