import Link from "next/link";
import { notFound } from "next/navigation";
import { CvTips } from "@/components/cv-tips";
import { Flash } from "@/components/flash";
import { IconArrowLeft, IconCheck, IconDoc } from "@/components/icons";
import { Button, Card, ChoiceRow, Field, LinkButton } from "@/components/ui";
import { CONTRACT_LABELS, SECTORS } from "@/lib/core/extract";
import { getDb, schema } from "@/lib/db";
import { getProfile, suggestSynonyms } from "@/lib/server/profile";
import { uploadCvAction } from "../../../(app)/actions";
import { saveStepAction } from "../actions";
import { CityField, KmSlider, NetSalaryField } from "./fields";

export const metadata = { title: "Benvenuta" };

const TOTAL = 8;
const TITLES: Record<string, string> = {
  "1": "Come ti chiami?",
  "2": "Che lavoro cerchi?",
  "3": "Dove vuoi lavorare?",
  "4": "Che orario e che contratto?",
  "5": "Qual è lo stipendio minimo?",
  "6": "Che lingue parli?",
  "7": "Carica il tuo CV",
  "8": "C'è qualcosa da evitare?",
  risposte: "Le risposte pronte per i siti",
};
const HELP: Record<string, string> = {
  "1": "Questi dati li metto nelle e-mail di candidatura. Li vedono solo le aziende a cui scrivi.",
  "2": "Scrivi il nome del lavoro come lo scriveresti in un annuncio. Puoi metterne fino a tre.",
  "3": "Scegli la tua città e quanto lontano sei disposta ad andare.",
  "4": "Scegli quello che ti va bene. Se va bene tutto, lascia tutto com'è.",
  "5": "Lo stipendio netto è quello che arriva sul conto ogni mese. Le offerte sotto questa cifra le metto più in basso.",
  "6": "Per l'italiano non serve niente. Dimmi solo se ne parli altre.",
  "7": "Il CV è il documento che mando alle aziende. Puoi caricarne fino a tre, uno per tipo di lavoro.",
  "8": "Se ci sono settori, aziende o parole che non vuoi vedere, scrivile qui. Puoi anche saltare.",
  risposte: "Quando ti candidi su un sito, ti chiedono spesso queste cose. Scrivile una volta qui, poi le copi con un tocco.",
};

