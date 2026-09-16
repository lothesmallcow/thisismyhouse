import { esc, dayLabel, isToday } from '../dom.js';
import { fmt, dur, lanes, addDays, dateKey, CATS } from '../solver.js';

const PPM = { compact: 0.7, comfortable: 1.1, roomy: 1.6 };

function block(item, laneInfo, originMin, ppm, extraClass, style) {
  const top = (item.start - originMin) * ppm;
  const height = Math.max(2, (item.end - item.start) * ppm);
  const widthPct = 100 / laneInfo.cols;
  const leftPct = laneInfo.col * widthPct;
  return `top:${top}px;height:${height}px;left:calc(${leftPct}% + 2px);width:calc(${widthPct}% - 4px);${style || ''}`;
}

function renderTimeline(state, solveRes, date, now) {
  const dow = new Date(...date.split('-').map((n, i) => (i === 1 ? n - 1 : n))).getDay();
  const window = state.weekWindows[dow] || { start: 480, end: 1380 };
  const ppm = PPM[state.density] || PPM.comfortable;
  const gapsInfo = solveRes.gapsByDate[date] || { usable: [], bands: [] };

  const dayEvents = state.fixed.filter((e) => e.date === date && !e.parentId);
  const subtasks = state.fixed.filter((e) => e.date === date && e.parentId);
  const eventLanes = lanes(dayEvents.map((e) => ({ start: e.start, end: e.end })));

  const placements = solveRes.placements.filter((p) => p.date === date);
  const placementLanes = lanes(placements.map((p) => ({ start: p.start, end: p.end })));

  // Items outside the day window (an early gym session before the window opens, say) must
  // still render inside the timeline's own bounds — otherwise they land above/below the card
  // and can end up unreachable under the sticky header. Widen the range to fit everything.
  const allTimes = [window.start, window.end, ...dayEvents.map((e) => e.start), ...dayEvents.map((e) => e.end), ...placements.map((p) => p.start), ...placements.map((p) => p.end)];
  const rangeStart = Math.min(...allTimes);
  const rangeEnd = Math.max(...allTimes);

  const hourRows = [];
  for (let m = Math.floor(rangeStart / 60) * 60; m < rangeEnd; m += 60) {
    const outOfWindow = m < window.start || m >= window.end;
    hourRows.push(`<div class="hour-row" style="height:${60 * ppm}px${outOfWindow ? ';background:repeating-linear-gradient(135deg,rgba(28,26,23,0.03),rgba(28,26,23,0.03) 6px,transparent 6px,transparent 12px)' : ''}"><div class="hour-label">${fmt(m)}</div><div class="hour-track" data-hour="${m}"></div></div>`);
  }

  const totalHeight = (Math.ceil(rangeEnd / 60) * 60 - Math.floor(rangeStart / 60) * 60) * ppm;
  const originMin = Math.floor(rangeStart / 60) * 60;

  const eventBlocks = dayEvents.map((e, i) => {
    const style = block(e, eventLanes[i], originMin, ppm);
    const subs = subtasks.filter((s) => s.parentId === e.id);
    return `<div class="block" style="position:absolute;${style}" data-act="open-event" data-id="${esc(e.id)}">
      <span>${esc(e.title)}${subs.length ? ` <span class="badge" style="background:rgba(247,245,241,0.25);color:#fff">${subs.length} sub</span>` : ''}</span>
    </div>`;
  }).join('');

  const subtaskBlocks = subtasks.map((s) => {
    const style = block(s, { col: 0, cols: 1 }, originMin, ppm);
    return `<div class="block subtask" style="position:absolute;${style}" data-act="open-event" data-id="${esc(s.id)}">${esc(s.title)}</div>`;
  }).join('');

  const bubbleBlocks = placements.map((p, i) => {
    const b = state.bubbles.find((x) => x.id === p.bubbleId);
    if (!b) return '';
    const hue = b.status === 'overflow' ? 350 : (CATS[b.category] ?? 40);
    const style = block(p, placementLanes[i], originMin, ppm,
      '', `background:linear-gradient(180deg,oklch(0.975 0.022 ${hue}),oklch(0.945 0.04 ${hue}));color:oklch(0.36 0.08 ${hue});border-color:oklch(0.86 0.05 ${hue})`);
    return `<div class="bubble-block ${b.type}" style="position:absolute;${style}" data-act="open-bubble" data-id="${esc(b.id)}">
      <strong style="font-size:12px">${esc(b.title)}</strong>
      <span class="mono" style="font-size:10px;opacity:0.85">${dur(p.end - p.start)}${b.status === 'overflow' ? ' · carried' : ''}</span>
    </div>`;
  }).join('');

  const gapBlocks = gapsInfo.usable.map((g) => {
    const style = block(g, { col: 0, cols: 1 }, originMin, ppm);
    return `<div class="gap-outline" style="${style}" data-act="add-at-gap" data-date="${esc(date)}" data-start="${g.from}" title="Free ${dur(g.to - g.from)}"></div>`;
  }).join('');

  let nowMarker = '';
  if (isToday(date)) {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (nowMin >= rangeStart && nowMin <= rangeEnd) {
      const top = (nowMin - originMin) * ppm;
      nowMarker = `<div class="now-line" style="top:${top}px"></div><div class="now-pill" style="top:${top}px">${fmt(nowMin)}</div>`;
    }
  }

  if (!dayEvents.length && !placements.length) {
    return `<div class="timeline" style="height:${totalHeight}px">${hourRows.join('')}
      <div style="position:absolute;inset:46px 12px 0;pointer-events:none">${gapBlocks}</div>
      <div class="empty" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;pointer-events:auto">
        <div>Nothing here yet.</div>
        <button class="btn btn-primary" style="margin-top:10px" data-act="goto-add">Add the first one</button>
      </div>
    </div>`;
  }

  return `<div class="timeline" style="height:${totalHeight}px;position:relative">
    ${hourRows.join('')}
    <div style="position:absolute;left:46px;right:0;top:0;bottom:0">
      ${gapBlocks}${eventBlocks}${subtaskBlocks}${bubbleBlocks}${nowMarker}
    </div>
  </div>`;
}

