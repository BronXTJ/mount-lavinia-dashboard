# Cul-de-sac Phase 4 — Density / UMI cross

## Purpose

Cross Phase 1–3 cul-de-sac inventory with Density (FSI/GSI) and Urban Maturation (UMI) on the shared 100 m primary hex grid.

## Inputs

| Input | Role |
|-------|------|
| `culdesac_hex_walk.geojson` | Phase 3 hexes with ≥1 cul-de-sac (`hex_id`, `culdesac_n`) |
| `culdesacs_walk.geojson` | Phase 3 primary points with `hex_id` |
| `density-analysis/density_primary_hex.geojson` | `FSI`, `GSI`, `Density_V`, `is_valid` |
| `urban-morpho/urban-maturation/maturation_primary_hex.geojson` | `umi`, `tier`, `entropy_norm`, `accessibility`, `is_valid_maturation` |

## Method

1. Left-join density + maturation attrs onto Phase 3 cul-de-sac hexes by `hex_id` (= `id`).
2. Propagate the same attrs onto each primary point via its `hex_id`.
3. Roll up by maturation `tier`: n, share, median stub, mean FSI, mean UMI.
4. Mean/median FSI among cul-de-sac hexes with `is_valid`; mean/median UMI with `is_valid_maturation`.
5. Crosstab `depth_class` × maturation `tier`.

## Outputs

- `public/data/network-form/culdesac_hex_density_umi.geojson`
- `public/data/network-form/culdesacs_density_umi.geojson`
- `public/data/network-form/culdesac_density_umi_summary.json`

## Script / validation

```bash
python scripts/network_form/05_culdesac_density_umi.py
python scripts/network_form/validate_culdesac_phase4.py
```

## Dashboard

Network Form FAB toggle **Cul-de-sac × UMI** (UMI stepped choropleth on joined hexes); detail panel maturation-tier rollup; cul-de-sac popups show UMI and FSI when joined.
