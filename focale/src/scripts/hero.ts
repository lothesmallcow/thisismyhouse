import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

/** A1: hero entrance, once per page load. Everything is visible until this runs. */
export function initHero() {
  const root = document.querySelector<HTMLElement>("[data-hero-anim]");
  if (!root) return;
  const h1 = root.querySelector<HTMLElement>("[data-hero-h1]")!;
  const fades = root.querySelectorAll<HTMLElement>("[data-hero-fade]");
  const phone = root.querySelector<HTMLElement>("[data-hero-phone] .pf")!;
  const card = root.querySelector<HTMLElement>("[data-notif]")!;

  const run = () => {
    const mm = gsap.matchMedia();
    mm.add(
      {
        reduce: "(prefers-reduced-motion: reduce)",
        desktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        mobile: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
      },
      (ctx) => {
        const c = ctx.conditions ?? {};
        if (c.reduce) return;
        const k = c.mobile ? 0.8 : 1;
        const split = SplitText.create(h1, { type: "lines", mask: "lines", linesClass: "hero-line" });
        const lines = split.lines;
        const tl = gsap.timeline();
        tl.from(lines, { yPercent: 105, duration: 0.8 * k, ease: "power3.out", stagger: 0.08 * k }, 0.1 * k);
        const afterLines = 0.1 * k + (lines.length - 1) * 0.08 * k + 0.35 * k;
        tl.from(fades, { autoAlpha: 0, y: 12, duration: 0.5 * k, ease: "power2.out", stagger: 0.08 * k }, afterLines);
        tl.from(phone, { autoAlpha: 0, y: 24, duration: 0.9 * k, ease: "power3.out" }, 0.25 * k);

        // Notification: in at 1.6s, stays 3s, out; three times, 5s apart; then stays.
        gsap.set(card, { autoAlpha: 0, scale: 0.92, xPercent: -50, x: 0, transformOrigin: "50% 0%" });
        for (let i = 0; i < 3; i++) {
          const at = 1.6 * k + i * 5;
          tl.to(card, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(1.6)" }, at);
          if (i < 2) tl.to(card, { autoAlpha: 0, scale: 0.96, duration: 0.3, ease: "power2.in" }, at + 0.45 + 3);
        }
        return () => split.revert();
      },
    );
  };

  if (document.fonts?.status === "loaded") run();
  else document.fonts.ready.then(run);
}
