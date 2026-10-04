// Generic fallback for any other job-alert e-mail (Adzuna, Jooble, Subito, agencies...):
// at least extract job links and their anchor text. Records are "thin".
import { parse } from "node-html-parser";
import { canonicalUrl } from "../../core/dedupe";
import { findPlace } from "../../core/geo";
import type { RawJob } from "../../core/normalize";
import { fold } from "../../core/text";
import type { InboundEmail } from "../mail/types";
import { cleanLine, decodeEntities, type AlertParseResult } from "./common";

const NOT_A_JOB =
  /(unsubscri|disiscri|annulla (l')?iscrizione|cancella(ti)?|privacy|cookie|termini|condizioni|preferenz|impostazion|gestisci|modifica (avviso|ricerca)|vedi tutt|visualizza tutt|mostra tutt|scarica|download|app store|google play|aiuto|help|assistenza|accedi|login|registrati|facebook|instagram|twitter|linkedin$|youtube|clicca qui|leggi di più|scopri di più|qui$|home|profilo|contatt)/i;
const JOB_HINT = /(offert|lavor|annunc|job|posizion|candidat|cerca|selezion|assum|vacanc|career|ricerca personale)/i;

/** A newsletter-like e-mail about jobs: not a reply, several links, job words. */
export function looksLikeAlert(e: InboundEmail): boolean {
  if (/^\s*(re|r|aw|sv|rif)\s*:/i.test(e.subject) || e.inReplyTo) return false;
  const links = (e.html ?? e.text).match(/https?:\/\//g)?.length ?? 0;
  return links >= 2 && JOB_HINT.test(`${e.subject}\n${e.text.slice(0, 2000)}`);
}

export function parseGenericAlert(e: InboundEmail): AlertParseResult {
  const jobs: RawJob[] = [];
  const seen = new Set<string>();
  const anchors: { href: string; text: string; after: string }[] = [];
  if (e.html) {
    const root = parse(e.html);
    for (const a of root.querySelectorAll("a")) {
      const href = decodeEntities(a.getAttribute("href") ?? "");
      const next = a.nextElementSibling?.text ?? a.parentNode?.nextElementSibling?.text ?? "";
      anchors.push({ href, text: cleanLine(a.text), after: cleanLine(next) });
    }
  } else {
    const lines = e.text.split(/\r?\n/);
    lines.forEach((l, i) => {
      const m = l.match(/https?:\/\/\S+/);
      if (m) anchors.push({ href: m[0], text: cleanLine(l.replace(m[0], "")) || cleanLine(lines[i - 1] ?? ""), after: cleanLine(lines[i + 1] ?? "") });
    });
  }
  for (const { href, text, after } of anchors) {
    if (!/^https?:\/\//.test(href)) continue;
    const words = text.split(" ").length;
    if (text.length < 5 || text.length > 120 || words > 14 || NOT_A_JOB.test(text) || NOT_A_JOB.test(href)) continue;
    if (/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}\/?$/i.test(text)) continue; // bare domain as text
    const url = canonicalUrl(href);
    if (seen.has(url)) continue;
    seen.add(url);
    const place = findPlace(after.length <= 80 ? after : "");
    jobs.push({
      source: "email:generic",
      url,
      title: text,
      location: place && fold(after).includes(fold(place.name)) ? after : null,
      description: "",
      postedAt: e.date,
      thin: true,
    });
  }
  return { jobs, failures: 0 };
}
