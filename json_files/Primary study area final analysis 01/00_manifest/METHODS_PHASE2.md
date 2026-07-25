# Phase 2 — Primary 100 m hex grid

## Output

- `02_hex_grid/hex_grid_primary_100m.geojson` — analysis hexes intersecting the primary study area
- `02_hex_grid/hex_grid_primary_100m_summary.json` — counts and area stats
- Builder: `00_manifest/build_hex_grid_phase2.py`

## Geometry

Flat-top hexagons matching the old Focus Area grid:

- Flat-to-flat (vertical) size / row spacing: **100 m**
- Column center spacing: **~86.603 m**
- Full-cell area: **~8660.25 m²**

Extent: full primary study area boundary (`01_boundary/primary_study_area_boundary.geojson`), not the old 500 m buffer.

## CRS

- Build and measure in **EPSG:3857**
- Export geometries as **CRS84** (lon/lat); metric fields stay on properties (`left`/`right`/`top`/`bottom`, `Hex_area`)

## Properties

| Field | Meaning |
|-------|---------|
| `id` | Stable integer id (1…N) |
| `row_index`, `col_index` | Grid indices |
| `left`, `right`, `top`, `bottom` | Full-hex bbox in EPSG:3857 |
| `Hex_area` | Area (m²) of hex ∩ boundary |
| `Hex_area_full` | Unclipped hex area (m²) |
| `is_edge` | True if hex not fully inside boundary (or area ratio &lt; 0.999) |

Map geometries are the **unclipped** hex outlines. Density later uses `Hex_area`.

## Edge cells

Edge hexes remain in the layer for map styling. Later density/maturation stats exclude impractical cells (same filters as the app: usable FSI/GSI/OSR, etc.).

## Phase 2 complete when

`python 00_manifest/validate_phase2.py` prints **PASS**.
