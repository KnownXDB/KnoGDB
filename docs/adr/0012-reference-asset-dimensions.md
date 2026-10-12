# 0012: Reference dimensions for original assets

Status: accepted. Supersedes the role dimensions, logo trimming/transparency and
required ICO resolution rules in ADRs 0009 and 0011.

## Decision

Role dimensions are guidance, never upload requirements. Original PNG and JPEG
assets may have any dimensions within technical limits, including small, opaque
or padded logos. Preserve original bytes without cropping, resizing or conversion.
Native ICO Client Icons need no specific resolution; retain all frames and report
the largest frame by pixel area as their width and height. Equal areas retain the
first frame in directory order.

Keep format/container validation, full decoding, checksum verification, the
16 MiB file limit, 8192 pixels per axis and 16 million decoded pixels (aggregate
for ICO). Language, provenance, rights and moderated publication remain required.
Existing stored metadata is retained; new completions record actual dimensions.

## Validation

Tests accept every raster role outside its reference dimensions, small JPEG logos,
opaque and padded PNG logos, and small/multi-resolution ICOs. Corrupt files,
mismatched MIME types and malformed ICO directories remain rejected.
