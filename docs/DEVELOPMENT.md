# Development and deployment status

## Available preview

The development service provides public health and paginated published-title
reads, plus individual administrator sign-in and audited title/localization writes.
It is not the complete MVP. Asset uploads/delivery, MFA, genres, organizations,
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
Hosted public reads return an empty published catalog; admin requests without a
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
