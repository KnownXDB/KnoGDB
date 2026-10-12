import { createServer } from 'node:http';
import handler from '../dist/netlify/functions/api.js';

const server = createServer(async (incoming, outgoing) => {
  try {
    // Construct from a fixed local origin, never an untrusted Host header.
    const request = new Request(new URL(incoming.url ?? '/', 'http://127.0.0.1:8787'), {
      method: incoming.method,
    });
    const response = await handler(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(await response.text());
  } catch {
    outgoing.writeHead(500, { 'Content-Type': 'application/json' });
    outgoing.end(JSON.stringify({ error: 'internal_error' }));
  }
});
server.listen(8787, '127.0.0.1', () => {
  process.stdout.write('Development API: http://127.0.0.1:8787/api/v1/health\n');
});
