import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { Flash } from "@/components/flash";
import { IconFolder } from "@/components/icons";
import { Button, PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { listFolders } from "@/lib/server/folders";
import { createFolderAction, deleteFolderAction, renameFolderAction } from "../../actions";

export const metadata = { title: "Cartelle" };

export default async function CartellePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const folders = await listFolders(getDb(), user.id);
  return (
    <>
      <Flash code={sp.msg} />
      <BackLink href="/offerte">Offerte</BackLink>
      <PageHeader title="Cartelle" description="Le offerte che hai messo da parte, divise come preferisci. Salvi un'offerta dalla sua pagina; qui crei, rinomini ed elimini le cartelle." />
      <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
        {folders.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href={`/offerte/cartelle/${f.id}`} className="flex min-h-11 min-w-0 items-center gap-2.5 text-[14.5px] font-medium no-underline">
              <IconFolder size={18} className="text-accent" /> {f.name}
              <span className="text-[13px] font-normal text-faint">{f.count === 1 ? "1 offerta" : `${f.count} offerte`}</span>
            </Link>
            <details className="text-[13px]">
              <summary className="flex min-h-9 cursor-pointer items-center text-muted">Modifica</summary>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <form action={renameFolderAction} className="flex gap-2">
                  <input type="hidden" name="folderId" value={f.id} />
                  <label htmlFor={`name-${f.id}`} className="sr-only">
                    Nuovo nome per {f.name}
                  </label>
                  <input id={`name-${f.id}`} name="name" type="text" defaultValue={f.name} className="w-48" />
                  <Button size="sm" variant="secondary">
                    Rinomina
                  </Button>
                </form>
                <form action={deleteFolderAction}>
                  <input type="hidden" name="folderId" value={f.id} />
                  <Button size="sm" variant="ghost" aria-label={`Elimina la cartella ${f.name}`}>
                    Elimina
                  </Button>
                </form>
              </div>
            </details>
          </li>
        ))}
      </ul>
      <form action={createFolderAction} className="mt-4 flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <label htmlFor="new-folder" className="block text-[13px] font-medium">
            Nuova cartella
          </label>
          <input id="new-folder" name="name" type="text" placeholder="Es. Colloqui da preparare" className="w-64" required />
        </div>
        <Button variant="secondary">Crea</Button>
      </form>
    </>
  );
}
