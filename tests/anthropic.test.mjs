import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { checkAnthropicKey, parseJSONLoose, parseCommand, buildCommandSystemPrompt } from '../src/anthropic.js';

function startMockAnthropic(validKey) {
  const server = http.createServer((req, res) => {
    const key = req.headers['x-api-key'];
    if (key !== validKey) {
      res.writeHead(401, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ error: { message: 'invalid x-api-key' } }));
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: [] }));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({
    url: `http://127.0.0.1:${server.address().port}`,
    stop: () => new Promise((r) => server.close(r)),
  })));
}

test('checkAnthropicKey accepts a valid key over real HTTP', async () => {
  const mock = await startMockAnthropic('sk-ant-good');
  try {
    const fetchImpl = (url, opts) => fetch(mock.url + '/v1/models?limit=1', opts);
    const r = await checkAnthropicKey('sk-ant-good', fetchImpl);
    assert.equal(r.ok, true);
  } finally { await mock.stop(); }
});

test('checkAnthropicKey rejects a bad key with a specific message', async () => {
  const mock = await startMockAnthropic('sk-ant-good');
  try {
    const fetchImpl = (url, opts) => fetch(mock.url + '/v1/models?limit=1', opts);
    const r = await checkAnthropicKey('sk-ant-wrong', fetchImpl);
    assert.equal(r.ok, false);
    assert.match(r.msg, /rejected/i);
  } finally { await mock.stop(); }
});

test('checkAnthropicKey reports an unreachable host without throwing', async () => {
  const r = await checkAnthropicKey('sk-ant-x', () => fetch('http://127.0.0.1:1'));
  assert.equal(r.ok, false);
  assert.match(r.msg, /could not reach/i);
});

test('parseJSONLoose parses well-formed JSON directly', () => {
  const r = parseJSONLoose('{"reply":"ok","actions":[{"type":"add_fixed"}]}');
  assert.equal(r.reply, 'ok');
  assert.equal(r.actions.length, 1);
});

test('parseJSONLoose salvages complete actions from a truncated response', () => {
  const truncated = '{"reply":"Adding two things.","actions":[{"type":"add_fixed","params":{"title":"Gym"}},{"type":"add_bubble","para';
  const r = parseJSONLoose(truncated);
  assert.equal(r.reply, 'Adding two things.');
  assert.equal(r.actions.length, 1);
  assert.equal(r.actions[0].type, 'add_fixed');
});

// --- the actual bug: an attached photo got treated as "the app's own calendar", so the
// model asked whether to "duplicate" instead of just extracting events. The system prompt
// must anchor a real date and explicitly say a photo is external source material. ---

test('buildCommandSystemPrompt anchors today\'s date and weekday for relative-date resolution', () => {
  const p = buildCommandSystemPrompt('2026-09-16'); // a Wednesday
  assert.match(p, /Today is 2026-09-16 \(Wednesday\)/);
});

test('buildCommandSystemPrompt tells the model a photo is not the app\'s own calendar', () => {
  const p = buildCommandSystemPrompt('2026-09-16');
  assert.match(p, /never a picture of what is\s*\nalready in this app/);
  assert.match(p, /never assume a photographed schedule is "already there"/i);
  assert.match(p, /extract every item you can read and return it as actions/i);
});

function startMockMessages(capture) {
  const server = http.createServer(async (req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      capture.push(JSON.parse(body));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ content: [{ type: 'text', text: '{"reply":"Added.","actions":[{"type":"add_fixed","params":{"title":"Maths","date":"2026-09-17","start":540,"end":630}}]}' }] }));
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({
    url: `http://127.0.0.1:${server.address().port}`,
    stop: () => new Promise((r) => server.close(r)),
  })));
}

test('parseCommand sends the today-anchored system prompt and the image as base64 content', async () => {
  const captured = [];
  const mock = await startMockMessages(captured);
  try {
    const fetchImpl = (url, opts) => fetch(mock.url + '/v1/messages', opts);
    const r = await parseCommand({
      text: '',
      images: [{ mediaType: 'image/png', data: 'AAAA' }],
      today: '2026-09-16',
      apiKey: 'sk-ant-test',
      fetchImpl,
    });
    assert.equal(captured.length, 1);
    const body = captured[0];
    assert.match(body.system, /Today is 2026-09-16/);
    const content = body.messages[0].content;
    assert.equal(content[1].type, 'image');
    assert.equal(content[1].source.data, 'AAAA');
    // empty text + an image still sends a real instruction, not a blank message
    assert.ok(content[0].text.length > 0);
    assert.equal(r.actions.length, 1);
    assert.equal(r.actions[0].type, 'add_fixed');
  } finally { await mock.stop(); }
});
