import test from 'node:test';
import assert from 'node:assert/strict';
import { gaps, solve, lanes, dur, fmt, toMin, parseDur, addDays } from '../src/solver.js';

const buf = { beforeEvent: 5, afterEvent: 10, minUsable: 20 };
const window = { start: 480, end: 1080 }; // 08:00-18:00

test('gaps: empty day yields one usable segment spanning the whole window', () => {
  const g = gaps('2026-01-05', [], window, buf, null);
  assert.deepEqual(g.usable, [{ from: 480, to: 1080 }]);
  assert.deepEqual(g.bands, []);
});

test('gaps: subtasks (parentId set) are excluded from busy time', () => {
  const fixed = [
    { date: '2026-01-05', start: 600, end: 660, parentId: 'p1' },
  ];
  const g = gaps('2026-01-05', fixed, window, buf, null);
  assert.deepEqual(g.usable, [{ from: 480, to: 1080 }]);
});

test('gaps: applies lead/tail buffers only where a fixed event actually borders the gap', () => {
  const fixed = [{ id: 'e1', date: '2026-01-05', start: 600, end: 660 }];
  const g = gaps('2026-01-05', fixed, window, buf, null);
  // before the event: no lead (nothing precedes), tail because event follows
  // after the event: lead because event precedes, no tail (nothing follows)
  assert.deepEqual(g.usable, [
    { from: 480, to: 600 - buf.beforeEvent },
    { from: 660 + buf.afterEvent, to: 1080 },
  ]);
});

test('gaps: segment shorter than minUsable is discarded', () => {
  const fixed = [
    { id: 'a', date: '2026-01-05', start: 490, end: 495 }, // leaves a sliver before it
  ];
  const g = gaps('2026-01-05', fixed, window, buf, null);
  // sliver 480->485 (490-beforeEvent) is only 5 min < minUsable(20) -> dropped
  assert.equal(g.usable.some((s) => s.to <= 490), false);
});

test('gaps: "today" cursor never places anything before now', () => {
  const g = gaps('2026-01-05', [], window, buf, 500);
  assert.deepEqual(g.usable, [{ from: 500, to: 1080 }]);
});

test('solve: solid bubble never splits — carries whole to the next day if it does not fit today', () => {
  const state = {
    fixed: [],
    bubbles: [
      // Window has 600 usable minutes; this needs 700, so it cannot fit on day 1 at all.
      { id: 'b1', title: 'Deep work', category: 'study', date: '2026-01-05', total: 700, remaining: 700, deadline: null, priority: 3, type: 'solid', status: 'unplaced' },
    ],
    weekWindows: { 0: window, 1: window, 2: window, 3: window, 4: window, 5: window, 6: window },
    buf,
  };
  const r = solve(state, { today: '2026-01-05', now: new Date(2026, 0, 5, 8, 0), horizonDays: 2 });
  const day1 = r.placements.filter((p) => p.date === '2026-01-05');
  assert.equal(day1.length, 0, 'must not place a partial chunk of a solid bubble');
  const day2 = r.placements.filter((p) => p.date === '2026-01-06');
  assert.equal(day2.length, 0, 'still does not fit on day 2 (700 > 600 usable minutes) — flagged, not split');
  assert.equal(r.flags.length, 1);
  assert.equal(r.flags[0].remaining, 700, 'the full remainder carries and is flagged, never a partial amount');
});

test('solve: solid bubble places fully in the smallest segment that fits (best fit)', () => {
  const state = {
    fixed: [],
    bubbles: [
      { id: 'b1', title: 'Focus', category: 'study', date: '2026-01-05', total: 100, remaining: 100, deadline: null, priority: 3, type: 'solid', status: 'unplaced' },
    ],
    weekWindows: { 0: window, 1: window, 2: window, 3: window, 4: window, 5: window, 6: window },
    buf,
  };
  const r = solve(state, { today: '2026-01-05', now: new Date(2026, 0, 5, 8, 0), horizonDays: 1 });
  assert.equal(r.placements.length, 1);
  assert.equal(r.placements[0].end - r.placements[0].start, 100);
});

test('solve: divisible bubble splits with the min-chunk crumb rule (no sub-minChunk leftover)', () => {
  // One usable segment of exactly 100 min, minChunk 30, remaining 130 across two days.
  const narrowWindow = { start: 480, end: 580 }; // 100 min/day
  const state = {
    fixed: [],
    bubbles: [
      { id: 'b1', title: 'Reading', category: 'study', date: '2026-01-05', total: 130, remaining: 130, deadline: null, priority: 3, type: 'divisible', minChunk: 30, status: 'unplaced' },
    ],
    weekWindows: { 0: narrowWindow, 1: narrowWindow, 2: narrowWindow, 3: narrowWindow, 4: narrowWindow, 5: narrowWindow, 6: narrowWindow },
    buf: { beforeEvent: 0, afterEvent: 0, minUsable: 10 },
  };
  const r = solve(state, { today: '2026-01-05', now: new Date(2026, 0, 5, 8, 0), horizonDays: 2 });
  const day1 = r.placements.filter((p) => p.date === '2026-01-05');
  // 100 min available; taking all 100 would leave 30 (>= minChunk) — fine to take all 100.
  const totalDay1 = day1.reduce((s, p) => s + (p.end - p.start), 0);
  assert.equal(totalDay1, 100);
  const totalAll = r.placements.reduce((s, p) => s + (p.end - p.start), 0);
  assert.equal(totalAll, 130);
  // No placement leaves a sub-minChunk crumb sitting unplaced inside a day's own segment.
});

