import { IconArrowLeft } from "@/components/icons";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { CONTRACT_LABELS } from "@/lib/core/extract";
import { getDb } from "@/lib/db";
import { getProfile } from "@/lib/server/profile";
import { Flash } from "@/components/flash";

export const metadata = { title: "Il mio profilo" };

export default async function ProfiloPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const p = await getProfile(getDb());
  const rows: { step: number; label: string; value: string }[] = [
    { step: 1, label: "I tuoi dati", value: [p.name, p.phone, p.email].filter(Boolean).join(" · ") || "Da compilare" },
    { step: 2, label: "Che lavoro cerchi", value: [...p.roles, ...p.synonyms.map((s) => s + " (simile)")].join(", ") || "Da compilare" },
    { step: 3, label: "Dove", value: p.city ? `${p.city}, fino a ${p.maxKm} km${p.remoteOk ? ", va bene anche da casa" : ""}` : "Da compilare" },
    { step: 4, label: "Orario e contratto", value: `${p.hours === "full" ? "Tempo pieno" : p.hours === "part" ? "Part-time" : "Va bene tutto"} · ${p.contracts.map((c) => CONTRACT_LABELS[c as keyof typeof CONTRACT_LABELS]).join(", ") || "qualsiasi contratto"}` },
    { step: 5, label: "Stipendio minimo", value: p.minNetMonthly ? `${p.minNetMonthly.toLocaleString("it-IT")} € netti al mese` : "Non indicato" },
    { step: 6, label: "Lingue", value: p.languages.map((l) => `${l.language} ${l.level}`).join(", ") || "Solo italiano" },
    { step: 7, label: "Il tuo CV", value: "Vedi I miei CV" },
    { step: 8, label: "Cose da evitare", value: [...p.avoidSectors, ...p.avoidCompanies, ...p.avoidKeywords].join(", ") || "Niente" },
    { step: 9, label: "Risposte pronte per i siti", value: p.presentation ? "Compilate" : "Da compilare" },
  ];
  return (
    <>
      <Flash code={sp.msg} />
      <LinkButton href="/aiuto" variant="quiet" className="-ml-3 mb-2 px-3">
        <IconArrowLeft /> Torna ad Aiuto
      </LinkButton>
      <PageHeader title="Il mio profilo" help="Queste informazioni servono a scegliere le offerte per te. Tocca Cambia per modificarne una." />
      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.step} className="flex flex-wrap items-center justify-between gap-3 !p-5">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{r.label}</p>
              <p className="text-ink-soft">{r.value}</p>
            </div>
            <LinkButton href={r.step === 7 ? "/aiuto/cv" : r.step === 9 ? "/benvenuto/risposte?ritorno=profilo" : `/benvenuto/${r.step}?ritorno=profilo`} variant="secondary">
              Cambia
            </LinkButton>
          </Card>
        ))}
      </div>
    </>
  );
}
