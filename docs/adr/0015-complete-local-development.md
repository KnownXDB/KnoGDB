# 0015: Complete local product development

Status: accepted. Supersedes the fixture-only runtime in ADRs 0013 and 0014.

## Decision

The default development command runs the real application, with local Supabase
PostgreSQL/Auth/Studio/mail, the existing versioned migrations and the real asset
Worker on the local Workers runtime with persistent R2 storage. Vite serves React
with Fast Refresh over HTTPS. Backend changes rebuild/restart the API and Worker.
No default administrator or password is seeded. Explicit local account creation
uses a private interactive password and the same allowlist/membership mechanism.

Netlify and local HTTP adapters share createApplication and domain/infrastructure
modules. Local transport exceptions require an explicit server-side mode and only
accept 127.0.0.1 services. Hosted defaults keep HTTPS and modern secret keys.
Auth, Secure cookies, CSRF, live membership, validation, checksum, grants,
moderation, rights and API publication rules remain active locally.

Local certificates and signing keys are generated independently into ignored
.local; service credentials are captured from local CLI status only in memory.
The backend receives configuration through process IPC, not command arguments.
Database volumes and R2 files persist across restarts. Shutdown does not reset
data. Hosted projects, signing keys and buckets are never used by local commands.

Deployment is a separate explicit operator action. No dev command invokes deploy,
remote database push, remote linking or Cloudflare publishing. Netlify configuration
builds the same React application and exposes the shared server through Functions.

## Limits

Local R2 implements the provider runtime and binding but cannot prove CDN,
provider quota or multi-region behavior. Local Auth/mail does not prove production
email delivery. Full end-to-end local validation and cloud acceptance are distinct.
Docker is required for local PostgreSQL/Auth. TLS trust is a local developer step.
