import { esc } from '../dom.js';
import { SETUP_SQL, SupabaseClient } from '../supabase.js';
import { checkAnthropicKey } from '../anthropic.js';
import { toMin, fmt } from '../solver.js';

const DOW_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function statusLine(id, msg, ok) {
  return `<div id="${id}" class="status-line${ok === true ? ' ok' : ok === false ? ' bad' : ''}">${esc(msg || '')}</div>`;
}

function renderWeek(state) {
  const rows = [0, 1, 2, 3, 4, 5, 6].map((d) => `
    <div style="display:grid;grid-template-columns:38px 1fr;align-items:center;margin-bottom:6px;gap:8px">
      <div style="font-size:12px">${DOW_FULL[d]}</div>
      <div style="display:flex;gap:6px">
        <input type="time" step="300" value="${fmt(state.weekWindows[d].start)}" data-act-change="week-start" data-dow="${d}" style="border:1px solid rgba(28,26,23,0.12);border-radius:9px;padding:7px;font-size:12px;width:118px">
        <input type="time" step="300" value="${fmt(state.weekWindows[d].end)}" data-act-change="week-end" data-dow="${d}" style="border:1px solid rgba(28,26,23,0.12);border-radius:9px;padding:7px;font-size:12px;width:118px">
      </div>
    </div>`).join('');
  return `<div class="panel" style="margin-bottom:14px">
    <div class="section-title">Your week</div>
    ${rows}
    <div class="btn-row">
      <button class="btn btn-ghost" data-act="week-copy-monday">Copy Monday everywhere</button>
      <button class="btn btn-ghost" data-act="week-slow-weekends">Slow weekends</button>
    </div>
  </div>`;
}

function renderBuffers(state) {
  const b = state.buf;
  return `<div class="panel" style="margin-bottom:14px">
    <div class="section-title">Breathing room</div>
    <div class="field"><label>Buffer after a fixed event (min)</label><input type="number" value="${b.afterEvent}" data-act-change="buf-afterEvent"></div>
    <div class="field"><label>Buffer before a fixed event (min)</label><input type="number" value="${b.beforeEvent}" data-act-change="buf-beforeEvent"></div>
    <div class="field"><label>Smallest gap worth using (min)</label><input type="number" value="${b.minUsable}" data-act-change="buf-minUsable"></div>
  </div>`;
}

function renderDisplay(state) {
  return `<div class="panel" style="margin-bottom:14px">
    <div class="section-title">How it looks</div>
    <div class="btn-row" style="margin-bottom:10px">
      ${['compact', 'comfortable', 'roomy'].map((d) => `<button class="btn ${state.density === d ? 'btn-primary' : 'btn-ghost'}" data-act="set-density" data-density="${d}">${d}</button>`).join('')}
    </div>
    <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:10px">
      <input type="checkbox" ${state.hints ? 'checked' : ''} data-act-change="toggle-hints"> Show gap hints
    </label>
    <div class="muted" style="margin-bottom:10px">Everything is stored in this browser (localStorage). Nothing leaves your device unless you connect a project below.</div>
    <button class="btn btn-danger" data-act="clear-all">Clear all local data</button>
  </div>`;
}