export function render(state, solveRes, ctx) {
  const now = ctx.now;
  const sel = state.sel;
  const chips = solveRes.dates.map((d) => {
    const lbl = dayLabel(d);
    const dayPlacements = solveRes.placements.filter((p) => p.date === d);
    const dayFixed = state.fixed.filter((e) => e.date === d && !e.parentId);
    const window = state.weekWindows[new Date(...d.split('-').map((n, i) => (i === 1 ? n - 1 : n))).getDay()];
    const cap = window ? window.end - window.start : 1;
    const used = dayFixed.reduce((s, e) => s + (e.end - e.start), 0) + dayPlacements.reduce((s, p) => s + (p.end - p.start), 0);
    const flagged = solveRes.flags.some((f) => f.date === d);
    return `<div class="day-chip ${d === sel ? 'active' : ''}" data-act="select-day" data-date="${d}">
      <div class="wd">${lbl.wd}</div><div class="dt">${lbl.dom}</div>
      <div class="load"><i style="width:${Math.min(100, Math.round((used / cap) * 100))}%"></i></div>
      ${flagged ? '<div class="flag"></div>' : ''}
    </div>`;
  }).join('');

  const flagsForDay = solveRes.flags.filter((f) => f.date === sel);
  const queue = state.bubbles.filter((b) => b.status !== 'done');

  const rightCol = `
    ${flagsForDay.length ? `<div class="panel" style="margin-bottom:12px">
      <div class="section-title" style="color:var(--error-text)">Won't fit</div>
      ${flagsForDay.map((f) => `<div class="list-row"><span>${esc(f.title)}</span><span class="mono muted">${dur(f.remaining)}</span></div>`).join('')}
    </div>` : ''}
    <div class="panel">
      <div class="section-title">Bubble queue</div>
      ${queue.length ? queue.map((b) => `<div class="list-row">
        <span>${esc(b.title)} <span class="muted">· ${esc(b.category)}</span></span>
        <span>
          <button class="btn btn-ghost" style="padding:6px 8px" data-act="bubble-done" data-id="${esc(b.id)}">done</button>
          <button class="btn btn-ghost" style="padding:6px 8px" data-act="bubble-delete" data-id="${esc(b.id)}">✕</button>
        </span>
      </div>`).join('') : '<div class="muted">Nothing queued.</div>'}
    </div>`;

  return `
    <div class="day-strip">${chips}</div>
    <div class="grid-2" style="grid-template-columns:2fr 1fr">
      <div class="card">${renderTimeline(state, solveRes, sel, now)}</div>
      <div>${rightCol}</div>
    </div>
  `;
}

export const handlers = {
  'select-day': (ctx, t) => ctx.store.setState({ sel: t.dataset.date }),
  'goto-add': (ctx) => ctx.store.setState({ page: 'add' }),
  'bubble-done': (ctx, t) => ctx.store.applyAction({ type: 'mark_done', params: { id: t.dataset.id } }),
  'bubble-delete': (ctx, t) => ctx.store.patchBubbles((bs) => bs.filter((b) => b.id !== t.dataset.id)),
  'open-event': (ctx, t) => ctx.store.setState({ sheet: { open: true, kind: 'event', id: t.dataset.id } }),
  'open-bubble': (ctx, t) => ctx.store.setState({ sheet: { open: true, kind: 'bubble', id: t.dataset.id } }),
  'add-at-gap': (ctx, t) => ctx.store.setState({ page: 'add', prefillStart: +t.dataset.start, prefillDate: t.dataset.date }),
};
