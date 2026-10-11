import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Home sections: content marked [data-in] rises in once, when its section comes into view.
 * Content is visible without JS and with reduced motion.
 */
export function initScenes() {
  const sections = Array.from(document.querySelectorAll<HTMLElement>(".scenes > section"));
  if (!sections.length || !window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
  document.documentElement.classList.add("scenes-live");
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -20% 0px" },
  );
  // The section already on screen at load is shown at once.
  sections.forEach((s) => (s.getBoundingClientRect().top < window.innerHeight * 0.8 ? s.classList.add("is-in") : io.observe(s)));
  // Opening a sector path (or any layout change) changes the page height: re-measure triggers.
  let h = document.documentElement.scrollHeight;
  let tm = 0;
  new ResizeObserver(() => {
    const nh = document.documentElement.scrollHeight;
    if (Math.abs(nh - h) < 2) return;
    h = nh;
    clearTimeout(tm);
    tm = window.setTimeout(() => ScrollTrigger.refresh(), 150);
  }).observe(document.querySelector(".scenes")!);
  // Each scene drifts up and dissolves as the next one arrives, like a keynote transition.
  sections.slice(0, -1).forEach((s) => {
    const inner = s.querySelector<HTMLElement>(":scope > .wrap, .mk__in");
    if (!inner) return;
    gsap.fromTo(
      inner,
      { y: 0, opacity: 1 },
      { y: -90, opacity: 0, ease: "none", immediateRender: false, scrollTrigger: { trigger: s, start: "bottom 75%", end: "bottom 10%", scrub: true, invalidateOnRefresh: true, refreshPriority: -1 } },
    );
  });
}
