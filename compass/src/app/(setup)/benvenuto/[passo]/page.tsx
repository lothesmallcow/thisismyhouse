import { RecommendedPositions } from "@/components/recommended-positions";
import { cvPositionsFor } from "@/lib/server/cv-positions";
import { PriorityChoice } from "@/components/priority-choice";
import { COUNTRIES, regionsOf } from "@/lib/core/geo";
import { isGenericRole, positionsFor } from "@/lib/catalog/positions";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { AltroCompany, AltroSector, CompanyGroups, SectorPills } from "@/components/catalog-forms";
import { CatalogFilter } from "@/components/catalog-filter";
import { CvTips } from "@/components/cv-tips";
import { Flash } from "@/components/flash";
import { IconArrowLeft, IconCheck, IconDoc, IconSparkle } from "@/components/icons";
import { Button, ChoiceRow, Field, LinkButton, Notice, PillCheck } from "@/components/ui";
import { TASTES } from "@/lib/catalog/data";
import { CONTRACT_LABELS } from "@/lib/core/extract";
import { getDb, schema } from "@/lib/db";
import type { Track } from "@/lib/db/schema";
import { requireUser } from "@/lib/server/auth";
import { getPrefs, listCompanies, listSectors } from "@/lib/server/catalog";
import { suggestCompanies } from "@/lib/server/career";
import { getProfile, suggestSynonyms, type Profile } from "@/lib/server/profile";
import { listExperiences } from "@/lib/server/experiences";
import { formatPeriod } from "@/lib/core/timeline";
import { uploadCvAction } from "../../../(app)/actions";
import { saveStepAction } from "../actions";
import { HELP, QUICK_STEPS, STEPS, TITLES, stepsFor, type StepId } from "../steps";
import { chooseModeAction } from "../actions";
import { KmSlider, NetSalaryField } from "./fields";

export const metadata = { title: "Questionario" };
// The last answer starts the first search in the background: give it time.
export const maxDuration = 60;

