# Phase 8 — Refresh 100 m sensitivity (post open_space cleanup)

## Purpose

Re-run the isolated **100 m** snap sensitivity scenario and rebuild the 50-vs-100 compare package after Phase 7 removed parking misclassification from `open_space`. The live dashboard stays on the locked **50 m** baseline.

## Why

Phase 7 refreshed package-root 50 m outputs and `scenarios/snap_50m/`, but deferred 100 m. Pre-cleanup `scenarios/snap_100m/` and `scenarios/compare/` were therefore stale relative to the cleaned POI inventory.

## Locked defaults

| Item | Value |
|------|-------|
| Primary / dashboard | **50 m** (unchanged; no republish) |
| Sensitivity | **100 m** under `scenarios/snap_100m/` only |
| POI inventory | Phase 7 cleaned `02_pois/pois_access_primary.geojson` |
| Package-root network/origins | Must not be mutated by the 100 m runner |

## Commands

```bash
python scripts/10_run_snap_scenario.py --snap-m 100
python scripts/11_compare_snap_scenarios.py
python 00_manifest/validate_phase8.py
```

## Outputs

| Path | Role |
|------|------|
| `scenarios/snap_100m/` | Isolated clean-graph + 100 m snap + access + maps + findings |
| `scenarios/snap_50m/` | Phase 7 archive (compare baseline; not rebuilt in Phase 8) |
| `scenarios/compare/` | KPI table, hex ID diffs, difference map, `COMPARE.md` |

## Dashboard

`public/data/walk-accessibility/` and synthesis WA1–WA3 are **not** updated in this phase.

## Validation

`python 00_manifest/validate_phase8.py` → **PASS**

## Done when

- `snap_100m` regenerated from cleaned POIs
- Compare KPIs consistent with Phase 7 50 m baseline
- Package-root snap tolerance remains 50 m
- Validator prints **PASS**
