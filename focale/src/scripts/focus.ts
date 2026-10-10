/**
 * The site's one motion motif: elements marked [data-focus] start slightly out of focus and
 * sharpen once when they enter the viewport. Anything already on screen at load is left alone,
 * so nothing visible ever flickers, and without JS (or with reduced motion) nothing changes.
 */
export function initFocusMotif() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  const els = Array.from(document.querySelectorAll<HTMLElement>("[data-focus]"));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-focused");
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
  );
  const vh = window.innerHeight;
  for (const el of els) {
    if (el.getBoundingClientRect().top < vh * 0.9) continue;
    el.classList.add("will-focus");
    io.observe(el);
  }
}
