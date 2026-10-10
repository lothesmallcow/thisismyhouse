import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Home hero.
 * 1. Load: the two headline lines rise letter by letter, then the rest fades in.
 * 2. Scroll: the headline lines drift apart, the stage opens to the full screen, an orange
 *    light rises behind the phone and the requests arrive one per caption.
 * Everything is visible before this runs; reduced motion skips all of it.
 */
export function initHero() {
  const root = document.querySelector<HTMLElement>("[data-hero-anim]");
  if (!root) return;
  const lines = root.querySelectorAll<HTMLElement>("[data-hero-line]");
  const fades = root.querySelectorAll<HTMLElement>("[data-hero-fade]");
  const lens = root.querySelector<HTMLElement>("[data-lens]");

  const run = () => {
    const mm = gsap.matchMedia();
    mm.add(
      {
        reduce: "(prefers-reduced-motion: reduce)",
        motion: "(prefers-reduced-motion: no-preference)",
        mobile: "(max-width: 899px)",
      },
      (ctx) => {
        const c = ctx.conditions ?? {};
        if (c.reduce) return;
        const k = c.mobile ? 0.8 : 1;

        // 1. Load sequence. 0.01 rather than 0: the text still counts as painted for LCP.
        // The h1 carries the full sentence for screen readers; the animated letters are hidden from them.
        const h1 = root.querySelector<HTMLElement>("[data-hero-h1]");
        if (h1) h1.setAttribute("aria-label", (h1.textContent ?? "").replace(/\s+/g, " ").trim());
        const splits = Array.from(lines).map((l) => SplitText.create(l, { type: "words,chars", mask: "chars", aria: "hidden" }));
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        splits.forEach((s, i) => tl.from(s.chars, { yPercent: 115, duration: 1.15 * k, stagger: 0.022 }, 0.1 + i * 0.16));
        tl.from(fades, { opacity: 0.01, y: 14, duration: 0.9 * k, stagger: 0.08, ease: "power3.out" }, 0.55 * k);
        if (lens) tl.from(lens, { y: 60, duration: 1.2, ease: "power3.out" }, 0.7 * k);

        // 2a. Headline lines drift apart as the hero scrolls away
        if (!c.mobile && lines.length === 2) {
          const st = { trigger: root, start: "top top", end: "bottom top", scrub: true };
          gsap.to(lines[0], { xPercent: -6, ease: "none", scrollTrigger: st });
          gsap.to(lines[1], { xPercent: 4, ease: "none", scrollTrigger: { ...st } });
        }

        // 2b. The stage
        if (lens) {
          const glow = lens.querySelector<HTMLElement>("[data-lens-glow]");
          const phone = lens.querySelector<HTMLElement>("[data-lens-phone]");
          const steps = lens.querySelectorAll<HTMLElement>("[data-lens-step]");
          const notifs = lens.querySelectorAll<HTMLElement>("[data-notif]");
          const gutter = () => parseFloat(getComputedStyle(root.querySelector(".wrap")!).paddingLeft) || 20;

          gsap.set(notifs, { opacity: 0, y: -18, scale: 0.94 });
          gsap.set(steps, { opacity: 0, y: 20 });

          const st = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: lens,
              start: "top top",
              end: () => `+=${window.innerHeight * (c.mobile ? 1.5 : 1.7)}`,
              scrub: 0.9,
              pin: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });
          st.fromTo(
            lens,
            { "--inset-x": () => `${gutter()}px`, "--inset-y": c.mobile ? "0px" : "44px", "--r": "30px" },
            { "--inset-x": "0px", "--inset-y": "0px", "--r": "0px", duration: 1, ease: "power2.inOut", immediateRender: true },
            0,
          );
          if (glow) st.fromTo(glow, { xPercent: -50, yPercent: -30, scale: 0.6, opacity: 0.6 }, { xPercent: -50, yPercent: -62, scale: 1, opacity: 1, duration: 3.4, ease: "power1.inOut" }, 0);
          if (phone) st.fromTo(phone, { y: 60, scale: 0.94 }, { y: 0, scale: 1, duration: 1.2, ease: "power2.out" }, 0);
          notifs.forEach((n, i) => {
            const at = 1.1 + i * 0.9;
            st.to(n, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(1.8)" }, at);
            if (steps[i]) st.to(steps[i], { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, at - 0.1);
            if (i === 0 && phone) st.to(phone, { keyframes: { rotation: [0, -3, 3, -2, 2, 0] }, duration: 0.4 }, at);
          });
          // Hold the finished picture for a moment before the pin releases.
          st.to({}, { duration: 0.8 });
        }
        return () => {
          splits.forEach((s) => s.revert());
          h1?.removeAttribute("aria-label");
        };
      },
    );
  };

  if (document.fonts?.status === "loaded") run();
  else document.fonts.ready.then(run);
}
