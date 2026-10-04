// Manual add with only a link: read what the URL itself says. The page is never fetched
// (fetching a pasted LinkedIn/Indeed/InfoJobs link would be a W3 request).

import { findPlace } from "./geo";

export interface UrlGuess {
  title: string | null;
  company: string | null;
  city: string | null;
  platform: "linkedin" | "indeed" | "infojobs" | "other" | null;
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const words = (slug: string) => decodeURIComponent(slug).replace(/[-_+]+/g, " ").replace(/\s+/g, " ").trim();

export function guessFromUrl(raw: string): UrlGuess {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return { title: null, company: null, city: null, platform: null };
  }
  const host = u.hostname.replace(/^www\.|^it\./, "");
  const parts = u.pathname.split("/").filter(Boolean);
  if (host.endsWith("linkedin.com")) {
    // /jobs/view/impiegata-amministrativa-at-rossi-srl-4012345601
    const slug = parts[parts.indexOf("view") + 1] ?? "";
    const m = slug.match(/^(.*?)-at-(.*?)-\d{6,}$/);
    if (m) return { title: cap(words(m[1])), company: cap(words(m[2])), city: null, platform: "linkedin" };
    return { title: null, company: null, city: null, platform: "linkedin" };
  }
  if (host.endsWith("infojobs.it")) {
    // /torino/impiegata-contabile/of-i8b2c...
    const [city, slug] = parts;
    return { title: slug && !slug.startsWith("of-") ? cap(words(slug)) : null, company: null, city: city ? (findPlace(words(city))?.name ?? null) : null, platform: "infojobs" };
  }
  if (host.includes("indeed.")) return { title: null, company: null, city: null, platform: "indeed" };
  const last = parts.filter((p) => !/^\d+$/.test(p) && !/^(jobs?|lavora-con-noi|offerte?|careers?|posizioni|annunci)$/i.test(p)).pop();
  return { title: last && /[a-z]-[a-z]/i.test(last) ? cap(words(last.replace(/\.\w+$/, ""))) : null, company: null, city: null, platform: "other" };
}
