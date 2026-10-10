import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

gsap.registerPlugin(ScrollTrigger, Flip, DrawSVGPlugin);

const $ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel)!;
const $$ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => Array.from(root.querySelectorAll<T>(sel));

const noteNumber = (el: Element) => Number(el.querySelector(".mn__n")?.textContent ?? 0);

function setupDesktop(section: HTMLElement, debug: boolean) {
  section.classList.add("is-anim");
  const frame = $(section, "[data-frame]");
  const screen = $(section, "[data-screen]");
  const oldLayer = $(section, "[data-layer-old]");
  const newLayer = $(section, "[data-layer-new]");
  const phoneHome = newLayer.parentElement!;
  screen.appendChild(newLayer);

  const site = $(newLayer, ".ah");
  const piece = (n: string) => $(newLayer, `[data-piece="${n}"]`);
  const notes = $$(oldLayer, "[data-note]").sort((a, b) => noteNumber(a) - noteNumber(b));
  const scaffold = $<SVGSVGElement>(section, "[data-scaffold]");
  const scaffoldPaths = $$<SVGPathElement>(scaffold, "path");
  const sign = $(section, "[data-sign]");
  const chrome = $(section, "[data-chrome]");
  const headline = $(newLayer, "[data-headline]");
  const photoImg = $(piece("photo"), "img");
  const items = $$(section, "[data-check-item]");
  const ticks = items.map((li) => $<SVGPathElement>(li, "path"));
  const cta = $(section, "[data-reno-cta]");

  gsap.set(notes, { autoAlpha: 0, scale: 0.6, rotate: -3, transformOrigin: "50% 50%" });
  gsap.set(scaffoldPaths, { drawSVG: "0%" });
  gsap.set(sign, { autoAlpha: 0, y: -40, rotate: -8 });
  gsap.set(site, { backgroundColor: "rgba(242,242,240,0)" });
  gsap.set($$(newLayer, "[data-piece]"), { autoAlpha: 0, backgroundColor: "rgba(242,242,240,1)" });
  gsap.set(piece("header"), { autoAlpha: 1, clipPath: "inset(0% 100% 0% 0%)" });
  gsap.set(headline, { fontVariationSettings: "'wdth' 62, 'wght' 400" });
  gsap.set(items, { autoAlpha: 0, x: -8 });
  gsap.set(ticks, { drawSVG: "0%" });
  gsap.set(cta, { autoAlpha: 0, y: 8 });

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "+=300%",
      scrub: 0.6,
      pin: true,
      anticipatePin: 1,
      markers: debug,
      invalidateOnRefresh: false,
    },
  });

  // 0 to 0.15: the five marker notes, one after another
  notes.forEach((n, i) => tl.to(n, { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.022, ease: "back.out(2)" }, 0.008 + i * 0.027));

  // 0.15 to 0.35: scaffolding, sign, old site greys out
  tl.to(scaffoldPaths, { drawSVG: "100%", duration: 0.1, stagger: 0.009 }, 0.15);
  tl.to(oldLayer, { filter: "grayscale(1)", opacity: 0.6, duration: 0.1 }, 0.17);
  tl.to(sign, { autoAlpha: 1, y: 0, rotate: -2, duration: 0.06, ease: "power2.out" }, 0.25);
  tl.to(notes, { autoAlpha: 0, duration: 0.03 }, 0.31);

  // 0.35 to 0.70: pieces swap, then the frame becomes a phone
  tl.to(piece("header"), { clipPath: "inset(0% 0% 0% 0%)", duration: 0.06 }, 0.35);
  tl.to(piece("title"), { autoAlpha: 1, duration: 0.015 }, 0.41);
  tl.to(headline, { fontVariationSettings: "'wdth' 108, 'wght' 820", duration: 0.08, ease: "power2.out" }, 0.41);
  tl.to(piece("text"), { autoAlpha: 1, duration: 0.03 }, 0.46);
  tl.to(piece("photo"), { autoAlpha: 1, duration: 0.005 }, 0.49);
  tl.fromTo(photoImg, { filter: "blur(8px)", opacity: 0 }, { filter: "blur(0px)", opacity: 1, duration: 0.08 }, 0.49);
  tl.fromTo(piece("cta"), { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.05, ease: "back.out(1.6)" }, 0.56);
  tl.to([piece("extra"), piece("foot")], { autoAlpha: 1, duration: 0.03, stagger: 0.015 }, 0.58);
  tl.to(site, { backgroundColor: "rgba(242,242,240,1)", duration: 0.02 }, 0.61);
  tl.to(oldLayer, { autoAlpha: 0, duration: 0.01 }, 0.62);
  tl.to(chrome, { height: 0, autoAlpha: 0, duration: 0.03 }, 0.62);

  const state = Flip.getState(frame, { props: "borderRadius,borderWidth" });
  frame.classList.add("is-phone");
  tl.add(Flip.from(state, { duration: 0.07, ease: "power2.inOut", scale: false }), 0.63);

  // 0.70 to 0.85: scaffolding comes down, sign lifts away
  tl.to(scaffoldPaths, { drawSVG: "0%", duration: 0.08, stagger: 0.004 }, 0.7);
  tl.to(scaffold, { y: -30, autoAlpha: 0, duration: 0.1 }, 0.72);
  tl.to(sign, { y: -60, rotate: 4, autoAlpha: 0, duration: 0.06 }, 0.7);

  // 0.85 to 1: checklist ticks in, then the button
  items.forEach((li, i) => {
    tl.to(ticks[i], { drawSVG: "100%", duration: 0.022 }, 0.85 + i * 0.022);
    tl.to(li, { autoAlpha: 1, x: 0, duration: 0.022 }, 0.85 + i * 0.022);
  });
  tl.to(cta, { autoAlpha: 1, y: 0, duration: 0.025 }, 0.965);
  tl.set({}, {}, 1);

  const slider = debug ? debugSlider(tl) : null;

  return () => {
    slider?.remove();
    frame.classList.remove("is-phone");
    phoneHome.appendChild(newLayer);
    section.classList.remove("is-anim");
  };
}

