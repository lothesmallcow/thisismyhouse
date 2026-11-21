import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CHECKS } from "../../src/scorer/checks";
import { readPage } from "../../src/scorer/page";
import { rubric } from "../../src/scorer/analyze";
import { resolveRubric } from "../../src/scorer/sectors";
import type { PerfData, RubricCheck, SectorId } from "../../src/scorer/types";

const fixture = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8");
const page = (body: string, head = "", url = "https://studio.example.it/") => readPage(`<!doctype html><html lang="it"><head>${head}</head><body>${body}</body></html>`, url);
const rule = (id: string, sector: SectorId = "fitness") => {
  const r = resolveRubric(rubric, sector);
  return { r: (r.checks.find((c) => c.id === id) ?? { ...rubric.checks.find((c) => c.id === id)!, points: 0 }) as RubricCheck, s: r.sector };
};
const run = (id: string, p = page(""), perf: PerfData | null = null, sector: SectorId = "fitness") => {
  const { r, s } = rule(id, sector);
  return CHECKS[id](p, perf, r, s).status;
};

const lab = (o: Partial<PerfData>): PerfData => ({ source: "lab", ...o });
const real = (o: Partial<PerfData>): PerfData => ({ source: "field", ...o });

describe("speed", () => {
  it("lcp: bands on real-user data, unmeasured without data", () => {
    expect(run("speed.lcp", page(""), real({ lcpMs: 2100 }))).toBe("pass");
    expect(run("speed.lcp", page(""), lab({ lcpMs: 3500 }))).toBe("partial");
    expect(run("speed.lcp", page(""), lab({ lcpMs: 6000 }))).toBe("fail");
    expect(run("speed.lcp", page(""), null)).toBe("unmeasured");
  });
  it("interaction: INP when real data exists, TBT bands otherwise", () => {
    expect(run("speed.interaction", page(""), real({ inpMs: 150, tbtMs: 900 }))).toBe("pass");
    expect(run("speed.interaction", page(""), lab({ tbtMs: 150 }))).toBe("pass");
    expect(run("speed.interaction", page(""), lab({ tbtMs: 450 }))).toBe("partial");
    expect(run("speed.interaction", page(""), lab({ tbtMs: 1200 }))).toBe("fail");
  });
  it("cls and weight", () => {
    expect(run("speed.cls", page(""), lab({ cls: 0.02 }))).toBe("pass");
    expect(run("speed.cls", page(""), lab({ cls: 0.4 }))).toBe("fail");
    expect(run("speed.weight", page(""), lab({ bytes: 1_200_000 }))).toBe("pass");
    expect(run("speed.weight", page(""), lab({ bytes: 4_000_000 }))).toBe("partial");
    expect(run("speed.weight", page(""), lab({ bytes: 9_000_000 }))).toBe("fail");
  });
  it("viewport", () => {
    expect(run("mobile.viewport", page("", '<meta name="viewport" content="width=device-width, initial-scale=1">'))).toBe("pass");
    expect(run("mobile.viewport", page(""))).toBe("fail");
  });
});

describe("booking", () => {
  it("online booking: platform link, booking word, or nothing", () => {
    expect(run("conv.primary", page('<a href="https://x.goteamup.com/s">Calendario</a>'))).toBe("pass");
    expect(run("conv.primary", page('<a href="/contatti">Prenota la tua lezione</a>'))).toBe("pass");
    expect(run("conv.primary", page('<a href="/contatti">Contatti</a>'))).toBe("partial");
    expect(run("conv.primary", page('<a href="/chi-siamo">Chi siamo</a>'))).toBe("fail");
    expect(run("conv.primary", page('<a href="tel:+39021234">Prenota al telefono</a>'))).toBe("fail");
  });
  it("early: in header or before the first h2", () => {
    expect(run("conv.early", page('<header><a href="https://wa.me/39333">Scrivici</a></header><h2>x</h2>'))).toBe("pass");
    expect(run("conv.early", page('<h1>Studio</h1><a href="/prenota">Prenota</a><h2>Corsi</h2>'))).toBe("pass");
    expect(run("conv.early", page('<h1>Studio</h1><h2>Corsi</h2><a href="/prenota">Prenota</a>'))).toBe("fail");
  });
  it("trial offer, tel, whatsapp", () => {
    expect(run("conv.offer", page("<p>Prima lezione gratuita per chi è nuovo</p>"))).toBe("pass");
    expect(run("conv.offer", page("<p>Corsi per tutti</p>"))).toBe("fail");
    expect(run("contact.tel", page('<a href="tel:+390212345">Chiama</a>'))).toBe("pass");
    expect(run("contact.tel", page("<p>Tel 02 12345</p>"))).toBe("fail");
    expect(run("contact.whatsapp", page('<a href="https://api.whatsapp.com/send?phone=39333">WA</a>'))).toBe("pass");
    expect(run("contact.whatsapp", page('<a href="/whatsapp-info">info</a>'))).toBe("fail");
  });
  it("schedule and prices", () => {
    expect(run("info.hours", page("<h2>Orari</h2><p>Lunedì 18:30</p>"))).toBe("pass");
    expect(run("info.hours", page('<a href="/calendario/">Vedi le lezioni</a><p>Lunedì 9:00</p>'))).toBe("pass");
    expect(run("info.hours", page('<a href="/calendario/">Vedi le lezioni</a>'))).toBe("partial");
    expect(run("info.hours", page("<p>Lezioni tutti i giorni</p>"))).toBe("fail");
    expect(run("info.prices", page("<p>Abbonamento mensile 89 €</p>"))).toBe("pass");
    expect(run("info.prices", page('<a href="/abbonamenti">Abbonamenti</a>'))).toBe("pass");
    expect(run("info.prices", page("<p>Chiedi in segreteria</p>"))).toBe("fail");
  });
});

