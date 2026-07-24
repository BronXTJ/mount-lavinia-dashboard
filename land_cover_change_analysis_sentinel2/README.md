# Mount Lavinia — Sentinel-2 10 m Land Cover Change

Companion project to the Landsat 30 m study in `../land_cover_change_analysis/`.

This folder uses **Sentinel-2 SR Harmonized at 10 m** for **~2018 / ~2020 / ~2025** (Dec–Mar dry-season composites). Landsat remains the source for the longer archive including **~2000**.

## Locked setup

| Item | Value |
|------|--------|
| GEE project | `mount-lavinia-based-analyses` |
| Sensor | `COPERNICUS/S2_SR_HARMONIZED` |
| Resolution | **10 m** |
| Epochs | ~2018, ~2020, ~2025 |
| Season | Dec–Mar |
| Classes | built-up, vegetation, open/bare, water/wetland, beach/sand |
| Deep dive | Entire Mount Lavinia GN (within full 5 GN AOI) |

## Re-run pipeline

```powershell
python E:\mount-lavinia-dashboard\land_cover_change_analysis_sentinel2\scripts\02_build_composites.py
python E:\mount-lavinia-dashboard\land_cover_change_analysis_sentinel2\scripts\03_classify_and_change.py
python E:\mount-lavinia-dashboard\land_cover_change_analysis_sentinel2\scripts\04_validation_and_synthesis.py
```

## Key outputs

- Composites: `data/raw/composites/composite_y2018.tif` / `y2020` / `y2025`
- Classified: `data/processed/classified_y*.tif`
- Tables: `outputs/tables/`
- Per-GN metrics: `outputs/tables/per_gn_metrics.xlsx` (styled) + `.csv`
- Synthesis: `outputs/synthesis/design_synthesis.md`
- Maps: `outputs/maps/`

## Relation to Landsat folder

| Question | Use |
|----------|-----|
| Change since ~2000 | Landsat 30 m folder |
| Finer urban detail 2018–2025 | **This Sentinel-2 folder** |
| Mount Lavinia coastal strip | Prefer S2 10 m + Landsat for long-term context |
