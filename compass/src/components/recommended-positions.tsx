import { saveRolesAction } from "@/app/(app)/actions";
import { MAX_ROLES, STUDENT_ROLE, type CvPosition } from "@/lib/core/cv-positions";
import type { ReactNode } from "react";
import { Button, ChoiceRow, Field, PillCheck } from "./ui";

export interface PositionGroup {
  label: string;
  items: string[];
}

const KIND = { direzione: "Per te", fatto: "Già fatto", prossimo: "Passo successivo", "nel-cv": "Dal CV" } as const;

/** The searched roles (ticked) and those recommended from the CV (to tick): the person decides. */
export function RecommendedPositions({
  roles,
  recommended,
  back,
  submit = "Salva le posizioni",
  before,
  more = [],
  others = [],
  suggestions = [],
}: {
  roles: string[];
  recommended: CvPosition[];
  back: string;
  submit?: string;
  /** Rendered after the positions (the careers on Posizioni e carriere). */
  before?: ReactNode;
  /** Positions of the chosen careers, to tick (like the questionnaire). */
  more?: PositionGroup[];
  /** Positions of the other careers, folded away. */
  others?: PositionGroup[];
  /** Every known position, for the free field's suggestions. */
  suggestions?: string[];
}) {
  const taken = new Set([...roles, ...recommended.map((r) => r.title)].map((x) => x.toLowerCase()));
  const group = (g: PositionGroup) => {
    const items = g.items.filter((t) => !taken.has(t.toLowerCase()));
    return items.length === 0 ? null : (
      <div key={g.label} className="anim-in">
        <p className="mb-1.5 text-[13px] font-medium text-faint">{g.label}</p>
        <div className="flex flex-wrap gap-2">
          {items.map((t) => (
            <PillCheck key={t} name="role" value={t}>
              {t}
            </PillCheck>
          ))}
        </div>
      </div>
    );
  };
  return (
    <form action={saveRolesAction} className="space-y-6">
      <input type="hidden" name="back" value={back} />
      {roles.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-[13.5px] font-semibold">Cerchi ora</legend>
          {roles.map((r) => (
            <ChoiceRow key={r} name="role" value={r} defaultChecked={!STUDENT_ROLE.test(r)} hint={STUDENT_ROLE.test(r) ? "È quello che sei, non una posizione da cercare: lasciala senza spunta e scegli quelle qui sotto." : undefined}>
              {r}
            </ChoiceRow>
          ))}
        </fieldset>
      )}
      {more.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="mb-1 text-[13.5px] font-semibold">Aggiungi posizioni delle tue carriere</legend>
          {more.map(group)}
        </fieldset>
      )}
      {recommended.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-[13.5px] font-semibold">Consigliate dal tuo CV</legend>
          {recommended.map((r) => (
            <ChoiceRow key={r.title} name="role" value={r.title} hint={`${KIND[r.kind]} · ${r.why}`}>
              {r.title}
            </ChoiceRow>
          ))}
        </fieldset>
      )}
      {before}
      {others.length > 0 && (
        <details className="rounded-lg border border-line px-4 py-3">
          <summary className="cursor-pointer text-[14px] font-medium">Posizioni di altre carriere</summary>
          <div className="mt-3 space-y-3">{others.map(group)}</div>
        </details>
      )}
      <Field label="Un'altra posizione" htmlFor="extraRole" hint={`Scrivi o scegli tra i suggerimenti. Si cercano al massimo ${MAX_ROLES} posizioni: le prime spuntate.`}>
        <input id="extraRole" name="extraRole" type="text" list={suggestions.length ? "all-positions" : undefined} />
      </Field>
      {suggestions.length > 0 && (
        <datalist id="all-positions">
          {suggestions.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      )}
      <Button variant="secondary">{submit}</Button>
    </form>
  );
}
