"use client";
// A role field that suggests real job titles while typing (hand-made list plus every ESCO occupation,
// by any name: "sales manager", "responsabile vendite", "direttore commerciale"). Free text still works.
import { useEffect, useId, useRef, useState } from "react";

export function RoleInput({ name, id, defaultValue = "", placeholder, required }: { name: string; id: string; defaultValue?: string; placeholder?: string; required?: boolean }) {
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<{ label: string; hint: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const list = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  /** Ask for suggestions a moment after the last key. */
  const lookUp = (text: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < 2) {
      setItems([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ruoli?q=${encodeURIComponent(text.trim())}`);
        setItems(res.ok ? await res.json() : []);
        setActive(-1);
      } catch {
        setItems([]);
      }
    }, 180);
  };
  const pick = (label: string) => {
    setValue(label);
    setOpen(false);
    setItems([]);
  };
  const show = open && items.length > 0 && !(items.length === 1 && items[0].label === value);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={show}
        aria-controls={list}
        aria-autocomplete="list"
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          lookUp(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!show) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(items.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(items[active].label);
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {show && (
        <ul id={list} role="listbox" className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl border border-line bg-surface py-1 shadow-[var(--shadow-card)]">
          {items.map((it, i) => (
            <li
              key={it.label}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(it.label);
              }}
              className={`cursor-pointer px-3.5 py-2 text-[14px] ${i === active ? "bg-subtle" : "hover:bg-subtle"}`}
            >
              <span className="font-medium">{it.label}</span>
              {it.hint && <span className="block text-[12px] text-faint">{it.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