function renderSupabase(state, sb) {
  const conf = sb.conf();
  const session = sb.session();
  const draftUrl = state.sbUrlDraft ?? '';
  const draftKey = state.sbKeyDraft ?? '';

  if (session) {
    return `<div class="panel" style="margin-bottom:14px">
      <div class="section-title">Account &amp; sync</div>
      <div class="muted">Signed in as <strong>${esc(session.email)}</strong> on <span class="mono">${esc(conf.url)}</span>.</div>
      <div class="btn-row" style="margin-top:10px">
        <button class="btn btn-ghost" data-act="sync-now">Save to account</button>
        <button class="btn btn-ghost" data-act="pull-now">Load from account</button>
      </div>
      <div class="btn-row" style="margin-top:8px">
        <button class="btn btn-ghost" data-act="copy-code">${state.codeCopied ? 'Copied!' : 'Copy setup code for another device'}</button>
        <button class="btn btn-danger" data-act="sign-out">Sign out</button>
      </div>
      ${statusLine('sb-status', state.syncMsg, state.syncOk === 'ok' ? true : state.syncOk === 'bad' ? false : null)}
    </div>`;
  }

  return `<div class="panel" style="margin-bottom:14px">
    <div class="section-title">Account &amp; sync</div>
    <div class="muted" style="margin-bottom:10px">For your calendar to follow you between devices it needs somewhere to live. Connect a free Supabase project — it stays yours.</div>
    ${conf ? `<div class="muted" style="margin-bottom:10px">Project connected: <span class="mono">${esc(conf.url)}</span>. Sign in or sign up below.</div>` : `
    <div class="field"><label>Project URL</label><input id="sb-url" placeholder="https://xxxx.supabase.co" value="${esc(draftUrl)}" class="mono"></div>
    <div class="field"><label>Anon public key</label><input id="sb-key" type="password" placeholder="anon public key" value="${esc(draftKey)}" class="mono"></div>
    <div class="btn-row"><button class="btn btn-ghost" data-act="save-sb">Verify project</button></div>
    <div class="hint-box">1. Open <a href="https://supabase.com/dashboard" target="_blank" rel="noopener">supabase.com/dashboard</a> and create a free project.<br>
    2. SQL Editor → paste the snippet below → Run.<br>
    3. Project Settings → API → copy the Project URL and the anon public key into the fields above.</div>
    <div class="two-col" style="align-items:center;margin-top:8px">
      <button class="btn btn-ghost" data-act="copy-sql">${state.sqlCopied ? 'Copied!' : 'Copy setup SQL'}</button>
    </div>
    `}
    <div class="field" style="margin-top:10px"><label>Email</label><input id="sb-email" value="${esc(state.authEmail || '')}"></div>
    <div class="field"><label>Password</label><input id="sb-pw" type="password" value="${esc(state.authPw || '')}"></div>
    <div class="btn-row">
      <button class="btn btn-primary" data-act="sign-in" style="flex:1">Sign in</button>
      <button class="btn btn-ghost" data-act="sign-up" style="flex:1">Create account</button>
    </div>
    ${!conf ? `<div class="btn-row" style="margin-top:8px"><button class="btn btn-primary" style="width:100%" data-act="connect-and-signin">Connect + sign in (one step)</button></div>` : ''}
    <div class="field" style="margin-top:10px"><label>Setup code from another device</label><input id="sb-code" value="${esc(state.codeDraft || '')}"></div>
    <div class="btn-row"><button class="btn btn-ghost" data-act="use-code">Use code</button></div>
    ${statusLine('sb-status', state.syncMsg, state.syncOk === 'ok' ? true : state.syncOk === 'bad' ? false : null)}
  </div>`;
}

