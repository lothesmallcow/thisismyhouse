import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { checkAnthropicKey, parseJSONLoose } from '../src/anthropic.js';

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
