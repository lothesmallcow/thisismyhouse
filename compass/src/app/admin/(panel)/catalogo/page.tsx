import { asc, eq, sql } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { Button, Chip, SectionTitle } from "@/components/ui";
import { KIND_LABELS } from "@/lib/catalog/data";
import { getDb, schema } from "@/lib/db";
import { COMPANY_KINDS } from "@/lib/db/schema";
import { ATS_LABELS, type AtsType } from "@/lib/sources/ats";
import { deleteCatalogEntryAction, saveCatalogCompanyAction, shareCatalogSectorAction } from "../../actions";
import { AdminTitle, Table, td, th } from "../person";

export const metadata = { title: "Catalogo" };

export default async function CatalogoPage({ searchParams }: { searchParams: Promise<{ msg?: string; vista?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  const onlyCustom = sp.vista !== "tutte";
  const likes = sql<number>`(select count(*) from user_prefs p where p.kind = 'company' and p.ref_id = ${schema.catalogCompanies.id} and p.stance = 'like')`;
  const companies = await db
    .select({ c: schema.catalogCompanies, likes, author: schema.users.name, authorEmail: schema.users.email })
    .from(schema.catalogCompanies)
    .leftJoin(schema.users, eq(schema.users.id, schema.catalogCompanies.createdByUserId))
    .where(onlyCustom ? eq(schema.catalogCompanies.shared, false) : undefined)
    .orderBy(asc(schema.catalogCompanies.kind), asc(schema.catalogCompanies.name));
  const sectors = await db
    .select({ s: schema.catalogSectors, author: schema.users.name, authorEmail: schema.users.email })
    .from(schema.catalogSectors)
    .leftJoin(schema.users, eq(schema.users.id, schema.catalogSectors.createdByUserId))
    .where(eq(schema.catalogSectors.shared, false));
  const [{ n: total }] = await db.select({ n: sql<number>`count(*)` }).from(schema.catalogCompanies);

  return (
    <>
      <Flash code={sp.msg} />
      <AdminTitle
        title="Catalogo"
        description={`${Number(total)} aziende. Le voci aggiunte con “Altro” restano private a chi le ha create finché non le rendi visibili a tutti. Qui puoi anche collegare il feed ATS pubblico di un'azienda (dopo averlo verificato): le sue offerte verranno lette ogni giorno per chi l'ha scelta.`}
      />
      <div role="group" aria-label="Vista" className="mb-4 inline-flex rounded-lg border border-line bg-surface p-0.5 text-[13px]">
        {[
          ["", "Aggiunte con Altro"],
          ["tutte", "Tutto il catalogo"],
        ].map(([v, l]) => (
          <a key={v} href={`/admin/catalogo${v ? `?vista=${v}` : ""}`} aria-current={(sp.vista ?? "") === v ? "true" : undefined} className={`inline-flex h-8 items-center rounded-md px-3 no-underline ${(sp.vista ?? "") === v ? "bg-primary font-medium text-on-primary" : "text-muted"}`}>
            {l}
          </a>
        ))}
      </div>

      <Table label="Aziende del catalogo" minWidth={980}>
        <thead className="border-b border-line">
          <tr>
            {["Azienda", "Scelta da", "Tipo", "Città", "Feed ATS (slug)", "Visibile a tutti", ""].map((h) => (
              <th key={h} className={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {companies.length === 0 && (
            <tr>
              <td className={`${td} text-muted`} colSpan={7}>
                Nessuna voce.
              </td>
            </tr>
          )}
          {companies.map(({ c, likes: n, author, authorEmail }) => (
            <tr key={c.id}>
              <td className={td}>
                <p className="font-medium">{c.name}</p>
                {!c.shared && <p className="text-[12px] text-faint">di {author || authorEmail || "persona eliminata"}</p>}
              </td>
              <td className={`${td} tabular-nums`}>{Number(n)}</td>
              <td className={td} colSpan={4}>
                <form id={`f-${c.id}`} action={saveCatalogCompanyAction} className="grid grid-cols-[150px_120px_1fr_90px] items-center gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <select name="kind" defaultValue={c.kind} aria-label="Tipo">
                    {COMPANY_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABELS[k].split(":")[0]}
                      </option>
                    ))}
                  </select>
                  <input name="city" type="text" defaultValue={c.city ?? ""} aria-label="Città" />
                  <span className="flex gap-1.5">
                    <select name="ats" defaultValue={c.ats ?? ""} aria-label="ATS" className="!w-36">
                      <option value="">Nessuno</option>
                      {Object.entries(ATS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <input name="atsSlug" type="text" defaultValue={c.atsSlug ?? ""} aria-label="Slug ATS" placeholder="slug" />
                  </span>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" name="shared" value="1" defaultChecked={c.shared} /> sì
                  </label>
                </form>
                {c.ats && <p className="mt-1 text-[11.5px] text-faint">{ATS_LABELS[c.ats as AtsType]} · {c.atsSlug}</p>}
              </td>
              <td className={td}>
                <div className="flex gap-1">
                  <Button form={`f-${c.id}`} size="sm" variant="secondary">
                    Salva
                  </Button>
                  {!c.shared && (
                    <form action={deleteCatalogEntryAction}>
                      <input type="hidden" name="kind" value="company" />
                      <input type="hidden" name="id" value={c.id} />
                      <Button size="sm" variant="ghost">
                        Elimina
                      </Button>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <SectionTitle>Settori aggiunti con Altro</SectionTitle>
      {sectors.length === 0 ? (
        <p className="text-[13.5px] text-muted">Nessuno.</p>
      ) : (
        <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
          {sectors.map(({ s, author, authorEmail }) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-[13.5px]">
              <span>
                {s.name} <Chip>{author || authorEmail || "persona eliminata"}</Chip>
              </span>
              <span className="flex gap-1">
                <form action={shareCatalogSectorAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="shared" value="1" />
                  <Button size="sm" variant="secondary">
                    Rendi visibile a tutti
                  </Button>
                </form>
                <form action={deleteCatalogEntryAction}>
                  <input type="hidden" name="kind" value="sector" />
                  <input type="hidden" name="id" value={s.id} />
                  <Button size="sm" variant="ghost">
                    Elimina
                  </Button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
