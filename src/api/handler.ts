export interface PublishedGame {
  id: string;
  title: string;
  language: string;
  description: string | null;
}

export interface CatalogReader {
  listPublishedGames(limit: number, offset: number): Promise<readonly PublishedGame[]>;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': '*',
  } });
}

export function createHandler(catalog?: CatalogReader) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/v1/')) return json({ error: 'not_found' }, 404);
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
    if (url.pathname === '/api/v1/health') {
      return json({ service: 'KnownGDB', status: 'ok', apiVersion: 'v1' });
    }
    if (url.pathname !== '/api/v1/games') return json({ error: 'not_found' }, 404);
    const limit = Number(url.searchParams.get('limit') ?? 20);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
        !Number.isInteger(offset) || offset < 0 || offset > 10000) {
      return json({ error: 'invalid_pagination' }, 400);
    }
    if (!catalog) return json({ error: 'catalog_not_configured' }, 503);
    try {
      const games = await catalog.listPublishedGames(limit, offset);
      return json({ data: games, pagination: { limit, offset } });
    } catch {
      // Infrastructure errors must never reach public responses or logs verbatim.
      return json({ error: 'catalog_unavailable' }, 503);
    }
  };
}
