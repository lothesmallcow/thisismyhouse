/**
 * Tiny synthesised sounds for the opening film (no audio files): a marimba-like ringtone and a
 * two-note notification chime. Nothing plays until the visitor turns sound on with a click.
 */
let ctx: AudioContext | null = null;

export function soundOn(): boolean {
  return ctx !== null && ctx.state === "running";
}

export async function enableSound() {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return false;
  ctx = ctx ?? new AC();
  if (ctx.state !== "running") await ctx.resume();
  return true;
}

export function disableSound() {
  ctx?.suspend();
}

function note(freq: number, at: number, dur: number, type: OscillatorType, gain: number) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** Two bars of a marimba-like ringtone (about 1.6 s). */
export function ring() {
  if (!soundOn()) return;
  const seq = [659.25, 987.77, 1318.51, 987.77, 1174.66, 987.77, 830.61, 987.77];
  seq.forEach((f, i) => {
    note(f, i * 0.1, 0.32, "triangle", 0.16);
    note(f * 2, i * 0.1, 0.12, "sine", 0.04);
  });
  seq.forEach((f, i) => note(f, 0.9 + i * 0.1, 0.32, "triangle", 0.12));
}

/** A short two-note notification chime. */
export function chime(pitch = 1) {
  if (!soundOn()) return;
  note(1318.51 * pitch, 0, 0.35, "sine", 0.18);
  note(1760 * pitch, 0.11, 0.5, "sine", 0.16);
}
