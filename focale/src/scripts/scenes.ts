/**
 * Home scenes: marks the scene on screen (.is-in) so its content plays in, replays the entrance
 * when a scene comes back after leaving the screen, and lights the matching dot in the side nav.
 * Snapping itself is CSS (scroll-snap), so keyboard, scrollbar and screen readers work as usual.
 */
export function initScenes() {
  const scenes = Array.from(document.querySelectorAll<HTMLElement>(".scene"));
  if (!scenes.length) return;
  const root = document.documentElement;
  if (window.matchMedia("(prefers-reduced-motion: no-preference)").matches) root.classList.add("scenes-live");
  const dots = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>("[data-dot]").forEach((d) => dots.set(d.dataset.dot!, d));
  const ratios = new Map<Element, number>();

  const setActive = () => {
    let best: Element | null = null;
    let max = 0;
    ratios.forEach((r, el) => {
      if (r > max) {
        max = r;
        best = el;
      }
    });
    dots.forEach((d, id) => {
      const on = best !== null && (best as HTMLElement).id === id;
      d.classList.toggle("is-active", on);
      if (on) d.setAttribute("aria-current", "true");
      else d.removeAttribute("aria-current");
    });
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        ratios.set(e.target, e.intersectionRatio);
        if (e.intersectionRatio >= 0.3) e.target.classList.add("is-in");
        else if (e.intersectionRatio === 0) e.target.classList.remove("is-in");
      }
      setActive();
    },
    { threshold: [0, 0.3, 0.5, 0.7, 1] },
  );
  scenes.forEach((s) => io.observe(s));
}

/**
 * Desktop: one scene per gesture, like advancing a video. A wheel or trackpad flick, PageDown,
 * Space or the arrow keys move to the next or previous scene with a smooth glide; input that
 * arrives during the glide is ignored, so a fast trackpad can't skip scenes. Scenes taller than
 * the screen scroll normally until their edge. Touch screens keep native scrolling.
 */
export function initStepper() {
  const mq = window.matchMedia("(min-width: 900px) and (min-height: 620px) and (pointer: fine)");
  if (!mq.matches) return;
  const scenes = Array.from(document.querySelectorAll<HTMLElement>(".scene"));
  const footer = document.querySelector<HTMLElement>("footer");
  if (!scenes.length) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  root.classList.add("stepper");
  const stops = () => [...scenes.map((s) => s.offsetTop), footer ? Math.min(footer.offsetTop, root.scrollHeight - innerHeight) : root.scrollHeight - innerHeight];
  let busy = false;
  let acc = 0;
  let accTimer = 0;
  // A trackpad flick keeps sending momentum events for a second or more: a new gesture only
  // counts after a short silence once the glide has finished.
  let lastWheel = 0;
  const QUIET = 220;

  const current = () => {
    const y = scrollY;
    const st = stops();
    let i = 0;
    st.forEach((s, j) => {
      if (s <= y + 4) i = j;
    });
    return i;
  };
  const glide = (to: number) => {
    busy = true;
    const from = scrollY;
    const d = to - from;
    if (reduce || Math.abs(d) < 2) {
      scrollTo(0, to);
      busy = false;
      return;
    }
    const dur = 850;
    const t0 = performance.now();
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      scrollTo(0, from + d * ease(t));
      if (t < 1) requestAnimationFrame(step);
      else {
        const release = () => {
          if (performance.now() - lastWheel >= QUIET) busy = false;
          else setTimeout(release, QUIET);
        };
        release();
      }
    };
    requestAnimationFrame(step);
  };
  const go = (dir: 1 | -1) => {
    const st = stops();
    const i = current();
    const scene = scenes[i];
    // A scene taller than the screen scrolls natively until its edge.
    if (scene && dir === 1 && scene.getBoundingClientRect().bottom > innerHeight + 4) return false;
    if (scene && dir === -1 && scene.getBoundingClientRect().top < -4 && Math.abs(scrollY - st[i]) > 4) {
      glide(st[i]);
      return true;
    }
    const next = Math.max(0, Math.min(st.length - 1, i + dir));
    if (next === i) return dir === 1 ? false : true;
    glide(st[next]);
    return true;
  };

  window.addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey) return; // pinch zoom
      if ((e.target as Element).closest?.("footer") && e.deltaY > 0) return;
      lastWheel = performance.now();
      if (busy) {
        e.preventDefault();
        return;
      }
      acc += e.deltaY;
      clearTimeout(accTimer);
      accTimer = window.setTimeout(() => (acc = 0), 180);
      if (Math.abs(acc) < 30) {
        e.preventDefault();
        return;
      }
      const dir = acc > 0 ? 1 : -1;
      acc = 0;
      if (go(dir)) e.preventDefault();
    },
    { passive: false },
  );
  window.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("input, textarea, select, [contenteditable], details summary") && e.key === " ") return;
    if (t.closest("input, textarea, select")) return;
    const down = ["PageDown", "ArrowDown"].includes(e.key) || (e.key === " " && !e.shiftKey);
    const up = ["PageUp", "ArrowUp"].includes(e.key) || (e.key === " " && e.shiftKey);
    if (!down && !up) return;
    if (busy) {
      e.preventDefault();
      return;
    }
    if (go(down ? 1 : -1)) e.preventDefault();
  });
  // Dots and in-page links glide too.
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const target = document.querySelector<HTMLElement>(a.getAttribute("href")!);
      if (!target || !target.classList.contains("scene")) return;
      e.preventDefault();
      glide(target.offsetTop);
      history.replaceState(null, "", a.getAttribute("href"));
    }),
  );
}
