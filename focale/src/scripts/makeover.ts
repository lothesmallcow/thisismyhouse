import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { spring } from "./spring";

gsap.registerPlugin(ScrollTrigger);

/**
 * The makeover film, scrubbed by the scroll (the section pins; scrolling plays it forward or back):
 * 1. the old site on the phone: a pinch to read, a search for the number;
 * 2. the phone turns in 3D and the screen comes apart in sheets: the old site lifts off and
 *    flies away, the new site lands in three pieces, one after another;
 * 3. the phone turns back, a tap calls.
 * See Makeover.astro for the markup and the no-JS final frame.
 */
export function initMakeover() {
  const root = document.querySelector<HTMLElement>("[data-makeover]");
  if (!root || !window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
  const q = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const screen = q("[data-mk-screen]");
  const oldWrap = q("[data-mk-old]");
  const oldPage = q("[data-mk-oldpage]");
  const newSite = q("[data-mk-new]");
  const fa = q("[data-mk-fa]");
  const fb = q("[data-mk-fb]");
  const obj = q("[data-mk-obj]");
  const sweep = q("[data-mk-sweep]");
  const steps = Array.from(root.querySelectorAll<HTMLElement>("[data-mk-step]"));
  const tag = (k: string) => q(`[data-mk-tag="${k}"]`);
  const callBtn = newSite.querySelector<HTMLElement>(".ah__btn--ghost");

  root.classList.add("mk-live");
  const setStep = (i: number) => steps.forEach((s, j) => s.classList.toggle("is-on", j === i));
  setStep(0);

  gsap.set(newSite, { autoAlpha: 0 });
  gsap.set([fa, fb], { opacity: 0 });

  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    scrollTrigger: {
      trigger: root,
      start: "top top",
      end: () => `+=${window.innerHeight * 3}`,
      pin: q("[data-mk-pin]"),
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        setStep(p < 0.08 ? 0 : p < 0.24 ? 1 : p < 0.36 ? 2 : p < 0.82 ? 3 : 4);
      },
    },
  });
  const showTag = (k: string, at: number) =>
    tl.fromTo(tag(k), { autoAlpha: 0, y: 10, scale: 0.92 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.03, ease: spring(0.3) }, at);
  const hideTag = (k: string, at: number) => tl.to(tag(k), { autoAlpha: 0, y: -8, duration: 0.02 }, at);
  const W = () => screen.offsetWidth;
  const Hs = () => screen.offsetHeight;

  // 1a. Pinch to read the tiny text.
  tl.set([fa, fb], { left: () => screen.offsetLeft + W() * 0.55, top: () => screen.offsetTop + Hs() * 0.32, x: 0, y: 0 }, 0.07);
  tl.to([fa, fb], { opacity: 0.95, duration: 0.01 }, 0.08);
  tl.to(fa, { x: () => -W() * 0.18, y: () => -W() * 0.14, duration: 0.08 }, 0.09);
  tl.to(fb, { x: () => W() * 0.18, y: () => W() * 0.14, duration: 0.08 }, 0.09);
  tl.to(oldPage, { scale: 1.1, x: () => -W() * 0.55, y: () => -Hs() * 0.45, duration: 0.08 }, 0.09);
  showTag("zoom", 0.12);
  tl.to([fa, fb], { opacity: 0, duration: 0.01 }, 0.19);
  tl.to(oldPage, { scale: 0.5556, x: 0, y: 0, duration: 0.05 }, 0.2);
  hideTag("zoom", 0.22);

  // 1b. Looking for the phone number.
  tl.set(fa, { x: 0, y: 0, left: () => screen.offsetLeft + W() * 0.5, top: () => screen.offsetTop + Hs() * 0.7 }, 0.24);
  tl.to(fa, { opacity: 0.95, duration: 0.01 }, 0.245);
  tl.to(fa, { y: () => -Hs() * 0.35, duration: 0.04 }, 0.25);
  tl.to(oldPage, { y: () => -Hs() * 0.12, duration: 0.04 }, 0.25);
  showTag("num", 0.26);
  tl.to(fa, { y: 0, duration: 0.03 }, 0.3);
  tl.to(oldPage, { y: 0, duration: 0.03 }, 0.3);
  tl.to(fa, { opacity: 0, duration: 0.01 }, 0.33);
  hideTag("num", 0.35);

  // 2. The makeover: the phone lifts and turns all the way around (titanium back, cameras);
  //    when it faces away the old site is swapped for the new one, then light crosses the glass.
  tl.to(obj, { y: -20, scale: 1.04, rotationX: 8, duration: 0.05, ease: "power2.out" }, 0.37);
  tl.to(obj, { rotationY: 360, duration: 0.3, ease: "power2.inOut" }, 0.4);
  tl.set(oldWrap, { autoAlpha: 0 }, 0.55);
  tl.set(newSite, { autoAlpha: 1 }, 0.55);
  tl.to(obj, { y: 0, scale: 1, rotationX: 0, duration: 0.08, ease: spring(0.25) }, 0.68);
  tl.set(obj, { rotationY: 0 }, 0.76);
  tl.fromTo(sweep, { left: "-60%", opacity: 0 }, { left: "120%", opacity: 1, duration: 0.07, ease: "power1.inOut" }, 0.72);
  tl.to(sweep, { opacity: 0, duration: 0.01 }, 0.79);
  showTag("read", 0.8);

  // 4. A tap on "Chiama ora".
  if (callBtn) {
    const pos = () => offsetIn(callBtn, newSite);
    tl.set(fa, { left: () => screen.offsetLeft + pos().x + callBtn.offsetWidth / 2, top: () => screen.offsetTop + pos().y + callBtn.offsetHeight / 2, x: 0, y: 0, scale: 1.3 }, 0.85);
    tl.to(fa, { opacity: 0.95, scale: 0.9, duration: 0.02 }, 0.86);
    tl.to(callBtn, { scale: 0.93, duration: 0.015 }, 0.87);
    tl.to(callBtn, { scale: 1, duration: 0.04, ease: spring(0.35) }, 0.885);
    tl.to(fa, { opacity: 0, scale: 1.5, duration: 0.03 }, 0.9);
  }
  showTag("call", 0.9);
  tl.to({}, { duration: 0.06 }, 0.94);
  // This pin adds three screens of scroll: every trigger below it must be measured again.
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
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
