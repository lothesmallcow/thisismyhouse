"use client";
import { useEffect, useRef, useState } from "react";
import { IconSearch } from "./icons";

/** Filters the labels inside the next [data-catalog] container by text, without a round trip. */
export function CatalogFilter({ target, placeholder = "Cerca" }: { target: string; placeholder?: string }) {
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const root = document.querySelector(`[data-catalog="${target}"]`);
    if (!root) return;
    const needle = q.trim().toLowerCase();
    root.querySelectorAll<HTMLElement>("[data-item]").forEach((el) => {
      el.style.display = !needle || (el.dataset.item ?? "").includes(needle) ? "" : "none";
    });
    root.querySelectorAll<HTMLDetailsElement>("details[data-group]").forEach((d) => {
      const any = [...d.querySelectorAll<HTMLElement>("[data-item]")].some((el) => el.style.display !== "none");
      d.style.display = any ? "" : "none";
      if (needle) d.open = any;
    });
  }, [q, target]);
  return (
    <div className="relative">
      <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
      <label htmlFor={`f-${target}`} className="sr-only">
        {placeholder}
      </label>
      <input ref={ref} id={`f-${target}`} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="!pl-9" />
    </div>
  );
}
