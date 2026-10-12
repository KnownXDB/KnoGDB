# 0008 — Administrative catalog preview

Status: accepted for development validation, 2026-10-12.

## Decision

Use individual Supabase Auth accounts, with membership stored in a private catalog
schema. Bootstrap only confirmed accounts whose email is explicitly allowlisted
by the maintainer. Provisioning identifiers are private operational data and must
not enter Git, documentation or issue bodies. There are no default credentials.

The server exchanges a password for an Auth token and verifies it with Auth before
reading identity claims. The browser receives only a Secure, HttpOnly, SameSite
cookie. No refresh token is retained. Both cookie lifetime and server token-age
validation limit an administrative session to 15 minutes. Every operation verifies
active membership and a live Auth session; role claims from user metadata are unused.
Sign-out revokes the current session and clears the cookie, including on upstream
failure. The client is informed when revocation could not be confirmed.

Mutations require the exact configured admin origin and a custom action header.
ADMIN_ORIGIN is optional for isolated previews and mandatory when configuring the
future admin hostname. The admin calls its own origin through an API proxy; no
cross-subdomain cookies or browser access to infrastructure credentials is needed.

Service-only database functions perform title/localization writes and append an
audit event in the same transaction. Publication requires a reviewed primary
translation. UUID identity stays stable when adding languages; an expected update
timestamp prevents silent overwrites. Listings are capped at 100 recent titles.
Sign-in throttling is atomic and stored in PostgreSQL, rather than function memory:
six attempts per minute per platform-reported IP and per normalized email hash.

## Limits and production gates

This is a development preview, not a production-ready administration service.
MFA enrollment and AAL2 enforcement, account recovery, complete role permissions,
public API quotas, login-window retention, full pagination/search, infrastructure
budget controls and tested recovery remain required before public production use.
No paid service or automatic production promotion is enabled by this decision.

Asset upload and moderation, organizations, genres and release administration
remain separate increments. The preview must not be described as the complete MVP.
