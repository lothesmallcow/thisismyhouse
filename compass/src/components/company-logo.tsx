"use client";
// A company's small logo (its site's icon) or, when there is none, its initial on the theme colour.
import { useState } from "react";

export function CompanyLogo({ name, domain, size = 40 }: { name: string | null; domain: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initial = (name ?? "?").replace(/^[^A-Za-z0-9]+/, "").charAt(0).toUpperCase() || "?";
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-line/70 bg-surface text-[15px] font-bold text-accent" style={{ width: size, height: size }}>
      {domain && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- a remote icon, no optimisation needed
        <img src={`https://icons.duckduckgo.com/ip3/${domain}.ico`} alt="" width={size - 14} height={size - 14} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-accent-soft">{initial}</span>
      )}
    </span>
  );
}
