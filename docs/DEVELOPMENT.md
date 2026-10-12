# Development and deployment status

## Available preview

The development service provides public health and paginated published-title
reads, plus individual administrator sign-in and audited title/localization writes.
It is not the complete MVP. Asset upload/delivery configuration, MFA, genres, organizations,
releases, API quotas, account recovery and tested backups remain pending.

Hosting is Netlify Functions/web, Supabase PostgreSQL/Auth and a private Cloudflare
R2 bucket. No paid plan or automatic production deployment is enabled.

## Local checks

Use Node.js 22 or later:

    npm ci --ignore-scripts
    npm run verify
    npm run dev:api

The local launcher serves public API checks on loopback port 8787. The admin
requires HTTPS hosting for its Secure cookie and is verified on an isolated preview.
Set SUPABASE_URL and SUPABASE_SECRET_KEY privately on the server. Never expose
these through browser variables, logs, process arguments, documentation or Git.
The launcher does not automatically load .env. Example values remain empty.

## Database and authorization

Applied migrations, matching the remote history:

- 20261012194157_catalog_foundation.sql: private games, localizations and assets.
- 20261012195146_administrative_catalog.sql: private admin membership/allowlist,
  persistent sign-in throttling and transactional, audited administration functions.

Anonymous and authenticated database roles cannot read the private tables or
execute administrative functions. The backend verifies Auth tokens, active
membership and a live session for every protected request. RLS without public
policies deliberately denies direct clients. The security advisor reports seven
informational notices under this backend-only model, with no warning/error finding.
See the [RLS notice explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Rollback-only checks covered confirmed-account provisioning, private drafts,
review-before-publication, stale edits, audit records, membership revocation and
sign-in throttling. No synthetic accounts or titles were retained.

## First administrator

The maintainer's chosen email is configured only in the private database allowlist.
No account, password or default administrator is seeded in repository migrations.
In the project's Supabase dashboard, open Authentication > Users > Add user >
Create new user. Enter the privately agreed email and a strong personal password,
and select email auto-confirm when offered. Do not paste the password in chat,
source files, terminal arguments or tickets. The confirmed account automatically
receives the allowlisted membership. Sign into the hosted /admin/ page using that
Auth account; this is separate from a Supabase dashboard account.

Actual credential sign-in by the maintainer remains unverified until the account
exists. Password-based development access must not be promoted to production
before MFA/AAL2 enforcement and recovery have been implemented and tested.

## Netlify preview configuration

Project knowngdb is in the existing DevMe Free workspace. Local linkage is ignored
under .netlify. GitHub auto-deploy remains disconnected. Use explicit CLI previews
with --context deploy-preview; do not promote automatically.

SUPABASE_URL is populated for Deploy Previews. SUPABASE_SECRET_KEY is marked secret
and populated only for that context. Free plan scopes also expose it to trusted
builds/runtime, so never run untrusted code using this credential. The secret is
never sent to the browser, even though the administrative UI is publicly readable.

Temporary admin route: /admin/. Future admin.<domain> will use ADMIN_ORIGIN and a
same-origin admin API proxy, without changing database identity or stored file keys.

## Storage gateway

The knowngdb bucket uses Standard storage. Public r2.dev access is disabled. No
custom bucket domain is configured. Valid originals will be retained. The only
lifecycle rule aborts incomplete multipart uploads after seven days.

The Worker at https://knowngdb-assets.mvuljevasdev.workers.dev/api/v1/health
returns health with upload/delivery disabled. All file operations fail closed.
No assets have been uploaded by this increment.

## Validation evidence

The unit/security suite covers payload bounds, language validation, secure cookie
responses, server token verification, membership revocation, CSRF, throttling and
sanitized errors. Database rollback tests additionally verify write transactions.
Hosted public reads now return the real, approved AION 2 title; admin requests without a
session return 401 and mutations without the required origin return 403.

Browser plugin not available: regular Playwright with local Chrome checked desktop
1280px and mobile 390px. Page identity, nonblank content, responsive width, password
clearing, title creation, localized editing preserving UUID and sign-out passed.
Authorized UI interactions used mocked API responses; they do not establish real
password sign-in or a retained end-to-end write. No page runtime errors occurred.
Expected 401 requests at anonymous startup are not JavaScript runtime errors.
Screenshots and the temporary QA script are outside Git.

## Current hosted preview

Preview URL and validation date are recorded in the pull request. The public API
and admin UI are deployed explicitly from the reviewed work branch; production
has not been promoted. Auth account creation is the remaining maintainer action
for real administrator sign-in validation.

## Asset ingestion increment (2026-10-12)

Migration 20261012201644_asset_ingestion.sql is applied. The admin now includes
original upload, language/Global classification, provenance, private preview and
review with rights reference, reason and optional validity dates. PostgreSQL
functions and the publication view remain service-only. Ordinary Auth users cannot
execute them. The new native decoder dependency is sharp, pinned in the lockfile.

The maintainer created a protected Netlify placeholder and a context-only API update configured the generated ASSET_SIGNING_PRIVATE_KEY privately for Deploy Previews. The API confirmed is_secret=true before and after the update. No private key was printed, stored in Git or retained in local plaintext files. ASSET_GATEWAY_ORIGIN is configured; the Worker uses only the matching public verification key. Netlify Free scopes include trusted builds/functions/runtime. The temporary marker was replaced and must never be used as a real credential.

The matching API and Worker configuration has been deployed for preview validation. No files were uploaded during this increment. The existing title API and real AION 2 publication remain operational. The exact preview URL and final HTTP validation are recorded in the PR.

New API routes:

- GET /api/v1/games/{game_id}/assets: up to 100 published, currently valid originals;
  optional language (global or a real tag), role and official_only filters.
  Language matching returns exact then Global, never an unrelated language.
- GET /api/v1/assets/{asset_id}/file: eligibility check followed by a 60-second
  object-scoped signed redirect. Stable links do not contain storage credentials.
- Admin /assets: list by game_id; /assets/prepare, /complete, /preview and /review
  require live administrator authorization. Mutations require origin/action checks.

Publication is a separate review action. Official provenance does not prove rights.
File validation never rewrites originals. Each valid asset starts private/in_review.
See ADR 0009 for byte/pixel limits, logo thresholds, grants and intake budget.
Community intake is not open: only administrators can upload in this increment.
No best-asset/event priority or full pagination contract is implemented yet.

The public-file grant can remain usable for at most 60 seconds after withdrawal.
Metadata/list and all new issuance honor current publication and validity immediately.
The initial 1 GiB intake budget conservatively counts all upload reservations,
including failed/expired ones, to avoid hiding orphaned storage. The daily cap is
60 intents per administrator. Reconciliation, public transfer quotas, retention,
MFA and monitored cost ceilings remain production gates.

Validation: 28 unit/security tests passed. Rollback-only database checks verified
private intake, rights requirements, future validity, approval, withdrawal,
duplicates, auditing and revoked admin access; no synthetic assets were retained.
Playwright/local Chrome checked 1280px desktop and 390px mobile, file selection,
Global classification, upload completion, private preview, rights rejection and
approval. Authorized network responses were mocked and no page runtime errors
occurred. Real storage upload/download remains pending a real administrator-driven upload. Screenshots and temporary scripts remain outside Git.

Local AION 2 original icon/header/capsule/hero files passed full decoding and the
role policy. Its logo failed the transparency/trim policy; no file was modified.
Its client icon is ICO: extraction is deferred and ICO is not accepted by this UI.

Windows CLI deployments bundle Linux-native decoder modules explicitly. Before a
Windows deployment, install the lockfile dependencies and make the pinned optional
@img/sharp-linux-x64 and @img/sharp-libvips-linux-x64 packages available locally
(e.g. npm pack the exact locked versions outside Git and extract under node_modules).
On Linux CI/builds, npm ci installs those matching optional packages normally.
netlify.toml treats sharp as external and includes @img modules. A hosted public
health response confirmed the native module can load on the deployed Linux runtime;
this is not equivalent to real file finalization. Do not skip that end-to-end check.

Security advisor review on 2026-10-12: eight informational RLS-without-policy
notices are intentional for backend-only tables. One Auth warning reports disabled
leaked-password protection; the provider documents it as Pro-and-above functionality.
No paid upgrade was enabled. See https://supabase.com/docs/guides/auth/password-security
for that plan constraint. This does not remove the pending MFA/recovery production
gates and is not reported as a zero-warning security audit.

Final hosted check (2026-10-12, source commit e76290c):
https://6acd44a8c04ecac28e92871c--knowngdb.netlify.app/admin/.
The existing title API returns AION 2 (200). Its asset listing returns 200 with an
empty array, an unavailable asset file returns 404, and private asset listing
without an admin session returns 401. The Worker reports signed intake/delivery;
a file request without a capability returns 403. These checks establish routing,
configuration and access rejection, not a completed real-file ingestion.
Final suite: 28 tests and exact-source repository-policy CI passed. No actual
private signing value was printed or stored in Git; directory/history secret scans
reported no findings. The maintainer must perform the first real upload/review and
verify the downloaded checksum. No production promotion or release tag was made.

Review reason is optional as of migration
20261012211104_optional_asset_review_reason.sql. Blank/omitted explanations are
stored as JSON null; no rationale is fabricated. Actor, decision, timestamp and
publication state remain audited, and distribution rights remain required for
publication. Rollback checks verified approval/rejection without an explanation
and withdrawal with an explanation, preserving the audit record.

The current admin now uses a per-title asset workspace (ADR 0010): multi-file
queue with common metadata/per-file role and language, simultaneous thumbnail
review, full-size previews and one-click batch decisions. Migration
20261012211532_batch_asset_review.sql scopes 1–100 distinct IDs to one title and
atomically audits every review. Uploads stay sequential and expose partial failures
per row. Thumbnail requests use concurrency three. A note is optional and basic
review has no date controls. The previous single-file/review editor was replaced.
