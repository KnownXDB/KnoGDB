import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminHandler } from '../dist/src/api/admin-handler.js';
import { parseGameInput } from '../dist/src/domain/game-input.js';
import { createAdminGateway } from '../dist/src/infrastructure/admin-gateway.js';
const identity = {userId:'00000000-0000-4000-8000-000000000001',sessionId:'00000000-0000-4000-8000-000000000002'};
const input = {title:'Canonical title',language:'es-419',description:null,source_reference:'Official catalog',confidence:1,status:'draft',is_primary:true,approved:false};
function fixture(overrides={}) {
  const calls=[];
  return {calls,gateway:{ gate:async()=>true,login:async()=>({token:'verified.session.token',expires:900,identity}),
    identity:async()=>identity,allowed:async()=>true,logout:async()=>{},list:async()=>[],
    save:async(...args)=>{calls.push(args);return identity.userId;},...overrides }};
}
function request(route,body,cookie=true,origin='https://preview.example') {
  return new Request(`https://preview.example/admin/api/v1/admin/${route}`,{
    method:body===undefined?'GET':'POST',headers:{...(cookie?{Cookie:'__Host-knowngdb-session=verified.session.token'}:{}),
      ...(body===undefined?{}:{Origin:origin,'Content-Type':'application/json','X-KnownGDB-Action':'admin'})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
}
test('anonymous requests and cross-origin mutations are denied before gateway access',async()=>{
  const {gateway}=fixture({identity:()=>{throw Error('unexpected');}});const handler=createAdminHandler(gateway);
  assert.equal((await handler(request('games',undefined,false))).status,401);
  assert.equal((await handler(request('games',input,true,'https://other.example'))).status,403);
});
test('login returns only a secure HttpOnly cookie and checks membership',async()=>{
  const {gateway}=fixture(); const response=await createAdminHandler(gateway)(request('login',{email:'admin@example.test',password:'fixture'},false));
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{authenticated:true});
  assert.match(response.headers.get('set-cookie'),/Secure; HttpOnly; SameSite=Strict; Max-Age=900/);
  assert.equal(response.headers.get('cache-control'),'no-store');
  const denied=fixture({allowed:async()=>false});assert.equal((await createAdminHandler(denied.gateway)(request('login',{email:'admin@example.test',password:'fixture'},false))).status,401);
});
test('rate limits stop password verification',async()=>{
  const {gateway}=fixture({gate:async()=>false,login:()=>{throw Error('unexpected');}});
  assert.equal((await createAdminHandler(gateway)(request('login',{email:'admin@example.test',password:'fixture'},false))).status,429);
});
test('membership revocation denies every read and write',async()=>{
  const {gateway}=fixture({allowed:async()=>false,list:()=>{throw Error('unexpected');}});
  const handler=createAdminHandler(gateway);
  assert.equal((await handler(request('games'))).status,403);
  assert.equal((await handler(request('games',input))).status,403);
});
test('invalid and oversized payloads never reach persistence',async()=>{
  const {gateway,calls}=fixture();const handler=createAdminHandler(gateway);
  for(const body of [null,[],{...input,title:''},{...input,language:'en-123456789'},{...input,description:'x'.repeat(33000)}]) assert.equal((await handler(request('games',body))).status,400);
  assert.equal(calls.length,0);
});
test('saves preserve actor, canonical ID and optimistic concurrency timestamp',async()=>{
  const {gateway,calls}=fixture();const handler=createAdminHandler(gateway);
  const body={...input,id:identity.userId,expected_updated_at:'2026-10-12T00:00:00Z'};
  assert.equal((await handler(request('games',body))).status,200);
  assert.deepEqual(calls[0],[identity,identity.userId,body.expected_updated_at,input]);
  const failing=fixture({save:async()=>{throw Error('edit_conflict');}});
  assert.equal((await createAdminHandler(failing.gateway)(request('games',body))).status,409);
});
test('unknown backend errors never expose credentials or internal messages',async()=>{
  const {gateway}=fixture({identity:async()=>{throw Error('private database detail');}});
  const response=await createAdminHandler(gateway)(request('session'));
  assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'service_unavailable'});
});
test('language validation normalizes tags and rejects undefined language',()=>{
  assert.equal(parseGameInput({...input,language:'ES-es'}).language,'es-ES');
  assert.throws(()=>parseGameInput({...input,language:'und'}),/invalid_request/);
  assert.throws(()=>parseGameInput({...input,confidence:NaN}),/invalid_request/);
});
test('gateway verifies user tokens before decoding claims and sends secret only as apikey',async()=>{
  const original=globalThis.fetch;const paths=[];
  const claims={sub:identity.userId,session_id:identity.sessionId,exp:Math.floor(Date.now()/1000)+900,iat:Math.floor(Date.now()/1000)};
  const token=`header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
  globalThis.fetch=async(url,options)=>{
    paths.push(new URL(url).pathname);
    assert.equal(options.headers.apikey,'sb_secret_test_fixture_not_a_real_key');
    assert.equal(options.headers.Authorization,`Bearer ${token}`);
    return Response.json({id:identity.userId});
  };
  try {
    const gateway=createAdminGateway('https://project.example','sb_secret_test_fixture_not_a_real_key');
    assert.deepEqual(await gateway.identity(token),identity);
    assert.deepEqual(paths,['/auth/v1/user']);
    const expired=`header.${Buffer.from(JSON.stringify({...claims,iat:claims.iat-901})).toString('base64url')}.signature`;
    globalThis.fetch=async()=>Response.json({id:identity.userId});
    await assert.rejects(()=>gateway.identity(expired),/unauthorized/);
    globalThis.fetch=async()=>Response.json({error:'invalid'}, {status:401});
    await assert.rejects(()=>gateway.identity(token),/unauthorized/);
  } finally {globalThis.fetch=original;}
});

test('asset actions cannot bypass administrative session and membership checks',async()=>{
 let called=false;
 const assetService={admin:async()=>{called=true;return {};},public:async()=>Response.json({})};
 const denied=fixture({allowed:async()=>false});
 const handler=createAdminHandler(denied.gateway,undefined,assetService);
 assert.equal((await handler(request('assets/prepare',{}))).status,403);
 assert.equal((await handler(request('assets?game_id=00000000-0000-4000-8000-000000000001',undefined,false))).status,401);
 assert.equal(called,false);
});
