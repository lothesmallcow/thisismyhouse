import Link from "next/link";
import { Flash } from "@/components/flash";
import { IconFolder, IconPlus, IconSearch, IconSliders } from "@/components/icons";
import { JobCard } from "@/components/job-card";
import { Button, Empty, LinkButton, Notice, PageHeader, PillCheck } from "@/components/ui";
import { alertsReceived } from "@/lib/server/inbox";
import { CONTRACT_LABELS, SECTORS } from "@/lib/core/extract";
import type { Level } from "@/lib/core/rank";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { defaultFilters, filterWhere, listJobs, PAGE_SIZE, type JobFilters } from "@/lib/server/jobs";
import { getProfile } from "@/lib/server/profile";
import { getSettings } from "@/lib/server/settings";
import { saveDefaultFiltersAction, searchNowAction } from "../actions";
import { SourcesCard } from "@/components/sources-card";
import { CareersLine } from "@/components/careers-line";
import { PlacesPicker } from "@/components/places-picker";
import { parsePlaceValue, placesFromProfile, type WherePlace } from "@/lib/core/where";

export const metadata = { title: "Offerte" };
// "Cerca ora" runs a search after the reply: give it time.
export const maxDuration = 60;

const PLURAL: Record<Level, string> = { molto: "Molto adatte", adatta: "Adatte", poco: "Poco adatte" };
const FILTER_KEYS = ["netto", "orario", "contratto", "settore", "casa", "giorni", "q", "tipo", "vista", "punteggio", "ordina"] as const;

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
/** Several choices allowed: undefined when none (no filter). */
const list = <T,>(v: T[]) => (v.length ? [...new Set(v)] : undefined);
const TYPE_OPTIONS = [
  ["lavoro", "Lavoro"],
  ["stage", "Stage"],
  ["programma", "Programmi per studenti"],
] as const;
/** Every query value, repeated keys included ("luogo" can appear many times). */
const pairs = (sp: SP, skip: string[]) => Object.entries(sp).flatMap(([k, v]) => (skip.includes(k) ? [] : all(v).filter(Boolean).map((x) => [k, x] as [string, string])));

