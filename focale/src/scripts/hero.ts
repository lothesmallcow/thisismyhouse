import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import { enableSound, disableSound, soundOn, ring, chime } from "./sound";
import { spring } from "./spring";

gsap.registerPlugin(SplitText, Flip);

const motionOk = () => window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

/** Position of el inside ancestor, ignoring transforms (the phones are slightly rotated). */
function offsetWithin(el: HTMLElement, ancestor: HTMLElement) {
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

/**
 * Opening scene: the headline rises, then the two-phone film plays (see HeroScene.astro).
 * The film replays when the scene comes back into view or on "Rivedi". Sound is opt-in.
 */
export function initHero() {
  const root = document.querySelector<HTMLElement>("[data-hero-anim]");
  if (!root) return;
  const h1 = root.querySelector<HTMLElement>("[data-hero-h1]");
  const fades = root.querySelectorAll<HTMLElement>("[data-hero-fade]");
  const film = root.querySelector<HTMLElement>("[data-film]");
  if (!motionOk()) return;

  const start = () => {
    // 1. Headline. 0.01 rather than 0 keeps the text counted as painted for LCP.
    if (h1) {
      const split = SplitText.create(h1, { type: "lines", mask: "lines" });
      gsap.from(split.lines, { yPercent: 110, duration: 1.1, stagger: 0.1, ease: "expo.out", delay: 0.05 });
    }
    gsap.from(fades, { opacity: 0.01, y: 14, duration: 0.9, stagger: 0.07, ease: "power3.out", delay: 0.35 });
    if (film) initFilm(root, film);
  };
  if (document.fonts?.status === "loaded") start();
  else document.fonts.ready.then(start);
}

function initFilm(root: HTMLElement, film: HTMLElement) {
  const phone = film.querySelector<HTMLElement>(".film__phone")!;
  const site = film.querySelector<HTMLElement>("[data-site]")!;
  const scroll = film.querySelector<HTMLElement>("[data-site-scroll]")!;
  const tap = film.querySelector<HTMLElement>("[data-tap]")!;
  const btnCall = scroll.querySelector<HTMLElement>(".ah__btn--ghost");
  const btnQuote = scroll.querySelector<HTMLElement>(".ah__btn--main");
  const island = film.querySelector<HTMLElement>("[data-island]")!;
  const call = film.querySelector<HTMLElement>("[data-island-call]")!;
  const bnMail = film.querySelector<HTMLElement>('[data-banner="mail"]')!;
  const bnWa = film.querySelector<HTMLElement>('[data-banner="whatsapp"]')!;
  const line = film.querySelector<HTMLElement>("[data-beat-line]")!;
  const ctl = film.querySelector<HTMLElement>("[data-film-ctl]")!;
  const soundBtn = film.querySelector<HTMLButtonElement>("[data-sound]")!;
  const replay = film.querySelector<HTMLButtonElement>("[data-replay]")!;
  const finalLine = line.textContent ?? "";
  ctl.hidden = false;

  const say = (text: string) =>
    gsap
      .timeline()
      .to(line, { opacity: 0, y: -4, duration: 0.2 })
      .call(() => {
        line.textContent = text;
      })
      .fromTo(line, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.35 });

  const tapOn = (btn: HTMLElement | null) => {
    if (!btn) return;
    const p = offsetWithin(btn, site);
    const y = site.offsetTop + p.y + btn.offsetHeight / 2 + (gsap.getProperty(scroll, "y") as number);
    const x = site.offsetLeft + p.x + btn.offsetWidth / 2;
    gsap.set(tap, { left: x, top: y });
    // A fingertip presses, the button gives way, then springs back.
    gsap.timeline()
      .fromTo(tap, { scale: 1.3, opacity: 0 }, { scale: 0.9, opacity: 0.9, duration: 0.18, ease: "power2.out" })
      .to(tap, { scale: 1.6, opacity: 0, duration: 0.5, ease: "power2.out" }, 0.22);
    gsap.timeline()
      .to(btn, { scale: 0.93, duration: 0.12, ease: "power2.out" }, 0.08)
      .to(btn, { scale: 1, duration: 0.6, ease: spring(0.35) }, 0.22);
  };
  const drop = (bn: HTMLElement) => {
    // The banner already on screen slides down to make room (Flip), the new one drops in from the top.
    const others = [bnMail, bnWa].filter((b) => b !== bn && getComputedStyle(b).display !== "none");
    const state = Flip.getState(others);
    gsap.set(bn, { display: "grid" });
    Flip.from(state, { duration: 0.6, ease: spring(0.2) });
    gsap.fromTo(bn, { yPercent: -130, opacity: 0, scale: 0.96 }, { yPercent: 0, opacity: 1, scale: 1, duration: 0.75, ease: spring(0.25) });
  };

  const tl = gsap.timeline({ paused: true });
  tl.call(() => {
    gsap.set(scroll, { y: 0 });
    gsap.set([bnMail, bnWa], { display: "none", clearProps: "transform,opacity" });
    gsap.set(island, { width: "32cqw", height: "9.4cqw", borderRadius: "6cqw" });
    gsap.set(call, { autoAlpha: 0 });
    line.textContent = "Un cliente apre il tuo sito dal telefono.";
    gsap.set(line, { opacity: 1, y: 0 });
  });
  // The customer browses the site...
  tl.to(scroll, { y: () => -site.offsetWidth * 0.2, duration: 1.2, ease: "power2.inOut" }, 0.8);
  tl.to(scroll, { y: 0, duration: 0.9, ease: "power2.inOut" }, 2.2);
  // ...taps "Chiama ora": the phone rings in the Dynamic Island.
  tl.call(() => tapOn(btnCall), [], 3.2);
  tl.call(() => {
    say("Tocca Chiama ora: il telefono squilla.");
    ring();
  }, [], 3.4);
  tl.to(island, { width: "94cqw", height: "21cqw", borderRadius: "11cqw", duration: 0.7, ease: spring(0.28) }, 3.4);
  tl.to(call, { autoAlpha: 1, duration: 0.25 }, 3.65);
  tl.to(phone, { keyframes: { rotation: [0, -1.5, 1.5, -1, 1, 0] }, duration: 0.6, ease: "none" }, 3.7);
  tl.to(call, { autoAlpha: 0, duration: 0.2 }, 5.4);
  tl.to(island, { width: "32cqw", height: "9.4cqw", borderRadius: "6cqw", duration: 0.6, ease: spring(0.12) }, 5.5);
  // ...asks for a quote: the request arrives on WhatsApp, then a copy by email.
  tl.call(() => tapOn(btnQuote), [], 6.3);
  tl.call(() => say("Chiede un preventivo: arriva su WhatsApp."), [], 6.5);
  tl.call(() => {
    drop(bnWa);
    chime(1);
  }, [], 6.9);
  tl.call(() => say("E ne ricevi una copia per email."), [], 8.4);
  tl.call(() => {
    drop(bnMail);
    chime(1.06);
  }, [], 8.6);
  tl.call(() => say(finalLine), [], 10.4);

  const play = () => tl.restart();
  let seen = false;
  new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      if (!seen || !tl.isActive()) {
        seen = true;
        play();
      }
    },
    { threshold: 0.5 },
  ).observe(root);

  replay.addEventListener("click", play);
  soundBtn.addEventListener("click", async () => {
    if (soundOn()) {
      disableSound();
      soundBtn.setAttribute("aria-pressed", "false");
      soundBtn.setAttribute("aria-label", "Attiva il suono");
      return;
    }
    if (await enableSound()) {
      soundBtn.setAttribute("aria-pressed", "true");
      soundBtn.setAttribute("aria-label", "Disattiva il suono");
      play();
    }
  });
}
