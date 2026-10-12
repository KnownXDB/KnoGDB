# Security Policy

## Private vulnerability reports

Do not publish secrets, personal data or exploitable vulnerability details in
issues, pull requests, comments, wikis, discussions or forums. Review logs before
sharing them.

Use **Report a vulnerability** in the canonical repository's Security tab:
https://github.com/KnownXDB/KnownGDB/security/advisories/new.
Private reporting is enabled. If it is unavailable, contact the maintainer through
a verified private channel; do not disclose the finding publicly. No security
email address has been designated. Report delivery has not been tested and must
be verified before operating the service.

## Credentials and administrative access

- Do not create shared administrative passwords or default credentials.
- Implement individual accounts, MFA, role-based permissions and revocable sessions.
- Keep API consumption keys separate from administrative permissions.
- Store secrets in the environment's private secret manager, with least privilege
  and separate development, staging and production environments.
- Never embed secrets in source code, comments, fixtures, documentation, images,
  bundles, source maps or public frontend variables.
- Do not include secrets in URLs, process arguments, logs, API responses, errors,
  reports or CI artifacts. Redact sensitive values before logging.
- Show API keys only when issued. Store appropriate hashes and identifying metadata;
  do not provide a way to retrieve the original value.
- Protect web sessions with Secure, HttpOnly and SameSite cookies, expiration and
  CSRF protection. Never send infrastructure credentials or a shared administrative
  key to the browser.
- Configuration examples must contain only empty values or clear placeholders.

## Prevention and incident response

.gitignore does not protect tracked files or prevent git add --force.
CI and scanners cannot guarantee detection of every secret. Before publishing,
review the complete history, branches, tags and public surfaces using a dedicated
scanner and manual review. Enable push protection where available.

If a credential is exposed, revoke or rotate it first, investigate the scope, then
clean history and copies as appropriate. Deleting a file does not revoke a key.
Do not reproduce secrets in incident tickets.

External pull requests run without production secrets, without self-hosted runners
and with minimal permissions. Do not execute untrusted code using
pull_request_target with credentials. Pin actions to reviewed commit SHAs.
Future deployments require protected environments and approval; do not promote
automatically.

## Supported versions and implementation status

KnownGDB has a development preview with individual Auth accounts, private admin
membership, live session checks, secure cookies, CSRF checks and audited catalog
writes. No production release is supported. MFA/AAL2 enforcement, account recovery,
public API quotas and disaster recovery are required before production use.
The preview does not provide asset uploads or the complete administrative MVP.
