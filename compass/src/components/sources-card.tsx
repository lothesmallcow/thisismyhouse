import Link from "next/link";
import { eq } from "drizzle-orm";
import { searchNowAction } from "@/app/(app)/actions";
import { formatWhen } from "@/lib/core/time";
import { getDb, schema } from "@/lib/db";
import { env, mailboxConfig } from "@/lib/env";
import { lastQuickResult, lastQuickSearch } from "@/lib/pipeline/quick-search";
import { AutoRefresh } from "./auto-refresh";
import { searchCodeFor } from "@/lib/pipeline/search-terms";
import { searchTargets } from "@/lib/pipeline/targets";
import { getSettings } from "@/lib/server/settings";
import { IconExternal } from "./icons";
import { Button, Card, Chip } from "./ui";

/** Where this person's offers come from, what is still off, and "Cerca ora". */
export async function SourcesCard({ userId }: { userId: number }) {
  const db = getDb();
  const [user, picks, settings, code, last, result] = await Promise.all([
    db.query.users.findFirst({ where: eq(schema.users.id, userId) }),
    searchTargets(db, userId),
    getSettings(db),
    searchCodeFor(db, userId),
    lastQuickSearch(db, userId),
    lastQuickResult(db, userId),
  ]);
  const box = env.demoMode ? { user: "la casella demo" } : mailboxConfig(user?.mailboxKey);
  const withBoard = picks.filter((c) => (c.ats && c.atsSlug) || c.careersUrl).length;
  const web = env.demoMode || (Boolean(env.tavilyKey) && settings.w1Enabled);
  const api = env.demoMode || (Boolean(env.adzuna.appId && env.adzuna.appKey) && settings.adzunaEnabled);
  const now = new Date();
  // Started less than two minutes ago and not finished yet: still running.
  const running = last != null && now.getTime() - last.getTime() < 120_000 && !(result?.finishedAt && new Date(result.finishedAt) >= last);
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
          <p className="text-[13px] text-faint" aria-live="polite">
            {running
              ? `Web scraping in corso: ${result?.sites ?? 0} siti e ${result?.feeds ?? 0} pagine lavoro letti finora, ${result?.found ?? 0} offerte trovate (${result?.created ?? 0} nuove). Le offerte compaiono qui man mano.`
              : last && result
                ? `Ultimo web scraping ${formatWhen(last, now)}: ${result.sites} siti di aziende e ${result.feeds} pagine lavoro letti${result.web ? `, ${result.web} ricerche sul web` : ""}; ${result.found} offerte trovate, ${result.created} nuove.`
                : "Nessuna ricerca ancora."}{" "}
            Poi ogni mattina, da sola.
          </p>
        </div>
        <form action={searchNowAction}>
          <Button size="sm" disabled={running}>
            {running ? "In corso…" : "Fai web scraping"}
          </Button>
        </form>
      </div>
      {running && <AutoRefresh everyMs={5000} times={24} />}
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
          true, // no key needed: always on
          "Siti delle aziende (web scraping)",
          <>
            Leggo le pagine lavoro di {picks.length} aziende: quelle che scegli e tutte quelle del settore delle tue posizioni (per esempio tutte le banche d&apos;investimento), rispettando le regole di ogni sito. Pagina trovata per {withBoard}; a ogni clic ne provo altre. <Link href="/aziende">Aggiungi aziende</Link>.
          </>,
        )}
        {row(
          web,
          "Ricerca sul web (LinkedIn, Indeed, InfoJobs)",
          web
            ? "Cerco le tue posizioni con un motore di ricerca e ti mostro gli annunci trovati, senza entrare nei siti."
            : "Cerca gli annunci con un motore di ricerca e te li mostra senza entrare nei siti. Si attiva con una chiave gratuita (TAVILY_API_KEY) messa dall'amministratore.",
        )}
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
