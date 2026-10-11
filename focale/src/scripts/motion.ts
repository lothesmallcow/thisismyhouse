import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

const motionOk = () => window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
const finePointer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/** Manifesto: words light up one after another as the paragraph crosses the screen. */
export function initManifesto() {
  if (!motionOk()) return;
  document.querySelectorAll<HTMLElement>("[data-manifesto]").forEach((el) => {
    const split = SplitText.create(el, { type: "words", wordsClass: "mf-w" });
    el.setAttribute("data-manifesto-ready", "");
    gsap.to(split.words, {
      color: "var(--inchiostro)",
      ease: "none",
      stagger: 0.1,
      scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true },
    });
  });
}

/** Bento tiles rise and settle as they come into view, a few at a time. */
export function initTiles() {
  if (!motionOk()) return;
  const tiles = gsap.utils.toArray<HTMLElement>("[data-tile]").filter((t) => t.getBoundingClientRect().top > window.innerHeight);
  if (!tiles.length) return;
  gsap.set(tiles, { y: 60, scale: 0.97 });
  ScrollTrigger.batch(tiles, {
    start: "top 95%",
    once: true,
    onEnter: (els) => gsap.to(els, { y: 0, scale: 1, duration: 1.1, ease: "expo.out", stagger: 0.08 }),
  });
}

/** Buttons marked [data-magnetic] lean towards the pointer. Fine pointers only. */
export function initMagnetic() {
  if (!motionOk() || !finePointer()) return;
  document.querySelectorAll<HTMLElement>("[data-magnetic], .btn--primary").forEach((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
    });
    el.addEventListener("pointerleave", () => {
      xTo(0);
      yTo(0);
    });
  });
}

/** Big closing sun rises as the last section comes into view. */
export function initSunrise() {
  if (!motionOk()) return;
  document.querySelectorAll<HTMLElement>("[data-sunrise]").forEach((sun) => {
    gsap.fromTo(
      sun,
      { xPercent: -50, yPercent: 50, scale: 0.6, opacity: 0.3 },
      { xPercent: -50, yPercent: 50, scale: 1, opacity: 1, ease: "none", scrollTrigger: { trigger: sun.parentElement, start: "top bottom", end: "bottom bottom", scrub: true } },
    );
  });
}

export function initMotion() {
  initManifesto();
  initTiles();
  initMagnetic();
  initSunrise();
  // Pins are created at different moments (hero on load, reel and these when idle):
  // sort by position so each start accounts for the pin spacers above it.
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
}
