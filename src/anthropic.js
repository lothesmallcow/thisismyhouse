// Thin, real wrapper around the Anthropic API for the two AI features described in the
// handoff: command parsing (extraction only) and the scheduling advisor (judgement only).
// Both call the API directly from the browser, which is why the key check matters — a bad
// key should fail loudly right in Settings, not silently on the first real command.

export const MODELS = {
  parse: { economy: 'claude-haiku-4-5-20251001', balanced: 'claude-haiku-4-5-20251001', best: 'claude-sonnet-5' },
  advise: { economy: 'claude-haiku-4-5-20251001', balanced: 'claude-sonnet-5', best: 'claude-opus-5' },
};

const ANTHROPIC_VERSION = '2023-06-01';

export async function checkAnthropicKey(key, fetchImpl = (...args) => fetch(...args)) {
  let res;
  try {
    res = await fetchImpl('https://api.anthropic.com/v1/models?limit=1', {
      headers: { 'x-api-key': key, 'anthropic-version': ANTHROPIC_VERSION, 'anthropic-dangerous-direct-browser-access': 'true' },
    });
  } catch (e) {
    return { ok: false, msg: 'Could not reach Anthropic to check the key. Check your connection and try again.' };
  }
  if (res.ok) return { ok: true };
  if (res.status === 401 || res.status === 403) return { ok: false, msg: 'Anthropic rejected that key. It should start with sk-ant- and come from console.anthropic.com.' };
  let body = {};
  try { body = await res.json(); } catch (e) { /* ignore */ }
  const msg = (body.error && body.error.message) || ('HTTP ' + res.status);
  if (res.status === 400 && /credit|billing/i.test(msg)) return { ok: false, msg: 'Key is valid but the account has no credit. Add billing at console.anthropic.com.' };
  return { ok: false, msg: 'Anthropic answered: ' + msg };
}

/**
 * Every substring of `text` that is a balanced `{...}` object at any nesting depth, string-aware.
 * A truncated response leaves its outermost object (and its last, cut-off action) unclosed — those
 * are simply never emitted — while any action object that *did* finish comes out intact regardless
 * of how deep inside "actions": [...] it sits.
 */
function balancedObjects(text) {
  const out = [];
  const startStack = [];
  let inString = false, escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === '{') startStack.push(i);
    else if (c === '}') {
      const start = startStack.pop();
      if (start !== undefined) out.push(text.slice(start, i + 1));
    }
  }
  return out;
}

/** Salvage complete action objects out of a truncated JSON response (see README: parseJSONLoose). */
export function parseJSONLoose(text) {
  try { return JSON.parse(text); } catch (e) { /* fall through to salvage */ }
  const actions = balancedObjects(text)
    .map((s) => { try { return JSON.parse(s); } catch (e) { return null; } })
    .filter((obj) => obj && typeof obj.type === 'string');
  const replyMatch = text.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  return { reply: replyMatch ? JSON.parse('"' + replyMatch[1] + '"') : '', actions };
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Build the extraction system prompt anchored to a specific "today" so relative dates resolve correctly. */
export function buildCommandSystemPrompt(todayKey) {
  const [y, m, d] = todayKey.split('-').map(Number);
  const weekday = WEEKDAY_NAMES[new Date(y, m - 1, d).getDay()];
  return `You extract calendar actions from a user's message, which may include one or more photos —
a class timetable, a printed schedule, a screenshot from another calendar app, a syllabus.

Today is ${todayKey} (${weekday}). Resolve every relative or weekday-only date against this.

A photo is always external source material to transcribe FROM — it is never a picture of what is
already in this app. This app's own calendar is not shown to you and is usually empty or sparse;
never assume a photographed schedule is "already there" or ask whether to avoid duplicating it —
extract every item you can read and return it as actions. The user attached the photo specifically
so you would add these for them, not so you would describe or second-guess it back to them.

Extraction rules:
- An item with a specific clock time (e.g. "Mon 9:00–10:30 Maths") becomes one add_fixed action:
  {"type":"add_fixed","params":{"title","date":"YYYY-MM-DD","start":minutesFromMidnight,"end":minutesFromMidnight}}.
- A weekday with no explicit date resolves to its next occurrence from today. If the source states a
  recurrence ("every Monday", a whole term's timetable), emit one add_fixed action per occurrence
  over the next 14 days, not just the first.
- An item with a duration but no fixed clock time (e.g. "2h of revision", "finish the essay") becomes
  one add_bubble action — never invent a start time for it:
  {"type":"add_bubble","params":{"title","category":one of "study"|"job apps"|"gym"|"misc","date":"YYYY-MM-DD" (earliest day it may be placed, default today),"total":minutes,"type":"divisible"|"solid","minChunk":minutes (divisible only),"priority":1-5,"deadline":{"date":"YYYY-MM-DD","time":minutesFromMidnight} (optional)}}.
- Other action types: modify, modify_event, split_event, delete, delete_event, mark_done, shift,
  set_buffer, set_window, extend_window — use {"target": title} to identify an existing item by name.
- If a photo is genuinely unreadable or unrelated to scheduling, say so in reply and return actions: [].
- A plain question with no schedule content to add returns actions: [] and reply answers it.

Reply with JSON only: {"reply": string, "actions": Action[]}.`;
}

export async function parseCommand({ text, images, today, spendMode = 'balanced', apiKey, fetchImpl = (...args) => fetch(...args) }) {
  const model = MODELS.parse[spendMode] || MODELS.parse.balanced;
  const todayKey = today || new Date().toISOString().slice(0, 10);
  const content = [{ type: 'text', text: text || (images && images.length ? 'Add everything you can read from the attached photo(s) to my calendar.' : '') }];
  (images || []).slice(0, 4).forEach((img) => content.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } }));
  const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1536,
      system: buildCommandSystemPrompt(todayKey),
      messages: [{ role: 'user', content }],
    }),
  });
  if (!res.ok) {
    let body = {};
    try { body = await res.json(); } catch (e) { /* ignore */ }
    throw new Error((body.error && body.error.message) || ('HTTP ' + res.status));
  }
  const j = await res.json();
  const raw = (j.content || []).map((c) => c.text || '').join('');
  return parseJSONLoose(raw);
}

export async function requestAdvice({ question, state, spendMode = 'balanced', apiKey, fetchImpl = (...args) => fetch(...args) }) {
  const model = MODELS.advise[spendMode] || MODELS.advise.balanced;
  const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: 'You are a scheduling advisor. Propose at most 3 actions as JSON: {"explanation": string, "actions": Action[]}. Judgement only — the real solver places everything; you never invent times.',
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Question: ' + question + '\n\nCurrent state:\n' + JSON.stringify(state) }] }],
    }),
  });
  if (!res.ok) {
    let body = {};
    try { body = await res.json(); } catch (e) { /* ignore */ }
    throw new Error((body.error && body.error.message) || ('HTTP ' + res.status));
  }
  const j = await res.json();
  const raw = (j.content || []).map((c) => c.text || '').join('');
  const parsed = parseJSONLoose(raw);
  return { explanation: parsed.reply || parsed.explanation || '', actions: (parsed.actions || []).slice(0, 3) };
}
