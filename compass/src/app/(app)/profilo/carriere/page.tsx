import { and, eq, isNull, or, sql, inArray } from "drizzle-orm";
import { BackLink } from "@/components/back-link";
import { Flash } from "@/components/flash";
import { Button, Card, Field, PageHeader, PillCheck, SectionTitle } from "@/components/ui";
import { TASTES } from "@/lib/catalog/data";
import { COUNTRIES, findPlace, homeCountries } from "@/lib/core/geo";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { getPrefs, listSectors } from "@/lib/server/catalog";
import { getProfile } from "@/lib/server/profile";
import { saveCareersAction } from "../../actions";

export const metadata = { title: "Carriere e paesi" };

/** How many companies with a readable site each career has in these countries (shown up to 200). */
async function companyCounts(ids: number[], countries: string[]): Promise<Map<number, number>> {
  const db = getDb();
  const c = schema.catalogCompanies;
  const readable = or(sql`${c.website} is not null`, sql`${c.careersUrl} is not null`, sql`${c.ats} is not null`);
  const where = (id: number) => and(eq(c.sectorId, id), or(inArray(c.country, countries), and(eq(c.source, "curato"), isNull(c.city))), readable);
  const rows = await Promise.all(ids.map(async (id) => [id, Number((await db.select({ n: sql<number>`count(*)` }).from(sql`(select 1 from ${c} where ${where(id)} limit 201)`))[0].n)] as const));
  return new Map(rows);
}

/** Several careers and several countries at once: every company of those careers, in all those places. */
export default async function CarrierePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const [p, sectors, prefs] = await Promise.all([getProfile(db, user.id), listSectors(db, user.id), getPrefs(db, user.id)]);
  const curated = sectors.filter((s) => s.source === "curato");
  const bySlug = new Map(curated.map((s) => [s.slug, s]));
  const countries = homeCountries(p.countries, p.city);
  const counts = await companyCounts(curated.map((s) => s.id), countries);
  const shown = new Set<string>();
  const groups = [...TASTES.map((t) => ({ label: t.label, items: t.sectors.filter((slug) => bySlug.has(slug) && !shown.has(slug) && shown.add(slug)).map((slug) => bySlug.get(slug)!) })), { label: "Altre carriere", items: curated.filter((s) => !shown.has(s.slug)) }].filter((g) => g.items.length);
  const home = findPlace(p.city)?.country;
  const cityFor = (cc: string) => (home === cc ? p.city : (p.extraPlaces.find((x) => findPlace(x)?.country === cc) ?? ""));
  const count = (id: number) => {
    const n = counts.get(id) ?? 0;
    return n > 200 ? "200+" : String(n);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Flash code={sp.msg} />
      <BackLink href="/profilo">Profilo</BackLink>
      <PageHeader
        title="Carriere e paesi"
        description="Scegli tutte le carriere che ti interessano e tutti i paesi dove vuoi lavorare: cerco le posizioni di ogni carriera e leggo le pagine lavoro di tutte le loro aziende, in tutti quei paesi."
      />
      <form action={saveCareersAction} className="space-y-6">
        <Card>
          <h2 className="text-[16px] font-semibold">Carriere</h2>
          <p className="mt-1 text-[13px] text-muted">Il numero è quante aziende di quella carriera so leggere nei paesi scelti.</p>
          {groups.map((g) => (
            <fieldset key={g.label} className="mt-5">
              <legend className="mb-2 text-[13px] font-medium text-faint">{g.label}</legend>
              <div className="flex flex-wrap gap-2">
                {g.items.map((s) => (
                  <PillCheck key={s.id} name="sector" value={String(s.id)} defaultChecked={prefs.sectors.get(s.id) === "like"}>
                    {s.name} <span className="text-faint">· {count(s.id)}</span>
                  </PillCheck>
                ))}
              </div>
            </fieldset>
          ))}
          {curated.map((s) => (
            <input key={s.id} type="hidden" name="shown" value={s.id} />
          ))}
        </Card>

        <Card>
          <h2 className="text-[16px] font-semibold">Paesi</h2>
          <p className="mt-1 text-[13px] text-muted">Puoi cercare in più paesi insieme. La città è facoltativa: senza, cerco in tutto il paese.</p>
          <div className="mt-4 space-y-3">
            {COUNTRIES.map((c) => (
              <div key={c.code} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[180px_1fr]">
                <PillCheck name="country" value={c.code} defaultChecked={countries.includes(c.code)}>
                  {c.name}
                </PillCheck>
                <Field label={`Città in ${c.name} (facoltativa)`} htmlFor={`city-${c.code}`}>
                  <input id={`city-${c.code}`} name={`city_${c.code}`} type="text" defaultValue={cityFor(c.code)} placeholder={{ IT: "Es. Milano", GB: "Es. London", DE: "Es. Frankfurt am Main", FR: "Es. Paris" }[c.code]} />
                </Field>
              </div>
            ))}
          </div>
        </Card>
        <Button>Salva e cerca</Button>
      </form>
      <SectionTitle>Come funziona</SectionTitle>
      <p className="text-[13.5px] text-muted">
        Per ogni carriera aggiungo una posizione da cercare (per esempio Consulenza strategica → Consulente strategico) e, con &quot;Fai web scraping&quot;, leggo le pagine lavoro di tutte le aziende di quelle carriere nei paesi scelti, un gruppo nuovo a ogni clic e ogni 3 ore.
      </p>
    </div>
  );
}
