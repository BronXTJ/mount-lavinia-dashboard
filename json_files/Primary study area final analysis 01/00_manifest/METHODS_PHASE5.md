---
uid: fb009234-19bb-47be-938f-3bbae1065a46
kind: element
title: Phase 5 — Urban maturation (primary hex grid)
domain: json_files
---

# Phase 5 — Urban maturation (primary hex grid)

## Output

- `05_maturation/maturation_primary_hex.geojson`
- `05_maturation/maturation_primary_summary.json`
- Builder: `00_manifest/build_maturation_phase5.py`

## Components

1. **Shannon entropy / mixed-use** — land-use `Main_C` areas per hex (EPSG:3857 intersection)
   - `entropy_raw = -Σ p_i ln(p_i)` (0 if fewer than 2 classes)
   - `mixed_use = entropy_raw / ln(k)`
   - `entropy_norm = entropy_raw / max(entropy_raw)` over norm-eligible cells

2. **Accessibility** — 5000 m centrality only
   - Mean `NQPDA5000` and `BtA5000` of road segments intersecting each hex
   - Each max-normalized over seed-eligible cells; `accessibility = 0.5 * (close_norm + bet_norm)`

3. **Land-use diversity** — `Density_V` from Phase 4

4. **UMI** = `(entropy_norm + accessibility + landuse_div) / 3`

## Tiers

- High: UMI > 0.35  
- Medium: 0.15 – 0.35  
- Low: UMI < 0.15  

## Norm-eligible / edge

`is_edge == false` AND `entropy_raw > 0` AND `accessibility > 0`  

Edge/incomplete cells stay on the map; they do not set max-norm scales.

## Dashboard aliases

Primary field names plus QGIS-truncated aliases (`1entropy_i`, `1normalize`, `1average_c`, `1normali_1`, `1landuse_d`, `1normali_2`, `1urban mat`, ` final_ent`, ` final_mui`).

## Phase 5 complete when

`python 00_manifest/validate_phase5.py` prints **PASS**.
