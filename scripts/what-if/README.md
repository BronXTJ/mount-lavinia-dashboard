# What-if centrality scenarios

What-if opens with an empty map. Draw proposed links freehand (snap optional). With the **local sDNA worker** running on your Windows PC, finishing a link (or pressing ▶) recomputes NQPDA / BtA automatically. Without the worker, ▶ exports GeoJSON for offline use.

There is no baked demo scenario. GitHub Pages cannot run sDNA; the live site talks to `http://127.0.0.1:8787` when this worker is up (CORS enabled).

## Local worker (recommended)

Requires: sDNA at `C:\Program Files (x86)\sDNA`, `pyproj`, `pyshp`, plus FastAPI.

```bash
pip install -r scripts/what-if/api/requirements.txt
# also: pyproj, pyshp (for the scenario script)
npm run what-if:worker
```

Then open the dashboard (`npm run dev` or the deployed Pages site) → Centrality → What-if → draw → finish link.

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
