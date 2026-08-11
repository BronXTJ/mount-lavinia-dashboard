# What-if centrality scenarios

## Accurate recompute (sDNA)

1. Draw links in the dashboard What-if mode (or edit `proposed_links.geojson`).
2. Export / save proposed links GeoJSON under `public/data/urban-morpho/what-if/scenarios/<id>/`.
3. Run:

```bash
python scripts/what-if/build_snap_nodes.py
python scripts/what-if/run_sdna_scenario.py --links public/data/urban-morpho/what-if/scenarios/<id>/proposed_links.geojson --out-dir public/data/urban-morpho/what-if/scenarios/<id>
```

4. Refresh the dashboard (or redeploy). Scenario layers read `NQPDA` / `BtA` from those GeoJSONs only.

Requires: local sDNA (`C:\Program Files (x86)\sDNA`), `pyproj`, `pyshp`.

**Never overwrite** `public/data/urban-morpho/centrality/` baseline files.
