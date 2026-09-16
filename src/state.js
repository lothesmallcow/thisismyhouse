// Central state store. The one deliberate efficiency change from the design prototype:
// the prototype's own README says placements are "recomputed every render" with no cache.
// That's correct as an *architecture* (placements must never be persisted) but wasteful as
// an *implementation* — typing in the command bar, opening the edit sheet, or switching tabs
// all re-render without touching a single event or bubble. Store.solve() below only redoes
// the actual gap-finding + placement work when something that could change the schedule
// (fixed events, bubbles, week windows, buffers) actually changed, or a new minute has
// ticked over (so "don't place anything before now" stays correct).
import { solve, dateKey, addDays, HORIZON_DAYS } from './solver.js';
import { loadState, saveState, backingStorage } from './storage.js';

export const PERSIST_KEYS = ['fixed', 'bubbles', 'weekWindows', 'buf', 'density', 'hints', 'modelMode', 'seq'];
const SCHEDULE_KEYS = new Set(['fixed', 'bubbles', 'weekWindows', 'buf']);

export function defaultState() {
  const today = dateKey(new Date());
  const window = { start: 480, end: 1380 };
  return {
    page: 'day', sel: today, seq: 1,
    density: 'comfortable', hints: true,
    fixed: [],
    bubbles: [],
    weekWindows: { 0: { start: 600, end: 1380 }, 1: window, 2: window, 3: window, 4: window, 5: { start: 480, end: 1320 }, 6: { start: 600, end: 1380 } },
    buf: { afterEvent: 10, beforeEvent: 5, minUsable: 20 },
    modelMode: 'balanced',
  };
}

/** On load: drop expired fixed events, carry unfinished bubbles to today, clip passed deadlines. */
export function freshenDates(patch, today) {
  const out = { ...patch };
  if (Array.isArray(out.fixed)) out.fixed = out.fixed.filter((e) => e.date >= today);
  if (Array.isArray(out.bubbles)) {
    out.bubbles = out.bubbles
      .filter((b) => b.status !== 'done' && b.remaining > 0)
      .map((b) => (b.date < today ? { ...b, date: today, carriedDays: (b.carriedDays || 0) + 1, overflowFrom: b.overflowFrom || b.date, status: 'overflow' } : b))
      .map((b) => (b.deadline && b.deadline.date < today ? { ...b, deadline: { ...b.deadline, date: today } } : b));
  }
  return out;
}

export class Store {
  constructor({ storage } = {}) {
    this.storage = storage || backingStorage;
    this.listeners = new Set();
    this.scheduleVersion = 0;
    this._solveCache = null;
    const saved = loadState(this.storage);
    const today = dateKey(new Date());
    this.state = { ...defaultState(), ...(saved ? freshenDates(saved, today) : {}) };
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach((fn) => fn(this.state)); }

  getState() { return this.state; }

  /** @param {object|((state:object)=>object)} patch */
  setState(patch) {
    const resolved = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = { ...this.state, ...resolved };
    if (Object.keys(resolved).some((k) => SCHEDULE_KEYS.has(k))) this.scheduleVersion++;
    const toPersist = {};
    let dirty = false;
    for (const k of PERSIST_KEYS) if (k in resolved) { toPersist[k] = this.state[k]; dirty = true; }
    if (dirty) saveState(toPersist, this.storage);
    this.notify();
  }

  nextId(prefix) {
    const seq = this.state.seq || 1;
    this.setState({ seq: seq + 1 });
    return prefix + seq;
  }

  /** Memoized: only recomputes when schedule-affecting state changed or a new minute started. */
  solve(opts = {}) {
    const now = opts.now || new Date();
    const today = opts.today || dateKey(now);
    const horizonDays = opts.horizonDays || HORIZON_DAYS;
    const minuteBucket = Math.floor(now.getTime() / 60000);
    const c = this._solveCache;
    if (c && c.version === this.scheduleVersion && c.today === today && c.horizonDays === horizonDays && c.minuteBucket === minuteBucket) {
      return c.result;
    }
    const result = solve(this.state, { today, now, horizonDays });
    this._solveCache = { version: this.scheduleVersion, today, horizonDays, minuteBucket, result };
    return result;
  }

  patchFixed(fn) { this.setState((s) => ({ fixed: fn(s.fixed) })); }
  patchBubbles(fn) { this.setState((s) => ({ bubbles: fn(s.bubbles) })); }

