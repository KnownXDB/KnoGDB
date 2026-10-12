import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogReader } from '../dist/src/infrastructure/catalog-reader.js';

test('server gateway rejects public and legacy credential types', () => {
  for (const key of ['', 'sb_publishable_fixture', 'legacy-fixture']) {
    assert.throws(() => createCatalogReader('https://example.test', key));
  }
});

test('secret key is sent only as apikey, never as a bearer JWT', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url.origin, 'https://example.test');
    assert.equal(url.pathname, '/rest/v1/published_games');
    assert.equal(options.headers.apikey, 'sb_secret_test_fixture_not_a_real_key');
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.redirect, 'error');
    return Response.json([]);
  };
  try {
    const reader = createCatalogReader('https://example.test', 'sb_secret_test_fixture_not_a_real_key');
    assert.deepEqual(await reader.listPublishedGames(20, 0), []);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
