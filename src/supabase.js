// Real, working Supabase connection: everything here does an actual network round trip.
// This replaces the design-canvas prototype, which only *looked* like it connected —
// .dc.html files are Claude Design mockups, not runnable pages, so nothing ever really
// hit the network there. Every function below is exercised against a live HTTP server
// in tests/supabase.test.mjs.

/** In-memory fallback so this module also works outside a browser (tests, SSR). */
class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}

const defaultStorage = () => (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : new MemoryStorage();

/**
 * Turn whatever the user pasted into a real Project URL, or reject it with a specific reason.
 * Pure — no network — so the obvious mistakes (dashboard link, npm snippet, bare host) are
 * caught before we ever make a request.
 */
export function normalizeUrl(rawUrl) {
  const raw = String(rawUrl || '').trim();
  if (!raw) return { ok: false, msg: 'The project URL is missing.' };
  if (/supabase\.com\/dashboard/i.test(raw)) {
    return { ok: false, msg: 'That is the dashboard address, not the Project URL. The one you need is in Project Settings → API and looks like https://xxxx.supabase.co.' };
  }
  if (/npm|install|createclient|import\s|from\s+['"]/i.test(raw)) {
    return { ok: false, msg: 'That looks like a code snippet, not a URL. Paste only the Project URL from Project Settings → API.' };
  }
  let url = raw.replace(/\s+/g, '');
  // Default to https (the cloud case). An explicit http:// is left alone — self-hosted /
  // local-dev Supabase (`supabase start`) serves plain http on localhost, and forcing https
  // there would just make local development impossible.
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  let parsed;
  try { parsed = new URL(url); } catch (e) { return { ok: false, msg: 'That does not look like a valid URL.' }; }
  url = parsed.protocol + '//' + parsed.host;
  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(parsed.host);
  if (!isLocalHost && !/^https:\/\/[^\s/]+\.[^\s/]+$/.test(url)) {
    return { ok: false, msg: 'That does not look like a Project URL. It is the https://xxxx.supabase.co line in Project Settings → API.' };
  }
  return { ok: true, url };
}

/** One real round trip: proves the host resolves, the key is accepted, and the table exists. */
export async function checkProject(url, key, fetchImpl = (...args) => fetch(...args)) {
  const cleanKey = String(key || '').replace(/\s+/g, '');
  if (!cleanKey) return { ok: false, msg: 'The anon key is missing.' };
  if (/npm|install|createclient/i.test(cleanKey)) {
    return { ok: false, msg: 'That looks like a code snippet, not a key. Paste only the anon public key from Project Settings → API.' };
  }
  let res;
  try {
    res = await fetchImpl(url + '/rest/v1/calendars?select=user_id&limit=1', {
      headers: { apikey: cleanKey, Authorization: 'Bearer ' + cleanKey, 'content-type': 'application/json' },
    });
  } catch (e) {
    return { ok: false, msg: 'Could not reach ' + url + '. Check the Project URL — it looks like https://xxxx.supabase.co.' };
  }
  if (res.ok) return { ok: true };
  let body = {};
  try { body = await res.json(); } catch (e) { /* non-JSON error body */ }
  const text = ((body.message || body.msg || body.hint || '') + ' ' + (body.code || '')).toLowerCase();
  if (res.status === 401 || res.status === 403 || /invalid.*api key|jwt/.test(text)) {
    return { ok: false, msg: 'That anon key was rejected. Copy the "anon public" key from Settings → API, not the service role key or the project password.' };
  }
  if (res.status === 404 || /pgrst205|could not find the table|does not exist/.test(text)) {
    return { ok: false, msg: 'The key works but the "calendars" table is missing. Run the setup SQL in the SQL editor, then connect again.' };
  }
  return { ok: false, msg: 'The project answered with an error: ' + (body.message || body.msg || ('HTTP ' + res.status)) };
}

export const SETUP_SQL = `create table calendars (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz default now()
);
alter table calendars enable row level security;
create policy "own row" on calendars
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);`;

export class SupabaseClient {
  constructor({ storage, fetchImpl = (...args) => fetch(...args), onSessionChange } = {}) {
    this.storage = storage || defaultStorage();
    this.fetchImpl = fetchImpl;
    this.onSessionChange = onSessionChange || (() => {});
    this._session = undefined; // undefined = "not loaded from storage yet"; null = "no session"
  }

  conf() {
    try {
      const url = this.storage.getItem('bubbles.sbUrl');
      const key = this.storage.getItem('bubbles.sbKey');
      if (url && key) return { url, key };
    } catch (e) { /* storage blocked */ }
    return null;
  }

  hasProject() { return !!this.conf(); }

  session() {
    if (this._session !== undefined) return this._session;
    try { this._session = JSON.parse(this.storage.getItem('bubbles.session') || 'null'); }
    catch (e) { this._session = null; }
    return this._session;
  }

  saveSession(sess) {
    try {
      if (sess) this.storage.setItem('bubbles.session', JSON.stringify(sess));
      else this.storage.removeItem('bubbles.session');
    } catch (e) { /* ignore */ }
    this._session = sess;
    this.onSessionChange(sess);
  }

  /** Validate + store project details. The single entry point every "Connect" action calls. */
  async connectProject(rawUrl, rawKey) {
    const key = String(rawKey || '').replace(/\s+/g, '');
    if (!String(rawUrl || '').trim() || !key) return { ok: false, msg: 'Both the project URL and the anon key are needed.' };
    const norm = normalizeUrl(rawUrl);
    if (!norm.ok) return norm;
    const check = await checkProject(norm.url, key, this.fetchImpl);
    if (!check.ok) return check;
    try {
      this.storage.setItem('bubbles.sbUrl', norm.url);
      this.storage.setItem('bubbles.sbKey', key);
    } catch (e) {
      return { ok: false, msg: 'This browser will not let me store the project details.' };
    }
    return { ok: true, url: norm.url, key };
  }

  forgetProject() {
    ['bubbles.sbUrl', 'bubbles.sbKey', 'bubbles.session'].forEach((k) => { try { this.storage.removeItem(k); } catch (e) { /* ignore */ } });
    this._session = null;
  }

  /** One base64 string carrying project details to another device (Settings > setup code). */
  connCode() {
    const c = this.conf();
    if (!c) return '';
    try { return btoa(JSON.stringify({ u: c.url, k: c.key })); } catch (e) { return ''; }
  }

  static decodeCode(code) {
    try {
      const d = JSON.parse(atob(String(code || '').replace(/\s+/g, '')));
      if (!d || !d.u || !d.k) return null;
      return { url: d.u, key: d.k };
    } catch (e) { return null; }
  }

  async refreshSession() {
    const c = this.conf(), s = this.session();
    if (!c || !s || !s.refresh) return false;
    try {
      // `(0, this.fetchImpl)(...)` — not `this.fetchImpl(...)` — deliberately: a real
      // browser's native fetch throws "Illegal invocation" if called as someone else's method
      // (`this` becomes this SupabaseClient instance instead of window). The comma operator
      // forces an unqualified call so `this` inside fetch is undefined, which fetch accepts.
      const res = await (0, this.fetchImpl)(c.url + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: c.key },
        body: JSON.stringify({ refresh_token: s.refresh }),
      });
      if (!res.ok) return false;
      const j = await res.json();
      this.saveSession({ token: j.access_token, refresh: j.refresh_token, uid: (j.user && j.user.id) || s.uid, email: (j.user && j.user.email) || s.email });
      return true;
    } catch (e) { return false; }
  }

  async sbFetch(path, opts = {}) {
    const c = this.conf();
    if (!c) throw new Error('Project URL and key are missing.');
    const s = this.session();
    const headers = Object.assign({ 'content-type': 'application/json', apikey: c.key }, opts.headers || {});
    if (s && s.token) headers.Authorization = 'Bearer ' + s.token;
    const res = await (0, this.fetchImpl)(c.url + path, { method: opts.method || 'GET', headers, body: opts.body });
    if (res.status === 401 && !opts.retried && (await this.refreshSession())) {
      return this.sbFetch(path, { ...opts, retried: true });
    }
    if (!res.ok) {
      let d = '';
      try { const j = await res.json(); d = j.msg || j.message || j.error_description || j.hint || j.error || ''; } catch (e) { /* ignore */ }
      throw new Error(d || ('HTTP ' + res.status));
    }
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  }

  /** mode: 'in' (sign in) | 'up' (sign up) */
  async authenticate(mode, email, password) {
    const c = this.conf();
    if (!c) return { ok: false, msg: 'Connect a project first.' };
    if (!email || !password) return { ok: false, msg: 'Email and password are both needed.' };
    try {
      const path = mode === 'up' ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password';
      const res = await (0, this.fetchImpl)(c.url + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: c.key },
        body: JSON.stringify({ email, password }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.msg || j.message || j.error_description || 'rejected');
      if (!j.access_token) return { ok: true, needsConfirmation: true };
      this.saveSession({ token: j.access_token, refresh: j.refresh_token, uid: j.user.id, email: j.user.email });
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: 'Could not sign in: ' + e.message };
    }
  }

  signOut() { this.saveSession(null); }

  async pull(persistKeys) {
    const s = this.session();
    if (!s) return { ok: false, msg: 'Not signed in.' };
    try {
      const rows = await this.sbFetch('/rest/v1/calendars?select=data,updated_at&user_id=eq.' + s.uid);
      const row = rows && rows[0];
      if (!row || !row.data) return { ok: true, empty: true };
      const patch = {};
      persistKeys.forEach((k) => { if (row.data[k] !== undefined) patch[k] = row.data[k]; });
      return { ok: true, patch };
    } catch (e) {
      return { ok: false, msg: 'Could not load: ' + e.message };
    }
  }

  async push(persistKeys, state) {
    const s = this.session();
    if (!s) return { ok: false, msg: 'Not signed in.' };
    const data = {};
    persistKeys.forEach((k) => { data[k] = state[k]; });
    try {
      await this.sbFetch('/rest/v1/calendars', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ user_id: s.uid, data, updated_at: new Date().toISOString() }),
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: 'Could not save: ' + e.message };
    }
  }
}
