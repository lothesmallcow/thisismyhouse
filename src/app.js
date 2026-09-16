import { Store, PERSIST_KEYS } from './state.js';
import { SupabaseClient } from './supabase.js';
import { parseLocalCommand } from './parser.js';
import { parseCommand } from './anthropic.js';
import { esc } from './dom.js';
import * as Day from './ui/day.js';
import * as Week from './ui/week.js';
import * as Add from './ui/add.js';
import * as Settings from './ui/settings.js';
import * as Sheet from './ui/sheet.js';

const root = document.getElementById('root');
const store = new Store();
const sb = new SupabaseClient();

const ctx = { store, sb, root, get now() { return new Date(); }, persistKeys: PERSIST_KEYS };

const PAGES = { day: Day, week: Week, add: Add, settings: Settings };
const CLICK_HANDLERS = { ...Day.handlers, ...Week.handlers, ...Add.handlers, ...Settings.handlers, ...Sheet.handlers, 'nav-goto': (c, t) => c.store.setState({ page: t.dataset.page }), 'cmd-run': runCommand };
const CHANGE_HANDLERS = { ...Settings.changeHandlers };

function greeting(now) {
  const h = now.getHours();
  if (h < 5) return 'Still up?';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

async function runCommand() {
  const input = root.querySelector('#cmd-input');
  const text = (input && input.value || '').trim();
  if (!text) return;
  const state = store.getState();
  let result;
  if (state.apiKey) {
    try {
      result = await parseCommand({ text, spendMode: state.modelMode, apiKey: state.apiKey });
    } catch (e) {
      result = parseLocalCommand(text, { today: ctx.now });
      result.reply = 'Claude call failed (' + e.message + ') — used the local parser instead. ' + (result.reply || '');
    }
  } else {
    result = parseLocalCommand(text, { today: ctx.now });
  }
  (result.actions || []).forEach((a) => store.applyAction(a));
  store.setState({ cmdStatus: result.reply || (result.actions.length ? 'Done.' : ''), cmdTone: result.actions.length ? 'ok' : 'muted' });
}

function renderHeader(state) {
  return `<div class="hdr">
    <div class="greet">${greeting(ctx.now)}</div>
    <div class="sub">${state.bubbles.filter((b) => b.status !== 'done').length} bubble(s) queued · ${state.fixed.filter((e) => !e.parentId).length} fixed event(s)</div>
    <div class="cmdbar">
      <input id="cmd-input" placeholder='Try: "gym every weekday at 7:30 to 8:30" or "I need 2h of study before friday"'>
      <button data-act="cmd-run">Run</button>
    </div>
    <div class="status-line ${state.cmdTone === 'ok' ? 'ok' : ''}">${esc(state.cmdStatus || '')}</div>
  </div>`;
}

function renderNav(state) {
  const tabs = [['day', 'Day'], ['week', 'Week'], ['add', 'Add'], ['settings', 'Settings']];
  return `<nav class="tabbar"><div class="tabbar-inner">
    ${tabs.map(([p, label]) => `<button class="${state.page === p ? 'active' : ''}" data-act="nav-goto" data-page="${p}">${label}</button>`).join('')}
  </div></nav>`;
}

function render() {
  const state = store.getState();
  const solveRes = store.solve({ now: ctx.now });
  const page = PAGES[state.page] || Day;
  root.innerHTML = `
    ${renderHeader(state)}
    ${page.render(state, solveRes, ctx)}
    ${Sheet.render(state, solveRes, ctx)}
    ${renderNav(state)}
  `;
}

root.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-act]');
  if (!t) return;
  const fn = CLICK_HANDLERS[t.dataset.act];
  if (fn) fn(ctx, t, ev);
});

root.addEventListener('change', (ev) => {
  const t = ev.target.closest('[data-act-change]');
  if (!t) return;
  const fn = CHANGE_HANDLERS[t.dataset.actChange];
  if (fn) fn(ctx, t, ev);
});

root.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && ev.target && ev.target.id === 'cmd-input') runCommand();
});

store.subscribe(render);
render();

// Keep the day strip's "now" marker and load bars fresh, and let the memoized solve()
// naturally recompute once a minute (see Store.solve) without re-doing work in between.
setInterval(render, 30000);
