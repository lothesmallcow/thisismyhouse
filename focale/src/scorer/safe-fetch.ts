/**
 * Fetches a page from a URL typed by a stranger without letting it reach anything private (SSRF).
 * Rules: http or https only, ports 80 and 443 only, no credentials in the URL, no IP literals or
 * local names, every resolved address public (IPv4 and IPv6, mapped forms included), redirects
 * followed by hand and checked again at every hop (at most 4), a time limit and a size limit.
 * Resolution is injected: DNS over HTTPS in Cloudflare Workers, the OS resolver in Node.
 * Remaining risk: between our check and the fetch, DNS could change (rebinding); Workers run on
 * Cloudflare's edge, which cannot reach a private network anyway, so the check is defence in depth.
 */

export class ScorerError extends Error {
  constructor(public code: "url" | "blocked" | "unreachable" | "not-html" | "too-slow" | "status" | "social" | "empty", message: string) {
    super(message);
  }
}

export type Resolver = (host: string) => Promise<string[]>;

export interface FetchedPage {
  finalUrl: string;
  status: number;
  html: string;
  truncated: boolean;
}

const LOCAL_SUFFIX = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|private|test|invalid|example|onion)$/i;

/** Accepts what people type ("studio.it", "www.studio.it/pagina") and returns a clean URL or throws. */
export function normalizeUrl(raw: string): URL {
  let s = String(raw || "").trim();
  if (!s) throw new ScorerError("url", "Scrivi l'indirizzo del sito.");
  if (s.length > 2000) throw new ScorerError("url", "Questo indirizzo è troppo lungo.");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new ScorerError("url", "Questo non sembra l'indirizzo di un sito.");
  }
  checkUrlShape(u);
  if (SOCIAL.test(u.hostname)) throw new ScorerError("social", "Questo è un profilo social o una pagina di link, non un sito tuo: il punteggio non avrebbe senso. Se il sito non c'è ancora, è proprio quello che possiamo fare.");
  u.hash = "";
  return u;
}

/** Profiles and link pages: not a site of one's own, so there is nothing fair to score. */
const SOCIAL = /(^|\.)(instagram\.com|facebook\.com|fb\.com|tiktok\.com|linktr\.ee|linkin\.bio|beacons\.ai|business\.site|x\.com|twitter\.com|linkedin\.com|youtube\.com|wa\.me|t\.me|booking\.com|airbnb\.[a-z.]+|tripadvisor\.[a-z.]+|thefork\.[a-z.]+|miodottore\.it|treatwell\.it|google\.com|maps\.app\.goo\.gl|g\.page)$/i;

function checkUrlShape(u: URL) {
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new ScorerError("url", "Funziona solo con indirizzi http o https.");
  if (u.username || u.password) throw new ScorerError("blocked", "Indirizzo non ammesso.");
  if (u.port && u.port !== "80" && u.port !== "443") throw new ScorerError("blocked", "Indirizzo non ammesso.");
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (isIpLiteral(host)) throw new ScorerError("blocked", "Scrivi il nome del sito, non un indirizzo numerico.");
  if (!host.includes(".") || LOCAL_SUFFIX.test(host)) throw new ScorerError("blocked", "Questo indirizzo non è un sito pubblico.");
}

export function isIpLiteral(host: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || /^0x[0-9a-f]+$/i.test(host) || /^\d+$/.test(host);
}

