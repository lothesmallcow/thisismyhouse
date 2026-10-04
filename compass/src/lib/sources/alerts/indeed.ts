// Indeed job-alert e-mails. STATUS: synthetic fixtures, needs real samples.
import type { InboundEmail } from "../mail/types";
import { cardsFromHtml, cardsFromText, cardToRawJob, type AlertParseResult } from "./common";

export const INDEED_JOB_HREF = /indeed\.[a-z.]+\/(?:rc\/clk|viewjob|pagead\/clk|applystart)[^"\s]*[?&](?:jk|vjk)=/i;

export function isIndeedAlert(e: InboundEmail): boolean {
  return /indeed\.[a-z.]+$/.test(e.from.address.split("@")[1] ?? "") || INDEED_JOB_HREF.test(e.html ?? e.text);
}

export function parseIndeedAlert(e: InboundEmail): AlertParseResult {
  if (e.html) {
    const { cards, failures } = cardsFromHtml(e.html, (h) => INDEED_JOB_HREF.test(h));
    if (cards.length) return { jobs: cards.map((c) => cardToRawJob(c, "email:indeed", e.date)), failures };
  }
  const cards = cardsFromText(e.text, /https?:\/\/\S*indeed\.[a-z.]+\/\S*[?&](?:jk|vjk)=\S+/i);
  return { jobs: cards.map((c) => cardToRawJob(c, "email:indeed", e.date)), failures: 0 };
}
