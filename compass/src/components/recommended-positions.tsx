import { saveRolesAction } from "@/app/(app)/actions";
import { MAX_ROLES, STUDENT_ROLE, type CvPosition } from "@/lib/core/cv-positions";
import { Button, ChoiceRow, Field } from "./ui";

const KIND = { direzione: "Per te", fatto: "Già fatto", prossimo: "Passo successivo", "nel-cv": "Dal CV" } as const;

/** The searched roles (ticked) and those recommended from the CV (to tick): the person decides. */
export function RecommendedPositions({ roles, recommended, back, submit = "Salva le posizioni" }: { roles: string[]; recommended: CvPosition[]; back: string; submit?: string }) {
  return (
    <form action={saveRolesAction} className="space-y-4">
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
      <Field label="Un'altra posizione" htmlFor="extraRole" hint={`Facoltativo. Si cercano al massimo ${MAX_ROLES} posizioni: le prime spuntate.`}>
        <input id="extraRole" name="extraRole" type="text" />
      </Field>
      <Button variant="secondary">{submit}</Button>
    </form>
  );
}
