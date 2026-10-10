import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Desktop only: pin the work reel and move it sideways with the scroll. */
export function initReel() {
  const section = document.querySelector<HTMLElement>("[data-reel]");
  if (!section) return;
  const track = section.querySelector<HTMLElement>("[data-reel-track]")!;
  const viewport = section.querySelector<HTMLElement>("[data-reel-viewport]")!;
  const mm = gsap.matchMedia();
  mm.add("(min-width: 1000px) and (prefers-reduced-motion: no-preference) and (pointer: fine)", () => {
    section.classList.add("is-pinned");
    viewport.removeAttribute("tabindex");
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + parseFloat(getComputedStyle(viewport).paddingLeft) * 2);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => `+=${distance()}`,
        scrub: 0.8,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
    const imgs = section.querySelectorAll<HTMLElement>("[data-reel-img]");
    imgs.forEach((img) =>
      gsap.fromTo(
        img,
        { scale: 1.12 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: img.closest("li"), containerAnimation: tween, start: "left right", end: "left left", scrub: true },
        },
      ),
    );
    // A slight turn in depth: cards face the viewer only as they cross the centre.
    section.querySelectorAll<HTMLElement>(".reel__card").forEach((card) =>
      gsap.fromTo(
        card,
        { rotationY: -9, transformPerspective: 1600, transformOrigin: "50% 50%" },
        {
          rotationY: 9,
          ease: "none",
          scrollTrigger: { trigger: card, containerAnimation: tween, start: "left right", end: "right left", scrub: true },
        },
      ),
    );
    return () => {
      section.classList.remove("is-pinned");
      viewport.setAttribute("tabindex", "0");
    };
  });
  ScrollTrigger.refresh();
}
