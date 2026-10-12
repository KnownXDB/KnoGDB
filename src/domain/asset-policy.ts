import sharp from 'sharp';
import { parseAssetLanguage } from './asset-language.js';
import { validateIco } from './ico-policy.js';
export const maxAssetBytes = 16 * 1024 * 1024;
export const roles = ['header','capsule','hero','logo','icon','client_icon'] as const;
export type AssetRole = typeof roles[number];
const dimensions: Partial<Record<AssetRole, readonly [number,number]>> = {
  header:[920,430], capsule:[600,900], hero:[3840,1240], icon:[32,32], client_icon:[256,256],
};
export function assetMetadata(value: Record<string,unknown>) {
  if (typeof value.game_id !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value.game_id) ||
      !roles.includes(value.role as AssetRole) || !['official','community'].includes(String(value.provenance)) ||
      !['image/png','image/jpeg','image/vnd.microsoft.icon'].includes(String(value.mime_type)) ||
      (value.mime_type==='image/vnd.microsoft.icon'&&value.role!=='client_icon') ||
      typeof value.byte_size !== 'number' || !Number.isInteger(value.byte_size) || value.byte_size<1 || value.byte_size>maxAssetBytes ||
      typeof value.checksum_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.checksum_sha256) ||
      typeof value.source_reference !== 'string' || !value.source_reference.trim() || value.source_reference.length>2000 ||
      typeof value.confidence !== 'number' || !Number.isFinite(value.confidence) || value.confidence<0 || value.confidence>1) throw new Error('invalid_request');
  let language;
  try { language = parseAssetLanguage({kind:value.language_kind,tags:value.language_tags}); }
  catch { throw new Error('invalid_request'); }
  return {game_id:value.game_id,role:value.role as AssetRole,provenance:String(value.provenance),
    mime_type:String(value.mime_type),byte_size:value.byte_size,checksum_sha256:value.checksum_sha256,
    source_reference:value.source_reference.trim(),confidence:value.confidence,
    language_kind:language.kind,language_tags:[...language.tags].sort()};
}
export async function validateAsset(bytes: Uint8Array, role: AssetRole, mime: string) {
  if (!bytes.byteLength || bytes.byteLength>maxAssetBytes) throw new Error('invalid_asset');
  try {
    if(mime==='image/vnd.microsoft.icon'){
      if(role!=='client_icon')throw new Error('invalid_asset');
      return await validateIco(bytes);
    }
    const image = sharp(bytes,{limitInputPixels:16000000,failOn:'warning',animated:true});
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || (metadata.pages ?? 1)!==1 ||
        metadata.width>8192 || metadata.height>8192 ||
        (metadata.orientation !== undefined && metadata.orientation!==1) ||
        (metadata.format!=='png' && metadata.format!=='jpeg') ||
        mime !== (metadata.format==='png'?'image/png':'image/jpeg')) throw new Error('invalid_asset');
    const expected=dimensions[role];
    if (expected && (metadata.width!==expected[0] || metadata.height!==expected[1])) throw new Error('invalid_asset_dimensions');
    const {data,info}=await image.ensureAlpha().raw().toBuffer({resolveWithObject:true});
    if (role==='logo') {
      if (metadata.format!=='png' || !metadata.hasAlpha) throw new Error('invalid_logo');
      let minX=info.width, minY=info.height, maxX=-1, maxY=-1, transparent=false;
      for (let y=0;y<info.height;y++) for (let x=0;x<info.width;x++) {
        const alpha=data[(y*info.width+x)*info.channels+info.channels-1]!;
        if(alpha<255) transparent=true;
        if(alpha>=8) {minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
      }
      if (!transparent || Math.max(maxX-minX+1,maxY-minY+1)<1280 || minX!==0 || minY!==0 ||
          maxX!==info.width-1 || maxY!==info.height-1) throw new Error('invalid_logo');
    }
    return {width:metadata.width,height:metadata.height,mime_type:mime,byte_size:bytes.byteLength};
  } catch(error) {
    if (error instanceof Error && ['invalid_asset_dimensions','invalid_logo'].includes(error.message)) throw error;
    throw new Error('invalid_asset');
  }
}
