import { gsap } from "gsap";
import { spring } from "./spring";
import { bindSoundButton, buzz, whoosh, fixed, ring } from "./sound";

/**
 * The makeover film, played like the opening one: it starts by itself when the phone is well in
 * view (no pinning, the scroll stays free), pauses when it leaves and goes on when it comes back.
 * One thing at a time, slow enough to read (about 30 s):
 * 1. the old site; then its five problems one by one: a lens on that piece only (it grows in place,
 *    1.3x-1.8x, over its neighbours; the rest of the page does not move: Lorenzo found a zoom of the
 *    whole page hid what it zoomed on), a red box lights the problem, the rest of the screen dims, a
 *    floating label says what is wrong (beside the phone on computers, with a dashed line to the
 *    box; over the phone, under the box, on phones);
 * 2. the phone lifts and turns all the way round; facing away, the old site becomes the new one;
 * 3. the five fixes one by one: a green box on the part that solves each problem, the label green;
 * 4. a tap on "Chiama ora".
 * The status in the bar under the phone is worked out from the film's clock, so seeking or
 * replaying never leaves it out of step. Sound cues ride the timeline (silent until the visitor
 * turns sound on). See Makeover.astro for the markup and the no-JS final frame.
 */

// The script, in seconds.
const PSTEP = 2.4; // per problem
const FSTEP = 2;

type Box = { x: number; y: number; w: number; h: number };
interface Film {
  tl: gsap.core.Timeline;
  sync: (t: number) => void;
  /** When the last scene (the tap) is over, s. */
  end: number;
}

export function initMakeover() {
  const found = document.querySelector<HTMLElement>("[data-makeover]");
  if (!found || !window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
  const root: HTMLElement = found;
  const dev = root.querySelector<HTMLElement>("[data-mk-dev]")!;
  root.classList.add("mk-live");
  const film = buildFilm(dev, Array.from(root.querySelectorAll<HTMLElement>("[data-mk-beat]")));

  // A mini film (Lorenzo): the phone starts alone in the middle of the band, no words, no buttons;
  // when the film is over it glides to its place on the right and the words come in, one after the
  // other. Transforms only (no layout shift) and nothing pinned: the page scrolls freely, nobody is
  // made to watch. "Rivedi" puts the phone back in the middle. Left out when the band is already on
  // screen when this runs (the visitor would see it jump); the band's top peeking at the fold is fine.
  const stage = root.querySelector<HTMLElement>(".mk__stage")!;
  const words = Array.from(root.querySelectorAll<HTMLElement>("[data-mk-word]"));
  const box = stage.getBoundingClientRect();
  if (box.top > innerHeight - box.height * 0.25 || box.bottom < 0) {
    const toCentre = () => {
      const o = offsetIn(stage, root);
      return { x: root.clientWidth / 2 - (o.x + stage.offsetWidth / 2), y: root.clientHeight / 2 - (o.y + stage.offsetHeight / 2) };
    };
    film.tl.fromTo(
      stage,
      { x: () => toCentre().x, y: () => toCentre().y, scale: 1.04 },
      { x: 0, y: 0, scale: 1, duration: 1.6, ease: "expo.inOut" },
      film.end,
    );
    film.tl.fromTo(words, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: 0.1 }, film.end + 0.8);
  }

  // Controls: sound and replay. Plays when in view, pauses when it leaves, goes on when it comes
  // back. Once over it stays over (the words and the button stay put); "Rivedi" plays it again.
  const ctl = root.querySelector<HTMLElement>("[data-mk-ctl]")!;
  const replay = root.querySelector<HTMLButtonElement>("[data-mk-replay]")!;
  ctl.hidden = false;
  const restart = () => {
    film.tl.pause(0);
    film.sync(0);
    film.tl.play();
  };
  replay.addEventListener("click", () => {
    restart();
    gsap.fromTo(replay.querySelector("svg"), { rotation: 0 }, { rotation: -360, duration: 0.6, ease: "power2.out" });
  });
  bindSoundButton(root.querySelector<HTMLButtonElement>("[data-mk-sound]")!, restart);
  new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) {
        if (film.tl.progress() < 1) film.tl.play();
      } else film.tl.pause();
    },
    // Low enough that looking at the bar under the phone does not pause the film.
    { threshold: 0.35 },
  ).observe(root.querySelector(".mk__devs")!);

  // Positions are measured on layout boxes: measure again when the layout changes.
  let rt = 0;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = window.setTimeout(() => {
      const t = film.tl.time();
      film.tl.invalidate();
      film.tl.time(t, true);
      film.sync(t);
    }, 200);
  });
}

