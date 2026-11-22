import { motionOk, sharpen, soften, watchFocus } from "./focus";

/**
 * Home works (Works.astro). Computers with motion allowed: the stage pins (CSS position: sticky, the
 * page keeps its native scroll) and the works take turns as the track scrolls past; the one on stage
 * comes into focus once. Phones, reduced motion, no JS: the works stay stacked, each shot sharpens
 * once as it scrolls in. The rail under the text fills with a CSS scroll-driven animation where the
 * browser has one, otherwise from --p set here.
 */
export function initWorks() {
  const sec = document.querySelector<HTMLElement>("[data-works]");
  const track = sec?.querySelector<HTMLElement>("[data-wk]");
  if (!sec || !track) return;
  const items = Array.from(sec.querySelectorAll<HTMLElement>("[data-wk-item]"));
  const shots = items.map((it) => it.querySelector<HTMLElement>("[data-fshot]")).filter((s): s is HTMLElement => !!s);
  const n = items.length;
  const wide = window.matchMedia("(min-width: 900px)");
  const pinOk = () => wide.matches && motionOk();

  let pinned = false;
  let step = -1;
  let raf = 0;
  const top0 = () => parseFloat(getComputedStyle(track).getPropertyValue("--wk-top")) || 0;

  const progress = () => {
    const r = track.getBoundingClientRect();
    const stage = track.firstElementChild as HTMLElement;
    const span = Math.max(1, r.height - stage.offsetHeight);
    return Math.min(1, Math.max(0, (top0() - r.top) / span));
  };
  const show = (k: number) => {
    if (k === step) return;
    step = k;
    items.forEach((it, i) => it.toggleAttribute("data-on", i === k));
    if (shots[k]) sharpen(shots[k]);
  };
  const update = () => {
    raf = 0;
    if (!pinned) return;
    const p = progress();
    track.style.setProperty("--p", p.toFixed(4));
    show(Math.min(n - 1, Math.floor(p * n)));
  };
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };

  const apply = () => {
    const want = pinOk();
    if (want === pinned) return;
    pinned = want;
    sec.classList.toggle("wk--pin", pinned);
    if (pinned) {
      // Every work waits out of focus for its turn on stage; scroll position decides which one shows.
      shots.forEach(soften);
      step = -1;
      addEventListener("scroll", onScroll, { passive: true });
      addEventListener("resize", onScroll, { passive: true });
      update();
    } else {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      items.forEach((it) => it.removeAttribute("data-on"));
      shots.forEach(sharpen);
    }
  };

  // Keyboard: a link of a work that is not on stage brings that work on stage, so focus is never invisible.
  sec.addEventListener("focusin", (e) => {
    if (!pinned) return;
    const k = items.findIndex((it) => it.contains(e.target as Node));
    if (k < 0 || k === step) return;
    const r = track.getBoundingClientRect();
    const stage = track.firstElementChild as HTMLElement;
    const span = r.height - stage.offsetHeight;
    window.scrollTo({ top: window.scrollY + r.top - top0() + ((k + 0.5) / n) * span, behavior: "instant" });
    update();
  });

  if (pinOk()) apply();
  else watchFocus(shots);
  wide.addEventListener("change", apply);
}
