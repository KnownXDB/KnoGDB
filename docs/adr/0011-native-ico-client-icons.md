# 0011 — Native original ICO client icons

Status: accepted, 2026-10-12. Supersedes the proposed ICO conversion in ADR 0009.

Accept original ICO containers for Client Icon without conversion, extraction as
an output, resizing or recompression. The exact uploaded bytes/checksum are stored
under an immutable .ico key and delivered with image/vnd.microsoft.icon. Browser
image/x-icon and filename hints normalize only the metadata MIME value; server
validation establishes the actual format. ICO is not accepted for unrelated roles.

Validate the icon directory (type, reserved values, entry count, offsets, ranges
and no overlapping images). Support 1–64 images: embedded single-frame PNGs and
uncompressed 40-byte DIB headers at 1/4/8/16/24/32 bits, complete pixel/mask planes
and valid palette indices. Decode embedded PNGs for inspection without producing
new files. Require an actual 256x256 image; retain every other resolution, including
larger embedded PNGs whose directory dimensions use the zero sentinel. Enforce
16 MiB, 16 million aggregate decoded pixels and 8192px per PNG axis. Unsupported
compressed/legacy DIB encodings fail explicitly as invalid assets. Cursors fail.

Native ICO previews use the original file/blob and browser support. No derivative
is presented as original. Review, provenance, language/Global, rights/publication,
immutable grants and quota policies remain the same as for other originals.

Validation covers valid PNG/DIB containers, multiple resolutions, malformed entries,
truncation, overlap, role mismatch, required size and exact Worker byte delivery.
The provided AION 2 ICO validates with seven images (including 256 and 512) and its
497513 bytes remain unchanged. Reference for format structure:
https://learn.microsoft.com/en-us/windows/win32/menurc/resource-file-formats.
