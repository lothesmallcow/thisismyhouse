/**
 * Spring easing for GSAP, from a damped harmonic oscillator (the model iOS uses for its
 * animations): things accelerate, slightly overshoot and settle, like objects with weight.
 * bounce 0 = critically damped (no overshoot), 0.3 = a light iOS-like bounce.
 */
export function spring(bounce = 0.2, stiffness = 11): (p: number) => number {
  const zeta = Math.min(Math.max(1 - bounce, 0.05), 0.999);
  const w = stiffness;
  const wd = w * Math.sqrt(1 - zeta * zeta);
  const end = 1 - Math.exp(-zeta * w) * (Math.cos(wd) + ((zeta * w) / wd) * Math.sin(wd));
  return (p: number) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    const v = 1 - Math.exp(-zeta * w * p) * (Math.cos(wd * p) + ((zeta * w) / wd) * Math.sin(wd * p));
    // Normalise so the curve lands exactly on 1 at the end of the tween.
    return v + (1 - end) * p;
  };
}
