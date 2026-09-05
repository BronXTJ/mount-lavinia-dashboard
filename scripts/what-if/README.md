---
uid: d7000958-92ed-4185-860c-ec8b5565a543
kind: element
title: What-if centrality scenarios
domain: scripts
---

# What-if centrality scenarios

What-if opens with an empty map. Draw proposed links freehand (snap optional). With the **local sDNA worker** running on your Windows PC, finishing a link (or pressing ▶) recomputes NQPDA / BtA automatically. Without the worker, ▶ exports GeoJSON for offline use.

GitHub Pages cannot *host* sDNA. It *can* talk to `http://127.0.0.1:8787` after you click **Connect** and Allow local network in Chrome.

## Local worker (required for live sDNA)

Requires: sDNA at `C:\Program Files (x86)\sDNA`, `pyproj`, `pyshp`, plus FastAPI.

```bash
pip install -r scripts/what-if/api/requirements.txt
# also: pyproj, pyshp (for the scenario script)
npm run what-if:worker
```

Then open the GitHub Pages dashboard (or `npm run dev`) → Centrality → What-if.

1. If the chip says Worker offline, click **Connect**, Allow local network if Chrome asks, and paste the pairing token printed in the worker window. `/health` stays open so the chip can detect the worker without a token; `/v1/jobs*` require the token.
2. Draw a link and finish (or press ▶). KPIs and rankings fill when the job completes.

`npm run what-if` is optional (starts worker + Vite together). Live compute still uses the worker on `127.0.0.1:8787`.

API (scale-ready job contract):

- `GET /health`
- `POST /v1/jobs` — body: proposed links FeatureCollection
- `GET /v1/jobs/{id}` — `queued` | `running` | `done` | `error`
- `GET /v1/jobs/{id}/artifacts/{filename}` — `closeness_*.geojson`, `betweenness_*.geojson`, `summary.json`

Job outputs land under `json_files/Urban_morpho_analysis/_what_if_work/jobs/<id>/`.

## Manual CLI (same engine)

1. Draw links and export `proposed_links.geojson` (▶ when worker offline).
2. Save under `public/data/urban-morpho/what-if/scenarios/<id>/`.
3. Run:

```bash
python scripts/what-if/build_snap_nodes.py
python scripts/what-if/run_sdna_scenario.py --links public/data/urban-morpho/what-if/scenarios/<id>/proposed_links.geojson --out-dir public/data/urban-morpho/what-if/scenarios/<id>
```

**Never overwrite** `public/data/urban-morpho/centrality/` baseline files.
