/**
 * Tiny synthesised sounds for the films (no audio files): a marimba-like ringtone, a notification
 * chime, and the makeover's cues. Nothing plays until the visitor turns sound on with a click.
 * One switch for the whole page: every speaker button follows it (bindSoundButton).
 */
let ctx: AudioContext | null = null;
const EVT = "focus:sound";

export function soundOn(): boolean {
  return ctx !== null && ctx.state === "running";
}

export async function enableSound() {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return false;
  // iOS treats Web Audio as "ambient": the silent switch mutes it even after this click. The visitor
  // pressed the speaker on purpose, so ask for "playback" where Safari supports it.
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (session) session.type = "playback";
  if (!ctx) {
    ctx = new AC();
    // Locking the phone or switching apps can leave it "interrupted": keep every button honest.
    ctx.addEventListener("statechange", () => window.dispatchEvent(new Event(EVT)));
  }
  if (ctx.state !== "running") await ctx.resume();
  window.dispatchEvent(new Event(EVT));
  return true;
}

export async function disableSound() {
  await ctx?.suspend();
  window.dispatchEvent(new Event(EVT));
}

/**
 * A speaker button: toggles the page's sound and always shows its state (also when another
 * button changed it). onEnable runs only when this button turned the sound on.
 */
export function bindSoundButton(btn: HTMLButtonElement, onEnable?: () => void) {
  const show = () => {
    const on = soundOn();
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", on ? "Disattiva il suono" : "Attiva il suono");
  };
  show();
  window.addEventListener(EVT, show);
  btn.addEventListener("click", async () => {
    if (soundOn()) {
      await disableSound();
      return;
    }
    if (await enableSound()) onEnable?.();
  });
}

function note(freq: number, at: number, dur: number, type: OscillatorType, gain: number, to?: number) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
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

/** A soft "pop", like a chat message arriving. */
export function pop(pitch = 1) {
  if (!soundOn()) return;
  note(880 * pitch, 0, 0.09, "sine", 0.12, 1320 * pitch);
}

/** The scan running down the screen: a quiet rising glide. */
export function scanSweep(dur = 2.6) {
  if (!soundOn()) return;
  note(220, 0, dur, "sine", 0.05, 660);
  note(330, 0, dur, "triangle", 0.02, 990);
}

/** A problem found: a low, short double knock. */
export function buzz() {
  if (!soundOn()) return;
  note(196, 0, 0.12, "square", 0.035, 174.6);
  note(185, 0.13, 0.16, "square", 0.03, 155.6);
}

/** The phone turning round: a filtered whoosh. */
export function whoosh(dur = 1.2) {
  if (!soundOn() || !ctx) return;
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(300, t);
  f.frequency.exponentialRampToValueAtTime(2400, t + dur * 0.5);
  f.frequency.exponentialRampToValueAtTime(400, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + dur * 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t);
  src.stop(t + dur);
}

/** A problem fixed: one bright note, rising with each fix (i = 0..4). */
export function fixed(i = 0) {
  if (!soundOn()) return;
  const scale = [783.99, 880, 987.77, 1174.66, 1318.51];
  const f = scale[Math.min(i, scale.length - 1)];
  note(f, 0, 0.4, "sine", 0.14);
  note(f * 1.5, 0.05, 0.3, "sine", 0.05);
}
