import { gsap } from "gsap";

/**
 * Physical tilt for objects marked [data-tilt]: they lean towards the pointer in 3D and come
 * back with a soft spring when it leaves, while their glass reflection ([data-tilt-glare])
 * slides with the light. Fine pointers only, never with reduced motion.
 */
export function initTilt() {
  const ok = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches;
  if (!ok) return;
  document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((el) => {
    const max = Number(el.dataset.tilt || 8);
    // A parent with its own CSS perspective (a 3D rig, see phone3d.ts) supplies the depth.
    const own = el.parentElement && getComputedStyle(el.parentElement).perspective === "none";
    gsap.set(el, { transformStyle: "preserve-3d", ...(own ? { transformPerspective: 1100 } : {}) });
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.9, ease: "elastic.out(1, 0.6)" });
    const ry = gsap.quickTo(el, "rotationY", { duration: 0.9, ease: "elastic.out(1, 0.6)" });
    const glares = el.querySelectorAll<HTMLElement>("[data-tilt-glare]");
    const gx = glares.length ? gsap.quickTo(glares, "xPercent", { duration: 0.8, ease: "power3.out" }) : null;
    const area = (el.closest("[data-tilt-area]") as HTMLElement | null) ?? el;
    area.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const py = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const cx = Math.max(-1, Math.min(1, px));
      const cy = Math.max(-1, Math.min(1, py));
      ry(cx * max);
      rx(-cy * max * 0.7);
      gx?.(cx * 18);
    });
    area.addEventListener("pointerleave", () => {
      rx(0);
      ry(0);
      gx?.(0);
    });
  });
}
