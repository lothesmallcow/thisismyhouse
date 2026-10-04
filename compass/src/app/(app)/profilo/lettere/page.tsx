import Link from "next/link";
import { eq } from "drizzle-orm";
import { BackLink } from "@/components/back-link";
import { Flash } from "@/components/flash";
import { IconArrowRight } from "@/components/icons";
import { List, PageHeader } from "@/components/ui";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";

export const metadata = { title: "Lettere" };

export default async function LetterePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const tpls = await getDb().select().from(schema.templates).where(eq(schema.templates.userId, user.id));
  return (
    <div className="mx-auto max-w-3xl">
      <Flash code={sp.msg} />
      <BackLink href="/profilo">Profilo</BackLink>
      <PageHeader title="Lettere di candidatura" description="I testi delle e-mail. Le parole tra graffe, come {azienda}, si riempiono da sole." />
      <List>
        {tpls.map((t) => (
          <Link key={t.id} href={`/profilo/lettere/${t.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 text-ink no-underline hover:bg-subtle/60">
            <span className="min-w-0">
              <span className="block text-[14px] font-medium">{t.name}</span>
              <span className="block truncate text-[13px] text-muted">
                {t.kind === "spontaneous" ? "Candidature spontanee" : "Risposta agli annunci"} · {t.subject}
              </span>
            </span>
            <IconArrowRight size={16} className="shrink-0 text-faint" />
          </Link>
        ))}
      </List>
    </div>
  );
}
