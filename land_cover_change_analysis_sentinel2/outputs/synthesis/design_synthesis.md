---
uid: 95981c92-f933-433f-ba66-745936b9a35c
kind: element
title: Design synthesis — Sentinel-2 10 m land cover (5 GN + Mount Lavinia deep dive)
domain: land_cover_change_analysis_sentinel2
---

# Design synthesis — Sentinel-2 10 m land cover (5 GN + Mount Lavinia deep dive)

## Scope

- Study area: five GN divisions (Mount Lavinia, Kawdana West, Watarappala, Wathumulla, Wedikanda).
- Deep dive: **entire Mount Lavinia GN**.
- Evidence: **Sentinel-2 10 m** dry-season composites (~2018 / ~2020 / ~2025), Random Forest classes, OSM context.
- Companion study: Landsat 30 m folder covers longer archive including ~2000.
- Scale caveat: neighbourhood-scale (10 m), not plot/cadastral accuracy.

## Headline — Mount Lavinia GN

- Built-up: **51.9 → 52.8 ha** (+0.9 ha).
- Vegetation: **21.1 → 21.4 ha** (+0.4 ha).
- Open / bare: **34.9 → 34.8 ha** (-0.1 ha).
- Beach / sand: **5.8 → 5.2 ha** (-0.5 ha).

Mount Lavinia is the priority design lens: coastal identity, hotel/promenade edge, and Galle Road as the main structuring corridor (shown on maps for context only).

## Full 5 GN summary

- Built-up: **148.2 → 155.3 ha** (+7.1 ha).
- Vegetation: **59.6 → 58.1 ha** (-1.6 ha).
- Open / bare: **108.7 → 104.2 ha** (-4.5 ha).

Other four GNs combined: built-up +6.1 ha; vegetation -1.9 ha.

## Design implications

1. **Cooling / canopy** — Vegetation change across GN5 at 10 m detail, with Mount Lavinia deep-dive sites showing local conversion patterns. Protect remaining tree patches and street trees along Galle Road and secondary streets.
2. **Open space** — Open/bare dynamics often accompany vegetation decline. Treat residual soft patches in Mount Lavinia as candidate public/landscape inserts before further hard coverage.
3. **Coastal edge** — Beach/sand and Mount Lavinia frontage are identity-critical. Limit hard expansion onto soft coastal surfaces; keep visual and physical access to the shore.
4. **Flood / soft surfaces** — Soft cover (vegetation + open + wetland remnants) is the local sponge. Prioritize permeable surfaces and pocket greens where Phase 4 sites mark densification.
5. **Corridor densification** — OSM building/road overlay on ~2025 classes shows intensification along primary routes. Use Galle Road as a design armature (shade, frontage, pedestrian continuity) rather than only a traffic corridor.

## Focal validation sites

- **Site 01** (mount_lavinia_gn): Mount Lavinia veg→built (primary)
- **Site 02** (mount_lavinia_gn): Mount Lavinia veg→built (secondary)
- **Site 03** (mount_lavinia_gn): Mount Lavinia open→built
- **Site 04** (mount_lavinia_gn): Mount Lavinia coastal / beach edge
- **Site 05** (mount_lavinia_gn): Mount Lavinia remaining green/soft
- **Site 06** (other_4gn): Other GNs veg→built
- **Site 07** (other_4gn): Other GNs stable vegetation
- **Site 08** (other_4gn): Other GNs water/wetland or densification

Each site panel: `outputs/synthesis/site_XX_*.png` (~2000 RGB | ~2025 RGB | change theme).

## Key maps / tables

- `outputs/maps/context_y2025_osm_overlay_gn5.png`
- `outputs/maps/context_y2025_mount_lavinia_focus.png`
- `outputs/tables/area_by_zone_y2018_y2025.csv`
- `outputs/synthesis/focal_sites.geojson`
