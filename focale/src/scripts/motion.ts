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

/**
 * A round label that follows the pointer over elements marked [data-cursor="Label"].
 * The system cursor stays visible: this only adds a hint, it never replaces the pointer.
 */
export function initCursor() {
  if (!motionOk() || !finePointer()) return;
  const targets = document.querySelectorAll<HTMLElement>("[data-cursor]");
  if (!targets.length) return;
  const dot = document.createElement("div");
  dot.className = "cursor";
  dot.setAttribute("aria-hidden", "true");
  dot.innerHTML = "<span></span>";
  document.body.append(dot);
  const label = dot.firstElementChild as HTMLElement;
  gsap.set(dot, { xPercent: -50, yPercent: -50, scale: 0 });
  const xTo = gsap.quickTo(dot, "x", { duration: 0.35, ease: "power3.out" });
  const yTo = gsap.quickTo(dot, "y", { duration: 0.35, ease: "power3.out" });
  window.addEventListener("pointermove", (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
  });
  targets.forEach((t) => {
    t.addEventListener("pointerenter", (e) => {
      label.textContent = t.dataset.cursor ?? "";
      gsap.set(dot, { x: e.clientX, y: e.clientY });
      gsap.to(dot, { scale: 1, duration: 0.4, ease: "back.out(1.7)" });
    });
    t.addEventListener("pointerleave", () => gsap.to(dot, { scale: 0, duration: 0.25, ease: "power2.in" }));
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
  initCursor();
  initSunrise();
  // Pins are created at different moments (hero on load, reel and these when idle):
  // sort by position so each start accounts for the pin spacers above it.
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
}
