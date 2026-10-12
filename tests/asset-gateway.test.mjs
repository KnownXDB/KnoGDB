import { test } from 'node:test';
import assert from 'node:assert/strict';
import gateway from '../dist/workers/assets/index.js';

test('configured health does not claim upload or delivery support', async () => {
  const response = await gateway.fetch(new Request('https://example.test/api/v1/health'), { ASSETS: {} });
  const status = await response.json();
  assert.equal(response.status, 200);
  assert.equal(status.delivery, 'disabled');
  assert.equal(status.uploads, 'disabled');
});

test('all file reads and writes are denied before touching storage', async () => {
  const storage = new Proxy({}, { get() { throw new Error('Storage must not be accessed'); } });
  for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'DELETE']) {
    const response = await gateway.fetch(new Request('https://example.test/private-original', { method }), { ASSETS: storage });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
});

test('missing bucket binding returns unavailable health', async () => {
  const response = await gateway.fetch(new Request('https://example.test/api/v1/health'), {});
  assert.equal(response.status, 503);
});
