import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Smooth scroll on fine pointers only, never with reduced motion. */
export function initSmoothScroll() {
  const ok = window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!ok) return;
  const lenis = new Lenis({ autoRaf: false, anchors: false, lerp: 0.11 });
  (window as unknown as { __lenis: Lenis }).__lenis = lenis;
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href")!;
      if (id.length < 2) return;
      const target = document.querySelector<HTMLElement>(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -80 });
      history.pushState(null, "", id);
    }),
  );
}
