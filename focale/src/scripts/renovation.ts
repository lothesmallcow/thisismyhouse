import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

gsap.registerPlugin(ScrollTrigger, Flip, DrawSVGPlugin);

const $ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel)!;
const $$ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => Array.from(root.querySelectorAll<T>(sel));
const noteNumber = (el: Element) => Number(el.querySelector(".mn__n")?.textContent ?? 0);

/**
 * One pinned scene, scrubbed by the scroll like a video:
 * the old site gets its defects marked, scaffolding goes up, the new site is revealed behind
 * an orange scan line, the frame turns into a phone and the checklist ticks in.
 * Same sequence on every screen size; only the layout differs (see Renovation.astro).
 */
function setup(section: HTMLElement) {
  section.classList.add("is-anim");
  const frame = $(section, "[data-frame]");
  const screen = $(section, "[data-screen]");
  const oldLayer = $(section, "[data-layer-old]");
  const newLayer = $(section, "[data-layer-new]");
  const phoneHome = newLayer.parentElement!;
  screen.appendChild(newLayer);
  const scan = $(section, "[data-scan]");
  const notes = $$(oldLayer, "[data-note]").sort((a, b) => noteNumber(a) - noteNumber(b));
  const scaffold = $<SVGSVGElement>(section, "[data-scaffold]");
  const scaffoldPaths = $$<SVGPathElement>(scaffold, "path");
  const sign = $(section, "[data-sign]");
  const chrome = $(section, "[data-chrome]");
  const items = $$(section, "[data-check-item]");
  const ticks = items.map((li) => $<SVGPathElement>(li, "path"));
  const cta = $(section, "[data-reno-cta]");

  gsap.set(notes, { autoAlpha: 0, scale: 0.7, transformOrigin: "50% 50%" });
  gsap.set(scaffoldPaths, { drawSVG: "0%" });
  gsap.set(sign, { autoAlpha: 0, y: -40, rotate: -8 });
  gsap.set(newLayer, { clipPath: "inset(0% 100% 0% 0%)" });
  gsap.set(scan, { left: "0%", autoAlpha: 0 });
  gsap.set(items, { autoAlpha: 0, x: -10 });
  gsap.set(ticks, { drawSVG: "0%" });
  gsap.set(cta, { autoAlpha: 0, y: 10 });

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: () => `+=${window.innerHeight * 2.4}`,
      scrub: 1,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  // 1. The defects, one after another
  notes.forEach((n, i) => tl.to(n, { autoAlpha: 1, scale: 1, duration: 0.04, ease: "back.out(2)" }, 0.02 + i * 0.035));

  // 2. Scaffolding goes up, the old site fades to grey
  tl.to(notes, { autoAlpha: 0, duration: 0.04 }, 0.24);
  tl.to(oldLayer, { filter: "grayscale(1)", opacity: 0.55, duration: 0.08 }, 0.24);
  tl.to(scaffoldPaths, { drawSVG: "100%", duration: 0.1, stagger: 0.008 }, 0.25);
  tl.to(sign, { autoAlpha: 1, y: 0, rotate: -2, duration: 0.06, ease: "back.out(1.6)" }, 0.31);

  // 3. The new site is revealed behind an orange scan line, while the scaffolding comes down
  tl.to(scan, { autoAlpha: 1, duration: 0.01 }, 0.42);
  tl.to(newLayer, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.2, ease: "power1.inOut" }, 0.42);
  tl.to(scan, { left: "100%", duration: 0.2, ease: "power1.inOut" }, 0.42);
  tl.to(scan, { autoAlpha: 0, duration: 0.02 }, 0.62);
  tl.to(scaffoldPaths, { drawSVG: "0%", duration: 0.12, stagger: 0.005 }, 0.46);
  tl.to(sign, { y: -50, rotate: 6, autoAlpha: 0, duration: 0.06 }, 0.5);

  // 4. The browser frame becomes a phone
  tl.to(oldLayer, { autoAlpha: 0, duration: 0.01 }, 0.63);
  tl.to(chrome, { height: 0, autoAlpha: 0, duration: 0.04 }, 0.63);
  const state = Flip.getState(frame, { props: "borderRadius,borderWidth" });
  frame.classList.add("is-phone");
  tl.add(Flip.from(state, { duration: 0.12, ease: "power2.inOut", scale: false }), 0.65);

  // 5. Checklist and button
  items.forEach((li, i) => {
    tl.to(ticks[i], { drawSVG: "100%", duration: 0.03 }, 0.8 + i * 0.03);
    tl.to(li, { autoAlpha: 1, x: 0, duration: 0.03 }, 0.8 + i * 0.03);
  });
  tl.to(cta, { autoAlpha: 1, y: 0, duration: 0.03 }, 0.95);
  tl.set({}, {}, 1.05);

  return () => {
    frame.classList.remove("is-phone");
    gsap.set(newLayer, { clearProps: "clipPath" });
    phoneHome.appendChild(newLayer);
    section.classList.remove("is-anim");
  };
}

export function initRenovation() {
  const section = document.querySelector<HTMLElement>("[data-reno]");
  if (!section) return;
  ScrollTrigger.config({ ignoreMobileResize: true });

  let mm: gsap.MatchMedia | null = null;
  const build = () => {
    mm?.revert();
    mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => setup(section));
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  };
  if (document.fonts?.status === "loaded") build();
  else document.fonts.ready.then(build);

  // The pinned frame is sized from the viewport: rebuild after a real resize.
  let lastW = window.innerWidth;
  let lastH = window.innerHeight;
  let t: number | undefined;
  window.addEventListener("resize", () => {
    window.clearTimeout(t);
    t = window.setTimeout(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w === lastW && Math.abs(h - lastH) < 120) return;
      lastW = w;
      lastH = h;
      build();
    }, 250);
  });
}
