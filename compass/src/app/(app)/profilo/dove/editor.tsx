"use client";
// "Dove": the main city and its radius, other countries each with a city, all on a map.
// Click on the map to choose a town; type to get suggestions. Submits plain fields to the server.
import dynamic from "next/dynamic";
import { useRef, useState, type ReactNode } from "react";
import type { MapPlace } from "./map";

const PlaceMap = dynamic(() => import("./map"), { ssr: false, loading: () => <div className="h-[340px] w-full animate-pulse rounded-[var(--radius-card)] border border-line bg-subtle" /> });

export interface Town {
  name: string;
  lat: number;
  lng: number;
  country: string;
}
const COUNTRIES = [
  { code: "IT", name: "Italia" },
  { code: "GB", name: "Regno Unito" },
  { code: "DE", name: "Germania" },
  { code: "FR", name: "Francia" },
];
const OTHER_KM = 30;

function CityInput({ id, label, value, countries, onPick, placeholder }: { id: string; label: string; value: Town | null; countries: string[]; onPick: (t: Town | null) => void; placeholder?: string }) {
  const [q, setQ] = useState(value?.name ?? "");
  const [list, setList] = useState<Town[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function type(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) return setList([]);
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/places?q=${encodeURIComponent(v)}&cc=${countries.join(",")}`);
      if (r.ok) {
        setList(await r.json());
        setOpen(true);
      }
    }, 200);
  }
  return (
    <div className="relative space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium">
        {label}
      </label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        value={q}
        placeholder={placeholder}
        onChange={(e) => type(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        role="combobox"
        aria-expanded={open && list.length > 0}
        aria-controls={`${id}-list`}
      />
      {open && list.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="anim-in absolute z-[1000] mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
          {list.map((t) => (
            <li key={`${t.name}-${t.lat}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="block min-h-[40px] w-full px-3 text-left text-[14px] hover:bg-subtle"
                onClick={() => {
                  onPick(t);
                  setQ(t.name);
                  setOpen(false);
                }}
              >
                {t.name} <span className="text-faint">· {COUNTRIES.find((c) => c.code === t.country)?.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function WhereEditor({ home: home0, km: km0, countries: countries0, others: others0, children }: { home: Town | null; km: number; countries: string[]; others: Record<string, Town | null>; children?: ReactNode }) {
  const [home, setHome] = useState<Town | null>(home0);
  const [km, setKm] = useState(km0 || 20);
  const [countries, setCountries] = useState<string[]>(countries0.length ? countries0 : [home0?.country ?? "IT"]);
  const [others, setOthers] = useState<Record<string, Town | null>>(others0);
  const homeCc = home?.country ?? countries[0] ?? "IT";

  function toggle(cc: string) {
    setCountries((list) => (list.includes(cc) ? (list.length > 1 && cc !== homeCc ? list.filter((x) => x !== cc) : list) : [...list, cc]));
  }
  function setTown(t: Town) {
    if (!home || t.country === homeCc) setHome(t);
    else {
      setOthers((o) => ({ ...o, [t.country]: t }));
      setCountries((list) => (list.includes(t.country) ? list : [...list, t.country]));
    }
  }
  async function pick(lat: number, lng: number) {
    const r = await fetch(`/api/places?lat=${lat}&lng=${lng}`);
    if (!r.ok) return;
    const [t] = (await r.json()) as Town[];
    if (t) setTown(t);
  }

  const places: MapPlace[] = [
    ...(home ? [{ ...home, km, main: true }] : []),
    ...countries.filter((cc) => cc !== homeCc && others[cc]).map((cc) => ({ ...others[cc]!, km: OTHER_KM })),
  ];

  return (
    <div className="space-y-6">
      <div className="anim-in">
        <PlaceMap places={places} onPick={pick} />
        <p className="mt-2 text-[12.5px] text-faint">Clicca sulla mappa per scegliere una città: nel tuo paese diventa la città principale, in un altro paese si aggiunge a quel paese.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CityInput key={`home-${home?.name ?? ""}`} id="home" label="La tua città" value={home} countries={["IT", "GB", "DE", "FR"]} onPick={(t) => t && setHome(t)} placeholder="Es. Milano" />
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="km" className="text-[13px] font-medium">
              Quanto lontano
            </label>
            <span className="text-[14px] font-semibold tabular-nums transition-all" aria-live="polite">
              {km} km
            </span>
          </div>
          <input id="km" type="range" min={2} max={100} step={1} value={km} onChange={(e) => setKm(Number(e.target.value))} />
        </div>
      </div>

      <fieldset>
        <legend className="text-[13px] font-medium">In quali paesi cerchi</legend>
        <p className="mt-0.5 text-[12.5px] text-faint">Puoi sceglierne più di uno: cerco in ognuno, nella sua lingua. Per ogni paese puoi indicare una città.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {COUNTRIES.map((c) => {
            const on = countries.includes(c.code);
            return (
              <button
                key={c.code}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(c.code)}
                className={`inline-flex min-h-[38px] items-center rounded-full border px-4 text-[14px] transition-all duration-200 active:scale-95 ${on ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface hover:border-line-strong"}`}
              >
                {c.name}
                {c.code === homeCc ? " · casa" : ""}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {countries
            .filter((cc) => cc !== homeCc)
            .map((cc) => (
              <div key={cc} className="anim-in">
                <CityInput key={`${cc}-${others[cc]?.name ?? ""}`} id={`city-${cc}`} label={`Città in ${COUNTRIES.find((c) => c.code === cc)?.name} (facoltativa)`} value={others[cc] ?? null} countries={[cc]} onPick={(t) => setOthers((o) => ({ ...o, [cc]: t }))} placeholder="Tutto il paese" />
              </div>
            ))}
        </div>
      </fieldset>

      {children}

      <input type="hidden" name="city" value={home?.name ?? ""} />
      <input type="hidden" name="km" value={km} />
      {countries.map((cc) => (
        <input key={cc} type="hidden" name="country" value={cc} />
      ))}
      <input type="hidden" name="places" value={countries.filter((cc) => cc !== homeCc && others[cc]).map((cc) => others[cc]!.name).join(", ")} />
    </div>
  );
}
