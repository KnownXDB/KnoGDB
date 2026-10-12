import sharp from 'sharp';
import { parseAssetLanguage } from './asset-language.js';
import { validateIco } from './ico-policy.js';
export const maxAssetBytes = 16 * 1024 * 1024;
export const roles = ['header','capsule','hero','logo','icon','client_icon'] as const;
export type AssetRole = typeof roles[number];
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
    await image.raw().toBuffer();
    return {width:metadata.width,height:metadata.height,mime_type:mime,byte_size:bytes.byteLength};
  } catch {
    throw new Error('invalid_asset');
  }
}
