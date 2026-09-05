---
uid: 9c7eec9f-5e3b-4ddc-8d24-3b415af80af0
kind: element
title: Phase 7 — Clean open_space POIs + recompute 50 m
domain: destination-based walk accessibility
---

# Phase 7 — Clean open_space POIs + recompute 50 m

## Purpose

Remove Google Maps parking misclassification from `open_space`, rebuild the POI inventory from existing raw extracts, recompute the locked **50 m** accessibility chain on package root, republish the dashboard, and refresh WA1–WA3 numbers.

## Problem

In `scripts/03_build_pois_access.py`, GMaps mapping used substring `"park" in text`, so categories like **Parking lot / Parking garage** became `open_space`. OSM mapping was already correct (`leisure=park` / `leisure=playground` only).

## open_space definition (locked)

| Source | Include | Exclude |
|--------|---------|---------|
| OSM | `leisure=park`, `leisure=playground` | everything else |
| Google Maps | Word-safe `park` / `playground` / `indoor playground` on category tokens | Any text containing `parking`, `car park`, `carpark`; lodging/salon hard excludes |

Parking must never appear in `dest_group=open_space`.

## Pipeline

1. Fix `map_gmaps_category` / `is_gmaps_open_space` / `GMAPS_HARD_EXCLUDE` in `03_build_pois_access.py`
2. Rebuild `02_pois/pois_access_primary.geojson` from existing raw OSM + GMaps extracts (no fresh fetch)
3. `scripts/13_phase7_clean_and_recompute.py`:
   - QC: refuse run if parking still in open_space
   - Rebuild **clean** graph from `03_network/roads_walk_aoi.geojson` (do not snap on a post-snap graph)
   - Snap hexes + POIs at **50 m**
   - Access → classify/maps → findings into package root
4. Republish `public/data/walk-accessibility/` with `id = hex_id` on classified hexes
5. Update synthesis WA1–WA3 observation bullets from new `findings_summary.json`
6. Refresh `scenarios/snap_50m/` archive from package-root outputs

Do **not** re-run 100 m in this phase.

## Result snapshot (post Phase 7)

- `open_space` inventory: **12** (parks/playgrounds only; parking removed)
- Snap: hex OK 389 / 447; POI OK 247 / 257
- Analysis hexes: 323; mean access_score **0.873**; deserts **27**; mismatch **5**
- Open-space 10-min coverage: **83.3%** (was inflated by parking POIs)

## Validation

`python 00_manifest/validate_phase7.py` → **PASS**

## Done when

- open_space contains only park/playground-type destinations
- 50 m access/maps/findings regenerated on package root
- Dashboard publish updated
- WA cards match new KPIs
- Validator prints **PASS**
