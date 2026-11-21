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
  if (total >= 90) return { id: "top", text: "Ottimo: il sito lavora bene" };
  if (total >= 75) return { id: "good", text: "Buono, con qualche punto da recuperare" };
  if (total >= 50) return { id: "mid", text: "Buone basi, ma perde punti importanti" };
  return { id: "low", text: "Molto da sistemare" };
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
  const startSteps = () => {
    steps.hidden = false;
    setStep(0);
    let n = 0;
    window.clearInterval(stepTimer);
    stepTimer = window.setInterval(() => {
      if (n < 2) setStep(++n);
    }, 1800);
  };
  const stopSteps = () => {
    window.clearInterval(stepTimer);
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
      err.textContent = offline ? "L'analisi dal vivo non risponde da qui. Riprova tra poco, o guarda l'esempio qui sotto." : (x as Error).message;
    } finally {
      stopSteps();
      busy = false;
      btn.disabled = false;
      btn.textContent = "Analizza il sito";
    }
  });

  $("[data-sc-sample]").addEventListener("click", () => {
    isSample = true;
    show(data.sample);
  });
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
    ring.setAttribute("aria-label", `Punteggio ${report.total} su 100`);
    const arc = $<SVGCircleElement>("[data-sc-arc]");
    arc.style.strokeDashoffset = String(439.82 * (1 - report.total / 100));
    $("[data-sc-verdict]").textContent = b.text;
    $("[data-sc-url]").textContent = report.url;
    const notes: string[] = [];
    if (full.guessed === sector && sector !== "altro") notes.push(`Dalla pagina ci sembra: ${data.sectors.find((s) => s.id === sector)?.label.toLowerCase()}. Se non è così, cambia qui sopra: il punteggio si ricalcola subito.`);
    if (sector === "altro") notes.push("Con \"Altro\" controlliamo solo quello che serve a qualsiasi attività.");
    if (report.partial) notes.push("Questa volta non siamo riusciti a misurare la velocità: il punteggio conta solo i controlli misurati. Riprova più tardi per il quadro completo.");
    else if (report.perfSource === "lab") notes.push("Velocità misurata con una nostra prova da telefono: Google non ha ancora abbastanza dati dalle visite reali.");
    else if (report.perfSource === "field") notes.push("Velocità misurata sulle visite reali degli ultimi 28 giorni (dati di Google).");
    $("[data-sc-note]").textContent = notes.join(" ");

    const n = $("[data-sc-total]");
    if (!animate || reduced()) {
      n.textContent = String(report.total);
      return;
    }
    const t0 = performance.now();
    const dur = 1100;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      n.textContent = String(Math.round(report.total * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function drawCats(report: Report) {
    const box = $("[data-sc-cats]");
    box.replaceChildren(
      ...report.categories.map((c) =>
        el(
          "div",
          { class: "sc-cat" },
          el("p", { class: "sc-cat__row" }, el("span", {}, c.label), el("span", {}, c.measured ? `${pts(c.earned)} su ${c.max}` : "non misurata")),
          bar(c.max ? c.earned / c.max : 0),
        ),
      ),
    );
  }

  function drawFixes(report: Report) {
    const box = $("[data-sc-fixes]");
    if (!report.fixes.length) {
      box.replaceChildren(el("li", { class: "sc-fix" }, el("p", {}, "Niente da recuperare: tutti i controlli misurati sono pieni.")));
      return;
    }
    box.replaceChildren(
      ...report.fixes.map((f) =>
        el(
          "li",
          { class: "sc-fix" },
          el("p", { class: "sc-fix__gain" }, `+${pts(f.gain)}`, el("small", {}, "punti")),
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
      if (!r.ok) throw new Error(body?.error || "Non siamo riusciti a inviare la richiesta. Riprova o scrivici su WhatsApp.");
      $("[data-sc-lead-ok]").hidden = false;
      leadForm.querySelectorAll("input, button").forEach((x) => ((x as HTMLInputElement).disabled = true));
    } catch (x) {
      leadErr.textContent = (x as Error).message;
      btn.disabled = false;
    }
  });
}
