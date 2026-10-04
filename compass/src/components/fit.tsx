import Link from "next/link";
import { AREA_LABELS, FIT_AREAS, type FitArea } from "@/lib/core/fit";
import type { Check } from "@/lib/core/requirements";
import { Card } from "./ui";

const tone = (n: number) => (n >= 70 ? "bg-good" : n >= 45 ? "bg-accent" : "bg-warn");

/** The fit score out of 100 and its seven parts. */
export function FitCard({ fit, parts }: { fit: number; parts: Partial<Record<FitArea, number>> }) {
  return (
    <Card className="!p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-semibold">Punteggio</p>
        <p className="tabular-nums">
          <span className="text-[24px] font-semibold">{fit}</span>
          <span className="text-[13px] text-faint">/100</span>
        </p>
      </div>
      <ul className="mt-3 space-y-2">
        {FIT_AREAS.map((a) => {
          const v = parts[a] ?? 50;
          return (
            <li key={a} title={AREA_LABELS[a].hint}>
              <div className="flex justify-between text-[12.5px]">
                <span className="text-muted">{AREA_LABELS[a].name}</span>
                <span className="tabular-nums text-faint">{v === 50 ? "non noto" : v}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-subtle" aria-hidden="true">
                <div className={`h-1.5 rounded-full ${tone(v)}`} style={{ width: `${Math.max(4, v)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[12px] text-faint">
        50 = l&apos;annuncio non lo dice. <Link href="/profilo/punteggio" className="inline-flex min-h-6 items-center">Cambia quanto conta ogni parte</Link>
      </p>
    </Card>
  );
}

const MARK: Record<Check["have"], { sign: string; cls: string; label: string }> = {
  si: { sign: "✓", cls: "text-good", label: "ce l'hai" },
  quasi: { sign: "≈", cls: "text-accent", label: "quasi" },
  no: { sign: "✕", cls: "text-bad", label: "manca" },
  "?": { sign: "?", cls: "text-faint", label: "non si sa" },
};

/** What the listing asks for, one line each, against the CV and the timeline. */
export function RequirementsCard({ checks }: { checks: Check[] }) {
  if (checks.length === 0) {
    return (
      <Card className="!p-4">
        <p className="text-[13px] font-semibold">Requisiti</p>
        <p className="mt-1.5 text-[13px] text-muted">L&apos;annuncio non elenca requisiti precisi.</p>
      </Card>
    );
  }
  const met = checks.filter((c) => c.have === "si").length;
  return (
    <Card className="!p-4">
      <p className="text-[13px] font-semibold">
        Requisiti · {met} su {checks.length}
      </p>
      <ul className="mt-2.5 space-y-2">
        {checks.map((c) => (
          <li key={c.label} className="text-[13px]">
            <span className="flex items-start gap-2">
              <span className={`w-4 shrink-0 text-center font-semibold ${MARK[c.have].cls}`} aria-label={MARK[c.have].label}>
                {MARK[c.have].sign}
              </span>
              <span>
                <span className="font-medium">{c.label}</span>
                <span className="block text-[12.5px] text-muted">{c.note}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-faint">Letto dal testo dell&apos;annuncio e dal tuo CV: controlla sempre l&apos;annuncio originale.</p>
    </Card>
  );
}