/** True for every address that is not plainly public on the internet. */
export function isPrivateIp(ip: string): boolean {
  const v = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) {
    const [a, b] = v.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0)
    );
  }
  if (v.includes(":")) {
    const mapped = v.match(/^(?:::ffff:|64:ff9b::)(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (mapped) return isPrivateIp(mapped[1]);
    if (v === "::" || v === "::1") return true;
    if (/^::ffff:/.test(v) || /^64:ff9b:/.test(v)) return true;
    const first = parseInt(v.split(":")[0] || "0", 16);
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
    if ((first & 0xff00) === 0xff00) return true; // multicast
    if (v.startsWith("2001:db8") || v.startsWith("100::")) return true;
    return false;
  }
  return true;
}

/** DNS over HTTPS (Cloudflare), for Workers where there is no resolver API. */
export const dohResolver =
  (fetchImpl: typeof fetch = fetch): Resolver =>
  async (host) => {
    const out: string[] = [];
    for (const type of ["A", "AAAA"]) {
      const r = await fetchImpl(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, { headers: { accept: "application/dns-json" } });
      if (!r.ok) continue;
      const j = (await r.json()) as { Answer?: { type: number; data: string }[] };
      for (const a of j.Answer ?? []) if (a.type === 1 || a.type === 28) out.push(a.data);
    }
    return out;
  };

export async function safeFetch(
  raw: string,
  opts: { resolve: Resolver; fetchImpl?: typeof fetch; maxBytes?: number; timeoutMs?: number; maxRedirects?: number; userAgent?: string },
): Promise<FetchedPage> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const maxBytes = opts.maxBytes ?? 1_500_000;
  const deadline = Date.now() + (opts.timeoutMs ?? 10_000);
  let url = normalizeUrl(raw);

  for (let hop = 0; hop <= (opts.maxRedirects ?? 4); hop++) {
    checkUrlShape(url);
    const ips = await opts.resolve(url.hostname);
    if (!ips.length) throw new ScorerError("unreachable", "Non troviamo questo sito: controlla l'indirizzo.");
    if (ips.some(isPrivateIp)) throw new ScorerError("blocked", "Questo indirizzo non è un sito pubblico.");

    const ctl = new AbortController();
    const left = deadline - Date.now();
    if (left <= 0) throw new ScorerError("too-slow", "Il sito ci ha messo troppo a rispondere.");
    const timer = setTimeout(() => ctl.abort(), left);
    let res: Response;
    try {
      res = await fetchImpl(url.toString(), {
        redirect: "manual",
        signal: ctl.signal,
        headers: { "user-agent": opts.userAgent ?? "FocusDesignScorer/1.0 (+https://focusdesign.it/analisi-sito/)", accept: "text/html,application/xhtml+xml" },
      });
    } catch (e) {
      clearTimeout(timer);
      throw ctl.signal.aborted ? new ScorerError("too-slow", "Il sito ci ha messo troppo a rispondere.") : new ScorerError("unreachable", "Non riusciamo a raggiungere il sito.");
    }

    if (res.status >= 300 && res.status < 400) {
      clearTimeout(timer);
      const loc = res.headers.get("location");
      if (!loc) throw new ScorerError("status", "Il sito rimanda altrove senza dire dove.");
      url = new URL(loc, url);
      continue;
    }
    if (res.status >= 400) {
      clearTimeout(timer);
      throw new ScorerError("status", `Il sito risponde con un errore (${res.status}).`);
    }
    const type = res.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(type)) {
      clearTimeout(timer);
      throw new ScorerError("not-html", "Questo indirizzo non porta a una pagina web.");
    }
    const { text, truncated } = await readCapped(res, maxBytes);
    clearTimeout(timer);
    return { finalUrl: url.toString(), status: res.status, html: text, truncated };
  }
  throw new ScorerError("status", "Il sito rimanda da una pagina all'altra troppe volte.");
}

async function readCapped(res: Response, maxBytes: number) {
  if (!res.body) return { text: "", truncated: false };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
    if (size >= maxBytes) {
      truncated = true;
      await reader.cancel();
      break;
    }
  }
  const all = new Uint8Array(Math.min(size, maxBytes));
  let o = 0;
  for (const c of chunks) {
    const take = Math.min(c.byteLength, all.length - o);
    all.set(c.subarray(0, take), o);
    o += take;
    if (o >= all.length) break;
  }
  return { text: new TextDecoder("utf-8", { fatal: false }).decode(all), truncated };
}
