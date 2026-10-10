/** Run a task after the page has loaded and the browser is idle, so it never competes with first paint. */
export function later(task: () => void) {
  const idle = (cb: () => void) => {
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(cb, { timeout: 1500 });
    else setTimeout(cb, 200);
  };
  if (document.readyState === "complete") idle(task);
  else window.addEventListener("load", () => idle(task), { once: true });
}
