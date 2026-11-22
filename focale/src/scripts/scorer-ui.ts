/**
 * The analysis page (/analisi-sito/), as designed in Claude Design and wired to the real engine.
 * Screens: start, waiting, report, error. /api/score returns the report for every sector, so the
 * "Valutato come" switch recalculates without a new fetch. Every string from the analysed page is
 * inserted as text, never as HTML: "found" sentences can quote the page's own title or headings.
 * Motion: the ring fills and the bars grow once (the ring by stroke length, the bars by scaleX), the
 * number counts up; nothing moves when the visitor asks for reduced motion.
 */
import type { FullAnalysis } from "../scorer/analyze";
import type { Report, SectorId } from "../scorer/types";
import { verdict, bandOf, PRACTICALLY_PERFECT } from "../scorer/scale";

interface Pkg {
  id: string;
  name: string;
  price: number;
  forWhom: string;
  includes: string[];
}
interface SkelCat {
  id: string;
  label: string;
  weight: number;
  checks: string[];
}
interface Data {
  sectors: { id: SectorId; label: string }[];
  offer: { packages: Pkg[]; care: { line: string } };
  benchmark: { templates: Record<string, { label: string; path: string; total: number }> };
  consent: { version: string; text: string };
  /** The invented examples (src/scorer/samples.ts): vecchio, curato, fatto-bene. */
  examples: { key: string; full: FullAnalysis }[];
  skeleton: Record<string, SkelCat[]>;
  checkCount: number;
}

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)!;
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SVG = "http://www.w3.org/2000/svg";
const fmt = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const euro = (n: number) => `${n.toLocaleString("it-IT")} €`;
const host = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/** One colour per category, as in the design: same lightness and chroma, different hue. */
const HUE: Record<string, number> = { speed: 35, conversion: 80, local: 135, trust: 180, a11y: 240, legal: 290, content: 345 };
const colour = (id: string) => `oklch(0.72 0.15 ${HUE[id] ?? 250})`;
const STATUS_COLOUR: Record<string, string> = { pass: "#34C759", partial: "#FF9F0A", fail: "#FF3B30", unmeasured: "#AEAEB2" };
const STATUS_WORD: Record<string, string> = { pass: "Superato", partial: "In parte", fail: "Non superato", unmeasured: "Non misurato" };


function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...kids: (Node | string | null | undefined | false)[]) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else e.setAttribute(k, v);
  }
  for (const k of kids) if (k) e.append(typeof k === "string" ? document.createTextNode(k) : k);
  return e;
}

/**
 * The ring: one arc per category, its length the category's weight, filled as far as its points.
 * Returns the fill circles so the caller can grow them.
 */
function drawRing(svg: SVGSVGElement, segs: { weight: number; frac: number; colour: string; delay?: number; dur?: number }[]) {
  const R = 124;
  const C = 2 * Math.PI * R;
  const gap = 6;
  const total = segs.reduce((t, s) => t + s.weight, 0) || 100;
  let start = 0;
  const fills: { c: SVGCircleElement; len: number; frac: number }[] = [];
  const parts: SVGCircleElement[] = [];
  segs.forEach((s) => {
    const len = (s.weight / total) * C - gap;
    const off = String(-(start + gap / 2));
    start += (s.weight / total) * C;
    const mk = (stroke: string, dash: string) => {
      const c = document.createElementNS(SVG, "circle");
      for (const [k, v] of Object.entries({ cx: "150", cy: "150", r: String(R), fill: "none", "stroke-width": "22", transform: "rotate(-90 150 150)", "stroke-dashoffset": off, stroke, "stroke-dasharray": dash })) c.setAttribute(k, v);
      return c;
    };
    parts.push(mk("#EDEDF0", `${len} ${C}`));
    const f = mk(s.colour, `0 ${C}`);
    f.style.transition = `stroke-dasharray ${s.dur ?? 1300}ms cubic-bezier(.2,.7,.2,1) ${s.delay ?? 0}ms`;
    parts.push(f);
    fills.push({ c: f, len, frac: Math.max(0, Math.min(1, s.frac)) });
  });
  svg.replaceChildren(...parts);
  return {
    fill(now = false) {
      for (const { c, len, frac } of fills) {
        if (now) c.style.transition = "none";
        c.setAttribute("stroke-dasharray", `${len * frac} ${2 * Math.PI * R}`);
      }
    },
  };
}

