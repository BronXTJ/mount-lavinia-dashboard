---
uid: 1fef1292-0aa2-4ab7-b795-e6913cda4a94
kind: element
title: GlobalBuildingAtlas — Primary Study Area extract
domain: json_files
---

# GlobalBuildingAtlas — Primary Study Area extract

**License:** CC BY-NC 4.0 for GBA heights / LoD1 attributes; ODbL for ODbLPolygon footprints. Research/non-commercial use only for height attributes.

**Tile:** `asiawest/e075_n10_e080_n05`

**Clip:** `01_boundary/primary_study_area_boundary.geojson`

## Outputs

- `gba_lod1_primary.geojson` — buildings with `height` / `var` (CRS84)
- `gba_height_primary.tif` — 3 m height raster (EPSG:3857), burned from LoD1 building heights
- `gba_primary_summary.json` — counts and QC stats

## Provenance

- ODbL polygons: https://huggingface.co/datasets/zhu-xlab/GBA.ODbLPolygon
- Extra polygons + LoD1 height JSON: https://huggingface.co/datasets/zhu-xlab/GBA.LoD1
- Paper: Zhu et al. (2025), Earth System Science Data, https://doi.org/10.5194/essd-17-6647-2025

The full mediaTUM `GBA.Height` GeoTIFF zip for this 5° tile is ~32 GB, so the clipped raster here is derived by rasterizing LoD1 building heights instead of cutting the native height mosaic.

## Citation

```
Zhu, X. X., Chen, S., Zhang, F., Shi, Y., and Wang, Y.: GlobalBuildingAtlas:
an open global and complete dataset of building polygons, heights and LoD1 3D models,
Earth Syst. Sci. Data, 17, 6647–6668, https://doi.org/10.5194/essd-17-6647-2025, 2025.
```
