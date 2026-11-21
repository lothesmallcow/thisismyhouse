/**
 * One function per check in the rubric library. Each one reads only PageSignals, PerfData and the
 * sector's vocabulary, so the same page, the same speed data and the same sector always give the
 * same result. Points and texts come from rubric.json; here is only how each check decides pass,
 * partial or fail, and the short sentence on what it found.
 */
import type { CheckResult, PageSignals, PerfData, RubricCheck, SectorDef, SectorRubric, Status, Vocab } from "./types";

type Verdict = { status: Status; found: string; ratio?: number };
type Check = (p: PageSignals, perf: PerfData | null, rule: RubricCheck, s: SectorDef) => Verdict;

const ok = (found: string): Verdict => ({ status: "pass", found });
const half = (found: string): Verdict => ({ status: "partial", found, ratio: 0.5 });
const no = (found: string): Verdict => ({ status: "fail", found });
const unmeasured: Verdict = { status: "unmeasured", found: "Non è stato possibile misurarlo questa volta." };
const flagOk = (found: string): Verdict => ({ status: "flag-ok", found });
const flagWarn = (found: string): Verdict => ({ status: "flag-warn", found });

const sec = (ms: number) => `${(ms / 1000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} secondi`;
const mb = (b: number) => `${(b / 1e6).toLocaleString("it-IT", { maximumFractionDigits: 1 })} MB`;

