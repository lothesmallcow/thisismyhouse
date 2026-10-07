// Any link to an offer or a careers board, read as the employer's board it belongs to: from one
// offer found anywhere (a web result, an alert, a careers page) to every offer that employer
// publishes. "boards.greenhouse.io/point72/jobs/123" → Greenhouse board "point72";
// "barclays.wd3.myworkdayjobs.com/en-US/External_Career_Site/job/London/Analyst_123" → Workday
// "barclays.wd3.myworkdayjobs.com/External_Career_Site".
import type { AtsType } from "./index";

export interface Feed {
  ats: AtsType;
  slug: string;
}

/** Hosts of the boards Compass can read, for searches limited to them. */
export const FEED_DOMAINS = [
  "myworkdayjobs.com",
  "oraclecloud.com",
  "boards.greenhouse.io",
  "job-boards.greenhouse.io",
  "jobs.lever.co",
  "jobs.ashbyhq.com",
  "jobs.smartrecruiters.com",
  "apply.workable.com",
  "jobs.personio.de",
  "recruitee.com",
  "avature.net",
];

const NOT_SLUG = /^(?:embed|api|v\d|j|jobs?|careers?|www|search|en|it|de|fr|en-us|en-gb|it-it|de-de|fr-fr|o|apply|login|sitemap\.xml)$/i;
const LOCALE = /^[a-z]{2}(?:-[a-z]{2})?$/i;

export function feedFromUrl(raw: string): Feed | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const parts = u.pathname.split("/").filter(Boolean).map((p) => decodeURIComponent(p));
  const first = parts[0] ?? "";
  const ok = (s: string | undefined) => (s && !NOT_SLUG.test(s) ? s : null);

  // Workday: <tenant>.wd<N>.myworkdayjobs.com/[<locale>/]<site>/...
  if (/\.myworkdayjobs\.com$/.test(host) || /\.myworkdaysite\.com$/.test(host)) {
    const site = LOCALE.test(first) ? parts[1] : first;
    return site && !/^(?:wday|job|details)$/i.test(site) ? { ats: "workday", slug: `${host}/${site}` } : null;
  }
  // Oracle Recruiting Cloud: <x>.fa.<region>.oraclecloud.com/hcmUI/CandidateExperience/<lang>/sites/<site>/...
  if (/\.oraclecloud\.com$/.test(host)) {
    const i = parts.findIndex((p) => p.toLowerCase() === "sites");
    const site = i >= 0 ? parts[i + 1] : null;
    return site ? { ats: "oracle", slug: `${host}/${site}` } : null;
  }
  // Eightfold (<x>.eightfold.ai) is not learned from links: its public endpoint answers 404/403 to
  // anyone but the page itself. A board added by hand is still tried.
  // Avature: [<locale>/]<portal>/JobDetail/<title>/<id> or …/SearchJobs, on *.avature.net or the
  // employer's own domain (careers.unicredit.eu/jobsuche/JobDetail/…).
  {
    const i = parts.findIndex((p) => /^(?:JobDetail|SearchJobs)$/.test(p));
    const portal = i > 0 ? parts[i - 1] : null;
    if (portal && !/^[a-z]{2}_[A-Z]{2}$/.test(portal) && (i === 1 || (i === 2 && /^[a-z]{2}_[A-Z]{2}$/.test(parts[0])))) return { ats: "avature", slug: `${host}/${portal}` };
  }
  if (/(^|\.)(boards|job-boards)\.greenhouse\.io$/.test(host)) {
    const s = first === "embed" ? u.searchParams.get("for") : ok(first);
    return s ? { ats: "greenhouse", slug: s } : null;
  }
  if (host === "boards-api.greenhouse.io") {
    const i = parts.indexOf("boards");
    return i >= 0 && parts[i + 1] ? { ats: "greenhouse", slug: parts[i + 1] } : null;
  }
  if (host === "jobs.lever.co" || host === "jobs.eu.lever.co") return ok(first) ? { ats: "lever", slug: first } : null;
  if (host === "jobs.ashbyhq.com") return ok(first) ? { ats: "ashby", slug: first } : null;
  if (host === "jobs.smartrecruiters.com" || host === "careers.smartrecruiters.com") return ok(first) ? { ats: "smartrecruiters", slug: first } : null;
  if (host === "apply.workable.com") return ok(first) ? { ats: "workable", slug: first } : null;
  const personio = host.match(/^([a-z0-9-]+)\.jobs\.personio\.(?:de|com)$/);
  if (personio) return { ats: "personio", slug: personio[1] };
  const recruitee = host.match(/^([a-z0-9-]+)\.recruitee\.com$/);
  if (recruitee && !NOT_SLUG.test(recruitee[1])) return { ats: "recruitee", slug: recruitee[1] };
  return null;
}

/** The boards a page links to or embeds (links, iframes, scripts), each once. */
export function feedsInHtml(html: string): Feed[] {
  const out = new Map<string, Feed>();
  for (const m of html.matchAll(/https?:\/\/[^\s"'<>)]+/g)) {
    const f = feedFromUrl(m[0].replace(/&amp;/g, "&"));
    if (f) out.set(`${f.ats}:${f.slug.toLowerCase()}`, f);
  }
  // Greenhouse's embed script: "boards.greenhouse.io/embed/job_board/js?for=<slug>"
  for (const m of html.matchAll(/greenhouse\.io\/embed\/job_board(?:\/js)?\?for=([a-z0-9_-]+)/gi)) out.set(`greenhouse:${m[1].toLowerCase()}`, { ats: "greenhouse", slug: m[1] });
  return [...out.values()];
}
