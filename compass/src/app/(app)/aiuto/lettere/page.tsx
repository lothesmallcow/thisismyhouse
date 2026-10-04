import { Flash } from "@/components/flash";
import { IconArrowLeft } from "@/components/icons";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { getDb, schema } from "@/lib/db";

export const metadata = { title: "Le mie lettere" };

export default async function LetterePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const tpls = await getDb().select().from(schema.templates);
  return (
    <>
      <Flash code={sp.msg} />
      <LinkButton href="/aiuto" variant="quiet" className="-ml-3 mb-2 px-3">
        <IconArrowLeft /> Torna ad Aiuto
      </LinkButton>
      <PageHeader title="Le mie lettere" help="Sono i testi delle e-mail di candidatura. Le parole tra parentesi graffe, come {azienda}, le riempio io." />
      <div className="space-y-4">
        {tpls.map((t) => (
          <Card key={t.id}>
            <p className="text-[1.15rem] font-bold">{t.name}</p>
            <p className="text-ink-soft">{t.kind === "spontaneous" ? "Per le candidature spontanee" : "Per rispondere agli annunci"}</p>
            <p className="mt-3 font-bold">{t.subject}</p>
            <p className="mt-1 line-clamp-4 whitespace-pre-line text-ink-soft">{t.body}</p>
            <LinkButton href={`/aiuto/lettere/${t.id}`} variant="secondary" className="mt-4">
              Cambia il testo
            </LinkButton>
          </Card>
        ))}
      </div>
    </>
  );
}
