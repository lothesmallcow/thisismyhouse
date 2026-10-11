import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { spring } from "./spring";

gsap.registerPlugin(ScrollTrigger);

/**
 * The makeover film, scrubbed by the scroll: the section pins and scrolling moves the film
 * forward or back like a video. Steps on the left light up in sync. See Makeover.astro.
 */
export function initMakeover() {
  const root = document.querySelector<HTMLElement>("[data-makeover]");
  if (!root || !window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
  const q = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const screen = q("[data-mk-screen]");
  const oldWrap = q("[data-mk-old]");
  const oldPage = q("[data-mk-oldpage]");
  const newSite = q("[data-mk-new]");
  const scan = q("[data-mk-scan]");
  const fa = q("[data-mk-fa]");
  const fb = q("[data-mk-fb]");
  const phone = q("[data-mk-phone]");
  const steps = Array.from(root.querySelectorAll<HTMLElement>("[data-mk-step]"));
  const tag = (k: string) => q(`[data-mk-tag="${k}"]`);
  const callBtn = newSite.querySelector<HTMLElement>(".ah__btn--ghost");

  root.classList.add("mk-live");
  const setStep = (i: number) => steps.forEach((s, j) => s.classList.toggle("is-on", j === i));
  setStep(0);

  gsap.set(newSite, { clipPath: "inset(0% 0% 100% 0%)" });
  gsap.set([fa, fb], { opacity: 0 });
  const showTag = (k: string, at: number) => tl.fromTo(tag(k), { autoAlpha: 0, y: 10, scale: 0.92 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.25, ease: spring(0.3) }, at);
  const hideTag = (k: string, at: number) => tl.to(tag(k), { autoAlpha: 0, y: -8, duration: 0.15 }, at);

  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    scrollTrigger: {
      trigger: root,
      start: "top top",
      end: () => `+=${window.innerHeight * 2.6}`,
      pin: q("[data-mk-pin]"),
      scrub: 0.8,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        setStep(p < 0.12 ? 0 : p < 0.36 ? 1 : p < 0.56 ? 2 : p < 0.8 ? 3 : 4);
      },
    },
  });

  // 1. Pinch to zoom on the tiny text: two fingertips spread, the page grows, then shrinks back.
  const cx = () => screen.offsetLeft + screen.offsetWidth * 0.55;
  const cy = () => screen.offsetTop + screen.offsetHeight * 0.32;
  tl.set([fa, fb], { left: cx, top: cy }, 0.1);
  tl.to([fa, fb], { opacity: 0.95, duration: 0.05 }, 0.12);
  tl.to(fa, { x: () => -screen.offsetWidth * 0.18, y: () => -screen.offsetWidth * 0.14, duration: 0.18 }, 0.15);
  tl.to(fb, { x: () => screen.offsetWidth * 0.18, y: () => screen.offsetWidth * 0.14, duration: 0.18 }, 0.15);
  tl.to(oldPage, { scale: 1.1, x: () => -screen.offsetWidth * 0.55, y: () => -screen.offsetHeight * 0.45, duration: 0.18 }, 0.15);
  showTag("zoom", 0.2);
  tl.to([fa, fb], { opacity: 0, duration: 0.05 }, 0.34);
  tl.to(oldPage, { scale: 0.5556, x: 0, y: 0, duration: 0.12 }, 0.36);
  hideTag("zoom", 0.38);

  // 2. Looking for the number: a finger drags the page up and down, nothing.
  tl.set(fa, { x: 0, y: 0, left: () => screen.offsetLeft + screen.offsetWidth * 0.5, top: () => screen.offsetTop + screen.offsetHeight * 0.7 }, 0.4);
  tl.to(fa, { opacity: 0.95, duration: 0.03 }, 0.41);
  tl.to(fa, { y: () => -screen.offsetHeight * 0.35, duration: 0.08 }, 0.42);
  tl.to(oldPage, { y: () => -screen.offsetHeight * 0.12, duration: 0.08 }, 0.42);
  showTag("num", 0.44);
  tl.to(fa, { y: 0, duration: 0.06 }, 0.5);
  tl.to(oldPage, { y: 0, duration: 0.06 }, 0.5);
  tl.to(fa, { opacity: 0, duration: 0.03 }, 0.55);

  // 3. The makeover: an orange line sweeps down, the new site appears behind it.
  hideTag("num", 0.57);
  tl.to(scan, { opacity: 1, duration: 0.02 }, 0.58);
  tl.to(scan, { top: "100%", duration: 0.18, ease: "power1.inOut" }, 0.58);
  tl.to(newSite, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.18, ease: "power1.inOut" }, 0.58);
  tl.to(oldWrap, { filter: "blur(3px) grayscale(1)", opacity: 0.6, duration: 0.18 }, 0.58);
  tl.to(scan, { opacity: 0, duration: 0.02 }, 0.76);
  tl.fromTo(phone, { scale: 1 }, { scale: 1.03, duration: 0.05, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0.76);
  showTag("read", 0.78);

  // 4. A tap on "Chiama ora".
  if (callBtn) {
    tl.set(fa, { left: () => screen.offsetLeft + offsetIn(callBtn, newSite).x + callBtn.offsetWidth / 2, top: () => screen.offsetTop + offsetIn(callBtn, newSite).y + callBtn.offsetHeight / 2, x: 0, y: 0, scale: 1.3 }, 0.84);
    tl.to(fa, { opacity: 0.95, scale: 0.9, duration: 0.03 }, 0.85);
    tl.to(callBtn, { scale: 0.93, duration: 0.02 }, 0.86);
    tl.to(callBtn, { scale: 1, duration: 0.05, ease: spring(0.35) }, 0.88);
    tl.to(fa, { opacity: 0, scale: 1.5, duration: 0.04 }, 0.89);
  }
  showTag("call", 0.9);
  tl.to({}, { duration: 0.1 }, 0.95);
}

function offsetIn(el: HTMLElement, ancestor: HTMLElement) {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== ancestor) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y };
}
