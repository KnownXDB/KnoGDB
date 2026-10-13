# Contributing

Read README.md, ROADMAP.md, AGENTS.md and the relevant architecture first.
Read SECURITY.md and GOVERNANCE.md before auth, CI or permission work.

Use small, reversible changes, neutral branch and feature names, signed commits
and an ADR for structural decisions. Do not add dependencies without explaining
their purpose and operational cost. Do not invent project IDs or production data.

The repository currently contains foundations only. Application checks will be
introduced with the workspace. For documentation, verify links, UTF-8/LF,
consistency and staged content. Once code exists, run all applicable checks before
declaring a change complete.

Do not commit credentials, binaries, database dumps or browser test output.
Product data and assets require provenance and distribution rights. External
clients access domain data through the API.
