# What-if centrality scenarios

What-if opens with an empty map. Draw proposed links freehand (snap optional), export GeoJSON with ▶, then recompute with sDNA locally. There is no baked demo scenario.

## Accurate recompute (sDNA)

1. In the dashboard Centrality → What-if, draw links with the pencil tool.
2. Press ▶ to download `proposed_links.geojson`.
3. Save it under `public/data/urban-morpho/what-if/scenarios/<id>/` (choose any `<id>`, e.g. `custom`).
4. Run:

```bash
python scripts/what-if/build_snap_nodes.py
python scripts/what-if/run_sdna_scenario.py --links public/data/urban-morpho/what-if/scenarios/<id>/proposed_links.geojson --out-dir public/data/urban-morpho/what-if/scenarios/<id>
```

5. Refresh the dashboard (or redeploy). Scenario layers read `NQPDA` / `BtA` from those GeoJSONs only.

Requires: local sDNA (`C:\Program Files (x86)\sDNA`), `pyproj`, `pyshp`.

**Never overwrite** `public/data/urban-morpho/centrality/` baseline files.
