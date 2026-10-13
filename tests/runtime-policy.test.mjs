import {test} from 'node:test';
import assert from 'node:assert/strict';
import {serviceOrigin,serviceHeaders} from '../dist/src/infrastructure/runtime-policy.js';
import {createApplication} from '../dist/src/api/application.js';

test('local configuration cannot target hosted services or bypass hosted credential restrictions',()=>{
  assert.equal(serviceOrigin('http://127.0.0.1:54321','local').hostname,'127.0.0.1');
  for(const url of ['https://example.test','http://localhost:54321','http://127.0.0.1.attacker.test','http://127.0.0.1:54321/path','http://user:pass@127.0.0.1:54321'])assert.throws(()=>serviceOrigin(url,'local'));
  assert.throws(()=>serviceOrigin('http://127.0.0.1:54321'));
  const localKey=['fixture',Buffer.from(JSON.stringify({role:'service_role',iss:'supabase'})).toString('base64url'),'fixture'].join('.');
  assert.throws(()=>serviceHeaders(localKey));assert.equal(serviceHeaders(localKey,'local').Authorization,`Bearer ${localKey}`);
  const anon=['fixture',Buffer.from(JSON.stringify({role:'anon',iss:'supabase'})).toString('base64url'),'fixture'].join('.');assert.throws(()=>serviceHeaders(anon,'local'));
});

test('shared application fails closed for admin/assets and preserves public health without configuration',async()=>{
  const handler=createApplication({});
  assert.equal((await handler(new Request('https://example.test/api/v1/health'))).status,200);
  assert.equal((await handler(new Request('https://example.test/admin/api/v1/admin/session'))).status,503);
  assert.equal((await handler(new Request('https://example.test/api/v1/assets/fixture/file'))).status,503);
});
