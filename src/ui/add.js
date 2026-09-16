import { esc } from '../dom.js';
import { toMin, parseDur, dateKey, addDays, CATS } from '../solver.js';

// Both forms are intentionally uncontrolled inputs (read at submit time, not wired to
// store.setState per keystroke). A store update triggers a full re-render of #root, which
// would destroy and recreate the <input> DOM nodes on every keystroke and throw focus/cursor
// position away — noticeable, real breakage the design-canvas prototype never had to deal
// with (it never ran as a real page). Reading values on submit avoids re-rendering the form
// at all while typing, which is also strictly less work per keystroke.

function dateOptions(today, selected) {
  const opts = [];
  for (let i = 0; i < 14; i++) {
    const d = addDays(dateKey(today), i);
    opts.push(`<option value="${d}" ${d === selected ? 'selected' : ''}>${d}${i === 0 ? ' (today)' : ''}</option>`);
  }
  return opts.join('');
}

export function render(state, solveRes, ctx) {
  const prefillDate = state.prefillDate || state.sel;
  const prefillStart = state.prefillStart;
  const startVal = prefillStart != null ? String(Math.floor(prefillStart / 60)).padStart(2, '0') + ':' + String(prefillStart % 60).padStart(2, '0') : '';

  return `
    <div class="grid-2">
      <div class="card">
        <div class="section-title">Something with a fixed time</div>
        <div class="field"><label>Title</label><input id="add-fixed-title" placeholder="Lecture, gym, call…"></div>
        <div class="field"><label>Day</label><select id="add-fixed-day">${dateOptions(ctx.now, prefillDate)}</select></div>
        <div class="two-col">
          <div class="field"><label>Start</label><input id="add-fixed-start" type="time" step="300" value="${startVal}"></div>
          <div class="field"><label>End</label><input id="add-fixed-end" type="time" step="300"></div>
        </div>
        <div class="btn-row" style="margin-bottom:12px">
          ${[30, 45, 60, 90].map((m) => `<button class="btn btn-ghost" data-act="fixed-quick-dur" data-min="${m}">${m}m</button>`).join('')}
        </div>
        <div id="add-fixed-status" class="status-line"></div>
        <button class="btn btn-primary" style="width:100%" data-act="submit-fixed">Add fixed event</button>
      </div>

      <div class="card">
        <div class="section-title">Something that just needs time</div>
        <div class="field"><label>Title</label><input id="add-bubble-title" placeholder="Study, job apps, gym…"></div>
        <div class="two-col">
          <div class="field"><label>Duration</label><input id="add-bubble-dur" placeholder="1h30, 90, an hour"></div>
          <div class="field"><label>Category</label>
            <select id="add-bubble-cat">${Object.keys(CATS).map((c) => `<option value="${c}">${c}</option>`).join('')}</select>
          </div>
        </div>
        <div class="btn-row" style="margin-bottom:12px">
          <button class="btn btn-ghost" id="add-bubble-type-divisible" data-act="bubble-type" data-type="divisible" style="flex:1;background:var(--primary);color:#fff">Can split</button>
          <button class="btn btn-ghost" id="add-bubble-type-solid" data-act="bubble-type" data-type="solid" style="flex:1">One sitting</button>
        </div>
        <div class="two-col">
          <div class="field" id="add-bubble-minchunk-wrap"><label>Min chunk</label><input id="add-bubble-minchunk" placeholder="30, 45m"></div>
          <div class="field"><label>Priority</label>
            <select id="add-bubble-priority">${[5, 4, 3, 2, 1].map((p) => `<option value="${p}" ${p === 3 ? 'selected' : ''}>${p}</option>`).join('')}</select>
          </div>
        </div>
        <div class="two-col">
          <div class="field"><label>Start from</label><select id="add-bubble-start-day">${dateOptions(ctx.now, dateKey(ctx.now))}</select></div>
          <div class="field"><label>Deadline (optional)</label><select id="add-bubble-deadline-day"><option value="">None</option>${dateOptions(ctx.now, '')}</select></div>
        </div>
        <div id="add-bubble-status" class="status-line"></div>
        <button class="btn btn-primary" style="width:100%" data-act="submit-bubble">Add bubble</button>
      </div>
    </div>
  `;
}

