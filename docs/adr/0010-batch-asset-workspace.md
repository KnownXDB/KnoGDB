# 0010 — One title asset workspace and batch review

Status: accepted, 2026-10-12.

Manage a title's originals in one workspace. Title information is a collapsible
secondary editor. Shared upload defaults provide source, provenance and language;
each queued file can independently override role and language/Global. Dimensions
suggest a role, never establish approval or language. Adding multiple files or
using drop keeps a visible per-file queue. Intake remains administrator-only.

Uploads are sequential with per-file errors and resumable finalization for stored
originals. A failed file does not hide or undo successful originals. The queue is
capped at 30 files; existing per-admin/day and conservative storage budgets remain.
Automatic thumbnail reads run with at most three concurrent requests. Object URLs
are released on refresh/title change/sign-out. Full-size previews open in-place.

After a successful set, collapse intake and preselect the new assets for review.
The grid exposes thumbnails, roles, language, provenance and readable review/state
labels together. Selection supports approving privately, approving/publishing,
rejecting and withdrawing in one action. A distribution rights reference is entered
once for the selected set when publishing. A review note remains optional; no dates
are requested by the basic workspace. Original bytes remain unchanged.

Batch review accepts 1–100 distinct UUIDs scoped to one game, verifies the live
administrator and executes in one database transaction. Lock rows in stable UUID
order, preserve existing validity metadata, call the existing review policy and
record one audit event per asset. Missing/foreign assets or invalid permissions
roll back the entire batch; no partial approval is presented as success.

The frontend is split into the existing auth/catalog module and a dedicated asset
workspace module, keeping the current native controls/style system and zero extra
frontend dependencies. API/schema tests and desktop/mobile browser interaction
checks are required. Browser authorization mocks must not be represented as real
credential/storage acceptance. Current ICO conversion remains deferred and queue
errors state that explicitly; community intake and production MFA/quotas remain
separate milestones.
