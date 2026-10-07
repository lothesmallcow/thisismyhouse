// What a typed search was understood as: one chip per piece (role with its other names, place, hours,
// exclusions…), each with a × that searches again without it. Plus how the words were matched.
import Link from "next/link";
import { CONTRACT_LABELS } from "@/lib/core/extract";
import { BENEFIT_LABELS, SENIORITY_LABELS } from "@/lib/core/job-facts";
import { withoutPart, type ParsedQuery } from "@/lib/core/query";
import type { SearchMode } from "@/lib/server/search";

export function SearchUnderstood({ q, parsed, mode, total, hrefFor }: { q: string; parsed: ParsedQuery; mode: SearchMode; total: number; hrefFor: (q: string) => string }) {
  const chips: { kind: string; label: string; raw: string; title?: string }[] = [
    ...parsed.concepts.map((c) => ({
      kind: c.kind === "ruolo" ? "Ruolo" : c.kind === "settore" ? "Settore" : "Parola",
      label: c.label,
      raw: c.raw,
      title: c.alternatives.length > 1 ? `Cerco anche: ${c.alternatives.filter((a) => a.toLowerCase() !== c.label.toLowerCase()).slice(0, 6).join(", ")}` : undefined,
    })),
    ...parsed.places.map((p) => ({ kind: "Dove", label: p.place.name, raw: p.raw })),
    ...(parsed.hours ? [{ kind: "Orario", label: parsed.hours.value === "part" ? "Part-time" : "Tempo pieno", raw: parsed.hours.raw }] : []),
    ...(parsed.remote ? [{ kind: "Da casa", label: parsed.remote.value === "remote" ? "Da remoto" : "Ibrido", raw: parsed.remote.raw }] : []),
    ...parsed.contracts.map((c) => ({ kind: "Contratto", label: CONTRACT_LABELS[c.value], raw: c.raw })),
    ...parsed.types.map((t) => ({ kind: "Tipo", label: t.value === "stage" ? "Stage" : "Programmi", raw: t.raw })),
    ...(parsed.seniority ? [{ kind: "Livello", label: SENIORITY_LABELS[parsed.seniority.value], raw: parsed.seniority.raw }] : []),
    ...(parsed.noExperience ? [{ kind: "Esperienza", label: "Senza esperienza", raw: parsed.noExperience.raw }] : []),
    ...(parsed.protectedCategories ? [{ kind: "Solo", label: "Categorie protette", raw: parsed.protectedCategories.raw }] : []),
    ...(parsed.noAgencies ? [{ kind: "Senza", label: "Agenzie", raw: parsed.noAgencies.raw }] : []),
    ...parsed.benefits.map((b) => ({ kind: "Con", label: BENEFIT_LABELS[b.value], raw: b.raw })),
    ...parsed.excludes.map((e) => ({ kind: "Senza", label: e.word, raw: e.raw })),
  ];
  const others = parsed.concepts.flatMap((c) => (c.kind === "ruolo" ? c.alternatives.filter((a) => a.toLowerCase() !== c.label.toLowerCase()).slice(0, 4) : []));
  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
        <span className="mr-1 text-muted">Ho capito:</span>
        {chips.map((c) => (
          <span key={`${c.kind}:${c.raw}`} title={c.title} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface pl-2.5 pr-1 shadow-[0_1px_1px_rgb(15_40_80/0.04)]">
            <span className="text-faint">{c.kind}</span>
            <span className="font-medium">{c.label}</span>
            <Link href={hrefFor(withoutPart(q, c.raw))} aria-label={`Togli ${c.kind.toLowerCase()} ${c.label}`} className="flex h-6 w-6 items-center justify-center rounded-full text-faint no-underline hover:bg-fill hover:text-ink">
              ×
            </Link>
          </span>
        ))}
      </div>
      {others.length > 0 && <p className="text-[12.5px] text-faint">Cerco anche come: {others.join(", ")}.</p>}
      {mode === "vicine" && <p className="text-[13px] text-muted">Nessuna offerta con queste parole nel titolo: ecco quelle che le nominano nel testo.</p>}
      {mode === "alcune" && <p className="text-[13px] text-muted">Nessuna offerta con tutte le parole: ecco quelle con alcune. Prova a toglierne una.</p>}
      {mode === "parole" && <p className="text-[13px] text-muted">Ricerca semplice: le parole nel titolo o nel nome dell&apos;azienda.</p>}
      <p className="text-[13px] font-medium">
        {total} {total === 1 ? "offerta" : "offerte"}
      </p>
    </div>
  );
}
