/**
 * The Website Scorer page: sends the address to /api/score, then draws the report it returns.
 * Every string from the analysed page is inserted as text (never as HTML): "found" sentences can
 * quote the page's own title or headings. Motion: the ring fades and scales in and the bars grow
 * with transform only, inside prefers-reduced-motion: no-preference (CSS); the number counts up
 * only when motion is allowed. No layout shift: the result section is shown once, fully built.
 */
import type { FullAnalysis } from "../scorer/analyze";
import type { Report, SectorId } from "../scorer/types";

interface Pkg {
  id: string;
  name: string;
  price: number;
  forWhom: string;
  includes: string[];
}
interface Data {
  sectors: { id: SectorId; label: string }[];
  offer: {
    packages: Pkg[];
    care: { name: string; pricePerMonth: number; line: string; includes: string[] };
    sectorLines: Record<string, Record<string, string>>;
  };
  benchmark: { templates: Record<string, { label: string; path: string; total: number; categories?: { id: string; label: string; earned: number; max: number }[] }> };
  consent: { version: string; text: string };
  sample: FullAnalysis;
  sampleGood: FullAnalysis;
  checkTitles: string[];
  rubricVersion: string;
}

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)!;
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const euro = (n: number) => `${n.toLocaleString("it-IT")} €`;
const pts = (n: number) => (Math.round(n * 10) / 10).toLocaleString("it-IT");

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...kids: (Node | string | null | undefined)[]) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else e.setAttribute(k, v);
  }
  for (const k of kids) if (k != null) e.append(typeof k === "string" ? document.createTextNode(k) : k);
  return e;
}

function band(total: number) {
  if (total >= 90) return { id: "top", text: "Ottimo" };
  if (total >= 75) return { id: "good", text: "Buono" };
  if (total >= 50) return { id: "mid", text: "Discreto" };
  return { id: "low", text: "Da sistemare" };
}

/** One colour per category, the same in the ring, the legend and the bars. */
const CAT_COLOR: Record<string, string> = {
  speed: "#5aa2ff",
  conversion: "#ff9446",
  local: "#3cc9ae",
  trust: "#b08cff",
  a11y: "#ffd23f",
  legal: "#ff7aa0",
  content: "#94da5c",
};

/**
 * The score ring, like a sleep score: one arc per category, its length the category's weight, filled
 * as far as its points. Each fill grows by rotating inside a wedge that clips it (transform only).
 */
function drawArcs(svg: SVGSVGElement, report: Report) {
  const R = 80;
  const C2 = 2 * Math.PI * R;
  const gap = 5;
  const cats = report.categories.map((c) => {
    const weight = report.checks.filter((x) => x.category === c.id && x.max > 0).reduce((t, x) => t + x.max, 0);
    return { c, weight, ratio: weight ? Math.min(1, c.earned / weight) : 0 };
  }).filter((x) => x.weight > 0);
  const total = cats.reduce((t, x) => t + x.weight, 0) || 100;
  const pt = (deg: number, r: number) => `${100 + r * Math.cos((deg * Math.PI) / 180)} ${100 + r * Math.sin((deg * Math.PI) / 180)}`;
  const mk = (tag: string, attrs: Record<string, string>) => {
    const e = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };
  const defs = mk("defs", {});
  const root = mk("g", { transform: "rotate(-90 100 100)" });
  let acc = 0;
  cats.forEach(({ c, weight, ratio }, i) => {
    const span = (weight / total) * 360;
    const start = acc + gap / 2;
    const len = Math.max(0.5, span - gap);
    acc += span;
    const color = CAT_COLOR[c.id] ?? "#fff";
    const dash = (deg: number) => `${(deg / 360) * C2} ${C2}`;
    const off = String(-(start / 360) * C2);
    root.append(mk("circle", { cx: "100", cy: "100", r: String(R), class: "sc-arc__track", stroke: color, "stroke-dasharray": dash(len), "stroke-dashoffset": off }));
    const id = `sc-w${i}`;
    const clip = mk("clipPath", { id });
    clip.append(mk("path", { d: `M100 100 L${pt(start, 110)} A110 110 0 ${len > 180 ? 1 : 0} 1 ${pt(start + len, 110)} Z` }));
    defs.append(clip);
    const fillDeg = len * ratio;
    const holder = mk("g", { "clip-path": `url(#${id})` });
    const fill = mk("g", { class: "sc-arc__fill" });
    (fill as SVGGElement).style.setProperty("--from", `${-fillDeg}deg`);
    (fill as SVGGElement).style.setProperty("--i", String(i));
    if (fillDeg > 0) fill.append(mk("circle", { cx: "100", cy: "100", r: String(R), stroke: color, "stroke-dasharray": dash(fillDeg), "stroke-dashoffset": off }));
    const t = mk("title", {});
    t.textContent = `${c.label}: ${pts(c.earned)} su ${weight}`;
    holder.append(fill, t);
    root.append(holder);
  });
  svg.replaceChildren(defs, root);
}

