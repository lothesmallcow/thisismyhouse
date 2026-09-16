// Pure scheduling core: no DOM, no network, no dates.now() side effects unless passed in.
// Ported from the Bubbles Calendar design prototype (design_handoff_bubbles_calendar/README.md,
// section "Core algorithm"). Kept as pure functions over plain data so it can be unit tested
// and reused unchanged by any UI layer.

export const CATS = { study: 185, 'job apps': 255, gym: 150, misc: 40 };
export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const HORIZON_DAYS = 7;
export const MAX_CHUNK_ITERATIONS = 16;

export const pad = (n) => String(n).padStart(2, '0');

/** minutes-from-midnight -> "HH:MM" */
export const fmt = (m) => pad(Math.floor(m / 60) % 24) + ':' + pad(Math.round(m) % 60);

/** "HH:MM" -> minutes-from-midnight */
export const toMin = (v) => {
  const p = String(v || '').split(':');
  return (+p[0] || 0) * 60 + (+p[1] || 0);
};

/** minutes -> "1h30" / "1h" / "45m" */
export const dur = (m) => {
  m = Math.round(m);
  const h = Math.floor(m / 60), r = m % 60;
  return h && r ? h + 'h' + pad(r) : h ? h + 'h' : r + 'm';
};

/** Date -> "YYYY-MM-DD" in local time */
export const dateKey = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

/** "YYYY-MM-DD" -> "YYYY-MM-DD" shifted by n days (local, DST-naive like the prototype) */
export const addDays = (key, n) => {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return dateKey(dt);
};

/** "YYYY-MM-DD" -> day-of-week 0..6 (Sun..Sat), local */
export const dowOf = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
};

const WORDNUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };

