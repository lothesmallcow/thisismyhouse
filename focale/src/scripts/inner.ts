import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Motion for the inner pages' pictures (components/visual/*) and the page colour play.
 * Each part looks for its own data attribute; with reduced motion nothing runs and every
 * picture stays in its final, readable state.
 *
 *   [data-tone="sole|pesca"]  while this section fills the middle of the screen the whole page takes
 *                             its colour (the section itself goes transparent), a slow flood
 *   [data-receipt]            Prezzi receipt sways with the mouse (it prints itself in CSS)
 *   [data-sector-focus]       Lo studio: focus moves from sector to sector
 *   [data-lens]               Il nome: the noise around the viewfinder blurs and drifts away on scroll
 *   [data-fan]                the mouse spreads the fanned phone screens (they deal in with CSS)
 *   [data-float="n"]          floats n% against the scroll (closing screens)
 */
export function initInner() {
  if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
  tones();
  receipt();
  sectorFocus();
  lens();
  fan();
  floats();
}

function tones() {
  const secs = Array.from(document.querySelectorAll<HTMLElement>("[data-tone]"));
  if (!secs.length) return;
  document.documentElement.classList.add("tone-live");
  const body = document.body;
  secs.forEach((s) => {
    ScrollTrigger.create({
      trigger: s,
      start: "top 60%",
      end: "bottom 40%",
      onToggle: (self) => {
        if (self.isActive) body.dataset.tone = s.dataset.tone;
        else if (body.dataset.tone === s.dataset.tone) delete body.dataset.tone;
      },
    });
  });
}

function receipt() {
  // The print-out itself is CSS (Receipt.astro: it plays at first paint, before any script).
  // Here only a gentle sway with the mouse.
  const root = document.querySelector<HTMLElement>("[data-receipt]");
  if (!root || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const paper = root.querySelector<HTMLElement>("[data-rc-paper]")!;
  const rot = gsap.quickTo(paper, "rotation", { duration: 0.8, ease: "power3.out" });
  root.addEventListener("pointermove", (e) => {
    const r = root.getBoundingClientRect();
    rot(((e.clientX - r.left) / r.width - 0.5) * 6);
  });
  root.addEventListener("pointerleave", () => rot(0));
}

function sectorFocus() {
  const root = document.querySelector<HTMLElement>("[data-sector-focus]");
  if (!root) return;
  const items = Array.from(root.querySelectorAll<HTMLElement>("li"));
  const ring = root.querySelector<HTMLElement>(".sf__ring");
  root.classList.add("is-live");
  let i = 0;
  const show = () => {
    items.forEach((it, j) => it.classList.toggle("is-on", j === i));
    const it = items[i];
    if (ring) {
      ring.style.height = `${it.offsetHeight + 14}px`;
      ring.style.transform = `translateY(${it.offsetTop - 7}px)`;
    }
  };
  show();
  let timer = window.setInterval(() => {
    i = (i + 1) % items.length;
    show();
  }, 1700);
  // Only while it is on screen.
  new IntersectionObserver(([e]) => {
    clearInterval(timer);
    if (e.isIntersecting)
      timer = window.setInterval(() => {
        i = (i + 1) % items.length;
        show();
      }, 1700);
  }).observe(root);
  addEventListener("resize", show);
}

function lens() {
  const root = document.querySelector<HTMLElement>("[data-lens]");
  if (!root) return;
  const noise = Array.from(root.querySelectorAll<HTMLElement>("[data-lens-noise]"));
  const keep = root.querySelector<HTMLElement>("[data-lens-keep]");
  const tl = gsap.timeline({ scrollTrigger: { trigger: root, start: "top 85%", end: "bottom 35%", scrub: 0.6 } });
  noise.forEach((n) => {
    const left = n.style.left !== "";
    tl.fromTo(
      n,
      { x: 0, y: 0, filter: "blur(0px)", opacity: 0.9 },
      { x: left ? -40 : 40, y: n.style.bottom ? 24 : parseFloat(n.style.top) < 30 ? -24 : 0, filter: "blur(5px)", opacity: 0.55, ease: "none" },
      0,
    );
  });
  if (keep) tl.fromTo(keep, { filter: "blur(8px)", scale: 0.9 }, { filter: "blur(0px)", scale: 1, ease: "power2.out", duration: 0.5 }, 0);
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
