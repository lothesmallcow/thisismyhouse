import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, checkProject, SupabaseClient } from '../src/supabase.js';
import { startMockSupabase, TABLE_STATES } from './mock-supabase-server.mjs';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}

// ---- normalizeUrl: pure, no network ----

test('normalizeUrl accepts a bare host and adds https', () => {
  const r = normalizeUrl('xxxx.supabase.co');
  assert.equal(r.ok, true);
  assert.equal(r.url, 'https://xxxx.supabase.co');
});

test('normalizeUrl rejects the dashboard URL with a specific, actionable message', () => {
  const r = normalizeUrl('https://supabase.com/dashboard/project/xxxx');
  assert.equal(r.ok, false);
  assert.match(r.msg, /dashboard/i);
});

test('normalizeUrl rejects a pasted code snippet', () => {
  const r = normalizeUrl("import { createClient } from '@supabase/supabase-js'");
  assert.equal(r.ok, false);
});

test('normalizeUrl strips paths/query so only the host survives', () => {
  const r = normalizeUrl('https://xxxx.supabase.co/some/path?x=1');
  assert.equal(r.ok, true);
  assert.equal(r.url, 'https://xxxx.supabase.co');
});

// ---- live round trips against a mock Supabase project over real HTTP ----

test('checkProject succeeds against a live project with a valid key', async () => {
  const mock = await startMockSupabase();
  try {
    const r = await checkProject(mock.url, mock.anonKey, fetch);
    assert.equal(r.ok, true);
  } finally { await mock.stop(); }
});

test('checkProject reports a rejected key distinctly from an unreachable host', async () => {
  const mock = await startMockSupabase();
  try {
    const r = await checkProject(mock.url, 'wrong-key', fetch);
    assert.equal(r.ok, false);
    assert.match(r.msg, /anon key was rejected/i);
  } finally { await mock.stop(); }
});

test('checkProject reports a missing table distinctly, with a fix', async () => {
  const mock = await startMockSupabase({ tableState: TABLE_STATES.NO_TABLE });
  try {
    const r = await checkProject(mock.url, mock.anonKey, fetch);
    assert.equal(r.ok, false);
    assert.match(r.msg, /table is missing/i);
  } finally { await mock.stop(); }
});

test('checkProject reports an unreachable host without throwing', async () => {
  const r = await checkProject('http://127.0.0.1:1', 'any-key', fetch);
  assert.equal(r.ok, false);
  assert.match(r.msg, /could not reach/i);
});

function clientFor(mock) {
  const storage = new MemoryStorage();
  storage.setItem('bubbles.sbUrl', mock.url);
  storage.setItem('bubbles.sbKey', mock.anonKey);
  return new SupabaseClient({ storage, fetchImpl: fetch });
}

test('sign up then sign in against a live project actually authenticates', async () => {
  const mock = await startMockSupabase();
  try {
    const client = clientFor(mock);
    const up = await client.authenticate('up', 'lorenzo@example.com', 'hunter22');
    assert.equal(up.ok, true);
    assert.ok(client.session().token, 'sign-up logs the session in immediately in this mock');

    client.signOut();
    assert.equal(client.session(), null);

    const inRes = await client.authenticate('in', 'lorenzo@example.com', 'hunter22');
    assert.equal(inRes.ok, true);
    assert.ok(client.session().token);
    assert.equal(client.session().email, 'lorenzo@example.com');
  } finally { await mock.stop(); }
});

test('sign in with the wrong password is rejected with a real error from the server', async () => {
  const mock = await startMockSupabase();
  try {
    const client = clientFor(mock);
    await client.authenticate('up', 'a@b.com', 'correct-horse');
    client.signOut();
    const r = await client.authenticate('in', 'a@b.com', 'wrong-password');
    assert.equal(r.ok, false);
  } finally { await mock.stop(); }
});

