import { BackLink } from "@/components/back-link";
import { queryWords } from "@/lib/core/search-code";
import { IconExternal } from "@/components/icons";
import { Card, Chip, PageHeader, SectionTitle } from "@/components/ui";
import { countryName } from "@/lib/core/geo";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { searchCodeFor } from "@/lib/pipeline/search-terms";

export const metadata = { title: "Codice di ricerca" };

/** The person's search code, the searches it makes, and ready links to set up the same alerts. */
export default async function CodicePage() {
  const user = await requireUser();
  const sc = await searchCodeFor(getDb(), user.id);
  const api = sc.queries.filter((q) => q.channel === "api");
  const web = sc.queries.filter((q) => q.channel === "web");
  return (
    <>
      <BackLink href="/profilo">Profilo</BackLink>
      <PageHeader
        title="Codice di ricerca"
        description="Le tue risposte al questionario diventano un codice; dal codice nasce un gruppo fisso di ricerche. Chi ha lo stesso codice condivide le stesse ricerche, e se cambi una risposta cambiano solo le ricerche che ne dipendono."
      />
      <Card>
        <p className="break-all font-mono text-[13px]">{sc.code}</p>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {sc.brackets.map((b) => (
            <div key={b.label}>
              <dt className="text-[12px] uppercase tracking-[0.08em] text-faint">{b.label}</dt>
              <dd className="text-[14px]">{b.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <SectionTitle>Crea gli avvisi sui grandi siti</SectionTitle>
      <p className="-mt-1 mb-3 text-[13.5px] text-muted">
        LinkedIn, Indeed e InfoJobs non danno le loro offerte alle app: il modo corretto è un avviso e-mail. Apri ogni link (sei già nella ricerca giusta), premi &quot;Crea avviso&quot; e fai arrivare le e-mail alla casella della ricerca di lavoro: Compass le legge ogni mattina.
      </p>
      <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
        {sc.alerts.map((a) => (
          <li key={a.url}>
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between gap-3 px-4 py-2 text-[14px] no-underline hover:bg-subtle">
              <span>
                <span className="font-medium">{a.site}</span> · {a.what} · {countryName(a.country)}
              </span>
              <IconExternal size={14} />
            </a>
          </li>
        ))}
      </ul>

      <SectionTitle>Le ricerche del tuo codice</SectionTitle>
      <p className="-mt-1 mb-3 text-[13.5px] text-muted">Il ruolo per luogo, sulle bacheche delle aziende, nelle aziende e nei settori che hai scelto, con gli altri nomi del ruolo. Ognuna al massimo una volta al giorno (anche se condivisa con altre persone), a turno entro i limiti giornalieri: in pochi giorni le fa tutte.</p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="!p-4">
          <p className="text-[14px] font-semibold">Siti di offerte (API) · {api.length}</p>
          <ul className="mt-2 space-y-1 text-[13px] text-muted">
            {api.map((q) => (
              <li key={q.key}>
                {queryWords(q)} · {q.where || countryName(q.country)}
                {q.distanceKm ? ` (${q.distanceKm} km)` : ""}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="!p-4">
          <p className="text-[14px] font-semibold">Ricerca sul web · {web.length}</p>
          <ul className="mt-2 space-y-1 text-[13px] text-muted">
            {web.map((q) => (
              <li key={q.key}>
                {queryWords(q)} · {q.where || (q.kind === "azienda" ? "ovunque" : countryName(q.country))} {q.sites && q.sites.length > 3 ? <Chip>bacheche delle aziende</Chip> : q.sites?.length ? <Chip>{q.sites[0]}</Chip> : null}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
