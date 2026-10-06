import { BackLink } from "@/components/back-link";
import { Flash } from "@/components/flash";
import { Button, Empty, PageHeader } from "@/components/ui";
import { formatWhen } from "@/lib/core/time";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { dismissedList } from "@/lib/server/jobs";
import { undoDismissAction } from "../../actions";

export const metadata = { title: "Scartate" };

/** The offers someone dismissed: gone from their account and never proposed again, unless undone here. */
export default async function ScartatePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const list = await dismissedList(getDb(), user.id);
  const now = new Date();
  return (
    <div className="mx-auto max-w-2xl">
      <Flash code={sp.msg} />
      <BackLink href="/offerte">Offerte</BackLink>
      <PageHeader title="Scartate" description="Offerte cancellate con “Non mi interessa”: non te le ripropongo più, né dallo stesso link né lo stesso annuncio su un altro sito. Le altre offerte della stessa azienda restano." />
      {list.length === 0 ? (
        <Empty title="Nessuna offerta scartata">Quando premi “Non mi interessa” su un&apos;offerta, finisce qui.</Empty>
      ) : (
        <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
          {list.map((d) => (
            <li key={d.dedupeKey} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0 text-[14px]">
                <span className="font-medium">{d.title || "Offerta"}</span>
                <span className="block text-[13px] text-muted">
                  {[d.company, d.city].filter(Boolean).join(" · ")} · scartata {formatWhen(d.at, now)}
                </span>
              </span>
              <form action={undoDismissAction}>
                <input type="hidden" name="key" value={d.dedupeKey} />
                <Button variant="secondary" size="sm" aria-label={`Annulla lo scarto di ${d.title}`}>
                  Annulla
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-[12.5px] text-faint">Dopo sei mesi lo scarto si dimentica.</p>
    </div>
  );
}
