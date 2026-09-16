import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLocalCommand } from '../src/parser.js';

// Monday, 2026-01-05 for stable weekday math.
const today = new Date(2026, 0, 5);

test('parses a fixed event with an explicit time range and weekday', () => {
  const r = parseLocalCommand('lesson from 9:00 to 10:30 on wednesday', { today });
  assert.equal(r.actions.length, 1);
  const a = r.actions[0];
  assert.equal(a.type, 'add_fixed');
  assert.equal(a.params.title, 'lesson');
  assert.equal(a.params.start, 9 * 60);
  assert.equal(a.params.end, 10 * 60 + 30);
  assert.equal(a.params.date, '2026-01-07'); // next Wednesday from Mon 2026-01-05
});

test('parses a flexible bubble with duration, deadline and min chunk', () => {
  const r = parseLocalCommand('I need 4h of study before friday, min chunk 1h', { today });
  assert.equal(r.actions.length, 1);
  const a = r.actions[0];
  assert.equal(a.type, 'add_bubble');
  assert.equal(a.params.category, 'study');
  assert.equal(a.params.total, 240);
  assert.equal(a.params.type, 'divisible'); // Bubble.type is divisible/solid, distinct from the action's own `type`
  assert.equal(a.params.minChunk, 60);
  assert.equal(a.params.deadline.date, '2026-01-09'); // next Friday
});

test('parses a recurring fixed event ("every weekday")', () => {
  const r = parseLocalCommand('gym every weekday at 7:30 to 8:30', { today });
  assert.ok(r.actions.length >= 5, 'two weeks of weekdays should produce at least 5 in the first week');
  assert.ok(r.actions.every((a) => a.type === 'add_fixed'));
  assert.ok(r.actions.every((a) => a.params.title.toLowerCase().includes('gym')));
});

test('parses "mark X done"', () => {
  const r = parseLocalCommand('mark job apps done', { today });
  assert.deepEqual(r.actions, [{ type: 'mark_done', params: { title: 'job apps' } }]);
});

test('parses delete/remove/cancel', () => {
  const r = parseLocalCommand('delete gym session', { today });
  assert.deepEqual(r.actions, [{ type: 'delete', params: { title: 'gym session' } }]);
});

test('unrecognized phrasing returns no actions and a helpful reply, never a guess', () => {
  const r = parseLocalCommand('what should I do about my thesis', { today });
  assert.deepEqual(r.actions, []);
  assert.ok(r.reply.length > 0);
});

test('a bubble never gets a start time — only add_fixed carries a clock time', () => {
  const r = parseLocalCommand('I need 2h of gym', { today });
  assert.equal(r.actions[0].type, 'add_bubble');
  assert.equal('start' in r.actions[0].params, false);
});
