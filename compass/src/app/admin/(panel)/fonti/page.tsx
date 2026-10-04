import { Flash } from "@/components/flash";
import { Button, Card, Notice, SectionTitle } from "@/components/ui";
import { formatWhen } from "@/lib/core/time";
import { getDb, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { usageToday } from "@/lib/pipeline/discover";
import { getSettings } from "@/lib/server/settings";
import { runJobAction, saveSourcesAction } from "../../actions";

export const metadata = { title: "Fonti" };

const JOBS = [
  ["ingest", "Raccogli offerte (casella, API, aziende, siti)"],
  ["discover", "Ricerca sul web (W1)"],
  ["queue", "Invia la coda (se è l'ora)"],
  ["replies", "Controlla le risposte"],
  ["digest", "E-mail del mattino"],
] as const;

export default async function FontiPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  const s = await getSettings(db);
  const health = await db.select().from(schema.sourceHealth);
  const w1Used = await usageToday(db, "w1-queries");
  const toggle = (name: keyof typeof s, label: string, note?: string) => (
    <label className="flex min-h-[44px] items-center gap-3 rounded-lg border border-line bg-surface px-3.5 text-[14px]">
      <input type="checkbox" name={name} value="1" defaultChecked={Boolean(s[name])} />
      <span>
        <strong>{label}</strong>
        {note && <span className="block text-[13px] text-muted">{note}</span>}
      </span>
    </label>
  );
  return (
    <>
      <Flash code={sp.msg} />
      <h1 className="text-[22px] font-semibold">Fonti e impostazioni</h1>
      <p className="mt-2 max-w-3xl text-muted">Ogni fonte è indipendente: se una si rompe, le altre continuano. Qui vedi come stanno.</p>

      <SectionTitle>Salute delle fonti</SectionTitle>
      <div tabIndex={0} role="region" aria-label="Contenuto scorrevole" className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[760px] text-left text-[13.5px]">
          <thead className="bg-subtle">
            <tr>
              <th className="px-4 py-2">Fonte</th>
              <th className="px-4 py-2">Ultimo successo</th>
              <th className="px-4 py-2">Ultima volta</th>
              <th className="px-4 py-2">Totale</th>
              <th className="px-4 py-2">Errori lettura</th>
              <th className="px-4 py-2">Blocchi</th>
              <th className="px-4 py-2">Stato</th>
            </tr>
          </thead>
          <tbody>
            {health.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-muted" colSpan={7}>
                  Nessuna esecuzione ancora. Premi &ldquo;Raccogli offerte&rdquo; qui sotto.
                </td>
              </tr>
            )}
            {health.map((h) => {
              const bad = h.consecutiveFailures > 0 || (h.pausedUntil && h.pausedUntil > new Date());
              return (
                <tr key={h.source} className="border-t border-line align-top">
                  <td className="px-4 py-2 font-semibold">{h.source}</td>
                  <td className="px-4 py-2">{h.lastSuccessAt ? formatWhen(h.lastSuccessAt) : "mai"}</td>
                  <td className="px-4 py-2">{h.lastRunAt ? `${formatWhen(h.lastRunAt)} (${h.itemsFound})` : "-"}</td>
                  <td className="px-4 py-2">{h.totalFound}</td>
                  <td className="px-4 py-2">{h.parseFailures}</td>
                  <td className="px-4 py-2">{h.blocks}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${bad ? "bg-bad-soft text-bad" : "bg-good-soft text-good"}`}>{bad ? "attenzione" : "ok"}</span>
                    {h.lastError && <span className="mt-1 block text-[12.5px] text-muted">{h.lastError}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SectionTitle>Esegui ora</SectionTitle>
      <div className="flex flex-wrap gap-3">
        {JOBS.map(([job, label]) => (
          <form key={job} action={runJobAction}>
            <input type="hidden" name="job" value={job} />
            <Button variant="secondary">{label}</Button>
          </form>
        ))}
      </div>

      <SectionTitle>Impostazioni</SectionTitle>
      <form action={saveSourcesAction}>
        <Card className="space-y-4">
          {toggle("adzunaEnabled", "Adzuna (API, gratis)", env.adzuna.appId || env.demoMode ? "Chiavi presenti." : "Mancano ADZUNA_APP_ID / ADZUNA_APP_KEY nel file .env.")}
          {toggle("joobleEnabled", "Jooble (API)", "La chiave gratuita ha un limite TOTALE di circa 500 richieste: tenerla spenta salvo necessità.")}
          {toggle("w1Enabled", "W1: ricerca sul web con Tavily", env.tavilyKey || env.demoMode ? `Usate oggi ${w1Used} ricerche.` : "Manca TAVILY_API_KEY nel file .env.")}
          <label className="block space-y-2">
            <span className="font-semibold">Limite ricerche W1 al giorno (max 100)</span>
            <input name="w1DailyCap" type="number" min={0} max={100} defaultValue={s.w1DailyCap} />
          </label>
          {toggle("geocoderEnabled", "Geocoder online (OpenStreetMap Nominatim) per le località fuori dall'elenco dei comuni", "Spento finché non lo approvi: 1 richiesta al secondo, massimo 10 per raccolta, risultati memorizzati.")}
          {toggle("digestEnabled", "E-mail del mattino (interruttore generale)", "Ognuno può spegnere la sua dal profilo. Destinatario: l'e-mail impostata in Persone.")}
          <label className="block space-y-1.5">
            <span className="text-[13px] font-medium">Chi può creare un account</span>
            <select name="registration" defaultValue={s.registration}>
              <option value="invite">Solo con codice di invito</option>
              <option value="open">Chiunque (massimo 20 al giorno)</option>
              <option value="closed">Nessuno: solo l&apos;amministratore</option>
            </select>
          </label>
          <Button>Salva</Button>
        </Card>
      </form>

      <SectionTitle>W3: pagine pubbliche delle piattaforme</SectionTitle>
      <Notice tone="info" title="Spento (di proposito)">
        Il modulo W3 (lettura di singole pagine pubbliche di LinkedIn/Indeed/InfoJobs) non è incluso in questo repository pubblico. Va attivato solo dopo il tuo OK sui termini d&apos;uso. Vedi docs/adr/0009-w3-optional-enrichment.md.
      </Notice>
    </>
  );
}
