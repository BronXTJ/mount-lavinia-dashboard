# Phase 2 — Walk network and origins

## Purpose

Build a routable pedestrian network for the 500 m access AOI, prepare hex origin centroids from the primary 100 m grid, and snap Phase-1 POIs (and hexes) onto the network for Phase-3 walk-distance calculation.

## Inputs

| Input | Path |
|-------|------|
| Access AOI | `01_boundary/access_aoi_500m.geojson` |
| Accessibility POIs | `02_pois/pois_access_primary.geojson` |
| Hex grid | `json_files/Primary study area final analysis 01/02_hex_grid/hex_grid_primary_100m.geojson` |

`roads_primary` alone is **not** used (primary-only extent misses buffer destinations).

## Road fetch and filter

Fresh OSM Overpass ways with `highway=*` inside the AOI bbox, then client-side walkable filter:

**Keep:** trunk, primary, primary_link, secondary, secondary_link, tertiary, tertiary_link, residential, living_street, unclassified, service, footway, path, pedestrian, steps

**Drop:** motorway, motorway_link; `access=no`; `foot=no`

Outputs: `03_network/raw/roads_osm_raw.geojson`, `03_network/roads_walk_aoi.geojson`

## Network build

- CRS: metric work in EPSG:3857; exports CRS84
- Endpoint / vertex snap grid: **1 m**
- Edge densify: **25 m** (extra nodes along long segments)
- Graph: undirected `networkx.Graph` (walking ignores `oneway`)
- Edge weight: `length_m`
- Drop connected components with fewer than **5** edges

Outputs: `network_nodes.geojson`, `network_edges.geojson`, `network_graph.graphml`, `network_summary.json`

## Origins and snapping

- Hex origins = projected centroids of primary hexes (`hex_id`, `is_edge`, `Hex_area`)
- Snap method: nearest **edge** within **50 m**; mid-edge projection inserts a graph node and splits the edge
- Fields: `node_id`, `snap_dist_m`, `snap_ok`
- Failed snaps (`snap_ok=false`) stay in the layer for QC; most failures are edge/coast hexes >50 m from any road

Outputs: `04_origins/hex_origins_primary.geojson`, `04_origins/pois_snapped.geojson`, `04_origins/origins_snap_summary.json`

## Scripts

- `scripts/04_fetch_osm_roads.py`
- `scripts/05_build_walk_network.py`
- `scripts/06_prepare_origins_snaps.py`

## Phase 2 complete when

`python 00_manifest/validate_phase2.py` prints **PASS**.

## Out of scope

Walk times, 5/10/15 min flags, accessibility scores (Phase 3).
