import { ChoiceRow } from "./ui";

export const PRIORITY_OPTIONS = [
  { value: "alta", label: "Alta: mi serve un lavoro presto", hint: "Più offerte: anche posizioni un gradino sotto e annunci meno precisi." },
  { value: "media", label: "Media", hint: "Le posizioni giuste per il tuo livello." },
  { value: "bassa", label: "Bassa: posso aspettare l'occasione giusta", hint: "Solo le posizioni migliori: meno offerte, più selezionate." },
] as const;

/** "Priorità di lavoro": how wide the searches are and how strict the score is. */
export function PriorityChoice({ value }: { value: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-[13.5px] font-semibold">Priorità di lavoro</legend>
      {PRIORITY_OPTIONS.map((o) => (
        <ChoiceRow key={o.value} type="radio" name="priority" value={o.value} defaultChecked={value === o.value} hint={o.hint}>
          {o.label}
        </ChoiceRow>
      ))}
    </fieldset>
  );
}
