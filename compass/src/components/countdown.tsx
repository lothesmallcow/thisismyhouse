"use client";
import { useEffect, useState } from "react";

/** "Parte tra 12 minuti" — updates every 20 seconds. */
export function Countdown({ at }: { at: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 20000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  if (now == null) return null;
  const mins = Math.max(0, Math.round((new Date(at).getTime() - now) / 60000));
  if (mins <= 0) return <span>sta partendo</span>;
  if (mins < 60) return <span>parte tra {mins === 1 ? "1 minuto" : `${mins} minuti`}</span>;
  const h = Math.floor(mins / 60);
  return <span>parte tra circa {h === 1 ? "1 ora" : `${h} ore`}</span>;
}
