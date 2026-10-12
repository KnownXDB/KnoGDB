import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createHash,generateKeyPairSync} from 'node:crypto';
import {validateAsset,assetMetadata} from '../dist/src/domain/asset-policy.js';
import {signGrant} from '../dist/src/infrastructure/asset-grants.js';
import gateway from '../dist/workers/assets/index.js';
const mime='image/vnd.microsoft.icon';
const png=await sharp({create:{width:256,height:256,channels:4,background:'#458c8e'}}).png().toBuffer();
function container(frames){const directory=Buffer.alloc(6+frames.length*16);directory.writeUInt16LE(1,2);directory.writeUInt16LE(frames.length,4);let offset=directory.length;for(let i=0;i<frames.length;i++){const p=6+i*16,frame=frames[i];directory[p]=frame.width>=256?0:frame.width;directory[p+1]=frame.height>=256?0:frame.height;directory.writeUInt16LE(1,p+4);directory.writeUInt16LE(32,p+6);directory.writeUInt32LE(frame.bytes.length,p+8);directory.writeUInt32LE(offset,p+12);offset+=frame.bytes.length;}return Buffer.concat([directory,...frames.map(f=>f.bytes)]);}
const ico=container([{width:256,height:256,bytes:png}]);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('native ICO validates an embedded 256px PNG without modifying original bytes',async()=>{
 const before=hash(ico);const value=await validateAsset(ico,'client_icon',mime);
 assert.deepEqual(value,{width:256,height:256,frame_count:1,mime_type:mime,byte_size:ico.length});assert.equal(hash(ico),before);
 await assert.rejects(()=>validateAsset(ico,'hero',mime),/invalid_asset/);
});
test('multi-resolution ICO preserves raw DIB and larger PNG frames',async()=>{
 const dib=Buffer.alloc(40+16*16*4+16*4);dib.writeUInt32LE(40,0);dib.writeInt32LE(16,4);dib.writeInt32LE(32,8);dib.writeUInt16LE(1,12);dib.writeUInt16LE(32,14);
 const large=await sharp(png).resize(512,512).png().toBuffer();
 const file=container([{width:16,height:16,bytes:dib},{width:256,height:256,bytes:png},{width:512,height:512,bytes:large}]);
 const result=await validateAsset(file,'client_icon',mime);assert.equal(result.frame_count,3);assert.equal(result.width,512);assert.equal(result.height,512);
});
test('ICO accepts small originals and rejects malformed/truncated/overlapping entries and cursors',async()=>{
 const small=await sharp(png).resize(32,32).png().toBuffer();
 assert.equal((await validateAsset(container([{width:32,height:32,bytes:small}]),'client_icon',mime)).width,32);
 const badOffset=Buffer.from(ico);badOffset.writeUInt32LE(1,18);
 const cursor=Buffer.from(ico);cursor.writeUInt16LE(2,2);
 const overlap=container([{width:256,height:256,bytes:png},{width:256,height:256,bytes:png}]);overlap.writeUInt32LE(overlap.readUInt32LE(18),34);
 for(const bytes of [ico.subarray(0,20),badOffset,cursor,overlap])await assert.rejects(()=>validateAsset(bytes,'client_icon',mime),/invalid_asset/);
 const compressed=Buffer.alloc(40+16*16*4+16*4);compressed.writeUInt32LE(40);compressed.writeInt32LE(16,4);compressed.writeInt32LE(32,8);compressed.writeUInt16LE(1,12);compressed.writeUInt16LE(32,14);compressed.writeUInt32LE(1,16);
 await assert.rejects(()=>validateAsset(container([{width:16,height:16,bytes:compressed},{width:256,height:256,bytes:png}]),'client_icon',mime),/invalid_asset/);
});
test('ICO metadata is restricted to Client Icon and gateway returns exact original bytes/MIME',async()=>{
 const game='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002';
 const metadata={game_id:game,role:'client_icon',mime_type:mime,byte_size:ico.length,checksum_sha256:hash(ico),source_reference:'Fixture',confidence:1,language_kind:'global',language_tags:[],provenance:'official'};
 assert.equal(assetMetadata(metadata).mime_type,mime);assert.throws(()=>assetMetadata({...metadata,role:'icon'}),/invalid_request/);
 const keys=generateKeyPairSync('rsa',{modulusLength:2048});const key=`originals/${game}/${id}.ico`,origin='https://development--knowngdb.netlify.app';let stored=null;
 const env={GRANT_PUBLIC_KEY:keys.publicKey.export({format:'jwk'}),ASSETS:{async put(actual,bytes){assert.equal(actual,key);stored=bytes;return {};},async get(actual){assert.equal(actual,key);return{body:new Response(stored).body,size:stored.length,httpEtag:'"fixture"',customMetadata:{sha256:hash(ico)}};}}};
 const signingKey=keys.privateKey.export({format:'der',type:'pkcs8'}).toString('base64');
 const grant=operation=>signGrant({key,operation,expires:Math.floor(Date.now()/1000)+60,bytes:ico.length,checksum:hash(ico),mime,origin},signingKey);
 assert.equal((await gateway.fetch(new Request('https://files.example/api/v1/files',{method:'PUT',headers:{Origin:origin,Authorization:`Bearer ${grant('upload')}`,'Content-Type':mime},body:ico}),env)).status,201);
 const download=await gateway.fetch(new Request(`https://files.example/api/v1/files?grant=${grant('public')}`),env);
 assert.equal(download.headers.get('content-type'),mime);assert.deepEqual(Buffer.from(await download.arrayBuffer()),ico);
});
