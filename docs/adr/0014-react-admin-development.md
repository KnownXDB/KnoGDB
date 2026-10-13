# 0014: React admin with Vite Fast Refresh

Status: React/Vite accepted; the fixture-only runtime is superseded by ADR 0015.

Use React and TypeScript components for sign-in, title/localization editing,
original intake, previews and batch review. Vite provides Fast Refresh and CSS
updates during development and a compiled static bundle for Netlify. These
dependencies add no hosted service or monthly charge.

The local fixture API runs on loopback port 8788 behind Vite on port 5173.
It remains explicitly isolated from hosted credentials and databases. Browser
requests use the same relative administrative API paths as hosted builds.
No authentication rules or Secure cookie requirements are weakened remotely.

Source lives in frontend/admin; build/web is ignored generated output. Netlify
publishes that output alongside the public scaffold. Vite does not load .env
files. Backend secrets remain server-only; no secret is a frontend build input.
React state owns the interface instead of direct DOM manipulation. Object URLs
and in-flight preview reads are disposed on unmount or reload.
