import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {generateKeyPairSync,createHash} from 'node:crypto';
import {validateAsset,assetMetadata} from '../dist/src/domain/asset-policy.js';
import {signGrant} from '../dist/src/infrastructure/asset-grants.js';
import gateway from '../dist/workers/assets/index.js';
import {createAssetService} from '../dist/src/infrastructure/asset-service.js';
const game='00000000-0000-4000-8000-000000000001',asset='00000000-0000-4000-8000-000000000002';
const keys=generateKeyPairSync('rsa',{modulusLength:2048});
const privateKey=keys.privateKey.export({type:'pkcs8',format:'der'}).toString('base64');
const publicKey=keys.publicKey.export({format:'jwk'});
const origin='https://test--knowngdb.netlify.app';
const icon=await sharp({create:{width:32,height:32,channels:4,background:{r:40,g:80,b:100,alpha:1}}}).png().toBuffer();
const checksum=createHash('sha256').update(icon).digest('hex');
const metadata={game_id:game,role:'icon',provenance:'official',mime_type:'image/png',byte_size:icon.length,checksum_sha256:checksum,source_reference:'Fixture',confidence:1,language_kind:'global',language_tags:[]};
const key=`originals/${game}/${asset}.png`;
const grant=(operation='upload',overrides={})=>signGrant({key,operation,expires:Math.floor(Date.now()/1000)+60,bytes:icon.length,checksum,mime:'image/png',origin,...overrides},privateKey);
function storage(){let value=null,puts=0;return {get puts(){return puts;},async put(k,bytes,options){assert.equal(k,key);assert.deepEqual(options.onlyIf,{etagDoesNotMatch:'*'});if(value)return null;puts++;value=bytes;return {};},async get(k){assert.equal(k,key);return value?{body:new Response(value).body,size:value.length,httpEtag:'"fixture"',customMetadata:{sha256:checksum}}:null;}};}
const request=(token,body=icon,requestOrigin=origin)=>new Request('https://files.example/api/v1/files',{method:'PUT',headers:{Authorization:`Bearer ${token}`,Origin:requestOrigin,'Content-Type':'image/png'},body});
test('policy decodes valid originals and rejects mismatched dimensions, MIME and corrupt data',async()=>{
 assert.deepEqual(await validateAsset(icon,'icon','image/png'),{width:32,height:32,mime_type:'image/png',byte_size:icon.length});
 await assert.rejects(()=>validateAsset(icon,'header','image/png'),/invalid_asset_dimensions/);
 await assert.rejects(()=>validateAsset(icon,'icon','image/jpeg'),/invalid_asset/);
 await assert.rejects(()=>validateAsset(icon.subarray(0,30),'icon','image/png'),/invalid_asset/);
 const webp=await sharp(icon).webp().toBuffer();await assert.rejects(()=>validateAsset(webp,'icon','image/png'),/invalid_asset/);
});
test('logos require visible size, transparency and trimmed borders without changing original bytes',async()=>{
 const data=Buffer.alloc(1280*40*4,255);data[3]=0;
 const logo=await sharp(data,{raw:{width:1280,height:40,channels:4}}).png().toBuffer();
 assert.equal((await validateAsset(logo,'logo','image/png')).width,1280);
 const padded=await sharp(logo).extend({top:2,bottom:2,left:2,right:2,background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
 await assert.rejects(()=>validateAsset(padded,'logo','image/png'),/invalid_logo/);
 const opaque=await sharp({create:{width:1280,height:40,channels:3,background:'#ffffff'}}).png().toBuffer();
 await assert.rejects(()=>validateAsset(opaque,'logo','image/png'),/invalid_logo/);
});
test('classification distinguishes language-neutral Global from missing language',()=>{
 assert.equal(assetMetadata(metadata).language_kind,'global');
 assert.throws(()=>assetMetadata({...metadata,language_kind:'localized'}),/invalid_request/);
 assert.throws(()=>assetMetadata({...metadata,language_tags:['en']}),/invalid_request/);
 assert.deepEqual(assetMetadata({...metadata,language_kind:'localized',language_tags:['ES-es','en']}).language_tags,['en','es-ES']);
});
test('signed upload verifies checksum, origin, expiry and immutable conditional creation',async()=>{
 const bucket=storage(),env={ASSETS:bucket,GRANT_PUBLIC_KEY:publicKey};
 assert.equal((await gateway.fetch(request(grant()),env)).status,201);
 assert.equal((await gateway.fetch(request(grant()),env)).status,409);assert.equal(bucket.puts,1);
 assert.equal((await gateway.fetch(request(grant(),icon,'https://foreign.example'),env)).status,403);
 assert.equal((await gateway.fetch(request(grant('upload',{expires:1})),env)).status,403);
 assert.equal((await gateway.fetch(request(grant('upload',{checksum:'0'.repeat(64)})),env)).status,400);
 assert.equal((await gateway.fetch(request(grant(),Buffer.concat([icon,Buffer.from('x')])),env)).status,400);
 const forged=grant().replace(/.$/,'!');assert.equal((await gateway.fetch(request(forged),env)).status,403);
});
test('private reads require an Authorization grant; public grants are object scoped and short lived',async()=>{
 const bucket=storage(),env={ASSETS:bucket,GRANT_PUBLIC_KEY:publicKey};await gateway.fetch(request(grant()),env);
 const privateUrl=`https://files.example/api/v1/files?grant=${grant('private')}`;
 assert.equal((await gateway.fetch(new Request(privateUrl),env)).status,403);
 const good=await gateway.fetch(new Request('https://files.example/api/v1/files',{headers:{Authorization:`Bearer ${grant('private')}`}}),env);
 assert.deepEqual(Buffer.from(await good.arrayBuffer()),icon);
 const publicRead=await gateway.fetch(new Request(`https://files.example/api/v1/files?grant=${grant('public')}`),env);
 assert.equal(publicRead.status,200);assert.equal(publicRead.headers.get('content-type'),'image/png');
 assert.equal(publicRead.headers.get('access-control-allow-origin'),'*');
 assert.equal(publicRead.headers.get('cache-control'),'no-store');
});
test('CORS preflight permits only configured or owned preview origins',async()=>{
 const env={ASSETS:storage(),GRANT_PUBLIC_KEY:publicKey};
 const allowed=await gateway.fetch(new Request('https://files.example/api/v1/files',{method:'OPTIONS',headers:{Origin:origin}}),env);
 assert.equal(allowed.status,204);assert.equal(allowed.headers.get('access-control-allow-origin'),origin);
 assert.equal((await gateway.fetch(new Request('https://files.example/api/v1/files',{method:'OPTIONS',headers:{Origin:'https://foreign.example'}}),env)).status,403);
});
test('public listing preserves language tiers and official provenance without unrelated fallback',async()=>{
 const fetchOriginal=globalThis.fetch;
 const rows=[{...metadata,id:asset},{...metadata,id:game,provenance:'community',language_kind:'localized',language_tags:['es']},{...metadata,id:'00000000-0000-4000-8000-000000000003',language_kind:'localized',language_tags:['en']}];
 globalThis.fetch=async()=>Response.json(rows);
 try{const service=createAssetService('https://project.example','sb_secret_test_fixture_not_a_real_key','https://files.example',privateKey);
 const response=await service.public(new Request(`https://api.example/api/v1/games/${game}/assets?language=es`));
 const body=await response.json();assert.equal(body.data.length,2);assert.equal(body.data[0].language_tags[0],'es');assert.equal(body.data[1].fallback,'global');
 assert.match(body.data[0].file_url,/https:\/\/api.example\/api\/v1\/assets\//);
 const invalid=await service.public(new Request(`https://api.example/api/v1/games/${game}/assets?language=und`));assert.equal(invalid.status,400);
 }finally{globalThis.fetch=fetchOriginal;}
});
test('finalization decodes actual stored bytes before calling the asset registration transaction',async()=>{
 const original=globalThis.fetch;let finalized=false;
 globalThis.fetch=async(url,options)=>{
  const path=new URL(url).pathname;
  if(path.endsWith('admin_asset_upload'))return Response.json({object_key:key,metadata,completed_at:null});
  if(path==='/api/v1/files'){assert.match(options.headers.Authorization,/^Bearer /);return new Response(icon);}
  if(path.endsWith('admin_asset_complete')){const body=JSON.parse(options.body);assert.equal(body.p_validation.width,32);assert.equal(body.p_validation.checksum_sha256,checksum);finalized=true;return Response.json(asset);}
  throw Error('Unexpected request');
 };
 try{const service=createAssetService('https://project.example','sb_secret_test_fixture_not_a_real_key','https://files.example',privateKey);
 assert.deepEqual(await service.admin({userId:game,sessionId:asset},'complete',{id:asset},origin),{id:asset});assert.equal(finalized,true);
 }finally{globalThis.fetch=original;}
});
