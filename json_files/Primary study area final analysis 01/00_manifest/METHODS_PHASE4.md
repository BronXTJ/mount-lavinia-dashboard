# Phase 4 — Density metrics (primary hex grid)

## Output

- `04_density/density_primary_hex.geojson`
- `04_density/density_primary_summary.json`
- Builder: `00_manifest/build_density_phase4.py`

**Inputs:** Phase 2 hex grid + Phase 3 buildings with floors.

## Aggregation

In EPSG:3857, intersect buildings with hexes:

- footprint contribution = intersection area  
- floor contribution = intersection area x Floors  

Sum per hex into `Area_build` and `Floor_Area`. Use hex `Hex_area` (boundary-clipped).

## Formulas

```
GSI = Area_build / Hex_area
FSI = Floor_Area / Hex_area
OSR = (Hex_area - Area_build) / Floor_Area   # null if Floor_Area == 0
FSI_Norm = FSI / max(FSI among valid cells)
GSI_Norm = GSI / max(GSI among valid cells)
Density_V = (FSI_Norm + GSI_Norm) / 2
```

## Valid cells (norm basis + later stats)

`FSI > 0` AND `GSI > 0` AND `OSR >= 0` AND `Hex_area > 0` AND `is_edge == false`

Edge hexes remain in the layer for map styling; they do not set the norm scale.

## Typology

Not written into GeoJSON. Dashboard classifies at runtime from valid-cell medians (`densityStats.js`).

## Phase 4 complete when

`python 00_manifest/validate_phase4.py` prints **PASS**.
