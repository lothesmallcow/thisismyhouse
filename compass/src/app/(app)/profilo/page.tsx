import Link from "next/link";
import { eq } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { IconArrowRight } from "@/components/icons";
import { Button, List, PageHeader, Row, SectionTitle } from "@/components/ui";
import { CONTRACT_LABELS } from "@/lib/core/extract";
import { TASTES } from "@/lib/catalog/data";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { getPrefs } from "@/lib/server/catalog";
import { getProfile } from "@/lib/server/profile";
import { background } from "@/lib/server/person";
import { stepIndex } from "../../(setup)/benvenuto/steps";
import { restartQuestionnaireAction, signOutAction } from "../actions";

export const metadata = { title: "Profilo" };

function Edit({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex h-8 items-center rounded-md px-2.5 text-[13px] font-medium no-underline hover:bg-subtle">
      Modifica
    </Link>
  );
}

export default async function ProfiloPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const p = await getProfile(db, user.id);
  const prefs = await getPrefs(db, user.id);
  const { currentEmployers } = await background(db, user.id, p);
  const cvs = await db.select({ id: schema.cvs.id }).from(schema.cvs).where(eq(schema.cvs.userId, user.id));
  const exps = await db.select({ id: schema.experiences.id }).from(schema.experiences).where(eq(schema.experiences.userId, user.id));
  const at = (id: string) => `/benvenuto/${stepIndex(p.track, id)}?ritorno=profilo`;
  const likedCompanies = [...prefs.companies.values()].filter((s) => s === "like").length;
  const likedSectors = [...prefs.sectors.values()].filter((s) => s === "like").length;
  const stage = p.track === "stage";

  return (
    <>
      <Flash code={sp.msg} />
      <PageHeader title={p.name || "Profilo"} description={`${user.email} · ${stage ? "cerca uno stage" : "cerca lavoro"}`} />
      {currentEmployers.length > 0 && (
        <p className="-mt-3 mb-6 rounded-lg bg-subtle px-3.5 py-2.5 text-[13px] text-muted">
          Ricerca riservata: {currentEmployers.join(", ")} (dove lavori ora, dalle tue <Link href="/profilo/esperienze">esperienze</Link>) non viene mai proposta, suggerita o contattata.
        </p>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle className="!mt-0">Il tuo profilo</SectionTitle>
          <List>
            <Row label="Dati di contatto" value={[p.name, p.phone, p.email].filter(Boolean).join(" · ") || "Da compilare"} action={<Edit href={at("nome")} />} />
            {stage ? (
              <Row label="Studi" value={[p.degree, p.university, p.studyYear ? `${p.studyYear}° anno` : ""].filter(Boolean).join(" · ") || "Da compilare"} action={<Edit href={at("studi")} />} />
            ) : (
              <Row label="Ruoli cercati" value={[...p.roles, ...p.synonyms].join(", ") || "Da compilare"} action={<Edit href={at("ruolo")} />} />
            )}
            <Row label="Dove" value={p.city ? `${p.city}, ${p.maxKm} km${p.extraPlaces.length ? ` · ${p.extraPlaces.join(", ")}` : ""}${p.remoteOk ? " · anche da remoto" : ""}` : "Da compilare"} action={<Edit href={at("dove")} />} />
            {stage ? (
              <Row label="Quando" value={[p.periods.join(", "), p.paidOnly ? "solo retribuiti" : ""].filter(Boolean).join(" · ") || "Da compilare"} action={<Edit href={at("quando")} />} />
            ) : (
              <Row
                label="Orario e contratto"
                value={`${p.hours === "full" ? "Tempo pieno" : p.hours === "part" ? "Part-time" : "Qualsiasi orario"} · ${p.contracts.map((c) => CONTRACT_LABELS[c as keyof typeof CONTRACT_LABELS]).join(", ") || "qualsiasi contratto"}`}
                action={<Edit href={at("contratto")} />}
              />
            )}
            <Row label={stage ? "Rimborso minimo" : "Stipendio minimo"} value={p.minNetMonthly ? `${p.minNetMonthly.toLocaleString("it-IT")} € netti al mese${p.hideBelowMin ? " · nascondo quelle sotto" : ""}` : "Non indicato"} action={<Edit href={at("paga")} />} />
            <Row label="Lingue" value={p.languages.map((l) => `${l.language} ${l.level}`).join(", ") || "Solo italiano"} action={<Edit href={at("lingue")} />} />
            <Row label="Interessi" value={TASTES.filter((t) => p.tastes.includes(t.key)).map((t) => t.label).join(", ") || "Nessuno"} action={<Edit href={at("gusti")} />} />
            <Row label="Da evitare" value={[...p.avoidCompanies, ...p.avoidKeywords].join(", ") || "Niente"} action={<Edit href={at("evitare")} />} />
            <Row label="Risposte pronte per i siti" value={p.presentation ? "Compilate" : "Da compilare"} action={<Edit href="/benvenuto/risposte?ritorno=profilo" />} />
          </List>
          <form action={restartQuestionnaireAction} className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-4 py-3">
            <span className="text-[13px] text-muted">Hai cambiato idea su cosa cerchi? Rifai il questionario: le risposte restano compilate.</span>
            <Button variant="secondary" size="sm">
              Rifai il questionario
            </Button>
          </form>
        </section>

        <section>
          <SectionTitle className="!mt-0">Ricerca e candidature</SectionTitle>
          <List>
            {[
              { href: "/profilo/esperienze", label: "Esperienze", value: exps.length ? `${exps.length} nella tua timeline` : "Dal CV, da LinkedIn o a mano" },
              { href: "/percorsi", label: "Percorsi per te", value: "Settori e ruoli vicini al tuo profilo" },
              { href: "/profilo/codice", label: "Codice di ricerca", value: "Le ricerche fatte per te e gli avvisi da creare" },
              { href: "/profilo/punteggio", label: "Punteggio", value: p.fitWeights ? "Pesi personalizzati" : "Valori di partenza" },
              { href: "/ruoli", label: "Ruoli e stipendi", value: "Cosa serve e quanto si guadagna, nella tua zona" },
              { href: "/aziende", label: "Aziende e settori", value: `${likedCompanies} aziende, ${likedSectors} settori scelti` },
              { href: "/profilo/ricerca", label: "Preferenze di ricerca", value: "Focus, filtri predefiniti, e-mail del mattino, correzioni" },
              { href: "/profilo/cv", label: "CV", value: cvs.length ? `${cvs.length} caricati` : "Nessuno" },
              { href: "/profilo/lettere", label: "Lettere di candidatura", value: "I testi delle e-mail" },
              { href: "/profilo/guida", label: "Guida", value: "Come funziona Compass" },
            ].map((r) => (
              <Link key={r.href} href={r.href} className="flex items-center justify-between gap-3 px-4 py-3.5 text-ink no-underline hover:bg-subtle/60">
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium">{r.label}</span>
                  <span className="block truncate text-[13px] text-muted">{r.value}</span>
                </span>
                <IconArrowRight size={16} className="shrink-0 text-faint" />
              </Link>
            ))}
          </List>

          <SectionTitle>Account</SectionTitle>
          <List>
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <span className="text-[14px]">Esci da questo dispositivo</span>
              <form action={signOutAction}>
                <Button variant="secondary" size="sm">
                  Esci
                </Button>
              </form>
            </div>
            <Link href="/profilo/cancella" className="flex items-center justify-between px-4 py-3.5 text-[14px] text-bad no-underline hover:bg-bad-soft">
              Cancella tutti i miei dati <IconArrowRight size={16} />
            </Link>
          </List>
        </section>
      </div>
    </>
  );
}
