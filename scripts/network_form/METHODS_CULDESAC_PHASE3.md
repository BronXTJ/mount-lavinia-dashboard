# Cul-de-sac Phase 3 — Walk-access overlay

## Purpose

Cross Phase 1–2 cul-de-sac inventory with destination Walk Accessibility on the shared 100 m primary hex grid.

## Inputs

| Input | Role |
|-------|------|
| `culdesacs_depth.geojson` | Phase 1 primary points |
| `walk-accessibility/access_hex_classified.geojson` | `access_score`, `access_tier`, `analysis_ok`, `snap_ok` |
| `density-analysis/hex_grid_primary_100m.geojson` | Point-in-hex assignment + polygon geometry |

## Method

1. Assign each primary cul-de-sac to a primary 100 m hex (point-in-polygon on `hex_grid_primary_100m`).
2. Aggregate hexes with ≥1 cul-de-sac; left-join walk attrs by `hex_id` (= `id`) from `access_hex_classified`.
3. Attach the same walk attrs onto each assigned point.
3. Roll up by `access_tier`: n, share, median stub, depth-class counts.
4. Desert = `access_tier == low` and `analysis_ok` (live Walk Access definition).
5. Crosstab `depth_class` × `access_tier` for assigned points.

**Coverage note:** Points outside the primary hex grid stay unjoined. Excluded tier = not analysis-ok (area_ratio &lt; 0.90 or snap &gt; 100 m).

## Outputs

- `public/data/network-form/culdesac_hex_walk.geojson`
- `public/data/network-form/culdesacs_walk.geojson`
- `public/data/network-form/culdesac_walk_summary.json`

## Script / validation

```bash
python scripts/network_form/04_culdesac_walk_overlay.py
python scripts/network_form/validate_culdesac_phase3.py
```

## Dashboard

Network Form FAB toggle **Cul-de-sac × Walk Access** (tier choropleth on joined hexes); detail panel tier rollup + desert line; cul-de-sac popups show access when joined.