test('push then pull round-trips real calendar data through the mock REST API', async () => {
  const mock = await startMockSupabase();
  try {
    const client = clientFor(mock);
    await client.authenticate('up', 'sync@example.com', 'pw123456');
    const state = { fixed: [{ id: 'e1', title: 'Gym' }], bubbles: [], seq: 5 };
    const pushRes = await client.push(['fixed', 'bubbles', 'seq'], state);
    assert.equal(pushRes.ok, true);

    const client2 = clientFor(mock);
    await client2.authenticate('in', 'sync@example.com', 'pw123456');
    const pullRes = await client2.pull(['fixed', 'bubbles', 'seq']);
    assert.equal(pullRes.ok, true);
    assert.deepEqual(pullRes.patch.fixed, [{ id: 'e1', title: 'Gym' }]);
    assert.equal(pullRes.patch.seq, 5);
  } finally { await mock.stop(); }
});

test('sbFetch transparently refreshes an expired access token and retries once', async () => {
  const mock = await startMockSupabase();
  try {
    const client = clientFor(mock);
    await client.authenticate('up', 'refresh@example.com', 'pw123456');
    const good = client.session();
    // Simulate an expired access token the server no longer recognizes, but keep the
    // still-valid refresh token — sbFetch must notice the 401, refresh, and retry.
    client.saveSession({ ...good, token: 'expired-token' });

    const rows = await client.sbFetch('/rest/v1/calendars?select=data,updated_at&user_id=eq.' + good.uid);
    assert.deepEqual(rows, []);
    assert.notEqual(client.session().token, 'expired-token', 'a fresh token should have replaced the expired one');
  } finally { await mock.stop(); }
});

test('connectProject stores the project only after it actually verifies', async () => {
  const mock = await startMockSupabase();
  try {
    const storage = new MemoryStorage();
    const client = new SupabaseClient({ storage, fetchImpl: fetch });
    // A wrong key must not be persisted.
    const bad = await client.connectProject(mock.url, 'wrong-key');
    assert.equal(bad.ok, false);
    assert.equal(storage.getItem('bubbles.sbUrl'), null);

    const good = await client.connectProject(mock.url, mock.anonKey);
    assert.equal(good.ok, true);
    assert.equal(storage.getItem('bubbles.sbUrl'), mock.url);
    assert.equal(storage.getItem('bubbles.sbKey'), mock.anonKey);
  } finally { await mock.stop(); }
});

test('authenticate() works with a receiver-sensitive fetch, like a real browser\'s', async () => {
  // Real browsers throw "TypeError: Illegal invocation" if fetch is called with a `this`
  // other than window/undefined (e.g. `this.fetchImpl(...)` where fetchImpl was stored as a
  // bare reference to the global fetch). Node's fetch doesn't enforce this, so a plain mock
  // wouldn't have caught a regression here — this one does, by throwing exactly like a browser
  // would if SupabaseClient ever goes back to invoking fetchImpl as one of its own methods.
  function strictFetch(...args) {
    if (this !== undefined) throw new TypeError('Illegal invocation');
    return fetch(...args);
  }
  const mock = await startMockSupabase();
  try {
    const storage = new MemoryStorage();
    storage.setItem('bubbles.sbUrl', mock.url);
    storage.setItem('bubbles.sbKey', mock.anonKey);
    const client = new SupabaseClient({ storage, fetchImpl: strictFetch });
    const r = await client.authenticate('up', 'receiver@example.com', 'pw123456');
    assert.equal(r.ok, true, r.msg);
    assert.ok(client.session().token);

    // sbFetch (used by push/pull) also calls this.fetchImpl — cover it too.
    const pushRes = await client.push(['fixed'], { fixed: [] });
    assert.equal(pushRes.ok, true, pushRes.msg);
  } finally { await mock.stop(); }
});

test('connCode / decodeCode round-trip project details for a second device', async () => {
  const mock = await startMockSupabase();
  try {
    const client = clientFor(mock);
    const code = client.connCode();
    assert.ok(code.length > 0);
    const decoded = SupabaseClient.decodeCode(code);
    assert.equal(decoded.url, mock.url);
    assert.equal(decoded.key, mock.anonKey);
  } finally { await mock.stop(); }
});
