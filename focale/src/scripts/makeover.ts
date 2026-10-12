import { gsap } from "gsap";
import { spring } from "./spring";


/**
 * The makeover film. It plays by itself like a video (no pinning, the scroll stays free) the first
 * time the phone is well in view, pauses when it leaves, and has its own controls: play/pause,
 * replay at the end, and a progress bar you can click to jump.
 * 1. the diagnosis: a band of light runs down the old site and boxes its five problems as it
 *    passes them, each with a numbered label beside the phone;
 * 2. the phone lifts and turns all the way round (back and cameras); facing away, the old site is
 *    swapped for the new one, light crosses the glass;
 * 3. the fixes: every label slides to the part of the new site that solves it and turns green;
 * 4. a tap calls.
 * See Makeover.astro for the markup and the no-JS final frame.
 */
export function initMakeover() {
  const root = document.querySelector<HTMLElement>("[data-makeover]");
  if (!root || !window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
  const q = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const qa = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
  const stage = q(".mk__stage");
  const screen = q("[data-mk-screen]");
  const oldWrap = q("[data-mk-old]");
  const oldPage = q("[data-mk-oldpage]");
  const newSite = q("[data-mk-new]");
  const fa = q("[data-mk-fa]");
  const obj = q("[data-mk-obj]");
  const sweep = q("[data-mk-sweep]");
  const scan = q("[data-mk-scan]");
  const marks = qa("[data-mk-mark]");
  const goods = qa("[data-mk-good]");
  const tags = qa("[data-mk-tag]");
  const steps = qa("[data-mk-step]");
  const callBtn = newSite.querySelector<HTMLElement>(".ah__btn--ghost");

  root.classList.add("mk-live");
  const setStep = (i: number) => steps.forEach((s, j) => s.classList.toggle("is-on", j === i));
  setStep(0);
  // Hidden by opacity, not visibility: the new site is painted (and its images decoded) from the
  // start, so the swap mid-turn costs nothing.
  gsap.set(newSite, { opacity: 0 });
  gsap.set(fa, { opacity: 0 });

  // Where things sit on the screen (px, layout boxes: transforms ignored, so the phone's 3D turn
  // does not matter). The old page is drawn at 180% and scaled down to fit.
  const oldScale = () => oldPage.offsetWidth ? screen.offsetWidth / oldPage.offsetWidth : 0.5556;
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
  const pad = 3;
  const place = (box: () => { x: number; y: number; w: number; h: number }) => ({
    left: () => box().x + pad,
    top: () => box().y + pad,
    width: () => Math.max(16, box().w - 2 * pad),
    height: () => Math.max(14, box().h - 2 * pad),
  });
  // Labels: beside the phone, level with the box they describe; left and right in turn.
  const scr = () => offsetIn(screen, stage);
  const tagTop = (i: number, box: { y: number; h: number }) => scr().y + box.y + box.h / 2 - tags[i].offsetHeight / 2;
  // They may reach into the gutter between the columns and the page margin, never over the screen.
  const tagLeft = (i: number) => {
    const s = scr();
    const gap = 14;
    const r = stage.getBoundingClientRect();
    const roomR = Math.max(0, Math.min(60, document.documentElement.clientWidth - r.right - 12));
    return i % 2
      ? Math.min(s.x + screen.offsetWidth + gap, stage.offsetWidth + roomR - tags[i].offsetWidth)
      : Math.max(-60, s.x - gap - tags[i].offsetWidth);
  };

  const playBtn = q<HTMLButtonElement>("[data-mk-play]");
  const playLabel = q("[data-mk-play-label]");
  const bar = q("[data-mk-bar]");
  const barFill = q("[data-mk-fill]");
  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: "power2.inOut" },
    onUpdate: () => {
      const p = tl.progress();
      setStep(p < 0.06 ? 0 : p < 0.34 ? 1 : p < 0.72 ? 2 : p < 0.88 ? 3 : 4);
      barFill.style.transform = `scaleX(${p})`;
    },
    onComplete: () => setState("ended"),
  });

  // 1. The diagnosis, in one pass.
  const S0 = 0.07;
  const SD = 0.2;
  marks.forEach((m, i) => tl.set(m, place(() => oldBox(i)), 0));
  goods.forEach((g, i) => tl.set(g, place(() => newBox(i)), 0));
  tags.forEach((t, i) => tl.set(t, { left: () => tagLeft(i), top: () => tagTop(i, oldBox(i)) }, 0));
  tl.set(scan, { autoAlpha: 1, top: "-25%" }, S0);
  tl.to(scan, { top: "105%", duration: SD, ease: "none" }, S0);
  tl.set(scan, { autoAlpha: 0 }, S0 + SD);
  marks.forEach((m, i) => {
    // Each box appears as the light reaches it.
    const b = oldBox(i);
    const at = S0 + SD * Math.min(1, (b.y + b.h * 0.6) / screen.offsetHeight + 0.12);
    tl.fromTo(m, { autoAlpha: 0, scale: 1.18 }, { autoAlpha: 1, scale: 1, duration: 0.025, ease: spring(0.3) }, at);
    tl.fromTo(tags[i], { autoAlpha: 0, x: i % 2 ? -12 : 12 }, { autoAlpha: 1, x: 0, duration: 0.025, ease: spring(0.3) }, at + 0.006);
  });
  // A beat to read them, then the red boxes go (the labels stay through the turn).
  tl.to(marks, { autoAlpha: 0, duration: 0.02 }, 0.34);

  // 2. The makeover: the phone lifts and turns all the way round (titanium back, cameras);
  //    when it faces away the old site is swapped for the new one, then light crosses the glass.
  tl.to(tags, { opacity: 0.35, duration: 0.03 }, 0.37);
  tl.to(obj, { y: -20, scale: 1.04, rotationX: 8, duration: 0.05, ease: "power2.out" }, 0.37);
  tl.to(obj, { rotationY: 360, duration: 0.3, ease: "power2.inOut" }, 0.4);
  tl.set(oldWrap, { autoAlpha: 0 }, 0.55);
  tl.set(newSite, { opacity: 1 }, 0.55);
  tl.to(obj, { y: 0, scale: 1, rotationX: 0, duration: 0.08, ease: spring(0.25) }, 0.68);
  tl.set(obj, { rotationY: 0 }, 0.76);
  tl.fromTo(sweep, { left: "-60%", opacity: 0 }, { left: "120%", opacity: 1, duration: 0.07, ease: "power1.inOut" }, 0.7);
  tl.to(sweep, { opacity: 0, duration: 0.01 }, 0.77);

  // 3. The fixes: each label glides to its fix on the new site and turns green, one after another.
  tags.forEach((t, i) => {
    const at = 0.74 + i * 0.022;
    tl.to(t, { top: () => tagTop(i, newBox(i)), opacity: 1, duration: 0.03, ease: "power3.inOut" }, at);
    tl.to(t.querySelector(".mk__bad"), { opacity: 0, duration: 0.012 }, at + 0.012);
    tl.to(t.querySelector(".mk__good"), { opacity: 1, duration: 0.012 }, at + 0.016);
    tl.to(t.querySelector(".mk__dot"), { backgroundColor: "#1f8a4c", duration: 0.012 }, at + 0.012);
    tl.to(t.querySelector(".mk__dot-bad"), { opacity: 0, duration: 0.01 }, at + 0.012);
    tl.to(t.querySelector(".mk__dot-good"), { opacity: 1, duration: 0.01 }, at + 0.016);
    tl.fromTo(goods[i], { autoAlpha: 0, scale: 1.15 }, { autoAlpha: 1, scale: 1, duration: 0.025, ease: spring(0.3) }, at + 0.014);
  });

  // 4. A tap on "Chiama ora".
  if (callBtn) {
    const pos = () => offsetIn(callBtn, newSite);
    tl.set(fa, { left: () => screen.offsetLeft + pos().x + callBtn.offsetWidth / 2, top: () => screen.offsetTop + pos().y + callBtn.offsetHeight / 2, x: 0, y: 0, scale: 1.3 }, 0.88);
    tl.to(fa, { opacity: 0.95, scale: 0.9, duration: 0.02 }, 0.89);
    tl.to(callBtn, { scale: 0.93, duration: 0.015 }, 0.9);
    tl.to(callBtn, { scale: 1, duration: 0.04, ease: spring(0.35) }, 0.915);
    tl.to(fa, { opacity: 0, scale: 1.5, duration: 0.03 }, 0.93);
  }
  tl.to({}, { duration: 0.04 }, 0.96);
  // The timeline is laid out on 0..1; this many seconds of film.
  tl.timeScale(1 / 14);

  // Controls.
  type State = "playing" | "paused" | "ended";
  const labels: Record<State, string> = { playing: "Pausa", paused: "Riproduci", ended: "Guarda di nuovo" };
  function setState(st: State) {
    root.dataset.mkState = st;
    playLabel.textContent = labels[st];
    playBtn.setAttribute("aria-label", `${labels[st]} il prima e dopo`);
  }
  const play = () => {
    if (tl.progress() >= 1) tl.restart();
    else tl.play();
    setState("playing");
  };
  const pause = () => {
    tl.pause();
    setState("paused");
  };
  playBtn.hidden = false;
  bar.hidden = false;
  setState("paused");
  let chose = false;
  playBtn.addEventListener("click", () => {
    chose = true;
    if (root.dataset.mkState === "playing") pause();
    else play();
  });
  bar.addEventListener("click", (e) => {
    chose = true;
    const r = bar.getBoundingClientRect();
    tl.progress(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
    if (root.dataset.mkState === "ended" && tl.progress() < 1) setState("paused");
  });
  // Starts by itself the first time the phone is well in view; pauses when it leaves (unless the
  // visitor already took control: then it waits for them).
  new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting && !chose && root.dataset.mkState === "paused") play();
      else if (!e.isIntersecting && root.dataset.mkState === "playing") pause();
    },
    { threshold: 0.6 },
  ).observe(stage);
  // Positions are measured on layout boxes: measure again when the layout changes.
  let rt = 0;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = window.setTimeout(() => {
      const p = tl.progress();
      tl.invalidate();
      tl.progress(p);
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
