interface Environment {
  ASSETS?: unknown;
}

export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const path = new URL(request.url).pathname;
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    if (request.method === 'GET' && path === '/api/v1/health') {
      return Response.json({
        service: 'KnownGDB asset gateway',
        status: env.ASSETS ? 'configured' : 'not_configured',
        delivery: 'disabled',
        uploads: 'disabled',
      }, { status: env.ASSETS ? 200 : 503, headers });
    }
    // Deny file access until grants, moderation and rights checks are implemented.
    return Response.json({ error: 'asset_access_not_enabled' }, { status: 403, headers });
  },
};
