"use client";
import { useState } from "react";
import { IconCheck, IconCopy } from "./icons";

/** "Copia" button. Falls back to selecting the text when the clipboard is not available. */
export function CopyButton({ text, label = "Copia", wide, primary, size = "md" }: { text: string; label?: string; wide?: boolean; primary?: boolean; size?: "sm" | "md" }) {
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
    setTimeout(() => setDone(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors ${size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-[14px]"} ${wide ? "w-full" : ""} ${
        done ? "bg-good-soft text-good" : primary ? "bg-primary text-on-primary hover:bg-primary-hover" : "border border-line-strong bg-surface text-ink hover:bg-subtle"
      }`}
      aria-live="polite"
    >
      {done ? <IconCheck size={16} /> : <IconCopy size={16} />}
      {done ? "Copiato" : label}
    </button>
  );
}
