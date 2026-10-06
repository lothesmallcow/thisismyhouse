"use client";
// The checkout, ready for when payments go live. Today it is a trial: the card fields have no name,
// so nothing typed in them is ever sent or saved; any well-formed number is accepted.
import { useState } from "react";
import { buttonClass } from "./ui";

const TEST = "4242424242424242";
const groups = (s: string) => s.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");

export function DemoCheckout({ plan, back, action }: { plan: string; back: string; action: (f: FormData) => Promise<void> }) {
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [holder, setHolder] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fillTest = () => {
    setNumber(groups(TEST));
    setExpiry("12/30");
    setCvc("123");
    setError(null);
  };
  const input = "h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-[15px] tabular-nums outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const digits = number.replace(/\D/g, "");
        if (digits.length < 13) {
          e.preventDefault();
          setError("Scrivi un numero di carta completo (o usa la carta di prova).");
        } else if (!/^\d{2}\/\d{2}$/.test(expiry) || cvc.length < 3) {
          e.preventDefault();
          setError("Completa scadenza (MM/AA) e CVC.");
        }
      }}
      className="space-y-4"
    >
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="back" value={back} />
      <div>
        <label htmlFor="cc-holder" className="mb-1.5 block text-[13px] font-medium text-muted">
          Intestatario
        </label>
        <input id="cc-holder" autoComplete="off" value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Nome e cognome" className={input} />
      </div>
      <div>
        <label htmlFor="cc-number" className="mb-1.5 block text-[13px] font-medium text-muted">
          Numero della carta
        </label>
        <input id="cc-number" inputMode="numeric" autoComplete="off" value={number} onChange={(e) => setNumber(groups(e.target.value))} placeholder="4242 4242 4242 4242" className={input} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="cc-exp" className="mb-1.5 block text-[13px] font-medium text-muted">
            Scadenza
          </label>
          <input
            id="cc-exp"
            inputMode="numeric"
            autoComplete="off"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value.replace(/\D/g, "").slice(0, 4).replace(/(\d{2})(?=\d)/, "$1/"))}
            placeholder="MM/AA"
            className={input}
          />
        </div>
        <div>
          <label htmlFor="cc-cvc" className="mb-1.5 block text-[13px] font-medium text-muted">
            CVC
          </label>
          <input id="cc-cvc" inputMode="numeric" autoComplete="off" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" className={input} />
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-warn-soft px-3.5 py-2.5 text-[13.5px] text-warn">
          {error}
        </p>
      )}
      <button type="submit" className={buttonClass("primary", "md", true)}>
        Attiva {plan === "premium" ? "Premium" : "Plus"} in prova gratuita
      </button>
      <button type="button" onClick={fillTest} className="w-full text-center text-[13px] text-accent underline">
        Usa la carta di prova
      </button>
    </form>
  );
}