function debugSlider(tl: gsap.core.Timeline) {
  const box = document.createElement("label");
  box.className = "reno-debug";
  box.innerHTML = `<span>Avanzamento ristrutturazione</span><input type="range" min="0" max="1000" value="0">`;
  Object.assign(box.style, {
    position: "fixed", left: "12px", bottom: "12px", zIndex: "9999", background: "#fff", padding: "8px 12px",
    border: "2px solid #1E3A2C", fontFamily: "Archivo, sans-serif", fontSize: "14px", display: "grid", gap: "4px", width: "260px",
  });
  document.body.appendChild(box);
  const input = box.querySelector("input")!;
  input.addEventListener("input", () => {
    const st = tl.scrollTrigger!;
    const y = st.start + (st.end - st.start) * (Number(input.value) / 1000);
    const lenis = (window as unknown as { __lenis?: { scrollTo: (y: number, o: object) => void } }).__lenis;
    if (lenis) lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  });
  return box;
}

function setupMobile(section: HTMLElement, debug: boolean) {
  section.classList.add("is-mobile-anim");
  const prima = $(section, '[data-scene="prima"]');
  const cantiere = $(section, '[data-scene="cantiere"]');
  const dopo = $(section, '[data-scene="dopo"]');
  const notes = $$(prima, "[data-note]").sort((a, b) => noteNumber(a) - noteNumber(b));
  const newLayer = $(dopo, "[data-layer-new]");
  const piece = (n: string) => $(newLayer, `[data-piece="${n}"]`);
  const headline = $(newLayer, "[data-headline]");
  const items = $$(section, "[data-check-item]");
  const ticks = items.map((li) => $<SVGPathElement>(li, "path"));
  const paths = $$<SVGPathElement>(cantiere, "[data-scaffold-m] path");
  const sign = $(cantiere, "[data-sign-m]");
  const once = (trigger: Element, tl: gsap.core.Timeline) =>
    ScrollTrigger.create({ trigger, start: "40% bottom", once: true, markers: debug, onEnter: () => tl.play() });

  gsap.set(notes, { autoAlpha: 0, scale: 0.6, rotate: -3 });
  once(prima, gsap.timeline({ paused: true }).to(notes, { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.3, stagger: 0.2, ease: "back.out(2)" }));

  gsap.set(paths, { drawSVG: "0%" });
  gsap.set(sign, { autoAlpha: 0, y: -40, rotate: -8 });
  once(
    cantiere,
    gsap
      .timeline({ paused: true })
      .to(paths, { drawSVG: "100%", duration: 0.6, stagger: 0.04, ease: "power2.out" })
      .to(sign, { autoAlpha: 1, y: 0, rotate: -2, duration: 0.4, ease: "back.out(1.6)" }, 0.6),
  );

  gsap.set(piece("header"), { clipPath: "inset(0% 100% 0% 0%)" });
  gsap.set(headline, { fontVariationSettings: "'wdth' 62, 'wght' 400" });
  gsap.set([piece("photo"), piece("cta")], { autoAlpha: 0 });
  once(
    dopo,
    gsap
      .timeline({ paused: true, defaults: { ease: "power2.out" } })
      .to(piece("header"), { clipPath: "inset(0% 0% 0% 0%)", duration: 0.3 })
      .fromTo(piece("photo"), { autoAlpha: 0, filter: "blur(8px)" }, { autoAlpha: 1, filter: "blur(0px)", duration: 0.4 }, 0.2)
      .to(headline, { fontVariationSettings: "'wdth' 108, 'wght' 820", duration: 0.5 }, 0.4)
      .fromTo(piece("cta"), { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(1.6)" }, 0.9),
  );

  gsap.set(items, { autoAlpha: 0, x: -8 });
  gsap.set(ticks, { drawSVG: "0%" });
  once(
    $(section, "[data-check]"),
    gsap
      .timeline({ paused: true })
      .to(ticks, { drawSVG: "100%", duration: 0.25, stagger: 0.12 })
      .to(items, { autoAlpha: 1, x: 0, duration: 0.25, stagger: 0.12 }, 0),
  );

  return () => section.classList.remove("is-mobile-anim");
}

export function initRenovation() {
  const section = document.querySelector<HTMLElement>("[data-reno]");
  if (!section) return;
  const debug = new URLSearchParams(location.search).has("debug");
  ScrollTrigger.config({ ignoreMobileResize: true });

  let mm: gsap.MatchMedia | null = null;
  const build = () => {
    mm?.revert();
    mm = gsap.matchMedia();
    mm.add(
      {
        reduce: "(prefers-reduced-motion: reduce)",
        desktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        mobile: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
      },
      (ctx) => {
        const c = ctx.conditions ?? {};
        if (c.desktop) return setupDesktop(section, debug);
        if (c.mobile) return setupMobile(section, debug);
        return undefined;
      },
    );
  };

  const start = () => {
    build();
    ScrollTrigger.refresh();
  };
  if (document.fonts?.status === "loaded") start();
  else document.fonts.ready.then(start);

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
      if (w >= 768) start();
    }, 250);
  });
}
