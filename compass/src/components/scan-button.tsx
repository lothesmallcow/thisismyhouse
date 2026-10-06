"use client";
// "Fai web scraping" with the plan's limit: a countdown to the next free search, and how many are left.
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass } from "./ui";
import { IconSearch } from "./icons";

const two = (n: number) => String(n).padStart(2, "0");
function left(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${two(m)}:${two(s % 60)}` : `${two(m)}:${two(s % 60)}`;
}

export function ScanButton({
  action,
  nextAt,
  remaining,
  perDay,
  plan,
  running = false,
  showMeta = true,
  onHero = false,
}: {
  action: () => Promise<void>;
  nextAt: string | null;
  remaining: number;
  perDay: number;
  plan: string;
  running?: boolean;
  showMeta?: boolean;
  /** Inside a page header (blue band): light text. */
  onHero?: boolean;
}) {
  const target = nextAt ? new Date(nextAt).getTime() : 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  const wait = target > now ? target - now : 0;
  const ready = !wait && !running;
  return (
    <div className="flex flex-col items-start gap-1">
      <form action={action}>
        <button type="submit" disabled={!ready} className={buttonClass("primary", "sm", false, "disabled:opacity-60")} aria-live="polite">
          <IconSearch size={16} />
          {running ? "In corso…" : wait ? <span className="tabular-nums">Prossima ricerca tra {left(wait)}</span> : "Fai web scraping"}
        </button>
      </form>
      {showMeta && (
        <span className={`text-[12px] ${onHero ? "text-white/85" : "text-faint"}`}>
          {remaining} di {perDay} ricerche oggi · piano {plan} ·{" "}
          <Link href="/piano" className="font-semibold text-inherit underline">
            {plan === "Premium" ? "abbonamento" : "più ricerche"}
          </Link>
        </span>
      )}
    </div>
  );
}
