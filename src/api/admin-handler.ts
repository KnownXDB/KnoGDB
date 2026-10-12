import { parseGameInput } from '../domain/game-input.js';
import { bucketHash, type AdminGateway } from '../infrastructure/admin-gateway.js';

const cookieName = '__Host-knowngdb-session';
function json(data: unknown, status=200, cookie?: string): Response {
  return Response.json(data, { status, headers: {
    'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',
    ...(cookie ? { 'Set-Cookie':cookie } : {}),
  } });
}
const cookie = (token: string, seconds: number) =>
  `${cookieName}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${seconds}`;
async function readBody(request: Request): Promise<Record<string,unknown>> {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new Error('invalid_request');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid_request');
  const chunks: Uint8Array[]=[]; let length=0;
  while (true) {
    const { done,value }=await reader.read(); if (done) break;
    length+=value.byteLength;
    if (length>32768) { await reader.cancel(); throw new Error('invalid_request'); }
    chunks.push(value);
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString());
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_request');
    return value as Record<string,unknown>;
  }
  catch { throw new Error('invalid_request'); }
}

export function createAdminHandler(gateway: AdminGateway, configuredOrigin?: string) {
  return async (request: Request, clientIp='unavailable'): Promise<Response> => {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'POST') return json({error:'method_not_allowed'},405);
    if (request.method === 'POST' && (request.headers.get('Origin') !== (configuredOrigin ?? url.origin) ||
        request.headers.get('X-KnownGDB-Action') !== 'admin')) return json({error:'invalid_origin'},403);
    const route = url.pathname.replace(/^\/admin/, '');
    try {
      if (route === '/api/v1/admin/login' && request.method === 'POST') {
        const body = await readBody(request);
        if (typeof body.email !== 'string' || body.email.length>254 || !body.email.includes('@') ||
            typeof body.password !== 'string' || body.password.length<1 || body.password.length>1024) {
          return json({error:'invalid_request'},400);
        }
        if (!await gateway.gate(bucketHash(`ip:${clientIp}`)) ||
            !await gateway.gate(bucketHash(`email:${body.email.toLowerCase()}`))) return json({error:'rate_limited'},429);
        const session=await gateway.login(body.email,body.password);
        if (!await gateway.allowed(session.identity)) {
          await gateway.logout(session.token).catch(()=>{});
          return json({error:'unauthorized'},401);
        }
        return json({authenticated:true},200,cookie(session.token,session.expires));
      }
      const token = request.headers.get('Cookie')?.split(';').map(part=>part.trim())
        .find(part=>part.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);
      if (!token || token.length>8192 || !/^[A-Za-z0-9_.-]+$/.test(token)) return json({error:'unauthorized'},401);
      if (route === '/api/v1/admin/logout' && request.method === 'POST') {
        try { await gateway.logout(token); }
        catch { return json({error:'service_unavailable'},503,cookie('',0)); }
        return json({authenticated:false},200,cookie('',0));
      }
      const actor = await gateway.identity(token);
      if (!await gateway.allowed(actor)) return json({error:'admin_forbidden'},403);
      if (route === '/api/v1/admin/session' && request.method === 'GET') return json({authenticated:true});
      if (route === '/api/v1/admin/games' && request.method === 'GET') return json({data:await gateway.list(actor)});
      if (route === '/api/v1/admin/games' && request.method === 'POST') {
        const body=await readBody(request);
        if (body.id !== undefined && body.id !== null && typeof body.id !== 'string') return json({error:'invalid_request'},400);
        const game = typeof body.id==='string' ? body.id : null;
        if (game && !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(game)) return json({error:'invalid_request'},400);
        const expected = typeof body.expected_updated_at==='string' ? body.expected_updated_at : null;
        if (game && (!expected || !Number.isFinite(Date.parse(expected)))) return json({error:'invalid_request'},400);
        return json({id:await gateway.save(actor,game,expected,parseGameInput(body))});
      }
      return json({error:'not_found'},404);
    } catch(error) {
      const code=error instanceof Error ? error.message : '';
      const statuses: Record<string,number> = {unauthorized:401,admin_forbidden:403,invalid_request:400,rate_limited:429,
        edit_conflict:409,publication_requires_review:400,game_not_found:404};
      return json({error:code in statuses ? code : 'service_unavailable'},statuses[code] ?? 503);
    }
  };
}
