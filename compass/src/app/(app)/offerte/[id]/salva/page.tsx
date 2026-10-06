import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { Button, Card, PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { foldersOf, listFolders } from "@/lib/server/folders";
import { getJob } from "@/lib/server/jobs";
import { saveToFolderAction } from "../../../actions";

export const metadata = { title: "Mi interessa" };

/** "Mi interessa": put the offer in a folder (one click), or in a new one; then back where they were. */
export default async function SalvaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ back?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const data = await getJob(db, user.id, Number(id));
  if (!data) notFound();
  const back = sp.back?.startsWith("/") && !sp.back.startsWith("//") ? sp.back : `/offerte/${id}`;
  const [folders, inIds] = await Promise.all([listFolders(db, user.id), foldersOf(db, user.id, Number(id))]);
  return (
    <div className="mx-auto max-w-lg">
      <BackLink href={back}>Indietro</BackLink>
      <PageHeader title="Mi interessa" description={`${data.job.title} · ${data.job.company ?? "azienda non indicata"}. In quale cartella la metto?`} />
      <Card className="space-y-4">
        {folders.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {folders.map((f) =>
              inIds.includes(f.id) ? (
                <span key={f.id} className="inline-flex h-10 items-center rounded-full bg-accent-soft px-4 text-[14px] font-medium text-accent">
                  ✓ {f.name}
                </span>
              ) : (
                <form key={f.id} action={saveToFolderAction}>
                  <input type="hidden" name="jobId" value={id} />
                  <input type="hidden" name="folderId" value={f.id} />
                  <input type="hidden" name="back" value={back} />
                  <button className="inline-flex h-10 items-center rounded-full border border-line px-4 text-[14px] font-medium hover:border-accent hover:text-accent">{f.name}</button>
                </form>
              ),
            )}
          </div>
        )}
        <form action={saveToFolderAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="jobId" value={id} />
          <input type="hidden" name="back" value={back} />
          <label htmlFor="newFolder" className="sr-only">
            Nuova cartella
          </label>
          <input id="newFolder" name="newFolder" type="text" required placeholder={folders.length ? "Oppure una nuova cartella" : "Nome della cartella, es. Banche Milano"} className="min-w-0 flex-1" />
          <Button variant="accent">Salva</Button>
        </form>
      </Card>
    </div>
  );
}
