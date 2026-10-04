import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft } from "@/components/icons";
import { Button, ChoiceRow, PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { DISMISS_LABELS, getJob } from "@/lib/server/jobs";
import { dismissAction } from "../../../actions";

export const metadata = { title: "Non mi interessa" };

export default async function NonMiInteressa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const data = await getJob(getDb(), user.id, Number(id));
  if (!data) notFound();
  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/offerte/${id}`} className="mb-5 inline-flex h-8 items-center gap-1.5 text-[13px] text-muted no-underline hover:text-ink">
        <IconArrowLeft size={16} /> Offerta
      </Link>
      <PageHeader title="Nascondi questa offerta" description={`${data.job.title} · ${data.job.company ?? "azienda non indicata"}. Se dici perché, le prossime offerte saranno più precise.`} />
      <form action={dismissAction} className="space-y-2">
        <input type="hidden" name="jobId" value={id} />
        {Object.entries(DISMISS_LABELS).map(([k, label]) => (
          <ChoiceRow key={k} type="radio" name="reason" value={k} defaultChecked={k === "nessuno"}>
            {label}
          </ChoiceRow>
        ))}
        <div className="pt-3">
          <Button wide>Nascondi</Button>
        </div>
      </form>
    </div>
  );
}
