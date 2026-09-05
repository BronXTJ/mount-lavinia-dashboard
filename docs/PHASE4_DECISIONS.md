# Phase 4 pipeline decisions

These are the low-risk parts that shipped, and the items that stay deferred so analysis outputs do not change.

## Shipped

- `npm run data:manifest` (also runs at the end of `npm run prepare-data`) writes `public/data/manifest.json` and a copy at `src/data/assetManifest.json`.
- Each entry is a 12-character SHA-256 of the file. No GeoJSON or raster bytes are rewritten.
- `src/lib/dataClient.js` appends `?v=<hash>` when it fetches a path that appears in the manifest. Image/raster URLs that do not go through `fetchJson` still use their existing builders.

## Deferred on purpose

### Geometry quantization / thermal-grid split / PMTiles

Quantizing coordinates or splitting the ~9.7 MB thermal grid would rewrite committed analysis layers. That violates the “no pipeline re-run / no analysis output change” guarantee.

PMTiles would help the thermal grid and large GeoJSON later, but it needs a new runtime loader and a one-time conversion. Defer until you are ready to regenerate `public/data/` on purpose.

### Git LFS vs a separate data repo

`public/data/**/*.tif` stay in git: the hosted dashboard fetches them.

About 38 rasters under `json_files/` and the land-cover analysis folders were committed before the gitignore rule. New rasters there stay local. Moving the old ones to Git LFS needs GitHub LFS enabled on this account and a history rewrite or a follow-up import. Do not do that from this rollout.

### `xlsx` replacement

`prepare-data.mjs` still uses the `xlsx` package. Swapping it needs a byte-for-byte (or KPI-for-KPI) check against current `src/data/*.json`. That is a dedicated verification task, not part of this hardening pass.

### Deep-link HTTP status

GitHub Pages serves `404.html` for unknown paths. `npm run deploy` / the Actions deploy workflow already copies `dist/index.html` to `dist/404.html`, so `/focus-area` and other client routes still boot the SPA. Pages cannot return HTTP 200 for those paths without leaving the `gh-pages` branch setup. The copy trick is the supported workaround.

## GitHub Pages switch (you do this)

The live site still deploys from the `gh-pages` branch via `npm run deploy`. `.github/workflows/deploy.yml` is ready but **do not switch Settings → Pages → Source to GitHub Actions until you have set the `VITE_CARTO_API_KEY` repository secret** and are ready for a one-time cutover. Switching early would stop updates from the laptop deploy.
