# 0013: Local interface workspace

Status: accepted.

Serve the existing public/admin files on loopback with a visibly identified,
in-memory fixture adapter. No hosted credentials or cloud adapters are loaded.
Use the actual asset validation policy for original uploads. Data and files are
discarded when the process stops; there is no production authentication bypass.

This environment supports interface iteration and simulated catalog/asset flows.
It does not prove remote authorization, database transactions, storage or quotas.
Use the hosted development preview for integration acceptance. Source edits become
visible after browser reload; restart npm run dev after TypeScript policy edits.
