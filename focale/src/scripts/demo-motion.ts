import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { initSmoothScroll } from "./smooth";

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * The motion kit of the demo sites (layouts/Demo.astro loads it on every demo): the same
 * techniques as the Focus Design site, driven by data attributes so each demo only writes markup.
 *
 *   [data-dh]              header: solid once the page scrolls, hides going down, back going up
 *   [data-menu]            menu button (aria-controls = the panel id); Escape and links close it
 *   [data-split]           heading rises line by line ("load": at once, otherwise on scroll)
 *   [data-rise]            rises out of a mask when it scrolls in; [data-rise-group] staggers its children
 *   [data-wipe]            picture frame opens from a smaller inset, the picture settles from a zoom
 *   [data-parallax="n"]    moves n% against the scroll inside its frame
 *   [data-hscroll]         section pins and its [data-hscroll-track] slides sideways (wide screens)
 *   [data-stack]           list of cards that stack while scrolling (CSS sticky; earlier cards recede)
 *   [data-count]           a number counts up to its own text when it scrolls in
 *   [data-mark]            a highlighter stroke draws under the text with the scroll
 *   [data-magnetic]        button leans towards the pointer (mouse only)
 *
 * Everything is readable without JS and with reduced motion (then only header and menu work).
 * No opacity fades on text: masks and movement keep full contrast at every moment.
 */
export function initDemoMotion() {
  initHeader();
  initMenu();
  if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
  document.documentElement.classList.add("dm-live");
  initSmoothScroll();
  ScrollTrigger.config({ ignoreMobileResize: true });
  splits();
  rises();
  wipes();
  parallax();
  hscroll();
  stacks();
  counts();
  marks();
  magnetic();
  // Fonts, "show more" buttons and form steps change the page height: measure again.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  let h = document.documentElement.scrollHeight;
  let tm = 0;
  new ResizeObserver(() => {
    const nh = document.documentElement.scrollHeight;
    if (Math.abs(nh - h) < 2) return;
    h = nh;
    clearTimeout(tm);
    tm = window.setTimeout(() => ScrollTrigger.refresh(), 200);
  }).observe(document.body);
}

function initHeader() {
  const h = document.querySelector<HTMLElement>("[data-dh]");
  if (!h) return;
  let lastY = scrollY;
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = scrollY;
    h.classList.toggle("is-solid", y > 24);
    const menuOpen = document.documentElement.classList.contains("dm-menu-open");
    if (!menuOpen) h.classList.toggle("is-hidden", y > 420 && y > lastY + 2);
    if (y < lastY - 2) h.classList.remove("is-hidden");
    lastY = y;
  };
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
}

function initMenu() {
  document.querySelectorAll<HTMLButtonElement>("[data-menu]").forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute("aria-controls")!);
    if (!panel) return;
    const set = (open: boolean) => {
      btn.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
      document.documentElement.classList.toggle("dm-menu-open", open);
      if (open) panel.querySelector<HTMLElement>("a, button")?.focus();
    };
    btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
    panel.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => set(false)));
    addEventListener("keydown", (e) => {
      if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") {
        set(false);
        btn.focus();
      }
    });
  });
}

const EASE = "expo.out";

const splitOf = new WeakMap<HTMLElement, SplitText>();

/** Replace the text of an element (language switch) without breaking its line animation. */
export function setText(el: HTMLElement, text: string) {
  const split = splitOf.get(el);
  if (!split) {
    el.textContent = text;
    return;
  }
  split.revert();
  el.textContent = text;
  split.split({ type: "lines", mask: "lines", autoSplit: true });
}

