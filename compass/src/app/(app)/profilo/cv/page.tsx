import { and, eq } from "drizzle-orm";
import { BackLink } from "@/components/back-link";
import { CvTips } from "@/components/cv-tips";
import { Flash } from "@/components/flash";
import { IconDoc } from "@/components/icons";
import { Button, Card, Chip, Field, PageHeader, SectionTitle } from "@/components/ui";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { deleteCvAction, saveCvTextAction, setDefaultCvAction, uploadCvAction } from "../../actions";

export const metadata = { title: "CV" };

export default async function CvPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const cvs = await getDb()
    .select({ id: schema.cvs.id, label: schema.cvs.label, roleFamily: schema.cvs.roleFamily, filename: schema.cvs.filename, size: schema.cvs.size, isDefault: schema.cvs.isDefault, text: schema.cvs.text })
    .from(schema.cvs)
    .where(and(eq(schema.cvs.userId, user.id)));
  return (
    <div className="mx-auto max-w-3xl">
      <Flash code={sp.msg} />
      <BackLink href="/profilo">Profilo</BackLink>
      <PageHeader title="CV" description="Fino a 3 CV, uno per tipo di posizione. Per ogni offerta viene scelto quello più adatto; puoi sempre cambiarlo. Il testo del CV serve anche per i suggerimenti di aziende." />

      <div className="space-y-3">
        {cvs.map((cv) => (
          <Card key={cv.id} className="!p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[14.5px] font-medium">
                <IconDoc size={17} className="text-faint" /> {cv.label} {cv.isDefault && <Chip tone="good">Principale</Chip>}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <a href={`/api/cv/${cv.id}`} className="inline-flex h-8 items-center rounded-lg border border-line-strong px-3 text-[13px] font-medium text-ink no-underline hover:bg-subtle" download>
                  Scarica
                </a>
                {!cv.isDefault && (
                  <form action={setDefaultCvAction}>
                    <input type="hidden" name="cvId" value={cv.id} />
                    <Button variant="secondary" size="sm">
                      Rendi principale
                    </Button>
                  </form>
                )}
                <form action={deleteCvAction}>
                  <input type="hidden" name="cvId" value={cv.id} />
                  <Button variant="danger" size="sm">
                    Elimina
                  </Button>
                </form>
              </div>
            </div>
            <p className="mt-1 text-[12.5px] text-faint">
              {cv.filename} · {(cv.size / 1024).toFixed(0)} KB
            </p>
            <details className="mt-3">
              <summary className="flex min-h-[32px] cursor-pointer items-center text-[13px] text-muted">Tipo di posizione e testo del CV</summary>
              <form action={saveCvTextAction} className="mt-3 space-y-3">
                <input type="hidden" name="cvId" value={cv.id} />
                <Field label="Per che tipo di posizione" htmlFor={`family-${cv.id}`}>
                  <input id={`family-${cv.id}`} name="family" type="text" defaultValue={cv.roleFamily} />
                </Field>
                <Field label="Testo del CV" hint="Usato per il testo da dare a Claude e per suggerirti aziende. Resta privato." htmlFor={`text-${cv.id}`}>
                  <textarea id={`text-${cv.id}`} name="text" rows={6} defaultValue={cv.text} />
                </Field>
                <Button variant="secondary" size="sm">
                  Salva
                </Button>
              </form>
            </details>
          </Card>
        ))}
      </div>

      {cvs.length < 3 && (
        <>
          <SectionTitle>Carica un CV</SectionTitle>
          <Card className="!p-4">
            <CvTips />
            <form action={uploadCvAction} className="mt-4 space-y-4">
              <Field label="File PDF" htmlFor="file" hint="Al massimo 2 MB.">
                <input id="file" name="file" type="file" accept="application/pdf,.pdf" required />
              </Field>
              <Field label="Per che tipo di posizione" htmlFor="family" hint="Es. Amministrazione, Finanza, Consulenza.">
                <input id="family" name="family" type="text" />
              </Field>
              <Field label="Testo del CV (facoltativo)" htmlFor="text" hint="Copia e incolla il testo del CV.">
                <textarea id="text" name="text" rows={5} />
              </Field>
              <Button>Carica</Button>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}
