import { AltroCompany, AltroSector, CompanyGroups, SectorPills } from "@/components/catalog-forms";
import { CatalogFilter } from "@/components/catalog-filter";
import { Flash } from "@/components/flash";
import { IconExternal, IconSparkle, IconX } from "@/components/icons";
import { Button, Card, ChoiceRow, Chip, PageHeader, SectionTitle } from "@/components/ui";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { careersSearchUrl, getPrefs, listCompanies, listSectors } from "@/lib/server/catalog";
import { fitWarnings, interestProfile, suggestCompanies } from "@/lib/server/career";
import { IconAlert } from "@/components/icons";
import { LinkButton } from "@/components/ui";
import { countryName } from "@/lib/core/geo";
import { getProfile } from "@/lib/server/profile";
import { profileCountries } from "@/lib/server/catalog";
import { Directory } from "./directory";
import { saveFocusAction, savePrefsAction, setPrefAction } from "../actions";

export const metadata = { title: "Aziende e settori" };

export default async function AziendePage({ searchParams }: { searchParams: Promise<{ msg?: string; cerca?: string; paese?: string; pagina?: string; settore?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const p = await getProfile(db, user.id);
  const ip = await interestProfile(db, user.id);
  const [sectors, allSectors, companies, prefs, suggestions, warnings] = await Promise.all([
    listSectors(db, user.id, p.track),
    listSectors(db, user.id),
    listCompanies(db, user.id, p.track),
    getPrefs(db, user.id),
    suggestCompanies(db, user.id, 8, ip),
    fitWarnings(db, user.id, ip),
  ]);
  const liked = (await listCompanies(db, user.id)).filter((c) => prefs.companies.get(c.id) === "like");
  const avoided = (await listCompanies(db, user.id)).filter((c) => prefs.companies.get(c.id) === "avoid");
  const focus = p.focus === "tutte" ? "tutte" : p.focusCompaniesOnly ? "aziende" : "preferite";
  const back = "/aziende";

  return (
    <>
      <Flash code={sp.msg} />
      <PageHeader
        title="Aziende e settori"
        description={
          p.track === "stage"
            ? "Scegli boutique, banche, fondi, società di consulenza, startup e brand che ti interessano. Le loro offerte salgono in cima, o diventano le uniche che vedi."
            : "Scegli i brand, le aziende e i settori che ti interessano. Le loro offerte salgono in cima, o diventano le uniche che vedi."
        }
        actions={
          <LinkButton href="/percorsi" variant="secondary" size="sm">
            Percorsi per te
          </LinkButton>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-8">
          {/* Chosen */}
          <section aria-labelledby="scelte">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="scelte" className="text-[16px] font-semibold">
                Le tue aziende · {liked.length}
              </h2>
            </div>
            {liked.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-[13.5px] text-muted">Nessuna azienda scelta. Parti dai suggerimenti o dal catalogo qui sotto.</p>
            ) : (
              <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
                {liked.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium">
                        {c.name} {!c.shared && <Chip>aggiunta da te</Chip>}
                      </p>
                      <p className="text-[12.5px] text-faint">{[c.city, c.city && c.country !== "IT" ? countryName(c.country) : null, c.industry, c.ats ? "offerte lette dal sito aziendale" : null].filter(Boolean).join(" · ") || " "}</p>
                      {warnings.has(c.id) && (
                        <p className="mt-1 flex items-start gap-1.5 rounded-md bg-warn-soft px-2 py-1 text-[12.5px] text-warn">
                          <IconAlert size={14} className="mt-0.5 shrink-0" /> {warnings.get(c.id)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <a href={careersSearchUrl(c.name, p.track)} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] text-muted no-underline hover:bg-subtle hover:text-ink">
                        Pagina carriere <IconExternal size={13} />
                      </a>
                      <form action={setPrefAction}>
                        <input type="hidden" name="kind" value="company" />
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="back" value={back} />
                        <button aria-label={`Togli ${c.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-faint hover:bg-subtle hover:text-ink">
                          <IconX size={15} />
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Catalog */}
          <section aria-labelledby="catalogo">
            <SectionTitle className="!mt-0">
              <span id="catalogo">Catalogo</span>
            </SectionTitle>
            <form action={savePrefsAction} className="space-y-4">
              <input type="hidden" name="back" value={back} />
              <CatalogFilter target="aziende" placeholder="Cerca un'azienda o un brand" />
              <div data-catalog="aziende">
                <CompanyGroups companies={companies} chosen={prefs.companies} stance="like" track={p.track} />
              </div>
              <AltroCompany sectors={allSectors} defaultKind={p.track === "stage" ? "boutique" : "brand"} />
              <Button>Salva aziende</Button>
            </form>
          </section>

          <Directory db={db} userId={user.id} prefs={prefs} countries={profileCountries(p)} regions={p.regions} sp={sp} />

          {/* Sectors */}
          <section aria-labelledby="settori">
            <SectionTitle className="!mt-0">
              <span id="settori">Settori che ti interessano</span>
            </SectionTitle>
            <form action={savePrefsAction} className="space-y-4">
              <input type="hidden" name="back" value={back} />
              <div data-catalog="settori">
                <SectorPills sectors={sectors} chosen={prefs.sectors} stance="like" />
              </div>
              <AltroSector />
              <Button variant="secondary">Salva settori</Button>
            </form>
          </section>

          {/* Avoid */}
          <section aria-labelledby="evitare">
            <SectionTitle className="!mt-0">
              <span id="evitare">Da evitare</span>
            </SectionTitle>
            {avoided.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {avoided.map((c) => (
                  <form key={c.id} action={setPrefAction}>
                    <input type="hidden" name="kind" value="company" />
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="back" value={back} />
                    <button className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] hover:bg-subtle" aria-label={`Non evitare più ${c.name}`}>
                      {c.name} <IconX size={13} />
                    </button>
                  </form>
                ))}
              </div>
            )}
            <form action={savePrefsAction} className="space-y-3">
              <input type="hidden" name="back" value={back} />
              <input type="hidden" name="kind" value="company" />
              <input type="hidden" name="stance" value="avoid" />
              <div className="space-y-1.5">
                <label htmlFor="avoid-altro" className="block text-[13px] font-medium">
                  Aziende di cui non vuoi vedere offerte
                </label>
                <input id="avoid-altro" name="altro" type="text" placeholder="Separate da una virgola" />
              </div>
              <Button variant="secondary" size="sm">
                Aggiungi
              </Button>
            </form>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="!p-4">
            <p className="text-[14px] font-semibold">Quali offerte vedere</p>
            <form action={saveFocusAction} className="mt-3 space-y-2">
              <input type="hidden" name="back" value={back} />
              <ChoiceRow type="radio" name="focus" value="tutte" defaultChecked={focus === "tutte"} hint="Le tue scelte salgono in cima.">
                Tutte, con priorità alle mie scelte
              </ChoiceRow>
              <ChoiceRow type="radio" name="focus" value="preferite" defaultChecked={focus === "preferite"} hint="Aziende e settori scelti: meno rumore.">
                Solo le mie scelte
              </ChoiceRow>
              <ChoiceRow type="radio" name="focus" value="aziende" defaultChecked={focus === "aziende"} hint="Solo le aziende scelte, per la massima precisione.">
                Solo le aziende scelte
              </ChoiceRow>
              <Button size="sm" className="mt-1">
                Salva
              </Button>
            </form>
          </Card>

          <Card className="!p-4">
            <p className="flex items-center gap-2 text-[14px] font-semibold">
              <IconSparkle size={16} className="text-accent" /> Suggerite per te
            </p>
            <p className="mt-1 text-[12.5px] text-faint">In base al tuo CV, al profilo, ai gusti e alle aziende scelte.</p>
            {suggestions.length === 0 ? (
              <p className="mt-3 text-[13px] text-muted">Carica il CV e scegli qualche settore per ricevere suggerimenti.</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {suggestions.map((s) => (
                  <li key={s.company.id} className="rounded-lg border border-line p-3">
                    <p className="text-[13.5px] font-medium">{s.company.name}</p>
                    <p className="mt-0.5 text-[12.5px] text-muted">{s.reason}</p>
                    <div className="mt-2 flex gap-1.5">
                      <form action={setPrefAction}>
                        <input type="hidden" name="kind" value="company" />
                        <input type="hidden" name="id" value={s.company.id} />
                        <input type="hidden" name="stance" value="like" />
                        <input type="hidden" name="back" value={back} />
                        <Button size="sm" variant="secondary">
                          Mi interessa
                        </Button>
                      </form>
                      <form action={setPrefAction}>
                        <input type="hidden" name="kind" value="company" />
                        <input type="hidden" name="id" value={s.company.id} />
                        <input type="hidden" name="stance" value="avoid" />
                        <input type="hidden" name="back" value={back} />
                        <Button size="sm" variant="ghost">
                          No
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
