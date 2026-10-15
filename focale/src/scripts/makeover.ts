import { gsap } from "gsap";
import { spring } from "./spring";
import { bindSoundButton, buzz, whoosh, fixed, ring, chime } from "./sound";
import { LID_OPEN, LID_SHUT, lidLift, lapUnit } from "./hinge";

/**
 * The makeover film, a mini film like the opening one: on an iPhone on phones, on a laptop on
 * computers (chosen by the screen width; one film per device, built the same way). The device starts
 * alone in the middle of the band, no words; when the film is over it glides to its place and the
 * words come in. It starts by itself when the device is well in view (no pinning, the scroll stays
 * free), pauses when it leaves and goes on when it comes back; once over it stays over.
 * One thing at a time, slow enough to read (about 30 s):
 * 1. the old site; then its five problems one by one: a lens on that piece only (it grows in place
 *    over its neighbours; the rest of the page does not move: Lorenzo found a zoom of the whole
 *    page hid what it zoomed on), a red box lights the problem, the rest of the screen dims, a
 *    floating label says what is wrong (over the screen, under the box);
 * 2. the phone lifts and turns all the way round, or the laptop's lid shuts and opens again; out
 *    of sight, the old site becomes the new one;
 * 3. the five fixes one by one: a green box on the part that solves each problem, the label green;
 * 4. a tap on "Chiama ora" (phone), a click on "Chiedi un preventivo" (laptop).
 * The status in the bar is worked out from the film's clock, so seeking or replaying never leaves
 * it out of step. Sound cues ride the timeline (silent until the visitor turns sound on).
 * See Makeover.astro for the markup and the no-JS final frame.
 */

// The script, in seconds. The laptop's film starts with the lid opening, so its problems start later.
const PSTEP = 2.4; // per problem
const FSTEP = 2;

type Box = { x: number; y: number; w: number; h: number };
interface Film {
  tl: gsap.core.Timeline;
  sync: (t: number) => void;
  fit: () => void;
  /** When the last scene (the tap or the click) is over, s. */
  end: number;
}

