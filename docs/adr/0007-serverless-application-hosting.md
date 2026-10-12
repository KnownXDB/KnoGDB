# ADR 0007: Serverless application hosting and domain readiness

- Status: accepted; deployment pending account configuration
- Date: 2026-10-12
- Supersedes: ADR 0005

## Decision

Use Netlify for the public web, administration frontend and the catalog/control
API. Use Supabase PostgreSQL and authentication. Use private Cloudflare R2 storage
and a Worker for file upload and delivery. These are three providers with separate
responsibilities; do not add another database, authentication or storage service.

The catalog backend uses short-lived serverless Node.js handlers, not a persistent
NestJS server. Separate transport, domain and persistence so provider adapters do
not define the data model. Start with native HTTP APIs and add dependencies only
when necessary. Browser clients consume the KnownGDB API, not database tables.

Netlify Free has shared credits and pauses when exhausted. R2 activation is a
billing subscription; verify its checkout before enabling it. Do not activate paid
plans, automatic recharge or billable upgrades without explicit authorization.
No hosted availability or free production capacity is guaranteed by this ADR.

## Domain and security

Configure public origins per environment. The future topology is the root domain
for the public web, admin for administration, api for the control API and assets
for file upload/delivery, each as a subdomain except the public root.

Provider URLs are development configuration, never permanent asset identifiers.
Store object keys and asset IDs; derive links at response time. Allowlist exact
origins, including preview origins individually; do not allow wildcard credentialed
CORS. Configure authentication callbacks and redirects explicitly.

Cookies are host-only, Secure and HttpOnly, with CSRF protection. An admin origin
must not receive infrastructure credentials. Cross-origin sessions must be tested
with real provider URLs and again with custom hosts; cookie policy is not assumed
to work across unrelated provider domains. Prefer a same-origin admin proxy to
the control API so administrative sessions do not require third-party cookies.

## First increment

Create an executable typed API and contract, a relational schema with explicit
publication and provenance, language classification and deny-by-default access.
Add frontend and asset processing in subsequent verifiable increments. Do not
expose unimplemented admin features or healthchecks as a completed MVP.

Accounts, project identifiers, secret configuration, initial administrator
provisioning and real hosted validation remain deployment prerequisites.
