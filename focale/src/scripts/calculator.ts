import { gsap } from "gsap";

const fmt = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0, useGrouping: "always" });
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function initCalculator() {
  const form = document.querySelector<HTMLFormElement>("[data-calc]");
  if (!form) return;
  const price = Number(form.dataset.price);
  const valore = form.querySelector<HTMLInputElement>('[name="valore"]')!;
  const tasso = form.querySelector<HTMLInputElement>('[name="tasso"]')!;
  const richieste = form.querySelector<HTMLInputElement>('[name="richieste"]')!;
  const outTasso = form.querySelector<HTMLOutputElement>('[data-out="tasso"]')!;
  const outRichieste = form.querySelector<HTMLOutputElement>('[data-out="richieste"]')!;
  const annuoEl = document.querySelector<HTMLElement>("[data-annuo]")!;
  const paybackEl = document.querySelector<HTMLElement>("[data-payback]")!;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  const shown = { v: Number(annuoEl.textContent?.replace(/\./g, "")) || 0 };
  let tween: gsap.core.Tween | null = null;

  // Values survive a reload only through the URL hash (no storage).
  const fromHash = () => {
    const m = /calc=(\d+)-(\d+)-(\d+)/.exec(location.hash);
    if (!m) return;
    valore.value = m[1];
    tasso.value = m[2];
    richieste.value = m[3];
  };

  const read = () => {
    const v = clamp(Number(valore.value) || 100, 100, 200000);
    const t = clamp(Number(tasso.value) || 1, 1, 10);
    const r = clamp(Number(richieste.value) || 1, 1, 10);
    return { v, t, r };
  };

  const update = (animate = true) => {
    const { v, t, r } = read();
    outTasso.value = String(t);
    outRichieste.value = String(r);
    const annuo = Math.round((r * 12 * (t / 10) * v) / 100) * 100;
    paybackEl.textContent = price <= v ? "meno di un lavoro" : `${Math.ceil(price / v)} lavori`;
    tween?.kill();
    if (!animate || reduce.matches) {
      shown.v = annuo;
      annuoEl.textContent = fmt.format(annuo);
    } else {
      tween = gsap.to(shown, {
        v: annuo,
        duration: 0.4,
        ease: "power2.out",
        onUpdate: () => {
          annuoEl.textContent = fmt.format(Math.round(shown.v / 100) * 100);
        },
      });
    }
    history.replaceState(null, "", `#calc=${v}-${t}-${r}`);
  };

  fromHash();
  if (location.hash.startsWith("#calc=")) update(false);
  form.addEventListener("input", () => update());
  valore.addEventListener("change", () => {
    const { v } = read();
    valore.value = String(v);
    update();
  });
}
