// Minimal stand-in for a Supabase project's REST + Auth endpoints, just enough surface
// to prove src/supabase.js does real, correct HTTP against something that behaves like
// PostgREST/GoTrue (right headers, right status codes, right shapes) — not a smoke test
// against a canvas mockup that was never wired to a network at all.
import http from 'node:http';
import crypto from 'node:crypto';

const HAS_TABLE = 'has-table';
const NO_TABLE = 'no-table';

export function startMockSupabase({ anonKey = 'anon-key-123', tableState = HAS_TABLE } = {}) {
  const users = new Map(); // email -> { id, password }
  const tokens = new Map(); // access token -> { uid, email }
  const refreshTokens = new Map(); // refresh token -> { uid, email }
  const rows = new Map(); // user_id -> { data, updated_at }

  const issueSession = (uid, email) => {
    const access = 'access-' + crypto.randomBytes(8).toString('hex');
    const refresh = 'refresh-' + crypto.randomBytes(8).toString('hex');
    tokens.set(access, { uid, email });
    refreshTokens.set(refresh, { uid, email });
    return { access_token: access, refresh_token: refresh, user: { id: uid, email } };
  };

  const server = http.createServer(async (req, res) => {
    // Real Supabase projects send permissive CORS headers so supabase-js (and this app) can
    // call them directly from a browser. Mirror that here so a browser-driven check against
    // this mock behaves like the real thing, not just the CORS-exempt Node fetch used in tests.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,content-type,prefer');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

    const u = new URL(req.url, 'http://localhost');
    const apikey = req.headers['apikey'];
    const send = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(body === undefined ? '' : JSON.stringify(body));
    };
    const readBody = () => new Promise((resolve) => {
      let buf = '';
      req.on('data', (c) => { buf += c; });
      req.on('end', () => { try { resolve(buf ? JSON.parse(buf) : {}); } catch (e) { resolve({}); } });
    });

    if (apikey !== anonKey) return send(401, { message: 'Invalid API key' });

    if (u.pathname === '/rest/v1/calendars' && req.method === 'GET') {
      if (tableState === NO_TABLE) return send(404, { message: 'Could not find the table \'public.calendars\'', code: 'PGRST205' });
      const userId = (u.searchParams.get('user_id') || '').replace(/^eq\./, '');
      if (!userId) return send(200, []); // reachability check from checkProject — no filter, no auth needed
      const auth = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
      if (!tokens.has(auth)) return send(401, { message: 'JWT expired' });
      const row = rows.get(userId);
      return send(200, row ? [{ data: row.data, updated_at: row.updated_at }] : []);
    }

    if (u.pathname === '/rest/v1/calendars' && req.method === 'POST') {
      const auth = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
      const sess = tokens.get(auth);
      if (!sess) return send(401, { message: 'JWT expired or invalid' });
      const body = await readBody();
      rows.set(body.user_id, { data: body.data, updated_at: body.updated_at });
      return send(201, [{ user_id: body.user_id }]);
    }

    if (u.pathname === '/auth/v1/signup' && req.method === 'POST') {
      const body = await readBody();
      if (users.has(body.email)) return send(400, { msg: 'User already registered' });
      const id = crypto.randomUUID();
      users.set(body.email, { id, password: body.password });
      const session = issueSession(id, body.email);
      return send(200, session);
    }

    if (u.pathname === '/auth/v1/token' && u.searchParams.get('grant_type') === 'password' && req.method === 'POST') {
      const body = await readBody();
      const user = users.get(body.email);
      if (!user || user.password !== body.password) return send(400, { error_description: 'Invalid login credentials' });
      return send(200, issueSession(user.id, body.email));
    }

    if (u.pathname === '/auth/v1/token' && u.searchParams.get('grant_type') === 'refresh_token' && req.method === 'POST') {
      const body = await readBody();
      const entry = refreshTokens.get(body.refresh_token);
      if (!entry) return send(400, { error_description: 'Invalid refresh token' });
      refreshTokens.delete(body.refresh_token);
      return send(200, issueSession(entry.uid, entry.email));
    }

    send(404, { message: 'not found in mock' });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        anonKey,
        users, tokens, refreshTokens, rows,
        stop: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

export const TABLE_STATES = { HAS_TABLE, NO_TABLE };
