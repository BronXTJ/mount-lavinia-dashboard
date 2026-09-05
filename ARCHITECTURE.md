# Architecture

Mount Lavinia Urban Analytics Dashboard is a Vite + React SPA. GitHub Pages hosts a static build at `/mount-lavinia-dashboard/`. Analysis runs offline; the browser only reads prepared JSON, GeoJSON, and rasters under `public/data/`.

## Runtime shape

```
src/main.jsx          ErrorBoundary + global error listeners
src/App.jsx           Sidebar, lazy routes, route ErrorBoundary
src/tabs/             One file per top-level route
src/components/       Maps, panels, synthesis, issues, land cover, environmental
src/hooks/            Layer loaders (return shape + `error`)
src/lib/dataClient.js Shared JSON fetch (cache, dedupe, abort, ?v= hash)
src/constants/        URL builders, ramps, copy
src/utils/            Pure stats / formatting
src/features/behaviour-analysis/  Movement tab (already a feature folder)
```

## Data flow

1. Studio GIS and Excel live in `json_files/` (partially local-only).
2. `npm run prepare-data` writes `src/data/*.json` and `public/data/**`.
3. `npm run data:manifest` hashes `public/data` (also invoked at the end of prepare-data).
4. Layer hooks call `fetchJson` / `fetchJsonOrNull`. Land-cover overlays and Export Maps rasters use `withAssetVersion`. Failed loads surface `LayerLoadError`.

What-if closeness/betweenness is the exception: a local FastAPI worker at `127.0.0.1:8787` runs sDNA. GitHub Pages cannot host sDNA. `/health` is open; `/v1/jobs*` require the pairing token printed at worker startup.

## Routes

| Path | Tab |
|------|-----|
| `/` | Overview |
| `/focus-area?sub=` | Centrality, Density, Maturation, Walk Access, Network Form |
| `/land-use` | Land use |
| `/connectivity` | Movement & behaviour |
| `/land-cover` | Land-cover change |
| `/environmental` | Thermal comfort / UHI |
| `/synthesis` | Findings |
| `/problems` | Issues & potentials |
| `/export-maps` | Static export previews |

## Follow-up structure (not in this slice)

- Move more tabs into `src/features/<domain>/` only when imports can move without a mass rename.
- Shared `MapLayer` primitive — only if it does not force a rewrite of every map.
- `checkJs` / JSDoc across `src/` — high churn until hook contracts stabilize.
- Colour ramps stay as-is.
