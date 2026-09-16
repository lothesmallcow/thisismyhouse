import { esc, dayLabel } from '../dom.js';
import { dur, CATS } from '../solver.js';
import * as Add from './add.js';

export function render(state, solveRes, ctx) {
  const sel = state.sel;
  const addOpen = !!state.addPanelOpen;
  const cols = solveRes.dates.map((d) => {
    const lbl = dayLabel(d);
    const dayFixed = state.fixed.filter((e) => e.date === d && !e.parentId);
    const dayPlacements = solveRes.placements.filter((p) => p.date === d);
    const window = state.weekWindows[new Date(...d.split('-').map((n, i) => (i === 1 ? n - 1 : n))).getDay()];
    const cap = window ? window.end - window.start : 0;
    const fixedMin = dayFixed.reduce((s, e) => s + (e.end - e.start), 0);
    const bubbleMin = dayPlacements.reduce((s, p) => s + (p.end - p.start), 0);
    const freeMin = Math.max(0, cap - fixedMin - bubbleMin);
    const items = [
      ...dayFixed.map((e) => ({ label: e.title, kind: 'fixed' })),
      ...dayPlacements.map((p) => {
        const b = state.bubbles.find((x) => x.id === p.bubbleId);
        return { label: b ? b.title : '?', kind: 'bubble' };
      }),
    ];
    return `<div class="panel" style="cursor:pointer;${d === sel ? 'outline:2px solid oklch(0.60 0.17 268)' : ''}" data-act="week-select-day" data-date="${d}">
      <div style="font-size:12px;font-weight:600">${lbl.wd} ${lbl.dom}</div>
      <div class="mono muted" style="font-size:10.5px;margin-top:4px">${dur(fixedMin)} fixed · ${dur(bubbleMin)} bubbles · ${dur(freeMin)} free</div>
      <div style="margin-top:8px;display:flex;flex-direction:column;gap:3px">
        ${items.slice(0, 4).map((it) => `<div class="mono" style="font-size:10px;padding:3px 6px;border-radius:6px;background:${it.kind === 'fixed' ? 'oklch(0.60 0.17 268 / 0.15)' : 'rgba(28,26,23,0.06)'}">${esc(it.label)}</div>`).join('')}
        ${items.length > 4 ? `<div class="muted" style="font-size:10px">+${items.length - 4} more</div>` : ''}
      </div>
    </div>`;
  }).join('');

  const debtByCat = solveRes.debtByCategory || {};
  const maxDebt = Math.max(1, ...Object.values(debtByCat));
  const debtRows = Object.keys(CATS).map((cat) => {
    const m = debtByCat[cat] || 0;
    return `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px"><span>${esc(cat)}</span><span class="mono muted">${dur(m)}</span></div>
      <div class="debt-bar"><i style="width:${Math.round((m / maxDebt) * 100)}%"></i></div></div>`;
  }).join('');

  return `
    <div class="add-panel-toggle-row">
      <button class="btn ${addOpen ? 'btn-primary' : 'btn-ghost'}" data-act="toggle-add-panel">${addOpen ? '✕ Close' : '+ Add'}</button>
    </div>
    ${addOpen ? `<div class="add-panel-inline">${Add.render(state, solveRes, ctx)}</div>` : ''}
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px">${cols}</div>
    <div class="panel" style="margin-top:14px">
      <div class="section-title">Carried debt by category</div>
      ${Object.values(debtByCat).some((v) => v > 0) ? debtRows : '<div class="muted">Nothing carried over. Everything fit.</div>'}
    </div>
  `;
}

export const handlers = {
  'week-select-day': (ctx, t) => ctx.store.setState({ sel: t.dataset.date, page: 'day' }),
  'toggle-add-panel': (ctx) => ctx.store.setState({ addPanelOpen: !ctx.store.getState().addPanelOpen }),
};
