/**
 * The scrolling tour of a real client's site (components/RealTour.astro). The site scrolls inside
 * its frame; the numbered point nearest the middle of the screen gets its box and is lit in the list.
 * The first time the tour is well in view it walks through the points by itself, one every few
 * seconds, smooth-scrolling the site to each; the visitor's first touch, wheel, key or click on a
 * point stops it for good (then a click on a point scrolls there). Leaving the view pauses it.
 * With reduced motion: no walk, and jumps instead of smooth scrolls.
 */
const STEP_MS = 3400;

export function initRealTour() {
  document.querySelectorAll<HTMLElement>("[data-rt]").forEach(setup);
}

function setup(root: HTMLElement) {
  const steps = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-rt-step]"));
  const screens = Array.from(root.querySelectorAll<HTMLElement>("[data-rt-screen]"));
  const sw = root.querySelector<HTMLElement>("[data-rt-switch]")!;
  const smooth = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
  const boxesOf = (s: HTMLElement) => Array.from(s.querySelectorAll<HTMLElement>("[data-rt-box]"));
  const visible = () => screens.find((s) => s.offsetParent !== null) ?? screens[0];

  // Device: by the width at first, then the switch.
  const mode = (m: "desk" | "phone") => {
    root.dataset.mode = m;
    sw.querySelectorAll<HTMLButtonElement>("[data-rt-to]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.rtTo === m)));
  };
  mode(window.matchMedia("(min-width: 900px)").matches ? "desk" : "phone");
  sw.hidden = false;

  let active = -1;
  const light = (i: number) => {
    if (i === active) return;
    active = i;
    steps.forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
    screens.forEach((s) => boxesOf(s).forEach((b, j) => b.classList.toggle("is-on", j === i)));
  };

  // Where the screen scrolls to show point i: its box in the middle, or its top near the top when
  // it is taller than the screen.
  const target = (s: HTMLElement, i: number) => {
    const b = boxesOf(s)[i];
    const H = s.clientHeight;
    const top = b.offsetHeight > H * 0.8 ? b.offsetTop - H * 0.08 : b.offsetTop + b.offsetHeight / 2 - H / 2;
    return Math.max(0, Math.min(s.scrollHeight - H, top));
  };
  // While the tour scrolls the screen itself, the scroll does not pick the point.
  let steering = 0;
  const go = (i: number) => {
    const s = visible();
    light(i);
    clearTimeout(steering);
    steering = window.setTimeout(() => (steering = 0), 1400);
    s.scrollTo({ top: target(s, i), behavior: smooth ? "smooth" : "auto" });
  };
  screens.forEach((s) => {
    let raf = 0;
    s.addEventListener(
      "scroll",
      () => {
        if (steering || raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const mid = s.scrollTop + s.clientHeight / 2;
          let best = -1;
          let gap = Infinity;
          boxesOf(s).forEach((b, j) => {
            const inView = b.offsetTop < s.scrollTop + s.clientHeight && b.offsetTop + b.offsetHeight > s.scrollTop;
            const d = Math.abs(b.offsetTop + b.offsetHeight / 2 - mid);
            if (inView && d < gap) [gap, best] = [d, j];
          });
          if (best >= 0) light(best);
        });
      },
      { passive: true },
    );
    s.addEventListener("scrollend", () => {
      clearTimeout(steering);
      steering = 0;
    });
  });

  // The walk: once, by itself, until the visitor takes over.
  let walk = 0;
  let stopped = !smooth;
  let inView = false;
  const stop = () => {
    stopped = true;
    clearTimeout(walk);
  };
  const next = (i: number) => {
    clearTimeout(walk);
    if (stopped || !inView) return;
    go(i);
    if (i < steps.length - 1) walk = window.setTimeout(() => next(i + 1), STEP_MS);
    else stopped = true;
  };
  screens.forEach((s) => ["wheel", "touchstart", "pointerdown", "keydown"].forEach((ev) => s.addEventListener(ev, stop, { passive: true })));
  steps.forEach((b, i) =>
    b.addEventListener("click", () => {
      stop();
      go(i);
    }),
  );
  sw.querySelectorAll<HTMLButtonElement>("[data-rt-to]").forEach((b) =>
    b.addEventListener("click", () => {
      mode(b.dataset.rtTo as "desk" | "phone");
      // The other device: the same point, at once.
      const s = visible();
      if (active >= 0) s.scrollTop = target(s, active);
    }),
  );
  light(0);
  new IntersectionObserver(
    ([e]) => {
      inView = e.isIntersecting;
      if (!inView) clearTimeout(walk);
      else if (!stopped) walk = window.setTimeout(() => next(active > 0 ? active + 1 : 0), 700);
    },
    { threshold: 0.4 },
  ).observe(root.querySelector(".rt__stage")!);
}