// Vocabulary regexes are compiled once. Words match at a word start; hosts and paths anywhere.
const cache = new Map<string, RegExp | null>();
function words(src: string | undefined): RegExp | null {
  if (!src) return null;
  const key = `w:${src}`;
  if (!cache.has(key)) cache.set(key, new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${src})(?![\\p{L}])`, "iu"));
  return cache.get(key)!;
}
function anywhere(src: string | undefined): RegExp | null {
  if (!src) return null;
  const key = `a:${src}`;
  if (!cache.has(key)) cache.set(key, new RegExp(src.split("|").map(escapeHost).join("|"), "i"));
  return cache.get(key)!;
}
const escapeHost = (h: string) => (h.startsWith("/") ? h : h.replace(/[.*+?^${}()[\]\\]/g, "\\$&"));
function paths(src: string | undefined): RegExp | null {
  if (!src) return null;
  const key = `p:${src}`;
  if (!cache.has(key)) cache.set(key, new RegExp(src, "i"));
  return cache.get(key)!;
}
const test = (re: RegExp | null, s: string) => !!re && re.test(s);
/** Distinct matches of a vocabulary in a text: repeating one word does not count twice. */
function distinct(src: string | undefined, text: string): string[] {
  if (!src) return [];
  const re = new RegExp(`(?:^|[^\\p{L}\\p{N}])(${src})(?![\\p{L}])`, "giu");
  const seen = new Set<string>();
  for (const m of text.matchAll(re)) seen.add(m[1].toLowerCase());
  return [...seen];
}

const isTel = (h: string) => /^tel:/i.test(h);
const isWa = (h: string) => /^(https?:\/\/)?(wa\.me|api\.whatsapp\.com|(www\.)?whatsapp\.com\/send|chat\.whatsapp\.com)|^whatsapp:/i.test(h);
const isMaps = (h: string) => /(google\.[a-z.]+\/maps|maps\.google\.|goo\.gl\/maps|maps\.app\.goo\.gl|g\.page\/|g\.co\/kgs)/i.test(h);
const isPdf = (h: string) => /\.pdf(\?|#|$)/i.test(h);
const pathOf = (h: string) => {
  try {
    return new URL(h, "https://x.it/").pathname;
  } catch {
    return "";
  }
};
const hostOf = (re: RegExp | null, h: string) => (re ? h.match(re)?.[0] : undefined);

const TIME = /(?:^|\D)([01]?\d|2[0-3])[:.][0-5]\d(?!\d)/;
const BY_APPOINTMENT = /\b(su appuntamento|previo appuntamento|solo su prenotazione|su prenotazione)\b/i;
const PRICE = /(€\s?\d|\d+(?:[.,]\d{2})?\s?€|\b\d+\s?euro\b|\beur\s?\d)/i;
const STREET = /\b(via|viale|v\.le|piazza|p\.za|p\.zza|corso|c\.so|largo|piazzale|vicolo|alzaia|ripa|strada|località|loc\.|frazione|fraz\.|cascina|bastioni|passaggio|contrada)\s+[a-zà-ü'.\s]{2,40}?,?\s*\d{1,4}\b/i;
const STREET_RURAL = /\b(località|loc\.|frazione|fraz\.|cascina|contrada|strada (provinciale|statale|comunale))\s+[A-ZÀ-Ü][\wà-ü'.\s]{2,40}/;
const CAP_CITY = /\b\d{5}\s+([A-ZÀ-Ü][a-zà-ü']+(?:\s[A-ZÀ-Ü][a-zà-ü']+)?)/;
/** Places a visitor might name in Milan; rural places come from the address and the JSON-LD. */
const PLACE = /\b(milano|milan|lombardia|brianza|brera|isola|navigli|porta (romana|venezia|nuova|genova|garibaldi|ticinese|vittoria)|citt[aà] studi|nolo|loreto|lambrate|sempione|city ?life|tortona|moscova|bicocca|bovisa|san siro|de angeli|wagner|centrale|duomo|paolo sarpi|corvetto|famagosta|lorenteggio|ticinese|cadorna|buenos aires|repubblica|arco della pace|magenta|solari|portello|maciachini|precotto|gorla|niguarda|affori|baggio|bisceglie|forlanini|piola|susa|dateo|indipendenza|monza|bergamo|brescia|como|varese|lecco|pavia|cremona|mantova|lodi|sondrio|lago (di )?(como|garda|maggiore|iseo)|franciacorta|valtellina|oltrepò|langhe|toscana|chianti|piemonte|veneto|liguria|emilia|trentino)\b/i;
const GENERIC_H1 = /^(home|homepage|benvenut[oi]|welcome|ciao|chi siamo|index|sito|untitled)\b/i;

const REVIEW_VENDORS = ["elfsight", "trustindex", "embedsocial", "sociablekit", "reviewsonmywebsite", "trustpilot", "featurable", "shapo", "taggbox", "grw-", "wp-google-reviews", "google-reviews", "richplugins", "reviews.io", "widget.reviews", "tripadvisor", "judge.me", "feedaty", "recensioni-verificate", "trustmate"];
const TRACKERS = ["googletagmanager.com", "google-analytics.com", "gtag(", "connect.facebook.net", "fbq(", "hotjar", "clarity.ms", "analytics.tiktok.com", "snap.licdn.com", "doubleclick.net", "youtube.com/embed", "google.com/maps/embed", "maps.google.com/maps?", "player.vimeo.com"];
const CMPS: [string, string][] = [
  ["iubenda.com/cs", "iubenda"], ["iubenda", "iubenda"], ["cookiebot", "Cookiebot"], ["cmplz", "Complianz"], ["complianz", "Complianz"],
  ["cookieyes", "CookieYes"], ["cookielaw.org", "OneTrust"], ["onetrust", "OneTrust"], ["usercentrics", "Usercentrics"], ["didomi", "Didomi"],
  ["axeptio", "Axeptio"], ["termly", "Termly"], ["cookie-script.com", "Cookie Script"], ["osano", "Osano"], ["quantcast", "Quantcast"],
  ["klaro", "Klaro"], ["borlabs", "Borlabs"], ["cookie-law-info", "CookieYes (GDPR Cookie Consent)"], ["moove_gdpr", "GDPR Cookie Compliance"],
  ["real-cookie-banner", "Real Cookie Banner"], ["cookie-notice", "Cookie Notice"],
];
const HEALTH_FIELDS = /\b(patologi\w*|sintom\w*|diagnos\w*|malatti\w*|terapi\w* in corso|farmac\w*|infortun\w*|dolor\w*|gravidanz\w*|condizion\w* di salute|stato di salute|problemi di salute|allergi\w*|intolleranz\w*|interventi chirurgici|certificato medico|referti?|anamnesi)\b/i;

function band(value: number, full: number, halfAt: number, say: (v: number) => string, what: string): Verdict {
  if (value <= full) return ok(`${what}: ${say(value)}.`);
  if (value <= halfAt) return half(`${what}: ${say(value)}, si può fare meglio.`);
  return no(`${what}: ${say(value)}, troppo.`);
}

/** The sector's main action: a booking platform, a booking or quote link or button, or (where it counts) a form. */
function mainAction(p: PageSignals, v: Vocab) {
  const hosts = anywhere(v.hosts);
  const w = words(v.words);
  const pth = paths(v.paths);
  const ota = anywhere(v.ota);
  for (const l of p.links) {
    const h = l.href.toLowerCase();
    if (isTel(h) || h.startsWith("mailto:") || isWa(h) || test(ota, h)) continue;
    const host = hostOf(hosts, h);
    if (host) return { kind: "host" as const, label: host.replace(/\.$/, "") };
    if (test(w, l.text)) return { kind: "link" as const, label: l.text.slice(0, 40) || l.href.slice(0, 40), early: l.early };
    if (pth && pth.test(pathOf(h))) return { kind: "link" as const, label: pathOf(h), early: l.early };
  }
  if (hosts && hosts.test(p.vendorBlob)) return { kind: "host" as const, label: hostOf(hosts, p.vendorBlob)!.replace(/\.$/, "") };
  if (p.buttons.some((b) => test(w, b))) return { kind: "button" as const, label: "" };
  if (v.form && p.forms.count) return { kind: "form" as const, label: "" };
  return null;
}
const isMainLink = (l: { href: string; text: string }, v: Vocab) => {
  const h = l.href.toLowerCase();
  if (isTel(h) || h.startsWith("mailto:")) return false;
  return test(anywhere(v.hosts), h) || test(words(v.words), l.text) || test(paths(v.paths), h);
};

export const CHECKS: Record<string, Check> = {
  "speed.lcp": (_p, perf, r) => {
    if (!perf?.lcpMs) return unmeasured;
    const src = perf.source === "field" ? "Per chi visita davvero il sito, la pagina appare in" : "Nella nostra prova da telefono, la pagina appare in";
    return band(perf.lcpMs, r.bands!.full, r.bands!.half, sec, src);
  },
  "speed.interaction": (_p, perf, r) => {
    if (perf?.source === "field" && perf.inpMs != null) return band(perf.inpMs, r.bands!.full, r.bands!.half, (v) => `${Math.round(v)} millisecondi`, "Risposta a un tocco, per chi visita davvero il sito");
    if (perf?.tbtMs != null) return band(perf.tbtMs, r.bands!.labFull!, r.bands!.labHalf!, (v) => `${Math.round(v)} millisecondi`, "Tempo in cui la pagina resta bloccata mentre carica");
    return unmeasured;
  },
  "speed.cls": (_p, perf, r) => {
    if (perf?.cls == null) return unmeasured;
    return band(perf.cls, r.bands!.full, r.bands!.half, (v) => v.toLocaleString("it-IT", { maximumFractionDigits: 2 }), "Spostamenti mentre carica (0 è perfetto)");
  },
  "speed.weight": (_p, perf, r) => {
    if (perf?.bytes == null) return unmeasured;
    return band(perf.bytes, r.bands!.full, r.bands!.half, mb, "Peso della pagina");
  },
  "mobile.viewport": (p) => (/width\s*=\s*device-width/.test(p.viewport) ? ok("La pagina è impostata per i telefoni.") : no("Manca l'impostazione per i telefoni: la pagina appare rimpicciolita.")),

  "conv.primary": (p, _perf, _r, s) => {
    const a = mainAction(p, s.vocab);
    if (a?.kind === "host") return ok(`Abbiamo trovato il collegamento a ${a.label}.`);
    if (a?.kind === "link") return ok(`Abbiamo trovato il collegamento "${a.label}".`);
    if (a?.kind === "button") return ok("Abbiamo trovato un pulsante per l'azione principale.");
    if (a?.kind === "form") return ok("C'è un modulo per scriverti dalla pagina.");
    const ota = anywhere(s.vocab.ota);
    const viaOta = p.links.find((l) => test(ota, l.href));
    if (viaOta) return half(`Si passa solo da ${hostOf(ota, viaOta.href)!.replace(/\.$/, "")}: il cliente è loro prima che tuo, e su ogni prenotazione paghi la commissione.`);
    if (p.links.some((l) => /contatt/i.test(l.text) || /\/contatt/i.test(pathOf(l.href)))) return half("C'è solo una pagina contatti: nessun pulsante o modulo per il passo principale.");
    if (p.links.some((l) => l.href.toLowerCase().startsWith("mailto:"))) return half("C'è solo un indirizzo email: niente pulsante o modulo per il passo principale.");
    return no("Non abbiamo trovato un modo diretto per fare il passo principale: solo il numero o nulla.");
  },
  "conv.early": (p, _perf, _r, s) => {
    const l = p.links.find((x) => x.early && (isMainLink(x, s.vocab) || isTel(x.href) || isWa(x.href)));
    return l ? ok("Il pulsante per contattarti si trova già in alto.") : no("In alto, nel menu o prima delle sezioni, non c'è niente per contattarti o prenotare.");
  },
  "conv.offer": (p, _perf, _r, s) => {
    const re = words(s.vocab.offer);
    return test(re, p.text) || p.links.some((l) => test(re, l.text)) ? ok("C'è un primo passo facile scritto chiaro.") : no("Non abbiamo trovato un'offerta o un primo passo facile per chi è nuovo.");
  },
  "contact.tel": (p) => (p.links.some((l) => isTel(l.href)) ? ok("Il numero si chiama con un tocco.") : no("Il numero non è un pulsante: dal telefono va copiato a mano.")),
  "contact.whatsapp": (p) => (p.links.some((l) => isWa(l.href)) ? ok("C'è un collegamento WhatsApp.") : no("Nessun collegamento WhatsApp.")),

  "info.hours": (p, _perf, _r, s) => {
    const w = words(s.vocab.hours || "orari[o]?|apertura");
    if (p.jsonLdKeys.some((k) => /^openingHours/i.test(k))) return ok("Gli orari sono nei dati per Google.");
    if (p.links.some((l) => test(w, l.text) || test(paths(s.vocab.hoursPaths), l.href)) && TIME.test(p.text)) return ok("Gli orari sono sul sito.");
    if (test(w, p.text) && TIME.test(p.text)) return ok("Gli orari sono scritti sulla pagina.");
    if (BY_APPOINTMENT.test(p.text)) return ok("È scritto che si riceve su appuntamento.");
    if (p.links.some((l) => test(w, l.text) || test(paths(s.vocab.hoursPaths), l.href))) return half("C'è una voce per gli orari, ma sulla pagina non li abbiamo trovati.");
    return no("Non abbiamo trovato gli orari.");
  },
  "info.prices": (p, _perf, _r, s) => {
    if (PRICE.test(p.text)) return ok("Ci sono prezzi sulla pagina.");
    const pl = paths(s.vocab.prices || "prezz|tariff|listino");
    if (p.links.some((l) => test(pl, l.text) || test(pl, l.href))) return ok("C'è una pagina con prezzi o tariffe.");
    if (p.jsonLdKeys.includes("priceRange")) return half("C'è solo una fascia di prezzo nei dati per Google.");
    return no("Non abbiamo trovato prezzi o una fascia di prezzo.");
  },
  "info.menu": (p, _perf, _r, s) => {
    const items = distinct(s.vocab.menu, p.text);
    if (p.jsonLdKeys.includes("hasMenu") && !p.links.some((l) => isPdf(l.href))) return ok("Il menu è collegato nei dati per Google.");
    if (items.length >= 3 && PRICE.test(p.text)) return ok("Il menu è scritto sulla pagina, con i prezzi.");
    const menuLink = p.links.find((l) => /\/(menu|carta|menù)/i.test(pathOf(l.href)) || (/men[uù]|carta/i.test(l.text) && /\.pdf|\/[a-z]/i.test(l.href) && !/^#/.test(l.href)));
    if (menuLink && !isPdf(menuLink.href)) return ok("Il menu ha una sua pagina.");
    if (menuLink && isPdf(menuLink.href)) return half("Il menu c'è, ma in PDF: dal telefono si legge male e Google non lo legge.");
    if (items.length >= 3) return half("Si vedono piatti, ma senza prezzi.");
    return no("Non abbiamo trovato il menu.");
  },
  "info.rooms": (p, _perf, _r, s) => {
    const found = distinct(s.vocab.rooms, p.text);
    const link = p.links.some((l) => test(words(s.vocab.rooms), l.text) || /\/(camer|rooms?|appartament|suite|alloggi)/i.test(l.href));
    if (link || found.length >= 3) return ok("Le camere o gli alloggi sono descritti.");
    if (found.length) return half("Si parla di camere, ma senza una sezione per ognuna.");
    return no("Non abbiamo trovato le camere descritte.");
  },
  "info.languages": (p) => {
    if (p.multilingual) return ok("Il sito ha anche altre lingue.");
    if (p.lang && !/^it/i.test(p.lang)) return half("Il sito è in una sola lingua, non in italiano.");
    return no("Il sito è solo in italiano.");
  },
  "info.services": (p, _perf, _r, s) => {
    const found = distinct(s.vocab.services, p.text);
    if (p.links.some((l) => test(paths(s.vocab.servicesPaths), l.href))) return ok("C'è una pagina con i servizi.");
    if (found.length >= 2) return ok("I servizi sono elencati sulla pagina.");
    if (found.length === 1) return half("Si parla di un servizio, ma non c'è un elenco.");
    return no("Non abbiamo trovato un elenco dei servizi.");
  },
  "info.area": (p, _perf, _r, s) => {
    if (p.jsonLdKeys.includes("areaServed")) return ok("Le zone servite sono nei dati per Google.");
    return test(words(s.vocab.area), p.text) ? ok("È scritto in che zone lavori.") : no("Non è scritto in che zone lavori.");
  },
  "info.listings": (p, _perf, _r, s) => {
    const h = anywhere(s.vocab.listingsHosts);
    if (p.links.some((l) => test(paths(s.vocab.listingsPaths), l.href)) || test(h, p.vendorBlob)) return ok("Gli immobili hanno una loro pagina.");
    if (distinct(s.vocab.listings, p.text).length >= 2 && PRICE.test(p.text)) return ok("Ci sono immobili con prezzo sulla pagina.");
    if (p.links.some((l) => test(h, l.href))) return half("Gli annunci sono solo sui portali, non sul sito.");
    return no("Non abbiamo trovato gli immobili.");
  },
  "info.products": (p, _perf, _r, s) => {
    if (test(anywhere(s.vocab.hosts), p.vendorBlob)) return ok("C'è un negozio online.");
    const found = distinct(s.vocab.products, p.text);
    if (found.length >= 2 || p.links.some((l) => /\/(prodotti|catalogo|shop|marchi|collezion|products|collections)/i.test(l.href))) return ok("Si vede cosa vendi.");
    if (found.length) return half("Si parla di prodotti, ma senza mostrarli.");
    return no("Non abbiamo trovato cosa vendi.");
  },
  "info.capacity": (p, _perf, _r, s) => {
    const num = new RegExp(`\\b\\d{2,4}\\s*(${s.vocab.capacity || "ospiti|persone"})`, "i");
    if (num.test(p.text)) return ok("È scritto quante persone ospiti.");
    if (test(words(s.vocab.capacity), p.text)) return half("Si parla di ospiti, ma senza numeri.");
    return no("Non è scritto quante persone ospiti.");
  },
  "proof.portfolio": (p, _perf, _r, s) => {
    const w = words(s.vocab.portfolio);
    const named = test(w, p.text) || p.links.some((l) => test(w, l.text));
    if (named && p.images.total >= 6) return ok(`Ci sono lavori mostrati con foto (${p.images.total} immagini).`);
    if (named) return half("Si parla di lavori fatti, ma con poche foto.");
    if (p.images.total >= 6) return half("Ci sono foto, ma non si capisce se sono lavori fatti da te.");
    return no("Non abbiamo trovato lavori fatti da mostrare.");
  },

  "seo.title": (p) => {
    if (!p.title) return no("La pagina non ha un titolo per Google.");
    if (p.title.length < 10 || GENERIC_H1.test(p.title)) return half(`Titolo troppo generico: "${p.title}".`);
    if (p.title.length > 70) return half(`Titolo troppo lungo, Google lo taglia (${p.title.length} caratteri).`);
    return ok(`Titolo: "${p.title}".`);
  },
  "seo.description": (p) => {
    const n = p.description.length;
    if (!n) return no("Manca la descrizione per Google.");
    if (n < 50 || n > 170) return half(`La descrizione c'è ma è ${n < 50 ? "troppo corta" : "troppo lunga"} (${n} caratteri).`);
    return ok("La descrizione per Google c'è.");
  },
  "local.schema": (p, _perf, _r, s) => {
    const mine = s.vocab.schema ? new RegExp(`^(${s.vocab.schema})$`, "i") : null;
    const local = /^(LocalBusiness|Organization|Store|ProfessionalService)$/i;
    const best = p.jsonLdTypes.find((t) => mine?.test(t));
    if (best) return ok(`Dati strutturati presenti (${best}).`);
    const generic = p.jsonLdTypes.find((t) => local.test(t));
    if (generic) return { status: "partial", ratio: 0.75, found: `Dati strutturati presenti (${generic}), ma non del tipo più preciso per il settore.` };
    if (p.jsonLdTypes.length) return half(`Ci sono dati strutturati (${p.jsonLdTypes[0]}), ma non da attività locale.`);
    return no("Nessun dato strutturato da attività locale.");
  },
  "local.address": (p) => (STREET.test(p.text) || STREET_RURAL.test(p.text) ? ok("L'indirizzo è scritto sulla pagina.") : CAP_CITY.test(p.text) ? half("C'è CAP e città, ma non una via chiara.") : no("Non abbiamo trovato l'indirizzo scritto sulla pagina.")),
  "local.maps": (p) => (p.links.some((l) => isMaps(l.href)) ? ok("C'è il collegamento a Google Maps.") : no("Nessun collegamento a Google Maps.")),

  "trust.https": (p) => (p.https ? ok("Il sito usa una connessione sicura.") : no("Il sito non usa HTTPS: il browser lo segna come non sicuro.")),
  "trust.reviews": (p) => {
    if (REVIEW_VENDORS.some((x) => p.vendorBlob.includes(x))) return ok("C'è un riquadro di recensioni.");
    if (p.links.some((l) => /(search\.google\.com\/local\/(reviews|writereview)|g\.page\/r\/|\/maps\/place\/.*review|trustpilot\.com\/review|tripadvisor\.)/i.test(l.href) || (/recension/i.test(l.text) && isMaps(l.href)))) return ok("C'è un collegamento alle recensioni.");
    if (p.hasAggregateRating) return half("C'è un voto medio nei dati per Google, ma sulla pagina non si vedono recensioni collegate a una fonte.");
    if (/\brecension/i.test(p.text)) return half("Si parla di recensioni, ma non le abbiamo trovate collegate o mostrate.");
    return no("Non abbiamo trovato recensioni sulla pagina.");
  },
  "trust.team": (p, _perf, _r, s) => (test(words(s.vocab.team), p.text) ? ok("Si parla di chi c'è dietro.") : no("Non si vede chi c'è dietro.")),
  "trust.credentials": (p, _perf, _r, s) => {
    const re = words(s.vocab.credentials);
    if (test(re, p.text)) return ok("Albo o iscrizione sono indicati.");
    if (/\b([Dd]ott\.?(ssa)?|[Dd]r\.|[Aa]vv\.|[Aa]rch\.|[Ii]ng\.|[Gg]eom\.)\s+[A-Z]/.test(p.text)) return half("C'è il titolo, ma non albo e numero d'iscrizione.");
    return no("Non abbiamo trovato titolo e iscrizione all'albo.");
  },

  "a11y.lighthouse": (_p, perf, r) => {
    if (perf?.a11y == null) return unmeasured;
    const s = Math.round(perf.a11y * 100);
    if (perf.a11y >= r.bands!.full) return ok(`Controllo automatico di accessibilità: ${s} su 100.`);
    if (perf.a11y >= r.bands!.half) return half(`Controllo automatico di accessibilità: ${s} su 100, con qualche problema.`);
    return no(`Controllo automatico di accessibilità: ${s} su 100, con problemi importanti.`);
  },

  "legal.privacy": (p) => (p.links.some((l) => /privacy|informativa|iubenda\.com\/privacy/i.test(l.href) || /privacy|informativa/i.test(l.text)) ? ok("C'è il collegamento all'informativa privacy.") : no("Non abbiamo trovato il collegamento all'informativa privacy.")),
  "legal.cookie": (p) => {
    const blob = p.vendorBlob;
    const trackers = TRACKERS.filter((t) => blob.includes(t));
    const cmp = CMPS.find(([k]) => blob.includes(k))?.[1] ?? (p.consent.banner ? "banner del sito" : null);
    if (!trackers.length && !cmp) return ok("Non abbiamo trovato strumenti che tracciano i visitatori: il banner non serve.");
    if (cmp) {
      const reject = /rejectbuttondisplay"?\s*:\s*true/.test(blob) || p.consent.reject;
      return reject
        ? ok(`C'è un banner cookie (${cmp}) con un'opzione per rifiutare.`)
        : { status: "partial", ratio: 0.8, found: `C'è un banner cookie (${cmp}): controlla a mano che si possa rifiutare con un tasto come Accetta.` };
    }
    if (p.consent.consentMode)
      return { status: "partial", ratio: 0.5, found: "Il sito usa la modalità consenso di Google, ma non vediamo il banner nella pagina: potrebbe arrivare da Google Tag Manager. Controlla a mano." };
    return no("Il sito carica strumenti che possono tracciare i visitatori, ma non abbiamo trovato un banner per il consenso.");
  },
  "legal.vat": (p) => {
    const m = p.text.match(/(p\.?\s?iva|partita\s+iva|vat(?: number)?|c\.?\s?f\.?\s*(?:e|\/)\s*p\.?\s?iva)[^0-9]{0,25}(it)?\s?(\d{11})\b/i);
    return m ? flagOk(`Partita IVA trovata nella pagina (${m[3]}).`) : flagWarn("Partita IVA non trovata in questa pagina: chiedi al tuo commercialista se nel tuo caso serve.");
  },
  "legal.cin": (p) => {
    const m = p.text.match(/\b(cin|codice identificativo nazionale)\b[\s:.\-n°]{0,8}([A-Z]{2}[0-9A-Z]{8,18})/i);
    return m ? flagOk(`Codice CIN trovato (${m[2]}).`) : flagWarn("Non abbiamo trovato il CIN: se affitti a turisti, verifica dove deve comparire.");
  },
  "legal.allergens": (p) => (/\ballergen/i.test(p.text) ? flagOk("Gli allergeni sono nominati sulla pagina.") : flagWarn("Gli allergeni non sono nominati: verifica cosa serve se prendi ordini online.")),
  "legal.healthdata": (p) => {
    const f = p.forms.fields.find((x) => HEALTH_FIELDS.test(x));
    return f ? flagWarn(`Un modulo sembra chiedere dati sulla salute ("${f.slice(0, 40)}").`) : flagOk("Nessun modulo sembra chiedere dati sulla salute.");
  },
  "legal.energy": (p) => (/\b(classe energetica|ape\b|ipe\b|prestazione energetica|kwh\/m)/i.test(p.text) ? flagOk("La classe energetica è indicata.") : flagWarn("Non abbiamo trovato la classe energetica in questa pagina: verifica che sia in ogni annuncio.")),
  "legal.healthads": (p) => {
    const m = p.text.match(/\b(sconto|sconti|promozion\w*|offerta (speciale|lancio)|-\d{1,2}\s?%|gratis|gratuit[ao]|in omaggio|black friday)\b/i);
    return m ? flagWarn(`Abbiamo trovato "${m[0]}": nella pubblicità sanitaria offerte e sconti vanno verificati.`) : flagOk("Nessuno sconto o promozione in vista.");
  },

  "content.h1": (p) => {
    const first = p.h1[0];
    if (!first) return no("La pagina non ha un titolo principale.");
    if (GENERIC_H1.test(first) || first.split(" ").length < 2) return half(`Il titolo principale non dice cosa fai: "${first.slice(0, 60)}".`);
    return ok(`Titolo principale: "${first.slice(0, 80)}".`);
  },
  "content.whatwhere": (p, _perf, _r, s) => {
    const top = `${p.title} ${p.h1.join(" ")} ${p.description} ${p.lead}`;
    const what = s.vocab.activity ? test(words(s.vocab.activity), top) : !!p.h1[0] && !GENERIC_H1.test(p.h1[0]) && p.h1[0].split(" ").length >= 3;
    const city = p.text.match(CAP_CITY)?.[1];
    const places = [...p.localities, ...(city ? [city] : [])].filter((x) => x.length > 2);
    const where = PLACE.test(top) || places.some((x) => top.toLowerCase().includes(x.toLowerCase()));
    if (what && where) return ok("Nelle prime righe si capisce cosa fai e dove.");
    if (what || where) return half(what ? "Si capisce cosa fai, ma non dove." : "Si capisce dove sei, ma non cosa fai.");
    return no("Nelle prime righe non si capisce né cosa fai né dove.");
  },
};

export function runChecks(rubric: SectorRubric, page: PageSignals, perf: PerfData | null): CheckResult[] {
  return rubric.checks.map((rule) => {
    const fn = CHECKS[rule.id];
    if (!fn) throw new Error(`No check implements ${rule.id}`);
    const v = fn(page, perf, rule, rubric.sector);
    const ratio = v.status === "pass" ? 1 : v.status === "partial" ? (v.ratio ?? 0.5) : 0;
    return { id: rule.id, category: rule.category, max: rule.points, earned: Math.round(rule.points * ratio * 10) / 10, status: v.status, found: v.found };
  });
}