function splits() {
  document.querySelectorAll<HTMLElement>("[data-split]").forEach((el) => {
    const now = el.dataset.split === "load";
    let first = true;
    const split = SplitText.create(el, {
      type: "lines",
      mask: "lines",
      autoSplit: true,
      onSplit: (self) => {
        // Room for descenders under each masked line (tight line-heights clip g, p, q).
        gsap.set(self.masks, { paddingBottom: "0.16em", marginBottom: "-0.16em" });
        // Only the first split animates in; re-splits (resize, language) just lay the lines out.
        if (!first) return;
        first = false;
        return gsap.from(self.lines, {
          yPercent: 110,
          duration: 1.2,
          ease: EASE,
          stagger: 0.09,
          delay: now ? 0.15 : 0,
          scrollTrigger: now ? undefined : { trigger: el, start: "top 88%", once: true },
        });
      },
    });
    splitOf.set(el, split);
  });
}

function rises() {
  const items = Array.from(document.querySelectorAll<HTMLElement>("[data-rise], [data-rise-group] > *"));
  gsap.set(items, { clipPath: "inset(0 0 100% 0)", y: 34 });
  ScrollTrigger.batch(items, {
    start: "top 92%",
    once: true,
    onEnter: (batch) => gsap.to(batch, { clipPath: "inset(0 0 0% 0)", y: 0, duration: 1.1, ease: EASE, stagger: 0.08, clearProps: "clipPath" }),
  });
}

function wipes() {
  document.querySelectorAll<HTMLElement>("[data-wipe]").forEach((frame) => {
    const img = frame.querySelector("img");
    const tl = gsap.timeline({ scrollTrigger: { trigger: frame, start: "top 88%", once: true } });
    tl.fromTo(frame, { clipPath: "inset(14% 10% 14% 10% round 28px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 1.5, ease: EASE, clearProps: "clipPath" });
    if (img) tl.fromTo(img, { scale: 1.28 }, { scale: 1, duration: 1.8, ease: EASE }, 0);
  });
}

function parallax() {
  document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
    const v = Number(el.dataset.parallax || 12);
    gsap.fromTo(
      el,
      { yPercent: -v, scale: 1 + v / 50 },
      { yPercent: v, scale: 1 + v / 50, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } },
    );
  });
}

function hscroll() {
  const mm = gsap.matchMedia();
  mm.add("(min-width: 900px)", () => {
    document.querySelectorAll<HTMLElement>("[data-hscroll]").forEach((sec) => {
      const track = sec.querySelector<HTMLElement>("[data-hscroll-track]");
      if (!track) return;
      // The track is as wide as its content; the section is the window it slides through.
      const dist = () => Math.max(0, track.scrollWidth - sec.clientWidth);
      gsap.to(track, {
        x: () => -dist(),
        ease: "none",
        scrollTrigger: { trigger: sec, start: "top top", end: () => `+=${dist()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 },
      });
    });
  });
}

function stacks() {
  const mm = gsap.matchMedia();
  mm.add("(min-width: 900px)", () => {
    document.querySelectorAll<HTMLElement>("[data-stack]").forEach((list) => {
      const cards = Array.from(list.children) as HTMLElement[];
      cards.slice(0, -1).forEach((card, i) => {
        // As the next card slides over it, this one recedes a little.
        gsap.to(card.firstElementChild, {
          scale: 0.92,
          filter: "brightness(0.82)",
          ease: "none",
          scrollTrigger: { trigger: cards[i + 1], start: "top bottom", end: "top 25%", scrub: true },
        });
      });
    });
  });
}

function counts() {
  const fmt = new Intl.NumberFormat("it-IT");
  document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;
    const o = { v: 0 };
    gsap.to(o, {
      v: target,
      duration: 1.6,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
      onUpdate: () => (el.textContent = fmt.format(Math.round(o.v))),
    });
  });
}

function marks() {
  document.querySelectorAll<HTMLElement>("[data-mark]").forEach((el) => {
    gsap.fromTo(el, { backgroundSize: "0% 38%" }, { backgroundSize: "100% 38%", ease: "none", scrollTrigger: { trigger: el, start: "top 85%", end: "top 55%", scrub: true } });
  });
}

function magnetic() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
    const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * 0.25);
      y((e.clientY - (r.top + r.height / 2)) * 0.35);
    });
    el.addEventListener("pointerleave", () => {
      x(0);
      y(0);
    });
  });
}
