"use client";
import { useMemo, useState } from "react";
import { MONTHS_PER_YEAR, netAnnualToGrossAnnual } from "@/lib/core/salary";

export function KmSlider({ defaultValue }: { defaultValue: number }) {
  const [km, setKm] = useState(defaultValue || 20);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor="km" className="text-[13px] font-medium">
          Distanza massima
        </label>
        <span className="text-[14px] font-semibold tabular-nums" aria-live="polite">
          {km} km
        </span>
      </div>
      <input id="km" name="km" type="range" min={2} max={100} step={1} value={km} onChange={(e) => setKm(Number(e.target.value))} />
    </div>
  );
}

export function NetSalaryField({ defaultValue, stage }: { defaultValue?: number; stage?: boolean }) {
  const [v, setV] = useState(defaultValue ? String(defaultValue) : "");
  const gross = useMemo(() => {
    const n = Number(v.replace(/[^\d]/g, ""));
    return n > 300 ? netAnnualToGrossAnnual(n * MONTHS_PER_YEAR) : null;
  }, [v]);
  return (
    <div className="space-y-1.5">
      <label htmlFor="net" className="block text-[13px] font-medium">
        Euro netti al mese
      </label>
      <input id="net" name="net" type="text" inputMode="numeric" placeholder={stage ? "Es. 600" : "Es. 1300"} value={v} onChange={(e) => setV(e.target.value)} />
      {gross && !stage && (
        <p className="text-[12.5px] text-faint" aria-live="polite">
          Negli annunci di solito c&apos;è il lordo annuo: circa {gross.toLocaleString("it-IT")} € (stima).
        </p>
      )}
    </div>
  );
}
