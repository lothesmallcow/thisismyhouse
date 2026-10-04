import Link from "next/link";
import { IconSearch } from "@/components/icons";
import { Button, Chip } from "@/components/ui";
import { SIZE_LABELS } from "@/lib/catalog/world";
import { COUNTRIES, countryName } from "@/lib/core/geo";
import type { DB } from "@/lib/db";
import { browseCompanies, searchCompanies, searchSectors, type Prefs } from "@/lib/server/catalog";
import { setPrefAction } from "../actions";

const PER_PAGE = 30;

/**
 * Every company in the database (hand-made list, listed companies of Italy, the UK, Germany and
 * France, entries added with "Altro"), browsable page by page or searchable, plus every industry.
 * Limited by default to the countries and regions the person chose.
 */
export async function Directory({
  db,
  userId,
  prefs,
  countries,
  regions,
  sp,
}: {
  db: DB;
  userId: number;
  prefs: Prefs;
  countries: string[];
  regions: string[];
  sp: { cerca?: string; paese?: string; pagina?: string; settore?: string };
}) {
  const q = (sp.cerca ?? "").slice(0, 80);
  const paese = sp.paese === "tutti" ? "tutti" : COUNTRIES.some((c) => c.code === sp.paese) ? sp.paese! : "miei";
  const scopeCountries = paese === "tutti" ? [] : paese === "miei" ? countries : [paese];
  const scopeRegions = paese === "miei" ? regions : [];
  const page = Math.max(1, Number(sp.pagina) || 1);
  const result = q.trim().length >= 2
    ? { rows: await searchCompanies(db, userId, q, { countries: scopeCountries, regions: scopeRegions, limit: 40 }), total: -1 }
    : await browseCompanies(db, userId, { countries: scopeCountries, regions: scopeRegions, page, perPage: PER_PAGE });
  const sectorQ = (sp.settore ?? "").slice(0, 80);
  const sectors = sectorQ.trim().length >= 2 ? await searchSectors(db, userId, sectorQ, 15) : [];
  const pages = result.total > 0 ? Math.ceil(result.total / PER_PAGE) : 1;
  const href = (p: number) => `/aziende?${new URLSearchParams({ ...(q ? { cerca: q } : {}), paese, pagina: String(p) })}#database`;
  const scopeLabel = paese === "tutti" ? "tutti i paesi" : paese === "miei" ? `${countries.map(countryName).join(", ")}${regions.length ? ` (${regions.map((r) => r.slice(3)).join(", ")})` : ""}` : countryName(paese);

  return (
    <section aria-labelledby="database" className="scroll-mt-20">
      <h2 id="database" className="text-[16px] font-semibold">
        Tutte le aziende
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        Il catalogo completo: le aziende scelte a mano e le società quotate di Italia, Regno Unito, Germania e Francia. Mostro {scopeLabel}.
      </p>
      <form method="get" action="/aziende#database" className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px_auto]">
        <label htmlFor="db-cerca" className="sr-only">
          Cerca per nome, città o attività
        </label>
        <input id="db-cerca" name="cerca" type="search" defaultValue={q} placeholder="Nome, città o attività (es. banca, Londra, software)" />
        <label htmlFor="db-paese" className="sr-only">
          Paese
        </label>
        <select id="db-paese" name="paese" defaultValue={paese}>
          <option value="miei">I miei paesi</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
          <option value="tutti">Tutti i paesi</option>
        </select>
        <Button variant="secondary">
          <IconSearch size={15} /> Cerca
        </Button>
      </form>

      {result.rows.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-line-strong px-4 py-5 text-center text-[13.5px] text-muted">Nessuna azienda trovata. Prova un altro nome o &quot;Tutti i paesi&quot;, oppure aggiungila con Altro.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
          {result.rows.map((c) => {
            const stance = prefs.companies.get(c.id);
            return (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium">
                    {c.name} {c.source === "borsa" && <Chip>quotata</Chip>}
                    {c.source === "registro" && <Chip>registro imprese</Chip>}
                  </p>
                  <p className="text-[12.5px] text-faint">
                    {[c.industry, c.city, c.region && c.region !== c.city ? c.region : null, c.city || c.source === "borsa" || c.source === "registro" ? countryName(c.country) : null, c.size != null ? `dimensione ${SIZE_LABELS[c.size]}` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {stance ? (
                  <Chip tone={stance === "like" ? "accent" : "neutral"}>{stance === "like" ? "Scelta" : "Da evitare"}</Chip>
                ) : (
                  <form action={setPrefAction}>
                    <input type="hidden" name="kind" value="company" />
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="stance" value="like" />
                    <input type="hidden" name="back" value={href(page)} />
                    <Button size="sm" variant="secondary" aria-label={`Mi interessa ${c.name}`}>
                      Mi interessa
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {result.total > 0 && (
        <nav aria-label="Pagine del catalogo" className="mt-3 flex items-center justify-between text-[13px] text-muted">
          <span>
            {"capped" in result && result.capped ? "Più di " : ""}
            {result.total.toLocaleString("it-IT")} aziende · pagina {page} di {pages}
          </span>
          <span className="flex gap-2">
            {page > 1 && (
              <Link href={href(page - 1)} className="inline-flex h-8 items-center rounded-md border border-line px-3 no-underline hover:bg-subtle">
                Precedenti
              </Link>
            )}
            {page < pages && (
              <Link href={href(page + 1)} className="inline-flex h-8 items-center rounded-md border border-line px-3 no-underline hover:bg-subtle">
                Successive
              </Link>
            )}
          </span>
        </nav>
      )}

      <h3 className="mt-6 text-[14px] font-semibold">Tutti i settori</h3>
      <p className="mt-1 text-[13px] text-muted">Oltre a quelli sopra, ogni attività della classificazione europea NACE. Si cerca anche in inglese, tedesco e francese.</p>
      <form method="get" action="/aziende#database" className="mt-2 flex gap-2">
        <label htmlFor="db-settore" className="sr-only">
          Cerca un settore
        </label>
        <input id="db-settore" name="settore" type="search" defaultValue={sectorQ} placeholder="Es. yacht, gioielleria, software, Bekleidung" className="min-w-0 flex-1" />
        <Button variant="secondary">Cerca</Button>
      </form>
      {sectorQ && sectors.length === 0 && <p className="mt-2 text-[13px] text-muted">Nessun settore trovato. Puoi aggiungerlo con Altro.</p>}
      {sectors.length > 0 && (
        <ul className="mt-2 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
          {sectors.map((s) => {
            const stance = prefs.sectors.get(s.id);
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <p className="min-w-0 text-[13.5px]">
                  {s.name} {s.nace && <span className="text-[12px] text-faint">NACE {s.nace}</span>}
                </p>
                {stance ? (
                  <Chip tone={stance === "like" ? "accent" : "neutral"}>{stance === "like" ? "Scelto" : "Da evitare"}</Chip>
                ) : (
                  <form action={setPrefAction}>
                    <input type="hidden" name="kind" value="sector" />
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="stance" value="like" />
                    <input type="hidden" name="back" value={`/aziende?settore=${encodeURIComponent(sectorQ)}#database`} />
                    <Button size="sm" variant="secondary" aria-label={`Mi interessa: ${s.name}`}>
                      Mi interessa
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
