# Development and deployment status

## Runtime and deployment boundary

The repository now supports complete local development of the implemented product:
React/TypeScript web/admin, the shared application API, local PostgreSQL/Auth,
versioned migrations, Studio/mail and the real Worker with persistent local R2.
See [local setup and commands](LOCAL-DEVELOPMENT.md).

The existing Netlify development preview is independent of local changes. This
increment does not deploy the React/runtime changes or promote production. The
maintainer chooses deployment timing. Netlify builds npm run build, publishes
build/web and uses netlify/functions; database and Worker publishing are separate
explicit operations. No development command targets hosted services.

## Available functionality

Individual administrative authentication checks the Auth token, live session and
active private membership for every protected operation. Secure HttpOnly cookies,
CSRF/origin checks and persisted sign-in throttling apply locally and hosted.
Canonical UUID titles support localized names/descriptions and audited editing.
Asset intake supports PNG/JPEG and native ICO Client Icons, original byte/size/hash
validation, per-file language or Global classification, private previews and atomic
batch review. Reference dimensions and logo margins/transparency do not block
originals. Public listing/delivery requires eligible publication and rights.

Local database volumes and .local R2 files persist. TLS/signing keys are generated
independently and ignored by Git; CLI service credentials stay in server memory.
The default runtime contains no simulated accounts, titles, asset storage or
permission bypass. Create your own local administrator privately with
npm run dev:admin. The old fixture-only workspace has been removed.

## Versioned database

Local startup applies the same six committed migrations as the hosted history:

- 20261012194157_catalog_foundation.sql
- 20261012195146_administrative_catalog.sql
- 20261012201644_asset_ingestion.sql
- 20261012211104_optional_asset_review_reason.sql
- 20261012211532_batch_asset_review.sql
- 20261012213419_original_ico_assets.sql

No new remote migration is introduced by the local runtime. Private catalog tables
have RLS and service-only grants; public clients use the product API rather than
direct table access. Local anonymous direct reads are denied with SQL code 42501.

## Validation and remaining work

35 domain/security tests, frontend/backend type checks and the production frontend
build pass. The committed npm run test:local suite exercises real local Auth,
PostgreSQL/RPCs and Worker/R2, including audit, immutable uploads, byte-exact delivery,
persistent storage and membership revocation; scoped fixtures are cleaned up.
Real HTTPS browser checks additionally covered login/cookies, title creation,
multiple-file PNG/ICO intake, native preview, batch review/rights, public download,
backend automatic rebuild and desktop/mobile layouts without API mocks or cloud
requests. The local security advisor reported no WARN/ERROR findings.

These checks do not prove CDN behavior, provider quotas, multi-region operations,
production email or hosted upgrade acceptance. Full organizations/genres/releases,
MFA/AAL2, recovery, public API/transfer quotas, reconciliation and tested backups
remain product/production gates. The hosted project previously reported deliberate
RLS INFO notices and a paid-plan password-protection warning; that is independent
of local database checks and has not been re-audited in this increment.

Hosting remains Netlify, Supabase and private Cloudflare R2/Worker. No paid upgrade,
new hosted service, release tag, automatic Git publishing or production promotion
was introduced. Hosted secrets remain protected in their selected platform deploy
context; do not copy them into the local frontend or repository.
