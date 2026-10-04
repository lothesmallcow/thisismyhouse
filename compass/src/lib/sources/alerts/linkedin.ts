// LinkedIn job-alert e-mails ("Nuove offerte di lavoro per ...").
// STATUS: built against synthetic fixtures. Needs real samples (see fixtures/emails/README.md).
import type { InboundEmail } from "../mail/types";
import { cardsFromHtml, cardsFromText, cardToRawJob, type AlertParseResult } from "./common";

export const LINKEDIN_JOB_HREF = /linkedin\.com\/(?:comm\/)?jobs\/view\/(?:[^/?"]*-)?\d{6,}/i;

export function isLinkedInAlert(e: InboundEmail): boolean {
  return /linkedin\.com$/.test(e.from.address.split("@")[1] ?? "") || LINKEDIN_JOB_HREF.test(e.html ?? e.text);
}

export function parseLinkedInAlert(e: InboundEmail): AlertParseResult {
  if (e.html) {
    const { cards, failures } = cardsFromHtml(e.html, (h) => LINKEDIN_JOB_HREF.test(h));
    if (cards.length) return { jobs: cards.map((c) => cardToRawJob(c, "email:linkedin", e.date)), failures };
  }
  const cards = cardsFromText(e.text, /https?:\/\/\S*linkedin\.com\/(?:comm\/)?jobs\/view\/\S+/i);
  return { jobs: cards.map((c) => cardToRawJob(c, "email:linkedin", e.date)), failures: 0 };
}
