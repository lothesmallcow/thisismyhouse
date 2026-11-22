/**
 * The site's one signature, "messa a fuoco" (Focus = mettere a fuoco): project screenshots
 * (FocusShot.astro, [data-fshot]) come from soft to sharp once, when they enter the viewport.
 * Opacity and transform only: a pre-blurred copy fades out over the sharp picture (never a CSS blur).
 * Anything already on screen at load is left sharp, so nothing visible flickers; without JS or with
 * reduced motion nothing changes. The home's pinned works ([data-works]) drive their own shots.
 * (The old heading blur, which animated a CSS filter, was retired on 22 Nov 2026.)
 */
export const motionOk = () => window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

/** Puts a shot out of focus, ready to sharpen. */
export const soften = (el: Element) => el.classList.add("is-soft");
/** Brings a shot into focus (once: it stays sharp). */
export const sharpen = (el: Element) => el.classList.remove("is-soft");

export function watchFocus(els: Element[]) {
  if (!motionOk() || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        sharpen(e.target);
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -15% 0px", threshold: 0.3 },
  );
  const vh = window.innerHeight;
  for (const el of els) {
    if (el.getBoundingClientRect().top < vh * 0.85) continue;
    soften(el);
    io.observe(el);
  }
}

export function initFocusMotif() {
  watchFocus(Array.from(document.querySelectorAll("[data-fshot]")).filter((el) => !el.closest("[data-works]")));
}
