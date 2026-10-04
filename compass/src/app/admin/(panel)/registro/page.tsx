import { desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export const metadata = { title: "Registro invii" };

export default async function RegistroPage() {
  const db = getDb();
  const log = await db.select().from(schema.sendLog).orderBy(desc(schema.sendLog.at)).limit(200);
  const apps = await db.select().from(schema.applications).orderBy(desc(schema.applications.createdAt)).limit(100);
  const fmt = (d: Date | null) => (d ? d.toLocaleString("it-IT", { timeZone: "Europe/Rome" }) : "-");
  return (
    <>
      <h1 className="text-[2.2rem] font-semibold">Registro invii</h1>
      <p className="mt-2 text-ink-soft">Ogni e-mail: a chi, quando, con quale CV e quale lettera, e com&apos;è andata.</p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[860px] text-left text-[0.95rem]">
          <thead className="bg-paper">
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
                <td className="px-3 py-2 font-bold">{l.status}</td>
                <td className="px-3 py-2 font-mono text-[0.8rem]">{l.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mt-10 text-[1.6rem] font-semibold">Tutte le candidature</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[860px] text-left text-[0.95rem]">
          <thead className="bg-paper">
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
                <td className="px-3 py-2 font-bold">{a.status}</td>
                <td className="px-3 py-2">{a.company}</td>
                <td className="px-3 py-2">{a.toEmail}</td>
                <td className="px-3 py-2">{fmt(a.sendAt)}</td>
                <td className="px-3 py-2">{fmt(a.sentAt)}</td>
                <td className="px-3 py-2 text-[0.85rem]">{a.warnings.map((w) => w.code).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
