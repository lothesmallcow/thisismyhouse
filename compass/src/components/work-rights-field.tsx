// "Dove puoi lavorare senza visto?": many ads ask for the right to work. Used by the ranking.
import { WORK_RIGHTS } from "@/lib/core/situation";
import { PillCheck } from "./ui";

export function WorkRightsField({ value }: { value: string[] }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium">Dove puoi lavorare senza visto?</legend>
      <input type="hidden" name="workRightsShown" value="1" />
      <div className="flex flex-wrap gap-2">
        {WORK_RIGHTS.map((w) => (
          <PillCheck key={w.key} name="workRight" value={w.key} defaultChecked={value.includes(w.key)}>
            {w.label}
          </PillCheck>
        ))}
      </div>
      <p className="mt-1.5 text-[12.5px] text-faint">Gli annunci che chiedono il diritto di lavorare in un paese che non hai scelto qui scendono in classifica, con il motivo.</p>
    </fieldset>
  );
}
