import { gsap } from "gsap";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(Flip);

/**
 * Sector chooser. Radios and CSS alone switch the path; this animates it: the cards glide into
 * a row of tabs (Flip), the chosen path unveils its picture, the phone rises and the text follows.
 * Nothing is stored: the choice lives only on this page.
 */
export function initPaths() {
  const pick = document.querySelector<HTMLElement>("[data-pick]");
  const box = document.querySelector<HTMLElement>("[data-paths]");
  if (!pick || !box) return;
  const motion = () => window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
  const cards = Array.from(pick.querySelectorAll<HTMLElement>("[data-flip]"));
  let state: Flip.FlipState | null = null;
  // Capture the layout before the radio changes, so Flip can animate from it.
  const capture = () => {
    if (motion()) state = Flip.getState(cards);
  };
  pick.addEventListener("pointerdown", capture, true);
  pick.addEventListener("keydown", capture, true);

  pick.querySelectorAll<HTMLInputElement>("[data-path-input]").forEach((input) =>
    input.addEventListener("change", () => {
      if (!motion()) return;
      if (state) Flip.from(state, { duration: 0.7, ease: "expo.inOut", absolute: false });
      state = null;
      const panel = box.querySelector<HTMLElement>(`[data-path="${CSS.escape(input.value)}"]`);
      if (!panel) return;
      const img = panel.querySelector("[data-path-img]");
      const phone = panel.querySelector("[data-path-phone]");
      const items = panel.querySelectorAll("[data-path-item]");
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.fromTo(panel, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8 }, 0.2);
      if (img) tl.fromTo(img, { clipPath: "inset(0% 0% 100% 0%)", scale: 1.12 }, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: 1.2 }, 0.25);
      if (phone) tl.fromTo(phone, { yPercent: 40, rotate: 5, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, duration: 1.1 }, 0.45);
      tl.fromTo(items, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.07 }, 0.4);
    }),
  );
}
