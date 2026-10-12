import { createHandler } from '../../src/api/handler.js';
import { createCatalogReader } from '../../src/infrastructure/catalog-reader.js';
import { createAdminHandler } from '../../src/api/admin-handler.js';
import { createAdminGateway } from '../../src/infrastructure/admin-gateway.js';

export default async function handler(request: Request, context?: { ip?: string }): Promise<Response> {
  try {
    const origin = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SECRET_KEY;
    if (new URL(request.url).pathname.match(/^\/(?:admin\/)?api\/v1\/admin\//)) {
      if (!origin || !serviceKey) throw new Error('service_not_configured');
      return createAdminHandler(createAdminGateway(origin,serviceKey),process.env.ADMIN_ORIGIN)(request,context?.ip);
    }
    const catalog = origin && serviceKey ? createCatalogReader(origin, serviceKey) : undefined;
    return createHandler(catalog)(request);
  } catch {
    return Response.json({ error: 'service_not_configured' }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
}

export const config = { path: ['/api/v1/*','/admin/api/v1/*'] };
