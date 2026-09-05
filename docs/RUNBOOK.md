# Runbook

## Local dashboard

```bash
npm install
npm run dev
```

Open `http://localhost:5173/mount-lavinia-dashboard/`.

```bash
npm run build
npm run preview
npm test
npm run lint
npm run test:e2e
```

## What-if worker

```bash
pip install -r scripts/what-if/api/requirements.txt
npm run what-if:worker
```

The process prints a pairing token. In the dashboard, click **Connect** and paste it. `/health` stays open so the offline chip still works without a token.

`npm run what-if` starts the Vite app with the worker proxy.

## Data

```bash
npm run prepare-data      # regenerates web layers from json_files/ — do not run casually
npm run data:manifest     # hashes public/data only; does not rewrite layers
```

Local-only (gitignored): `site intervention/`, `json_files/condo_inventory/`, `Social_media_analysis/`, `public/data/geo/condominiums_*.geojson`.

## Deploy

Laptop fallback (current live path):

```bash
npm run deploy
```

This builds, copies `dist/index.html` → `dist/404.html`, and pushes the `gh-pages` branch.

Actions deploy (optional): `.github/workflows/deploy.yml`. Before switching Pages to Actions, add repository secret `VITE_CARTO_API_KEY`. See `docs/PHASE4_DECISIONS.md`.

## Bundle analysis

```bash
npm run analyze
```

Writes `stats.html` (gitignored).

## Incidents

- **Blank map / empty KPIs:** look for the rose `LayerLoadError` banner; check the Network panel for a 404 on `public/data/`.
- **What-if never POSTs:** worker window must be running; token required; sDNA must exist at `C:\Program Files (x86)\sDNA`.
- **CSP console errors after a new third-party host:** update the CSP meta in `index.html` (`connect-src` / `img-src`).
