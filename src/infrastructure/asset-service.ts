import { createHash } from 'node:crypto';
import { assetMetadata, maxAssetBytes, roles, validateAsset } from '../domain/asset-policy.js';
import { languageRank, parseAssetLanguage } from '../domain/asset-language.js';
import { signGrant } from './asset-grants.js';
import type { Identity } from './admin-gateway.js';
export interface AssetService {
  admin(actor:Identity,route:string,body:Record<string,unknown>,origin:string):Promise<unknown>;
  public(request:Request):Promise<Response>;
}
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
function date(value:unknown) {
  if(value===null||value===undefined||value==='')return null;
  if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new Error('invalid_request');
  return new Date(value).toISOString();
}
async function limitedBytes(response:Response,limit:number) {
  const reader=response.body?.getReader();if(!reader)throw new Error('invalid_asset');
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
    if(size>limit){await reader.cancel();throw new Error('invalid_asset');}chunks.push(value);}
  if(size!==limit)throw new Error('invalid_asset');return Buffer.concat(chunks);
}
export function createAssetService(projectUrl:string,secret:string,workerUrl:string,privateKey:string):AssetService {
  const project=new URL(projectUrl),worker=new URL(workerUrl);
  for(const url of [project,worker])if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('service_not_configured');
  if(!secret.startsWith('sb_secret_')||!privateKey)throw new Error('service_not_configured');
  async function remote(path:string,body?:unknown) {
    const response=await fetch(new URL(path,project),{method:body===undefined?'GET':'POST',
      headers:{apikey:secret,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),
      redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!response.ok){const failure=await response.json().catch(()=>({})) as {message?:string;code?:string};
      const known=['admin_forbidden','invalid_request','game_not_found','upload_not_found','asset_not_found','duplicate_asset','rate_limited','storage_budget_reached','invalid_asset'];
      throw new Error(failure.code==='23505'?'duplicate_asset':known.includes(failure.message ?? '')?failure.message:'service_unavailable');}
    return response.json();
  }
  const rpc=(name:string,actor:Identity,data:Record<string,unknown>)=>remote(`/rest/v1/rpc/${name}`,{p_actor:actor.userId,p_session:actor.sessionId,...data});
  function fileGrant(metadata:Record<string,unknown>,key:string,operation:'upload'|'private'|'public',origin='') {
    return signGrant({key,operation,expires:Math.floor(Date.now()/1000)+(operation==='public'?60:300),
      bytes:Number(metadata.byte_size),checksum:String(metadata.checksum_sha256),mime:String(metadata.mime_type),origin},privateKey);
  }
  return {
    async admin(actor,route,body,origin) {
      if(route==='prepare') {
        const metadata=assetMetadata(body);
        const intent=await rpc('admin_asset_prepare',actor,{p_data:metadata}) as {id:string;object_key:string};
        return {id:intent.id,upload_url:new URL('/api/v1/files',worker).href,
          upload_grant:fileGrant(metadata,intent.object_key,'upload',origin),expires_in:300};
      }
      if(route==='complete') {
        if(!uuid(body.id))throw new Error('invalid_request');
        const upload=await rpc('admin_asset_upload',actor,{p_upload:body.id}) as {object_key:string;metadata:Record<string,unknown>;completed_at:string|null};
        if(upload.completed_at)return {id:body.id};
        const metadata=assetMetadata(upload.metadata);
        const response=await fetch(new URL('/api/v1/files',worker),{headers:{Authorization:`Bearer ${fileGrant(metadata,upload.object_key,'private')}`},
          redirect:'error',signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw new Error(response.status===404?'upload_not_found':'service_unavailable');
        const bytes=await limitedBytes(response,Math.min(metadata.byte_size,maxAssetBytes));
        const checksum=createHash('sha256').update(bytes).digest('hex');
        if(checksum!==metadata.checksum_sha256)throw new Error('invalid_asset');
        const validation=await validateAsset(bytes,metadata.role,metadata.mime_type);
        return {id:await rpc('admin_asset_complete',actor,{p_upload:body.id,p_validation:{...validation,checksum_sha256:checksum}})};
      }
      if(route==='list') {
        if(!uuid(body.game_id))throw new Error('invalid_request');
        return {data:await rpc('admin_assets',actor,{p_game:body.game_id})};
      }
      if(route==='preview') {
        if(!uuid(body.game_id)||!uuid(body.id))throw new Error('invalid_request');
        const rows=await rpc('admin_assets',actor,{p_game:body.game_id}) as Record<string,unknown>[];
        const asset=rows.find(row=>row.id===body.id);if(!asset)throw new Error('asset_not_found');
        return {preview_url:new URL('/api/v1/files',worker).href,
          preview_grant:fileGrant(asset,String(asset.object_key),'private')};
      }
      if(route==='review'||route==='review-batch') {
        if(!['approved','rejected','withdrawn'].includes(String(body.decision))||
          typeof body.publish!=='boolean'||(body.reason!=null && (typeof body.reason!=='string'||body.reason.length>2000))||
          typeof body.rights_reference!=='string'||body.rights_reference.length>4000)throw new Error('invalid_request');
        if(body.publish&&(body.decision!=='approved'||!body.rights_reference.trim()))throw new Error('rights_required');
        if(route==='review-batch') {
          if(!uuid(body.game_id)||!Array.isArray(body.ids)||body.ids.length<1||body.ids.length>100||
            !body.ids.every(uuid)||new Set(body.ids).size!==body.ids.length)throw new Error('invalid_request');
          return {ids:await rpc('admin_asset_batch_review',actor,{p_game:body.game_id,p_assets:[...body.ids].sort(),
            p_decision:body.decision,p_publish:body.publish,p_rights:body.rights_reference,
            p_reason:typeof body.reason==='string'?body.reason.trim()||null:null})};
        }
        if(!uuid(body.id))throw new Error('invalid_request');
        return {id:await rpc('admin_asset_review',actor,{p_asset:body.id,p_decision:body.decision,p_publish:body.publish,
          p_rights:body.rights_reference,p_reason:typeof body.reason==='string'?body.reason.trim()||null:null,p_from:date(body.valid_from),p_until:date(body.valid_until)})};
      }
      throw new Error('not_found');
    },
    async public(request) {
      const url=new URL(request.url);
      const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'*'}});
      if(request.method!=='GET')return json({error:'method_not_allowed'},405);
      try {
        const list=url.pathname.match(/^\/api\/v1\/games\/([^/]+)\/assets$/);
        const download=url.pathname.match(/^\/api\/v1\/assets\/([^/]+)\/file$/);
        const id=list?.[1] ?? download?.[1];if(!uuid(id))return json({error:'invalid_request'},400);
        const query=new URL('/rest/v1/published_assets',project);
        const role=url.searchParams.get('role');
        const official=url.searchParams.get('official_only');
        if (list && role && !roles.includes(role as typeof roles[number])) return json({error:'invalid_request'},400);
        if (list && official && !['true','false'].includes(official)) return json({error:'invalid_request'},400);
        if (list && role) query.searchParams.set('role',`eq.${role}`);
        if (list && official==='true') query.searchParams.set('provenance','eq.official');
        query.searchParams.set(list?'game_id':'id',`eq.${id}`);query.searchParams.set('limit',list?'100':'1');
        query.searchParams.set('order','id.asc');
        const rows=await remote(query.pathname+query.search) as Record<string,unknown>[];
        if(!Array.isArray(rows))throw new Error('service_unavailable');
        if(download) {
          const asset=rows[0];if(!asset)return json({error:'asset_not_found'},404);
          const key=`originals/${asset.game_id}/${asset.id}.${asset.mime_type==='image/png'?'png':'jpg'}`;
          const location=new URL('/api/v1/files',worker);location.searchParams.set('grant',fileGrant(asset,key,'public'));
          return new Response(null,{status:302,headers:{Location:location.href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','Access-Control-Allow-Origin':'*'}});
        }
        const requested=url.searchParams.get('language');
        if(requested&&requested!=='global'){try{parseAssetLanguage({kind:'localized',tags:[requested]});}catch{return json({error:'invalid_request'},400);}}
        const ranked=rows.map(asset=>({asset,rank:requested?languageRank(parseAssetLanguage({kind:asset.language_kind,tags:asset.language_tags}),requested):0}))
          .filter(item=>item.rank!==null).sort((a,b)=>a.rank!-b.rank!||Number(a.asset.provenance!=='official')-Number(b.asset.provenance!=='official')||String(a.asset.id).localeCompare(String(b.asset.id)));
        return json({data:ranked.map(({asset,rank})=>({...asset,requested_language:requested,
          fallback:requested?(rank===2?'global':'exact'):null,file_url:new URL(`/api/v1/assets/${asset.id}/file`,url.origin).href})),limit:100});
      } catch {return json({error:'service_unavailable'},503);}
    },
  };
}
