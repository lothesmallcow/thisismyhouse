// The three plans side by side, Aurora style: the recommended one on the blue gradient.
import Link from "next/link";
import { PLANS, priceLabel, type PlanKey } from "@/lib/core/plans";
import { choosePlanAction } from "@/app/(app)/actions";
import { IconCheck, IconSparkle } from "./icons";
import { buttonClass } from "./ui";

/** `onboarding`: right after the questionnaire, Free is a "Continua gratis" button even if it is already theirs. */
export function PlanCards({ current, back, onboarding = false }: { current: PlanKey; back: string; onboarding?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {PLANS.map((p) => {
        const mine = p.key === current;
        const hero = p.highlight;
        return (
          <section
            key={p.key}
            aria-label={`Piano ${p.name}`}
            className={`lift relative flex flex-col overflow-hidden rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] ${hero ? "hero ring-1 ring-white/30" : "border border-line/70 bg-surface"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className={`text-[18px] font-semibold tracking-[-0.015em] ${hero ? "text-white" : ""}`}>{p.name}</h2>
              {hero && <span className="inline-flex h-6 items-center rounded-full bg-white/20 px-2.5 text-[11px] font-bold uppercase tracking-[0.05em] text-white">Il più scelto</span>}
              {p.key === "premium" && (
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-accent-soft px-2.5 text-[11px] font-bold uppercase tracking-[0.05em] text-accent">
                  <IconSparkle size={12} /> AI
                </span>
              )}
            </div>
            <p className={`mt-1 text-[13.5px] ${hero ? "text-white/85" : "text-muted"}`}>{p.tagline}</p>
            <p className="mt-4 flex items-baseline gap-1">
              <span className="text-[34px] font-bold tracking-[-0.035em] tabular-nums">{priceLabel(p)}</span>
              <span className={`text-[13px] ${hero ? "text-white/80" : "text-faint"}`}>/ mese</span>
            </p>
            <ul className="mt-4 flex-1 space-y-2 text-[14px]">
              {p.features.map((f) => (
                <li key={f.text} className="flex gap-2">
                  <IconCheck size={16} className={`mt-0.5 shrink-0 ${hero ? "text-white" : "text-accent"}`} />
                  <span>
                    {f.text}
                    {f.soon && <span className={`ml-1.5 inline-flex h-5 items-center rounded-full px-2 align-middle text-[10.5px] font-semibold ${hero ? "bg-white/20 text-white" : "bg-subtle text-muted"}`}>In arrivo</span>}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5">
              {mine && !(onboarding && p.price === 0) ? (
                <span className={`inline-flex h-10 w-full items-center justify-center rounded-full text-[14px] font-semibold ${hero ? "bg-white/20 text-white" : "bg-good-soft text-good"}`}>✓ Il tuo piano</span>
              ) : p.price === 0 ? (
                <form action={choosePlanAction}>
                  <input type="hidden" name="plan" value="free" />
                  <input type="hidden" name="back" value={back} />
                  <button type="submit" className={buttonClass("secondary", "md", true)}>
                    Continua gratis
                  </button>
                </form>
              ) : (
                <Link href={`/piano/${p.key}?back=${encodeURIComponent(back)}`} className={buttonClass(hero ? "primary" : "primary", "md", true, "no-underline")}>
                  Prova {p.name}
                </Link>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
