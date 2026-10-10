import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** A8: smooth scroll on the home page, fine pointers only, never with reduced motion. */
export function initSmoothScroll() {
  const ok = window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const links = document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
  if (!ok) return;
  const lenis = new Lenis({ autoRaf: false, anchors: false });
  (window as unknown as { __lenis: Lenis }).__lenis = lenis;
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  links.forEach((a) =>
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