function buildFilm(dev: HTMLElement, beats: HTMLElement[]): Film {
  const q = <T extends HTMLElement = HTMLElement>(s: string) => dev.querySelector<T>(s)!;
  const qa = (s: string) => Array.from(dev.querySelectorAll<HTMLElement>(s));
  const screen = q("[data-mk-screen]");
  const oldWrap = q("[data-mk-old]");
  const oldPage = q("[data-mk-oldpage]");
  const newSite = q("[data-mk-new]");
  const newPage = q("[data-mk-newpage]");
  const fa = q("[data-mk-fa]");
  const obj = q("[data-mk-obj]");
  const sweep = q("[data-mk-sweep]");
  const marks = qa("[data-mk-mark]");
  const goods = qa("[data-mk-good]");
  const tags = qa("[data-mk-tag]");
  const endBtn = newSite.querySelector<HTMLElement>(".ah__btn--ghost");

  const INTRO = 2;
  const P0 = INTRO;
  const TURN = P0 + 5 * PSTEP + 0.2;
  const F0 = TURN + 3.4;
  const END = F0 + 5 * FSTEP;
  const LENGTH = END + 3.4;

  // Hidden by opacity, not visibility: the new site is painted (and its images decoded) from the
  // start, so the swap out of sight costs nothing.
  gsap.set(newSite, { opacity: 0 });
  gsap.set(fa, { opacity: 0 });

  // Caption follows the film's clock.
  let shownBeat = -1;
  const sync = (t: number) => {
    const beat =
      t < P0 ? 0 : t < TURN ? 1 + Math.min(4, Math.floor((t - P0) / PSTEP)) : t < F0 ? 6 : t < END ? 7 + Math.min(4, Math.floor((t - F0) / FSTEP)) : 12;
    if (beat !== shownBeat || !beats[beat]?.classList.contains("is-on")) {
      shownBeat = beat;
      beats.forEach((b, j) => b.classList.toggle("is-on", j === beat));
    }
  };

  // Where things sit on the screen (px, layout boxes: transforms ignored, so the phone's 3D turn
  // and the lens do not matter). The old page is drawn at 220% and scaled down to fit.
  const scaleOf = (page: HTMLElement) => (page.offsetWidth ? screen.offsetWidth / page.offsetWidth : 1);
  const boxIn = (page: HTMLElement, sel: string): Box => {
    const el = page.querySelector<HTMLElement>(sel)!;
    const o = offsetIn(el, page);
    const k = scaleOf(page);
    return { x: o.x * k, y: o.y * k, w: el.offsetWidth * k, h: el.offsetHeight * k };
  };
  const oldBox = (i: number) => boxIn(oldPage, marks[i].dataset.oldPiece!);
  const newBox = (i: number) => boxIn(newPage, goods[i].dataset.fix!);
  const pad = 2;
  const place = (box: () => Box) => ({
    left: () => box().x - pad,
    top: () => box().y - pad,
    width: () => Math.max(18, box().w + 2 * pad),
    height: () => Math.max(16, box().h + 2 * pad),
  });
  // The lens on problem i: only that piece of the old page grows, in place, kept inside the screen
  // when it fits (wide pieces such as the header are allowed to crop at the sides).
  const piece = (i: number) => oldPage.querySelector<HTMLElement>(marks[i].dataset.oldPiece!)!;
  const lens = (i: number) => {
    const W = screen.offsetWidth;
    const H = screen.offsetHeight;
    const b = oldBox(i);
    const k = scaleOf(oldPage);
    const z = Math.max(1.3, Math.min(1.8, (0.94 * W) / b.w, (0.4 * H) / b.h));
    const keep = (c: number, size: number, room: number) => (size * z <= room - 8 ? Math.min(Math.max(c, (size * z) / 2 + 4), room - (size * z) / 2 - 4) : c);
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const tx = keep(cx, b.w, W);
    const ty = keep(cy, b.h, H);
    // The transform origin that scales the box around its centre and lands it on (tx, ty).
    const ox = (tx - cx * z) / (1 - z);
    const oy = (ty - cy * z) / (1 - z);
    return {
      z,
      origin: `${(ox - b.x) / k}px ${(oy - b.y) / k}px`,
      box: { x: tx - (b.w * z) / 2, y: ty - (b.h * z) / 2, w: b.w * z, h: b.h * z },
    };
  };

  // Floating labels. Computers: left of the phone, level with the box, a dashed line reaching it.
  // Phones: over the phone, centred, just under the box (above it when the box is low).
  const side = () => window.matchMedia("(min-width: 900px)").matches;
  const glass = () => {
    const r = screen.getBoundingClientRect();
    const d = dev.getBoundingClientRect();
    return { x: r.left - d.left, y: r.top - d.top, w: r.width, h: r.height, sx: r.width / (screen.offsetWidth || 1), sy: r.height / (screen.offsetHeight || 1) };
  };
  const tagAt = (i: number, box: () => Box) => {
    const t = tags[i];
    const gap = 18;
    return {
      left: () => {
        const g = glass();
        return side() ? g.x - gap - t.offsetWidth - 24 : g.x + (g.w - t.offsetWidth) / 2;
      },
      top: () => {
        const g = glass();
        const b = box();
        const by = g.y + b.y * g.sy;
        const bh = b.h * g.sy;
        if (side()) return by + bh / 2 - t.offsetHeight / 2;
        const below = by + bh + 12;
        return below + t.offsetHeight < g.y + g.h - 8 ? below : by - t.offsetHeight - 12;
      },
      "--reach": () => (side() ? `${24 + gap + Math.max(0, box().x * glass().sx) + 2}px` : "0px"),
    };
  };

  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: "power2.inOut" },
    onUpdate: () => sync(tl.time()),
  });
  const cue = (fn: () => void, at: number) => tl.call(fn, [], at);

  marks.forEach((m, i) => tl.set(m, place(() => oldBox(i)), 0));
  goods.forEach((g, i) => tl.set(g, place(() => newBox(i)), 0));

  // 1. The problems, one at a time: the red box lights it, the rest dims, the label says what is wrong.
  marks.forEach((m, i) => {
    const at = P0 + i * PSTEP;
    const t = tags[i];
    const el = piece(i);
    tl.set(el, { transformOrigin: () => lens(i).origin, zIndex: 5 }, at);
    tl.to(el, { scale: () => lens(i).z, backgroundColor: "#fffbe6", boxShadow: "0 18px 40px rgba(0, 0, 0, 0.35)", duration: 0.6, ease: "power3.out" }, at);
    tl.set(m, place(() => lens(i).box), at);
    tl.set(t, { ...tagAt(i, () => lens(i).box), "--tone": "#d92d20" }, at);
    tl.to(el, { scale: 1, boxShadow: "0 0 0 rgba(0, 0, 0, 0)", duration: 0.35 }, at + PSTEP - 0.35);
    tl.set(el, { zIndex: "auto", backgroundColor: "transparent" }, at + PSTEP);
    tl.fromTo(
      m,
      { autoAlpha: 0, scale: 1.25, boxShadow: "0 0 0 2000px rgba(11, 27, 63, 0)" },
      { autoAlpha: 1, scale: 1, boxShadow: "0 0 0 2000px rgba(11, 27, 63, 0.45)", duration: 0.45, ease: spring(0.3) },
      at + 0.2,
    );
    tl.fromTo(t, { autoAlpha: 0, x: () => (side() ? -14 : 0), y: () => (side() ? 0 : 8) }, { autoAlpha: 1, x: 0, y: 0, duration: 0.45, ease: spring(0.3) }, at + 0.35);
    cue(buzz, at + 0.2);
    tl.to([m, t], { autoAlpha: 0, duration: 0.25 }, at + PSTEP - 0.3);
  });

  // 2. The makeover: the phone lifts and turns all the way round (titanium back, cameras); when it
  //    faces away the old site is swapped for the new one, then light crosses the glass.
  tl.to(obj, { y: -20, scale: 1.04, rotationX: 8, duration: 0.4, ease: "power2.out" }, TURN + 0.2);
  tl.to(obj, { rotationY: 360, duration: 2.2, ease: "power2.inOut" }, TURN + 0.4);
  cue(() => whoosh(1.8), TURN + 0.5);
  tl.set(oldWrap, { autoAlpha: 0 }, TURN + 1.5);
  tl.set(newSite, { opacity: 1 }, TURN + 1.5);
  tl.to(obj, { y: 0, scale: 1, rotationX: 0, duration: 0.6, ease: spring(0.25) }, TURN + 2.6);
  tl.set(obj, { rotationY: 0 }, TURN + 3.2);
  tl.fromTo(sweep, { left: "-60%", opacity: 0 }, { left: "120%", opacity: 1, duration: 0.6, ease: "power1.inOut" }, TURN + 2.7);
  tl.to(sweep, { opacity: 0, duration: 0.1 }, TURN + 3.3);

  // 3. The fixes, one at a time: a green box on the part of the new site that solves it, the label green.
  goods.forEach((g, i) => {
    const at = F0 + i * FSTEP;
    const t = tags[i];
    const dot = t.querySelector(".mk__tdot")!;
    tl.set(t, { ...tagAt(i, () => newBox(i)), "--tone": "#1f8a4c" }, at);
    tl.set(t.querySelector(".mk__tbad"), { display: "none" }, at);
    tl.set(t.querySelector(".mk__tgood"), { display: "block" }, at);
    tl.set(dot, { backgroundColor: "#1f8a4c" }, at);
    tl.set(dot.querySelector(".mk__tn"), { opacity: 0 }, at);
    tl.set(dot.querySelector("svg"), { opacity: 1 }, at);
    tl.fromTo(g, { autoAlpha: 0, scale: 1.2 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: spring(0.3) }, at + 0.2);
    tl.fromTo(t, { autoAlpha: 0, x: () => (side() ? -14 : 0), y: () => (side() ? 0 : 8) }, { autoAlpha: 1, x: 0, y: 0, duration: 0.45, ease: spring(0.3) }, at + 0.3);
    cue(() => fixed(i), at + 0.2);
    tl.to([g, t], { autoAlpha: 0, duration: 0.25 }, at + FSTEP - 0.25);
  });

  // 4. A tap on "Chiama ora", and the phone rings.
  if (endBtn) {
    const k = () => scaleOf(newPage);
    const pos = () => offsetIn(endBtn, newPage);
    const cx = () => (pos().x + endBtn.offsetWidth / 2) * k();
    const cy = () => (pos().y + endBtn.offsetHeight / 2) * k();
    tl.set(fa, { left: () => screen.offsetLeft + cx(), top: () => screen.offsetTop + cy(), x: 0, y: 0, scale: 1.3 }, END + 0.2);
    tl.to(fa, { opacity: 0.95, scale: 0.9, duration: 0.25 }, END + 0.3);
    tl.to(endBtn, { scale: 0.93, duration: 0.15 }, END + 0.45);
    cue(ring, END + 0.5);
    tl.to(endBtn, { scale: 1, duration: 0.5, ease: spring(0.35) }, END + 0.6);
    tl.to(fa, { opacity: 0, scale: 1.5, duration: 0.4 }, END + 0.8);
  }
  tl.to({}, { duration: 0.1 }, LENGTH - 0.1);
  sync(0);
  return { tl, sync, end: END + 1.6 };
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
