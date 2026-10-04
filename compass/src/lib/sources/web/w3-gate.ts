// W3 safety gate. The fetcher for single public LinkedIn/Indeed/InfoJobs pages is NOT in this
// repository (see docs/adr/0009). Whatever implements it must go through this gate, which
// enforces the brief's limits and never touches the network itself:
//   - off unless the admin enabled it (settings.w3Enabled, default false)
//   - at most 20 fetches per Rome day across all three platforms
//   - at least 10 seconds between fetches
//   - on the first 403, 429, login wall or CAPTCHA: stop W3 for the rest of the day

export const W3_DAILY_CAP = 20;
export const W3_MIN_SPACING_MS = 10_000;

export interface W3Response {
  status: number;
  finalUrl: string;
  body: string;
}

export type W3Fetcher = (url: string) => Promise<W3Response>;

export interface W3State {
  enabled: boolean;
  usedToday: number;
  stoppedToday: boolean;
  lastFetchAt: number | null;
}

export type W3Outcome =
  | { ok: true; body: string }
  | { ok: false; reason: "disabled" | "cap" | "stopped" | "not-a-platform-job-page" | "blocked" | "login-wall" | "captcha" | "error" };

const PLATFORM_JOB_PAGE = /^https:\/\/(www\.|it\.)?(linkedin\.com\/jobs\/view\/|indeed\.[a-z.]+\/viewjob\?|infojobs\.it\/.+\/of-)/i;
const LOGIN_WALL = /authwall|\/login|\/checkpoint|\/uas\/login|signin|accedi/i;
const CAPTCHA = /captcha|are you a robot|verifica di sicurezza|unusual traffic/i;

export function classify(r: W3Response): "ok" | "blocked" | "login-wall" | "captcha" {
  if (r.status === 403 || r.status === 429) return "blocked";
  if (LOGIN_WALL.test(r.finalUrl)) return "login-wall";
  if (CAPTCHA.test(r.body.slice(0, 20000))) return "captcha";
  return "ok";
}

export class W3Gate {
  constructor(
    public state: W3State,
    private fetcher: W3Fetcher,
    private clock: { now: () => number; sleep: (ms: number) => Promise<void> } = { now: () => Date.now(), sleep: (ms) => new Promise((r) => setTimeout(r, ms)) },
  ) {}

  async fetch(url: string): Promise<W3Outcome> {
    const s = this.state;
    if (!s.enabled) return { ok: false, reason: "disabled" };
    if (s.stoppedToday) return { ok: false, reason: "stopped" };
    if (s.usedToday >= W3_DAILY_CAP) return { ok: false, reason: "cap" };
    if (!PLATFORM_JOB_PAGE.test(url)) return { ok: false, reason: "not-a-platform-job-page" };
    if (s.lastFetchAt != null) {
      const wait = s.lastFetchAt + W3_MIN_SPACING_MS - this.clock.now();
      if (wait > 0) await this.clock.sleep(wait);
    }
    s.usedToday++; // counted before the request
    s.lastFetchAt = this.clock.now();
    let r: W3Response;
    try {
      r = await this.fetcher(url);
    } catch {
      return { ok: false, reason: "error" };
    }
    const c = classify(r);
    if (c !== "ok") {
      s.stoppedToday = true;
      return { ok: false, reason: c };
    }
    return { ok: true, body: r.body };
  }
}
