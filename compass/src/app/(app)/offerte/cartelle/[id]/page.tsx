import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { Flash } from "@/components/flash";
import { JobCard } from "@/components/job-card";
import { Button, Empty, PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { folderJobs } from "@/lib/server/folders";
import { removeFromFolderAction } from "../../../actions";

export default async function CartellaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const data = await folderJobs(getDb(), user.id, Number(id));
  if (!data) notFound();
  const back = `/offerte/cartelle/${data.folder.id}`;
  return (
    <>
      <Flash code={sp.msg} />
      <BackLink href="/offerte/cartelle">Cartelle</BackLink>
      <PageHeader title={data.folder.name} description={`${data.jobs.length} ${data.jobs.length === 1 ? "offerta" : "offerte"}, la più recente in alto.`} />
      {data.jobs.length === 0 ? (
        <Empty title="Cartella vuota">Premi &quot;Mi interessa&quot; su un&apos;offerta e scegli questa cartella.</Empty>
      ) : (
        <div className="space-y-2.5">
          {data.jobs.map((j) => (
            <div key={j.id}>
              <JobCard job={j} />
              <form action={removeFromFolderAction} className="mt-1 text-right">
                <input type="hidden" name="folderId" value={data.folder.id} />
                <input type="hidden" name="jobId" value={j.id} />
                <input type="hidden" name="back" value={back} />
                <Button size="sm" variant="ghost" aria-label={`Togli ${j.title} dalla cartella`}>
                  Togli dalla cartella
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
