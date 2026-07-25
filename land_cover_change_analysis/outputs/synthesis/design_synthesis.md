# Design synthesis — Land cover change (5 GN + Mount Lavinia deep dive)

## Scope

- Study area: five GN divisions (Mount Lavinia, Kawdana West, Watarappala, Wathumulla, Wedikanda).
- Deep dive: **entire Mount Lavinia GN** (optional deeper analysis for studio design).
- Evidence: Landsat dry-season composites (~2000 / ~2025), Random Forest classes, OSM roads/buildings context.
- Scale caveat: neighbourhood-scale (30 m), not plot/cadastral accuracy.

## Headline — Mount Lavinia GN

- Built-up: **24.1 → 29.9 ha** (+5.8 ha).
- Vegetation: **43.7 → 36.4 ha** (-7.4 ha).
- Open / bare: **49.3 → 53.4 ha** (+4.0 ha).
- Beach / sand: **2.5 → 0.9 ha** (-1.6 ha).

Mount Lavinia is the priority design lens: coastal identity, hotel/promenade edge, and Galle Road as the main structuring corridor (shown on maps for context only).

## Full 5 GN summary

- Built-up: **36.9 → 62.8 ha** (+25.9 ha).
- Vegetation: **179.4 → 109.0 ha** (-70.4 ha).
- Open / bare: **116.5 → 162.7 ha** (+46.3 ha).

Other four GNs combined: built-up +20.7 ha; vegetation -63.5 ha.

## Design implications

1. **Cooling / canopy** — Vegetation loss across GN5, with Mount Lavinia deep-dive sites showing local conversion to built-up. Protect remaining tree patches and street trees along Galle Road and secondary streets.
2. **Open space** — Open/bare increase often accompanies vegetation decline (transitional or cleared ground). Treat residual soft patches in Mount Lavinia as candidate public/landscape inserts before further hard coverage.
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
- `outputs/tables/area_by_zone_y2000_y2025.csv`
- `outputs/synthesis/focal_sites.geojson`
