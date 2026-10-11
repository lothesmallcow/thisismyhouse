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
}
