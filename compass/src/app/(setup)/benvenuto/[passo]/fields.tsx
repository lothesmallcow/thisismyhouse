"use client";
import { useMemo, useState } from "react";
import { MONTHS_PER_YEAR, netAnnualToGrossAnnual } from "@/lib/core/salary";

export function KmSlider({ defaultValue }: { defaultValue: number }) {
  const [km, setKm] = useState(defaultValue || 20);
  return (
    <div className="space-y-2">
      <label htmlFor="km" className="block text-[1.05rem] font-bold">
        Quanto lontano al massimo?
      </label>
      <p className="font-serif text-[2rem] font-semibold text-navy" aria-live="polite">
        {km} km
      </p>
      <input id="km" name="km" type="range" min={2} max={80} step={1} value={km} onChange={(e) => setKm(Number(e.target.value))} />
      <div className="flex justify-between text-[0.95rem] text-ink-soft">
        <span>2 km</span>
        <span>80 km</span>
      </div>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={() => setKm((k) => Math.max(2, k - 5))} className="min-h-[52px] flex-1 rounded-2xl border-2 border-navy font-bold text-navy">
          − 5 km
        </button>
        <button type="button" onClick={() => setKm((k) => Math.min(80, k + 5))} className="min-h-[52px] flex-1 rounded-2xl border-2 border-navy font-bold text-navy">
          + 5 km
        </button>
      </div>
    </div>
  );
}

export function CityField({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="space-y-2">
      <label htmlFor="city" className="block text-[1.05rem] font-bold">
        La tua città
      </label>
      <p className="text-[0.98rem] text-ink-soft">Basta il nome del comune, per esempio Torino.</p>
      <input id="city" name="city" type="text" autoComplete="address-level2" defaultValue={defaultValue} />
    </div>
  );
}

export function NetSalaryField({ defaultValue }: { defaultValue?: number }) {
  const [v, setV] = useState(defaultValue ? String(defaultValue) : "");
  const gross = useMemo(() => {
    const n = Number(v.replace(/[^\d]/g, ""));
    return n > 300 ? netAnnualToGrossAnnual(n * MONTHS_PER_YEAR) : null;
  }, [v]);
  return (
    <div className="space-y-3">
      <label htmlFor="net" className="block text-[1.05rem] font-bold">
        Euro netti al mese, almeno
      </label>
      <input id="net" name="net" type="text" inputMode="numeric" placeholder="Per esempio 1300" value={v} onChange={(e) => setV(e.target.value)} />
      {gross && (
        <p className="rounded-2xl bg-navy-soft px-4 py-3" aria-live="polite">
          Negli annunci di solito si scrive lo stipendio <strong>lordo all&apos;anno</strong>: per te sono circa <strong>{gross.toLocaleString("it-IT")} €</strong>. È una stima.
        </p>
      )}
    </div>
  );
}
