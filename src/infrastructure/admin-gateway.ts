import { createHash } from 'node:crypto';
import type { GameInput } from '../domain/game-input.js';

export interface Identity { userId: string; sessionId: string; }
export interface AdminGateway {
  gate(bucket: string): Promise<boolean>;
  login(email: string, password: string): Promise<{ token: string; expires: number; identity: Identity }>;
  identity(token: string): Promise<Identity>;
  allowed(identity: Identity): Promise<boolean>;
  logout(token: string): Promise<void>;
  list(identity: Identity): Promise<unknown>;
  save(identity: Identity, game: string | null, expected: string | null, input: GameInput): Promise<unknown>;
}

export function bucketHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function createAdminGateway(projectUrl: string, secret: string): AdminGateway {
  const origin = new URL(projectUrl);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' ||
      origin.search || origin.hash || !secret.startsWith('sb_secret_')) throw new Error('service_not_configured');
  async function remote(path: string, body?: unknown, token?: string): Promise<unknown> {
    const headers: Record<string,string> = { apikey: secret, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(new URL(path, origin), {
      method: body === undefined ? 'GET' : 'POST', headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(8000), redirect: 'error',
    });
    if (!response.ok) {
      if (response.status === 429) throw new Error('rate_limited');
      if (response.status === 401 || response.status === 403 || (path.startsWith('/auth/') && response.status === 400)) throw new Error('unauthorized');
      const failure = await response.json().catch(() => ({})) as { message?: unknown };
      const known = ['admin_forbidden','invalid_request','edit_conflict','publication_requires_review','game_not_found'];
      throw new Error(typeof failure.message === 'string' && known.includes(failure.message) ? failure.message : 'service_unavailable');
    }
    return response.status === 204 ? null : response.json();
  }
  async function identity(token: string): Promise<Identity> {
    const user = await remote('/auth/v1/user', undefined, token) as { id?: string };
    let claims: { sub?: string; session_id?: string; exp?: number; iat?: number };
    try { claims = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString()); }
    catch { throw new Error('unauthorized'); }
    // Claims are inspected only after the Auth service verifies the token.
    if (!user.id || claims.sub !== user.id || !claims.session_id || !claims.exp || !claims.iat ||
        claims.exp * 1000 <= Date.now() || Date.now() - claims.iat * 1000 >= 900000 ||
        claims.iat * 1000 > Date.now() + 30000) {
      throw new Error('unauthorized');
    }
    return { userId: user.id, sessionId: claims.session_id };
  }
  const actorArgs = (actor: Identity) => ({ p_actor: actor.userId, p_session: actor.sessionId });
  return {
    gate: async bucket => await remote('/rest/v1/rpc/admin_login_gate', { p_bucket: bucket }) === true,
    async login(email,password) {
      const session = await remote('/auth/v1/token?grant_type=password', { email,password }) as { access_token?: string; expires_in?: number };
      if (!session.access_token || !session.expires_in) throw new Error('unauthorized');
      return { token: session.access_token, expires: Math.min(900,session.expires_in), identity: await identity(session.access_token) };
    },
    identity,
    allowed: async actor => await remote('/rest/v1/rpc/admin_check', actorArgs(actor)) === true,
    logout: async token => { await remote('/auth/v1/logout?scope=local', {}, token); },
    list: actor => remote('/rest/v1/rpc/admin_catalog', actorArgs(actor)),
    save: (actor,game,expected,input) => remote('/rest/v1/rpc/admin_save_game', {
      ...actorArgs(actor), p_game: game, p_expected: expected, p_data: input,
    }),
  };
}
