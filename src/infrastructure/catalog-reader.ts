import type { CatalogReader, PublishedGame } from '../api/handler.js';

export function createCatalogReader(projectUrl: string, serviceKey: string): CatalogReader {
  const origin = new URL(projectUrl);
  if (origin.protocol !== 'https:' || origin.username || origin.password ||
      origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('Invalid database gateway origin');
  }
  return {
    async listPublishedGames(limit, offset) {
      const url = new URL('/rest/v1/published_games', origin);
      url.searchParams.set('select', 'id,title,language,description');
      url.searchParams.set('order', 'id.asc');
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('offset', String(offset));
      const response = await fetch(url, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      });
      if (!response.ok) throw new Error('Catalog upstream unavailable');
      const rows: unknown = await response.json();
      if (!Array.isArray(rows) || rows.length > limit) throw new Error('Invalid catalog response');
      return rows.map((row: unknown): PublishedGame => {
        if (!row || typeof row !== 'object') throw new Error('Invalid catalog record');
        const record = row as Record<string, unknown>;
        if (typeof record.id !== 'string' || typeof record.title !== 'string' ||
            typeof record.language !== 'string' ||
            (record.description !== null && typeof record.description !== 'string')) {
          throw new Error('Invalid catalog record');
        }
        return { id: record.id, title: record.title, language: record.language,
          description: record.description as string | null };
      });
    },
  };
}
