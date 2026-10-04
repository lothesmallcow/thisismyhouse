import { Card, SectionTitle } from "@/components/ui";
import { SOURCE_LABELS } from "@/lib/core/normalize";
import { getDb } from "@/lib/db";
import { computeMetrics } from "@/lib/server/metrics";
import Link from "next/link";
import { people } from "../person";

export const metadata = { title: "Metriche" };

const LANE = { email: "Invio via e-mail (Lane 1)", curated: "Curata con Claude (Lane 2)", site: "Sul sito (Lane 3)" } as Record<string, string>;

export default async function MetrichePage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const sp = await searchParams;
  const list = await people();
  const current = list.find((p) => p.id === Number(sp.u)) ?? null;
  const m = await computeMetrics(getDb(), current?.id);
  const max = Math.max(1, ...m.jobsBySource.map((s) => s.jobs));
  const it1 = (n: number) => n.toLocaleString("it-IT", { maximumFractionDigits: 1 });
  const h = (x: number | null) => (x == null ? "-" : x < 48 ? `${it1(x)} ore` : `${it1(x / 24)} giorni`);
  const kpi = (label: string, value: string, note?: string) => (
    <Card className="!p-5">
      <p className="text-[12.5px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-[22px] font-semibold leading-none tabular-nums">{value}</p>
      {note && <p className="mt-1 text-[12.5px] text-muted">{note}</p>}
    </Card>
  );
  return (
    <>
      <h1 className="text-[22px] font-semibold">Metriche</h1>
      <p className="mt-2 max-w-3xl text-muted">Calcolate dai dati grezzi, non stimate. Gli invii in modalità prova sono contati a parte e non entrano tra quelli reali.</p>
      <div role="group" aria-label="Persona" className="mt-4 inline-flex flex-wrap rounded-lg border border-line bg-surface p-0.5">
        {[{ id: 0, name: "Tutti", email: "" }, ...list].map((p) => (
          <Link
            key={p.id}
            href={p.id ? `/admin/metriche?u=${p.id}` : "/admin/metriche"}
            aria-current={(current?.id ?? 0) === p.id ? "true" : undefined}
            className={`inline-flex h-8 items-center rounded-md px-3 text-[13px] no-underline ${(current?.id ?? 0) === p.id ? "bg-primary font-medium text-on-primary" : "text-muted hover:text-ink"}`}
          >
            {p.name || p.email}
          </Link>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpi("Offerte trovate", String(m.jobsTotal))}
        {kpi("Candidature e-mail reali", String(m.emailSent), `${m.emailSimulated} simulate`)}
        {kpi("Tasso di risposta (invii reali)", m.replyRate == null ? "-" : `${Math.round(m.replyRate * 100)}%`, `${m.replies} risposte, ${m.interviews} colloqui${m.simulatedReplyRate != null ? ` · in prova: ${Math.round(m.simulatedReplyRate * 100)}%` : ""}`)}
        {kpi("Dalla pubblicazione alla candidatura", h(m.medianHoursPostingToApplication), `mediana · da quando l'ha trovata: ${h(m.medianHoursFirstSeenToApplication)}`)}
      </div>

      <SectionTitle>Offerte trovate per fonte</SectionTitle>
      <Card>
        <ul className="space-y-3">
          {m.jobsBySource.map((s) => (
            <li key={s.source}>
              <div className="flex justify-between gap-3 text-[13.5px]">
                <span>
                  {SOURCE_LABELS[s.source] ?? s.source} <span className="text-muted">({s.source})</span>
                </span>
                <span className="font-semibold tabular-nums">{s.jobs}</span>
              </div>
              <div className="mt-1 h-3 rounded-full bg-subtle">
                <div className="h-3 rounded-full bg-accent" style={{ width: `${(s.jobs / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12.5px] text-muted">Un&apos;offerta trovata da due fonti conta per entrambe.</p>
      </Card>

      <SectionTitle>Candidature per canale</SectionTitle>
      <Card>
        <ul className="space-y-2">
          {m.applicationsByLane.length === 0 && <li className="text-muted">Nessuna candidatura ancora.</li>}
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
