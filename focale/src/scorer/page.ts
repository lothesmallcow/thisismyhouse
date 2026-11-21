/**
 * Reads the signals of a page from its HTML only (no rendering), so the same HTML always gives the
 * same signals. Text inside hidden elements is dropped: keywords hidden from people earn nothing.
 */
import { parse, type HTMLElement } from "node-html-parser";
import type { LinkSignal, PageSignals } from "./types";

const HIDDEN = /display\s*:\s*none|visibility\s*:\s*hidden/i;
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

export function readPage(html: string, finalUrl: string): PageSignals {
  const root = parse(html, { comment: false, blockTextElements: { script: true, style: true, noscript: true, pre: true } });
  const lower = html.toLowerCase();

  // Structured data and vendor scripts, read before anything is removed.
  const jsonLdTypes: string[] = [];
  const jsonLdKeys = new Set<string>();
  const localities: string[] = [];
  let hasAggregateRating = false;
  const vendor: string[] = [];
  for (const s of root.querySelectorAll("script")) {
    const type = (s.getAttribute("type") || "").toLowerCase();
    const src = s.getAttribute("src");
    if (src) vendor.push(src.toLowerCase());
    if (type === "application/ld+json") {
      collectLd(s.text, { types: jsonLdTypes, keys: jsonLdKeys, localities }, () => (hasAggregateRating = true));
    } else if (!src) {
      vendor.push(s.text.slice(0, 4000).toLowerCase());
    }
  }
  for (const f of root.querySelectorAll("iframe")) vendor.push((f.getAttribute("src") || "").toLowerCase());
  for (const l of root.querySelectorAll("link[href]")) vendor.push((l.getAttribute("href") || "").toLowerCase());

  const bannerMatch = lower.match(/(cookie[-_]?(?:banner|bar|notice|consent|hint|alert|popup|modal|law|box|message|dialog|wall)|cookieconsent|cookiehint|consentpolicy|gdpr[-_]?(?:banner|bar|cookie|button|content|popup)|mfn-gdpr|cmp[-_]?banner|cc-(?:banner|window)|[a-z]+-consent-(?:banner|bar|modal))/);
  const consent = {
    banner: bannerMatch ? bannerMatch[1] : null,
    reject: /(rifiut|reject|decline|rejecttext|nega il consenso|solo (?:i |cookie )?(?:tecnici|necessari)|only necessary|deny)/.test(lower),
    consentMode: /gtag\(\s*['"]consent['"]\s*,\s*['"]default['"]/.test(lower),
  };

  const head = root.querySelector("head");
  const title = squash(root.querySelector("title")?.text || "");
  const description = squash(head?.querySelector('meta[name="description" i]')?.getAttribute("content") || root.querySelector('meta[name="description"]')?.getAttribute("content") || "");
  const viewport = (root.querySelector('meta[name="viewport"]')?.getAttribute("content") || "").toLowerCase();
  const lang = root.querySelector("html")?.getAttribute("lang")?.trim() || null;
  const multilingual =
    root.querySelectorAll('link[rel="alternate"][hreflang]').filter((l) => !/x-default/i.test(l.getAttribute("hreflang") || "")).length > 1 ||
    root.querySelectorAll("a[href]").some((a) => /^\/(en|de|fr|es)(\/|$)|[?&]lang=(en|de|fr)/i.test(a.getAttribute("href") || "") || a.getAttribute("hreflang"));

  const body = root.querySelector("body") || root;
  // Hidden or invisible parts do not count as content.
  for (const el of body.querySelectorAll("script, style, noscript, template, svg, [hidden], [aria-hidden=true]")) {
    if (el.tagName === "SVG" || el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "NOSCRIPT" || el.tagName === "TEMPLATE") el.remove();
    else if (el.hasAttribute("hidden")) el.remove();
  }
  for (const el of body.querySelectorAll("[style]")) if (HIDDEN.test(el.getAttribute("style") || "")) el.remove();

  const h1 = body.querySelectorAll("h1").map((h) => squash(h.text)).filter(Boolean);
  const text = squash(body.structuredText.replace(/\n/g, " "));

  // "Early": inside header or nav, or before the first <h2> of the page.
  const firstH2 = lower.indexOf("<h2");
  const early = (el: HTMLElement) => {
    let p: HTMLElement | null = el.parentNode as HTMLElement | null;
    while (p) {
      const t = p.tagName;
      if (t === "HEADER" || t === "NAV") return true;
      p = p.parentNode as HTMLElement | null;
    }
    const at = (el as unknown as { range?: [number, number] }).range?.[0];
    return typeof at === "number" && firstH2 !== -1 && at < firstH2;
  };
  const links: LinkSignal[] = body.querySelectorAll("a[href]").map((a) => ({
    href: (a.getAttribute("href") || "").trim(),
    text: squash(`${a.text} ${a.getAttribute("aria-label") || ""} ${a.getAttribute("title") || ""}`),
    early: early(a),
  }));
  const buttons = body.querySelectorAll("button, [role=button], input[type=submit], input[type=button]").map((b) => squash(`${b.text} ${b.getAttribute("value") || ""} ${b.getAttribute("aria-label") || ""}`));

  // Forms that collect a message or a contact; their field labels, for the health-data flag.
  const forms = body.querySelectorAll("form").filter((f) => f.querySelector('textarea, input[type="email"], input[type="tel"], input[name*="mail" i], input[name*="tel" i]'));
  const fields = forms.flatMap((f) => [
    ...f.querySelectorAll("label").map((l) => squash(l.text)),
    ...f.querySelectorAll("input, textarea, select").map((i) => squash(`${i.getAttribute("name") || ""} ${i.getAttribute("placeholder") || ""} ${i.getAttribute("aria-label") || ""}`)),
  ]).filter(Boolean).map((x) => x.toLowerCase());

  const imgs = body.querySelectorAll("img");
  const withAlt = imgs.filter((i) => i.hasAttribute("alt")).length;

  return {
    finalUrl,
    https: finalUrl.startsWith("https://"),
    lang,
    title,
    description,
    viewport,
    h1,
    text,
    lead: text.slice(0, 600),
    links,
    buttons,
    images: { total: imgs.length, withAlt },
    forms: { count: forms.length, fields },
    jsonLdTypes,
    jsonLdKeys: [...jsonLdKeys].sort(),
    localities,
    hasAggregateRating,
    vendorBlob: vendor.join("\n"),
    multilingual,
    consent,
  };
}

/** Collects every @type, property name and addressLocality in a JSON-LD block, nested ones included. */
function collectLd(raw: string, out: { types: string[]; keys: Set<string>; localities: string[] }, onRating: () => void) {
  const types = out.types;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return;
  }
  const walk = (v: unknown, depth: number) => {
    if (depth > 8 || v === null || typeof v !== "object") return;
    if (Array.isArray(v)) return v.forEach((x) => walk(x, depth + 1));
    const o = v as Record<string, unknown>;
    const t = o["@type"];
    for (const one of Array.isArray(t) ? t : [t]) if (typeof one === "string") types.push(one);
    if (t === "AggregateRating" || o.aggregateRating) onRating();
    if (typeof o.addressLocality === "string") out.localities.push(o.addressLocality.trim());
    for (const k of Object.keys(o)) {
      if (!k.startsWith("@")) out.keys.add(k);
      if (k !== "@type") walk(o[k], depth + 1);
    }
  };
  walk(data, 0);
}
