import { Store, PERSIST_KEYS } from './state.js';
import { SupabaseClient } from './supabase.js';
import { parseLocalCommand } from './parser.js';
import { parseCommand } from './anthropic.js';
import { esc } from './dom.js';
import { dateKey } from './solver.js';
import * as Day from './ui/day.js';
import * as Week from './ui/week.js';
import * as Add from './ui/add.js';
import * as Settings from './ui/settings.js';
import * as Sheet from './ui/sheet.js';

const root = document.getElementById('root');
const store = new Store();
const sb = new SupabaseClient();

const ctx = { store, sb, root, get now() { return new Date(); }, persistKeys: PERSIST_KEYS };

// Images attached to the command bar — per the design spec, "paste into the command bar or
// use the image button (max 4). Requires a Claude connection." Ephemeral, so it lives here
// rather than in Store: it must never be persisted or trigger a schedule recompute.
let cmdImages = [];
const MAX_CMD_IMAGES = 4;

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
      resolve({ mediaType: file.type || 'image/png', data: base64, previewUrl: dataUrl });
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}

async function addCmdImages(files) {
  const room = MAX_CMD_IMAGES - cmdImages.length;
  if (room <= 0) return;
  const picked = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, room);
  const added = await Promise.all(picked.map(fileToImage));
  cmdImages = cmdImages.concat(added);
  render();
}

const PAGES = { day: Day, week: Week, add: Add, settings: Settings };
const CLICK_HANDLERS = {
  ...Day.handlers, ...Week.handlers, ...Add.handlers, ...Settings.handlers, ...Sheet.handlers,
  'nav-goto': (c, t) => c.store.setState({ page: t.dataset.page }),
  'cmd-run': runCommand,
  'cmd-attach': (c) => c.root.querySelector('#cmd-image-input').click(),
  'cmd-remove-image': (c, t) => { cmdImages = cmdImages.filter((_, i) => i !== +t.dataset.index); render(); },
};
const CHANGE_HANDLERS = {
  ...Settings.changeHandlers,
  'cmd-image-file': (c, t) => { if (t.files && t.files.length) addCmdImages(t.files); t.value = ''; },
};

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
  const images = cmdImages;
  if (!text && !images.length) return;
  const state = store.getState();

  if (images.length && !state.apiKey) {
    store.setState({ cmdStatus: 'Images need a Claude connection — add your API key in Settings, or remove the image(s) and I\'ll read the text alone.', cmdTone: 'muted' });
    return;
  }

  let result;
  if (state.apiKey) {
    try {
      result = await parseCommand({ text, images, today: dateKey(ctx.now), spendMode: state.modelMode, apiKey: state.apiKey });
    } catch (e) {
      result = parseLocalCommand(text, { today: ctx.now });
      result.reply = 'Claude call failed (' + e.message + ') — used the local parser instead. ' + (result.reply || '');
    }
  } else {
    result = parseLocalCommand(text, { today: ctx.now });
  }
  (result.actions || []).forEach((a) => store.applyAction(a));
  cmdImages = [];
  if (input) input.value = '';
  store.setState({ cmdStatus: result.reply || (result.actions.length ? 'Done.' : ''), cmdTone: result.actions.length ? 'ok' : 'muted' });
}

function renderCmdImages() {
  if (!cmdImages.length) return '';
  return `<div class="cmd-images">
    ${cmdImages.map((img, i) => `<div class="cmd-image-thumb">
      <img src="${img.previewUrl}" alt="attached image ${i + 1}">
      <button type="button" data-act="cmd-remove-image" data-index="${i}" aria-label="Remove image">✕</button>
    </div>`).join('')}
  </div>`;
}

function renderHeader(state) {
  const canAttach = cmdImages.length < MAX_CMD_IMAGES;
  return `<div class="hdr">
    <div class="greet">${greeting(ctx.now)}</div>
    <div class="sub">${state.bubbles.filter((b) => b.status !== 'done').length} bubble(s) queued · ${state.fixed.filter((e) => !e.parentId).length} fixed event(s)</div>
    <div class="cmdbar">
      <textarea id="cmd-input" rows="1" placeholder='Try: "gym every weekday at 7:30 to 8:30" — or tap 📷 for a photo of a timetable'></textarea>
      <input type="file" id="cmd-image-input" accept="image/*" multiple class="visually-hidden" data-act-change="cmd-image-file">
      <button type="button" class="cmd-attach-btn" data-act="cmd-attach" title="Attach a photo (needs a Claude connection)" ${canAttach ? '' : 'disabled'}>📷</button>
      <button data-act="cmd-run">Run</button>
    </div>
    ${renderCmdImages()}
    <div class="status-line ${state.cmdTone === 'ok' ? 'ok' : ''}">${esc(state.cmdStatus || '')}</div>
  </div>`;
}

function renderNav(state) {
  const tabs = [['day', 'Day'], ['week', 'Week'], ['add', 'Add'], ['settings', 'Settings']];
  return `<nav class="tabbar"><div class="tabbar-inner">
    ${tabs.map(([p, label]) => `<button class="${state.page === p ? 'active' : ''}" data-act="nav-goto" data-page="${p}">${label}</button>`).join('')}
  </div></nav>`;
}

const NO_SELECTION_RANGE_TYPES = new Set(['number', 'email', 'date', 'time', 'month', 'week', 'color', 'range']);

// The whole page is rebuilt on every render (a store change, or the 30s clock tick below),
// which would otherwise silently throw away anything the user is mid-typing anywhere in the
// app — command bar, an Add-page field, a Settings field — the instant an unrelated bit of
// state changes. Save and restore the focused field's value/cursor/selection across the rebuild.
function render() {
  const active = document.activeElement;
  let restore = null;
  if (active && active.id && root.contains(active) && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
    restore = { id: active.id, value: active.value, type: active.type, selStart: active.selectionStart, selEnd: active.selectionEnd };
  }

  const state = store.getState();
  const solveRes = store.solve({ now: ctx.now });
  const page = PAGES[state.page] || Day;
  root.innerHTML = `
    ${renderHeader(state)}
    ${page.render(state, solveRes, ctx)}
    ${Sheet.render(state, solveRes, ctx)}
    ${renderNav(state)}
  `;

  if (restore) {
    const el = root.querySelector('#' + CSS.escape(restore.id));
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      el.value = restore.value;
      el.focus();
      if (restore.selStart != null && !NO_SELECTION_RANGE_TYPES.has(restore.type)) {
        try { el.setSelectionRange(restore.selStart, restore.selEnd); } catch (e) { /* not all input types support it */ }
      }
    }
  }
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
  // cmd-input is a <textarea> (not <input>) so Safari will surface image data on paste —
  // plain single-line text inputs silently refuse non-text clipboard content in WebKit, which
  // is why "paste an image" could look like it does nothing. Enter still submits; Shift+Enter
  // still inserts a newline, same as any chat-style box.
  if (ev.key === 'Enter' && !ev.shiftKey && ev.target && ev.target.id === 'cmd-input') {
    ev.preventDefault();
    runCommand();
  }
});

root.addEventListener('paste', (ev) => {
  if (!ev.target || ev.target.id !== 'cmd-input') return;
  const files = Array.from(ev.clipboardData?.files || []).filter((f) => f.type.startsWith('image/'));
  if (files.length) { ev.preventDefault(); addCmdImages(files); }
});

store.subscribe(render);
render();

// Keep the day strip's "now" marker and load bars fresh, and let the memoized solve()
// naturally recompute once a minute (see Store.solve) without re-doing work in between.
setInterval(render, 30000);
