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
const FSTEP = 2; // per fix (a real page that scrolls to each one takes longer: ROLL_STEP)
const ROLL_STEP = 2.9;
const ROLL = 0.85; // the scroll to the next fix
const DIM = { off: "0 0 0 2000px rgba(11, 27, 63, 0)", on: "0 0 0 2000px rgba(11, 27, 63, 0.45)" };

type Box = { x: number; y: number; w: number; h: number };
interface Film {
  tl: gsap.core.Timeline;
  sync: (t: number) => void;
  fit: () => void;
  /** When the last scene (the tap or the click) is over, s. */
  end: number;
  /** Resolves when the film can start (the laptop waits for its 3D body). */
  ready?: Promise<void>;
  map: MapView;
}
/** The end of the film: Prima | Dopo shows either site, clean. */
interface MapView {
  enter: () => void;
  exit: () => void;
  show: (side: "old" | "new") => void;
  layout: () => void;
}

export function initMakeover() {
  if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
  // The home's film, and a project page's own (Makeover.astro takes its sites as slots).
  document.querySelectorAll<HTMLElement>("[data-makeover]").forEach((root, n) => initFilm(root, n === 0));
}

function initFilm(root: HTMLElement, first: boolean) {
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
      let ready = Promise.resolve();
      if (id === "laptop") {
        // The 3D laptop is preloaded and started at the visitor's first gesture (index.astro). The
        // film waits for it (3 s at most) before opening the lid, so the opening is never played by
        // the CSS stand-in; it also starts it here if no gesture came first.
        const rig = d.querySelector<HTMLElement>("[data-laptop3d]")!;
        ready = new Promise<void>((done) => {
          if (rig.dataset.gl === "ready") return done();
          rig.addEventListener("gl-ready", () => done(), { once: true });
          window.setTimeout(done, 3000);
        });
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
      const f = { ...buildFilm(d, allBeats.filter((b) => b.dataset.for === id)), ready };
      f.tl.fromTo(stage, { x: () => toCentre().x, y: () => toCentre().y, scale: 1.04 }, { x: 0, y: 0, scale: 1, duration: 1.6, ease: "expo.inOut" }, f.end);
      f.tl.fromTo(words, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: 0.1 }, f.end + 0.8);
      f.tl.eventCallback("onComplete", () => f === film && enterMap());
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
  if (import.meta.env.DEV && first) Object.assign(window, { __mkTl: () => film.tl });
  if (onScreen) {
    gsap.from(stage, { x: 0, y: 0, scale: 1, duration: 1.1, ease: "expo.inOut" });
    gsap.from(words, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.in", stagger: 0.04 });
  }

  // Controls: sound and replay. Plays when in view, pauses when it leaves, goes on when it comes
  // back. Once over it stays over (the words and the button stay put); "Rivedi" plays it again.
  const ctl = root.querySelector<HTMLElement>("[data-mk-ctl]")!;
  const replay = root.querySelector<HTMLButtonElement>("[data-mk-replay]")!;
  ctl.hidden = false;

  // The map at the end: the status gives way to Prima | Dopo.
  const bar = root.querySelector<HTMLElement>(".mk__bar")!;
  const mapCtl = root.querySelector<HTMLElement>("[data-mk-map]")!;
  const sides = Array.from(mapCtl.querySelectorAll<HTMLButtonElement>("[data-mk-side]"));
  const press = (s: string) => sides.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mkSide === s)));
  const enterMap = () => {
    if (mapCtl.hidden) press("new");
    bar.classList.add("is-map");
    mapCtl.hidden = false;
    film.map.enter();
  };
  const exitMap = () => {
    bar.classList.remove("is-map");
    mapCtl.hidden = true;
    film.map.exit();
  };
  sides.forEach((b) =>
    b.addEventListener("click", () => {
      const s = b.dataset.mkSide as "old" | "new";
      press(s);
      film.map.show(s);
    }),
  );

  const restart = () => {
    exitMap();
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
  const start = () => {
    const f = film;
    (f.ready ?? Promise.resolve()).then(() => {
      if (f === film && inView && f.tl.progress() < 1) f.tl.play();
    });
  };
  new IntersectionObserver(
    ([e]) => {
      inView = e.isIntersecting;
      if (!inView) film.tl.pause();
      else if (film.tl.progress() < 1) start();
    },
    // Low enough that looking at the bar under the device does not pause the film.
    { threshold: 0.35 },
  ).observe(root.querySelector(".mk__devs")!);

  // A window dragged across the breakpoint (or a tablet turned): the other device, from the start.
  wide.addEventListener("change", () => {
    exitMap();
    film.tl.pause();
    allBeats.forEach((x) => x.classList.remove("is-on"));
    requestAnimationFrame(() => {
      film = filmOf(pick());
      film.fit();
      film.tl.pause(0);
      film.tl.invalidate();
      film.sync(0);
      if (inView) start();
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
      film.map.layout();
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
  const endBtn = dev.dataset.end ? newSite.querySelector<HTMLElement>(dev.dataset.end) : null;
  // A real site is a whole tall page: it scrolls (roll) to each fix, the boxes with it.
  const rolls = dev.closest("[data-makeover]")!.hasAttribute("data-roll");
  const roller = q("[data-mk-roll]");
  const FST = rolls ? ROLL_STEP : FSTEP;
  const LAG = rolls ? ROLL : 0;
  const urlEl = laptop ? dev.querySelector<HTMLElement>(".lap__url") : null;

  const INTRO = laptop ? 2.6 : 2;
  const P0 = INTRO;
  const TURN = P0 + 5 * PSTEP + 0.2;
  const F0 = TURN + 3.4;
  const END = F0 + 5 * FST;
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
    // The address bar follows the site on the glass.
    if (urlEl && dev.dataset.newUrl) {
      const u = t >= TURN + 1.1 ? dev.dataset.newUrl : dev.dataset.url!;
      if (urlEl.textContent !== u) urlEl.textContent = u;
    }
    const beat =
      t < P0 ? 0 : t < TURN ? 1 + Math.min(4, Math.floor((t - P0) / PSTEP)) : t < F0 ? 6 : t < END ? 7 + Math.min(4, Math.floor((t - F0) / FST)) : 12;
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
  // How far a whole real page scrolls to show fix i: its box in the middle of the glass, or its top
  // near the top when the box is taller than the glass. Always 0 for a site that fits one screen.
  const pageH = () => ((newPage.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0) * scaleOf(newPage);
  const rollFor = (i: number) => {
    if (!rolls) return 0;
    const H = screen.offsetHeight;
    const b = newBox(i);
    const top = b.h > H * 0.8 ? b.y - H * 0.06 : b.y + b.h / 2 - H / 2;
    return Math.max(0, Math.min(pageH() - H, top));
  };
  const rolled = (b: Box, by: number): Box => ({ ...b, y: b.y - by });
  // Room inside the box, so its number badge does not cover the first letters.
  const pad = laptop ? 6 : 4;
  const grown = (b: Box): Box => ({ x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad });
  // The number badge sticks out 9 px at the top left; on a box at the edge of the glass it moves
  // inside the corner, or the glass cut it in half.
  const place = (box: () => Box) => ({
    left: () => box().x - pad,
    top: () => box().y - pad,
    width: () => Math.max(18, box().w + 2 * pad),
    height: () => Math.max(16, box().h + 2 * pad),
    "--bx": () => (box().x - pad < 10 ? "3px" : "-9px"),
    "--by": () => (box().y - pad < 10 ? "3px" : "-9px"),
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
    tl.fromTo(m, { autoAlpha: 0, scale: 1.25, boxShadow: DIM.off }, { autoAlpha: 1, scale: 1, boxShadow: DIM.on, duration: 0.45, ease: spring(0.3) }, at + 0.2);
    tl.fromTo(t, { autoAlpha: 0, x: () => (side() ? -14 : 0), y: () => (side() ? 0 : 8) }, { autoAlpha: 1, x: 0, y: 0, duration: 0.45, ease: spring(0.3) }, at + 0.35);
    cue(buzz, at + 0.2);
    tl.to(t, { autoAlpha: 0, duration: 0.25 }, at + PSTEP - 0.3);
    // The numbered box stays (Lorenzo), softer, shrinking back with the piece: the problems add up
    // on the old site until it is swapped. Earlier boxes the lens grows over step aside meanwhile.
    tl.to(m, { ...place(() => oldBox(i)), boxShadow: DIM.off, borderColor: "rgba(217, 45, 32, 0.6)", backgroundColor: "rgba(217, 45, 32, 0)", duration: 0.35 }, at + PSTEP - 0.35);
    marks.slice(0, i).forEach((p, j) => {
      const covered = () => meets(grown(oldBox(j)), lens(i).box);
      tl.to(p, { autoAlpha: () => (covered() ? 0 : 1), duration: 0.2 }, at);
      tl.to(p, { autoAlpha: 1, duration: 0.2 }, at + PSTEP - 0.35);
    });
  });
  // The numbers go with the old site (so Prima at the end shows it clean).
  tl.set(marks, { autoAlpha: 0 }, TURN + (laptop ? 1.1 : 1.5));

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
    const at = F0 + i * FST;
    // A real page first scrolls to the piece (the boxes already shown scroll with it).
    if (rolls) tl.to(roller, { y: () => -rollFor(i), duration: ROLL, ease: "power2.inOut" }, at);
    tl.fromTo(g, { autoAlpha: 0, scale: 1.2 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: spring(0.3) }, at + LAG + 0.2);
    cue(() => fixed(i), at + LAG + 0.2);
    // The green box stays too, softer, until the device glides to its place.
    tl.to(g, { borderColor: "rgba(31, 138, 76, 0.6)", backgroundColor: "rgba(31, 138, 76, 0)", duration: 0.3 }, at + FST - 0.25);
    const t = tags[i];
    const dot = t.querySelector(".mk__tdot")!;
    tl.set(t, { ...tagAt(i, () => rolled(newBox(i), rollFor(i))), "--tone": "#1f8a4c" }, at + LAG);
    tl.set(t.querySelector(".mk__tbad"), { display: "none" }, at);
    tl.set(t.querySelector(".mk__tgood"), { display: "block" }, at);
    tl.set(dot, { backgroundColor: "#1f8a4c" }, at);
    tl.set(dot.querySelector(".mk__tn"), { opacity: 0 }, at);
    tl.set(dot.querySelector("svg"), { opacity: 1 }, at);
    tl.fromTo(t, { autoAlpha: 0, x: () => (side() ? -14 : 0), y: () => (side() ? 0 : 8) }, { autoAlpha: 1, x: 0, y: 0, duration: 0.45, ease: spring(0.3) }, at + LAG + 0.3);
    tl.to(t, { autoAlpha: 0, duration: 0.25 }, at + FST - 0.25);
  });

  // 4. The phone: a tap on "Chiama ora", and it rings. The laptop: the pointer clicks "Chiedi un preventivo".
  if (endBtn) {
    const k = () => scaleOf(newPage);
    const pos = () => offsetIn(endBtn, newPage);
    const cx = () => (pos().x + endBtn.offsetWidth / 2) * k();
    const cy = () => (pos().y + endBtn.offsetHeight / 2) * k() - rollFor(goods.length - 1);
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

  // The end: Prima | Dopo shows the old site or the new one, clean, no numbers.
  const map: MapView = {
    enter: () => {},
    exit: () => {
      gsap.killTweensOf([oldWrap, newSite]);
    },
    show: (sd) => {
      gsap.to(oldWrap, { autoAlpha: sd === "old" ? 1 : 0, duration: 0.35 });
      gsap.to(newSite, { opacity: sd === "new" ? 1 : 0, duration: 0.35 });
    },
    layout: () => {},
  };

  // The green numbers go as the device glides to its place, and a real page scrolls back to its
  // top (Lorenzo: the film ends on the site's first screen, not on its last band).
  const end = END + (laptop ? 2.1 : 1.6);
  tl.to(goods, { autoAlpha: 0, duration: 0.3 }, end);
  if (rolls) tl.to(roller, { y: 0, duration: 1.4, ease: "power2.inOut" }, end + 0.1);
  return { tl, sync, fit, map, end };
}

/** Whether two boxes overlap. */
const meets = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;


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
