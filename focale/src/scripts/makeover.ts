import { gsap } from "gsap";
import { spring } from "./spring";
import { bindSoundButton, buzz, whoosh, fixed, ring } from "./sound";

/**
 * The makeover film, played like the opening one: it starts by itself when the phone is well in
 * view (no pinning, the scroll stays free), pauses when it leaves and goes on when it comes back.
 * One thing at a time, slow enough to read (about 30 s):
 * 1. the old site; then its five problems one by one: the screen zooms on the problem, a red box
 *    lights it, the rest dims, the line under the phone says what is wrong;
 * 2. the phone lifts and turns all the way round; facing away, the old site becomes the new one;
 * 3. the five fixes one by one: a green box on the part that solves each problem;
 * 4. a tap on "Chiama ora".
 * The caption line and the checklist (computers) are worked out from the film's time, so seeking
 * or replaying never leaves them out of step. Sound cues ride the timeline (silent until the
 * visitor turns sound on). See Makeover.astro for the markup and the no-JS final frame.
 */

// The script, in seconds.
const INTRO = 2;
const P0 = INTRO; // first problem
const PSTEP = 2.4; // per problem
const TURN = P0 + 5 * PSTEP + 0.2; // 14.2
const F0 = TURN + 3.4; // first fix, 17.6
const FSTEP = 2;
const END = F0 + 5 * FSTEP; // 27.6
const LENGTH = END + 3.4;

