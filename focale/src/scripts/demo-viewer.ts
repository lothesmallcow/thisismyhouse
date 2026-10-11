/**
 * Demo viewers (DemoViewer.astro): pick phone or desktop from the visitor's device, load the
 * iframe of the visible frame only when the viewer is on screen, and scale it so the demo
 * renders at its true width (390 px phone, 1280 px desktop). On touch screens the site wakes
 * with a tap and sleeps again with "Fatto", so swiping over it never traps the page.
 */
export function initDemoViewers() {
  document.querySelectorAll<HTMLElement>("[data-dv]").forEach(setup);
}

function setup(dv: HTMLElement) {
  if (dv.dataset.dvReady) return;
  dv.dataset.dvReady = "1";
  const src = dv.dataset.src!;
  const sw = dv.querySelector<HTMLElement>("[data-dv-switch]")!;
  const wake = dv.querySelector<HTMLButtonElement>("[data-dv-wake]")!;
  const done = dv.querySelector<HTMLButtonElement>("[data-dv-done]")!;
  const boxes = Array.from(dv.querySelectorAll<HTMLElement>("[data-dv-fit]"));
  const touch = window.matchMedia("(pointer: coarse)").matches;
  const small = touch || window.matchMedia("(max-width: 899px)").matches;
  let visible = false;
  sw.hidden = false;
  dv.classList.toggle("is-touch", touch);
  wake.hidden = !touch;

  const fit = (box: HTMLElement) => {
    const frame = box.querySelector<HTMLIFrameElement>("iframe")!;
    const base = Number(box.dataset.dvFit);
    const w = box.clientWidth;
    if (!w) return;
    const k = w / base;
    frame.style.setProperty("--k", String(k));
    frame.style.setProperty("--fw", `${base}px`);
    frame.style.setProperty("--fh", `${box.clientHeight / k}px`);
  };
  const load = () => {
    if (!visible) return;
    const box = boxes[dv.dataset.mode === "desk" ? 1 : 0];
    const frame = box.querySelector<HTMLIFrameElement>("iframe")!;
    fit(box);
    if (!frame.getAttribute("src")) {
      frame.addEventListener("load", () => frame.classList.add("is-ready"), { once: true });
      frame.src = src;
    }
  };
  const setLive = (on: boolean) => {
    dv.classList.toggle("is-live", on);
    boxes.forEach((b) => (on ? b.querySelector("iframe")!.removeAttribute("tabindex") : b.querySelector("iframe")!.setAttribute("tabindex", "-1")));
    if (touch) {
      wake.hidden = on;
      done.hidden = !on;
    }
  };
  const setMode = (m: "phone" | "desk") => {
    dv.dataset.mode = m;
    sw.querySelectorAll<HTMLButtonElement>("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.dvTo === m)));
    requestAnimationFrame(load);
  };

  sw.querySelectorAll<HTMLButtonElement>("button").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.dvTo as "phone" | "desk")));
  wake.addEventListener("click", () => {
    setLive(true);
    done.focus({ preventScroll: true });
  });
  done.addEventListener("click", () => {
    setLive(false);
    wake.focus({ preventScroll: true });
  });
  // With a mouse the site is live from the start: the wheel scrolls it while the pointer is over it.
  setLive(!touch);
  setMode(small ? "phone" : "desk");

  new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      load();
      if (!visible && touch) setLive(false);
    },
    { rootMargin: "300px 0px" },
  ).observe(dv);
  new ResizeObserver(() => boxes.forEach(fit)).observe(dv);
}
