interface StoredObject { body: ReadableStream<Uint8Array>; size:number; httpEtag:string; customMetadata?:Record<string,string>; }
interface Bucket {
  get(key:string):Promise<StoredObject|null>;
  put(key:string,bytes:Uint8Array,options:unknown):Promise<unknown|null>;
}
interface Environment { ASSETS?:Bucket; GRANT_PUBLIC_KEY?:JsonWebKey; UPLOAD_ORIGINS?:string; }
interface Grant {key:string;operation:string;expires:number;bytes:number;checksum:string;mime:string;origin:string;}
const maxBytes=16*1024*1024;
const decode=(value:string)=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),char=>char.charCodeAt(0));
function originAllowed(origin:string,env:Environment) {
  return (env.UPLOAD_ORIGINS ?? '').split(',').filter(Boolean).includes(origin) || /^https:\/\/[a-z0-9]+--knowngdb\.netlify\.app$/.test(origin);
}
async function verify(token:string,env:Environment):Promise<Grant> {
  if(!env.GRANT_PUBLIC_KEY || token.length>4096) throw new Error('invalid_grant');
  const [payload,signature,...extra]=token.split('.');
  if(!payload || !signature || extra.length) throw new Error('invalid_grant');
  const key=await crypto.subtle.importKey('jwk',env.GRANT_PUBLIC_KEY,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(signature),new TextEncoder().encode(payload))) throw new Error('invalid_grant');
  const grant=JSON.parse(new TextDecoder().decode(decode(payload))) as Grant;
  const now=Math.floor(Date.now()/1000);
  if(!/^originals\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg)$/.test(grant.key) ||
    !Number.isInteger(grant.expires) || grant.expires<=now || grant.expires>now+300 ||
    !Number.isInteger(grant.bytes) || grant.bytes<1 || grant.bytes>maxBytes ||
    !/^[a-f0-9]{64}$/.test(grant.checksum) || !['image/png','image/jpeg'].includes(grant.mime)) throw new Error('invalid_grant');
  return grant;
}
async function boundedBody(request:Request,limit:number) {
  const reader=request.body?.getReader();if(!reader) throw new Error('invalid_asset');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
    if(size>limit){await reader.cancel();throw new Error('invalid_asset');}chunks.push(value);}
  if(size!==limit)throw new Error('invalid_asset');
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
}
export default {
  async fetch(request:Request,env:Environment):Promise<Response> {
    const url=new URL(request.url); const origin=request.headers.get('Origin') ?? '';
    const headers:Record<string,string>={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
    if(originAllowed(origin,env)) Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Vary':'Origin'});
    const json=(body:unknown,status:number)=>Response.json(body,{status,headers});
    if(request.method==='GET'&&url.pathname==='/api/v1/health')return json({service:'KnownGDB asset gateway',
      status:env.ASSETS?'configured':'not_configured',uploads:env.GRANT_PUBLIC_KEY?'signed':'disabled',
      delivery:env.GRANT_PUBLIC_KEY?'signed':'disabled'},env.ASSETS?200:503);
    if(request.method==='OPTIONS'&&url.pathname==='/api/v1/files'&&originAllowed(origin,env)) {
      return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'PUT, GET',
        'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'300'}});
    }
    if(url.pathname!=='/api/v1/files'||!env.ASSETS)return json({error:'asset_access_not_enabled'},403);
    try {
      const bearer=request.headers.get('Authorization')?.replace(/^Bearer /,'');
      const token=bearer ?? url.searchParams.get('grant') ?? '';
      const grant=await verify(token,env);
      if(request.method==='PUT'&&grant.operation==='upload'&&bearer&&origin===grant.origin&&originAllowed(origin,env)) {
        if(request.headers.get('Content-Type')!==grant.mime)return json({error:'invalid_asset'},400);
        const bytes=await boundedBody(request,grant.bytes);
        const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
        if(hash!==grant.checksum)return json({error:'invalid_asset'},400);
        const object=await env.ASSETS.put(grant.key,bytes,{onlyIf:{etagDoesNotMatch:'*'},
          httpMetadata:{contentType:grant.mime},customMetadata:{sha256:hash}});
        return object?json({uploaded:true},201):json({error:'immutable_object_exists'},409);
      }
      if(request.method==='GET'&&(grant.operation==='public'||(grant.operation==='private'&&bearer))) {
        if(grant.operation==='public')headers['Access-Control-Allow-Origin']='*';
        const object=await env.ASSETS.get(grant.key);if(!object)return json({error:'asset_not_found'},404);
        if(object.size!==grant.bytes || object.customMetadata?.sha256!==grant.checksum)return json({error:'invalid_asset'},409);
        return new Response(object.body,{headers:{...headers,'Content-Type':grant.mime,
          'Content-Length':String(object.size),'ETag':object.httpEtag,'Content-Disposition':'inline'}});
      }
      return json({error:'invalid_grant'},403);
    } catch(error) {return json({error:error instanceof Error&&error.message==='invalid_asset'?'invalid_asset':'invalid_grant'},
      error instanceof Error&&error.message==='invalid_asset'?400:403);}
  },
};
