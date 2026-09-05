---
uid: a7f5d30f-25ea-4e2e-af32-0e2015a6f8c6
kind: element
title: Methods log — Land cover change (5 GN)
domain: land_cover_change_analysis
---

# Methods log — Land cover change (5 GN)

## 2026-07-22 — Phase 1 setup

### Access

- Tool: Google Earth Engine (Python API `earthengine-api` 1.7.36)
- Cloud project ID: `mount-lavinia-based-analyses` (immutable)
- Auth: `earthengine authenticate` + `earthengine set_project mount-lavinia-based-analyses`
- EE API enabled; project registered for Earth Engine
- Smoke test: `ee.Image('USGS/SRTMGL1_003')` → `Image`
- Code Editor repo (scripts): `users/thanujals/Land_cover_analysis_GEE`

### Study area (AOI)

- Source: `Social_media_analysis/layers_json_files/gn5_combined_area.geojson` (5 GN features)
- GN divisions: Mount Lavinia, Kawdana West, Watarappala, Wathumulla, Wedikanda
- Dissolved outputs:
  - `aoi/aoi_gn5_dissolved.geojson` (EPSG:4326)
  - `aoi/aoi_gn5_dissolved_32644.geojson` / `.shp` (EPSG:32644)
- Total area (EPSG:32644): **322.0788 ha** (**3.220788 km²**)
- Prep script: `scripts/01_prepare_aoi.py`
- Stats file: `aoi/aoi_stats.json`

### Locked analysis decisions

| Decision | Value |
|----------|--------|
| Epochs | ~2000, ~2015, ~2025 |
| Season window | Dec–Mar (dry season) |
| Primary sensors | Landsat Collection 2 Level-2 (TM/ETM+/OLI) |
| Classes (5) | 1 built-up; 2 vegetation; 3 open/bare; 4 water/wetland; 5 beach/sand |
| Classifier (planned) | Random Forest (Phase 3) |
| Accuracy target | Overall accuracy ≥ 85% |
| Scale caveat | Neighbourhood-scale change only — not cadastral / plot-level |

### Class legend (locked)

1. Built-up / impervious — `#d73027`
2. Vegetation / tree cover — `#1a9850`
3. Open / bare / sparse vegetation — `#fee08b`
4. Water / wetland — `#4575b4`
5. Beach / sand — `#f7f7f7`

### Phase 1 status

- Folder tree created under `land_cover_change_analysis/`
- `config.json` written with GEE project, epochs, classes, AOI paths
- AOI dissolved and area recorded
- GEE init helper: `gee/ee_init.py`

### Out of scope this phase

No Landsat composites, training samples, classification, or change maps yet (Phase 2+).

## 2026-07-22 — Phase 2 dry-season composites

### Method

- Script: `scripts/02_build_composites.py` + `gee/composites.py`
- Sensors: Landsat Collection 2 Level-2 SR (TM/ETM+/OLI/OLI-2) per `config.json` epochs
- Season filter: Dec–Mar within each epoch window
- Preprocessing: `QA_PIXEL` mask (dilated cloud, cirrus, cloud, shadow, snow); SR scale `0.0000275 * DN - 0.2`
- Harmonized bands: blue, green, red, nir, swir1, swir2
- Composite: median; indices NDVI, NDBI, MNDWI
- Clip: dissolved AOI + 300 m buffer; export CRS EPSG:32644 @ 30 m
- Export: Earth Engine `getDownloadURL` → local GeoTIFF (no Drive)

### Results

| Epoch | Window | Clear scenes | Raster |
|-------|--------|--------------|--------|
| y2000 (~2000) | 1999-12-01 → 2001-03-31 | 6 | 76 × 132 px, 9 bands |
| y2015 (~2015) | 2014-12-01 → 2016-03-31 | 26 | 76 × 132 px, 9 bands |
| y2025 (~2025) | 2024-12-01 → 2026-03-31 | 51 | 76 × 132 px, 9 bands |

Outputs:

