import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../dist/src/api/handler.js';
import { parseAssetLanguage, languageRank } from '../dist/src/domain/asset-language.js';

test('health works without credentials; catalog fails closed', async () => {
  const handler = createHandler();
  assert.equal((await handler(new Request('https://example.test/api/v1/health'))).status, 200);
  assert.equal((await handler(new Request('https://example.test/api/v1/games'))).status, 503);
  assert.equal((await handler(new Request('https://example.test/api/v1/games', { method: 'POST' }))).status, 405);
});

test('bounds pagination before accessing persistence', async () => {
  let calls = 0;
  const handler = createHandler({ listPublishedGames: async () => { calls++; return []; } });
  for (const query of ['limit=101', 'limit=0', 'offset=-1', 'limit=1.5', 'offset=10001']) {
    assert.equal((await handler(new Request(`https://example.test/api/v1/games?${query}`))).status, 400);
  }
  assert.equal(calls, 0);
});

test('returns published catalog and redacts upstream errors', async () => {
  const handler = createHandler({ listPublishedGames: async (limit, offset) => {
    assert.equal(limit, 20); assert.equal(offset, 0); return [];
  } });
  const response = await handler(new Request('https://example.test/api/v1/games'));
  assert.deepEqual((await response.json()).data, []);
  const failing = createHandler({ listPublishedGames: async () => { throw new Error('private diagnostic'); } });
  const unavailable = await failing(new Request('https://example.test/api/v1/games'));
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.text()).includes('private diagnostic'), false);
});

test('Global and unknown are different; localized artwork needs a language', () => {
  assert.deepEqual(parseAssetLanguage({ kind: 'global', tags: [] }), { kind: 'global', tags: [] });
  for (const value of [{ kind: 'global', tags: ['en'] }, { kind: 'localized', tags: [] },
    { kind: 'localized', tags: ['und'] }, { kind: 'localized', tags: ['global'] }]) {
    assert.throws(() => parseAssetLanguage(value));
  }
  assert.deepEqual(parseAssetLanguage({ kind: 'localized', tags: ['ES-es', 'es-ES'] }).tags, ['es-ES']);
});

test('language fallback does not select another regional variant or unrelated language', () => {
  const neutral = parseAssetLanguage({ kind: 'global', tags: [] });
  const english = parseAssetLanguage({ kind: 'localized', tags: ['en'] });
  const spanish = parseAssetLanguage({ kind: 'localized', tags: ['es'] });
  const variant = parseAssetLanguage({ kind: 'localized', tags: ['es-ES'] });
  assert.equal(languageRank(neutral, 'es'), 2);
  assert.equal(languageRank(english, 'es'), null);
  assert.equal(languageRank(spanish, 'es-419'), null);
  assert.equal(languageRank(spanish, 'es-419', true), 1);
  assert.equal(languageRank(variant, 'es-419', true), null);
  assert.equal(languageRank(english, 'global'), null);
});
