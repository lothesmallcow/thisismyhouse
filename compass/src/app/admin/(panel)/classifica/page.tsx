import { desc, eq } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { Button, Card, SectionTitle } from "@/components/ui";
import { THRESHOLDS } from "@/lib/core/rank";
import { formatDate } from "@/lib/core/time";
import { getDb, schema } from "@/lib/db";
import { getProfile } from "@/lib/server/profile";
import { rankPrefs } from "@/lib/server/catalog";
import { toggleAdjustmentAction } from "../../actions";
import { PersonTabs, pickPerson } from "../person";

export const metadata = { title: "Classifica" };

export default async function ClassificaPage({ searchParams }: { searchParams: Promise<{ msg?: string; u?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  const { list, current } = await pickPerson(sp.u);
  const uid = current?.id ?? 0;
  const adj = await db.select().from(schema.rankAdjustments).where(eq(schema.rankAdjustments.userId, uid)).orderBy(desc(schema.rankAdjustments.createdAt));
  const p = await getProfile(db, uid);
  const prefs = await rankPrefs(db, uid);
  const sample = await db
    .select({ id: schema.jobs.id, title: schema.jobs.title, company: schema.jobs.company, score: schema.userJobs.score, level: schema.userJobs.level, factors: schema.userJobs.factors })
    .from(schema.userJobs)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.userJobs.jobId))
    .where(eq(schema.userJobs.userId, uid))
    .orderBy(desc(schema.userJobs.score))
    .limit(12);
  return (
    <>
      <Flash code={sp.msg} />
      <h1 className="text-[22px] font-semibold">Classifica</h1>
      <p className="mt-2 max-w-3xl text-muted">
        Il punteggio è una somma di regole con nome (ruolo, distanza, stipendio, orario, contratto, recenza, lingue, cose da evitare, truffe). Soglie: Molto adatta ≥ {THRESHOLDS.molto}, Adatta ≥ {THRESHOLDS.adatta}.
      </p>

      <div className="mt-4"><PersonTabs list={list} current={current} path="/admin/classifica" /></div>
      <SectionTitle>Correzioni da &ldquo;Non mi interessa&rdquo;</SectionTitle>
      {adj.length === 0 && <p className="text-muted">Nessuna correzione per ora.</p>}
      <div className="space-y-2">
        {adj.map((a) => (
          <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3 !p-4">
            <div>
              <p className={a.active ? "font-semibold" : "font-semibold text-muted line-through"}>{a.label}</p>
              <p className="text-[13px] text-muted">
                {formatDate(a.createdAt)} · tipo {a.kind} · valore &ldquo;{a.value}&rdquo;
              </p>
            </div>
            <form action={toggleAdjustmentAction}>
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="active" value={a.active ? "0" : "1"} />
              <input type="hidden" name="u" value={uid} />
              <Button variant="secondary">{a.active ? "Annulla questa correzione" : "Riattiva"}</Button>
            </form>
          </Card>
        ))}
      </div>

      <SectionTitle>Profilo usato</SectionTitle>
      <Card className="text-[13.5px]">
        <p>Ruoli: {p.roles.join(", ") || "-"} · Sinonimi: {p.synonyms.join(", ") || "-"}</p>
        <p>
          Casa: {p.city || "-"} · raggio {p.maxKm} km · da casa {p.remoteOk ? "sì" : "no"} · orario {p.hours}
        </p>
        <p>Percorso: {p.track} · focus {p.focus}{p.focusCompaniesOnly ? " (solo aziende)" : ""}</p>
        <p>Aziende scelte: {prefs.likedCompanies.map((c) => c.name).join(", ") || "-"}</p>
        <p>Settori scelti: {prefs.likedSectors.map((c) => c.name).join(", ") || "-"}</p>
        <p>Stipendio minimo: {p.minNetMonthly ? `${p.minNetMonthly} € netti/mese ≈ ${p.minGrossAnnualEstimate} € lordi/anno (stima)` : "-"}</p>
      </Card>

      <SectionTitle>Le prime 12 offerte, con il dettaglio</SectionTitle>
      <div className="space-y-3">
        {sample.map((j) => (
          <Card key={j.id} className="!p-4">
            <p className="font-semibold">
              {j.title} · {j.company} <span className="font-normal text-muted">({j.score} punti, {j.level})</span>
            </p>
            <p className="mt-1 font-mono text-[11.5px] text-muted">{j.factors.map((f) => `${f.key} ${f.points > 0 ? "+" : ""}${f.points}`).join(" · ")}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
