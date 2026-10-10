import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const KEY = "fd-percorso";

/**
 * Sector chooser in the hero. The radios and CSS alone show the chosen path; this adds the
 * entrance (image unveils, phone rises, text follows), brings the path into view, remembers
 * the choice for the next visit and tells ScrollTrigger the page got taller.
 */
export function initPaths() {
  const root = document.querySelector<HTMLElement>("[data-pick]");
  const box = document.querySelector<HTMLElement>("[data-paths]");
  if (!root || !box) return;
  const inputs = Array.from(root.querySelectorAll<HTMLInputElement>("[data-path-input]"));
  const motion = () => window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

  const show = (value: string, opts: { scroll: boolean }) => {
    const panel = box.querySelector<HTMLElement>(`[data-path="${CSS.escape(value)}"]`);
    if (!panel) return;
    if (motion()) {
      const img = panel.querySelector("[data-path-img]");
      const phone = panel.querySelector("[data-path-phone]");
      const items = panel.querySelectorAll("[data-path-item]");
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.fromTo(panel, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8 }, 0);
      if (img) tl.fromTo(img, { clipPath: "inset(0% 0% 100% 0%)", scale: 1.15 }, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: 1.3 }, 0.05);
      if (phone) tl.fromTo(phone, { yPercent: 60, rotate: 4 }, { yPercent: 0, rotate: 0, duration: 1.2 }, 0.3);
      tl.fromTo(items, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.06 }, 0.2);
    }
    ScrollTrigger.refresh();
    if (!opts.scroll) return;
    // Wait for the refresh to settle, then bring the path just under the header.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const r = panel.getBoundingClientRect();
        if (r.top > 40 && r.top < window.innerHeight * 0.35) return;
        const lenis = (window as unknown as { __lenis?: { scrollTo: (t: Element, o: object) => void } }).__lenis;
        if (lenis) lenis.scrollTo(panel, { offset: -84, duration: 1.1, force: true });
        else panel.scrollIntoView({ behavior: motion() ? "smooth" : "auto", block: "start" });
      }),
    );
  };

  inputs.forEach((input) =>
    input.addEventListener("change", () => {
      try {
        localStorage.setItem(KEY, input.value);
      } catch {
        /* storage blocked: the choice just is not remembered */
      }
      show(input.value, { scroll: true });
    }),
  );

  // A returning visitor finds their path already open.
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {
    saved = null;
  }
  const match = inputs.find((i) => i.value === saved);
  if (match && !inputs.some((i) => i.checked)) {
    match.checked = true;
    show(match.value, { scroll: false });
  }
}