export default async function OffertePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const received = await alertsReceived(getDb(), user.id);
  const db = getDb();
  const profile = await getProfile(db, user.id);
  const settings = await getSettings(db);

  // The questionnaire's defaults apply until the person touches a filter (or asks for everything).
  const touched = FILTER_KEYS.some((k) => one(sp[k])) || one(sp.tutte) === "1";
  const defaults = touched ? {} : defaultFilters(profile);
  const vista = one(sp.vista) || (defaults.focus ?? "tutte");
  // Places: the profile's until the person picks others here ("luogo" present, "-" = every place).
  const mine = placesFromProfile(profile);
  const picked = sp.luogo !== undefined;
  const places = picked ? all(sp.luogo).map(parsePlaceValue).filter((x): x is WherePlace => x != null) : mine;
  const placesRemote = picked ? all(sp.luogo).includes("remoto") : profile.remoteOk;
  const placesKey = (list: WherePlace[], remote: boolean) => [...list.map((p) => `${p.kind}|${p.country}|${p.name}`).sort(), remote ? "remoto" : ""].join(",");
  // Applying the filters with the profile's places unchanged is not a change.
  const placesChanged = picked && placesKey(places, placesRemote) !== placesKey(mine, profile.remoteOk);
  const filters: JobFilters = {
    ...defaults,
    places,
    placesRemote,
    minNetMonthly: Number(one(sp.netto)) || defaults.minNetMonthly,
    hours: (one(sp.orario) as "full" | "part") || undefined,
    contracts: list(all(sp.contratto).filter((c) => c in CONTRACT_LABELS && c !== "unknown")),
    sectors: list(all(sp.settore).filter((x) => SECTORS.some(([n]) => n === x))),
    remote: one(sp.casa) === "1" || undefined,
    days: Number(one(sp.giorni)) || undefined,
    q: one(sp.q) || undefined,
    types: list(all(sp.tipo).filter((t): t is "lavoro" | "stage" | "programma" => TYPE_OPTIONS.some(([k]) => k === t))),
    focus: vista === "aziende" || vista === "preferite" ? vista : undefined,
    show: one(sp.mostra) === "scartate" ? "scartate" : undefined,
    minFit: Number(one(sp.punteggio)) || undefined,
    sort: ["recenti", "paga", "scadenza"].includes(one(sp.ordina)) ? (one(sp.ordina) as "recenti" | "paga" | "scadenza") : undefined,
  };
  const limit = Math.min(200, Math.max(PAGE_SIZE, Number(one(sp.n)) || PAGE_SIZE));
  const { jobs, total } = await listJobs(db, user.id, filters, limit);
  const active = (placesChanged ? 1 : 0) + (["minNetMonthly", "hours", "contracts", "sectors", "remote", "days", "types", "minFit", "sort"] as const).filter((k) => filters[k] !== undefined).length;
  const [{ n: newCount }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.userJobs)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.userJobs.jobId))
    // The new ones in the places shown (the profile's, or the ones picked here).
    .where(and(filterWhere(user.id, { places, placesRemote }), eq(schema.userJobs.status, "new")));

  const keep = (extra: Record<string, string>) => {
    const p = new URLSearchParams(pairs(sp, ["msg", "n"]));
    for (const [k, v] of Object.entries(extra)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return `/offerte?${p}`;
  };
  // Level headings only when the list is in order of fit.
  const headings = jobs.map((j, i) => (!filters.show && !filters.sort && (i === 0 || jobs[i - 1].level !== j.level) ? PLURAL[j.level] : null));
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
          <div className="flex flex-wrap gap-2">
            <form action={searchNowAction}>
              <Button size="sm">
                <IconSearch size={16} /> Fai web scraping
              </Button>
            </form>
            <LinkButton href="/offerte/cartelle" variant="secondary" size="sm">
              <IconFolder size={16} /> Cartelle
            </LinkButton>
            <LinkButton href="/offerte/aggiungi" variant="secondary" size="sm">
              <IconPlus size={16} /> Aggiungi a mano
            </LinkButton>
          </div>
        }
      />

      {received.size === 0 && !filters.show && (
        <div className="mb-4">
          <Notice tone="info" title="Fai arrivare qui le offerte di LinkedIn e Indeed">
            Gli avvisi dei siti di lavoro sono la fonte più ricca. <Link href="/collega">Collega le fonti</Link>: in cinque minuti ti guido ad account, avvisi e inoltro.
          </Notice>
        </div>
      )}
      <CareersLine userId={user.id} />
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
          {pairs(sp, ["q", "msg", "n"]).map(([k, v]) => (
            <input key={`${k}=${v}`} type="hidden" name={k} value={v} />
          ))}
        </form>
      </div>

      {(active > 0 || filters.focus) && (
        <p className="-mt-2 mb-2 text-right text-[13px]">
          <Link href="/offerte?tutte=1">Azzera filtri e vista</Link>
        </p>
      )}
      <details className="mb-6 rounded-[var(--radius-card)] border border-line bg-surface" open={(active > 0 && touched) || placesChanged}>
        <summary className="flex h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[14px]">
          <span className="inline-flex items-center gap-2 font-medium">
            <IconSliders size={16} /> Filtri{active ? ` · ${active} ${active === 1 ? "attivo" : "attivi"}` : ""}
            {!touched && (defaults.minNetMonthly || defaults.focus) ? <span className="font-normal text-faint">(i tuoi predefiniti)</span> : null}
            <span className="hidden font-normal text-faint sm:inline">· {places.length ? places.map((p) => p.name).join(", ") : "tutti i luoghi"}{placesRemote && places.length ? " e da remoto" : ""}</span>
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
          <fieldset className="space-y-2 sm:col-span-2 lg:col-span-4">
            <legend className="mb-1.5 text-[13px] font-medium">Luoghi</legend>
            <input type="hidden" name="luogo" value="-" />
            <PlacesPicker
              key={places.map((p) => `${p.kind}|${p.country}|${p.name}`).join(",")}
              initial={places}
              name="luogo"
              empty="Tutti i luoghi: nessun filtro sul posto."
              hint="Partono dai luoghi del tuo profilo: cambiali qui per provare, il profilo resta com'è. Una città comprende la sua provincia. Le offerte che non dicono dove sono restano visibili."
            />
            <label className="flex min-h-11 items-center gap-2.5 text-[14px]">
              <input type="checkbox" name="luogo" value="remoto" defaultChecked={placesRemote} />
              Anche da remoto (nei paesi scelti)
            </label>
            {placesChanged && (
              <p className="text-[13px]">
                <Link href={keep({ luogo: "" })}>Torna ai luoghi del profilo</Link> · <Link href="/profilo/dove">Cambia i luoghi del profilo</Link>
              </p>
            )}
          </fieldset>
          <div className="space-y-4 sm:col-span-2 lg:col-span-4">
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium">Tipo <span className="font-normal text-faint">(anche più di uno)</span></legend>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map(([k, label]) => (
                  <PillCheck key={k} name="tipo" value={k} defaultChecked={filters.types?.includes(k)}>
                    {label}
                  </PillCheck>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium">Contratto <span className="font-normal text-faint">(anche più di uno; quelli che non lo dicono restano)</span></legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CONTRACT_LABELS)
                  .filter(([k]) => k !== "unknown")
                  .map(([k, v]) => (
                    <PillCheck key={k} name="contratto" value={k} defaultChecked={filters.contracts?.includes(k)}>
                      {v}
                    </PillCheck>
                  ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium">Settore <span className="font-normal text-faint">(anche più di uno)</span></legend>
              <div className="flex flex-wrap gap-2">
                {SECTORS.map(([name]) => (
                  <PillCheck key={name} name="settore" value={name} defaultChecked={filters.sectors?.includes(name)}>
                    {name}
                  </PillCheck>
                ))}
              </div>
            </fieldset>
            <p className="text-[12.5px] text-faint">Nessuna scelta in un gruppo = tutti.</p>
          </div>


          <label className="space-y-1.5">
            <span className="block text-[13px] font-medium">Orario</span>
            <select name="orario" defaultValue={one(sp.orario)}>
              <option value="">Qualsiasi</option>
              <option value="full">Tempo pieno</option>
              <option value="part">Part-time</option>
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
          <label className="space-y-1.5">
            <span className="block text-[13px] font-medium">Punteggio minimo</span>
            <select name="punteggio" defaultValue={one(sp.punteggio)}>
              <option value="">Qualsiasi</option>
              {[50, 60, 70, 80].map((n) => (
                <option key={n} value={n}>
                  Almeno {n}/100
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="block text-[13px] font-medium">Ordina per</span>
            <select name="ordina" defaultValue={one(sp.ordina)}>
              <option value="">Le più adatte a te</option>
              <option value="recenti">Le più recenti</option>
              <option value="paga">Le più pagate</option>
              <option value="scadenza">Scadenza più vicina</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2.5 self-end text-[14px]">
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
          <span>
            Usa la vista e la retribuzione minima attuali ogni volta che apri Offerte. Il punteggio si regola in <Link href="/profilo/punteggio">Profilo → Punteggio</Link>.
          </span>
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
      ) : null}
      {jobs.length > 0 && (
        <div className="space-y-2.5">
          {jobs.map((j, i) => (
            <div key={j.id}>
              {headings[i] && <h2 className="mb-2.5 mt-7 text-[12px] font-medium uppercase tracking-[0.08em] text-faint first:mt-0">{headings[i]}</h2>}
              <JobCard job={j} />
            </div>
          ))}
        </div>
      )}
      {!filters.show && <SourcesCard userId={user.id} />}

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
