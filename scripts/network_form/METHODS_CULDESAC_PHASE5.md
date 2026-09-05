---
uid: 83d27369-8b64-4d19-a093-6b406f0113eb
kind: element
title: Cul-de-sac Phase 5 — Synthesis cards
domain: scripts
---

# Cul-de-sac Phase 5 — Synthesis cards

## Purpose

Publish synthesis findings **NF1–NF3** from Phases 1–4 cul-de-sac evidence and deep-link Network Form Key Findings chips into Synthesis.

## Evidence sources (locked numbers)

| Phase | File | Used for |
|-------|------|----------|
| 1 | `culdesac_depth_summary.json` | n=259; median stub 59.6 m; depth 105/139/15; corridor 12 / interior 247 |
| 2 | `culdesac_spatial_summary.json` | GN density rank (Watarappala 111.4/km²; ML 56.5/km²) |
| 3 | `culdesac_walk_summary.json` | desert 33 cul-de-sacs (12.7%); ~70% high walk tier; mean access 0.835 |
| 4 | `culdesac_density_umi_summary.json` | mean UMI 0.312; mean FSI 1.86; ~75% medium maturation |
| Scope KPIs | `metrics_by_scope.json` / `findings_by_scope.json` | 4-way:3-way ≈ 0.09:0.91; corridor vs interior shares |

## Cards

| ID | Label | Core claim |
|----|-------|------------|
| NF1 | Tree-like Fabric and Cul-de-sac Depth | 3-way + dead-end dominance; stub depth; interior enclosure |
| NF2 | Cul-de-sac Density Concentrates in Smaller GNs | Watarappala / Kawdana West density; spines > interior permeability |
| NF3 | Walk Access and UMI Do Not Prove Grid Permeability | Desert co-location; high walk scores ≠ grid form; moderate UMI/FSI |

## Dashboard

- [`src/components/synthesis/findingsData.js`](../../src/components/synthesis/findingsData.js) — NF1–NF3 + `network` domain + edges
- [`NetworkFormOverviewPanel.jsx`](../../src/components/focusArea/NetworkFormOverviewPanel.jsx) — chips → `/synthesis?f=NF*`
- User guide network-form bullets mention NF1–NF3

No new GeoJSON or join scripts in this phase.
