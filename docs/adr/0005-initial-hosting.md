# ADR 0005: Initial hosting

- Status: superseded by ADR 0007; never provisioned
- Date: 2026-10-12

## Decision

Host the public web, administration frontend and Node.js API as separate Render
services. Use managed PostgreSQL in the same region as the API, with private
database connectivity. Store original assets and derivatives in private
Cloudflare R2 buckets, accessed only by the backend through an S3-compatible API.

These are actual infrastructure dependencies, not domain or feature names.
Provider dashboards manage infrastructure. KnownGDB's administrative backend and
panel manage catalog data, moderation, API credentials, plans and consumption.

A custom domain is not required for local development or a test deployment using
provider HTTPS URLs. Select a stable domain before external service launch.
Configure origins, sessions and redirects explicitly; never hardcode provider URLs
into domain models or asset metadata returned as permanent public identifiers.

## Environments and security

Use local database and test storage during development. Staging and production
must have isolated data, storage credentials and service credentials. Do not
provision or commit production secrets as part of documentation changes.

Backend validates authorization, moderation and consumption policies before
serving assets through the API. Buckets remain private. Streaming through the
backend can incur hosting transfer charges even when storage has different
pricing; measure this before choosing a caching or delivery architecture.

## Alternatives and consequences

Keeping compute and PostgreSQL together reduces initial network and operational
complexity compared with separate managed database hosting. Separate storage
keeps binaries outside relational tables and application disks.

Budget, region, account access, availability, recovery targets and provider plans
remain deployment prerequisites. No accounts, services, domain or paid plans have
been created by accepting this ADR. Revisit the choice if measurements justify it.

## References

- https://render.com/docs/web-services
- https://render.com/docs/postgresql-creating-connecting
- https://developers.cloudflare.com/r2/get-started/s3/
