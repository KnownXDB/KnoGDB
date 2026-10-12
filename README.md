# KnownGDB

**Known Games DataBase**, the desktop-first game catalog within
[KnownXDB](https://github.com/KnownXDB).

KnownGDB is an independent, API-first platform for canonical video game information,
identity resolution and curated visual assets. Desktop titles are the initial
priority; the domain supports multiple platforms, regions, languages and sources.

## Status

The project is in architectural planning. There is no runnable service, public
deployment or official domain yet. Administrative capabilities described in the
documentation are planned requirements.

## Product scope

- Stable internal game IDs, independent of names, stores and external identifiers.
- Localized titles, descriptions and genres; developer and publisher relationships.
- Platform-specific releases, editions, regions and dates with explicit precision.
- Curated assets with provenance, moderation, localization and validity periods.
- Versioned API access, configurable consumption policies and administrative control.
- A basic public web scaffold and a functional administration MVP.
- Official trailers, photographs and videos in a later phase.

## Documentation

The primary README is in English. Detailed planning documents currently use
Spanish; reviewed English and Spanish documentation is planned before publication.

- [Roadmap](ROADMAP.md)
- [Architecture](docs/architecture/overview.md)
- [Product policies](docs/PRODUCT-PLAN.md)
- [Next step](docs/NEXT-STEP.md)
- [Architecture decisions](docs/adr/)
- [Contributing](CONTRIBUTING.md)
- [Agent instructions](AGENTS.md)
- [Versioning](VERSIONING.md)
- [Security](SECURITY.md)
- [Governance](GOVERNANCE.md)
- [Project organization](docs/PROJECT-ORGANIZATION.md)
- [Planning board](https://github.com/orgs/KnownXDB/projects/1)
- [Publication checklist](docs/PUBLICATION-CHECKLIST.md)

## Technical direction

A typed server runtime, modular HTTP API, relational database, migration tooling,
private object storage and a web administration interface. Concrete implementation
dependencies belong in technical decisions, not in domain names or product identity.
Clients access published data and files through the API, never directly through
database or storage credentials.

## Authorship and license

Author and initial maintainer: **Mauricio Vuljevas**.
Canonical repository: [KnownXDB/KnownGDB](https://github.com/KnownXDB/KnownGDB).
KnownXDB organizes independent knowledge database verticals; this repository
focuses on the game catalog. Future vertical names and boundaries remain tentative.

Original code and documentation are licensed under [MIT](LICENSE).
The software is provided without warranty. This license does not grant rights to
third-party data, media or trademarks, or access to the hosted service.
