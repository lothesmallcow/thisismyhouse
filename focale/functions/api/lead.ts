/**
 * POST /api/lead  { email, url, score, sector, consent: true, consentVersion, website (honeypot) }
 * Stores only: URL, score, sector, email and the consent record (text version and time).
 * No consent, no email: the request is refused unless the box was ticked by the visitor.
 * Optionally emails Lorenzo through Web3Forms (WEB3FORMS_KEY) with the same fields.
 */
import { CONSENT } from "../../src/scorer/consent";
import { fail, json, rateLimited, sameOrigin, type Ctx } from "../_lib/runtime";

const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[^\s@<>()[\]\\,;:"]{1,190}\.[a-z]{2,24}$/i;

export const onRequestPost = async ({ request, env, waitUntil }: Ctx) => {
  if (!sameOrigin(request)) return fail(403, "Richiesta non ammessa.");
  if (await rateLimited(request, env, "lead", 5)) return fail(429, "Troppe richieste dall'ultima ora. Riprova più tardi.");

  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return fail(400, "Richiesta non valida.");
  }
  if (typeof b.website === "string" && b.website.trim()) return json({ ok: true }); // a bot filled the hidden field
  if (b.consent !== true || b.consentVersion !== CONSENT.version) return fail(400, "Senza il consenso non possiamo scriverti: spunta la casella se vuoi riceverlo.");
  const email = String(b.email ?? "").trim();
  if (!EMAIL.test(email) || email.length > 254) return fail(400, "Controlla l'indirizzo email.");
  let url = "";
  try {
    url = new URL(String(b.url ?? "")).toString().slice(0, 500);
  } catch {
    return fail(400, "Manca l'indirizzo del sito analizzato.");
  }
  const score = Math.max(0, Math.min(100, Math.round(Number(b.score) || 0)));
  const sector = String(b.sector ?? "").slice(0, 32);

  const at = new Date().toISOString();
  const record = { url, score, sector, email, consent: { given: true, at, version: CONSENT.version, text: CONSENT.text, purpose: CONSENT.purpose } };
  if (!env.SCORER_KV) return fail(503, "Al momento non possiamo salvare la richiesta. Scrivici su WhatsApp.");
  await env.SCORER_KV.put(`lead:${at}:${crypto.randomUUID().slice(0, 8)}`, JSON.stringify(record), { expirationTtl: CONSENT.keepDays * 86400 });

  if (env.WEB3FORMS_KEY) {
    const notify = fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ access_key: env.WEB3FORMS_KEY, subject: `Analisi sito: ${score}/100`, from_name: "Analisi sito", email, sito: url, punteggio: score, settore: sector, consenso: `${CONSENT.version} ${at}` }),
    }).catch(() => undefined);
    if (waitUntil) waitUntil(notify);
    else await notify;
  }
  return json({ ok: true });
};

export const onRequest = () => fail(405, "Usa il modulo della pagina.");