describe("local", () => {
  it("title and description", () => {
    expect(run("seo.title", page("", "<title>Yoga a Milano Navigli | Studio Om</title>"))).toBe("pass");
    expect(run("seo.title", page("", "<title>Home</title>"))).toBe("partial");
    expect(run("seo.title", page(""))).toBe("fail");
    expect(run("seo.description", page("", `<meta name="description" content="${"Lezioni di yoga per tutti i livelli a Milano Navigli, ".repeat(2)}">`))).toBe("pass");
    expect(run("seo.description", page("", '<meta name="description" content="Yoga">'))).toBe("partial");
    expect(run("seo.description", page(""))).toBe("fail");
  });
  it("schema, address, maps", () => {
    expect(run("local.schema", page("", '<script type="application/ld+json">{"@graph":[{"@type":"ExerciseGym"}]}</script>'))).toBe("pass");
    expect(run("local.schema", page("", '<script type="application/ld+json">{"@type":"WebSite"}</script>'))).toBe("partial");
    expect(run("local.schema", page(""))).toBe("fail");
    expect(run("local.address", page("<p>Via Tortona 33, Milano</p>"))).toBe("pass");
    expect(run("local.address", page("<p>Siamo a Milano</p>"))).toBe("fail");
    expect(run("local.address", page("<p>Località Cà Bianca 4, 27040 Montalto Pavese</p>"))).toBe("pass");
    expect(run("local.schema", page("", '<script type="application/ld+json">{"@type":"LocalBusiness"}</script>'))).toBe("partial");
    expect(run("local.maps", page('<a href="https://maps.app.goo.gl/x">Mappa</a>'))).toBe("pass");
    expect(run("local.maps", page('<a href="/dove">Dove</a>'))).toBe("fail");
  });
});

describe("trust", () => {
  it("https, reviews, team", () => {
    expect(run("trust.https", page("", "", "https://a.it/"))).toBe("pass");
    expect(run("trust.https", page("", "", "http://a.it/"))).toBe("fail");
    expect(run("trust.reviews", page("", '<script type="application/ld+json">{"@type":"LocalBusiness","aggregateRating":{"@type":"AggregateRating","ratingValue":4.9}}</script>'))).toBe("partial");
    expect(run("trust.reviews", page('<script src="https://static.elfsight.com/platform.js"></script>'))).toBe("pass");
    expect(run("trust.reviews", page("<p>Leggi le recensioni dei clienti</p>"))).toBe("partial");
    expect(run("trust.reviews", page("<p>Benvenuti</p>"))).toBe("fail");
    expect(run("trust.team", page("<h2>Le nostre istruttrici</h2>"))).toBe("pass");
    expect(run("trust.team", page("<h2>Corsi</h2>"))).toBe("fail");
  });
});

describe("accessibility", () => {
  it("lighthouse bands", () => {
    expect(run("a11y.lighthouse", page(""), lab({ a11y: 0.96 }))).toBe("pass");
    expect(run("a11y.lighthouse", page(""), lab({ a11y: 0.8 }))).toBe("partial");
    expect(run("a11y.lighthouse", page(""), lab({ a11y: 0.5 }))).toBe("fail");
  });
});

