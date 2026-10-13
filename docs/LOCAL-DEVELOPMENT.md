# Complete local development

## Prerequisites and first start

Install Node.js 22.12 or later and a Docker-compatible Linux container runtime.
On Windows, Docker Desktop with WSL2 is supported. Start Docker before development.
Docker is the local PostgreSQL/Auth runtime, not another hosted service.

```sh
npm ci --ignore-scripts
npm run dev:check
npm run dev
```

The first start downloads database/Auth/Studio/mail containers. The command applies
the repository migrations to the local database, starts the real asset Worker with
local R2, starts the shared product API and then serves both React frontends.
No remote Supabase project, R2 bucket or Netlify account is required for this.

| Component | Local address |
| --- | --- |
| Public web | https://127.0.0.1:5173/ |
| Administration | https://127.0.0.1:5173/admin/ |
| Public API | https://127.0.0.1:5173/api/v1/health |
| Administrative API | https://127.0.0.1:5173/admin/api/v1/admin/ |
| Asset gateway | https://127.0.0.1:5173/asset-gateway/api/v1/health |
| Database/Auth REST | http://127.0.0.1:54321 |
| PostgreSQL | 127.0.0.1:54322 |
| Database/Auth Studio | http://127.0.0.1:54323 |
| Local email inbox | http://127.0.0.1:54324 |

A locally generated self-signed TLS certificate preserves Secure admin cookies.
Accept it in your development browser or import `.local/tls.crt` into your local
trust store. Do not disable production TLS/cookie protection to develop locally.
Local services bind to loopback; do not expose their ports to a public network.
The launcher creates a dedicated loopback Docker network and checks the actual
published bindings. On Docker Desktop versions that ignore the network default,
it recreates only this project's affected containers with explicit loopback ports,
preserving their configuration and volumes. Failure leaves services stopped and
does not launch the application. Unused cloud AI/S3 integrations are disabled.

## Local administrator

In another terminal while services are running:

```sh
npm run dev:admin
```

Enter your chosen local email and password privately in that terminal. The
password is not echoed, put in command arguments or saved to a file. The command
creates a confirmed Auth user through the local Auth service and explicitly adds
the email to the local allowlist. The real membership trigger grants access.
There are no default accounts or passwords. Local Studio manages existing users.

## Iteration and persistence

Web/admin React components and CSS use Fast Refresh. Edit `frontend/web` or
`frontend/admin`. Backend changes under `src` rebuild and restart the actual API;
Worker changes under `workers` rebuild/restart the local asset gateway. Failed
compilation does not replace the last running backend.

Database/Auth state lives in Docker volumes. Assets and independently generated
signing/TLS keys live under ignored `.local`. They survive application restarts.
CLI status credentials stay in server memory and are not injected into Vite.
Never copy hosted secrets into frontend environment variables.

New schema changes require versioned migrations. Create them with
`npx supabase migration new <name>` and apply only locally with
`npx supabase db push --local`. Restarting `npm run dev` also applies pending local
migrations. Do not reset a local database containing valuable work. Stopping is
non-destructive:

```sh
# Ctrl+C stops frontend, API and Worker; database services remain available.
npm run dev:stop
```

`dev:stop` stops this project's containers while preserving their volumes.
It never uses `--no-backup`, `--all`, remote push or deploy.

## Verification and deployment

```sh
npm run verify
npm run test:local
npm run build
```

The integration suite uses real local Auth, PostgreSQL migrations/RPCs and the
actual Worker/R2 runtime. It creates scoped synthetic test data, verifies secure
sessions/CSRF, checksum and immutable intake, moderation/rights/audit, byte-exact
delivery, persistence across a Worker restart and membership revocation, then
cleans up its own fixtures. It never targets hosted URLs.

Netlify can connect this repository using its committed `netlify.toml`: build
`npm run build`, publish `build/web`, Functions `netlify/functions`. The same React
build and shared application run hosted, using server-only platform environment
variables. Local `.local`, Docker data and local credentials are never uploaded.
Keep automatic publishing disabled if every deployment should be manual. Linking
the repo does not authorize schema pushes, asset publishing or production promotion.

When you choose to deploy, use the Netlify UI or your authenticated CLI. For the
existing fixed development preview:

```sh
npx netlify-cli@27.12.0 deploy --alias development --draft --context deploy-preview
```

Build/deploy on Linux for the native decoder, or include the matching pinned Linux
optional packages when deploying Functions from Windows. Hosted configuration
must already contain the server credentials for the selected deployment context.
Database migrations and Worker publishing are separate, deliberate deployment
steps; a web build cannot silently perform them. Production still requires the
documented MFA/recovery, backup and quota gates.

Local R2 tests do not prove provider CDN/quotas/multi-region behavior. Local mail
does not prove production email delivery. Both require hosted acceptance later.
