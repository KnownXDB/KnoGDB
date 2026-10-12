# 0009 — Private original asset ingestion and delivery

Status: accepted for development validation, 2026-10-12.

The admin requests an upload intent after live Auth and membership verification.
PostgreSQL reserves an immutable UUID object key, metadata, size and checksum.
The server signs a five-minute, single-key PUT capability with an asymmetric key;
only its public verification key reaches the file Worker. The signing private key
is a hosting secret, never source, browser configuration, logs or command arguments.
Upload capabilities are passed in an Authorization header and are origin-bound.
R2 conditional creation prevents overwriting bytes or replaying a successful upload.

The browser sends bytes directly to R2 through the Worker, avoiding function request
body limits. The Worker bounds size and verifies SHA-256 before storing bytes.
The server then fetches the private original using a short-lived read capability,
fully decodes it with a native image decoder, checks the role policy and registers
an in-review asset in an audited transaction. Client metadata alone never approves
a file. Validation does not resize, recompress or silently replace original bytes.

Initial limits: PNG/JPEG only, one frame, 16 MiB, 16 million pixels and 8192px per
axis. Exact dimensions follow PRODUCT-PLAN.md. Logos require PNG with transparency,
a visible alpha threshold of 8/255, a visible dominant dimension of at least 1280px
and zero fully transparent border beyond that content threshold. Reject EXIF
orientation other than normal; correction must be explicit and identified as a
derivative. ICO extraction, animation, WebP and media are future work.

Moderation records actor, decision and reason. Publishing additionally requires
rights evidence, an approved asset, a published game and a current validity window.
Public API listings expose classification, provenance and original metadata, not
private rights evidence or storage credentials. A stable API download route checks
eligibility and redirects to an object-scoped capability valid for 60 seconds.
That public-file capability is intentionally shareable during its lifetime; it is
not an admin session or infrastructure credential. Withdrawals stop new issuance;
already issued links can remain usable for up to 60 seconds. Private reads require
Authorization rather than URL tokens. Logs/analytics must never record capabilities.

The development intake budget is conservatively capped at 1 GiB of all reserved
originals and 60 intents per administrator per day. Expired/failed reservations
remain counted until reconciliation; no automatic deletion of real validation
originals is enabled. R2 is private. These guards bound intake, not public transfer
or request charges. Full public API/file quotas and billing alerts are still a
production gate. Origin allowlists support configured domains; isolated previews
use the owned project preview hostname pattern. The API builds file links from
configuration and immutable relative keys; buying a domain requires no data rewrite.

One dependency, sharp, provides actual image decoding and alpha inspection. Header
inspection or trusting browser dimensions cannot establish image validity.
The asset table remains an initial ingestion model; file/editorial/assignment
normalization and richer releases/events will be migrated before wider catalog use.
