import { getCollection } from "astro:content";

export interface OgPage {
  key: string;
  title: string;
  kicker?: string;
}

/** Turn a pathname into the key of its social preview image. */
export function ogKey(pathname: string): string {
  const clean = pathname.replace(/^\/|\/$/g, "");
  return clean === "" ? "home" : clean.replace(/\//g, "-");
}

const STATIC: OgPage[] = [
  { key: "home", title: "Siti che fanno squillare il telefono." },
  { key: "come-funziona", title: "Come funziona" },
  { key: "prezzi", title: "Quanto costa un sito che porta richieste." },
  { key: "lavori", title: "Lavori" },
  { key: "chi-sono", title: "Lo studio" },
  { key: "anteprima-gratuita", title: "Ricevi l'anteprima del tuo nuovo sito. Gratis, in 72 ore." },
  { key: "contatti", title: "Scrivici. Ti rispondiamo in giornata." },
  { key: "condizioni", title: "Condizioni del servizio" },
  { key: "privacy", title: "Informativa privacy" },
  { key: "cookie", title: "Cookie" },
];

export async function ogPages(): Promise<OgPage[]> {
  const settori = await getCollection("settori");
  const lavori = await getCollection("lavori");
  return [
    ...STATIC,
    ...settori.map((s) => ({ key: `per-${s.id}`, title: s.data.h1 })),
    ...lavori.map((l) => ({ key: `lavori-${l.id}`, title: `${l.data.name}: progetto dimostrativo`, kicker: l.data.sector })),
  ];
}
