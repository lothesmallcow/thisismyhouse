/**
 * Home scenes: marks the scene on screen (.is-in) so its content plays in, replays the entrance
 * when a scene comes back after leaving the screen, and lights the matching dot in the side nav.
 * Snapping itself is CSS (scroll-snap), so keyboard, scrollbar and screen readers work as usual.
 */
export function initScenes() {
  const scenes = Array.from(document.querySelectorAll<HTMLElement>(".scene"));
  if (!scenes.length) return;
  const root = document.documentElement;
  if (window.matchMedia("(prefers-reduced-motion: no-preference)").matches) root.classList.add("scenes-live");
  const dots = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>("[data-dot]").forEach((d) => dots.set(d.dataset.dot!, d));
  const ratios = new Map<Element, number>();

  const setActive = () => {
    let best: Element | null = null;
    let max = 0;
    ratios.forEach((r, el) => {
      if (r > max) {
        max = r;
        best = el;
      }
    });
    dots.forEach((d, id) => {
      const on = best !== null && (best as HTMLElement).id === id;
      d.classList.toggle("is-active", on);
      if (on) d.setAttribute("aria-current", "true");
      else d.removeAttribute("aria-current");
    });
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        ratios.set(e.target, e.intersectionRatio);
        if (e.intersectionRatio >= 0.3) e.target.classList.add("is-in");
        else if (e.intersectionRatio === 0) e.target.classList.remove("is-in");
      }
      setActive();
    },
    { threshold: [0, 0.3, 0.5, 0.7, 1] },
  );
  scenes.forEach((s) => io.observe(s));
}
