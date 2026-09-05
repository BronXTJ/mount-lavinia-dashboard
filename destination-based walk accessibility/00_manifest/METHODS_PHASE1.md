---
uid: 244c410f-66a4-4efc-89bd-4d6d97341176
kind: element
title: Phase 1 — Accessibility POI inventory
domain: destination-based walk accessibility
---

# Phase 1 — Accessibility POI inventory

## Purpose

Build a complete daily-destination POI layer for destination-based walk accessibility over the primary study area. Replaces the incomplete context layer `pois_primary` (~147 points) for accessibility analysis only.

## Study extent

- **Primary boundary:** `01_boundary/primary_study_area_boundary.geojson` (copy from Primary study area final analysis 01)
- **Access AOI:** `01_boundary/access_aoi_500m.geojson` — primary boundary dissolved + **500 m** buffer (EPSG:3857), exported CRS84

Edge destinations outside the primary polygon but inside the AOI are kept so later hex origins near the boundary can reach nearby services.

## Sources

| Source | Path / method | Role |
|--------|----------------|------|
| OSM Overpass | Fresh pull → `02_pois/raw/osm_pois_raw.geojson` | Schools, health, transit, parks, shops, etc. |
| Google Maps places | `Social_media_analysis/cleaned/google_maps/places_gn5.csv` → `02_pois/raw/gmaps_places_raw.geojson` | Commercial / food coverage gaps |
| Old `pois_primary` | Not used as inventory | Context only; incomplete |

## Destination groups

| `dest_group` | Include |
|--------------|---------|
| `food` | supermarket, convenience, bakery, restaurant, cafe, fast_food, grocery |
| `education` | school, kindergarten, college, university |
| `health` | pharmacy, hospital, clinic, doctors, dentist |
| `transit` | bus_stop, bus_station |
| `finance` | bank, atm |
| `open_space` | park, playground |

**Excluded:** hotels, guest houses, beauty salons, and other visitor-only categories.

## Processing rules

1. Clip all POIs to `access_aoi_500m`
2. Map OSM tags / GMaps categories → `dest_group`
3. Merge OSM + GMaps
4. Within each `dest_group`, drop duplicates within **30 m** (prefer OSM when both present)
5. Set `in_primary` = point intersects unbuffered primary boundary

## Output schema

`02_pois/pois_access_primary.geojson` (Point, CRS84):

- `poi_id`, `name`, `dest_group`, `source` (`osm` | `gmaps`), `in_primary`
- `osm_key`, `osm_value` (OSM rows)
- `gmaps_category` (GMaps rows)

Summary: `02_pois/pois_access_summary.json`

## CRS

- Stored GeoJSON: CRS84 (lon/lat)
- Metric buffer / distance: EPSG:3857

## Scripts

- `scripts/01_prepare_boundary.py`
- `scripts/02_fetch_osm_pois.py`
- `scripts/03_build_pois_access.py`

## Phase 1 complete when

`python 00_manifest/validate_phase1.py` prints **PASS**.
