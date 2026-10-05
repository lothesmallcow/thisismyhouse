"use client";
// "Dove": places as chips (a city, a region or a whole country), added by typing and picking a
// suggestion, removed with ×. No distances. Submits one hidden "place" field per chip.
import { useRef, useState } from "react";
import type { WherePlace } from "@/lib/core/where";

const COUNTRY: Record<string, string> = { IT: "Italia", GB: "Regno Unito", DE: "Germania", FR: "Francia" };
const value = (p: WherePlace) => `${p.kind}|${p.country}|${p.name}`;
const label = (p: WherePlace) => (p.kind === "paese" ? `${p.name} · tutto il paese` : `${p.name} · ${p.kind}, ${COUNTRY[p.country]}`);

export function PlacesPicker({ initial }: { initial: WherePlace[] }) {
  const [places, setPlaces] = useState<WherePlace[]>(initial);
  const [q, setQ] = useState("");
  const [list, setList] = useState<WherePlace[]>([]);
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function type(v: string) {
    setQ(v);
    setActive(0);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) return setList([]);
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/places?q=${encodeURIComponent(v)}`);
      if (r.ok) setList(await r.json());
    }, 150);
  }
  function add(p: WherePlace) {
    setPlaces((old) => (old.some((x) => value(x) === value(p)) ? old : [...old, p]));
    setQ("");
    setList([]);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" aria-live="polite">
        {places.length === 0 && <p className="text-[13px] text-faint">Nessun luogo: scrivine uno qui sotto.</p>}
        {places.map((p) => (
          <span key={value(p)} className="anim-in inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-accent bg-accent-soft pl-3.5 pr-1 text-[14px] text-accent">
            {label(p)}
            <button type="button" onClick={() => setPlaces((old) => old.filter((x) => value(x) !== value(p)))} className="flex h-7 w-7 items-center justify-center rounded-full text-[16px] hover:bg-surface" aria-label={`Togli ${p.name}`}>
              ×
            </button>
            <input type="hidden" name="place" value={value(p)} />
          </span>
        ))}
      </div>
      <div className="relative">
        <label htmlFor="place-search" className="mb-1.5 block text-[13px] font-medium">
          Aggiungi un luogo
        </label>
        <input
          id="place-search"
          type="text"
          autoComplete="off"
          value={q}
          placeholder="Una città, una regione o un paese: Milano, Lombardia, Regno Unito…"
          onChange={(e) => type(e.target.value)}
          onKeyDown={(e) => {
            if (!list.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(list.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              add(list[active]);
            }
          }}
          role="combobox"
          aria-expanded={list.length > 0}
          aria-controls="place-options"
          aria-autocomplete="list"
        />
        {list.length > 0 && (
          <ul id="place-options" role="listbox" className="anim-in absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
            {list.map((p, i) => (
              <li key={value(p)} role="option" aria-selected={i === active}>
                <button type="button" onClick={() => add(p)} className={`block min-h-[42px] w-full px-3.5 text-left text-[14px] ${i === active ? "bg-subtle" : "hover:bg-subtle"}`}>
                  {label(p)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[12.5px] text-faint">Puoi mettere più luoghi, anche in paesi diversi: cerco in ognuno, nella sua lingua. La prima città è la tua città.</p>
    </div>
  );
}