const SVG = "http://www.w3.org/2000/svg";
const C = 2 * Math.PI * 70;

/** Ring segments: one arc per item, length proportional to its weight, small gaps between. */
function segments(svg: SVGSVGElement, items: { w: number; cls: string; title?: string }[], gapDeg = 1.6) {
  const total = items.reduce((t, x) => t + x.w, 0) || 1;
  const gap = (gapDeg / 360) * C;
  let at = 0;
  svg.replaceChildren(
    ...items.map((x, i) => {
      const len = (x.w / total) * C;
      const c = document.createElementNS(SVG, "circle");
      c.setAttribute("cx", "80");
      c.setAttribute("cy", "80");
      c.setAttribute("r", "70");
      c.setAttribute("class", x.cls);
      c.style.setProperty("--i", String(i));
      c.setAttribute("stroke-dasharray", `${Math.max(0.5, len - gap)} ${C}`);
      c.setAttribute("stroke-dashoffset", String(-at));
      if (x.title) {
        const t = document.createElementNS(SVG, "title");
        t.textContent = x.title;
        c.append(t);
      }
      at += len;
      return c;
    }),
  );
}

function bar(ratio: number, after = false) {
  const i = el("i");
  i.style.setProperty("--v", String(Math.max(0, Math.min(1, ratio))));
  return el("div", { class: `sc-bar${after ? " sc-bar--after" : ""}`, "aria-hidden": "true" }, i);
}

