---
uid: 3c085e1c-3909-4622-b603-86a872213006
kind: element
title: Mount Lavinia — Land Cover Change Analysis
domain: land_cover_change_analysis
---

# Mount Lavinia — Land Cover Change Analysis

Urban design / studio project: multi-temporal land cover change for the **5 GN study area** (Mount Lavinia, Kawdana West, Watarappala, Wathumulla, Wedikanda).

All project files live in this folder only.

## Locked setup (Phase 1)

| Item | Value |
|------|--------|
| GEE Cloud project | `mount-lavinia-based-analyses` |
| GEE script repo | `users/thanujals/Land_cover_analysis_GEE` |
| Epochs | ~2000, ~2015, ~2025 |
| Season | Dec–Mar dry-season composites |
| Classes | built-up, vegetation, open/bare, water/wetland, beach/sand |
| Area CRS | EPSG:32644 (UTM zone 44N) |
| Study area | ~3.22 km² (~322 ha) |

## Folder layout

```
land_cover_change_analysis/
  aoi/                 # Dissolved GN5 boundary + area stats
  data/raw/composites/ # Landsat median GeoTIFFs + manifest
  data/processed/      # Classified rasters (Phase 3+)
  scripts/             # Local Python helpers
  gee/                 # Earth Engine init + composite builders
  outputs/maps/
  outputs/tables/
  outputs/figures/     # RGB composite previews
  config.json          # Locked project parameters
  methods_log.md       # Decisions & run log
```

## Prerequisites

1. `earthengine-api` installed
2. `earthengine authenticate` completed
3. `earthengine set_project mount-lavinia-based-analyses`
4. Earth Engine API enabled and project registered for EE

Verify:

```powershell
python -c "from pathlib import Path; import sys; sys.path.insert(0, r'E:\mount-lavinia-dashboard\land_cover_change_analysis'); from gee.ee_init import init_ee; init_ee(); import ee; print(ee.Image('USGS/SRTMGL1_003').getInfo()['type'])"
```

Expected: `Image`

## Re-run AOI prep

From repo root or this folder:

```powershell
python E:\mount-lavinia-dashboard\land_cover_change_analysis\scripts\01_prepare_aoi.py
```

Outputs:

- `aoi/aoi_gn5_dissolved.geojson` (WGS84, for GEE)
- `aoi/aoi_gn5_dissolved_32644.geojson` / `.shp` (UTM, for area / QGIS)
- `aoi/aoi_stats.json`

## Re-run Phase 2 composites

```powershell
python E:\mount-lavinia-dashboard\land_cover_change_analysis\scripts\02_build_composites.py
```

Outputs:

- `data/raw/composites/composite_y2000.tif` / `y2015` / `y2025` (9 bands @ 30 m, EPSG:32644)
- `data/raw/composites/composite_manifest.json`
- `outputs/figures/composite_y*_rgb.png`

Bands: `blue, green, red, nir, swir1, swir2, NDVI, NDBI, MNDWI`

## Re-run Phase 3 classification + change

```powershell
python E:\mount-lavinia-dashboard\land_cover_change_analysis\scripts\03_classify_and_change.py
```

Requires: `scikit-learn`, `geopandas`, `rasterio`, `matplotlib`, `pandas`

Key outputs:

- `data/processed/classified_y*.tif`
- `data/processed/training_samples_y*.geojson`
- `outputs/tables/area_by_class.csv`, `accuracy_by_epoch.csv`, `transition_*.csv`
- `outputs/maps/classified_y*.png`, `change_builtup_gain_veg_loss_*.png`
- `outputs/figures/class_area_stacked.png`

Hold-out OA (index-seeded RF): y2000 **0.95**, y2015 **0.98**, y2025 **0.96**

## Re-run Phase 4 validation + design synthesis

```powershell
python E:\mount-lavinia-dashboard\land_cover_change_analysis\scripts\04_validation_and_synthesis.py
```

Covers **all 5 GNs**, with deeper focus on the **entire Mount Lavinia GN** (Galle Road on maps for context only).

Key outputs:

- `outputs/synthesis/design_synthesis.md`
- `outputs/synthesis/site_01_*.png` … `site_08_*.png`
- `outputs/synthesis/focal_sites.geojson`
- `outputs/tables/area_by_zone_y2000_y2025.csv`
- `outputs/maps/context_y2025_osm_overlay_gn5.png`
- `outputs/maps/context_y2025_mount_lavinia_focus.png`
