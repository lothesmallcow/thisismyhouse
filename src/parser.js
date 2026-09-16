// The zero-cost, offline path: turns a handful of common phrasings into calendar actions
// without any API call. Deliberately narrower than the Claude-backed parser — this is the
// documented fallback (see README "Known bugs": local parser coverage is regex-based), not
// a full NLU stack. It never guesses a start time for a bubble; only add_fixed carries a
// clock time, because only fixed events have one.
import { parseDur, normDur, DOW, CATS } from './solver.js';

const WEEKDAY_RE = /\b(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?)\b/i;
const WEEKDAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

const dateKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

/** Resolve a fragment of text mentioning a date into "YYYY-MM-DD", relative to `today`. */
function resolveDate(text, today) {
  const t = text.toLowerCase();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (/\btoday\b/.test(t)) return dateKey(base);
  if (/\btomorrow\b/.test(t)) { base.setDate(base.getDate() + 1); return dateKey(base); }
  const iso = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const dom = t.match(/\bthe\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (dom) {
    const day = +dom[1];
    const d = new Date(base.getFullYear(), base.getMonth(), day);
    if (d < base) d.setMonth(d.getMonth() + 1);
    return dateKey(d);
  }
  const wd = t.match(WEEKDAY_RE);
  if (wd) {
    const target = WEEKDAY_INDEX[wd[1].slice(0, 3)];
    const d = new Date(base);
    let delta = (target - base.getDay() + 7) % 7;
    if (delta === 0 && !/\btoday\b/.test(t)) delta = /\bnext\b/.test(t) ? 7 : 0;
    d.setDate(d.getDate() + delta);
    return dateKey(d);
  }
  return null;
}

function detectCategory(text) {
  const t = text.toLowerCase();
  for (const cat of Object.keys(CATS)) if (t.includes(cat)) return cat;
  if (/\bwork\b|\bapplication|\bapply\b/.test(t)) return 'job apps';
  if (/\bworkout|\btraining\b/.test(t)) return 'gym';
  return 'misc';
}

function extractTitle(text) {
  return text.trim().replace(/^(add|schedule|book|create)\s+/i, '').split(/\s+(?:from|at|for|every)\b/i)[0].trim() || 'Untitled';
}

// Matches a duration mention anywhere in a sentence: "4h", "1h30", "90 minutes", "2 hours",
// or a word-number phrase once normDur() has spelled it out as digits (see parseDur/normDur).
const DUR_TOKEN_RE = /\d+(?:[.,]\d+)?\s*(?:hours?|hrs?|h)(?:\s*\d{1,2}\s*(?:minutes?|mins?|m)?)?\b|\d+(?:[.,]\d+)?\s*(?:minutes?|mins?|m)\b/i;

function parseTimeToken(tok) {
  const m = tok.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let h = +m[1];
  const min = +(m[2] || 0);
  const ap = (m[3] || '').toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return h * 60 + min;
}

/**
 * @param {string} text raw command text
 * @param {{today: Date}} ctx
 * @returns {{reply: string, actions: Array}}
 */
export function parseLocalCommand(text, ctx) {
  const today = ctx.today || new Date();
  const raw = text.trim();
  if (!raw) return { reply: '', actions: [] };

  const doneMatch = raw.match(/^(?:mark\s+)?(.+?)\s+(?:as\s+)?done\b/i);
  if (doneMatch && /\bdone\b/i.test(raw)) {
    return { reply: 'Marking "' + doneMatch[1].trim() + '" done.', actions: [{ type: 'mark_done', params: { title: doneMatch[1].trim() } }] };
  }

  const deleteMatch = raw.match(/^(?:delete|remove|cancel)\s+(.+)$/i);
  if (deleteMatch) {
    return { reply: 'Removing "' + deleteMatch[1].trim() + '".', actions: [{ type: 'delete', params: { title: deleteMatch[1].trim() } }] };
  }

  // Fixed event with a clock time range: "<title> from 9:00 to 10:30 ..." / "9-10:30"
  const rangeMatch = raw.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|to|until)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (rangeMatch) {
    const start = parseTimeToken(rangeMatch[1]);
    const end = parseTimeToken(rangeMatch[2]);
    if (start != null && end != null) {
      const isRecurring = /\bevery\s+(weekday|day|week|sun|mon|tue|wed|thu|fri|sat)/i.test(raw);
      const title = extractTitle(raw.slice(0, rangeMatch.index));
      if (isRecurring) {
        const recur = raw.match(/every\s+(weekday|day|week|sun(?:day)?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?)/i)[1].toLowerCase();
        const dates = expandRecurrence(recur, today, 14);
        return {
          reply: `Adding "${title}" ${fmtRange(start, end)} on ${dates.length} day(s) over the next two weeks.`,
          actions: dates.map((date) => ({ type: 'add_fixed', params: { title, date, start, end } })),
        };
      }
      const date = resolveDate(raw, today) || dateKey(today);
      return { reply: `Adding "${title}" on ${date} ${fmtRange(start, end)}.`, actions: [{ type: 'add_fixed', params: { title, date, start, end } }] };
    }
  }

  // Flexible bubble: a duration mention anywhere ("4h of study", "for 2 hours", "90 minutes of gym"),
  // optionally with a deadline, min chunk and priority. Never assigned a start time — that is the solver's job.
  const normalized = normDur(raw);
  const durToken = normalized.match(DUR_TOKEN_RE);
  const total = durToken ? parseDur(durToken[0]) : 0;
  if (total > 0) {
    const deadlineMatch = raw.match(/\b(?:before|by)\s+([^,.;]+)/i);
    const deadlineDate = deadlineMatch ? resolveDate(deadlineMatch[1], today) : null;
    const minChunkMatch = raw.match(/min\s*chunk\s+([^,.;]+)/i);
    const minChunk = minChunkMatch ? parseDur(minChunkMatch[1]) : Math.min(30, total);
    const priorityMatch = raw.match(/priority\s+(\d)/i);
    const priority = priorityMatch ? Math.min(5, Math.max(1, +priorityMatch[1])) : (/\burgent\b|\bimportant\b/i.test(raw) ? 5 : 3);
    const bubbleType = /\bsolid\b|\bone sitting\b|\bin one go\b/i.test(raw) ? 'solid' : 'divisible';
    const category = detectCategory(raw);
    const title = category.replace(/\b\w/, (c) => c.toUpperCase());
    const date = dateKey(today);
    const params = {
      title, category, date, total, type: bubbleType, priority,
      ...(bubbleType === 'divisible' ? { minChunk } : {}),
      ...(deadlineDate ? { deadline: { date: deadlineDate, time: 1380 } } : {}),
    };
    return { reply: `Adding "${title}" — ${durToken[0].trim()} of ${category}${deadlineDate ? ', due ' + deadlineDate : ''}.`, actions: [{ type: 'add_bubble', params }] };
  }

  return { reply: "I couldn't parse that locally. Connect a Claude API key in Settings for free-form commands, or use: \"<title> from 9:00 to 10:30\" / \"I need 2h of study before friday\".", actions: [] };
}

function fmtRange(start, end) {
  const f = (m) => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  return f(start) + '–' + f(end);
}

function expandRecurrence(recur, today, days) {
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const dow = d.getDay();
    const isWeekday = dow !== 0 && dow !== 6;
    let match = false;
    if (recur === 'day') match = true;
    else if (recur === 'weekday') match = isWeekday;
    else if (recur === 'week') match = i % 7 === 0;
    else match = DOW[dow].toLowerCase().startsWith(recur.slice(0, 3));
    if (match) out.push(dateKey(d));
  }
  return out;
}
