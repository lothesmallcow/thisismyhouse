import Link from "next/link";
import { Flash } from "@/components/flash";
import { IconPlus } from "@/components/icons";
import { JobCard } from "@/components/job-card";
import { Empty, LinkButton, PageHeader } from "@/components/ui";
import { CONTRACT_LABELS, SECTORS } from "@/lib/core/extract";
import type { Level } from "@/lib/core/rank";

const PLURAL: Record<Level, string> = { molto: "Molto adatte", adatta: "Adatte", poco: "Poco adatte" };
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { listJobs, PAGE_SIZE, type JobFilters } from "@/lib/server/jobs";
import { getProfile } from "@/lib/server/profile";
import { getSettings } from "@/lib/server/settings";

export const metadata = { title: "Offerte" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function OffertePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const db = getDb();
  const filters: JobFilters = {
    maxKm: Number(one(sp.km)) || undefined,
    minSalary: Number(one(sp.paga)) || undefined,
    hours: (one(sp.orario) as "full" | "part") || undefined,
    contract: one(sp.contratto) || undefined,
    sector: one(sp.settore) || undefined,
    remote: one(sp.casa) === "1" || undefined,
    days: Number(one(sp.giorni)) || undefined,
    show: one(sp.mostra) === "scartate" ? "scartate" : undefined,
  };
  const limit = Math.min(200, Math.max(PAGE_SIZE, Number(one(sp.n)) || PAGE_SIZE));
  const { jobs, total } = await listJobs(db, filters, limit);
  const profile = await getProfile(db);
  const settings = await getSettings(db);
  const active = Object.entries(filters).filter(([k, v]) => k !== "show" && v !== undefined).length;
  // Across all offers, not just the filtered page.
  const [{ n: newToday }] = await db.select({ n: sql<number>`count(*)` }).from(schema.jobs).where(eq(schema.jobs.status, "new"));

  const nextParams = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (v && k !== "msg" ? [[k, one(v)]] : [])));
  nextParams.set("n", String(limit + PAGE_SIZE));

  // A heading before the first job of each level.
  const headings = jobs.map((j, i) => (!filters.show && (i === 0 || jobs[i - 1].level !== j.level) ? PLURAL[j.level] : null));
  return (
    <>
      <Flash code={sp.msg} />
      <PageHeader title="Offerte per te" help="Qui trovi le offerte di lavoro scelte per te, le più adatte in alto. Tocca un'offerta per leggerla e candidarti." />

      {settings.lastIngestAt && Number(newToday) === 0 && !filters.show && active === 0 && (
        <p className="mb-5 rounded-2xl bg-card px-4 py-3 text-ink-soft border border-line">Nessuna offerta nuova oggi, ricontrollo domani mattina.</p>
      )}

      <details className="mb-6 rounded-[var(--radius-card)] border border-line bg-card shadow-[var(--shadow-card)]" open={active > 0}>
        <summary className="flex min-h-[60px] cursor-pointer items-center justify-between gap-3 px-5 text-[1.08rem] font-bold text-navy">
          <span>Filtra le offerte{active ? ` (${active} ${active === 1 ? "filtro attivo" : "filtri attivi"})` : ""}</span>
          <span aria-hidden="true" className="text-2xl leading-none">▾</span>
        </summary>
        <form method="get" className="grid gap-5 border-t border-line px-5 py-5 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="block font-bold">Distanza massima</span>
            <select name="km" defaultValue={one(sp.km)}>
              <option value="">Qualsiasi ({profile.maxKm} km dal tuo profilo)</option>
              {[5, 10, 15, 20, 30, 50].map((k) => (
                <option key={k} value={k}>
                  Fino a {k} km
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="block font-bold">Stipendio almeno</span>
            <select name="paga" defaultValue={one(sp.paga)}>
              <option value="">Qualsiasi</option>
              {[18000, 22000, 25000, 28000, 32000].map((p) => (
                <option key={p} value={p}>
                  {p.toLocaleString("it-IT")} € lordi l&apos;anno
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="block font-bold">Orario</span>
            <select name="orario" defaultValue={one(sp.orario)}>
              <option value="">Qualsiasi</option>
              <option value="full">Tempo pieno</option>
              <option value="part">Part-time</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="block font-bold">Contratto</span>
            <select name="contratto" defaultValue={one(sp.contratto)}>
              <option value="">Qualsiasi</option>
              {Object.entries(CONTRACT_LABELS)
                .filter(([k]) => k !== "unknown")
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="block font-bold">Settore</span>
            <select name="settore" defaultValue={one(sp.settore)}>
              <option value="">Qualsiasi</option>
              {SECTORS.map(([s]) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="block font-bold">Pubblicate</span>
            <select name="giorni" defaultValue={one(sp.giorni)}>
              <option value="">In qualsiasi momento</option>
              <option value="3">Negli ultimi 3 giorni</option>
              <option value="7">Nell&apos;ultima settimana</option>
              <option value="30">Nell&apos;ultimo mese</option>
            </select>
          </label>
          <label className="flex min-h-[60px] items-center gap-4 rounded-2xl border-2 border-line bg-white px-4 sm:col-span-2">
            <input type="checkbox" name="casa" value="1" defaultChecked={one(sp.casa) === "1"} />
            <span>Solo offerte da casa o in parte da casa</span>
          </label>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button className="inline-flex min-h-[58px] items-center rounded-2xl bg-navy px-6 font-bold text-white hover:bg-navy-strong">Mostra le offerte</button>
            {active > 0 && (
              <Link href="/offerte" className="inline-flex min-h-[58px] items-center rounded-2xl border-2 border-navy px-6 font-bold no-underline">
                Togli i filtri
              </Link>
            )}
          </div>
        </form>
      </details>

      {jobs.length === 0 ? (
        <Empty title={filters.show ? "Nessuna offerta scartata" : "Nessuna offerta, per ora"}>
          {filters.show
            ? "Quando premi “Non mi interessa” su un'offerta, la ritrovi qui."
            : active
              ? "Prova a togliere qualche filtro."
              : "Appena arrivano nuove offerte le trovi qui. Ricontrollo ogni mattina."}
        </Empty>
      ) : (
        <div className="space-y-5">
          {jobs.map((j, i) => (
            <div key={j.id}>
              {headings[i] && <h2 className="mb-3 mt-8 text-[1.45rem] font-semibold first:mt-0">{headings[i]}</h2>}
              <JobCard job={j} />
            </div>
          ))}
        </div>
      )}

      {total > jobs.length && (
        <div className="mt-8 text-center">
          <p className="mb-3 text-ink-soft">
            Ne vedi {jobs.length} su {total}.
          </p>
          <LinkButton href={`/offerte?${nextParams}`} variant="secondary" scroll={false}>
            Mostra altre 10
          </LinkButton>
        </div>
      )}

      <div className="mt-12 grid gap-3 sm:grid-cols-2">
        <LinkButton href="/offerte/aggiungi" variant="secondary">
          <IconPlus /> Aggiungi un&apos;offerta a mano
        </LinkButton>
        <LinkButton href={filters.show ? "/offerte" : "/offerte?mostra=scartate"} variant="quiet">
          {filters.show ? "Torna alle offerte" : "Vedi le offerte che hai scartato"}
        </LinkButton>
      </div>
    </>
  );
}