export default async function WizardPage({ params, searchParams }: { params: Promise<{ passo: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { passo } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const p = await getProfile(db, user.id);
  const back = sp.ritorno === "profilo";
  const steps = back ? STEPS[p.track] : stepsFor(p.track, p.onboardingMode);
  const total = steps.length;
  // New accounts first choose the version of the questionnaire.
  if (passo !== "inizio" && passo !== "fine" && passo !== "risposte" && !back && !p.onboardedAt && !p.onboardingMode) redirect(`/benvenuto/inizio${sp.msg ? `?msg=${encodeURIComponent(sp.msg)}` : ""}`);
  if (passo === "inizio") {
    return (
      <div className="py-4">
        <Flash code={sp.msg} />
        <h1 className="text-[24px] font-semibold">Benvenuta, benvenuto in Compass</h1>
        <p className="mt-2 text-[15px] text-muted">Qualche domanda per cercare le offerte giuste per te. Scegli quanto tempo hai: puoi sempre completare o cambiare le risposte dal Profilo.</p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <form action={chooseModeAction} className="flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-5">
            <input type="hidden" name="mode" value="veloce" />
            <p className="text-[16px] font-semibold">Veloce</p>
            <p className="mt-1 text-[13px] text-faint">{QUICK_STEPS[p.track].length} domande · circa 2 minuti</p>
            <p className="mt-3 flex-1 text-[14px] text-muted">
              {p.track === "stage" ? "Studi, dove, settori e CV." : "Ruolo, dove, stipendio minimo e CV."} Le offerte arrivano subito; i dettagli li aggiungi quando vuoi.
            </p>
            <Button className="mt-4">Inizia la versione veloce</Button>
          </form>
          <form action={chooseModeAction} className="flex flex-col rounded-[var(--radius-card)] border border-accent bg-surface p-5">
            <input type="hidden" name="mode" value="completo" />
            <p className="text-[16px] font-semibold">Completo · consigliato</p>
            <p className="mt-1 text-[13px] text-faint">{STEPS[p.track].length} domande · circa 8-10 minuti</p>
            <p className="mt-3 flex-1 text-[14px] text-muted">Anche contratto, lingue, settori, gusti, aziende e cosa evitare: punteggi e ricerche molto più precisi fin dal primo giorno.</p>
            <Button className="mt-4">Inizia la versione completa</Button>
          </form>
        </div>
      </div>
    );
  }

  if (passo === "fine") {
    return (
      <div className="py-6">
        <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-good-soft text-good">
          <IconCheck size={20} />
        </span>
        <h1 className="text-[24px] font-semibold">Fatto{p.name ? `, ${p.name.split(" ")[0]}` : ""}.</h1>
        <p className="mt-2 text-[15px] text-muted">
          Le offerte sono già ordinate per te. Da domani mattina ricevi un&apos;e-mail con le novità. Tutto quello che hai scelto si cambia da Profilo e Aziende.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <LinkButton href="/collega">Collega le fonti (5 minuti)</LinkButton>
          <LinkButton href="/offerte" variant="secondary">
            {p.track === "stage" ? "Vedi gli stage" : "Vedi le offerte"}
          </LinkButton>
          <LinkButton href="/benvenuto/risposte" variant="secondary">
            Prepara le risposte per i siti
          </LinkButton>
        </div>
      </div>
    );
  }

  const n = Number(passo);
  const id: StepId | "risposte" | null = passo === "risposte" ? "risposte" : (steps[n - 1] ?? null);
  if (!id) notFound();
  if (id !== "risposte" && !back && !p.onboardedAt && n > p.onboardingStep + 1) redirect(`/benvenuto/${p.onboardingStep}`);
  const synonymsPhase = id === "ruolo" && sp.fase === "sinonimi";
  const prevHref = back ? "/profilo" : Number.isFinite(n) && n > 1 ? `/benvenuto/${synonymsPhase ? n : n - 1}` : null;
  const title = id === "risposte" ? "Risposte pronte per i siti" : synonymsPhase ? "Vanno bene anche questi ruoli?" : TITLES[id](p.track);
  const help =
    id === "risposte"
      ? "I moduli online chiedono spesso queste cose: scrivile una volta, poi le copi con un tocco."
      : synonymsPhase
        ? "Ruoli simili a quelli che hai scritto. Togli quelli che non vanno."
        : HELP[id](p.track);

  return (
    <>
      <Flash code={sp.msg} />
      {Number.isFinite(n) && (
        <div className="mb-8">
          <div className="flex items-center justify-between text-[12.5px] text-faint">
            <span>
              Passo {n} di {total}
            </span>
            {!back && <span>{Math.round((n / total) * 100)}%</span>}
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={n} aria-label={`Passo ${n} di ${total}`}>
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(n / total) * 100}%` }} />
          </div>
        </div>
      )}
      <h1 className="text-[24px] font-semibold leading-tight">{title}</h1>
      <p className="mt-1.5 text-[14px] text-muted">{help}</p>

      {id === "cv" ? (
        <CvStep p={p} userId={user.id} n={n} back={back} />
      ) : (
        <form action={saveStepAction} className="mt-7 space-y-5">
          <input type="hidden" name="step" value={id} />
          <input type="hidden" name="n" value={Number.isFinite(n) ? n : 0} />
          {back && <input type="hidden" name="ritorno" value="profilo" />}
          {synonymsPhase && <input type="hidden" name="fase" value="sinonimi" />}
          <StepFields id={id} synonymsPhase={synonymsPhase} p={p} userId={user.id} />
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button>{back ? "Salva" : n === total ? "Fine" : id === "risposte" ? "Salva" : "Avanti"}</Button>
            {!back && id !== "risposte" && (
              <Button variant="ghost" name="skip" value="1">
                Salta
              </Button>
            )}
          </div>
        </form>
      )}

      {prevHref && (
        <Link href={prevHref} className="mt-8 inline-flex h-8 items-center gap-1.5 text-[13px] text-muted no-underline hover:text-ink">
          <IconArrowLeft size={16} /> Indietro
        </Link>
      )}
    </>
  );
}

async function CvStep({ p, userId, n, back }: { p: Profile; userId: number; n: number; back: boolean }) {
  const cvs = await getDb().select({ id: schema.cvs.id, label: schema.cvs.label }).from(schema.cvs).where(and(eq(schema.cvs.userId, userId)));
  const exps = await listExperiences(getDb(), userId);
  const rec = await cvPositionsFor(getDb(), userId);
  return (
    <div className="mt-7 space-y-5">
      {cvs.map((c) => (
        <p key={c.id} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[14px]">
          <IconDoc size={16} className="text-good" /> {c.label} caricato
        </p>
      ))}
      {exps.length > 0 && (
        <div className="rounded-lg border border-line bg-surface px-4 py-3">
          <p className="text-[13px] font-medium">Le tue esperienze ({exps.length})</p>
          <ul className="mt-1.5 space-y-0.5 text-[13px] text-muted">
            {exps.slice(0, 6).map((e) => (
              <li key={e.id}>
                {formatPeriod(e)} · {e.title}
                {e.organization ? `, ${e.organization}` : ""}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[12.5px] text-faint">Le correggi o importi da LinkedIn in Profilo → Esperienze. Servono a suggerirti aziende e percorsi.</p>
        </div>
      )}
      {rec.recommended.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <p className="mb-3 text-[14px] font-semibold">Posizioni consigliate dal tuo CV</p>
          <RecommendedPositions roles={rec.roles} recommended={rec.recommended} back={`/benvenuto/${n}${back ? "?ritorno=profilo" : ""}`} submit="Cerca queste posizioni" />
        </div>
      )}
      {cvs.length < 3 && (
        <form action={uploadCvAction} className="space-y-4 rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <input type="hidden" name="back" value={`/benvenuto/${n}${back ? "?ritorno=profilo" : ""}`} />
          <CvTips />
          <Field label="File PDF" htmlFor="file">
            <input id="file" name="file" type="file" accept="application/pdf,.pdf" required />
          </Field>
          <Field label="Per che tipo di posizione" htmlFor="family" hint={p.track === "stage" ? "Es. Finanza, Consulenza." : "Es. Amministrazione."}>
            <input id="family" name="family" type="text" defaultValue={p.track === "stage" ? "Stage" : (p.roles[0]?.split(" ")[0] ?? "")} />
          </Field>
          <Field label="Testo del CV (facoltativo)" htmlFor="text" hint="Di solito lo leggo da solo dal PDF. Incollalo solo se il PDF è una scansione.">
            <textarea id="text" name="text" rows={4} />
          </Field>
          <Button variant="secondary">Carica</Button>
        </form>
      )}
      <form action={saveStepAction}>
        <input type="hidden" name="step" value="cv" />
        <input type="hidden" name="n" value={n} />
        {back && <input type="hidden" name="ritorno" value="profilo" />}
        <Button>{cvs.length ? (back ? "Fatto" : "Avanti") : "Lo carico più tardi"}</Button>
      </form>
    </div>
  );
}

async function StepFields({ id, synonymsPhase, p, userId }: { id: StepId | "risposte"; synonymsPhase: boolean; p: Profile; userId: number }) {
  const db = getDb();
  const stage = p.track === "stage";
  switch (id) {
    case "nome":
      return (
        <>
          <Field label="Nome e cognome" htmlFor="name">
            <input id="name" name="name" type="text" autoComplete="name" defaultValue={p.name} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Telefono" htmlFor="phone">
              <input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={p.phone} />
            </Field>
            <Field label="E-mail per le candidature" htmlFor="email">
              <input id="email" name="email" type="email" autoComplete="email" defaultValue={p.email} />
            </Field>
          </div>
        </>
      );
    case "ruolo": {
      if (synonymsPhase) {
        const suggestions = [...new Set([...p.synonyms, ...suggestSynonyms(p.roles)])];
        return (
          <>
            <p className="text-[13.5px] text-muted">Hai scritto: {p.roles.join(", ") || "niente"}</p>
            {p.roles.some(isGenericRole) && (
              <Notice tone="info">
                &quot;{p.roles.filter(isGenericRole).join('", "')}&quot; è molto generico: sui siti di lavoro porta tante offerte che non c&apos;entrano. Cerchiamo invece le posizioni precise qui sotto (togli quelle che non vuoi).
              </Notice>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <ChoiceRow key={s} name="synonym" value={s} defaultChecked>
                  {s}
                </ChoiceRow>
              ))}
            </div>
            <Field label="Altri ruoli simili" htmlFor="extra" hint="Uno per riga. Facoltativo.">
              <textarea id="extra" name="extra" rows={3} />
            </Field>
          </>
        );
      }
      return (
        <div className="space-y-3">
          {Array.from({ length: Math.min(5, Math.max(3, p.roles.length)) }, (_, i) => i).map((i) => (
            <Field key={i} label={i === 0 ? "Ruolo" : `Un altro ruolo (facoltativo)`} htmlFor={`role${i + 1}`} hint={i === 0 ? "Scrivi o scegli tra i suggerimenti. Lo cerchiamo anche in inglese, tedesco e francese se scegli quei paesi." : undefined}>
              <input id={`role${i + 1}`} name={`role${i + 1}`} type="text" list="positions" defaultValue={p.roles[i] ?? ""} placeholder={i === 0 ? "Es. Impiegata amministrativa" : ""} />
            </Field>
          ))}
          <datalist id="positions">
            {positionsFor(p.track === "stage" ? "stage" : "lavoro").map((x) => (
              <option key={x.it} value={x.it} />
            ))}
          </datalist>
          <PriorityChoice value={p.priority} />
        </div>
      );
    }
    case "studi":
      return (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Università" htmlFor="university">
              <input id="university" name="university" type="text" defaultValue={p.university} placeholder="Es. Università Bocconi" list="universita" />
            </Field>
            <Field label="Corso di laurea" htmlFor="degree">
              <input id="degree" name="degree" type="text" defaultValue={p.degree} placeholder="Es. Economia e finanza" />
            </Field>
          </div>
          <datalist id="universita">
            {["Università Bocconi", "Università Cattolica del Sacro Cuore", "Università degli Studi di Milano", "Politecnico di Milano", "Università di Milano-Bicocca", "LUISS Guido Carli", "Università di Bologna", "Università di Padova", "Università di Torino", "Politecnico di Torino", "Sapienza Università di Roma", "Università Ca' Foscari Venezia"].map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Anno di corso" htmlFor="studyYear">
              <select id="studyYear" name="studyYear" defaultValue={p.studyYear ?? ""}>
                <option value="">-</option>
                {[1, 2, 3, 4, 5].map((y) => (
                  <option key={y} value={y}>
                    {y}° anno
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Durata del corso" htmlFor="degreeYears">
              <select id="degreeYears" name="degreeYears" defaultValue={p.degreeYears ?? 3}>
                <option value={3}>Triennale (3 anni)</option>
                <option value={2}>Magistrale (2 anni)</option>
                <option value={5}>Ciclo unico (5 anni)</option>
              </select>
            </Field>
            <Field label="Laurea prevista" htmlFor="graduationYear">
              <input id="graduationYear" name="graduationYear" type="number" min={2024} max={2040} defaultValue={p.graduationYear ?? ""} />
            </Field>
          </div>
          <PriorityChoice value={p.priority} />
        </>
      );
    case "dove":
      return (
        <>
          <Field label="La tua città" htmlFor="city" hint="Il nome del comune.">
            <input id="city" name="city" type="text" autoComplete="address-level2" defaultValue={p.city} />
          </Field>
          <KmSlider defaultValue={p.maxKm} />
          <Field label="Altre città (facoltativo)" htmlFor="places" hint="Separate da una virgola, anche all'estero. Es. Londra, Parigi, Monaco di Baviera.">
            <input id="places" name="places" type="text" defaultValue={p.extraPlaces.join(", ")} />
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-medium">In quali paesi? (facoltativo)</legend>
            <p className="text-[12.5px] text-faint">Cerchiamo offerte, aziende e suggerimenti solo lì: liste più corte e ricerche che non sprecano richieste. Nessuna scelta = il paese della tua città.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {COUNTRIES.map((c) => (
                <ChoiceRow key={c.code} name="country" value={c.code} defaultChecked={p.countries.includes(c.code)}>
                  {c.name}
                </ChoiceRow>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-medium">Solo alcune regioni? (facoltativo)</legend>
            <p className="text-[12.5px] text-faint">Se non scegli niente, va bene tutto il paese.</p>
            {COUNTRIES.map((c) => {
              const chosen = p.regions.filter((r) => r.startsWith(`${c.code}:`)).length;
              return (
                <details key={c.code} className="rounded-lg border border-line px-3 py-2" open={chosen > 0}>
                  <summary className="cursor-pointer py-1 text-[13.5px]">
                    {c.name}
                    {chosen > 0 ? ` · ${chosen} scelte` : ""}
                  </summary>
                  <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {regionsOf(c.code).map((r) => (
                      <label key={r} className="flex min-h-8 items-center gap-2 text-[13px]">
                        <input type="checkbox" name="region" value={`${c.code}:${r}`} defaultChecked={p.regions.includes(`${c.code}:${r}`)} /> {r}
                      </label>
                    ))}
                  </div>
                </details>
              );
            })}
          </fieldset>
          <label className="flex min-h-11 items-center gap-2.5 text-[14px]">
            <input type="checkbox" name="remote" value="1" defaultChecked={p.remoteOk} /> Va bene anche da remoto
          </label>
        </>
      );
    case "quando":
      return (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              ["estate", "Estate (giugno-settembre)"],
              ["autunno", "Autunno"],
              ["inverno", "Inverno"],
              ["primavera", "Primavera"],
              ["part-time", "Part-time durante il semestre"],
            ].map(([k, label]) => (
              <ChoiceRow key={k} name="period" value={k} defaultChecked={p.periods.includes(k)}>
                {label}
              </ChoiceRow>
            ))}
          </div>
          <label className="flex min-h-11 items-center gap-2.5 text-[14px]">
            <input type="checkbox" name="paidOnly" value="1" defaultChecked={p.paidOnly} /> Solo stage retribuiti (quelli non retribuiti scendono in fondo)
          </label>
        </>
      );
    case "contratto":
      return (
        <>
          <p className="text-[13px] font-medium">Orario</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(
              [
                ["any", "Qualsiasi"],
                ["full", "Tempo pieno"],
                ["part", "Part-time"],
              ] as const
            ).map(([k, label]) => (
              <ChoiceRow key={k} type="radio" name="hours" value={k} defaultChecked={p.hours === k}>
                {label}
              </ChoiceRow>
            ))}
          </div>
          <p className="pt-2 text-[13px] font-medium">Contratti che vanno bene</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(["indeterminato", "determinato", "somministrazione", "apprendistato", "partita_iva", "stage"] as const).map((c) => (
              <ChoiceRow key={c} name="contract" value={c} defaultChecked={p.contracts.length === 0 ? ["indeterminato", "determinato"].includes(c) : p.contracts.includes(c)}>
                {CONTRACT_LABELS[c]}
              </ChoiceRow>
            ))}
          </div>
        </>
      );
    case "paga":
      return (
        <>
          <NetSalaryField defaultValue={p.minNetMonthly ?? undefined} stage={stage} />
          <label className="flex items-center gap-2.5 text-[14px]">
            <input type="checkbox" name="hideBelowMin" value="1" defaultChecked={p.hideBelowMin} /> Nascondi le offerte sotto questa cifra (quelle senza cifra restano)
          </label>
        </>
      );
    case "lingue":
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {["inglese", "francese", "tedesco", "spagnolo"].map((l) => (
            <Field key={l} label={l[0].toUpperCase() + l.slice(1)} htmlFor={`lang-${l}`}>
              <select id={`lang-${l}`} name={`lang-${l}`} defaultValue={p.languages.find((x) => x.language === l)?.level ?? ""}>
                <option value="">Non lo parlo</option>
                <option value="base">Base</option>
                <option value="buono">Buono</option>
                <option value="fluente">Fluente</option>
              </select>
            </Field>
          ))}
        </div>
      );
    case "settori": {
      const sectors = await listSectors(db, userId, p.track);
      const prefs = await getPrefs(db, userId);
      return (
        <>
          <SectorPills sectors={sectors} chosen={prefs.sectors} stance="like" />
          <AltroSector />
        </>
      );
    }
    case "gusti":
      return (
        <div className="flex flex-wrap gap-2">
          {TASTES.map((t) => (
            <PillCheck key={t.key} name="taste" value={t.key} defaultChecked={p.tastes.includes(t.key)}>
              {t.label}
            </PillCheck>
          ))}
        </div>
      );
    case "aziende": {
      const [companies, allSectors, prefs, suggestions] = await Promise.all([listCompanies(db, userId, p.track), listSectors(db, userId), getPrefs(db, userId), suggestCompanies(db, userId, 6)]);
      return (
        <>
          {suggestions.length > 0 && (
            <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
              <p className="flex items-center gap-2 text-[13.5px] font-semibold">
                <IconSparkle size={15} className="text-accent" /> Suggerite per te
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <span key={s.company.id} title={s.reason}>
                    <input type="hidden" name="shown" value={s.company.id} />
                    <PillCheck name="pick" value={String(s.company.id)}>
                      {s.company.name}
                    </PillCheck>
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[12.5px] text-faint">{suggestions[0].reason}{suggestions.length > 1 ? " e altri motivi simili." : "."}</p>
            </div>
          )}
          <CatalogFilter target="wizard" placeholder="Cerca un'azienda o un brand" />
          <div data-catalog="wizard">
            <CompanyGroups companies={companies.filter((c) => !suggestions.some((s) => s.company.id === c.id))} chosen={prefs.companies} stance="like" track={p.track} />
          </div>
          <AltroCompany sectors={allSectors} defaultKind={stage ? "boutique" : "brand"} />
        </>
      );
    }
    case "evitare":
      return (
        <>
          <Field label="Aziende da evitare" htmlFor="companies" hint="Una per riga.">
            <textarea id="companies" name="companies" rows={3} defaultValue={p.avoidCompanies.join("\n")} />
          </Field>
          <Field label="Parole da evitare negli annunci" htmlFor="keywords" hint={stage ? "Es. non retribuito, call center. Una per riga." : "Es. porta a porta, provvigioni. Una per riga."}>
            <textarea id="keywords" name="keywords" rows={3} defaultValue={p.avoidKeywords.join("\n")} />
          </Field>
        </>
      );
    case "focus": {
      const prefs = await getPrefs(db, userId);
      const nCompanies = [...prefs.companies.values()].filter((s) => s === "like").length;
      const nSectors = [...prefs.sectors.values()].filter((s) => s === "like").length;
      // Automatic default: many precise choices -> only those; few -> everything, choices first.
      const recommended = p.onboardedAt ? (p.focus === "tutte" ? "tutte" : p.focusCompaniesOnly ? "aziende" : "preferite") : nCompanies >= 8 ? "aziende" : nCompanies + nSectors >= 6 ? "preferite" : "tutte";
      const why =
        recommended === "aziende"
          ? `Hai scelto ${nCompanies} aziende: abbastanza per vedere solo le loro offerte, senza rumore.`
          : recommended === "preferite"
            ? `Con ${nCompanies} aziende e ${nSectors} settori scelti puoi limitarti a quelli e togliere il rumore.`
            : "Con poche scelte conviene vedere tutto, con le tue preferenze in cima.";
      return (
        <>
          <Notice tone="info" title="Consiglio">
            {why}
          </Notice>
          <div className="space-y-2">
            <ChoiceRow type="radio" name="focus" value="tutte" defaultChecked={recommended === "tutte"} hint="Le aziende e i settori scelti salgono in cima.">
              Tutte, con priorità alle mie scelte
            </ChoiceRow>
            <ChoiceRow type="radio" name="focus" value="preferite" defaultChecked={recommended === "preferite"} hint="Solo offerte da aziende o settori scelti.">
              Solo le mie scelte
            </ChoiceRow>
            <ChoiceRow type="radio" name="focus" value="aziende" defaultChecked={recommended === "aziende"} hint="Solo offerte dalle aziende scelte: massima precisione.">
              Solo le aziende scelte
            </ChoiceRow>
          </div>
        </>
      );
    }
    case "risposte":
      return (
        <>
          <Field label="Breve presentazione" htmlFor="presentation" hint="Due o tre frasi. Solo cose vere.">
            <textarea id="presentation" name="presentation" rows={5} defaultValue={p.presentation} />
          </Field>
          <Field label="Disponibilità" htmlFor="availability" hint={stage ? "Es. stage estivo da giugno, oppure part-time durante il semestre." : "Es. disponibile da subito, part-time o tempo pieno."}>
            <input id="availability" name="availability" type="text" defaultValue={p.availability} />
          </Field>
          <Field label={stage ? "Richiesta economica / rimborso" : "Richiesta economica"} htmlFor="salaryExpectation">
            <input id="salaryExpectation" name="salaryExpectation" type="text" defaultValue={p.salaryExpectation} />
          </Field>
          <Field label="Profilo LinkedIn" htmlFor="linkedinUrl">
            <input id="linkedinUrl" name="linkedinUrl" type="url" defaultValue={p.linkedinUrl} />
          </Field>
        </>
      );
    default:
      return null;
  }
}

export type { Track };
