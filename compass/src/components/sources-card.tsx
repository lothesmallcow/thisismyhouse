import Link from "next/link";
import { eq } from "drizzle-orm";
import { searchNowAction } from "@/app/(app)/actions";
import { formatWhen } from "@/lib/core/time";
import { getDb, schema } from "@/lib/db";
import { env, mailboxConfig } from "@/lib/env";
import { lastQuickSearch } from "@/lib/pipeline/quick-search";
import { searchCodeFor } from "@/lib/pipeline/search-terms";
import { prioritizedCompanies } from "@/lib/server/career";
import { getSettings } from "@/lib/server/settings";
import { IconExternal } from "./icons";
import { Button, Card, Chip } from "./ui";

/** Where this person's offers come from, what is still off, and "Cerca ora". */
export async function SourcesCard({ userId }: { userId: number }) {
  const db = getDb();
  const [user, picks, settings, code, last] = await Promise.all([
    db.query.users.findFirst({ where: eq(schema.users.id, userId) }),
    prioritizedCompanies(db, userId),
    getSettings(db),
    searchCodeFor(db, userId),
    lastQuickSearch(db, userId),
  ]);
  const box = env.demoMode ? { user: "la casella demo" } : mailboxConfig(user?.mailboxKey);
  const withBoard = picks.filter((p) => p.company.ats && p.company.atsSlug).length;
  const web = env.demoMode || (Boolean(env.tavilyKey) && settings.w1Enabled);
  const api = env.demoMode || (Boolean(env.adzuna.appId && env.adzuna.appKey) && settings.adzunaEnabled);
  const now = new Date();
  const row = (on: boolean, title: string, text: React.ReactNode) => (
    <li className="flex gap-3">
      <span className="mt-0.5 shrink-0">{on ? <Chip tone="good">attiva</Chip> : <Chip>spenta</Chip>}</span>
      <span>
        <span className="font-medium text-ink">{title}</span>
        <span className="block text-muted">{text}</span>
      </span>
    </li>
  );
  return (
    <Card className="mt-4 !p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold">Da dove arrivano le tue offerte</p>
          <p className="text-[13px] text-faint">{last ? `Ultima ricerca ${formatWhen(last, now)}.` : "Nessuna ricerca ancora."} Poi ogni mattina, da sola.</p>
        </div>
        <form action={searchNowAction}>
          <Button size="sm">Cerca ora</Button>
        </form>
      </div>
      <ul className="mt-4 space-y-3 text-[13.5px]">
        {row(
          Boolean(box),
          "Avvisi di LinkedIn, Indeed e InfoJobs",
          box ? (
            <>
              La fonte migliore. Crea gli avvisi dai link qui sotto (dal tuo account, una volta sola) e falli arrivare a <strong>{box.user}</strong>: Compass li legge ogni mattina.
            </>
          ) : (
            "Al tuo account non è collegata una casella e-mail: chiedi all'amministratore di collegarla, poi crei gli avvisi dai link."
          ),
        )}
        {row(
          withBoard > 0,
          "Pagine lavoro delle aziende scelte",
          <>
            {withBoard} delle {picks.length} aziende che hai scelto hanno una pagina lavoro leggibile (le cerco da solo). <Link href="/aziende">Scegli altre aziende</Link>.
          </>,
        )}
        {row(web, "Ricerca sul web", web ? "Cerca le tue posizioni sui siti di lavoro ogni mattina." : "Si attiva con una chiave gratuita (TAVILY_API_KEY) messa dall'amministratore.")}
        {row(api, "Motori di offerte", api ? "Offerte da Adzuna, nelle tue zone." : "Si attiva con una chiave gratuita (ADZUNA_APP_ID) messa dall'amministratore.")}
      </ul>
      {box && code.alerts.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {code.alerts.map((a) => (
            <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13px] font-medium text-ink no-underline hover:bg-subtle">
              {a.site} · {a.what} <IconExternal size={13} />
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
