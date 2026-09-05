---
uid: f81c7020-066d-406d-b7b6-34f2cd12c728
kind: element
title: Cul-de-sac Phase 2 — Spatial pattern
domain: scripts
---

# Cul-de-sac Phase 2 — Spatial pattern

## Purpose

Map where Phase 1 cul-de-sacs concentrate: GN ranking by density and depth, corridor vs interior share, and counts on the shared 100 m primary hex grid.

## Inputs

| Input | Role |
|-------|------|
| `culdesacs_depth.geojson` | Phase 1 points |
| `culdesac_depth_summary.json` | Per-GN stub / depth rollups |
| `metrics_by_scope.json` | `culdesac_per_km2` |
| `density-analysis/hex_grid_primary_100m.geojson` | Primary study-area hexes (`id`) |

## Method

1. Keep `inside_primary` cul-de-sacs only (259).
2. Assign each point to a hex by point-in-polygon on the primary 100 m grid.
3. Per hex with ≥1 cul-de-sac: `culdesac_n`, mean/median stub, depth-class counts, corridor count.
4. Rank the five GNs by `culdesac_per_km2` (then `n`), attaching median stub and long-share from Phase 1.
5. Roll up corridor vs interior from Phase 1 all-GN summary.

**Coverage note:** The hex choropleth only covers the Mount Lavinia **primary** hex grid (same as Density / Walk). Cul-de-sacs outside that grid stay in GN ranking but are not drawn on the hex layer.

## Outputs

- `public/data/network-form/culdesac_hex_counts.geojson`
- `public/data/network-form/culdesac_spatial_summary.json`

## Script / validation

```bash
python scripts/network_form/03_culdesac_spatial.py
python scripts/network_form/validate_culdesac_phase2.py
```

## Dashboard

Network Form FAB toggle **Cul-de-sac hex density**; detail panel GN ranking table.
