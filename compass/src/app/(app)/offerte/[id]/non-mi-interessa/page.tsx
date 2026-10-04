import { notFound } from "next/navigation";
import { IconArrowLeft } from "@/components/icons";
import { Button, ChoiceRow, LinkButton, PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { DISMISS_LABELS, getJob } from "@/lib/server/jobs";
import { dismissAction } from "../../../actions";

export const metadata = { title: "Non mi interessa" };

export default async function NonMiInteressa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getJob(getDb(), Number(id));
  if (!data) notFound();
  return (
    <>
      <LinkButton href={`/offerte/${id}`} variant="quiet" className="-ml-3 mb-2 px-3">
        <IconArrowLeft /> Torna all&apos;offerta
      </LinkButton>
      <PageHeader title="Non ti interessa?" help="Dimmi perché, se vuoi: così le prossime offerte saranno più adatte a te. Puoi anche non dirlo." />
      <p className="mb-4 text-[1.1rem]">
        <strong>{data.job.title}</strong> · {data.job.company ?? "azienda non indicata"}
      </p>
      <form action={dismissAction} className="space-y-3">
        <input type="hidden" name="jobId" value={id} />
        {Object.entries(DISMISS_LABELS).map(([k, label]) => (
          <ChoiceRow key={k} type="radio" name="reason" value={k} defaultChecked={k === "nessuno"}>
            {label}
          </ChoiceRow>
        ))}
        <div className="pt-3">
          <Button wide>Togli questa offerta</Button>
        </div>
      </form>
    </>
  );
}
