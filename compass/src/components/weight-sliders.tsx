"use client";
import { useState } from "react";

type Area = { key: string; name: string; hint: string; value: number };

/** One slider per part of the score (0 = doesn't count, 10 = counts a lot), with the resulting shares. */
export function WeightSliders({ areas }: { areas: Area[] }) {
  const [v, setV] = useState<Record<string, number>>(Object.fromEntries(areas.map((a) => [a.key, a.value])));
  const total = Object.values(v).reduce((s, x) => s + x, 0) || 1;
  return (
    <div className="space-y-4">
      {areas.map((a) => (
        <div key={a.key} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`w-${a.key}`} className="text-[14px] font-medium">
              {a.name}
            </label>
            <span className="text-[13px] tabular-nums text-muted" aria-live="polite">
              {v[a.key]}/10 · {Math.round((100 * v[a.key]) / total)}% del punteggio
            </span>
          </div>
          <input id={`w-${a.key}`} name={a.key} type="range" min={0} max={10} step={1} value={v[a.key]} onChange={(e) => setV({ ...v, [a.key]: Number(e.target.value) })} />
          <p className="text-[12.5px] text-faint">{a.hint}</p>
        </div>
      ))}
    </div>
  );
}