export function initScorer() {
  const data = JSON.parse($("#az-data").textContent || "{}") as Data;
  const screens = document.querySelectorAll<HTMLElement>("[data-az-screen]");
  const show = (name: string) => {
    screens.forEach((s) => (s.hidden = s.dataset.azScreen !== name));
    window.scrollTo({ top: 0 });
  };
  let current: FullAnalysis | null = null;
  let isSample = false;
  let shown = 0;
  let raf = 0;
  const timers: number[] = [];
  const clearTimers = () => {
    timers.splice(0).forEach((t) => window.clearTimeout(t));
    cancelAnimationFrame(raf);
  };
  const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

  /* ---------- Start ---------- */
  const form = $<HTMLFormElement>("[data-az-form]");
  const urlInput = $<HTMLInputElement>("#az-url");
  const urlErr = $("[data-az-url-err]");
  const sectorPick = $<HTMLSelectElement>("#az-sector");
  const setUrlErr = (msg: string) => {
    urlErr.textContent = msg;
    urlErr.hidden = !msg;
    if (msg) urlInput.setAttribute("aria-invalid", "true");
    else urlInput.removeAttribute("aria-invalid");
  };
  urlInput.addEventListener("input", () => setUrlErr(""));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const raw = urlInput.value.trim();
    if (!raw || !/\.[a-z]{2,}/i.test(raw)) {
      setUrlErr("Scrivi l'indirizzo completo, per esempio www.nomeattivita.it");
      urlInput.focus();
      return;
    }
    const sector = (sectorPick.value || undefined) as SectorId | undefined;
    const done = startWaiting(host(raw.toLowerCase()), sector ?? "fitness");
    try {
      const r = await fetch("/api/score", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: raw, sector }) });
      const body = await r.json().catch(() => null);
      if (!r.ok || !body || body.error) {
        await done();
        showError(host(raw), body?.code ?? (r.status === 404 ? "preview" : r.status === 429 ? "limit" : "server"), body?.error);
        return;
      }
      await done();
      isSample = false;
      openReport(body as FullAnalysis);
    } catch {
      await done();
      showError(host(raw), "preview");
    }
  });

  const openSample = (which: string) => {
    clearTimers();
    isSample = true;
    openReport((data.examples.find((e) => e.key === which) ?? data.examples[0]).full);
  };
  document.querySelectorAll<HTMLAnchorElement>("[data-az-sample]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openSample(a.dataset.azSample!);
    }),
  );

  document.querySelectorAll<HTMLButtonElement>("[data-az-restart]").forEach((b) =>
    b.addEventListener("click", () => {
      clearTimers();
      show("inizio");
      urlInput.focus({ preventScroll: true });
    }),
  );

  // Private test page only: real sites analysed in advance (#sc-real, never in the public build).
  const realEl = document.getElementById("sc-real");
  if (realEl) {
    const real = JSON.parse(realEl.textContent || "[]") as FullAnalysis[];
    const pick = el(
      "select",
      { id: "az-real", class: "az-select" },
      el("option", { value: "" }, "Scegli un sito"),
      ...real.map((r, i) => el("option", { value: String(i) }, `${host(r.page.finalUrl)} (${r.results[r.chosen].report.total})`)),
    );
    pick.addEventListener("change", () => {
      const r = real[Number((pick as HTMLSelectElement).value)];
      if (!r) return;
      isSample = false;
      openReport(r);
    });
    $(".az-examples").after(el("div", { class: "az-real" }, el("label", { for: "az-real" }, "Pagina di prova: siti veri già analizzati con il motore vero"), pick));
  }

  /* ---------- Waiting: the ring builds while the names of the checks go by ---------- */
  function startWaiting(address: string, sector: string): () => Promise<void> {
    clearTimers();
    show("attesa");
    $("[data-az-wait-url]").textContent = address;
    const cats = data.skeleton[sector] ?? data.skeleton.fitness;
    const all = cats.flatMap((c) => c.checks.map((t) => ({ t, c })));
    const ringSvg = $<SVGSVGElement>("[data-az-wait-ring]");
    const catEl = $("[data-az-wait-cat]");
    const checkEl = $("[data-az-wait-check]");
    const started = performance.now();
    let idx = 0;
    let finished = false;
    const step = () => {
      if (finished) return;
      if (idx >= all.length) {
        catEl.textContent = "Velocità e telefono";
        checkEl.replaceChildren(el("span", {}, "Misuriamo la velocità da telefono"));
        return;
      }
      const cur = all[idx];
      const ring = drawRing(
        ringSvg,
        cats.map((c) => ({ weight: c.weight, frac: all.slice(0, idx + 1).filter((x) => x.c.id === c.id).length / c.checks.length, colour: colour(c.id), dur: 500 })),
      );
      ring.fill(true);
      catEl.textContent = cur.c.label;
      checkEl.replaceChildren(el("span", {}, cur.t));
      idx += 1;
      later(reduced() ? 900 : 650, step);
    };
    step();
    // Resolve once the answer is in: at least 1,5 s on screen, so the switch never flickers.
    return () =>
      new Promise<void>((res) => {
        const wait = Math.max(0, 1500 - (performance.now() - started));
        window.setTimeout(() => {
          finished = true;
          clearTimers();
          res();
        }, wait);
      });
  }

  /* ---------- Error ---------- */
  const ERRORS: Record<string, { title: string; todo: string }> = {
    social: { title: "Questo è un profilo social, non un sito tuo", todo: "Incolla l'indirizzo del sito, per esempio www.nomeattivita.it. Se un sito non ce l'hai, possiamo partire da zero." },
    unreachable: { title: "Il sito non risponde", todo: "Controlla che l'indirizzo sia scritto giusto e che il sito si apra dal tuo telefono, poi riprova tra qualche minuto." },
    "too-slow": { title: "Il sito non risponde", todo: "Il sito ci ha messo troppo ad aprirsi. Riprova tra qualche minuto." },
    status: { title: "Il sito risponde con un errore", todo: "Controlla che la pagina si apra dal tuo telefono, poi riprova." },
    url: { title: "Questo indirizzo non sembra giusto", todo: "Scrivi l'indirizzo completo, per esempio www.nomeattivita.it." },
    blocked: { title: "Questo indirizzo non si può analizzare", todo: "Analizziamo solo siti pubblici, con un nome a dominio: per esempio www.nomeattivita.it." },
    "not-html": { title: "Questo indirizzo non porta a una pagina web", todo: "Incolla l'indirizzo della pagina principale del sito." },
    empty: { title: "La pagina arriva vuota", todo: "Scrivici su WhatsApp con l'indirizzo: la guardiamo noi a mano." },
    limit: { title: "Hai fatto molte analisi in poco tempo", todo: "Riprova tra un'ora. Se ti serve prima, scrivici." },
    preview: { title: "L'analisi dal vivo non è attiva qui", todo: "Questa è un'anteprima senza server: guarda un esempio (voto 12 o voto 97), oppure riprova sul sito pubblicato." },
    server: { title: "Non siamo riusciti ad analizzare il sito", todo: "Riprova tra qualche minuto." },
  };
  function showError(address: string, code: string, message?: string) {
    const e = ERRORS[code] ?? ERRORS.server;
    $("[data-az-err-url]").textContent = address;
    $("[data-az-err-title]").textContent = e.title;
    $("[data-az-err-text]").textContent = message || (code === "preview" ? "Qui il sito non può aprire altre pagine per misurarle." : "");
    $("[data-az-err-todo]").textContent = e.todo;
    show("errore");
  }

  /* ---------- Report ---------- */
  const sectorNow = $<HTMLSelectElement>("[data-az-sector-now]");
  sectorNow.addEventListener("change", () => {
    if (current) render(current, sectorNow.value as SectorId, false);
  });
  $("[data-az-print]").addEventListener("click", () => {
    document.querySelectorAll<HTMLDetailsElement>(".az-check").forEach((d) => (d.open = true));
    window.print();
  });

  function openReport(full: FullAnalysis) {
    current = full;
    shown = 0;
    show("report");
    render(full, full.chosen, true);
  }

  function countTo(target: number) {
    const n = $("[data-az-total]");
    cancelAnimationFrame(raf);
    if (reduced()) {
      n.textContent = String(target);
      shown = target;
      return;
    }
    const from = shown;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1500);
      shown = Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3)));
      n.textContent = String(shown);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function render(full: FullAnalysis, sector: SectorId, first: boolean) {
    const { report: r, recommendation } = full.results[sector];
    sectorNow.value = sector;
    $("[data-az-sample-note]").hidden = !isSample;
    // The invented example site in a phone, with its pins: only for that example.
    document.querySelectorAll<HTMLElement>("[data-az-site]").forEach((s) => {
      s.hidden = !(isSample && data.examples.find((e) => e.key === s.dataset.azSite)?.full === full);
    });
    const motion = !reduced();

    // Header
    $("[data-az-url]").textContent = host(r.url);
    const when = new Date(r.measuredAt).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
    const speed = r.perfSource === "field" ? "velocità dalle visite reali degli ultimi 28 giorni" : r.perfSource === "lab" ? "velocità misurata come da telefono su 4G" : "velocità non misurata questa volta";
    $("[data-az-meta]").textContent = `${when} · ${speed}`;
    const notes: string[] = [];
    if (full.guessed === sector && sector !== "altro") notes.push("Il settore l'abbiamo capito dalla pagina: se non è giusto, cambialo qui sopra e il voto si ricalcola.");
    if (sector === "altro") notes.push("Con \"Altro\" controlliamo solo quello che serve a qualsiasi attività.");
    if (r.partial) notes.push("La velocità questa volta non è stata misurata: il voto conta solo i controlli misurati.");
    $("[data-az-note]").textContent = notes.join(" ");

    // Ring and categories
    const cats = r.categories
      .map((c) => {
        const weight = r.checks.filter((x) => x.category === c.id && x.max > 0).reduce((t, x) => t + x.max, 0);
        return { ...c, weight };
      })
      .filter((c) => c.weight > 0);
    const ring = drawRing(
      $<SVGSVGElement>("[data-az-ring]"),
      cats.map((c, i) => ({ weight: c.weight, frac: c.earned / c.weight, colour: colour(c.id), delay: motion ? i * 110 : 0 })),
    );
    const v = verdict(r.total);
    $("[data-az-ring-wrap]").setAttribute("aria-label", `Voto ${r.total} su 100, ${v.toLowerCase()}`);
    $("[data-az-verdict]").textContent = v;
    const band = bandOf(r.total);
    document.querySelectorAll<HTMLElement>(".az-scale__band").forEach((b) => {
      const here = Number(b.dataset.min) === band.min;
      b.classList.toggle("is-here", here);
      if (here) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    });
    $("[data-az-scale-line]").textContent = band.line;
    $("[data-az-cats]").replaceChildren(
      ...cats.map((c, i) => {
        const lost = r.checks.filter((x) => x.category === c.id && x.max > 0 && x.status !== "unmeasured" && x.earned < x.max);
        const line = !c.max ? "Non misurata questa volta" : lost.length ? `Persi ${fmt(c.max - c.earned)} punti in ${lost.length} ${lost.length === 1 ? "controllo" : "controlli"}` : "Tutti i punti presi";
        const fill = el("i");
        fill.style.background = colour(c.id);
        fill.style.transitionDelay = motion ? `${i * 110}ms` : "0ms";
        fill.dataset.scale = String(Math.min(1, c.earned / c.weight));
        const dot = el("span", { class: "az-dot", "aria-hidden": "true" });
        dot.style.background = colour(c.id);
        return el(
          "li",
          { class: "az-cat" },
          el("div", { class: "az-cat__top" }, dot, el("span", { class: "az-cat__name" }, c.label), el("span", { class: "az-num" }, el("b", {}, fmt(c.earned)), `/${fmt(c.weight)}`)),
          el("div", { class: "az-bar", "aria-hidden": "true" }, fill),
          el("span", { class: "az-cat__line" }, line),
        );
      }),
    );
    const grow = () => {
      ring.fill(!motion);
      document.querySelectorAll<HTMLElement>(".az-bar > i").forEach((i) => (i.style.transform = `scaleX(${i.dataset.scale})`));
    };
    if (first && motion) window.setTimeout(grow, 120);
    else grow();
    countTo(r.total);

    // Summary sentence
    const byRatio = [...cats].filter((c) => c.max > 0).sort((a, b) => b.earned / b.weight - a.earned / a.weight || b.weight - a.weight);
    const byLost = [...cats].sort((a, b) => b.weight - b.earned - (a.weight - a.earned));
    const lostAny = r.checks.some((x) => x.max > 0 && x.status !== "unmeasured" && x.earned < x.max);
    $("[data-az-summary]").textContent = lostAny
      ? `Il sito prende ${r.total} punti su 100. Va meglio in ${byRatio[0].label.toLowerCase()}, perde di più in ${byLost[0].label.toLowerCase()}.`
      : `Il sito prende ${r.total} punti su 100: tutti i controlli misurati superati.`;

    // Fixes, with the score climbing
    const measuredMax = r.checks.filter((c) => c.max > 0 && c.status !== "unmeasured").reduce((t, c) => t + c.max, 0) || 100;
    const k = 100 / measuredMax;
    let run = r.total;
    const after = r.fixes.map((f) => (run = Math.min(100, Math.round(run + f.gain * k))));
    const dopo = after[after.length - 1] ?? r.total;
    $("[data-az-fixes-wrap]").hidden = !r.fixes.length;
    $("[data-az-fixes-title]").textContent = r.fixes.length === 1 ? "La cosa che vale più punti" : "Da sistemare per prime";
    $("[data-az-climb-from]").textContent = String(r.total);
    $("[data-az-climb-to]").textContent = String(dopo);
    // From 90 up the site is practically perfect: no race to 100.
    const nearlyPerfect = r.total >= PRACTICALLY_PERFECT;
    $("[data-az-climb]").hidden = nearlyPerfect;
    $("[data-az-climb-note]").hidden = !nearlyPerfect;
    if (nearlyPerfect) $("[data-az-fixes-title]").textContent = r.fixes.length === 1 ? "L'ultimo ritocco" : "Gli ultimi ritocchi";
    $("[data-az-fixes]").replaceChildren(
      ...r.fixes.map((f, i) =>
        el(
          "li",
          { class: "az-fix" },
          el("span", { class: "az-num" }, String(i + 1).padStart(2, "0")),
          el("div", { class: "az-fix__body" }, el("h3", {}, f.title), el("p", { class: "az-soft" }, cap(f.found)), el("p", {}, el("span", { class: "az-we" }, "Noi: "), f.fix)),
          el("span", { class: "az-gain" }, `+${fmt(f.gain)}`),
        ),
      ),
    );

    // Flags that need a look (the ones that are fine are left out)
    const warn = r.flags.filter((f) => f.status === "flag-warn");
    $("[data-az-flags-wrap]").hidden = !warn.length;
    $("[data-az-flags]").replaceChildren(...warn.map((f) => el("li", {}, el("span", {}, cap(f.found)), el("span", {}, f.why))));

    // Every check, by category
    $("[data-az-all]").replaceChildren(
      ...cats.map((c) => {
        const dot = el("span", { class: "az-dot", "aria-hidden": "true" });
        dot.style.background = colour(c.id);
        return el(
          "div",
          {},
          el("div", { class: "az-allcat__h" }, dot, el("h3", {}, c.label)),
          ...r.checks
            .filter((x) => x.category === c.id && x.max > 0)
            .map((x) => {
              const sd = el("span", { class: "az-dot", role: "img", "aria-label": STATUS_WORD[x.status] ?? "" });
              sd.style.background = STATUS_COLOUR[x.status] ?? "#AEAEB2";
              const fix = r.fixes.find((f) => f.id === x.id);
              return el(
                "details",
                { class: "az-check" },
                el("summary", {}, sd, el("span", {}, x.title), el("span", { class: "az-num" }, `${fmt(x.earned)}/${fmt(x.max)}`), el("span", { class: "az-plus az-noprint", "aria-hidden": "true" }, "+")),
                el("div", { class: "az-check__body" }, el("p", {}, cap(x.found)), fix ? el("p", { class: "az-soft" }, fix.why) : null, fix ? el("p", {}, el("span", { class: "az-we" }, "Noi: "), fix.fix) : null),
              );
            }),
        );
      }),
    );

    // What we can do: our own demo for this sector, measured with the same rubric, or no number at all
    const tpl = data.benchmark.templates[sector];
    const compare = $("[data-az-compare]");
    if (tpl) {
      compare.className = "az-compare";
      compare.replaceChildren(`${r.total} `, el("span", { class: "az-blue" }, `→ ${tpl.total}`));
      $("[data-az-compare-note]").replaceChildren(
        `Il nostro sito d'esempio per questo settore prende ${tpl.total} con la stessa griglia di ${r.checks.filter((x) => x.max > 0).length} controlli. È da lì che partiamo. `,
        el("a", { class: "az-link", href: tpl.path }, "Guardalo"),
      );
    } else {
      compare.className = "az-compare az-compare--small";
      compare.replaceChildren(`${r.total} `, el("span", { class: "az-blue" }, `→ ${dopo}`));
      $("[data-az-compare-note]").textContent = `Con le correzioni qui sopra arrivi a ${dopo}. Per questo settore non abbiamo ancora un sito d'esempio misurato, quindi non ti diamo un numero inventato.`;
    }
    const rec = recommendation.packageId === "su-misura" ? "su-misura" : recommendation.packageId;
    $("[data-az-packs]").replaceChildren(
      ...data.offer.packages.map((p) => {
        const mine = p.id === rec;
        return el(
          "div",
          { class: `az-pack${mine ? " az-pack--rec" : ""}`, "data-pacchetto": p.id },
          el("div", { class: "az-pack__top" }, el("h3", {}, p.name), mine ? el("span", { class: "az-pack__tag" }, "Consigliato") : null),
          el("p", { class: "az-pack__price" }, euro(p.price)),
          el("p", { class: "az-pack__desc" }, p.forWhom),
          el("ul", {}, ...p.includes.map((i) => el("li", {}, el("span", { "aria-hidden": "true" }, "✓"), el("span", {}, i)))),
        );
      }),
    );
    const recName = data.offer.packages.find((p) => p.id === rec)?.name ?? "";
    $("[data-az-reason]").textContent = recName ? `Perché ${recName}: ${recommendation.reason}` : "";
  }

  /* ---------- The one call to action ---------- */
  const leadForm = $<HTMLFormElement>("[data-az-lead]");
  const leadErr = $("[data-az-lead-err]");
  const setLeadErr = (msg: string | (Node | string)[]) => {
    if (typeof msg === "string") leadErr.textContent = msg;
    else leadErr.replaceChildren(...msg);
    leadErr.hidden = typeof msg === "string" ? !msg : !msg.length;
  };
  leadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (leadForm.elements.namedItem("email") as HTMLInputElement).value.trim();
    const consent = $<HTMLInputElement>("[data-az-consent]").checked;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setLeadErr("Controlla la email: sembra incompleta.");
    if (!consent) return setLeadErr("Per mandarti l'anteprima ci serve il tuo consenso.");
    if (isSample || !current) return setLeadErr("Questo è un esempio: analizza prima il tuo sito, poi chiedici l'anteprima.");
    setLeadErr("");
    const sector = sectorNow.value as SectorId;
    const btn = leadForm.querySelector<HTMLButtonElement>("button[type=submit]")!;
    btn.disabled = true;
    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          url: current.page.finalUrl,
          score: current.results[sector].report.total,
          sector,
          consent: true,
          consentVersion: data.consent.version,
          website: (leadForm.elements.namedItem("website") as HTMLInputElement).value,
        }),
      });
      const body = await r.json().catch(() => null);
      if (r.status === 503 || r.status === 404) {
        setLeadErr(["Da qui la richiesta non parte ancora. ", el("a", { class: "az-link", href: "/anteprima-gratuita/" }, "Chiedi l'anteprima con il modulo"), ` e scrivi l'indirizzo ${host(current.page.finalUrl)}.`]);
        btn.disabled = false;
        return;
      }
      if (!r.ok) throw new Error(body?.error || "Non siamo riusciti a inviare la richiesta. Riprova tra poco.");
      leadForm.hidden = true;
      const sent = $("[data-az-sent]");
      sent.textContent = `Ricevuto. Ti scriviamo a ${email}.`;
      sent.hidden = false;
    } catch (x) {
      setLeadErr((x as Error).message);
      btn.disabled = false;
    }
  });

  /* ---------- Deep links: run last, once everything above exists ---------- */
  // #voto-<key> (or ?esempio=<key>, which survives previews that drop the hash), key = vecchio | curato | fatto-bene
  // open an example report; ?url=... (from the home's box) starts an analysis straight away.
  const params = new URLSearchParams(location.search);
  const totalOf = (f: FullAnalysis) => String(f.results[f.chosen].report.total);
  // Keys, plus the names and numbers older links used.
  const alias: Record<string, string> = { esempio: "curato", "1": "curato", "12": "vecchio", ottimo: "fatto-bene", "2": "fatto-bene", "97": "fatto-bene" };
  const pickSample = (v: string | null) => {
    if (!v) return "";
    const hit = data.examples.find((e) => e.key === v || totalOf(e.full) === v);
    return hit?.key ?? (alias[v] && data.examples.some((e) => e.key === alias[v]) ? alias[v] : "");
  };
  // #voto-esempio, #voto-ottimo (and the score numbers, for old links) or ?esempio=1 / 2
  const sampleFromLink = () => pickSample(location.hash.match(/^#voto-([\w-]+)$/)?.[1] ?? null) || pickSample(params.get("esempio"));
  const linked = sampleFromLink();
  if (linked) openSample(linked);
  window.addEventListener("hashchange", () => {
    const w = pickSample(location.hash.match(/^#voto-([\w-]+)$/)?.[1] ?? null);
    if (w) openSample(w);
  });
  const fromHome = params.get("url");
  if (fromHome && !linked) {
    urlInput.value = fromHome.slice(0, 300);
    const s = params.get("settore");
    if (s && data.sectors.some((x) => x.id === s)) sectorPick.value = s;
    form.requestSubmit();
  }
}
