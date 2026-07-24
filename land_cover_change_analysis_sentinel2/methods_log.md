# Methods log — Sentinel-2 10 m land cover (5 GN)

## 2026-07-22 — Project setup

- New folder: `land_cover_change_analysis_sentinel2/` (Landsat folder left unchanged)
- GEE project: `mount-lavinia-based-analyses`
- AOI: copied dissolved GN5 from Landsat project (~3.22 km²)
- Companion note: Landsat 30 m study covers ~2000 / ~2015 / ~2025; this study upgrades spatial detail for 2018–2025

## Composites (Phase 2 equivalent)

- Collection: `COPERNICUS/S2_SR_HARMONIZED`
- Mask: SCL keep classes 2,4,5,6,7; cloud filter `CLOUDY_PIXEL_PERCENTAGE < 60`
- Scale: reflectance / 10000
- Bands: B2,B3,B4,B8,B11,B12 → blue,green,red,nir,swir1,swir2 + NDVI, NDBI, MNDWI
- Composite: median; Dec–Mar; export EPSG:32644 @ **10 m**; AOI + 300 m buffer

| Epoch | Window | Scenes | Raster |
|-------|--------|--------|--------|
| y2018 | 2017-12-01 → 2019-03-31 | 18 | 227 × 394 |
| y2020 | 2019-12-01 → 2021-03-31 | 39 | 227 × 394 |
| y2025 | 2024-12-01 → 2026-03-31 | 35 | 227 × 394 |

## Classification + change

- Index-seeded Random Forest (sklearn), 200 trees, per-epoch models, 70/30 hold-out
- Hold-out OA: y2018 1.00; y2020 0.99; y2025 0.97 (index-seed labels; not field survey)
- Change pairs: 2018→2020, 2020→2025, 2018→2025

## Zone change (~2018 → ~2025, ha)

| Zone | Built-up Δ | Vegetation Δ |
|------|------------|--------------|
| Full GN5 | +7.10 | −1.55 |
| Mount Lavinia GN | +0.95 | +0.36 |
| Other 4 GNs | +6.12 | −1.90 |

Note: shorter interval than Landsat 2000→2025, so magnitude of change is smaller; 10 m resolves more local structure.

## Synthesis

- Deep dive: entire Mount Lavinia GN
- Outputs under `outputs/synthesis/` and `outputs/maps/context_y2025_*`
- Design brief: `outputs/synthesis/design_synthesis.md`

## Per-GN metrics

- Script: `scripts/05_per_gn_metrics.py`
- Metrics per GN × epoch (y2018/y2020/y2025):
  - built_up_pct / ha (class 1)
  - green_pct / ha (class 2)
  - soft_surface_pct / ha (classes 2+3+4+5)
- Outputs:
  - `outputs/tables/per_gn_metrics.csv` (plain)
  - `outputs/tables/per_gn_metrics.xlsx` (headers bold + center + color-coded by metric group)
  - `outputs/figures/per_gn_built_green_soft_bars.png`
