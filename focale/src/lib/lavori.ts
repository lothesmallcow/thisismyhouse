import type { CollectionEntry } from "astro:content";

/**
 * A project in "Lavori" is either a real client's site, online at `url` (Casa Turati 3), or a demo
 * built for an invented business, served by this site at /lavori/<slug>/demo/. Every place that
 * shows a project words it from here, so a real site is never called "dimostrativo" and a demo is
 * never passed off as a client.
 */
type Lavoro = CollectionEntry<"lavori">;

export const isReal = (l: Lavoro) => Boolean(l.data.url);
export const siteHref = (l: Lavoro) => l.data.url ?? `/lavori/${l.id}/demo/`;
export const kindLabel = (l: Lavoro) => (isReal(l) ? "Sito online per un cliente" : "Progetto dimostrativo per un'attività inventata");
export const siteAlt = (l: Lavoro) => `${isReal(l) ? "Il sito" : "Il sito dimostrativo"} di ${l.data.name}`;
