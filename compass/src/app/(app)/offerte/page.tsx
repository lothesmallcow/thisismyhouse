import Link from "next/link";
import { Flash } from "@/components/flash";
import { IconPlus, IconSearch, IconSliders } from "@/components/icons";
import { JobCard } from "@/components/job-card";
import { Empty, LinkButton, PageHeader } from "@/components/ui";
import { CONTRACT_LABELS, SECTORS } from "@/lib/core/extract";
import type { Level } from "@/lib/core/rank";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { defaultFilters, listJobs, PAGE_SIZE, type JobFilters } from "@/lib/server/jobs";
import { getProfile } from "@/lib/server/profile";
import { getSettings } from "@/lib/server/settings";
import { saveDefaultFiltersAction } from "../actions";

export const metadata = { title: "Offerte" };

const PLURAL: Record<Level, string> = { molto: "Molto adatte", adatta: "Adatte", poco: "Poco adatte" };
const FILTER_KEYS = ["km", "netto", "orario", "contratto", "settore", "casa", "giorni", "q", "tipo", "vista"] as const;

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function OffertePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const profile = await getProfile(db, user.id);
  const settings = await getSettings(db);

  // The questionnaire's defaults apply until the person touches a filter (or asks for everything).
  const touched = FILTER_KEYS.some((k) => one(sp[k])) || one(sp.tutte) === "1";
  const defaults = touched ? {} : defaultFilters(profile);
  const vista = one(sp.vista) || (defaults.focus ?? "tutte");
  const filters: JobFilters = {
    ...defaults,
    maxKm: Number(one(sp.km)) || undefined,
    minNetMonthly: Number(one(sp.netto)) || defaults.minNetMonthly,
    hours: (one(sp.orario) as "full" | "part") || undefined,
    contract: one(sp.contratto) || undefined,
    sector: one(sp.settore) || undefined,
    remote: one(sp.casa) === "1" || undefined,
    days: Number(one(sp.giorni)) || undefined,
    q: one(sp.q) || undefined,
    type: (one(sp.tipo) as JobFilters["type"]) || undefined,
    focus: vista === "aziende" || vista === "preferite" ? vista : undefined,
    show: one(sp.mostra) === "scartate" ? "scartate" : undefined,
  };
  const limit = Math.min(200, Math.max(PAGE_SIZE, Number(one(sp.n)) || PAGE_SIZE));
  const { jobs, total } = await listJobs(db, user.id, filters, limit);
  const active = (["maxKm", "minNetMonthly", "hours", "contract", "sector", "remote", "days", "type"] as const).filter((k) => filters[k] !== undefined).length;
  const [{ n: newCount }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.userJobs)
    .where(and(eq(schema.userJobs.userId, user.id), eq(schema.userJobs.status, "new")));

  const keep = (extra: Record<string, string>) => {
    const p = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (v && k !== "msg" && k !== "n" ? [[k, one(v)]] : [])));
    for (const [k, v] of Object.entries(extra)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return `/offerte?${p}`;
  };
  const headings = jobs.map((j, i) => (!filters.show && (i === 0 || jobs[i - 1].level !== j.level) ? PLURAL[j.level] : null));
  const isStage = profile.track === "stage";
  const views = [
    { key: "tutte", label: "Tutte", hint: "Tutte le offerte, con più peso alle tue scelte" },
    { key: "preferite", label: "Le mie scelte", hint: "Solo aziende e settori che hai scelto" },
    { key: "aziende", label: "Solo aziende scelte", hint: "Solo le aziende che hai scelto" },
  ];

  return (
    <>
      <Flash code={sp.msg} />
      <PageHeader
        title={isStage ? "Stage per te" : "Offerte per te"}
        description={
          settings.lastIngestAt && Number(newCount) === 0
            ? "Nessuna offerta nuova oggi: ricontrollo domani mattina."
            : `${Number(newCount)} ${Number(newCount) === 1 ? "nuova" : "nuove"} da guardare. Le più adatte sono in alto.`
        }
        actions={
          <LinkButton href="/offerte/aggiungi" variant="secondary" size="sm">
            <IconPlus size={16} /> Aggiungi a mano
          </LinkButton>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Quali offerte" className="inline-flex rounded-lg border border-line bg-surface p-0.5">
          {views.map((v) => (
            <Link
              key={v.key}
              href={keep({ vista: v.key, tutte: v.key === "tutte" ? "1" : "" })}
              title={v.hint}
              aria-current={vista === v.key ? "true" : undefined}
              className={`inline-flex h-8 items-center rounded-md px-3 text-[13px] no-underline ${vista === v.key ? "bg-primary font-medium text-on-primary" : "text-muted hover:text-ink"}`}
            >
              {v.label}
            </Link>
          ))}
        </div>
        <form method="get" className="relative w-full sm:w-72">
          <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <label htmlFor="q" className="sr-only">
            Cerca per ruolo o azienda
          </label>
          <input id="q" name="q" type="search" defaultValue={filters.q} placeholder="Ruolo o azienda" className="!pl-9" />
          {Object.entries(sp).map(([k, v]) => (v && !["q", "msg", "n"].includes(k) ? <input key={k} type="hidden" name={k} value={one(v)} /> : null))}
        </form>
      </div>

      {(active > 0 || filters.focus) && (
        <p className="-mt-2 mb-2 text-right text-[13px]">
          <Link href="/offerte?tutte=1">Azzera filtri e vista</Link>
        </p>
      )}
      <details className="mb-6 rounded-[var(--radius-card)] border border-line bg-surface" open={active > 0 && touched}>
        <summary className="flex h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[14px]">
          <span className="inline-flex items-center gap-2 font-medium">
            <IconSliders size={16} /> Filtri{active ? ` · ${active} ${active === 1 ? "attivo" : "attivi"}` : ""}
            {!touched && (defaults.minNetMonthly || defaults.focus) ? <span className="font-normal text-faint">(i tuoi predefiniti)</span> : null}
          </span>
          <span aria-hidden="true" className="text-faint">▾</span>
        </summary>
        <form method="get" className="grid grid-cols-1 gap-4 border-t border-line p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="vista" value={vista} />
          {filters.q && <input type="hidden" name="q" value={filters.q} />}
          <label className="space-y-1.5">
            <span className="block text-[13px] font-medium">{isStage ? "Rimborso minimo al mese (netto)" : "Stipendio minimo al mese (netto)"}</span>
            <input name="netto" type="text" inputMode="numeric" placeholder="Es. 1300" defaultValue={filters.minNetMonthly ?? ""} />
          </label>
          <label className="space-y-1.5">
            <span className="block text-[13px] font-medium">Distanza</span>
            <select name="km" defaultValue={one(sp.km)}>
              <option value="">Qualsiasi (profilo: {profile.maxKm} km)</option>
              {[5, 10, 15, 20, 30, 50].map((k) => (
                <option key={k} value={k}>
                  Fino a {k} km
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="block text-[13px] font-medium">Tipo</span>
            <select name="tipo" defaultValue={one(sp.tipo)}>
              <option value="">Tutti</option>
              <option value="lavoro">Lavoro</option>
              <option value="stage">Stage</option>
              <option value="programma">Programmi per studenti</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="block text-[13px] font-medium">Contratto</span>
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
          <label className="space-y-1.5">
            <span className="block text-[13px] font-medium">Orario</span>
            <select name="orario" defaultValue={one(sp.orario)}>
              <option value="">Qualsiasi</option>
              <option value="full">Tempo pieno</option>
              <option value="part">Part-time</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="block text-[13px] font-medium">Settore</span>
            <select name="settore" defaultValue={one(sp.settore)}>
              <option value="">Qualsiasi</option>
              {SECTORS.map(([s]) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="block text-[13px] font-medium">Pubblicate</span>
            <select name="giorni" defaultValue={one(sp.giorni)}>
              <option value="">In qualsiasi momento</option>
              <option value="3">Ultimi 3 giorni</option>
              <option value="7">Ultima settimana</option>
              <option value="30">Ultimo mese</option>
            </select>
          </label>
          <label className="flex items-center gap-2.5 self-end pb-2.5 text-[14px]">
            <input type="checkbox" name="casa" value="1" defaultChecked={one(sp.casa) === "1"} />
            Solo da remoto o ibride
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
            <button className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-[14px] font-medium text-on-primary hover:bg-primary-hover">Applica</button>
          </div>
        </form>
        <form action={saveDefaultFiltersAction} className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-[13px] text-muted">
          <input type="hidden" name="focus" value={vista} />
          <input type="hidden" name="netto" value={filters.minNetMonthly ?? ""} />
          <span>Usa la vista e la retribuzione minima attuali ogni volta che apri Offerte.</span>
          <button className="inline-flex h-8 items-center rounded-lg border border-line-strong px-3 text-[13px] font-medium text-ink hover:bg-subtle">Salva come predefiniti</button>
        </form>
      </details>

      {jobs.length === 0 ? (
        <Empty
          title={filters.show ? "Nessuna offerta scartata" : "Nessuna offerta, per ora"}
          action={
            filters.focus ? (
              <LinkButton href="/offerte?vista=tutte&tutte=1" variant="secondary" size="sm">
                Mostra tutte le offerte
              </LinkButton>
            ) : undefined
          }
        >
          {filters.show
            ? "Quando premi “Non mi interessa” su un'offerta, la ritrovi qui."
            : filters.focus
              ? "Nessuna offerta dalle aziende o dai settori che hai scelto. Aggiungine altri in Aziende, oppure guarda tutte le offerte."
              : active
                ? "Prova a togliere qualche filtro."
                : "Le nuove offerte arrivano ogni mattina."}
        </Empty>
      ) : (
        <div className="space-y-2.5">
          {jobs.map((j, i) => (
            <div key={j.id}>
              {headings[i] && <h2 className="mb-2.5 mt-7 text-[12px] font-medium uppercase tracking-[0.08em] text-faint first:mt-0">{headings[i]}</h2>}
              <JobCard job={j} />
            </div>
          ))}
        </div>
      )}

      {total > jobs.length && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-[13px] text-faint">
            {jobs.length} di {total}
          </p>
          <LinkButton href={`${keep({})}&n=${limit + PAGE_SIZE}`} variant="secondary" size="sm" scroll={false}>
            Mostra altre 10
          </LinkButton>
        </div>
      )}

      <div className="mt-10 text-center">
        <Link href={filters.show ? "/offerte" : "/offerte?mostra=scartate"} className="inline-flex min-h-[32px] items-center text-[13px]">
          {filters.show ? "Torna alle offerte" : "Offerte scartate"}
        </Link>
      </div>
    </>
  );
}
