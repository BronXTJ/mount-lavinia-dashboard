# Marshall-ready street network

Generated 2026-09-27T03:38:03.094736+00:00.

This note records how the checkpoint network was prepared. It is an auditable working file. It is not a claim that every street, bridge, or parallel carriageway is error-free.

## Extent

- Source streets: `public/data/network-form/roads_streets.geojson` (Network Form motorable set: trunk, primary, secondary, tertiary, residential, living_street, unclassified, service).
- Bridge and layer tags: `json_files/Primary study area final analysis 01/06_context/roads_primary.geojson`, joined on the numeric OSM way id (`way/98371180` matches street `osm_id` 98371180).
- Analysis units: the five GN polygons in `public/data/network-form/gn5_divisions.geojson` (Mount Lavinia, Kawdana West, Watarappala, Wathumulla, Wedikanda). Each GN is clipped on its own.
- The 75 m buffer used to build `roads_streets.geojson` is not part of the Marshall analysis. Segments that fall only in that fringe are excluded from `roads_marshall_ready.gpkg` and counted in the preparation summary (168 parts, 9280.0 m).

## Noding

`shapely.ops.unary_union` is not used on the streets. A geometric crossing is split into a shared node only when both ways matched the OSM source, neither is `bridge=yes`, and both layers are the same (a missing layer is treated as ground).

An interior crossing with `bridge=yes` or unequal layers is stored as `not_connected` and is not given a shared node. A bridge-tagged way that only meets another way at a shared endpoint is an approach landing: it stays connected and is recorded as `allow_approach`. If either way did not match `roads_primary.geojson`, the crossing is `unknown` and is not connected.

Snap clustering does not pull a bridge vertex onto the road it crosses. Vertices farther than 0.05 m apart merge only when they share a layer and the pair is not a recorded grade-separated or unknown crossing. Vertices already within 0.05 m stay together so a bridge deck remains joined to its own approaches.

Polygonize face counts in the snap table are a false-loop diagnostic only. They are not Marshall cells.

## Snap test

Tolerances tested: 0, 0.25, 0.5, 1.0, and 2.0 metres.

| tolerance_m | components | endpoint_merges | junctions_degree_ge3 | different_name_merges | polygonize_faces | illegal_merges |
|---:|---:|---:|---:|---:|---:|---:|
| 0.0 | 74 | 0 | 440 | 0 | 56 | 0 |
| 0.25 | 74 | 1 | 440 | 0 | 56 | 0 |
| 0.5 | 74 | 9 | 440 | 1 | 56 | 0 |
| 1.0 | 74 | 22 | 441 | 5 | 56 | 0 |
| 2.0 | 73 | 47 | 442 | 8 | 56 | 0 |

Chosen tolerance: **1.0 m**. Confidence: **defensible**.

1.0 m is on the plateau where components fall under 1 percent, and it matches the existing Network Form snap

Differently named roads merged by that snap are listed in `network_validation_issues.csv`. They were not silently accepted as junctions and they were not used to reject the tolerance, because the component count did not fall further. Those rows still need a look.

Selection order: reject a tolerance that merges different layers or a bridge with a non-bridge; reject 2.0 m when it adds differently named merges that 1.0 m does not; take the smallest remaining tolerance whose component count falls by under 1 percent versus the next smaller test; if 1.0 m is on that plateau and was not rejected, keep 1.0 m because it matches the existing Network Form graph; otherwise keep 0 m.

## Other checks

- Dual carriageways are flagged, not collapsed and not deleted. Galle Road (`osm_id` 48701240) is called out in `dual_carriageways.csv`.
- `BOUNDARY_ENDPOINT` is a degree-1 node within 1 m of the GN boundary whose coordinate is not an endpoint of the source street, so the clip created it. These points are not cul-de-sacs.
- Lines shorter than 0.5 m are kept and flagged `short_fragment`. Identical duplicate geometries are dropped once and logged. Overlaps are flagged and kept.

## Counts

- Street features in the source file: 545
- Length before clipping: 68712.2 m
- Segments after the per-GN clip: 560
- Length inside the five GNs before noding: 59432.2 m
- Final segments: 975
- Final length: 59424.9 m
- Crossings connected / not connected / unknown: 452 / 0 / 4
- Boundary endpoints: 218
- Unresolved crossing or dual-carriageway rows: 10

No T-ratio, X-ratio, cell ratio, cul-de-sac ratio, or Marshall matrix was calculated.