export function initMakeover() {
  const found = document.querySelector<HTMLElement>("[data-makeover]");
  if (!found || !window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
  const root: HTMLElement = found;
  const devs = Array.from(root.querySelectorAll<HTMLElement>("[data-mk-dev]"));
  const allBeats = Array.from(root.querySelectorAll<HTMLElement>("[data-mk-beat]"));
  root.classList.add("mk-live");

  // A mini film (Lorenzo): the device starts alone in the middle of the band, no words, no buttons;
  // when the film is over it glides to its place and the words come in, one after the other.
  // Transforms only (no layout shift) and nothing pinned: the page scrolls freely, nobody is made to
  // watch. "Rivedi" puts the device back in the middle.
  const stage = root.querySelector<HTMLElement>(".mk__stage")!;
  const words = Array.from(root.querySelectorAll<HTMLElement>("[data-mk-word]"));
  const toCentre = () => {
    const o = offsetIn(stage, root);
    return { x: root.clientWidth / 2 - (o.x + stage.offsetWidth / 2), y: root.clientHeight / 2 - (o.y + stage.offsetHeight / 2) };
  };

  // Computers see the laptop, phones the iPhone (the CSS shows one of the two).
  const wide = window.matchMedia("(min-width: 900px)");
  const films = new Map<string, Film>();
  const filmOf = (d: HTMLElement) => {
    const id = d.dataset.mkDev!;
    if (!films.has(id)) {
      if (id === "laptop") {
        // The 3D laptop (model, shaders) only once a good part of it is on screen: loaded with the page
        // (the band peeks at the fold) it slowed the opening film's entrance on weaker computers.
        const rig = d.querySelector<HTMLElement>("[data-laptop3d]")!;
        const near = new IntersectionObserver(
          ([e]) => {
            if (!e.isIntersecting) return;
            near.disconnect();
            import("./phone3d").then((m) => m.initLaptop3D(rig)).catch(() => {});
          },
          { threshold: 0.3 },
        );
        near.observe(rig);
      }
      const f = buildFilm(d, allBeats.filter((b) => b.dataset.for === id));
      f.tl.fromTo(stage, { x: () => toCentre().x, y: () => toCentre().y, scale: 1.04 }, { x: 0, y: 0, scale: 1, duration: 1.6, ease: "expo.inOut" }, f.end);
      f.tl.fromTo(words, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: 0.1 }, f.end + 0.8);
      films.set(id, f);
    }
    return films.get(id)!;
  };
  const pick = () => devs.find((d) => d.dataset.mkDev === (wide.matches ? "laptop" : "phone"))!;
  // On screen already when this runs (a reload keeps the scroll position): the device glides to the
  // middle and the words fade out, instead of jumping; it reads as the film starting.
  const box = stage.getBoundingClientRect();
  const onScreen = box.top < innerHeight && box.bottom > 0;
  let film = filmOf(pick());
  if (onScreen) {
    gsap.from(stage, { x: 0, y: 0, scale: 1, duration: 1.1, ease: "expo.inOut" });
    gsap.from(words, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.in", stagger: 0.04 });
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
  let inView = false;
  new IntersectionObserver(
    ([e]) => {
      inView = e.isIntersecting;
      if (!inView) film.tl.pause();
      else if (film.tl.progress() < 1) film.tl.play();
    },
    // Low enough that looking at the bar under the device does not pause the film.
    { threshold: 0.35 },
  ).observe(root.querySelector(".mk__devs")!);

  // A window dragged across the breakpoint (or a tablet turned): the other device, from the start.
  wide.addEventListener("change", () => {
    film.tl.pause();
    allBeats.forEach((x) => x.classList.remove("is-on"));
    requestAnimationFrame(() => {
      film = filmOf(pick());
      film.fit();
      film.tl.pause(0);
      film.tl.invalidate();
      film.sync(0);
      if (inView) film.tl.play();
    });
  });

  // Positions are measured on layout boxes: measure again when the width changes (phones resize
  // the window's height all the time as the address bar comes and goes: that changes nothing here).
  // After invalidate() the tweens not yet played put back their start values (the device in the
  // middle, the words hidden), and a seek to the same time draws nothing: step off and back so the
  // current frame is drawn again, or a finished film jumped back to its first frame.
  let rt = 0;
  let lastW = innerWidth;
  addEventListener("resize", () => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    clearTimeout(rt);
    rt = window.setTimeout(() => {
      const t = film.tl.time();
      film.fit();
      film.tl.invalidate();
      film.tl.time(Math.max(0, t - 0.001), true);
      film.tl.time(t, true);
      film.sync(t);
    }, 200);
  });
}

function buildFilm(dev: HTMLElement, beats: HTMLElement[]): Film {
  const laptop = dev.dataset.mkDev === "laptop";
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
  const lap = laptop ? q(".lap") : null;
  const endBtn = newSite.querySelector<HTMLElement>(laptop ? ".ah__btn--main" : ".ah__btn--ghost");

  const INTRO = laptop ? 2.6 : 2;
  const P0 = INTRO;
  const TURN = P0 + 5 * PSTEP + 0.2;
  const F0 = TURN + 3.4;
  const END = F0 + 5 * FSTEP;
  const LENGTH = END + 3.4;

  // The laptop's pages are drawn 1280 px wide (a computer screen) and scaled to the glass.
  const fit = () => {
    if (!laptop) return;
    const k = screen.offsetWidth / 1280;
    if (!k) return;
    [oldPage, newPage].forEach((p) => {
      p.style.setProperty("--k", String(k));
      p.style.height = `${screen.offsetHeight / k}px`;
    });
  };
  fit();

  // Hidden by opacity, not visibility: the new site is painted (and its images decoded) from the
  // start, so the swap out of sight costs nothing.
  gsap.set(newSite, { opacity: 0 });
  gsap.set(fa, { opacity: 0 });

  // The lid (laptop): one angle drives the CSS lid and, through hinge.ts, the 3D model.
  const lid = { deg: LID_OPEN };
  const applyLid = () => {
    if (!lap) return;
    lap.style.setProperty("--lid", `${lid.deg}deg`);
    lap.style.setProperty("--lift", `${-lidLift(lid.deg) * lapUnit(lap.offsetWidth)}px`);
  };

  // Caption (and the lid, also after a silent seek) follow the film's clock.
  let shownBeat = -1;
  const sync = (t: number) => {
    applyLid();
    const beat =
      t < P0 ? 0 : t < TURN ? 1 + Math.min(4, Math.floor((t - P0) / PSTEP)) : t < F0 ? 6 : t < END ? 7 + Math.min(4, Math.floor((t - F0) / FSTEP)) : 12;
    if (beat !== shownBeat || !beats[beat]?.classList.contains("is-on")) {
      shownBeat = beat;
      beats.forEach((b, j) => b.classList.toggle("is-on", j === beat));
    }
  };

  // Where things sit on the screen (px, layout boxes: transforms ignored, so the device's 3D turn
  // and the lens do not matter). Both pages may be drawn larger and scaled down to fit.
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
  const zMax = laptop ? 2.2 : 1.8;
  const zMin = laptop ? 1.1 : 1.3;
  const lens = (i: number) => {
    const W = screen.offsetWidth;
    const H = screen.offsetHeight;
    const b = oldBox(i);
    const k = scaleOf(oldPage);
    const z = Math.max(zMin, Math.min(zMax, (0.94 * W) / b.w, (0.4 * H) / b.h));
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

  // Floating labels. Phone on computers: left of the phone, level with the box, a dashed line
  // reaching it. Phones, and the laptop: over the screen, centred, just under the box (above it
  // when the box is low). Measured on screen (the laptop's glass leans back, so its layout box is
  // not where it shows).
  const side = () => !laptop && window.matchMedia("(min-width: 900px)").matches;
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

  // 0. The laptop: the lid opens on the old site.
  if (laptop) {
    lid.deg = LID_SHUT;
    applyLid();
    tl.fromTo(lid, { deg: LID_SHUT }, { deg: LID_OPEN, duration: 1.5, ease: "power3.out", immediateRender: false }, 0.3);
    cue(() => whoosh(1.1), 0.35);
  }

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

  // 2. The makeover, out of sight: the old site is swapped for the new one, then light crosses the glass.
  if (laptop) {
    // The lid shuts on the old site and opens on the new one.
    tl.to(lid, { deg: LID_SHUT, duration: 0.75, ease: "power2.in" }, TURN + 0.3);
    cue(() => whoosh(0.8), TURN + 0.3);
    tl.set(oldWrap, { autoAlpha: 0 }, TURN + 1.1);
    tl.set(newSite, { opacity: 1 }, TURN + 1.1);
    tl.to(lid, { deg: LID_OPEN, duration: 1.4, ease: "power3.out" }, TURN + 1.25);
    cue(() => whoosh(1.1), TURN + 1.25);
  } else {
    // The phone lifts and turns all the way round (titanium back, cameras).
    tl.to(obj, { y: -20, scale: 1.04, rotationX: 8, duration: 0.4, ease: "power2.out" }, TURN + 0.2);
    tl.to(obj, { rotationY: 360, duration: 2.2, ease: "power2.inOut" }, TURN + 0.4);
    cue(() => whoosh(1.8), TURN + 0.5);
    tl.set(oldWrap, { autoAlpha: 0 }, TURN + 1.5);
    tl.set(newSite, { opacity: 1 }, TURN + 1.5);
    tl.to(obj, { y: 0, scale: 1, rotationX: 0, duration: 0.6, ease: spring(0.25) }, TURN + 2.6);
    tl.set(obj, { rotationY: 0 }, TURN + 3.2);
  }
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

  // 4. The phone: a tap on "Chiama ora", and it rings. The laptop: the pointer clicks "Chiedi un preventivo".
  if (endBtn) {
    const k = () => scaleOf(newPage);
    const pos = () => offsetIn(endBtn, newPage);
    const cx = () => (pos().x + endBtn.offsetWidth / 2) * k();
    const cy = () => (pos().y + endBtn.offsetHeight / 2) * k();
    if (laptop) {
      tl.set(fa, { left: () => cx() + screen.offsetWidth * 0.3, top: () => cy() + screen.offsetHeight * 0.25, x: 0, y: 0 }, END);
      tl.to(fa, { opacity: 1, duration: 0.2 }, END + 0.05);
      tl.to(fa, { left: cx, top: cy, duration: 0.7, ease: "power3.inOut" }, END + 0.1);
      tl.to(endBtn, { scale: 0.94, duration: 0.12 }, END + 0.85);
      tl.to(fa, { scale: 0.85, duration: 0.12, transformOrigin: "20% 15%" }, END + 0.85);
      cue(() => chime(1.2), END + 0.9);
      tl.to([endBtn, fa], { scale: 1, duration: 0.5, ease: spring(0.35) }, END + 1);
      tl.to(fa, { opacity: 0, duration: 0.3 }, END + 1.7);
    } else {
      tl.set(fa, { left: () => screen.offsetLeft + cx(), top: () => screen.offsetTop + cy(), x: 0, y: 0, scale: 1.3 }, END + 0.2);
      tl.to(fa, { opacity: 0.95, scale: 0.9, duration: 0.25 }, END + 0.3);
      tl.to(endBtn, { scale: 0.93, duration: 0.15 }, END + 0.45);
      cue(ring, END + 0.5);
      tl.to(endBtn, { scale: 1, duration: 0.5, ease: spring(0.35) }, END + 0.6);
      tl.to(fa, { opacity: 0, scale: 1.5, duration: 0.4 }, END + 0.8);
    }
  }
  tl.to({}, { duration: 0.1 }, LENGTH - 0.1);
  sync(0);
  return { tl, sync, fit, end: END + (laptop ? 2.1 : 1.6) };
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
