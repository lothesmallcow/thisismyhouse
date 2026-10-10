import { site } from "../config/site";
import { absUrl, isPlaceholder, siteUrl } from "./util";

type Json = Record<string, unknown>;

/** Drop any property whose value is still a placeholder (or empty). */
export function clean<T extends Json>(obj: T): T {
  const out: Json = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "" || isPlaceholder(v)) continue;
    if (Array.isArray(v)) out[k] = v.map((x) => (x && typeof x === "object" ? clean(x as Json) : x));
    else if (typeof v === "object") out[k] = clean(v as Json);
    else out[k] = v;
  }
  return out as T;
}

export function professionalService(): Json {
  return clean({
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: site.brand,
    url: siteUrl() + "/",
    description: "Siti web per piccole imprese che vogliono più richieste.",
    areaServed: { "@type": "AdministrativeArea", name: "Lombardia" },
    priceRange: "€€",
    telephone: site.phoneE164,
    email: site.email,
    image: absUrl("/og/home.png"),
    logo: absUrl("/icon-512.png"),
    founder: clean({ "@type": "Person", name: site.ownerFullName }),
  });
}

export function faqPage(items: { q: string; a: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
}

export function breadcrumbs(items: { name: string; path: string }[]): Json {
  const all = [{ name: "Home", path: "/" }, ...items];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absUrl(it.path),
    })),
  };
}
