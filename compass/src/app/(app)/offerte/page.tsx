import Link from "next/link";
import { redirect } from "next/navigation";
import { Flash } from "@/components/flash";
import {
  IconFolder,
  IconPlus,
  IconSearch,
  IconSliders,
} from "@/components/icons";
import { JobCard } from "@/components/job-card";
import {
  Empty,
  LinkButton,
  Notice,
  PageHeader,
  PillCheck,
} from "@/components/ui";
import { alertsReceived } from "@/lib/server/inbox";
import { CONTRACT_LABELS, SECTORS } from "@/lib/core/extract";
import type { Level } from "@/lib/core/rank";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { filterWhere, listJobs, PAGE_SIZE } from "@/lib/server/jobs";
import {
  activeFilters,
  all,
  filtersFromParams,
  one,
  searchAddress,
  TYPE_OPTIONS,
  type SP,
} from "@/lib/server/offer-filters";
import { jobsByIds, runSearch } from "@/lib/server/search";
import { listSaved } from "@/lib/server/saved-searches";
import { SearchUnderstood } from "@/components/search-understood";
import {
  BENEFIT_LABELS,
  EDUCATION_LABELS,
  SENIORITY_LABELS,
} from "@/lib/core/job-facts";
import { getProfile } from "@/lib/server/profile";
import { getSettings } from "@/lib/server/settings";
import {
  dismissQuietAction,
  saveDefaultFiltersAction,
  saveSearchAction,
  searchNowAction,
} from "../actions";
import { ScanButton, ScanMeta } from "@/components/scan-button";
import { getScanStatus } from "@/lib/server/plans";
import { SourcesCard } from "@/components/sources-card";
import { CareersLine } from "@/components/careers-line";
import { PlacesPicker } from "@/components/places-picker";

export const metadata = { title: "Offerte" };
// "Cerca ora" runs a search after the reply: give it time.
export const maxDuration = 60;

const PLURAL: Record<Level, string> = {
  molto: "Molto adatte",
  adatta: "Adatte",
  poco: "Poco adatte",
};
/** Every query value, repeated keys included ("luogo" can appear many times). */
const pairs = (sp: SP, skip: string[]) =>
  Object.entries(sp).flatMap(([k, v]) =>
    skip.includes(k)
      ? []
      : all(v)
          .filter(Boolean)
          .map((x) => [k, x] as [string, string]),
  );

