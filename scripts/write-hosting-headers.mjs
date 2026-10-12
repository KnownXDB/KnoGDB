import { writeFileSync } from 'node:fs';
const gateway=new URL(process.env.ASSET_GATEWAY_ORIGIN ?? 'https://knowngdb-assets.mvuljevasdev.workers.dev');
if(gateway.protocol!=='https:'||gateway.username||gateway.password||gateway.pathname!=='/'||gateway.search||gateway.hash)throw new Error('Invalid asset gateway origin');
writeFileSync('public/_headers',`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' ${gateway.origin}; img-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'\n/admin/*\n  Cache-Control: no-store\n`);
