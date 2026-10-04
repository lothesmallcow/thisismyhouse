import { Card, SectionTitle } from "@/components/ui";
import { SOURCE_LABELS } from "@/lib/core/normalize";
import { getDb } from "@/lib/db";
import { computeMetrics } from "@/lib/server/metrics";

export const metadata = { title: "Metriche" };

const LANE = { email: "Invio via e-mail (Lane 1)", curated: "Curata con Claude (Lane 2)", site: "Sul sito (Lane 3)" } as Record<string, string>;

export default async function MetrichePage() {
  const m = await computeMetrics(getDb());
  const max = Math.max(1, ...m.jobsBySource.map((s) => s.jobs));
  const it1 = (n: number) => n.toLocaleString("it-IT", { maximumFractionDigits: 1 });
  const h = (x: number | null) => (x == null ? "-" : x < 48 ? `${it1(x)} ore` : `${it1(x / 24)} giorni`);
  const kpi = (label: string, value: string, note?: string) => (
    <Card className="!p-5">
      <p className="text-[0.92rem] font-bold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 font-serif text-[2.2rem] font-semibold leading-none tabular-nums">{value}</p>
      {note && <p className="mt-1 text-[0.92rem] text-ink-soft">{note}</p>}
    </Card>
  );
  return (
    <>
      <h1 className="text-[2.2rem] font-semibold">Metriche</h1>
      <p className="mt-2 max-w-3xl text-ink-soft">Calcolate dai dati grezzi, non stimate. Gli invii in modalità prova sono contati a parte e non entrano tra quelli reali.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpi("Offerte trovate", String(m.jobsTotal))}
        {kpi("Candidature e-mail reali", String(m.emailSent), `${m.emailSimulated} simulate`)}
        {kpi("Tasso di risposta", m.replyRate == null ? "-" : `${Math.round(m.replyRate * 100)}%`, `${m.replies} risposte, ${m.interviews} colloqui`)}
        {kpi("Dalla pubblicazione alla candidatura", h(m.medianHoursPostingToApplication), `mediana · da quando l'ha trovata: ${h(m.medianHoursFirstSeenToApplication)}`)}
      </div>

      <SectionTitle>Offerte trovate per fonte</SectionTitle>
      <Card>
        <ul className="space-y-3">
          {m.jobsBySource.map((s) => (
            <li key={s.source}>
              <div className="flex justify-between gap-3 text-[0.98rem]">
                <span>
                  {SOURCE_LABELS[s.source] ?? s.source} <span className="text-ink-soft">({s.source})</span>
                </span>
                <span className="font-bold tabular-nums">{s.jobs}</span>
              </div>
              <div className="mt-1 h-3 rounded-full bg-paper-deep">
                <div className="h-3 rounded-full bg-navy" style={{ width: `${(s.jobs / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[0.92rem] text-ink-soft">Un&apos;offerta trovata da due fonti conta per entrambe.</p>
      </Card>

      <SectionTitle>Candidature per canale</SectionTitle>
      <Card>
        <ul className="space-y-2">
          {m.applicationsByLane.length === 0 && <li className="text-ink-soft">Nessuna candidatura ancora.</li>}
          {m.applicationsByLane.map((l) => (
            <li key={l.lane} className="flex justify-between">
              <span>{LANE[l.lane] ?? l.lane}</span>
              <strong className="tabular-nums">{l.total}</strong>
            </li>
          ))}
        </ul>
      </Card>

      <SectionTitle>Offerte per livello</SectionTitle>
      <Card>
        <ul className="space-y-2">
          {m.jobsByLevel.map((l) => (
            <li key={l.level} className="flex justify-between">
              <span>{l.level === "molto" ? "Molto adatta" : l.level === "adatta" ? "Adatta" : "Poco adatta"}</span>
              <strong className="tabular-nums">{l.jobs}</strong>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