export default async function OffertePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  if (one(sp.mostra) === "scartate") redirect("/offerte/non-mi-interessano"); // dismissed offers are gone: the list of dismissals
  const user = await requireUser();
  const received = await alertsReceived(getDb(), user.id);
  const db = getDb();
  const profile = await getProfile(db, user.id);
  const settings = await getSettings(db);
  const scan = await getScanStatus(db, user.id);

  // The questionnaire's defaults apply until the person touches a filter (or asks for everything).
  const {
    filters,
    touched,
    defaults,
    vista,
    places,
    placesRemote,
    placesChanged,
  } = filtersFromParams(sp, profile);
  const limit = Math.min(
    200,
    Math.max(PAGE_SIZE, Number(one(sp.n)) || PAGE_SIZE),
  );
  // A typed search: understood, matched with the full-text index, best matches first.
  const search = filters.q
    ? await runSearch(db, user.id, filters.q, filters, limit)
    : null;
  const { jobs, total } = search
    ? { jobs: await jobsByIds(db, user.id, search.ids), total: search.total }
    : await listJobs(db, user.id, filters, limit);
  const active = activeFilters(filters, placesChanged);
  const saved = await listSaved(db, user.id);
  const savedHere = Number(one(sp.salvata)) || null;
  const address = searchAddress(sp);
  const [{ n: newCount }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.userJobs)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.userJobs.jobId))
    // The new ones in the places shown (the profile's, or the ones picked here).
    .where(
      and(
        filterWhere(user.id, { places, placesRemote }),
        eq(schema.userJobs.status, "new"),
      ),
    );

  const keep = (extra: Record<string, string>) => {
    const p = new URLSearchParams(pairs(sp, ["msg", "n"]));
    for (const [k, v] of Object.entries(extra)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return `/offerte?${p}`;
  };
  // Level headings only when the list is in order of fit.
  const headings = jobs.map((j, i) =>
    !filters.show &&
    !filters.sort &&
    !search &&
    (i === 0 || jobs[i - 1].level !== j.level)
      ? PLURAL[j.level]
      : null,
  );
  const isStage = profile.track === "stage";
  const views = [
    {
      key: "tutte",
      label: "Tutte",
      hint: "Tutte le offerte, con più peso alle tue scelte",
    },
    {
      key: "preferite",
      label: "Le mie scelte",
      hint: "Solo aziende e settori che hai scelto",
    },
    {
      key: "aziende",
      label: "Solo aziende scelte",
      hint: "Solo le aziende che hai scelto",
    },
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
          <div className="flex flex-col items-start gap-1.5">
            <div className="flex flex-wrap gap-2">
              <ScanButton
                action={searchNowAction}
                nextAt={scan.nextAt?.toISOString() ?? null}
                remaining={scan.left}
                perDay={scan.plan.scansPerDay}
                plan={scan.plan.name}
                showMeta={false}
              />
              <LinkButton
                href="/offerte/cartelle"
                variant="secondary"
                size="sm"
              >
                <IconFolder size={16} /> Cartelle
              </LinkButton>
              <LinkButton
                href="/offerte/aggiungi"
                variant="secondary"
                size="sm"
              >
                <IconPlus size={16} /> Aggiungi a mano
              </LinkButton>
            </div>
            <ScanMeta
              remaining={scan.left}
              perDay={scan.plan.scansPerDay}
              plan={scan.plan.name}
              onHero
            />
          </div>
        }
      />

      {received.size === 0 && !filters.show && (
        <div className="mb-4">
          <Notice
            tone="info"
            title="Fai arrivare qui le offerte di LinkedIn e Indeed"
          >
            Gli avvisi dei siti di lavoro sono la fonte più ricca.{" "}
            <Link href="/collega">Collega le fonti</Link>: in cinque minuti ti
            guido ad account, avvisi e inoltro.
          </Notice>
        </div>
      )}
      <form
        method="get"
        role="search"
        className="mb-3 flex gap-2"
        aria-label="Cerca offerte"
      >
        <div className="relative min-w-0 flex-1">
          <IconSearch
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint"
          />
          <label htmlFor="q" className="sr-only">
            Cosa cerchi
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder={
              isStage
                ? "Es. stage marketing Milano"
                : "Es. impiegata amministrativa Torino part-time"
            }
            className="!h-12 !rounded-full !pl-11 !text-[16px] shadow-[var(--shadow-card)]"
          />
        </div>
        {pairs(sp, ["q", "msg", "n", "salvata"]).map(([k, v]) => (
          <input key={`${k}=${v}`} type="hidden" name={k} value={v} />
        ))}
        <button className="inline-flex h-12 shrink-0 items-center rounded-full bg-primary px-6 text-[15px] font-semibold text-on-primary shadow-[0_1px_2px_rgb(15_40_80/0.14)] hover:bg-primary-hover">
          Cerca
        </button>
      </form>
      {search && filters.q ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SearchUnderstood
            q={filters.q}
            parsed={search.parsed}
            mode={search.mode}
            total={total}
            hrefFor={(q) => keep({ q, salvata: "" })}
          />
          {saved.some((x) => x.query === address) ? (
            <Link
              href="/offerte/ricerche"
              className="inline-flex h-9 items-center rounded-full bg-accent-soft px-3.5 text-[13px] font-semibold text-accent no-underline"
            >
              Ricerca salvata ✓
            </Link>
          ) : (
            <form action={saveSearchAction}>
              <input type="hidden" name="query" value={address} />
              <button className="inline-flex h-9 items-center rounded-full bg-fill px-3.5 text-[13px] font-semibold text-ink hover:bg-fill-hover">
                Salva ricerca e avvisami
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[13px]">
          {profile.roles.slice(0, 4).map((r) => (
            <Link
              key={r}
              href={`/offerte?q=${encodeURIComponent(r)}`}
              className="inline-flex h-8 items-center rounded-full border border-line bg-surface px-3 no-underline hover:border-line-strong"
            >
              {r}
            </Link>
          ))}
          {saved.slice(0, 4).map((x) => (
            <Link
              key={x.id}
              href={`/offerte/ricerche/${x.id}`}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 no-underline ${savedHere === x.id ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface hover:border-line-strong"}`}
            >
              {x.label}
              {x.fresh > 0 && (
                <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-on-primary">
                  {x.fresh}
                </span>
              )}
            </Link>
          ))}
          {saved.length > 0 && (
            <Link href="/offerte/ricerche" className="ml-1 text-[13px]">
              Le tue ricerche ({saved.length})
            </Link>
          )}
        </div>
      )}
      <CareersLine userId={user.id} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-2 shadow-[var(--shadow-card)]">
        <div
          role="group"
          aria-label="Quali offerte"
          className="inline-flex max-w-full overflow-x-auto rounded-full bg-fill/70 p-1"
        >
          {views.map((v) => (
            <Link
              key={v.key}
              href={keep({ vista: v.key, tutte: v.key === "tutte" ? "1" : "" })}
              title={v.hint}
              aria-current={vista === v.key ? "true" : undefined}
              className={`inline-flex h-8 items-center whitespace-nowrap rounded-full px-3.5 text-[13px] no-underline transition-[background-color,color,box-shadow] duration-300 ${vista === v.key ? "bg-surface font-semibold text-ink shadow-[0_1px_3px_rgb(15_40_80/0.12)]" : "text-muted hover:text-ink"}`}
            >
              {v.label}
            </Link>
          ))}
        </div>
      </div>

      {(active > 0 || filters.focus) && (
        <p className="-mt-2 mb-2 text-right text-[13px]">
          <Link href="/offerte?tutte=1">Azzera filtri e vista</Link>
        </p>
      )}
      <details
        className="group/filters mb-6 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]"
        open={(active > 0 && touched) || placesChanged}
      >
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-[14px] hover:bg-subtle/60">
          <span className="inline-flex flex-wrap items-center gap-2 font-semibold">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent"
            >
              <IconSliders size={15} />
            </span>
            Filtri
            {active ? ` · ${active} ${active === 1 ? "attivo" : "attivi"}` : ""}
            {!touched && (defaults.minNetMonthly || defaults.focus) ? (
              <span className="font-normal text-faint">
                (i tuoi predefiniti)
              </span>
            ) : null}
            <span className="hidden font-normal text-faint sm:inline">
              ·{" "}
              {places.length
                ? places.map((p) => p.name).join(", ")
                : "tutti i luoghi"}
              {placesRemote && places.length ? " e da remoto" : ""}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="text-faint transition-[rotate] duration-300 ease-[var(--ease-out)] group-open/filters:rotate-180"
          >
            ▾
          </span>
        </summary>
        <form
          method="get"
          className="grid grid-cols-1 gap-4 border-t border-line p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input type="hidden" name="vista" value={vista} />
          {filters.q && <input type="hidden" name="q" value={filters.q} />}
          <label className="space-y-1.5">
            <span className="block text-[13px] font-medium">
              {isStage
                ? "Rimborso minimo al mese (netto)"
                : "Stipendio minimo al mese (netto)"}
            </span>
            <input
              name="netto"
              type="text"
              inputMode="numeric"
              placeholder="Es. 1300"
              defaultValue={filters.minNetMonthly ?? ""}
            />
          </label>
          <fieldset className="space-y-2 sm:col-span-2 lg:col-span-4">
            <legend className="mb-1.5 text-[13px] font-medium">Luoghi</legend>
            <input type="hidden" name="luogo" value="-" />
            <PlacesPicker
              key={places
                .map((p) => `${p.kind}|${p.country}|${p.name}`)
                .join(",")}
              initial={places}
              name="luogo"
              empty="Tutti i luoghi: nessun filtro sul posto."
              hint="Partono dai luoghi del tuo profilo: cambiali qui per provare, il profilo resta com'è. Una città comprende la sua provincia. Le offerte che non dicono dove sono restano visibili."
            />
            <label className="flex min-h-11 items-center gap-2.5 text-[14px]">
              <input
                type="checkbox"
                name="luogo"
                value="remoto"
                defaultChecked={placesRemote}
              />
              Anche da remoto (nei paesi scelti)
            </label>
            {placesChanged && (
              <p className="text-[13px]">
                <Link href={keep({ luogo: "" })}>
                  Torna ai luoghi del profilo
                </Link>{" "}
                · <Link href="/profilo/dove">Cambia i luoghi del profilo</Link>
              </p>
            )}
          </fieldset>
          <div className="space-y-4 sm:col-span-2 lg:col-span-4">
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium">
                Tipo{" "}
                <span className="font-normal text-faint">
                  (anche più di uno)
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map(([k, label]) => (
                  <PillCheck
                    key={k}
                    name="tipo"
                    value={k}
                    defaultChecked={filters.types?.includes(k)}
                  >
                    {label}
                  </PillCheck>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium">
                Contratto{" "}
                <span className="font-normal text-faint">
                  (anche più di uno; quelli che non lo dicono restano)
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CONTRACT_LABELS)
                  .filter(([k]) => k !== "unknown")
                  .map(([k, v]) => (
                    <PillCheck
                      key={k}
                      name="contratto"
                      value={k}
                      defaultChecked={filters.contracts?.includes(k)}
                    >
                      {v}
                    </PillCheck>
                  ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium">
                Settore{" "}
                <span className="font-normal text-faint">
                  (anche più di uno)
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {SECTORS.map(([name]) => (
                  <PillCheck
                    key={name}
                    name="settore"
                    value={name}
                    defaultChecked={filters.sectors?.includes(name)}
                  >
                    {name}
                  </PillCheck>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium">
                Livello{" "}
                <span className="font-normal text-faint">
                  (anche più di uno)
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SENIORITY_LABELS)
                  .filter(([k]) => k !== "stage") // "Tipo" already has it
                  .map(([k, v]) => (
                    <PillCheck
                      key={k}
                      name="livello"
                      value={k}
                      defaultChecked={filters.seniority?.includes(k)}
                    >
                      {v}
                    </PillCheck>
                  ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium">
                Deve offrire{" "}
                <span className="font-normal text-faint">
                  (tutti quelli scelti)
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(BENEFIT_LABELS).map(([k, v]) => (
                  <PillCheck
                    key={k}
                    name="benefit"
                    value={k}
                    defaultChecked={filters.benefits?.includes(k)}
                  >
                    {v}
                  </PillCheck>
                ))}
              </div>
            </fieldset>
            <p className="text-[12.5px] text-faint">
              Nessuna scelta in un gruppo = tutti.
            </p>
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
            <span className="block text-[13px] font-medium">
              Punteggio minimo
            </span>
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
          <label className="space-y-1.5">
            <span className="block text-[13px] font-medium">
              Esperienza richiesta
            </span>
            <select name="esperienza" defaultValue={one(sp.esperienza)}>
              <option value="">Qualsiasi</option>
              <option value="0">Nessuna (anche prima esperienza)</option>
              <option value="2">Fino a 2 anni</option>
              <option value="5">Fino a 5 anni</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="block text-[13px] font-medium">
              Titolo di studio che ho
            </span>
            <select name="titolo" defaultValue={one(sp.titolo)}>
              <option value="">Qualsiasi</option>
              {Object.entries(EDUCATION_LABELS)
                .filter(([k]) => k !== "nessuno")
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              <option value="nessuno">Nessuno</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="block text-[13px] font-medium">Smart working</span>
            <select name="smart" defaultValue={one(sp.smart)}>
              <option value="">Qualsiasi</option>
              <option value="1">Almeno 1 giorno a settimana</option>
              <option value="2">Almeno 2 giorni</option>
              <option value="3">Almeno 3 giorni</option>
              <option value="5">Sempre da casa</option>
            </select>
          </label>
          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            {(
              [
                ["casa", "1", "Solo da remoto o ibride"],
                [
                  "facile",
                  "1",
                  "Solo candidature veloci (modulo breve o e-mail, niente Workday)",
                ],
                ["agenzie", "no", "Escludi le agenzie per il lavoro"],
                [
                  "vecchie",
                  "no",
                  "Nascondi le offerte vecchie (oltre 60 giorni) o sempre aperte",
                ],
                [
                  "protette",
                  "1",
                  "Solo offerte per categorie protette (L. 68/99)",
                ],
                ["nuove", "1", "Solo quelle che non ho ancora aperto"],
              ] as const
            ).map(([name, value, label]) => (
              <label
                key={name}
                className="flex min-h-10 items-center gap-2.5 text-[14px]"
              >
                <input
                  type="checkbox"
                  name={name}
                  value={value}
                  defaultChecked={one(sp[name]) === value}
                />
                {label}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
            <button className="inline-flex h-10 items-center rounded-full bg-primary px-6 text-[14px] font-semibold text-on-primary shadow-[0_1px_2px_rgb(15_40_80/0.14)] hover:bg-primary-hover">
              Applica
            </button>
          </div>
        </form>
        <form
          action={saveDefaultFiltersAction}
          className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-subtle/50 px-4 py-3 text-[13px] text-muted"
        >
          <input type="hidden" name="focus" value={vista} />
          <input
            type="hidden"
            name="netto"
            value={filters.minNetMonthly ?? ""}
          />
          <span>
            Usa la vista e la retribuzione minima attuali ogni volta che apri
            Offerte. Il punteggio si regola in{" "}
            <Link href="/profilo/punteggio">Profilo → Punteggio</Link>.
          </span>
          <button className="inline-flex h-8 items-center rounded-full bg-fill px-3.5 text-[13px] font-semibold text-ink hover:bg-fill-hover">
            Salva come predefiniti
          </button>
        </form>
      </details>

      {jobs.length === 0 ? (
        <Empty
          title={
            filters.show
              ? "Nessuna offerta scartata"
              : "Nessuna offerta, per ora"
          }
          action={
            filters.focus ? (
              <LinkButton
                href="/offerte?vista=tutte&tutte=1"
                variant="secondary"
                size="sm"
              >
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
        <div className="space-y-3">
          {jobs.map((j, i) => (
            <div
              key={j.id}
              className="list-in"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              {headings[i] && (
                <h2 className="mb-3 mt-8 flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted first:mt-0">
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${j.level === "molto" ? "bg-level-molto" : j.level === "adatta" ? "bg-level-adatta" : "bg-level-poco"}`}
                  />
                  {headings[i]}
                </h2>
              )}
              <JobCard job={j} dismiss={dismissQuietAction} back={keep({})} />
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
          <LinkButton
            href={`${keep({})}&n=${limit + PAGE_SIZE}`}
            variant="secondary"
            size="sm"
            scroll={false}
          >
            Mostra altre 10
          </LinkButton>
        </div>
      )}

      <div className="mt-10 text-center">
        <Link
          href="/offerte/non-mi-interessano"
          className="inline-flex min-h-[32px] items-center text-[13px]"
        >
          Non mi interessano
        </Link>
      </div>
    </>
  );
}