function renderClaude(state) {
  return `<div class="panel" style="margin-bottom:14px">
    <div class="section-title">Claude connection</div>
    <div class="muted" style="margin-bottom:10px">Powers free-form commands and the scheduling advisor. Without a key, the local parser still handles common phrasings for free.</div>
    <div class="field"><label>API key</label><input id="anthropic-key" type="password" placeholder="sk-ant-…" value="${esc(state.keyDraft ?? state.apiKey ?? '')}" class="mono"></div>
    <div class="field"><label>Spend mode</label>
      <select id="anthropic-mode">${['economy', 'balanced', 'best'].map((m) => `<option value="${m}" ${state.modelMode === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" data-act="save-anthropic-key">Save &amp; verify key</button>
      ${state.apiKey ? '<button class="btn btn-danger" data-act="clear-anthropic-key">Remove key</button>' : ''}
    </div>
    ${statusLine('anthropic-status', state.anthropicMsg, state.anthropicOk)}
  </div>`;
}

function renderCalendars() {
  return `<div class="panel">
    <div class="section-title">Connected calendars</div>
    <div class="muted">Google and Apple calendar sync are planned but not implemented yet — the toggles below do nothing.</div>
    <div class="btn-row" style="margin-top:10px">
      <button class="btn btn-ghost" disabled style="opacity:0.5;cursor:not-allowed">Google (planned)</button>
      <button class="btn btn-ghost" disabled style="opacity:0.5;cursor:not-allowed">Apple (planned)</button>
    </div>
  </div>`;
}

export function render(state, solveRes, ctx) {
  return `<div class="grid-2">
    <div>${renderWeek(state)}${renderBuffers(state)}${renderDisplay(state)}</div>
    <div>${renderSupabase(state, ctx.sb)}${renderClaude(state)}${renderCalendars()}</div>
  </div>`;
}

async function connectFlow(ctx, root) {
  const urlEl = root.querySelector('#sb-url');
  const keyEl = root.querySelector('#sb-key');
  const url = urlEl ? urlEl.value : '';
  const key = keyEl ? keyEl.value : '';
  ctx.store.setState({ syncMsg: 'Checking the project…', syncOk: 'busy' });
  const r = await ctx.sb.connectProject(url, key);
  ctx.store.setState({ syncMsg: r.ok ? 'Project verified. Sign in or create an account.' : r.msg, syncOk: r.ok ? true : false });
  return r;
}

async function authFlow(ctx, root, mode) {
  const email = root.querySelector('#sb-email').value.trim();
  const pw = root.querySelector('#sb-pw').value;
  ctx.store.setState({ syncMsg: mode === 'up' ? 'Creating your account…' : 'Signing in…', syncOk: 'busy' });
  const r = await ctx.sb.authenticate(mode, email, pw);
  if (!r.ok) return ctx.store.setState({ syncMsg: r.msg, syncOk: false });
  if (r.needsConfirmation) return ctx.store.setState({ syncMsg: 'Account created. Confirm the email Supabase sent you, then sign in.', syncOk: true });
  const pull = await ctx.sb.pull(ctx.persistKeys);
  if (pull.ok && pull.patch) ctx.store.setState(pull.patch);
  ctx.store.setState({ syncMsg: pull.ok && pull.empty ? 'Signed in. This device will seed your account on next save.' : 'Signed in.', syncOk: true, authPw: '' });
}

export const handlers = {
  'save-sb': (ctx) => connectFlow(ctx, ctx.root),
  'connect-and-signin': async (ctx) => {
    const root = ctx.root;
    if (!root.querySelector('#sb-email').value.trim() || !root.querySelector('#sb-pw').value) {
      return ctx.store.setState({ syncMsg: 'Fill in your email and password too.', syncOk: false });
    }
    const r = await connectFlow(ctx, root);
    if (r.ok) await authFlow(ctx, root, 'in');
  },
  'sign-in': (ctx) => authFlow(ctx, ctx.root, 'in'),
  'sign-up': (ctx) => authFlow(ctx, ctx.root, 'up'),
  'sign-out': (ctx) => { ctx.sb.signOut(); ctx.store.setState({ syncMsg: 'Signed out.', syncOk: null }); },
  'sync-now': async (ctx) => {
    ctx.store.setState({ syncMsg: 'Saving…', syncOk: 'busy' });
    const r = await ctx.sb.push(ctx.persistKeys, ctx.store.getState());
    ctx.store.setState({ syncMsg: r.ok ? 'Saved to your account.' : r.msg, syncOk: r.ok });
  },
  'pull-now': async (ctx) => {
    ctx.store.setState({ syncMsg: 'Loading…', syncOk: 'busy' });
    const r = await ctx.sb.pull(ctx.persistKeys);
    if (r.ok && r.patch) ctx.store.setState(r.patch);
    ctx.store.setState({ syncMsg: r.ok ? 'Calendar loaded from your account.' : r.msg, syncOk: r.ok });
  },
  'copy-code': async (ctx) => {
    const code = ctx.sb.connCode();
    if (!code) return ctx.store.setState({ syncMsg: 'Nothing to copy yet.', syncOk: false });
    try { await navigator.clipboard.writeText(code); ctx.store.setState({ codeCopied: true }); setTimeout(() => ctx.store.setState({ codeCopied: false }), 2000); }
    catch (e) { ctx.store.setState({ syncMsg: 'Copy blocked — code: ' + code, syncOk: false }); }
  },
  'use-code': async (ctx) => {
    const raw = ctx.root.querySelector('#sb-code').value;
    const decoded = SupabaseClient.decodeCode(raw);
    if (!decoded) return ctx.store.setState({ syncMsg: 'That code is not readable.', syncOk: false });
    ctx.store.setState({ syncMsg: 'Checking the code…', syncOk: 'busy' });
    const r = await ctx.sb.connectProject(decoded.url, decoded.key);
    ctx.store.setState({ syncMsg: r.ok ? 'Connected from the code. Sign in with your email and password.' : r.msg, syncOk: r.ok, codeDraft: r.ok ? '' : raw });
  },
  'copy-sql': async (ctx) => {
    try { await navigator.clipboard.writeText(SETUP_SQL); ctx.store.setState({ sqlCopied: true }); setTimeout(() => ctx.store.setState({ sqlCopied: false }), 2200); }
    catch (e) { /* clipboard blocked; the hint box above still shows how to get there manually */ }
  },
  'save-anthropic-key': async (ctx) => {
    const key = ctx.root.querySelector('#anthropic-key').value.trim();
    const mode = ctx.root.querySelector('#anthropic-mode').value;
    ctx.store.setState({ modelMode: mode, anthropicMsg: 'Checking…', anthropicOk: null });
    if (!key) return ctx.store.setState({ apiKey: '', anthropicMsg: 'Key removed.', anthropicOk: true });
    const r = await checkAnthropicKey(key);
    ctx.store.setState({ apiKey: r.ok ? key : '', anthropicMsg: r.ok ? 'Key verified.' : r.msg, anthropicOk: r.ok });
  },
  'clear-anthropic-key': (ctx) => ctx.store.setState({ apiKey: '', anthropicMsg: 'Key removed.', anthropicOk: true }),
  'set-density': (ctx, t) => ctx.store.setState({ density: t.dataset.density }),
  'clear-all': (ctx) => {
    if (!confirm('Delete everything stored in this browser? This cannot be undone.')) return;
    ctx.store.setState({ fixed: [], bubbles: [] });
  },
  'week-copy-monday': (ctx) => ctx.store.setState((s) => {
    const src = s.weekWindows[1], next = {};
    [0, 1, 2, 3, 4, 5, 6].forEach((d) => { next[d] = { ...src }; });
    return { weekWindows: next };
  }),
  'week-slow-weekends': (ctx) => ctx.store.setState((s) => ({ weekWindows: { ...s.weekWindows, 0: { start: 600, end: 1380 }, 6: { start: 600, end: 1380 } } })),
};

export const changeHandlers = {
  'week-start': (ctx, t) => ctx.store.setState((s) => ({ weekWindows: { ...s.weekWindows, [t.dataset.dow]: { ...s.weekWindows[t.dataset.dow], start: toMin(t.value) } } })),
  'week-end': (ctx, t) => ctx.store.setState((s) => ({ weekWindows: { ...s.weekWindows, [t.dataset.dow]: { ...s.weekWindows[t.dataset.dow], end: toMin(t.value) } } })),
  'buf-afterEvent': (ctx, t) => ctx.store.setState((s) => ({ buf: { ...s.buf, afterEvent: +t.value || 0 } })),
  'buf-beforeEvent': (ctx, t) => ctx.store.setState((s) => ({ buf: { ...s.buf, beforeEvent: +t.value || 0 } })),
  'buf-minUsable': (ctx, t) => ctx.store.setState((s) => ({ buf: { ...s.buf, minUsable: +t.value || 0 } })),
  'toggle-hints': (ctx, t) => ctx.store.setState({ hints: t.checked }),
};