  /** Apply one parsed/advisor action to state. Mirrors the action vocabulary in README's AI layer section. */
  applyAction(action) {
    const { type, params = {} } = action;
    const findFixed = (title) => this.state.fixed.find((e) => e.title.toLowerCase() === String(title || '').toLowerCase());
    const findBubble = (title) => this.state.bubbles.find((b) => b.title.toLowerCase() === String(title || '').toLowerCase() && b.status !== 'done');

    switch (type) {
      case 'add_fixed': {
        const id = this.nextId('e');
        this.patchFixed((fx) => [...fx, { id, title: params.title, date: params.date, start: params.start, end: params.end, parentId: params.parentId }]);
        return { ok: true, id };
      }
      case 'add_bubble': {
        const id = this.nextId('b');
        this.patchBubbles((bs) => [...bs, {
          id, title: params.title, category: params.category || 'misc', date: params.date,
          total: params.total, remaining: params.total, deadline: params.deadline || null,
          priority: params.priority || 3, type: params.type || 'divisible', minChunk: params.minChunk,
          status: 'unplaced', carriedDays: 0,
        }]);
        return { ok: true, id };
      }
      case 'modify_event': {
        const ev = params.id ? this.state.fixed.find((e) => e.id === params.id) : findFixed(params.target || params.title);
        if (!ev) return { ok: false, msg: 'No matching fixed event.' };
        this.patchFixed((fx) => fx.map((e) => (e.id === ev.id ? { ...e, ...params } : e)));
        return { ok: true };
      }
      case 'modify': {
        const b = params.id ? this.state.bubbles.find((x) => x.id === params.id) : findBubble(params.target || params.title);
        if (!b) return { ok: false, msg: 'No matching bubble.' };
        this.patchBubbles((bs) => bs.map((x) => (x.id === b.id ? { ...x, ...params } : x)));
        return { ok: true };
      }
      case 'delete_event': {
        const ev = params.id ? this.state.fixed.find((e) => e.id === params.id) : findFixed(params.target || params.title);
        if (!ev) return { ok: false, msg: 'No matching fixed event.' };
        this.patchFixed((fx) => fx.filter((e) => e.id !== ev.id && e.parentId !== ev.id));
        return { ok: true };
      }
      case 'delete': {
        const ev = findFixed(params.target || params.title);
        if (ev) { this.patchFixed((fx) => fx.filter((e) => e.id !== ev.id && e.parentId !== ev.id)); return { ok: true }; }
        const b = findBubble(params.target || params.title);
        if (b) { this.patchBubbles((bs) => bs.filter((x) => x.id !== b.id)); return { ok: true }; }
        return { ok: false, msg: 'Nothing matched "' + (params.target || params.title) + '".' };
      }
      case 'mark_done': {
        const b = params.id ? this.state.bubbles.find((x) => x.id === params.id) : findBubble(params.target || params.title);
        if (!b) return { ok: false, msg: 'No matching bubble.' };
        this.patchBubbles((bs) => bs.map((x) => (x.id === b.id ? { ...x, remaining: 0, status: 'done' } : x)));
        return { ok: true };
      }
      case 'shift': {
        const days = params.days || 0;
        const ev = findFixed(params.target || params.title);
        if (ev) { this.patchFixed((fx) => fx.map((e) => (e.id === ev.id ? { ...e, date: addDays(e.date, days) } : e))); return { ok: true }; }
        const b = findBubble(params.target || params.title);
        if (b) { this.patchBubbles((bs) => bs.map((x) => (x.id === b.id ? { ...x, date: addDays(x.date, days) } : x))); return { ok: true }; }
        return { ok: false, msg: 'Nothing matched "' + (params.target || params.title) + '".' };
      }
      case 'split_event': {
        const ev = params.id ? this.state.fixed.find((e) => e.id === params.id) : findFixed(params.target || params.title);
        if (!ev || params.at == null || params.at <= ev.start || params.at >= ev.end) return { ok: false, msg: 'Cannot split there.' };
        const secondId = this.nextId('e');
        this.patchFixed((fx) => fx.flatMap((e) => (e.id === ev.id
          ? [{ ...e, end: params.at }, { ...e, id: secondId, start: params.at, title: params.secondTitle || e.title }]
          : [e])));
        return { ok: true };
      }
      case 'set_buffer': {
        this.setState((s) => ({ buf: { ...s.buf, ...params } }));
        return { ok: true };
      }
      case 'set_window': {
        if (params.dow == null) return { ok: false, msg: 'Which day?' };
        this.setState((s) => ({ weekWindows: { ...s.weekWindows, [params.dow]: { start: params.start, end: params.end } } }));
        return { ok: true };
      }
      case 'extend_window': {
        if (params.dow == null) return { ok: false, msg: 'Which day?' };
        this.setState((s) => ({ weekWindows: { ...s.weekWindows, [params.dow]: { ...s.weekWindows[params.dow], end: Math.max(s.weekWindows[params.dow].end, params.end || 0) } } }));
        return { ok: true };
      }
      default:
        return { ok: false, msg: 'Unrecognized action: ' + type };
    }
  }
}