describe("legal", () => {
  it("privacy link", () => {
    expect(run("legal.privacy", page('<a href="https://www.iubenda.com/privacy-policy/123">Informativa</a>'))).toBe("pass");
    expect(run("legal.privacy", page('<a href="/contatti">Contatti</a>'))).toBe("fail");
  });
  it("cookies: no trackers is fine, trackers need a consent tool, explicit reject earns full", () => {
    expect(run("legal.cookie", page("<p>ciao</p>"))).toBe("pass");
    expect(run("legal.cookie", page("", '<script src="https://www.googletagmanager.com/gtag/js"></script>'))).toBe("fail");
    expect(run("legal.cookie", page("", '<script src="https://www.googletagmanager.com/gtag/js"></script><script src="https://consent.cookiebot.com/uc.js"></script>'))).toBe("partial");
    expect(run("legal.cookie", page("", '<script>var _iub={csConfiguration:{"rejectButtonDisplay":true}}</script><script src="https://cdn.iubenda.com/cs/iubenda_cs.js"></script>'))).toBe("pass");
  });
  it("VAT is a flag, never points", () => {
    expect(run("legal.vat", page("<footer>P.IVA 01234567890</footer>"))).toBe("flag-ok");
    expect(run("legal.vat", page("<footer>Studio</footer>"))).toBe("flag-warn");
    expect(rule("legal.vat").r.points).toBe(0);
  });
});

describe("content", () => {
  it("h1 and what+where", () => {
    expect(run("content.h1", page("<h1>Pilates a Milano</h1>"))).toBe("pass");
    expect(run("content.h1", page("<h1>Benvenuti nel nostro studio</h1>"))).toBe("partial");
    expect(run("content.h1", page("<p>x</p>"))).toBe("fail");
    expect(run("content.whatwhere", page("<h1>Yoga a Milano Isola</h1>"))).toBe("pass");
    expect(run("content.whatwhere", page("<h1>Yoga per tutti</h1>"))).toBe("partial");
    expect(run("content.whatwhere", page("<h1>Benvenuti</h1>"))).toBe("fail");
  });
});

describe("no gaming", () => {
  it("text hidden with display:none earns nothing", () => {
    const p = readPage(fixture("old-studio.html"), "https://old.example.it/");
    expect(run("conv.offer", p)).toBe("fail");
    expect(run("info.hours", p)).toBe("fail");
    expect(run("content.whatwhere", p)).toBe("fail");
  });
  it("repeating a keyword does not add points", () => {
    const once = page("<h1>Pilates a Milano</h1>");
    const many = page(`<h1>Pilates a Milano ${"pilates milano ".repeat(50)}</h1>`);
    for (const sector of rubric.sectors.map((x) => x.id))
      for (const c of resolveRubric(rubric, sector).checks) if (c.category !== "speed" && c.id !== "a11y.lighthouse") expect(run(c.id, many, null, sector), `${sector} ${c.id}`).toBe(run(c.id, once, null, sector));
  });
});

describe("bugs found by the sector review", () => {
  it("a Contatti page is not the main action", () => {
    for (const sec of ["edilizia", "salute", "professionisti", "immobiliare", "eventi", "altro"] as SectorId[]) {
      expect(run("conv.primary", page('<a href="/contatti/">Contatti</a>'), null, sec), sec).toBe("partial");
      expect(run("conv.primary", page('<a href="/contatti/">Contattaci</a>'), null, sec), sec).toBe("partial");
    }
  });
  it("an OTA or an aggregator link never earns full points, whatever its text", () => {
    expect(run("conv.primary", page('<a href="https://www.booking.com/hotel/it/x.html">Prenota su Booking.com</a>'), null, "ospitalita")).toBe("partial");
    expect(run("conv.primary", page('<a href="https://www.classpass.com/studios/x">Prenota</a>'), null, "fitness")).toBe("partial");
    expect(run("conv.primary", page('<a href="https://www.booking.com/x">Booking</a><a href="/prenota/">Prenota diretto</a>'), null, "ospitalita")).toBe("pass");
  });
  it("a jQuery toast plugin is not a restaurant booking system", () => {
    expect(run("conv.primary", page('<script src="/js/jquery.toast.min.js"></script>'), null, "ristorazione")).toBe("fail");
  });
  it("the navigation word Menu is not a menu", () => {
    expect(run("info.menu", page('<a href="#">Menu</a><p>Benvenuti</p>'), null, "ristorazione")).toBe("fail");
    expect(run("info.menu", page('<a href="/menu/">Il menu</a>'), null, "ristorazione")).toBe("pass");
  });
  it("Ordine degli Psicologi counts as a credential", () => {
    expect(run("trust.credentials", page("<p>Iscritta all'Ordine degli Psicologi della Lombardia, n. 1234</p>"), null, "salute")).toBe("pass");
  });
});

