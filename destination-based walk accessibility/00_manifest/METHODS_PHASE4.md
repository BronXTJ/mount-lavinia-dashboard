---
uid: ad97b910-9945-4071-b758-173901297b2a
kind: element
title: Phase 4 — Maps and classification
domain: destination-based walk accessibility
---

# Phase 4 — Maps and classification

## Purpose

Classify Phase-3 walk accessibility hexes into tiers, flag centrality–destination mismatches, and export report maps for synthesis.

## Inputs

| Input | Path |
|-------|------|
| Access hex metrics | `05_accessibility/access_hex_primary.geojson` |
| Access summary | `05_accessibility/access_primary_summary.json` |
| Primary boundary | `01_boundary/primary_study_area_boundary.geojson` |
| Betweenness 5000 m | `json_files/Primary study area final analysis 01/07_centrality/betweenness_5000m.geojson` |

## Classification

| `access_tier` | Rule |
|---------------|------|
| `high` | `analysis_ok`, `groups_within_10` ≥ 5 |
| `medium` | `analysis_ok`, `groups_within_10` 3–4 |
| `low` | `analysis_ok`, `groups_within_10` ≤ 2 (desert) |
| `excluded` | not `analysis_ok` (`area_ratio` &lt; 0.90 or unsnapped) |

`analysis_ok` = `area_ratio ≥ 0.90` AND `snap_ok` (see METHODS_PHASE3). Legacy `is_edge` is not used for tiers.

### Centrality mismatch

1. Mean `BtA5000` of road segments intersecting each hex → `mean_BtA5000`
2. Among **analysis_ok** hexes, Q75 of `mean_BtA5000`
3. `mismatch_flag=true` when `mean_BtA5000` ≥ Q75 **and** `access_score` &lt; 0.5

## Maps (EPSG:32644)

| File | Content |
|------|---------|
| `06_maps/map01_access_score.png` | Continuous access score |
| `06_maps/map02_access_tiers_deserts.png` | Tier choropleth (deserts emphasized) |
| `06_maps/map03_time_by_group.png` | 2×3 walk-time panels |
| `06_maps/map04_coverage_10min.png` | 10-min coverage bars |
| `06_maps/map05_centrality_mismatch.png` | High BtA + weak destination access |

Also: `06_maps/maps_summary.json`, `05_accessibility/access_hex_classified.geojson`

## Script

`scripts/08_classify_and_maps.py`

## Phase 4 complete when

`python 00_manifest/validate_phase4.py` prints **PASS**.

## Out of scope

Dashboard wiring; long-form findings (Phase 5).
