import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
// Phones: the address bar showing and hiding must not re-measure every trigger (jumps on iOS and Android).
ScrollTrigger.config({ ignoreMobileResize: true });

/**
 * Motion for the inner pages' pictures (components/visual/*) and the page colour play.
 * Each part looks for its own data attribute; with reduced motion nothing runs and every
 * picture stays in its final, readable state.
 *
 *   [data-sector-focus]       Lo studio: the sector rolls inside the orange pill
 *   [data-lens]               Il nome: a photo is taken, then only the middle stays sharp
 *   [data-fan]                the mouse spreads the fanned phone screens (they deal in with CSS)
 *   [data-float="n"]          floats n% against the scroll (closing screens)
 */
export function initInner() {
  if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
  sectorFocus();
  lens();
  fan();
  floats();
}

function sectorFocus() {
  const root = document.querySelector<HTMLElement>("[data-sector-focus]");
  if (!root) return;
  const pill = root.querySelector<HTMLElement>("[data-sk-pill]")!;
  const words = Array.from(root.querySelectorAll<HTMLElement>("[data-sk-word]"));
  const ticks = Array.from(root.querySelectorAll<HTMLElement>(".sk__ticks i"));
  root.classList.add("is-live");
  let i = 0;
  const fit = () => {
    const pad = parseFloat(getComputedStyle(pill).paddingLeft);
    pill.style.width = `${words[i].scrollWidth + pad * 2}px`;
  };
  const show = (next: number) => {
    const prev = i;
    i = next;
    words.forEach((w, j) => {
      w.classList.toggle("is-on", j === i);
      w.classList.toggle("is-out", j === prev && prev !== i);
    });
    ticks.forEach((t, j) => t.classList.toggle("is-on", j === i));
    fit();
    // The word that left upwards goes back below without being seen.
    window.setTimeout(() => {
      const w = words[prev];
      if (prev === i) return;
      w.style.transition = "none";
      w.classList.remove("is-out");
      void w.offsetWidth;
      w.style.transition = "";
    }, 750);
  };
  show(0);
  let timer = 0;
  const run = (on: boolean) => {
    clearInterval(timer);
    if (on) timer = window.setInterval(() => show((i + 1) % words.length), 1900);
  };
  // Only while it is on screen.
  new IntersectionObserver(([e]) => run(e.isIntersecting)).observe(root);
  addEventListener("resize", fit);
  document.fonts?.ready.then(fit);
}

/**
 * Il nome, as a photo being taken: at first everything on the screen is sharp (all the clutter of
 * an old site), the focus hunts for the middle, then the shutter fires (flash) and from that
 * moment only the middle is sharp, the rest falls out of focus. It shoots again each time the
 * viewfinder comes back into view.
 */
function lens() {
  const root = document.querySelector<HTMLElement>("[data-lens]");
  if (!root) return;
  let timers: number[] = [];
  const shoot = () => {
    timers.forEach(clearTimeout);
    root.classList.remove("is-shot");
    root.classList.add("is-hunting");
    timers = [
      window.setTimeout(() => {
        root.classList.remove("is-hunting");
        root.classList.add("is-shot");
      }, 1700),
    ];
  };
  new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) shoot();
      else {
        timers.forEach(clearTimeout);
        root.classList.remove("is-shot", "is-hunting");
      }
    },
    { threshold: 0.6 },
  ).observe(root);
  root.classList.add("is-live");
}

function fan() {
  document.querySelectorAll<HTMLElement>("[data-fan]").forEach((root) => {
    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-fan-card]"));
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    // The fanned pose comes from CSS (--i): read it at the first hover, once the deal-in is over.
    let base: { x: number; r: number }[] | null = null;
    const spread = (k: number) =>
      cards.forEach((c, j) => {
        base ??= cards.map((el) => ({ x: Number(gsap.getProperty(el, "x")), r: Number(gsap.getProperty(el, "rotation")) }));
        const i = j - (cards.length - 1) / 2;
        gsap.to(c, { x: base[j].x + i * 28 * k, rotation: base[j].r + i * 4 * k, duration: 0.6, ease: "power3.out", overwrite: "auto" });
      });
    root.addEventListener("pointerenter", () => spread(1));
    root.addEventListener("pointerleave", () => spread(0));
  });
}

function floats() {
  document.querySelectorAll<HTMLElement>("[data-float]").forEach((el) => {
    const v = Number(el.dataset.float || 10);
    gsap.fromTo(el, { yPercent: v }, { yPercent: -v, ease: "none", scrollTrigger: { trigger: el.closest("section") ?? el, start: "top bottom", end: "bottom top", scrub: true } });
  });
}