export function initScorer() {
  const data = JSON.parse($("#sc-data").textContent || "{}") as Data;
  const form = $<HTMLFormElement>("[data-sc-form]");
  const err = $("[data-sc-error]");
  const steps = $("[data-sc-steps]");
  const result = $("[data-sc-result]");
  const offerSec = $("[data-sc-offer]");
  const cta = $("[data-sc-cta]");
  const sectorNow = $<HTMLSelectElement>("[data-sc-sector-now]");
  let current: FullAnalysis | null = null;
  let isSample = false;
  let busy = false;

  // Progress: the server does everything in one request, so the list moves on typical timings and
  // waits on the speed step (the slow one) until the answer arrives. No percentages, no fake bar.
  let stepTimer = 0;
  const setStep = (n: number) => {
    steps.querySelectorAll("li").forEach((li, i) => {
      li.classList.toggle("is-done", i < n);
      li.classList.toggle("is-now", i === n);
      if (i === n) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });
  };
  const scan = $("[data-sc-scan]");
  const scanT = $("[data-sc-scan-t]");
  let scanTimer = 0;
  segments($<SVGSVGElement>("[data-sc-scan-ring]"), data.checkTitles.map(() => ({ w: 1, cls: "sc-scan__seg" })), 4);
  const startSteps = () => {
    steps.hidden = false;
    scan.hidden = false;
    let k = 0;
    scanT.textContent = data.checkTitles[0];
    window.clearInterval(scanTimer);
    if (!reduced()) scanTimer = window.setInterval(() => (scanT.textContent = data.checkTitles[++k % data.checkTitles.length]), 700);
    setStep(0);
    let n = 0;
    window.clearInterval(stepTimer);
    stepTimer = window.setInterval(() => {
      if (n < 2) setStep(++n);
    }, 1800);
  };
  const stopSteps = () => {
    window.clearInterval(stepTimer);
    window.clearInterval(scanTimer);
    scan.hidden = true;
    setStep(3);
    window.setTimeout(() => (steps.hidden = true), 400);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    const url = (form.elements.namedItem("url") as HTMLInputElement).value.trim();
    const sector = (form.elements.namedItem("sector") as HTMLSelectElement).value || undefined;
    const input = form.elements.namedItem("url") as HTMLInputElement;
    if (!url) {
      err.textContent = "Scrivi l'indirizzo del sito.";
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }
    input.removeAttribute("aria-invalid");
    err.textContent = "";
    busy = true;
    const btn = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
    btn.disabled = true;
    btn.textContent = "Analisi in corso";
    startSteps();
    try {
      const r = await fetch("/api/score", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, sector }) });
      const body = await r.json().catch(() => null);
      if (!r.ok || !body || body.error) throw new Error(body?.error || "Non siamo riusciti ad analizzare il sito. Riprova tra qualche minuto.");
      isSample = false;
      show(body as FullAnalysis);
    } catch (x) {
      const offline = x instanceof TypeError || (x as Error).message.includes("JSON");
      err.textContent = offline
        ? realEl
          ? "In questa pagina di prova l'analisi dal vivo non parte: scegli un sito vero qui sotto, o scrivi l'indirizzo in chat e lo analizziamo."
          : "L'analisi dal vivo non risponde da qui. Riprova tra poco, o guarda l'esempio qui sotto."
        : (x as Error).message;
    } finally {
      stopSteps();
      busy = false;
      btn.disabled = false;
      btn.textContent = "Analizza il sito";
    }
  });

  document.querySelectorAll<HTMLButtonElement>("[data-sc-sample]").forEach((b) =>
    b.addEventListener("click", () => {
      isSample = true;
      show(b.dataset.scSample === "good" ? data.sampleGood : data.sample);
    }),
  );
  // Private test page only: real sites analysed in advance, injected as #sc-real (never in the public build).
  const realEl = document.getElementById("sc-real");
  if (realEl) {
    const real = JSON.parse(realEl.textContent || "[]") as FullAnalysis[];
    const pick = el(
      "select",
      { id: "sc-real-pick", class: "sc-real__pick" },
      el("option", { value: "" }, "Scegli un sito"),
      ...real.map((r, i) => el("option", { value: String(i) }, `${r.page.finalUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")} (${r.results[r.chosen].report.total})`)),
    );
    pick.addEventListener("change", () => {
      const r = real[Number((pick as HTMLSelectElement).value)];
      if (!r) return;
      isSample = false;
      show(r);
    });
    $("[data-sc-sample]").closest("p")!.after(
      el(
        "div",
        { class: "sc-real" },
        el("p", { class: "sc-real__k" }, "Pagina di prova privata: siti veri analizzati davvero, con il motore vero. Non condividere."),
        el("label", { for: "sc-real-pick" }, "Siti veri già analizzati"),
        pick,
      ),
    );
  }

  $("[data-sc-print]").addEventListener("click", () => {
    const all = $<HTMLDetailsElement>(".sc-all");
    all.open = true;
    window.print();
  });
  sectorNow.addEventListener("change", () => {
    if (current) render(current, sectorNow.value as SectorId, false);
  });

  function show(full: FullAnalysis) {
    current = full;
    render(full, full.chosen, true);
    result.hidden = false;
    offerSec.hidden = false;
    cta.hidden = false;
    result.focus({ preventScroll: true });
    result.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
  }

  function render(full: FullAnalysis, sector: SectorId, animate: boolean) {
    const { report, recommendation } = full.results[sector];
    sectorNow.value = sector;
    $("[data-sc-sample-note]").hidden = !isSample;
    drawTop(report, full, sector, animate);
    drawCats(report);
    drawWhy(report);
    drawFixes(report);
    drawFlags(report);
    drawAll(report);
    drawOffer(report, recommendation, sector);
    const wrap = result;
    wrap.classList.add("sc-anim");
    wrap.classList.remove("is-in");
    offerSec.classList.add("sc-anim");
    offerSec.classList.remove("is-in");
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        wrap.classList.add("is-in");
        offerSec.classList.add("is-in");
      }),
    );
  }

  function drawTop(report: Report, full: FullAnalysis, sector: SectorId, animate: boolean) {
    const ring = $("[data-sc-ring]");
    const b = band(report.total);
    ring.dataset.band = b.id;
    ring.setAttribute("aria-label", `Punteggio ${report.total} su 100: ${b.text.toLowerCase()}`);
    drawArcs($<SVGSVGElement>("[data-sc-arcs]"), report);
    $("[data-sc-verdict]").textContent = b.text;
    $("[data-sc-url]").textContent = report.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
    const when = new Date(report.measuredAt).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
    const speedSrc = report.perfSource === "field" ? "velocità dalle visite reali" : report.perfSource === "lab" ? "velocità da una prova da telefono" : "velocità non misurata";
    $("[data-sc-meta]").replaceChildren(el("span", {}, report.sectorLabel), el("span", {}, `analizzato il ${when}`), el("span", {}, speedSrc));

    const notes: string[] = [];
    if (full.guessed === sector && sector !== "altro") notes.push("Il settore l'abbiamo capito dalla pagina: se non è giusto, cambialo in alto e il punteggio si ricalcola subito.");
    if (sector === "altro") notes.push("Con \"Altro\" controlliamo solo quello che serve a qualsiasi attività.");
    if (report.partial) notes.push("Questa volta la velocità non è stata misurata: il voto conta solo i controlli misurati.");
    $("[data-sc-note]").textContent = notes.join(" ");

    // Summary in words: strongest and weakest category, the first fix, how many checks passed.
    const scored = report.categories.filter((c) => c.max > 0);
    const byRatio = [...scored].sort((a, c) => c.earned / c.max - a.earned / a.max);
    const best = byRatio[0];
    const worst = [...scored].sort((a, c) => c.max - c.earned - (a.max - a.earned))[0];
    const passed = report.checks.filter((c) => c.max > 0 && c.status === "pass").length;
    const measured = report.checks.filter((c) => c.max > 0 && c.status !== "unmeasured").length;
    $("[data-sc-summary]").textContent =
      report.total >= 90
        ? `Il sito fa bene quasi tutto quello che controlliamo: ${report.total} punti su 100.`
        : `Il sito prende ${report.total} punti su 100. Va meglio in ${best.label.toLowerCase()}, perde di più in ${worst.label.toLowerCase()}: da lì viene la maggior parte dei punti mancanti.`;
    const hl: [string, string][] = [
      ["Punto forte", `${best.label} (${pts(best.earned)} su ${best.max})`],
      ["Da sistemare per primo", report.fixes[0] ? `${report.fixes[0].title} (+${pts(report.fixes[0].gain)} punti)` : "Niente di urgente"],
      ["Controlli superati in pieno", `${passed} su ${measured}`],
    ];
    $("[data-sc-highlights]").replaceChildren(...hl.flatMap(([k, v]) => [el("dt", {}, k), el("dd", {}, v)]));

    const n = $("[data-sc-total]");
    if (!animate || reduced()) {
      n.textContent = String(report.total);
      return;
    }
    const t0 = performance.now();
    const dur = 1400;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      n.textContent = String(Math.round(report.total * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // The legend under the ring: colour, name, points, a bar in the same colour, where the points went.
  function drawCats(report: Report) {
    const box = $("[data-sc-cats]");
    box.replaceChildren(
      ...report.categories
        .filter((c) => report.checks.some((x) => x.category === c.id && x.max > 0))
        .map((c, i) => {
          const weight = report.checks.filter((x) => x.category === c.id && x.max > 0).reduce((t, x) => t + x.max, 0);
          const lost = report.checks.filter((x) => x.category === c.id && x.max > 0 && x.status !== "unmeasured" && x.earned < x.max);
          const notMeasured = report.checks.some((x) => x.category === c.id && x.status === "unmeasured");
          const note = !c.max
            ? "Non misurata questa volta."
            : lost.length
              ? `Persi ${pts(c.max - c.earned)} punti in ${lost.length} ${lost.length === 1 ? "controllo" : "controlli"}.`
              : notMeasured ? "Pieno nella parte misurata." : "Tutti i punti.";
          const li = el(
            "li",
            { class: "sc-leg" },
            el("span", { class: "sc-leg__dot", "aria-hidden": "true" }),
            el("span", { class: "sc-leg__name" }, c.label),
            el("span", { class: "sc-leg__pts" }, c.max ? `${pts(c.earned)}/${weight}` : "n.m."),
            bar(weight ? c.earned / weight : 0),
            el("span", { class: "sc-leg__note" }, note),
          );
          li.style.setProperty("--c", CAT_COLOR[c.id] ?? "#fff");
          li.style.setProperty("--i", String(i));
          return li;
        }),
    );
  }

  // "Perché 63 e non 100": every lost point, heaviest first, each with what we found.
  function drawWhy(report: Report) {
    const box = $("[data-sc-why]");
    const lost = report.checks
      .filter((x) => x.max > 0 && x.status !== "unmeasured" && x.earned < x.max)
      .sort((a, b) => b.max - b.earned - (a.max - a.earned));
    const passed = report.checks.filter((x) => x.max > 0 && x.status === "pass").length;
    const measured = report.checks.filter((x) => x.max > 0 && x.status !== "unmeasured").length;
    const head = el("h3", { class: "sc-card__h" }, report.total >= 100 ? "Perché 100" : `Perché ${report.total} e non 100`);
    const intro = el(
      "p",
      { class: "sc-sub" },
      report.total >= 100
        ? `Tutti i ${measured} controlli misurati sono pieni. 100 vuol dire che non abbiamo trovato niente da sistemare, non che il sito porti per forza più clienti.`
        : `Il punteggio è la somma di ${measured} controlli, ognuno con i suoi punti (in tutto 100). Ne hai superati ${passed} in pieno; i punti mancanti vengono ${lost.length === 1 ? "da questo controllo" : `da questi ${lost.length}, dal più pesante`}.` +
          (report.partial ? " Alcuni controlli non sono stati misurati: il voto è la quota dei punti misurati." : ""),
    );
    const list = el(
      "ul",
      { class: "sc-why" },
      ...lost.map((x) =>
        el(
          "li",
          {},
          el("span", { class: "sc-why__pts" }, `−${pts(x.max - x.earned)}`),
          el("span", {}, el("strong", {}, x.title), x.status === "partial" ? " (in parte)" : "", el("small", {}, x.found)),
        ),
      ),
    );
    box.replaceChildren(head, intro, ...(lost.length ? [list] : []));
  }

  function drawFixes(report: Report) {
    const box = $("[data-sc-fixes]");
    if (!report.fixes.length) {
      $("[data-sc-climb]").textContent = "";
      box.replaceChildren(el("li", { class: "sc-fix" }, el("p", {}, "Niente da recuperare: tutti i controlli misurati sono pieni.")));
      return;
    }
    // Running total: what the score becomes as each fix is added (scaled when speed was not measured).
    const measuredMax = report.checks.filter((c) => c.max > 0 && c.status !== "unmeasured").reduce((t, c) => t + c.max, 0) || 100;
    const k = 100 / measuredMax;
    let run = report.total;
    const runs = report.fixes.map((f) => (run = Math.min(100, Math.round(run + f.gain * k))));
    $("[data-sc-climb]").replaceChildren("Sistemando queste ", String(report.fixes.length), " cose passi da ", el("strong", {}, String(report.total)), " a ", el("strong", {}, String(runs[runs.length - 1] ?? report.total)), ".");
    box.replaceChildren(
      ...report.fixes.map((f, i) =>
        el(
          "li",
          { class: "sc-fix" },
          el("p", { class: "sc-fix__gain" }, `+${pts(f.gain)}`, el("small", {}, "punti"), el("span", { class: "sc-fix__run" }, `poi sei a ${runs[i]}`)),
          el(
            "div",
            {},
            el("h3", {}, f.title),
            el("p", { class: "sc-fix__found" }, f.found),
            el("p", {}, f.why),
            el("p", { class: "sc-fix__do" }, `Cosa facciamo noi: ${f.fix}`),
          ),
        ),
      ),
    );
  }

  function drawFlags(report: Report) {
    const box = $("[data-sc-flags]");
    $("[data-sc-flags-wrap]").hidden = !report.flags.length;
    box.replaceChildren(
      ...report.flags.map((f) =>
        el("li", { class: `sc-flag${f.status === "flag-warn" ? " sc-flag--warn" : ""}` }, el("strong", {}, f.title), el("p", {}, f.found), el("p", {}, f.why)),
      ),
    );
  }

  function drawAll(report: Report) {
    const box = $("[data-sc-all]");
    const mark = { pass: ["✓", "superato"], partial: ["~", "in parte"], fail: ["✗", "da sistemare"], unmeasured: ["?", "non misurato"] } as Record<string, [string, string]>;
    box.replaceChildren(
      ...report.categories.flatMap((cat) => [
        el("h3", {}, cat.label),
        el(
          "ul",
          {},
          ...report.checks
            .filter((c) => c.category === cat.id && c.max > 0)
            .map((c) => {
              const [sym, word] = mark[c.status] ?? ["", ""];
              return el(
                "li",
                {},
                el("span", { class: `sc-mark sc-mark--${c.status}`, "aria-label": word }, sym),
                el("span", {}, c.title, el("small", {}, c.found)),
                el("span", {}, `${pts(c.earned)}/${c.max}`),
              );
            }),
        ),
      ]),
    );
  }

  function drawOffer(report: Report, rec: { packageId: string; reason: string }, sector: SectorId) {
    const tpl = data.benchmark.templates[sector];
    const lead = $("[data-sc-proj-lead]");
    const proj = $("[data-sc-proj]");
    if (tpl) {
      lead.textContent = `Abbiamo misurato con la stessa griglia il sito d'esempio che abbiamo costruito per questo settore. È un numero misurato, non una promessa: sul tuo dipende anche da foto, testi e recensioni vere.`;
      const link = el("a", { href: tpl.path }, `Guarda ${tpl.label}`);
      proj.replaceChildren(
        el(
          "p",
          { class: "sc-compare", "aria-label": `Il tuo sito oggi ${report.total}, il nostro sito d'esempio ${tpl.total}` },
          el("span", { class: "sc-compare__n" }, String(report.total), el("small", {}, "il tuo sito oggi")),
          el("span", { class: "sc-compare__arrow", "aria-hidden": "true" }, "→"),
          el("span", { class: "sc-compare__n" }, String(tpl.total), el("small", {}, "il sito che costruiamo noi")),
        ),
        el("div", {}, el("p", { class: "sc-cat__row" }, el("span", {}, "Il tuo sito oggi"), el("span", {}, `${report.total} su 100`)), bar(report.total / 100)),
        el("div", {}, el("p", { class: "sc-cat__row" }, el("span", {}, "Il sito che costruiamo noi, misurato"), el("span", {}, `${tpl.total} su 100`)), bar(tpl.total / 100, true)),
        el("p", {}, link),
      );
    } else {
      lead.textContent = "Per questo settore non abbiamo ancora un sito d'esempio misurato, quindi non ti diamo un numero inventato. Sistemiamo i punti qui sopra con lo stesso metodo che porta i nostri siti d'esempio sopra 90.";
      proj.replaceChildren();
    }

    const lines = data.offer.sectorLines[sector] ?? data.offer.sectorLines.altro;
    const middle = data.offer.packages[1]?.id;
    $("[data-sc-plans]").replaceChildren(
      ...data.offer.packages.map((p) => {
        const mine = p.id === rec.packageId;
        return el(
          "li",
          { class: `hs-plan${p.id === middle ? " hs-plan--rec" : ""}` },
          el("div", { class: "hs-plan__top" }, el("h3", {}, p.name), mine ? el("span", { class: "sc-plan__mine" }, "Consigliato per te") : null),
          el("p", { class: "hs-plan__for" }, p.forWhom),
          el("p", { class: "hs-plan__num" }, euro(p.price)),
          el("ul", {}, ...p.includes.map((i) => el("li", {}, i.startsWith("@") ? (lines[i] ?? "") : i))),
        );
      }),
    );
    $("[data-sc-reason]").textContent = `Perché te lo consigliamo: ${rec.reason}`;
    const care = data.offer.care;
    $("[data-sc-care]").replaceChildren(
      el("p", {}, el("strong", {}, `${care.name}, ${euro(care.pricePerMonth)} al mese`), ` (facoltativa). ${care.line}`),
      el("p", {}, care.includes.join(". ") + "."),
    );
  }

  // The one call to action: email + consent (unticked), sent only with the box ticked.
  const leadForm = $<HTMLFormElement>("[data-sc-lead]");
  const leadErr = $("[data-sc-lead-error]");
  leadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (leadForm.elements.namedItem("email") as HTMLInputElement).value.trim();
    const consent = $<HTMLInputElement>("[data-sc-consent]").checked;
    leadErr.textContent = "";
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      leadErr.textContent = "Controlla l'indirizzo email.";
      return;
    }
    if (!consent) {
      leadErr.textContent = "Senza il consenso non possiamo scriverti: spunta la casella se vuoi riceverla.";
      return;
    }
    if (isSample || !current) {
      leadErr.textContent = "Questo è un esempio: analizza prima il tuo sito, poi chiedici l'anteprima.";
      return;
    }
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
        // Storage not set up yet (or the static preview): the site's own request form still works.
        leadErr.replaceChildren("Da qui la richiesta non parte ancora. ", el("a", { class: "link", href: "/anteprima-gratuita/" }, "Chiedi l'anteprima con il modulo"), ` e scrivi l'indirizzo ${current.page.finalUrl}.`);
        btn.disabled = false;
        return;
      }
      if (!r.ok) throw new Error(body?.error || "Non siamo riusciti a inviare la richiesta. Riprova tra poco.");
      $("[data-sc-lead-ok]").hidden = false;
      leadForm.querySelectorAll("input, button").forEach((x) => ((x as HTMLInputElement).disabled = true));
    } catch (x) {
      leadErr.textContent = (x as Error).message;
      btn.disabled = false;
    }
  });
}
