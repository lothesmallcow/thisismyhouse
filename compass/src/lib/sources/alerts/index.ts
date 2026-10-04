// Router: pick the parser for each alert e-mail. A known template that yields nothing counts
// as a parse failure (the template probably changed) and the generic fallback runs instead.
import type { SourceKind } from "../../core/normalize";
import type { InboundEmail } from "../mail/types";
import type { AlertParseResult } from "./common";
import { looksLikeAlert, parseGenericAlert } from "./generic";
import { isIndeedAlert, parseIndeedAlert } from "./indeed";
import { isInfoJobsAlert, parseInfoJobsAlert } from "./infojobs";
import { isLinkedInAlert, parseLinkedInAlert } from "./linkedin";

export interface RoutedResult extends AlertParseResult {
  parser: SourceKind;
  /** True when a platform template was recognized but produced no jobs. */
  templateBroken: boolean;
}

const PARSERS: { kind: SourceKind; is: (e: InboundEmail) => boolean; parse: (e: InboundEmail) => AlertParseResult }[] = [
  { kind: "email:linkedin", is: isLinkedInAlert, parse: parseLinkedInAlert },
  { kind: "email:indeed", is: isIndeedAlert, parse: parseIndeedAlert },
  { kind: "email:infojobs", is: isInfoJobsAlert, parse: parseInfoJobsAlert },
];

export function isJobAlert(e: InboundEmail): boolean {
  return PARSERS.some((p) => p.is(e)) || looksLikeAlert(e);
}

export function parseAlert(e: InboundEmail): RoutedResult {
  for (const p of PARSERS) {
    if (!p.is(e)) continue;
    const r = p.parse(e);
    if (r.jobs.length > 0) return { ...r, parser: p.kind, templateBroken: false };
    const g = parseGenericAlert(e);
    return { ...g, failures: r.failures + 1, parser: p.kind, templateBroken: true };
  }
  return { ...parseGenericAlert(e), parser: "email:generic", templateBroken: false };
}
