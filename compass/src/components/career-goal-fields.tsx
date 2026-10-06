"use client";
// "Che lavoro cerchi?": the same job, a change they can name, or a change they want suggested. The job
// they do now is asked in every case (it pins the level and, for a change, where to start from).
import { useState } from "react";
import { RoleInput } from "./role-input";

type Goal = "stesso" | "cambio" | "esplora";

const GOALS: { key: Goal; label: string; hint: string }[] = [
  { key: "stesso", label: "Lo stesso lavoro, o uno simile", hint: "Cerco il mio ruolo e i suoi nomi negli annunci." },
  { key: "cambio", label: "Voglio cambiare e so verso cosa", hint: "Scrivi il lavoro che vuoi fare." },
  { key: "esplora", label: "Voglio cambiare ma non so verso cosa", hint: "Ti propongo i lavori più vicini al tuo, per competenze in comune." },
];

export function CareerGoalFields({ goal, currentRole, roles }: { goal: Goal | null; currentRole: string; roles: string[] }) {
  const [g, setG] = useState<Goal>(goal ?? "stesso");
  const wanted = g === "stesso" && !roles.length && currentRole ? [currentRole] : roles;
  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-[15px] font-semibold">Cosa vuoi fare?</legend>
        <div className="grid grid-cols-1 gap-2">
          {GOALS.map((x) => (
            <label key={x.key} className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 ${g === x.key ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong"}`}>
              <input type="radio" name="careerGoal" value={x.key} checked={g === x.key} onChange={() => setG(x.key)} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
              <span>
                <span className="block text-[14.5px] font-medium">{x.label}</span>
                <span className="block text-[12.5px] text-muted">{x.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="currentRole" className="mb-1.5 block text-[14px] font-medium">
          Il tuo lavoro attuale (o l&apos;ultimo)
        </label>
        <RoleInput id="currentRole" name="currentRole" defaultValue={currentRole} placeholder="Es. Sales manager, Impiegata amministrativa" required={g === "esplora"} />
        <p className="mt-1 text-[12.5px] text-faint">Scegli dai suggerimenti mentre scrivi: ci sono quasi 3.000 professioni, con tutti i nomi con cui si chiamano.</p>
      </div>

      {g !== "esplora" ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={`${g}-${i}`}>
              <label htmlFor={`role${i + 1}`} className="mb-1.5 block text-[14px] font-medium">
                {i === 0 ? (g === "cambio" ? "Il lavoro che vuoi fare" : "Ruolo") : "Un altro ruolo (facoltativo)"}
              </label>
              <RoleInput id={`role${i + 1}`} name={`role${i + 1}`} defaultValue={wanted[i] ?? ""} required={i === 0 && g === "cambio"} placeholder={i === 0 ? (g === "cambio" ? "Es. Account manager" : "Es. Responsabile vendite") : ""} />
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-subtle px-3.5 py-3 text-[13.5px] text-muted">
          Al passo dopo ti propongo i lavori che chiedono più competenze uguali alle tue, con il perché. Scegli quelli che ti incuriosiscono.
        </p>
      )}
    </div>
  );
}
