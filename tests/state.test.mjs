import test from 'node:test';
import assert from 'node:assert/strict';
import { Store, freshenDates, defaultState, PERSIST_KEYS } from '../src/state.js';
import { MemoryStorage } from '../src/storage.js';

test('solve() is memoized: unrelated state changes reuse the cached result object', () => {
  const store = new Store({ storage: new MemoryStorage() });
  const now = new Date(2026, 0, 5, 9, 0);
  const r1 = store.solve({ now });
  store.setState({ page: 'week', sel: '2026-01-06' }); // UI-only, not schedule-affecting
  const r2 = store.solve({ now });
  assert.equal(r1, r2, 'unrelated state churn must not force a recompute');
});

test('solve() recomputes when a schedule-affecting field changes', () => {
  const store = new Store({ storage: new MemoryStorage() });
  const now = new Date(2026, 0, 5, 9, 0);
  const r1 = store.solve({ now });
  store.applyAction({ type: 'add_fixed', params: { title: 'Standup', date: '2026-01-05', start: 600, end: 630 } });
  const r2 = store.solve({ now });
  assert.notEqual(r1, r2, 'adding a fixed event must invalidate the cache');
});

test('solve() recomputes once the clock ticks into a new minute, even with no state change', () => {
  const store = new Store({ storage: new MemoryStorage() });
  const r1 = store.solve({ now: new Date(2026, 0, 5, 9, 0, 30) });
  const r2 = store.solve({ now: new Date(2026, 0, 5, 9, 0, 45) }); // same minute
  const r3 = store.solve({ now: new Date(2026, 0, 5, 9, 1, 5) }); // next minute
  assert.equal(r1, r2);
  assert.notEqual(r1, r3);
});

test('applyAction add_fixed then add_bubble then mark_done round-trips through state', () => {
  const store = new Store({ storage: new MemoryStorage() });
  store.applyAction({ type: 'add_fixed', params: { title: 'Gym', date: '2026-01-05', start: 420, end: 480 } });
  assert.equal(store.getState().fixed.length, 1);

  store.applyAction({ type: 'add_bubble', params: { title: 'Reading', category: 'study', date: '2026-01-05', total: 60, type: 'divisible', minChunk: 30 } });
  assert.equal(store.getState().bubbles.length, 1);
  assert.equal(store.getState().bubbles[0].remaining, 60);

  const r = store.applyAction({ type: 'mark_done', params: { title: 'Reading' } });
  assert.equal(r.ok, true);
  assert.equal(store.getState().bubbles[0].status, 'done');
});

test('applyAction delete removes a fixed event and its subtasks together', () => {
  const store = new Store({ storage: new MemoryStorage() });
  store.applyAction({ type: 'add_fixed', params: { title: 'Parent', date: '2026-01-05', start: 480, end: 600 } });
  const parentId = store.getState().fixed[0].id;
  store.patchFixed((fx) => [...fx, { id: 'sub1', title: 'Subtask', date: '2026-01-05', start: 500, end: 520, parentId }]);
  assert.equal(store.getState().fixed.length, 2);

  store.applyAction({ type: 'delete', params: { title: 'Parent' } });
  assert.equal(store.getState().fixed.length, 0, 'deleting the parent must also remove its subtask');
});

test('applyAction shift moves a bubble by N days', () => {
  const store = new Store({ storage: new MemoryStorage() });
  store.applyAction({ type: 'add_bubble', params: { title: 'Essay', category: 'study', date: '2026-01-05', total: 90, type: 'solid' } });
  store.applyAction({ type: 'shift', params: { title: 'Essay', days: 2 } });
  assert.equal(store.getState().bubbles[0].date, '2026-01-07');
});

test('applyAction rejects an unknown action type instead of throwing', () => {
  const store = new Store({ storage: new MemoryStorage() });
  const r = store.applyAction({ type: 'not_a_real_action', params: {} });
  assert.equal(r.ok, false);
});

test('setState persists only the declared PERSIST_KEYS, not ephemeral UI state', () => {
  const storage = new MemoryStorage();
  const store = new Store({ storage });
  store.setState({ page: 'add', sheet: { open: true } });
  const raw = JSON.parse(storage.getItem('bubbles.state.v1') || '{}');
  assert.equal('page' in raw, false);
  assert.equal('sheet' in raw, false);

  store.applyAction({ type: 'add_fixed', params: { title: 'X', date: '2026-01-05', start: 0, end: 30 } });
  const raw2 = JSON.parse(storage.getItem('bubbles.state.v1') || '{}');
  assert.equal(raw2.fixed.length, 1);
});

test('apiKey survives a reload (its own storage slot, not the PERSIST_KEYS blob)', () => {
  const storage = new MemoryStorage();
  const s1 = new Store({ storage });
  s1.setState({ apiKey: 'sk-ant-real-key' });

  const s2 = new Store({ storage });
  assert.equal(s2.getState().apiKey, 'sk-ant-real-key');

  // Must never ride along in a Supabase sync payload — it's a billing credential, not calendar data.
  const blob = JSON.parse(storage.getItem('bubbles.state.v1') || '{}');
  assert.equal('apiKey' in blob, false);
  assert.equal(PERSIST_KEYS.includes('apiKey'), false);
});

test('clearing apiKey removes it from storage, not just from memory', () => {
  const storage = new MemoryStorage();
  const s1 = new Store({ storage });
  s1.setState({ apiKey: 'sk-ant-real-key' });
  s1.setState({ apiKey: '' });

  const s2 = new Store({ storage });
  assert.equal(s2.getState().apiKey, '');
  assert.equal(storage.getItem('bubbles.apiKey'), null);
});

test('a fresh Store reloads persisted state from storage', () => {
  const storage = new MemoryStorage();
  const s1 = new Store({ storage });
  // Far-future date so freshenDates() never prunes it regardless of when this test runs.
  s1.applyAction({ type: 'add_fixed', params: { title: 'Persisted', date: '2099-01-05', start: 60, end: 90 } });

  const s2 = new Store({ storage });
  assert.equal(s2.getState().fixed.length, 1);
  assert.equal(s2.getState().fixed[0].title, 'Persisted');
});

test('freshenDates drops expired fixed events and carries unfinished bubbles to today', () => {
  const patch = {
    fixed: [
      { id: 'e1', title: 'Old', date: '2026-01-01', start: 0, end: 30 },
      { id: 'e2', title: 'Future', date: '2026-01-10', start: 0, end: 30 },
    ],
    bubbles: [
      { id: 'b1', title: 'Stale unfinished', date: '2026-01-01', remaining: 30, status: 'unplaced', carriedDays: 0 },
      { id: 'b2', title: 'Stale finished', date: '2026-01-01', remaining: 0, status: 'done', carriedDays: 0 },
    ],
  };
  const out = freshenDates(patch, '2026-01-05');
  assert.deepEqual(out.fixed.map((e) => e.id), ['e2']);
  assert.equal(out.bubbles.length, 1);
  assert.equal(out.bubbles[0].id, 'b1');
  assert.equal(out.bubbles[0].date, '2026-01-05');
  assert.equal(out.bubbles[0].carriedDays, 1);
  assert.equal(out.bubbles[0].overflowFrom, '2026-01-01');
});

test('defaultState gives every weekday a window', () => {
  const s = defaultState();
  for (let d = 0; d <= 6; d++) assert.ok(s.weekWindows[d].start < s.weekWindows[d].end);
});