function setStatus(root, id, msg, ok) {
  const el = root.querySelector('#' + id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'status-line' + (ok === true ? ' ok' : ok === false ? ' bad' : '');
}

export const handlers = {
  'fixed-quick-dur': (ctx, t) => {
    const root = ctx.root;
    const startEl = root.querySelector('#add-fixed-start');
    const endEl = root.querySelector('#add-fixed-end');
    const start = toMin(startEl.value || '09:00');
    const min = +t.dataset.min;
    if (!startEl.value) startEl.value = '09:00';
    const end = start + min;
    endEl.value = String(Math.floor(end / 60) % 24).padStart(2, '0') + ':' + String(end % 60).padStart(2, '0');
  },
  'bubble-type': (ctx, t) => {
    const root = ctx.root;
    const type = t.dataset.type;
    root.querySelector('#add-bubble-type-divisible').style.cssText = type === 'divisible' ? 'flex:1;background:var(--primary);color:#fff' : 'flex:1';
    root.querySelector('#add-bubble-type-solid').style.cssText = type === 'solid' ? 'flex:1;background:var(--primary);color:#fff' : 'flex:1';
    root.querySelector('#add-bubble-type-divisible').dataset.active = type === 'divisible' ? '1' : '';
    root.querySelector('#add-bubble-type-solid').dataset.active = type === 'solid' ? '1' : '';
    root.querySelector('#add-bubble-minchunk-wrap').style.opacity = type === 'solid' ? '0.4' : '1';
  },
  'submit-fixed': (ctx) => {
    const root = ctx.root;
    const title = root.querySelector('#add-fixed-title').value.trim();
    const date = root.querySelector('#add-fixed-day').value;
    const start = toMin(root.querySelector('#add-fixed-start').value);
    const end = toMin(root.querySelector('#add-fixed-end').value);
    if (!title) return setStatus(root, 'add-fixed-status', 'Title is needed.', false);
    if (end <= start) return setStatus(root, 'add-fixed-status', 'End must be after start.', false);
    ctx.store.applyAction({ type: 'add_fixed', params: { title, date, start, end } });
    root.querySelector('#add-fixed-title').value = '';
    root.querySelector('#add-fixed-start').value = '';
    root.querySelector('#add-fixed-end').value = '';
    ctx.store.setState({ prefillStart: null, prefillDate: null });
    setStatus(root, 'add-fixed-status', 'Added "' + title + '".', true);
  },
  'submit-bubble': (ctx) => {
    const root = ctx.root;
    const title = root.querySelector('#add-bubble-title').value.trim();
    const total = parseDur(root.querySelector('#add-bubble-dur').value);
    const category = root.querySelector('#add-bubble-cat').value;
    const isSolid = root.querySelector('#add-bubble-type-solid').dataset.active === '1';
    const minChunk = parseDur(root.querySelector('#add-bubble-minchunk').value) || 30;
    const priority = +root.querySelector('#add-bubble-priority').value;
    const date = root.querySelector('#add-bubble-start-day').value;
    const deadlineDay = root.querySelector('#add-bubble-deadline-day').value;
    if (!title) return setStatus(root, 'add-bubble-status', 'Title is needed.', false);
    if (!total) return setStatus(root, 'add-bubble-status', 'Duration is needed — try "1h30" or "90".', false);
    const params = {
      title, category, date, total, type: isSolid ? 'solid' : 'divisible', priority,
      ...(isSolid ? {} : { minChunk: Math.min(minChunk, total) }),
      ...(deadlineDay ? { deadline: { date: deadlineDay, time: 1380 } } : {}),
    };
    ctx.store.applyAction({ type: 'add_bubble', params });
    root.querySelector('#add-bubble-title').value = '';
    root.querySelector('#add-bubble-dur').value = '';
    root.querySelector('#add-bubble-minchunk').value = '';
    setStatus(root, 'add-bubble-status', 'Added "' + title + '".', true);
  },
};
