import { createHandler } from '../../src/api/handler.js';
import { createCatalogReader } from '../../src/infrastructure/catalog-reader.js';

export default async function handler(request: Request): Promise<Response> {
  try {
    const origin = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const catalog = origin && serviceKey ? createCatalogReader(origin, serviceKey) : undefined;
    return createHandler(catalog)(request);
  } catch {
    return Response.json({ error: 'service_not_configured' }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
}

export const config = { path: '/api/v1/*' };
