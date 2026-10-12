import { createPrivateKey, sign } from 'node:crypto';
export interface FileGrant {
  key:string; operation:'upload'|'private'|'public'; expires:number;
  bytes:number; checksum:string; mime:string; origin:string;
}
export function signGrant(grant: FileGrant, privateKey: string): string {
  const payload=Buffer.from(JSON.stringify(grant)).toString('base64url');
  const signature=sign('RSA-SHA256',Buffer.from(payload),createPrivateKey({
    key:Buffer.from(privateKey,'base64'),format:'der',type:'pkcs8',
  })).toString('base64url');
  return `${payload}.${signature}`;
}
