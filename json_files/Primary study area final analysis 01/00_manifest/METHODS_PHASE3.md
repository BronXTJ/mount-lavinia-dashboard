# Phase 3 — Buildings + floors (Zenodo)

## Output

- `03_buildings/buildings_primary_floors.geojson`
- `03_buildings/buildings_primary_floors_summary.json`
- Builder: `00_manifest/build_buildings_floors_phase3.py`

**Source (unchanged):** `03_buildings/zenodo_buildings_raw.geojson`

## Floors rule

```
if Height < 3:  Floors = 1
else:           Floors = round(Height / 3)
Floor_Area = Area_build * Floors
```

## Area

Do **not** use the Zenodo `Area` attribute (square degrees).  
`Area_build` = polygon area in **EPSG:3857** (m²), rounded to 4 decimals.

## Properties

`FID_1`, `Height`, `Area_build`, `Floors`, `Floor_Area`  
Geometry exported as CRS84 (lon/lat), MultiPolygon.

## Phase 3 complete when

`python 00_manifest/validate_phase3.py` prints **PASS**.
