// InfoJobs Italia job-alert e-mails. STATUS: synthetic fixtures, needs real samples.
import type { InboundEmail } from "../mail/types";
import { cardsFromHtml, cardsFromText, cardToRawJob, type AlertParseResult } from "./common";

export const INFOJOBS_JOB_HREF = /infojobs\.it\/[^"\s]*\/of-[a-z0-9]{6,}/i;

export function isInfoJobsAlert(e: InboundEmail): boolean {
  return /infojobs\.(it|net)$/.test(e.from.address.split("@")[1] ?? "") || INFOJOBS_JOB_HREF.test(e.html ?? e.text);
}

export function parseInfoJobsAlert(e: InboundEmail): AlertParseResult {
  if (e.html) {
    const { cards, failures } = cardsFromHtml(e.html, (h) => INFOJOBS_JOB_HREF.test(h));
    if (cards.length) return { jobs: cards.map((c) => cardToRawJob(c, "email:infojobs", e.date)), failures };
  }
  const cards = cardsFromText(e.text, /https?:\/\/\S*infojobs\.it\/\S*\/of-\S+/i);
  return { jobs: cards.map((c) => cardToRawJob(c, "email:infojobs", e.date)), failures: 0 };
}
