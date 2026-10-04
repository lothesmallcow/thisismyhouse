"use client";
import { useState } from "react";
import { IconCheck, IconCopy } from "./icons";

/** Big "Copia" button. Falls back to selecting the text when the clipboard is not available. */
export function CopyButton({ text, label = "Copia", wide, primary }: { text: string; label?: string; wide?: boolean; primary?: boolean }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex min-h-[56px] items-center justify-center gap-2.5 rounded-2xl px-5 font-bold transition-colors ${wide ? "w-full" : ""} ${
        done ? "bg-sage-ink text-white" : primary ? "bg-navy text-white hover:bg-navy-strong" : "border-2 border-navy bg-card text-navy hover:bg-navy-soft"
      }`}
      aria-live="polite"
    >
      {done ? <IconCheck /> : <IconCopy />}
      {done ? "Copiato!" : label}
    </button>
  );
}
