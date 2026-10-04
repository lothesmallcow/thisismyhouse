"use client";
// Rule-based extraction runs in the browser as she pastes: fields fill themselves, she checks.
import { useState } from "react";
import { extractApplicationEmails } from "@/lib/core/extract";
import { findSalaryText } from "@/lib/core/salary";
import { guessFromUrl } from "@/lib/core/url-guess";

function guessTitle(text: string): string {
  const first = text.split(/\n/).map((l) => l.trim()).find((l) => l.length > 3 && l.length < 90);
  return first ?? "";
}

export function ManualPrefill() {
  const [text, setText] = useState("");
  const [f, setF] = useState({ title: "", company: "", city: "", salary: "", email: "", url: "" });
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
    <div className="space-y-2">
      <label htmlFor={k} className="block text-[1.05rem] font-bold">
        {label}
      </label>
      {hint && <p className="text-[0.98rem] text-ink-soft">{hint}</p>}
      <input id={k} name={k} type={type} value={f[k]} onChange={set(k)} required={k === "title"} />
    </div>
  );

  return (
    <>
      <div className="space-y-2">
        <label htmlFor="text" className="block text-[1.05rem] font-bold">
          Testo dell&apos;annuncio
        </label>
        <p className="text-[0.98rem] text-ink-soft">Incolla tutto il testo. Va bene anche se è lungo.</p>
        <textarea id="text" name="text" rows={8} value={text} onChange={(e) => onText(e.target.value)} />
      </div>
      {input("url", "Indirizzo della pagina dell'annuncio (se ce l'hai)", "Puoi anche incollare solo questo: provo a leggere titolo e città.", "url")}
      {input("title", "Che lavoro è?")}
      {input("company", "Azienda")}
      {input("city", "Città")}
      {input("salary", "Stipendio (se c'è scritto)")}
      {input("email", "E-mail per candidarsi (se c'è)", "La trovo da sola se il testo chiede di mandare il CV a un indirizzo.", "email")}
    </>
  );
}