describe("sectors", () => {
  it("restaurant: HTML menu beats a PDF, booking platforms count", () => {
    expect(run("info.menu", page("<h2>Menu</h2><p>Antipasti</p><p>Primi piatti</p><p>Dolci</p><p>Tiramisù 6 €</p>"), null, "ristorazione")).toBe("pass");
    expect(run("info.menu", page('<a href="/menu.pdf">Il nostro menu</a>'), null, "ristorazione")).toBe("partial");
    expect(run("info.menu", page("<p>Ciao</p>"), null, "ristorazione")).toBe("fail");
    expect(run("conv.primary", page('<a href="https://www.thefork.it/ristorante/x">Tavoli</a>'), null, "ristorazione")).toBe("pass");
    expect(run("legal.allergens", page("<p>Allergeni su richiesta</p>"), null, "ristorazione")).toBe("flag-ok");
  });
  it("hospitality: direct booking beats OTA-only, English and CIN", () => {
    expect(run("conv.primary", page('<a href="https://book.octorate.com/x">Disponibilità</a>'), null, "ospitalita")).toBe("pass");
    expect(run("conv.primary", page('<a href="https://www.booking.com/hotel/it/x.html">Guarda le stanze</a>'), null, "ospitalita")).toBe("partial");
    expect(run("info.languages", page('<a href="/en/">English</a>'), null, "ospitalita")).toBe("pass");
    expect(run("info.languages", page("<p>Solo italiano</p>"), null, "ospitalita")).toBe("fail");
    expect(run("info.rooms", page('<a href="/camere/">Le camere</a>'), null, "ospitalita")).toBe("pass");
    expect(run("legal.cin", page("<footer>CIN: IT015146C2ABCDEFGH</footer>"), null, "ospitalita")).toBe("flag-ok");
    expect(run("legal.cin", page("<footer>B&B</footer>"), null, "ospitalita")).toBe("flag-warn");
  });
  it("trades: a quote form counts, portfolio needs photos, areas served", () => {
    const form = '<form><input type="email" name="email"><textarea name="msg"></textarea></form>';
    expect(run("conv.primary", page(form), null, "edilizia")).toBe("pass");
    expect(run("conv.primary", page(form), null, "fitness")).toBe("fail");
    expect(run("proof.portfolio", page(`<h2>I nostri lavori</h2>${'<img src="x" alt="bagno">'.repeat(8)}`), null, "edilizia")).toBe("pass");
    expect(run("proof.portfolio", page("<h2>I nostri lavori</h2>"), null, "edilizia")).toBe("partial");
    expect(run("info.area", page("<p>Interveniamo a Milano e provincia di Monza</p>"), null, "edilizia")).toBe("pass");
    expect(run("conv.offer", page("<p>Sopralluogo gratuito e senza impegno</p>"), null, "edilizia")).toBe("pass");
  });
  it("health: credentials, health data in forms, promotions are flags", () => {
    expect(run("trust.credentials", page("<p>Dott.ssa Rossi, iscritta all'Albo degli Psicologi della Lombardia n. 12345</p>"), null, "salute")).toBe("pass");
    expect(run("trust.credentials", page("<p>Dott. Bianchi</p>"), null, "salute")).toBe("partial");
    expect(run("legal.healthdata", page('<form><input type="email"><label>Descrivi i tuoi sintomi</label><textarea></textarea></form>'), null, "salute")).toBe("flag-warn");
    expect(run("legal.healthdata", page('<form><input type="email"><textarea></textarea></form>'), null, "salute")).toBe("flag-ok");
    expect(run("legal.healthads", page("<p>Prima visita gratuita</p>"), null, "salute")).toBe("flag-warn");
    expect(run("info.hours", page("<p>Si riceve su appuntamento</p>"), null, "salute")).toBe("pass");
  });
  it("beauty, shop, real estate, venues, other", () => {
    expect(run("conv.primary", page('<a href="https://www.treatwell.it/salone/x/">Agenda</a>'), null, "bellezza")).toBe("pass");
    expect(run("info.products", page('<script src="https://cdn.shopify.com/s/x.js"></script>'), null, "negozio")).toBe("pass");
    expect(run("info.listings", page('<a href="/immobili/vendita/">Vendita</a>'), null, "immobiliare")).toBe("pass");
    expect(run("legal.energy", page("<p>Classe energetica B</p>"), null, "immobiliare")).toBe("flag-ok");
    expect(run("info.capacity", page("<p>Fino a 180 ospiti in sala</p>"), null, "eventi")).toBe("pass");
    expect(run("info.capacity", page("<p>Tanti ospiti</p>"), null, "eventi")).toBe("partial");
    expect(run("content.whatwhere", page("<h1>Riparazione biciclette a Milano Isola</h1>"), null, "altro")).toBe("pass");
    expect(run("info.services", page('<a href="/servizi/">Servizi</a>'), null, "altro")).toBe("pass");
  });
  it("a rural place counts as where when it is the page's own town", () => {
    expect(run("content.whatwhere", page("<h1>Agriturismo a Montalto Pavese</h1><p>Località Cà Bianca 4, 27040 Montalto Pavese</p>"), null, "ospitalita")).toBe("pass");
  });
});