export const normDur = (s) => String(s || '').toLowerCase()
  .replace(/\ban?\s+hour\s+and\s+a\s+half\b/g, '90 minutes')
  .replace(/\bhalf\s+an?\s+hour\b/g, '30 minutes')
  .replace(/\ba\s+couple\s+of\s+hours\b/g, '2 hours')
  .replace(/\b(a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(hours?|hrs?|minutes?|mins?)\b/g, (mm, wnum, unit) => WORDNUM[wnum] + ' ' + unit);

export const parseDur = (s) => {
  s = normDur(s);
  if (!s) return 0;
  let t = 0, m, any = false;
  const re = /(\d+(?:[.,]\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)?/gi;
  while ((m = re.exec(s))) {
    if (!m[1]) continue;
    const v = parseFloat(m[1].replace(',', '.'));
    const u = (m[2] || '').toLowerCase();
    if (u.startsWith('h')) { t += v * 60; any = true; }
    else if (u) { t += v; any = true; }
    else if (!any) { t += v >= 8 ? v : v * 60; any = true; }
    else t += v;
  }
  return Math.round(t);
};

/**
 * Free-time segments for one date, in one pass over that date's fixed events.
 * Excludes subtasks (parentId set) from busy time, per spec.
 *
 * @param {string} dateKeyStr "YYYY-MM-DD"
 * @param {Array} fixed all fixed events (any date) — caller need not pre-filter
 * @param {{start:number,end:number}} window this weekday's window
 * @param {{beforeEvent:number, afterEvent:number, minUsable:number}} buf
 * @param {number|null} nowMinutes if this date is "today", minutes-from-midnight right now; else null
 * @returns {{usable: Array<{from:number,to:number}>, bands: Array<{from:number,to:number,kind:'lead'|'tail'}>}}
 */
export function gaps(dateKeyStr, fixed, window, buf, nowMinutes) {
  // Single filter+sort pass — O(n log n) in the events for this date only, not the whole list.
  const dayEvents = fixed
    .filter((e) => e.date === dateKeyStr && !e.parentId)
    .sort((a, b) => a.start - b.start);

  let cursor = window.start;
  if (nowMinutes != null && nowMinutes > cursor) cursor = nowMinutes;

  const usable = [];
  const bands = [];

  const emit = (from, to, hadLead, hadTail) => {
    if (to <= from) return;
    const lead = hadLead ? buf.afterEvent : 0;
    const tail = hadTail ? buf.beforeEvent : 0;
    if (lead > 0) bands.push({ from, to: Math.min(from + lead, to), kind: 'lead' });
    if (tail > 0) bands.push({ from: Math.max(to - tail, from), to, kind: 'tail' });
    const u0 = from + lead, u1 = to - tail;
    if (u1 - u0 >= buf.minUsable) usable.push({ from: u0, to: u1 });
  };

  let hadLead = false;
  for (const ev of dayEvents) {
    if (ev.end <= cursor) continue; // already fully behind the cursor (or in the past)
    const start = Math.max(ev.start, cursor);
    if (start > cursor) emit(cursor, start, hadLead, true);
    cursor = Math.max(cursor, ev.end);
    hadLead = true;
  }
  if (cursor < window.end) emit(cursor, window.end, hadLead, false);

  return { usable, bands };
}

const SORT_STATUS_RANK = { overflow: 0 }; // overflow before fresh; everything else ties at 1
const statusRank = (b) => (b.status === 'overflow' ? 0 : 1);

/** Comparator implementing "deadline proximity -> overflow before fresh -> priority desc -> age desc -> insertion order". */
function bubbleCompare(a, b) {
  const ad = a.deadline ? a.deadline.date + ' ' + pad(Math.floor(a.deadline.time / 60)) + pad(a.deadline.time % 60) : null;
  const bd = b.deadline ? b.deadline.date + ' ' + pad(Math.floor(b.deadline.time / 60)) + pad(b.deadline.time % 60) : null;
  if (ad && bd && ad !== bd) return ad < bd ? -1 : 1;
  if (ad && !bd) return -1;
  if (bd && !ad) return 1;
  const sr = statusRank(a) - statusRank(b);
  if (sr !== 0) return sr;
  if (a.priority !== b.priority) return b.priority - a.priority;
  const aAge = a.carriedDays || 0, bAge = b.carriedDays || 0;
  if (aAge !== bAge) return bAge - aAge;
  return (a.__seq || 0) - (b.__seq || 0);
}

/** Best-fit: smallest free segment that is >= needed. Returns index or -1. */
function bestFitIndex(segments, needed) {
  let idx = -1, best = Infinity;
  for (let i = 0; i < segments.length; i++) {
    const len = segments[i].to - segments[i].from;
    if (len >= needed && len < best) { best = len; idx = i; }
  }
  return idx;
}

/** Largest-fit: biggest free segment that is >= minChunk. Returns index or -1. */
function largestFitIndex(segments, minChunk) {
  let idx = -1, best = -1;
  for (let i = 0; i < segments.length; i++) {
    const len = segments[i].to - segments[i].from;
    if (len >= minChunk && len > best) { best = len; idx = i; }
  }
  return idx;
}

/** Consume `amount` minutes from the start of segments[idx], shrinking or removing it. */
function consume(segments, idx, amount) {
  const seg = segments[idx];
  const start = seg.from;
  if (seg.to - seg.from <= amount) segments.splice(idx, 1);
  else seg.from += amount;
  return start;
}

/**
 * 7-day horizon placement. Placements are derived fresh every call — never persist them.
 *
 * @param {object} state { fixed, bubbles, weekWindows, buf }
 * @param {object} opts { today: "YYYY-MM-DD" (required), now: Date (for "today"'s cursor), horizonDays }
 * @returns {{placements: Array, flags: Array, debtByCategory: Record<string,number>, gapsByDate: Record<string, ReturnType<typeof gaps>>}}
 */
export function solve(state, opts) {
  const today = opts.today;
  const now = opts.now || new Date();
  const horizonDays = opts.horizonDays || HORIZON_DAYS;
  const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  const dates = Array.from({ length: horizonDays }, (_, i) => addDays(today, i));
  const gapsByDate = {};
  for (const d of dates) {
    const window = state.weekWindows[dowOf(d)] || { start: 0, end: 1440 };
    gapsByDate[d] = gaps(d, state.fixed, window, state.buf, d === today ? nowMinutes : null);
  }

  const activeBubbles = state.bubbles.filter((b) => b.status !== 'done' && b.remaining > 0);
  // Stable insertion order tiebreaker without mutating caller's objects.
  const withSeq = activeBubbles.map((b, i) => ({ ...b, __seq: i }));

  const placements = [];
  const flags = [];
  const debtByCategory = {};

  let pool = [];
  for (let di = 0; di < dates.length; di++) {
    const d = dates[di];
    const isLastDay = di === dates.length - 1;
    const fresh = withSeq.filter((b) => b.date === d);
    pool = pool.concat(fresh);
    pool.sort(bubbleCompare);

    // Mutable working copy of this day's usable segments; shrinks as bubbles are placed.
    const free = gapsByDate[d].usable.map((s) => ({ ...s }));
    const carryOver = [];

    for (const b of pool) {
      let remaining = b.remaining;
      if (b.type === 'solid') {
        const idx = bestFitIndex(free, remaining);
        if (idx === -1) {
          carryOver.push({ ...b, carriedDays: (b.carriedDays || 0) + 1, status: 'overflow', overflowFrom: b.overflowFrom || b.date });
          continue;
        }
        const start = consume(free, idx, remaining);
        placements.push({ bubbleId: b.id, date: d, start, end: start + remaining, chunk: 0 });
        remaining = 0;
      } else {
        let iterations = 0;
        while (remaining > 0 && iterations < MAX_CHUNK_ITERATIONS) {
          iterations++;
          const wholeIdx = bestFitIndex(free, remaining);
          if (wholeIdx !== -1) {
            const start = consume(free, wholeIdx, remaining);
            placements.push({ bubbleId: b.id, date: d, start, end: start + remaining, chunk: iterations });
            remaining = 0;
            break;
          }
          const minChunk = b.minChunk || 1;
          const idx = largestFitIndex(free, minChunk);
          if (idx === -1) break;
          let chunk = Math.min(remaining, free[idx].to - free[idx].from);
          const leftover = remaining - chunk;
          if (leftover > 0 && leftover < minChunk) chunk = remaining - minChunk;
          if (chunk <= 0) break;
          const start = consume(free, idx, chunk);
          placements.push({ bubbleId: b.id, date: d, start, end: start + chunk, chunk: iterations });
          remaining -= chunk;
        }
        if (remaining > 0) {
          carryOver.push({ ...b, remaining, carriedDays: (b.carriedDays || 0) + 1, status: 'overflow', overflowFrom: b.overflowFrom || b.date });
        }
      }
    }

    const stillOpen = [];
    for (const b of carryOver) {
      const deadlinePassed = b.deadline && b.deadline.date <= d;
      if (deadlinePassed || isLastDay) {
        flags.push({ bubbleId: b.id, title: b.title, category: b.category, date: d, remaining: b.remaining, reason: isLastDay ? 'horizon_end' : 'deadline_passed' });
        debtByCategory[b.category] = (debtByCategory[b.category] || 0) + b.remaining;
      } else {
        stillOpen.push(b);
      }
    }
    pool = stillOpen;
  }

  return { placements, flags, debtByCategory, gapsByDate, dates };
}

/**
 * Cluster overlapping items and assign each a column so overlapping blocks render side by side.
 * O(n log n): one sort + one sweep with a small "column free-at" array.
 * @param {Array<{start:number,end:number}>} items
 * @returns {Array<{item:any,col:number,cols:number}>}
 */
export function lanes(items) {
  if (items.length === 0) return [];
  const order = items.map((item, i) => ({ item, i })).sort((a, b) => a.item.start - b.item.start || a.i - b.i);

  const col = new Array(order.length);
  const clusterCols = new Array(order.length); // filled in per-cluster once each cluster closes
  let colEnds = []; // colEnds[c] = end time currently occupying column c, for the open cluster
  let clusterMaxEnd = -Infinity;
  let clusterStart = 0;

  const closeCluster = (endExclusive) => {
    for (let k = clusterStart; k < endExclusive; k++) clusterCols[k] = colEnds.length;
  };

  for (let k = 0; k < order.length; k++) {
    const it = order[k].item;
    if (colEnds.length && it.start >= clusterMaxEnd) {
      closeCluster(k);
      colEnds = [];
      clusterMaxEnd = -Infinity;
      clusterStart = k;
    }
    let c = colEnds.findIndex((end) => end <= it.start);
    if (c === -1) { c = colEnds.length; colEnds.push(it.end); }
    else colEnds[c] = it.end;
    clusterMaxEnd = Math.max(clusterMaxEnd, it.end);
    col[k] = c;
  }
  closeCluster(order.length);

  const out = new Array(items.length);
  for (let k = 0; k < order.length; k++) {
    out[order[k].i] = { item: order[k].item, col: col[k], cols: clusterCols[k] };
  }
  return out;
}
