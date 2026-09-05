---
uid: aa674eff-eccc-4787-8346-f7ac1dc7e318
kind: element
title: Phase 5 — Findings and design implications
domain: destination-based walk accessibility
---

# Phase 5 — Findings and design implications

## Purpose

Turn Phase 3–4 destination walk accessibility results into synthesis-ready findings (markdown + JSON) without wiring the dashboard.

## Inputs

| Input | Path |
|-------|------|
| Access summary | `05_accessibility/access_primary_summary.json` |
| Classified hexes | `05_accessibility/access_hex_classified.geojson` |
| Maps summary | `06_maps/maps_summary.json` |

## Analysis set

`analysis_ok` = `area_ratio ≥ 0.90` AND `snap_ok` (same as Phases 3–4). Legacy `is_edge` is not used for KPI narrative.

## Outputs

| File | Role |
|------|------|
| `07_findings/findings.md` | Full prose report + WA1–WA3 cards |
| `07_findings/findings_summary.json` | KPIs, draft_findings, priorities, desert/mismatch ids |
| `07_findings/desert_hex_ids.json` | Low-tier desert hex_id list |

Draft cards use observation / interpretation / implication (compatible with synthesis `findingsData.js` shape). Dashboard edits are **out of scope** (Phase 6).

## Script

`scripts/09_write_findings.py`

## Phase 5 complete when

`python 00_manifest/validate_phase5.py` prints **PASS**.
