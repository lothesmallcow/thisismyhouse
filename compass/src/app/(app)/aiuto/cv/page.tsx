import { Flash } from "@/components/flash";
import { IconArrowLeft, IconDoc } from "@/components/icons";
import { Button, Card, Field, LinkButton, PageHeader, SectionTitle } from "@/components/ui";
import { getDb, schema } from "@/lib/db";
import { deleteCvAction, saveCvTextAction, setDefaultCvAction, uploadCvAction } from "../../actions";
import { CvTips } from "@/components/cv-tips";

export const metadata = { title: "I miei CV" };

export default async function CvPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const cvs = await getDb()
    .select({ id: schema.cvs.id, label: schema.cvs.label, roleFamily: schema.cvs.roleFamily, filename: schema.cvs.filename, size: schema.cvs.size, isDefault: schema.cvs.isDefault, text: schema.cvs.text })
    .from(schema.cvs);
  return (
    <>
      <Flash code={sp.msg} />
      <LinkButton href="/aiuto" variant="quiet" className="-ml-3 mb-2 px-3">
        <IconArrowLeft /> Torna ad Aiuto
      </LinkButton>
      <PageHeader title="I miei CV" help="Puoi tenere fino a 3 CV, uno per tipo di lavoro. Scelgo io quello giusto per ogni offerta, e tu puoi sempre cambiarlo." />

      <div className="space-y-4">
        {cvs.map((cv) => (
          <Card key={cv.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[1.15rem] font-bold">
                <IconDoc /> {cv.label}
              </p>
              {cv.isDefault && <span className="rounded-full bg-sage px-3 py-1 font-bold text-sage-ink">Principale</span>}
            </div>
            <p className="mt-1 text-ink-soft">
              {cv.filename} · {(cv.size / 1024).toFixed(0)} KB
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={`/api/cv/${cv.id}`} className="inline-flex min-h-[56px] items-center rounded-2xl border-2 border-navy px-5 font-bold no-underline" download>
                Scarica
              </a>
              {!cv.isDefault && (
                <form action={setDefaultCvAction}>
                  <input type="hidden" name="cvId" value={cv.id} />
                  <Button variant="secondary">Rendi principale</Button>
                </form>
              )}
              <form action={deleteCvAction}>
                <input type="hidden" name="cvId" value={cv.id} />
                <Button variant="quiet">Togli questo CV</Button>
              </form>
            </div>
            <form action={saveCvTextAction} className="mt-5 space-y-4 border-t border-line pt-5">
              <input type="hidden" name="cvId" value={cv.id} />
              <Field label="Per che tipo di lavoro?" htmlFor={`family-${cv.id}`}>
                <input id={`family-${cv.id}`} name="family" type="text" defaultValue={cv.roleFamily} />
              </Field>
              <Field label="Testo del CV (serve per Claude)" hint="Incolla qui il testo del CV. Lo uso solo per preparare il testo da dare a Claude." htmlFor={`text-${cv.id}`}>
                <textarea id={`text-${cv.id}`} name="text" rows={6} defaultValue={cv.text} />
              </Field>
              <Button variant="secondary">Salva</Button>
            </form>
          </Card>
        ))}
      </div>

      {cvs.length < 3 && (
        <>
          <SectionTitle>Carica un CV</SectionTitle>
          <CvTips />
          <form action={uploadCvAction} className="mt-5 space-y-5">
            <Field label="Il file PDF del CV" htmlFor="file" hint="Al massimo 2 MB.">
              <input id="file" name="file" type="file" accept="application/pdf,.pdf" required />
            </Field>
            <Field label="Per che tipo di lavoro?" htmlFor="family" hint="Per esempio: Amministrazione, Segreteria.">
              <input id="family" name="family" type="text" />
            </Field>
            <Field label="Testo del CV (facoltativo)" htmlFor="text" hint="Se vuoi usare Claude, incolla qui il testo del CV.">
              <textarea id="text" name="text" rows={5} />
            </Field>
            <Button wide>Carica il CV</Button>
          </form>
        </>
      )}
    </>
  );
}
