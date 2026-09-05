---
uid: 5f42dc57-2c02-4686-9fa2-0f2ae6bbff7e
kind: element
title: Phase 3 — Walk accessibility computation
domain: destination-based walk accessibility
---

# Phase 3 — Walk accessibility computation

## Purpose

Measure network walk distance and time from each primary-study-area hex to the nearest destination in each daily POI group, then flag 5 / 10 / 15 minute reach.

## Inputs

| Input | Path |
|-------|------|
| Walk graph | `03_network/network_graph.graphml` |
| Hex origins (snapped) | `04_origins/hex_origins_primary.geojson` |
| POIs (snapped) | `04_origins/pois_snapped.geojson` |
| Hex polygons | `json_files/Primary study area final analysis 01/02_hex_grid/hex_grid_primary_100m.geojson` |

## Analysis set (KPI / desert / coverage)

Professional completeness gate (not legacy `is_edge`):

- `area_ratio = Hex_area / Hex_area_full`
- **`analysis_ok`** = `area_ratio ≥ 0.90` **and** `snap_ok=true`
- Completeness classes: `core` (≥0.95), `near_complete` (0.90–0.95), `partial` (0.50–0.90), `sliver` (&lt;0.50)
- Legacy `is_edge` (ratio &lt; 0.999) is kept for reference only and does **not** gate KPIs
- All hexes stay on maps; non-analysis cells are styled excluded/grey

## Parameters

| Parameter | Value |
|-----------|-------|
| Walk speed | **4.8 km/h** (80 m/min) |
| 5 / 10 / 15 min thresholds | **400 / 800 / 1200 m** network distance |
| Destination groups | food, education, health, transit, finance, open_space |
| Distance | network metres between snapped hex node and nearest snapped POI node |

## Method

1. For each `dest_group`, run `networkx.multi_source_dijkstra_path_length` from all snapped POI nodes (weight = `length_m`).
2. For each hex with `snap_ok=true`, look up nearest distance per group; convert to minutes; set reach flags.
3. Count snapped POIs per group within 800 m via single-source Dijkstra from the hex node (cutoff 1200 m).
4. `access_score` = share of 6 groups reachable within 10 minutes; `groups_within_10` = count of those groups.
5. Unsnapped hexes: null distances/times/`access_score`; reach flags false; counts 0.

## Outputs

- `05_accessibility/access_hex_primary.geojson` — hex polygons + metrics (CRS84)
- `05_accessibility/access_primary_summary.json` — coverage among **`analysis_ok`** hexes; mean access score; desert count (`groups_within_10` ≤ 2)

### Per-hex fields (group `g`)

- `dist_{g}_m`, `time_{g}_min`
- `reach_{g}_5`, `reach_{g}_10`, `reach_{g}_15`
- `count_{g}_10`
- Composite: `access_score`, `groups_within_10`
- Identity: `hex_id`, `is_edge`, `Hex_area`, `snap_ok`, `node_id`

## Script

`scripts/07_compute_accessibility.py`

## Phase 3 complete when

`python 00_manifest/validate_phase3.py` prints **PASS**.

## Out of scope

Styled maps, centrality mismatch overlays, dashboard wiring (later phases).
