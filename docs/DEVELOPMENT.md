# Development and deployment status

## Implemented first increment

- Typed HTTP handler with health and paginated published-catalog reads.
- Database gateway adapter restricted to an approved publication view.
- Global/localized asset classification and explicit language fallback rules.
- Initial SQL migration with private tables, row-level security and provenance.
- Serverless hosting configuration and a local API server.

No administrative login, write endpoints, upload Worker or usable admin UI exists
in this increment. The HTML page is a development status page, not the public
product. Do not advertise this increment as the complete 4–5 title validation.

## Local checks

Use Node.js 22 or later:

    npm ci --ignore-scripts
    npm run verify
    npm run dev:api

The API listens on loopback at port 8787. GET /api/v1/health works without secrets.
GET /api/v1/games fails with 503 until storage is configured. It returns only
published games with an approved primary localization. Pagination is bounded.
All writes are rejected until authorized administrative routes are implemented.
The development contract is docs/api/openapi.yaml. Rate limiting and hosted
abuse protection are not implemented in this increment; do not expose it as
a production service. No credentials or admin routes are served by the status page.

Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY privately on the server. Do not
paste them into tickets or source files. The example file has empty placeholders;
the local launcher does not automatically load .env. Inject values through a
private shell or environment manager without printing them. Never prefix the
service key as a browser-public variable.

## Database

Review and apply supabase/migrations/202610120001_catalog_foundation.sql to an
empty development project. Do not apply it to unrelated or production data.
The migration has not been executed against a real PostgreSQL instance yet.
No production records or default administrator are seeded. Further increments
will add organizations, genres, releases and audited admin transactions.

## Netlify setup

Create an account, authorize access only to KnownXDB/KnownGDB and import the
repository. netlify.toml declares build, publish and function paths. Deploy the
approved development commit explicitly; do not wire arbitrary branch pushes to
production. Use the Free plan; leave automatic recharge disabled.

Configure server-side secrets in the hosting dashboard. Check function routing
and request/CPU limits against the hosted deployment before opening access.
Do not expose Supabase tables directly to external clients.

## Outstanding deployment inputs

Netlify account access and server-side secret configuration remain required.
The user confirmed the Supabase project URL and the real R2 bucket. Secret values are never requested in
chat. Hosted authentication, cross-origin cookies and upload behavior require
real validation; local unit tests do not establish these capabilities.

## Confirmed storage and gateway

The real bucket is knowngdb, Standard class. Public r2.dev access is disabled and
no custom bucket domain is configured. Valid uploaded originals will be retained;
never treat real validation files as disposable fixtures. The multipart lifecycle
rule aborts incomplete uploads after seven days and does not delete completed files.

workers/assets/wrangler.jsonc binds the private bucket to knowngdb-assets without
publishing storage credentials. Its first deployment only exposes a health endpoint;
all file reads and writes fail closed until authorization and publication checks
are implemented. It must not be advertised as an operational asset delivery API.

The first gateway is deployed at
https://knowngdb-assets.mvuljevasdev.workers.dev/api/v1/health.
On 2026-10-12 this returned 200 with uploads and delivery disabled; an arbitrary
file path returned 403. Bucket existence and private access were verified separately
with Wrangler. These checks do not establish an upload or catalog workflow.
