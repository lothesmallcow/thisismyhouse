import { desc } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { Button, Card, SectionTitle } from "@/components/ui";
import { THRESHOLDS } from "@/lib/core/rank";
import { formatDate } from "@/lib/core/time";
import { getDb, schema } from "@/lib/db";
import { getProfile } from "@/lib/server/profile";
import { toggleAdjustmentAction } from "../../actions";

export const metadata = { title: "Classifica" };

export default async function ClassificaPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  const adj = await db.select().from(schema.rankAdjustments).orderBy(desc(schema.rankAdjustments.createdAt));
  const p = await getProfile(db);
  const sample = await db.select().from(schema.jobs).orderBy(desc(schema.jobs.score)).limit(12);
  return (
    <>
      <Flash code={sp.msg} />
      <h1 className="text-[2.2rem] font-semibold">Classifica</h1>
      <p className="mt-2 max-w-3xl text-ink-soft">
        Il punteggio è una somma di regole con nome (ruolo, distanza, stipendio, orario, contratto, recenza, lingue, cose da evitare, truffe). Soglie: Molto adatta ≥ {THRESHOLDS.molto}, Adatta ≥ {THRESHOLDS.adatta}.
      </p>

      <SectionTitle>Correzioni da &ldquo;Non mi interessa&rdquo;</SectionTitle>
      {adj.length === 0 && <p className="text-ink-soft">Nessuna correzione per ora.</p>}
      <div className="space-y-2">
        {adj.map((a) => (
          <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3 !p-4">
            <div>
              <p className={a.active ? "font-bold" : "font-bold text-ink-soft line-through"}>{a.label}</p>
              <p className="text-[0.95rem] text-ink-soft">
                {formatDate(a.createdAt)} · tipo {a.kind} · valore &ldquo;{a.value}&rdquo;
              </p>
            </div>
            <form action={toggleAdjustmentAction}>
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="active" value={a.active ? "0" : "1"} />
              <Button variant="secondary">{a.active ? "Annulla questa correzione" : "Riattiva"}</Button>
            </form>
          </Card>
        ))}
      </div>

      <SectionTitle>Profilo usato</SectionTitle>
      <Card className="text-[0.98rem]">
        <p>Ruoli: {p.roles.join(", ") || "-"} · Sinonimi: {p.synonyms.join(", ") || "-"}</p>
        <p>
          Casa: {p.city || "-"} · raggio {p.maxKm} km · da casa {p.remoteOk ? "sì" : "no"} · orario {p.hours}
        </p>
        <p>Stipendio minimo: {p.minNetMonthly ? `${p.minNetMonthly} € netti/mese ≈ ${p.minGrossAnnualEstimate} € lordi/anno (stima)` : "-"}</p>
      </Card>

      <SectionTitle>Le prime 12 offerte, con il dettaglio</SectionTitle>
      <div className="space-y-3">
        {sample.map((j) => (
          <Card key={j.id} className="!p-4">
            <p className="font-bold">
              {j.title} · {j.company} <span className="font-normal text-ink-soft">({j.score} punti, {j.level})</span>
            </p>
            <p className="mt-1 font-mono text-[0.82rem] text-ink-soft">{j.factors.map((f) => `${f.key} ${f.points > 0 ? "+" : ""}${f.points}`).join(" · ")}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
