import { esc } from '../dom.js';
import { fmt, toMin, dur } from '../solver.js';

export function render(state, solveRes, ctx) {
  const sh = state.sheet;
  if (!sh || !sh.open) return '';
  if (sh.kind === 'event') {
    const ev = state.fixed.find((e) => e.id === sh.id);
    if (!ev) return '';
    return `<div class="sheet-overlay" data-act="sheet-close-backdrop">
      <div class="sheet" data-stop-close="1">
        <div class="grab"></div>
        <div class="field"><label>Title</label><input id="sheet-title" value="${esc(ev.title)}"></div>
        <div class="two-col">
          <div class="field"><label>Start</label><input id="sheet-start" type="time" step="300" value="${fmt(ev.start)}"></div>
          <div class="field"><label>End</label><input id="sheet-end" type="time" step="300" value="${fmt(ev.end)}"></div>
        </div>
        <div class="btn-row">
          <button class="btn btn-danger" style="flex:1" data-act="sheet-delete-event" data-id="${ev.id}">Delete</button>
          <button class="btn btn-primary" style="flex:1" data-act="sheet-save-event" data-id="${ev.id}">Save</button>
        </div>
      </div>
    </div>`;
  }
  if (sh.kind === 'bubble') {
    const b = state.bubbles.find((x) => x.id === sh.id);
    if (!b) return '';
    return `<div class="sheet-overlay" data-act="sheet-close-backdrop">
      <div class="sheet" data-stop-close="1">
        <div class="grab"></div>
        <div style="font-weight:600;font-size:15px;margin-bottom:4px">${esc(b.title)}</div>
        <div class="muted" style="margin-bottom:12px">${esc(b.category)} · ${dur(b.remaining)} left of ${dur(b.total)} · ${b.type}</div>
        <div class="btn-row">
          <button class="btn btn-danger" style="flex:1" data-act="sheet-delete-bubble" data-id="${b.id}">Delete</button>
          <button class="btn btn-primary" style="flex:1" data-act="sheet-done-bubble" data-id="${b.id}">Mark done</button>
        </div>
      </div>
    </div>`;
  }
  return '';
}

export const handlers = {
  'sheet-close-backdrop': (ctx, t, ev) => { if (ev.target === t) ctx.store.setState({ sheet: { open: false } }); },
  'sheet-save-event': (ctx, t) => {
    const root = ctx.root;
    const title = root.querySelector('#sheet-title').value.trim();
    const start = toMin(root.querySelector('#sheet-start').value);
    const end = toMin(root.querySelector('#sheet-end').value);
    if (!title || end <= start) return;
    ctx.store.applyAction({ type: 'modify_event', params: { id: t.dataset.id, title, start, end } });
    ctx.store.setState({ sheet: { open: false } });
  },
  'sheet-delete-event': (ctx, t) => {
    ctx.store.applyAction({ type: 'delete_event', params: { id: t.dataset.id } });
    ctx.store.setState({ sheet: { open: false } });
  },
  'sheet-done-bubble': (ctx, t) => {
    ctx.store.applyAction({ type: 'mark_done', params: { id: t.dataset.id } });
    ctx.store.setState({ sheet: { open: false } });
  },
  'sheet-delete-bubble': (ctx, t) => {
    ctx.store.patchBubbles((bs) => bs.filter((b) => b.id !== t.dataset.id));
    ctx.store.setState({ sheet: { open: false } });
  },
};
