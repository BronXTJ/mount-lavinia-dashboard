# Changelog

All notable changes to the Mount Lavinia Urban Analytics Dashboard are listed here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Phase 0 safety net: ESLint, Prettier, Vitest unit tests, Playwright route smoke tests with golden screenshots, and a GitHub Actions CI workflow.
- `CHANGELOG.md` so later hardening phases can be read without walking git history.
- Phase 1 worker pairing token, job-id path checks, sDNA timeout, payload caps, and 7-day job TTL.
- Shared `escapeHtml` / `safeHttpUrl` helpers; Dependabot; `.env.example`.
- Error boundary, lazy-loaded tabs, vendor chunks, and an optional Actions deploy workflow.
- Data asset manifest (`public/data/manifest.json` + bundled `src/data/assetManifest.json`) so same-origin `/data/` fetches append `?v=<hash>`.
- `docs/PHASE4_DECISIONS.md` — quantization, thermal split, PMTiles, LFS, xlsx, and Pages 404 stay deferred or already handled.
- `ARCHITECTURE.md` and `docs/RUNBOOK.md` (local What-if token, `npm run deploy` vs Actions).

### Changed

- `main` now matches the live dashboard (What-if Compare and related work from `feat/what-if-compare`).
- Layer fetches go through `src/lib/dataClient.js` (cache + in-flight dedupe). Failed layer loads show a retry banner.
- `prepare-data` writes the asset manifest after a successful regen. Geometry is already coordinate-rounded there; thermal-grid split, PMTiles, `xlsx` swap, and Git LFS for already-tracked analysis rasters stay deferred.

### Security

- Local research folders (`site intervention/`, `json_files/condo_inventory/`, `Social_media_analysis/`) and condominium inventory GeoJSON stay on disk and are not published.
- What-if worker: pairing token on `/v1/jobs*`, job-id path checks, 10-minute sDNA timeout, payload caps, and 7-day job TTL. `/health` stays open.
- Leaflet tooltips escape HTML; developer credit links go through `safeHttpUrl`.
- Content-Security-Policy meta tag; Dependabot for npm and GitHub Actions.

## [0.1.0] - 2026-09-05

### Added

- Public GitHub Pages dashboard for the Mount Lavinia primary study area: overview, focus-area analyses, land cover, environmental, issues, synthesis, and export maps.
- Local What-if sDNA worker for drawing and scoring network changes.
