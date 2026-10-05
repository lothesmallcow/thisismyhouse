"use client";
// Rule-based extraction runs in the browser while pasting: fields fill themselves, the person checks.
import { useState } from "react";
import { extractApplicationEmails } from "@/lib/core/extract";
import { findSalaryText } from "@/lib/core/salary";
import { guessFromUrl } from "@/lib/core/url-guess";

function guessTitle(text: string): string {
  const first = text.split(/\n/).map((l) => l.trim()).find((l) => l.length > 3 && l.length < 90);
  return first ?? "";
}

export interface Prefilled {
  title?: string;
  company?: string;
  city?: string;
  url?: string;
  text?: string;
}

/** `initial`: what the "Salva in Compass" button read from the page the person was looking at. */
export function ManualPrefill({ initial = {} }: { initial?: Prefilled }) {
  const [text, setText] = useState(initial.text ?? "");
  const [f, setF] = useState(() => {
    const t = initial.text ?? "";
    return {
      title: initial.title || guessTitle(t),
      company: initial.company ?? "",
      city: initial.city ?? "",
      salary: findSalaryText(t) || "",
      email: extractApplicationEmails(t)[0]?.email ?? "",
      url: initial.url ?? "",
    };
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (k === "url") {
      const g = guessFromUrl(v);
      setF((old) => ({ ...old, url: v, title: old.title || g.title || "", company: old.company || g.company || "", city: old.city || g.city || "" }));
      return;
    }
    setF({ ...f, [k]: v });
  };

  function onText(v: string) {
    setText(v);
    const emails = extractApplicationEmails(v);
    const url = v.match(/https?:\/\/\S+/)?.[0] ?? "";
    setF((old) => ({
      title: old.title || guessTitle(v),
      company: old.company,
      city: old.city,
      salary: old.salary || findSalaryText(v) || "",
      email: old.email || emails[0]?.email || "",
      url: old.url || url,
    }));
  }

  const input = (k: keyof typeof f, label: string, hint?: string, type = "text") => (
    <div className="space-y-1.5">
      <label htmlFor={k} className="block text-[13px] font-medium">
        {label}
      </label>
      <input id={k} name={k} type={type} value={f[k]} onChange={set(k)} required={k === "title"} />
      {hint && <p className="text-[12.5px] text-faint">{hint}</p>}
    </div>
  );

  return (
    <>
      <div className="space-y-1.5">
        <label htmlFor="text" className="block text-[13px] font-medium">
          Testo dell&apos;annuncio
        </label>
        <textarea id="text" name="text" rows={8} value={text} onChange={(e) => onText(e.target.value)} />
        <p className="text-[12.5px] text-faint">Incolla tutto il testo: i campi sotto si compilano da soli.</p>
      </div>
      {input("url", "Link dell'annuncio", "Facoltativo. Da solo basta a leggere titolo e città.", "url")}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {input("title", "Ruolo")}
        {input("company", "Azienda")}
        {input("city", "Città")}
        {input("salary", "Retribuzione", "Se indicata.")}
      </div>
      {input("email", "E-mail per candidarsi", "Se l'annuncio chiede di mandare il CV a un indirizzo.", "email")}
    </>
  );
}