export function initMakeover() {
  const found = document.querySelector<HTMLElement>("[data-makeover]");
  if (!found || !window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
  const root: HTMLElement = found;
  const q = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const qa = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
  const stage = q(".mk__stage");
  const screen = q("[data-mk-screen]");
  const oldWrap = q("[data-mk-old]");
  const zoom = q("[data-mk-zoom]");
  const oldPage = q("[data-mk-oldpage]");
  const newSite = q("[data-mk-new]");
  const fa = q("[data-mk-fa]");
  const obj = q("[data-mk-obj]");
  const sweep = q("[data-mk-sweep]");
  const marks = qa("[data-mk-mark]");
  const goods = qa("[data-mk-good]");
  const rows = qa("[data-mk-row]");
  const beats = qa("[data-mk-beat]");
  const callBtn = newSite.querySelector<HTMLElement>(".ah__btn--ghost");

  root.classList.add("mk-live");
  // Hidden by opacity, not visibility: the new site is painted (and its images decoded) from the
  // start, so the swap mid-turn costs nothing.
  gsap.set(newSite, { opacity: 0 });
  gsap.set(fa, { opacity: 0 });

  // Caption and checklist follow the film's clock.
  let shownBeat = -1;
  const sync = (t: number) => {
    const beat =
      t < P0 ? 0 : t < TURN ? 1 + Math.min(4, Math.floor((t - P0) / PSTEP)) : t < F0 ? 6 : t < END ? 7 + Math.min(4, Math.floor((t - F0) / FSTEP)) : 12;
    if (beat !== shownBeat) {
      shownBeat = beat;
      beats.forEach((b, j) => b.classList.toggle("is-on", j === beat));
    }
    rows.forEach((r, i) => {
      const good = t >= F0 + i * FSTEP;
      const bad = !good && t >= P0 + i * PSTEP;
      r.classList.toggle("is-good", good);
      r.classList.toggle("is-bad", bad);
      r.classList.toggle("is-now", beat === 1 + i || beat === 7 + i);
    });
  };
  sync(0);

  // Where things sit on the screen (px, layout boxes: transforms ignored, so the phone's 3D turn
  // and the zoom do not matter). The old page is drawn at 220% and scaled down to fit.
  const oldScale = () => (oldPage.offsetWidth ? screen.offsetWidth / oldPage.offsetWidth : 0.4545);
  const oldBox = (i: number) => {
    const el = oldPage.querySelector<HTMLElement>(`[data-old="${marks[i].dataset.oldPiece}"]`)!;
    const o = offsetIn(el, oldPage);
    const k = oldScale();
    return { x: o.x * k, y: o.y * k, w: el.offsetWidth * k, h: el.offsetHeight * k };
  };
  const newBox = (i: number) => {
    const el = newSite.querySelector<HTMLElement>(goods[i].dataset.fix!)!;
    const o = offsetIn(el, newSite);
    return { x: o.x, y: o.y, w: el.offsetWidth, h: el.offsetHeight };
  };
  const pad = 2;
  const place = (box: () => { x: number; y: number; w: number; h: number }) => ({
    left: () => box().x - pad,
    top: () => box().y - pad,
    width: () => Math.max(18, box().w + 2 * pad),
    height: () => Math.max(16, box().h + 2 * pad),
  });
  // The zoom that brings problem i to the middle of the screen, big enough to read (1.7x to 2.4x,
  // by its height: wide pieces get cropped at the sides), never showing beyond the page's edges.
  const zoomTo = (i: number) => {
    const b = () => oldBox(i);
    const W = () => screen.offsetWidth;
    const H = () => screen.offsetHeight;
    const z = () => Math.min(2.4, Math.max(1.7, (0.4 * H()) / b().h));
    const clamp = (v: number, min: number) => Math.min(0, Math.max(min, v));
    return {
      scale: z,
      x: () => clamp(W() / 2 - (b().x + b().w / 2) * z(), W() * (1 - z())),
      y: () => clamp(H() / 2 - (b().y + b().h / 2) * z(), H() * (1 - z())),
    };
  };

  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: "power2.inOut" },
    onUpdate: () => sync(tl.time()),
  });
  const cue = (fn: () => void, at: number) => tl.call(fn, [], at);

  gsap.set(zoom, { transformOrigin: "0 0" });
  marks.forEach((m, i) => tl.set(m, place(() => oldBox(i)), 0));
  goods.forEach((g, i) => tl.set(g, place(() => newBox(i)), 0));
  tl.set(zoom, { x: 0, y: 0, scale: 1 }, 0);

  // 1. The problems, one at a time: zoom in, the red box lights it and the rest dims.
  marks.forEach((m, i) => {
    const at = P0 + i * PSTEP;
    tl.to(zoom, { ...zoomTo(i), duration: 0.7 }, at);
    tl.fromTo(
      m,
      { autoAlpha: 0, scale: 1.25, boxShadow: "0 0 0 2000px rgba(11, 27, 63, 0)" },
      { autoAlpha: 1, scale: 1, boxShadow: "0 0 0 2000px rgba(11, 27, 63, 0.4)", duration: 0.45, ease: spring(0.3) },
      at + 0.55,
    );
    cue(buzz, at + 0.55);
    tl.to(m, { autoAlpha: 0, duration: 0.25 }, at + PSTEP - 0.3);
  });
  tl.to(zoom, { x: 0, y: 0, scale: 1, duration: 0.6 }, TURN - 0.4);

  // 2. The makeover: the phone lifts and turns all the way round (titanium back, cameras);
  //    when it faces away the old site is swapped for the new one, then light crosses the glass.
  tl.to(obj, { y: -20, scale: 1.04, rotationX: 8, duration: 0.4, ease: "power2.out" }, TURN + 0.2);
  tl.to(obj, { rotationY: 360, duration: 2.2, ease: "power2.inOut" }, TURN + 0.4);
  cue(() => whoosh(1.8), TURN + 0.5);
  tl.set(oldWrap, { autoAlpha: 0 }, TURN + 1.5);
  tl.set(newSite, { opacity: 1 }, TURN + 1.5);
  tl.to(obj, { y: 0, scale: 1, rotationX: 0, duration: 0.6, ease: spring(0.25) }, TURN + 2.6);
  tl.set(obj, { rotationY: 0 }, TURN + 3.2);
  tl.fromTo(sweep, { left: "-60%", opacity: 0 }, { left: "120%", opacity: 1, duration: 0.6, ease: "power1.inOut" }, TURN + 2.7);
  tl.to(sweep, { opacity: 0, duration: 0.1 }, TURN + 3.3);

  // 3. The fixes, one at a time: a green box on the part of the new site that solves it.
  goods.forEach((g, i) => {
    const at = F0 + i * FSTEP;
    tl.fromTo(g, { autoAlpha: 0, scale: 1.2 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: spring(0.3) }, at + 0.2);
    cue(() => fixed(i), at + 0.2);
    tl.to(g, { autoAlpha: 0, duration: 0.25 }, at + FSTEP - 0.25);
  });

  // 4. A tap on "Chiama ora", and the phone rings.
  if (callBtn) {
    const pos = () => offsetIn(callBtn, newSite);
    tl.set(fa, { left: () => screen.offsetLeft + pos().x + callBtn.offsetWidth / 2, top: () => screen.offsetTop + pos().y + callBtn.offsetHeight / 2, x: 0, y: 0, scale: 1.3 }, END + 0.2);
    tl.to(fa, { opacity: 0.95, scale: 0.9, duration: 0.25 }, END + 0.3);
    tl.to(callBtn, { scale: 0.93, duration: 0.15 }, END + 0.45);
    cue(ring, END + 0.5);
    tl.to(callBtn, { scale: 1, duration: 0.5, ease: spring(0.35) }, END + 0.6);
    tl.to(fa, { opacity: 0, scale: 1.5, duration: 0.4 }, END + 0.8);
  }
  tl.to({}, { duration: 0.1 }, LENGTH - 0.1);

  // Controls: sound and replay. Plays when in view, pauses when it leaves, goes on when it comes
  // back; once finished, it plays again from the start the next time it comes into view.
  const ctl = q("[data-mk-ctl]");
  const replay = q<HTMLButtonElement>("[data-mk-replay]");
  ctl.hidden = false;
  const restart = () => {
    tl.restart();
    sync(0);
  };
  replay.addEventListener("click", restart);
  bindSoundButton(q<HTMLButtonElement>("[data-mk-sound]"), restart);
  new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) {
        if (tl.progress() >= 1) restart();
        else tl.play();
      } else tl.pause();
    },
    { threshold: 0.6 },
  ).observe(stage);
  // Positions are measured on layout boxes: measure again when the layout changes.
  let rt = 0;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = window.setTimeout(() => {
      const t = tl.time();
      tl.invalidate();
      tl.time(t, true);
      sync(t);
    }, 200);
  });
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
