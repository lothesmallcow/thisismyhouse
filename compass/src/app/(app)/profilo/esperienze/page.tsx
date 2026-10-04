import { eq } from "drizzle-orm";
import { BackLink } from "@/components/back-link";
import { Flash } from "@/components/flash";
import { IconX } from "@/components/icons";
import { Button, Card, Chip, Field, PageHeader, SectionTitle } from "@/components/ui";
import { formatPeriod } from "@/lib/core/timeline";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { listCompanies, listSectors } from "@/lib/server/catalog";
import { listExperiences } from "@/lib/server/experiences";
import { addExperienceAction, deleteExperienceAction, importLinkedInAction, readCvTimelineAction } from "../../actions";

export const metadata = { title: "Esperienze" };

const KIND = { lavoro: "Lavoro", studio: "Studi", volontariato: "Volontariato", altro: "Altro" } as const;
const SOURCE = { cv: "dal CV", linkedin: "da LinkedIn", manuale: "aggiunta a mano" } as const;

export default async function EsperienzePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const [items, cvs, companies, sectors] = await Promise.all([
    listExperiences(db, user.id),
    db.select({ id: schema.cvs.id, label: schema.cvs.label }).from(schema.cvs).where(eq(schema.cvs.userId, user.id)),
    listCompanies(db, user.id, "all"),
    listSectors(db, user.id, "all"),
  ]);
  const companyName = new Map(companies.map((c) => [c.id, c.name]));
  const sectorName = new Map(sectors.map((s) => [s.id, s.name]));

  return (
    <div className="mx-auto max-w-3xl">
      <Flash code={sp.msg} />
      <BackLink href="/profilo">Profilo</BackLink>
      <PageHeader
        title="Esperienze"
        description="La tua storia professionale, come su LinkedIn. Compass la usa per suggerirti aziende e percorsi vicini a quello che hai già fatto, e per avvisarti quando una scelta sembra lontana."
      />

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-[13.5px] text-muted">Nessuna esperienza ancora. Leggila dal CV, importala da LinkedIn o aggiungila a mano.</p>
      ) : (
        <ol className="relative space-y-0 border-l border-line pl-6">
          {items.map((e) => (
            <li key={e.id} className="relative pb-6 last:pb-0">
              <span className={`absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-bg ${e.current ? "bg-accent" : "bg-line-strong"}`} aria-hidden="true" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12.5px] text-faint">
                    {formatPeriod(e) || "Date non indicate"} · {KIND[e.kind]}
                  </p>
                  <p className="mt-0.5 text-[14.5px] font-semibold">{e.title || e.organization}</p>
                  {e.title && e.organization && (
                    <p className="text-[13.5px] text-muted">
                      {e.organization}
                      {e.city ? ` · ${e.city}` : ""}
                    </p>
                  )}
                  {e.description && <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-[13px] text-muted">{e.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {e.catalogCompanyId && <Chip tone="accent">{companyName.get(e.catalogCompanyId)}</Chip>}
                    {e.sectorId && <Chip>{sectorName.get(e.sectorId)}</Chip>}
                    <Chip>{SOURCE[e.source]}</Chip>
                  </div>
                </div>
                <form action={deleteExperienceAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <button aria-label={`Togli ${e.title || e.organization}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-faint hover:bg-subtle hover:text-ink">
                    <IconX size={15} />
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ol>
      )}

      <SectionTitle>Importa</SectionTitle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="!p-4">
          <p className="text-[14px] font-semibold">Dal CV</p>
          <p className="mt-1 text-[13px] text-muted">Legge le righe con le date (es. &ldquo;2019 - oggi Sales Associate, Kiton, Milano&rdquo;). Sostituisce quanto letto prima dal CV.</p>
          {cvs.length === 0 ? (
            <p className="mt-3 text-[13px] text-faint">Carica prima un CV in Profilo → CV.</p>
          ) : (
            <form action={readCvTimelineAction} className="mt-3 flex flex-wrap items-end gap-2">
              <label className="min-w-0 flex-1 space-y-1.5">
                <span className="block text-[13px] font-medium">CV</span>
                <select name="cvId">
                  {cvs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button variant="secondary" size="sm">
                Leggi
              </Button>
            </form>
          )}
        </Card>
        <Card className="!p-4">
          <p className="text-[14px] font-semibold">Da LinkedIn</p>
          <p className="mt-1 text-[13px] text-muted">
            Su LinkedIn: Impostazioni → Privacy dei dati → Ottieni una copia dei tuoi dati → scegli &ldquo;Posizioni&rdquo; e &ldquo;Formazione&rdquo;. Ricevi uno .zip via e-mail: caricalo qui (o i file Positions.csv ed Education.csv).
          </p>
          <form action={importLinkedInAction} className="mt-3 space-y-2">
            <input name="files" type="file" accept=".zip,.csv,application/zip,text/csv" multiple required aria-label="File di LinkedIn" />
            <Button variant="secondary" size="sm">
              Importa
            </Button>
          </form>
          <p className="mt-2 text-[12px] text-faint">Compass non accede al tuo account LinkedIn: legge solo il file che carichi.</p>
        </Card>
      </div>

      <SectionTitle>Aggiungi a mano</SectionTitle>
      <Card className="!p-4">
        <form action={addExperienceAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Ruolo o titolo" htmlFor="x-title">
            <input id="x-title" name="title" type="text" placeholder="Es. Sales Associate" />
          </Field>
          <Field label="Azienda, scuola o associazione" htmlFor="x-org">
            <input id="x-org" name="organization" type="text" placeholder="Es. Kiton" />
          </Field>
          <Field label="Tipo" htmlFor="x-kind">
            <select id="x-kind" name="kind" defaultValue="lavoro">
              {Object.entries(KIND).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Città" htmlFor="x-city">
            <input id="x-city" name="city" type="text" />
          </Field>
          <Field label="Dal (anno)" htmlFor="x-start">
            <input id="x-start" name="startYear" type="number" min={1950} max={2100} />
          </Field>
          <Field label="Al (anno)" htmlFor="x-end">
            <input id="x-end" name="endYear" type="number" min={1950} max={2100} />
          </Field>
          <label className="flex min-h-11 items-center gap-2.5 text-[14px] sm:col-span-2">
            <input type="checkbox" name="current" value="1" /> È la mia esperienza attuale
          </label>
          <div className="sm:col-span-2">
            <Field label="Cosa facevi (facoltativo)" htmlFor="x-desc">
              <textarea id="x-desc" name="description" rows={3} />
            </Field>
          </div>
          <div>
            <Button size="sm">Aggiungi</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