export default async function WizardPage({ params, searchParams }: { params: Promise<{ passo: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { passo } = await params;
  const sp = await searchParams;
  const db = getDb();
  const p = await getProfile(db);
  const back = sp.ritorno === "profilo";

  if (passo === "fine") {
    return (
      <Card className="rise !p-8 text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage text-sage-ink">
          <IconCheck size={34} />
        </span>
        <h1 className="text-[2rem] font-semibold">Fatto, grazie{p.name ? ` ${p.name.split(" ")[0]}` : ""}!</h1>
        <p className="mt-3 text-[1.1rem]">Da domani mattina ti arriva un&apos;e-mail con le offerte nuove. Intanto puoi già guardare quelle che ho trovato.</p>
        <LinkButton href="/offerte" wide className="mt-7">
          Vedi le offerte per te
        </LinkButton>
        <LinkButton href="/benvenuto/risposte" variant="secondary" wide className="mt-3">
          Prepara le risposte per i siti (facoltativo)
        </LinkButton>
      </Card>
    );
  }
  if (!TITLES[passo]) notFound();
  const n = Number(passo);
  const synonymsPhase = passo === "2" && sp.fase === "sinonimi";
  const cvs = passo === "7" ? await db.select({ id: schema.cvs.id, label: schema.cvs.label, filename: schema.cvs.filename }).from(schema.cvs) : [];
  const prevHref = back ? "/aiuto/profilo" : n > 1 ? `/benvenuto/${synonymsPhase ? 2 : n - 1}` : null;

  return (
    <>
      <Flash code={sp.msg} />
      {Number.isFinite(n) && (
        <div className="mb-6">
          <p className="font-bold text-navy">
            Passo {n} di {TOTAL}
          </p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-paper-deep" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={n} aria-label={`Passo ${n} di ${TOTAL}`}>
            <div className="h-full rounded-full bg-navy transition-all" style={{ width: `${(n / TOTAL) * 100}%` }} />
          </div>
        </div>
      )}
      <h1 className="text-[2.2rem] font-semibold leading-tight">{synonymsPhase ? "Vanno bene anche questi?" : TITLES[passo]}</h1>
      <p className="mt-3 text-[1.08rem] text-ink-soft">
        <strong className="text-navy">Cosa faccio qui?</strong>{" "}
        {synonymsPhase ? "Sono lavori simili a quello che cerchi. Tieni la spunta su quelli che vanno bene." : HELP[passo]}
      </p>

      {passo === "7" ? (
        <div className="mt-7 space-y-5">
          {cvs.map((c) => (
            <p key={c.id} className="flex items-center gap-2 rounded-2xl bg-sage px-4 py-3 font-bold text-sage-ink">
              <IconDoc /> {c.label} caricato
            </p>
          ))}
          <CvTips />
          {cvs.length < 3 && (
            <form action={uploadCvAction} className="space-y-5">
              <input type="hidden" name="back" value={`/benvenuto/7${back ? "?ritorno=profilo" : ""}`} />
              <Field label="Il file PDF del CV" htmlFor="file" hint="Al massimo 2 MB.">
                <input id="file" name="file" type="file" accept="application/pdf,.pdf" required />
              </Field>
              <Field label="Per che tipo di lavoro è questo CV?" htmlFor="family" hint="Per esempio: Amministrazione.">
                <input id="family" name="family" type="text" defaultValue={p.roles[0]?.split(" ")[0] ?? ""} />
              </Field>
              <Button variant="secondary" wide>
                Carica questo CV
              </Button>
            </form>
          )}
          <form action={saveStepAction}>
            <input type="hidden" name="step" value="7" />
            {back && <input type="hidden" name="ritorno" value="profilo" />}
            <Button wide>{cvs.length ? "Avanti" : "Lo carico più tardi"}</Button>
          </form>
        </div>
      ) : (
        <form action={saveStepAction} className="mt-7 space-y-5">
          <input type="hidden" name="step" value={passo} />
          {back && <input type="hidden" name="ritorno" value="profilo" />}
          {synonymsPhase && <input type="hidden" name="fase" value="sinonimi" />}
          <StepFields passo={passo} synonymsPhase={synonymsPhase} p={p} />
          <div className="space-y-3 pt-3">
            <Button wide>{back ? "Salva" : passo === "8" ? "Ho finito" : "Avanti"}</Button>
            {!back && passo !== "risposte" && (
              <Button variant="secondary" wide name="skip" value="1">
                Salta questo passo
              </Button>
            )}
          </div>
        </form>
      )}

      {prevHref && (
        <Link href={prevHref} className="mt-6 inline-flex min-h-[52px] items-center gap-2 font-bold">
          <IconArrowLeft /> Indietro
        </Link>
      )}
    </>
  );
}

function StepFields({ passo, synonymsPhase, p }: { passo: string; synonymsPhase: boolean; p: Awaited<ReturnType<typeof getProfile>> }) {
  switch (passo) {
    case "1":
      return (
        <>
          <Field label="Nome e cognome" htmlFor="name">
            <input id="name" name="name" type="text" autoComplete="name" defaultValue={p.name} />
          </Field>
          <Field label="Telefono" htmlFor="phone">
            <input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={p.phone} />
          </Field>
          <Field label="E-mail per la ricerca di lavoro" htmlFor="email" hint="Quella creata apposta per le candidature.">
            <input id="email" name="email" type="email" autoComplete="email" defaultValue={p.email} />
          </Field>
        </>
      );
    case "2": {
      if (synonymsPhase) {
        const suggestions = [...new Set([...p.synonyms, ...suggestSynonyms(p.roles)])];
        return (
          <>
            <p className="font-bold">Hai scritto: {p.roles.join(", ") || "niente"}</p>
            <div className="space-y-3">
              {suggestions.map((s) => (
                <ChoiceRow key={s} name="synonym" value={s} defaultChecked>
                  {s}
                </ChoiceRow>
              ))}
            </div>
            <Field label="Altri lavori simili (facoltativo)" htmlFor="extra" hint="Uno per riga.">
              <textarea id="extra" name="extra" rows={3} />
            </Field>
          </>
        );
      }
      return (
        <>
          {[0, 1, 2].map((i) => (
            <Field key={i} label={i === 0 ? "Il lavoro che cerchi" : `Un altro lavoro (facoltativo)`} htmlFor={`role${i + 1}`} hint={i === 0 ? "Per esempio: Impiegata amministrativa" : undefined}>
              <input id={`role${i + 1}`} name={`role${i + 1}`} type="text" defaultValue={p.roles[i] ?? ""} />
            </Field>
          ))}
        </>
      );
    }
    case "3":
      return (
        <>
          <CityField defaultValue={p.city} />
          <KmSlider defaultValue={p.maxKm} />
          <ChoiceRow name="remote" value="1" defaultChecked={p.remoteOk}>
            Va bene anche lavorare da casa
          </ChoiceRow>
        </>
      );
    case "4":
      return (
        <>
          <p className="text-[1.1rem] font-bold">Orario</p>
          <div className="space-y-3">
            <ChoiceRow type="radio" name="hours" value="any" defaultChecked={p.hours === "any"}>
              Va bene tutto
            </ChoiceRow>
            <ChoiceRow type="radio" name="hours" value="full" defaultChecked={p.hours === "full"}>
              Tempo pieno
            </ChoiceRow>
            <ChoiceRow type="radio" name="hours" value="part" defaultChecked={p.hours === "part"}>
              Part-time
            </ChoiceRow>
          </div>
          <p className="pt-4 text-[1.1rem] font-bold">Contratti che ti vanno bene</p>
          <div className="space-y-3">
            {(["indeterminato", "determinato", "somministrazione", "apprendistato", "partita_iva", "stage"] as const).map((c) => (
              <ChoiceRow key={c} name="contract" value={c} defaultChecked={p.contracts.length === 0 ? ["indeterminato", "determinato"].includes(c) : p.contracts.includes(c)}>
                {CONTRACT_LABELS[c]}
              </ChoiceRow>
            ))}
          </div>
        </>
      );
    case "5":
      return <NetSalaryField defaultValue={p.minNetMonthly ?? undefined} />;
    case "6":
      return (
        <div className="space-y-4">
          {["inglese", "francese", "tedesco", "spagnolo"].map((l) => (
            <Field key={l} label={l[0].toUpperCase() + l.slice(1)} htmlFor={`lang-${l}`}>
              <select id={`lang-${l}`} name={`lang-${l}`} defaultValue={p.languages.find((x) => x.language === l)?.level ?? ""}>
                <option value="">Non lo parlo</option>
                <option value="base">Un po&apos; (base)</option>
                <option value="buono">Bene</option>
                <option value="fluente">Molto bene (fluente)</option>
              </select>
            </Field>
          ))}
        </div>
      );
    case "8":
      return (
        <>
          <p className="text-[1.1rem] font-bold">Settori che non ti interessano</p>
          <div className="space-y-3">
            {SECTORS.map(([s]) => (
              <ChoiceRow key={s} name="sector" value={s} defaultChecked={p.avoidSectors.includes(s)}>
                {s}
              </ChoiceRow>
            ))}
          </div>
          <Field label="Aziende da evitare" htmlFor="companies" hint="Una per riga.">
            <textarea id="companies" name="companies" rows={3} defaultValue={p.avoidCompanies.join("\n")} />
          </Field>
          <Field label="Parole da evitare" htmlFor="keywords" hint="Per esempio: porta a porta, provvigioni. Una per riga.">
            <textarea id="keywords" name="keywords" rows={3} defaultValue={p.avoidKeywords.join("\n")} />
          </Field>
        </>
      );
    case "risposte":
      return (
        <>
          <Field label="Breve presentazione" htmlFor="presentation" hint="Due o tre frasi su di te e sul tuo lavoro. Solo cose vere.">
            <textarea id="presentation" name="presentation" rows={5} defaultValue={p.presentation} />
          </Field>
          <Field label="Disponibilità" htmlFor="availability" hint="Per esempio: disponibile da subito, part-time o tempo pieno.">
            <input id="availability" name="availability" type="text" defaultValue={p.availability} />
          </Field>
          <Field label="Richiesta economica" htmlFor="salaryExpectation" hint="Per esempio: in linea con il contratto nazionale.">
            <input id="salaryExpectation" name="salaryExpectation" type="text" defaultValue={p.salaryExpectation} />
          </Field>
          <Field label="Profilo LinkedIn (se ce l'hai)" htmlFor="linkedinUrl">
            <input id="linkedinUrl" name="linkedinUrl" type="url" defaultValue={p.linkedinUrl} />
          </Field>
        </>
      );
    default:
      return null;
  }
}
