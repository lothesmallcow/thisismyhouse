# Bubbles Calendar

Fixed events plus flexible "bubbles" (a duration + optional deadline), auto-placed into the
gaps between fixed events by a deterministic solver. Ported from a Claude Design canvas
mockup (`design_handoff_bubbles_calendar/`) into a real, running app — the mockup's `.dc.html`
files are design artboards, not executable pages, so nothing in them ever actually hit a
network; every network call here (Supabase, Anthropic) is real and covered by a test that
exercises it over live HTTP.

## Run it

No build step — plain ES modules loaded directly by the browser.

```
npm start          # serves the app at http://localhost:8080
npm test           # runs the test suite (node's built-in test runner)
```

## Layout

- `src/solver.js` — the actual product: `gaps()`, `solve()`, `lanes()`, pure and dependency-free.
- `src/supabase.js` — real Supabase REST/Auth client (connect, sign in/up, push/pull).
- `src/anthropic.js` — real Anthropic key check + command/advisor calls.
- `src/parser.js` — the offline, zero-cost local command parser (no API key needed).
- `src/state.js` — the store: persistence, action application, and a memoized `solve()`.
- `src/ui/*.js` — the four pages (Day/Week/Add/Settings) plus the edit sheet.
- `tests/` — `node --test`; `tests/mock-supabase-server.mjs` is a tiny stand-in for a real
  Supabase project used to prove the connection code over actual HTTP, not just mocked calls.

## What was actually broken, and the fix

The design handoff's own "Known bugs" section flagged Supabase sync as "unverified end to
end" — it had never run against a live project, because it never could: a design canvas
preview doesn't make real network calls. Two real bugs turned up once this was wired up for
real and driven through an actual Chromium browser (not just Node):

1. **CORS** — a real Supabase project sends permissive CORS headers by default; nothing here
   depended on that being absent, but it had to be present in the test double too, or a
   browser blocks the request outright while Node's `fetch` (used by the unit tests) doesn't
   enforce CORS at all and would never have caught it.
2. **`this.fetchImpl(...)` — real "Illegal invocation" in a browser.** Storing `fetch` and
   later calling it as `this.fetchImpl(...)` rebinds `this` to the client instance. Node's
   fetch doesn't care; a real browser's native `fetch` throws `TypeError: Illegal invocation`
   because it's WebIDL-branded to its original receiver. This silently broke sign-in, sync,
   and token refresh — exactly "type in the connection info and it does nothing." Fixed with
   an unqualified call (`(0, this.fetchImpl)(...)`) and locked in with a regression test that
   simulates a receiver-checking `fetch` so it can't regress silently again.

## Efficiency

The prototype's own docs describe placements as "recomputed every render" — correct as an
architecture (placements must never be persisted) but wasteful as an implementation, since
typing in the command bar or opening a sheet re-renders without touching the schedule.
`Store.solve()` now memoizes on a cheap "did anything schedule-affecting change" version
counter plus the current minute, so the actual gap-finding/placement work only reruns when
it could produce a different answer. Text inputs across Add/Settings are also uncontrolled
(read at submit time) rather than wired to a state update per keystroke, which avoids both a
render per keystroke and the focus/cursor loss that a naive `innerHTML` re-render would cause
on a controlled input.

## Known simplifications vs. the original design spec

Ported faithfully: the solver's placement rules (best-fit for solid bubbles, the min-chunk
"crumb rule" for divisible ones, deadline/overflow-before-fresh/priority/age ordering,
carried-debt tracking, gap lead/tail buffers) — see `tests/solver.test.mjs`.

Simplified for scope (fixing the connection bug and the recompute-on-every-render inefficiency
were the ask; these were not):
- Drag-to-reschedule isn't implemented — editing is via the sheet (tap an event/bubble).
- Week view is a per-day summary card, not a full pixel-accurate 7-column grid.
- The AI advisor ("suggest a plan") isn't wired up; the command bar supports the local parser
  and, when a key is set, Claude-based command *parsing* (add/delete/mark-done/etc.), matching
  the "two separate jobs" split the design calls for.
- Recurrence, once expanded, is flat rows (as designed) capped at a 14-day window rather than
  indefinite.
