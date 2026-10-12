# ADR 0006: Asset language classification and original content

- Status: accepted
- Date: 2026-10-12

## Decision

Global means language-neutral: the asset has no linguistic text and is not tied
to a language. It does not mean a geographic region, an unknown language or a
default English fallback. Classify each asset individually by its actual content.
No role is automatically Global; a hero or icon with localized text has a language.

Model the classification explicitly as either global or localized. A localized
asset must have at least one validated language tag; Global has no language tags.
Support multiple tags for artwork that actually contains multiple languages.
Use language tags rather than country codes: en, es, es-ES, es-419, pt-BR,
zh-Hans and zh-Hant are examples. UI labels may display EN, ES or full names.
Regional language variants describe language, not asset distribution territory.

Unknown classification is incomplete metadata and requires review. Do not treat
it as Global. Regional eligibility, when genuinely required, remains a separate
optional restriction; it is not inferred from a language label.

## Identity and provenance

Translated game names and artwork belong to the same internal Game identity.
Classifying artwork does not create another Game, Release or copy of the file.
Persist language classification on the editorial asset, independently from file
bytes and assignments. Assignment scope cannot silently relabel the same asset.
Track changes and moderation decisions with provenance.

Official/original content is prioritized in the API and public web. Keep verified
official provenance, community authorship and original bytes versus generated
derivatives as separate concepts. A community submission is not official because
it is approved, and an official source does not establish redistribution rights.

Preserve original submitted bytes privately. Approved originals that satisfy the
published role policy are the primary public rendition. Do not silently replace
them with resized or recompressed derivatives. An incompatible source remains
private; an approved normalized derivative must be identified explicitly and must
not be advertised as the original. Original delivery still requires publication
approval and recorded distribution rights.

## Contribution and administration

Community contributors select the artwork language or Global during submission.
Moderators verify text, classification, provenance, rights and role requirements.
The same language selector and rules apply to official ingestion and administration.
Do not auto-detect or approve language solely from filenames, title language,
uploader location or OCR. Evidence can assist review but does not replace it.

## Selection contract

Filter by publication, approval, rights, game/release scope, role, optional territory
restrictions and active event period before applying language selection.
Prefer verified official assets within each compatible language tier; allow an
explicit official-only filter and expose origin so clients can inspect the result.
Never return unrelated-language official artwork ahead of a compatible candidate.

For a requested localized language, prefer an exact language match, then an
explicitly permitted base-language fallback, then Global. A regional variant is
not a fallback for another regional variant unless a policy permits it. Never
fall back automatically from Spanish to English, or vice versa.

A Global-only query returns only Global artwork. Listing without a language
filter exposes all available classifications; it must not guess English. A best
asset request without language context selects Global or reports no compatible
asset. Return requested and effective classification, fallback reason, origin,
asset revision and original/derivative rendition metadata.

Tie-breaking within a tier uses published event/base rules and editorial priority,
then a stable identifier. At event expiry use the approved base asset. Do not use
the newest upload alone as an approval or priority signal.

## Acceptance criteria

- One Game exposes localized headers in several languages and a Global hero.
- A hero containing text requires localized classification.
- Contributors cannot submit localized artwork without a language.
- Global-only selection never returns localized artwork.
- A missing localized asset uses Global, not an unrelated language.
- Matching official originals are preferred; community and derivatives are labeled.
- Rejected, unlicensed or unpublished originals remain unavailable publicly.

These are implementation requirements, not implemented API behavior.
