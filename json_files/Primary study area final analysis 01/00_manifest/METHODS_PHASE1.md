---
uid: f26e2084-5282-4b7a-9459-427eee6e47b3
kind: element
title: Phase 1 — Primary study area locked inputs
domain: json_files
---

# Phase 1 — Primary study area locked inputs

## Purpose

Self-contained input package for density and urban maturation analysis over the **full primary study area** (five Grama Niladhari divisions combined). Phase 1 only copies, names, and validates sources. No hex grid, floors, density, or UMI yet.

## Study extent

- **Boundary:** `01_boundary/primary_study_area_boundary.geojson` (single study polygon)
- **Divisions:** `01_boundary/gn5_divisions.geojson` (Mount Lavinia, Kawdana West, Watarappala, Wathumulla, Wedikanda)

This replaces the old Focus Area **500 m buffer** as the analysis extent for the new primary layers.

## Locked sources (copies; originals untouched)

| Role | Package file |
|------|----------------|
| Buildings + height | `03_buildings/zenodo_buildings_raw.geojson` |
| Land use | `06_context/landuse_primary.geojson` |
| Roads | `06_context/roads_primary.geojson` |
| POIs | `06_context/pois_primary.geojson` |
| Closeness 5000 m | `07_centrality/closeness_5000m.geojson` |
| Betweenness 5000 m | `07_centrality/betweenness_5000m.geojson` |

**Height / floors source:** Zenodo only (`Height`, `Area`, `FID_1`). Do **not** use `No1_study_boundary_related_analysis/clipped_buildings` for floors (no height).

**Later floors rule:** `Floors = round(Height / 3)`; if `Height < 3` then `Floors = 1`.

**Centrality for maturation accessibility:** 5000 m only. App field map: closeness = `NQPDA5000`, betweenness = `BtA5000`.

## CRS

- **Stored GeoJSON:** CRS84 (lon/lat)
- **Later metric work (hex size, areas):** EPSG:3857, then export results back to CRS84 for the dashboard

## Edge / impractical hex cells (later phases)

Edge or partial hexes stay on the map with their allocated style. They are **excluded** from medians, norms, typology splits, and KPI summaries (same approach as existing density / maturation filters: e.g. require usable FSI/GSI/OSR; skip incomplete maturation cells).

## Placeholders

- `02_hex_grid/` — Phase 2
- `04_density/` — Phase 4
- `05_maturation/` — Phase 5

## Phase 1 complete when

`python 00_manifest/validate_phase1.py` prints **PASS** (all files, counts, required fields, height QC, and bbox intersection checks succeed).