- `data/raw/composites/composite_y2000.tif`
- `data/raw/composites/composite_y2015.tif`
- `data/raw/composites/composite_y2025.tif`
- `data/raw/composites/composite_manifest.json`
- `outputs/figures/composite_y2000_rgb.png` / `y2015` / `y2025`

### Out of scope this phase

Training samples, Random Forest classification, accuracy assessment, and change maps (Phase 3+).

## 2026-07-22 — Phase 3 classification and change

### Method

- Script: `scripts/03_classify_and_change.py` + `scripts/lulc_utils.py`
- Features: 9-band composites (reflectance + NDVI, NDBI, MNDWI)
- Training: index-guided stratified pixel seeds (~80–120/class where available), 70/30 stratified hold-out
- Classifier: `sklearn` RandomForestClassifier, 200 trees, `balanced_subsample`, **separate model per epoch**
- Mapping masked to dissolved GN5 AOI
- Change pairs: y2000→y2015, y2015→y2025, y2000→y2025 (transition matrices + thematic change rasters)

### Accuracy (hold-out)

| Epoch | Samples | OA | Kappa |
|-------|---------|----|-------|
| y2000 | 382 | 0.948 | 0.926 |
| y2015 | 390 | 0.983 | 0.976 |
| y2025 | 377 | 0.965 | 0.949 |

All epochs meet OA ≥ 0.85 target. Note: labels are index-seeded (not independent field survey); OA measures consistency of RF with seed rules on held-out pixels.

### Area summary (ha inside mapped AOI extent)

| Epoch | built_up | vegetation | open_bare | water_wetland | beach_sand |
|-------|----------|------------|-----------|---------------|------------|
| y2000 | 36.9 (10.9%) | 179.4 (52.9%) | 116.5 (34.4%) | 2.5 | 3.6 |
| y2015 | 48.9 (14.4%) | 117.6 (34.7%) | 165.5 (48.8%) | 4.1 | 2.7 |
| y2025 | 62.8 (18.5%) | 109.0 (32.2%) | 162.7 (48.0%) | 2.4 | 1.9 |

Headline change (~2000 → ~2025): built-up **+25.9 ha**; vegetation **−70.4 ha**.

### Outputs

- `data/processed/classified_y2000.tif` / `y2015` / `y2025`
- `data/processed/training_samples_y*.geojson`
- `data/processed/change_theme_*.tif`
- `data/processed/classification_manifest.json`
- `outputs/tables/area_by_class.csv`, `accuracy_by_epoch.csv`, `confusion_y*.csv`, `transition_*.csv`
- `outputs/maps/classified_y*.png`, `change_builtup_gain_veg_loss_*.png`
- `outputs/figures/class_area_stacked.png`

## 2026-07-22 — Phase 4 validation panels and design synthesis

### Method

- Script: `scripts/04_validation_and_synthesis.py`
- Coverage: full 5 GN + **deep dive = entire Mount Lavinia GN** (no Galle Road side split)
- Galle Road: OSM context overlay only
- Zone stats: gn5 / mount_lavinia_gn / other_4gn from classified y2000 & y2025
- 8 focal sites (5 in Mount Lavinia, 3 in other GNs): ~2000 RGB | ~2025 RGB | change theme panels
- OSM buildings + roads clipped to AOI for context maps

### Mount Lavinia GN change (~2000 → ~2025)

- Built-up **+5.8 ha**; vegetation **−7.4 ha** (within Mount Lavinia GN alone)
- Full GN5 remains: built-up **+25.9 ha**; vegetation **−70.4 ha**

### Outputs

- `outputs/synthesis/zones/mount_lavinia_gn.geojson`, `other_4gn.geojson`, `gn5_reference.geojson`
- `outputs/tables/area_by_zone_y2000_y2025.csv`
- `outputs/synthesis/focal_sites.geojson`, `focal_site_windows.geojson`
- `outputs/synthesis/site_01_*.png` … `site_08_*.png`
- `outputs/maps/context_y2025_osm_overlay_gn5.png`
- `outputs/maps/context_y2025_mount_lavinia_focus.png`
- `outputs/synthesis/design_synthesis.md`
- `outputs/synthesis/phase4_manifest.json`