test('solve: divisible bubble never leaves a placed chunk smaller than the crumb rule allows', () => {
  const narrowWindow = { start: 0, end: 70 }; // 70 min/day only
  const state = {
    fixed: [],
    bubbles: [
      { id: 'b1', title: 'X', category: 'misc', date: '2026-01-05', total: 100, remaining: 100, deadline: null, priority: 3, type: 'divisible', minChunk: 40, status: 'unplaced' },
    ],
    weekWindows: { 0: narrowWindow, 1: narrowWindow, 2: narrowWindow, 3: narrowWindow, 4: narrowWindow, 5: narrowWindow, 6: narrowWindow },
    buf: { beforeEvent: 0, afterEvent: 0, minUsable: 5 },
  };
  const r = solve(state, { today: '2026-01-05', now: new Date(2026, 0, 5, 0, 0), horizonDays: 1 });
  const day1 = r.placements.filter((p) => p.date === '2026-01-05');
  // Whole (100) doesn't fit in 70. Largest segment (70) >= minChunk(40): chunk=min(100,70)=70,
  // leftover 30 < minChunk(40) -> crumb rule kicks in: chunk = 100-40 = 60, leaving exactly 40 for later.
  assert.equal(day1.length, 1);
  assert.equal(day1[0].end - day1[0].start, 60);
});

test('solve: unplaceable remainder is flagged (not silently dropped) at horizon end', () => {
  const tinyWindow = { start: 0, end: 10 };
  const state = {
    fixed: [],
    bubbles: [
      { id: 'b1', title: 'Too big', category: 'gym', date: '2026-01-05', total: 500, remaining: 500, deadline: null, priority: 3, type: 'solid', status: 'unplaced' },
    ],
    weekWindows: { 0: tinyWindow, 1: tinyWindow, 2: tinyWindow, 3: tinyWindow, 4: tinyWindow, 5: tinyWindow, 6: tinyWindow },
    buf: { beforeEvent: 0, afterEvent: 0, minUsable: 5 },
  };
  const r = solve(state, { today: '2026-01-05', now: new Date(2026, 0, 5, 0, 0), horizonDays: 2 });
  assert.equal(r.placements.length, 0);
  assert.equal(r.flags.length, 1);
  assert.equal(r.flags[0].reason, 'horizon_end');
  assert.equal(r.debtByCategory.gym, 500);
});

test('solve: carried (overflow) bubbles are placed before fresh bubbles of equal priority', () => {
  const state = {
    fixed: [],
    bubbles: [
      { id: 'fresh', title: 'Fresh', category: 'study', date: '2026-01-05', total: 300, remaining: 300, deadline: null, priority: 3, type: 'solid', status: 'unplaced' },
      { id: 'carried', title: 'Carried', category: 'study', date: '2026-01-05', total: 300, remaining: 300, deadline: null, priority: 3, type: 'solid', status: 'overflow', carriedDays: 1, overflowFrom: '2026-01-04' },
    ],
    weekWindows: { 0: window, 1: window, 2: window, 3: window, 4: window, 5: window, 6: window },
    buf: { beforeEvent: 0, afterEvent: 0, minUsable: 5 },
  };
  const r = solve(state, { today: '2026-01-05', now: new Date(2026, 0, 5, 8, 0), horizonDays: 1 });
  // Only room for one 300-min block (600 min window) alongside anything else fitting after —
  // the carried one must be the one placed first (earliest start).
  const carriedPlacement = r.placements.find((p) => p.bubbleId === 'carried');
  const freshPlacement = r.placements.find((p) => p.bubbleId === 'fresh');
  assert.ok(carriedPlacement);
  assert.ok(freshPlacement);
  assert.ok(carriedPlacement.start <= freshPlacement.start);
});

test('lanes: non-overlapping items all get column 0 of a 1-column cluster', () => {
  const r = lanes([{ start: 0, end: 10 }, { start: 20, end: 30 }]);
  assert.deepEqual(r.map((x) => [x.col, x.cols]), [[0, 1], [0, 1]]);
});

test('lanes: three mutually overlapping items get 3 columns', () => {
  const r = lanes([{ start: 0, end: 30 }, { start: 5, end: 25 }, { start: 10, end: 20 }]);
  assert.deepEqual(new Set(r.map((x) => x.col)), new Set([0, 1, 2]));
  assert.ok(r.every((x) => x.cols === 3));
});

test('lanes: two separate overlap clusters do not share a column count', () => {
  const r = lanes([
    { start: 0, end: 10 }, { start: 0, end: 10 }, // cluster A: 2 cols
    { start: 100, end: 110 }, // cluster B: 1 col
  ]);
  assert.equal(r[2].cols, 1);
  assert.equal(r[0].cols, 2);
});

test('duration helpers round-trip', () => {
  assert.equal(fmt(90), '01:30');
  assert.equal(toMin('01:30'), 90);
  assert.equal(dur(90), '1h30');
  assert.equal(dur(60), '1h');
  assert.equal(dur(45), '45m');
});

test('parseDur understands clock durations and word numbers', () => {
  assert.equal(parseDur('1h30'), 90);
  assert.equal(parseDur('90'), 90);
  assert.equal(parseDur('an hour and a half'), 90);
  assert.equal(parseDur('half an hour'), 30);
  assert.equal(parseDur('a couple of hours'), 120);
});

test('addDays crosses month/year boundaries', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(addDays('2025-12-31', 1), '2026-01-01');
});
