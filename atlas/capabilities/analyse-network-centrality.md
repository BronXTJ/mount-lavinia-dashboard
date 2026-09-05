---
uid: dadff2a6-38bd-4c21-a97d-01f2dff9c974
slug: capabilities/analyse-network-centrality
kind: capability
title: Analyse network centrality
display_en: Analyse network centrality
display_ko: 네트워크 중심성 분석
domain: domains/focus-area
elements: []
path: src/components/focusArea/CentralityAnalysisView.jsx
created_by: "agent:unknown"
dependencies: [capabilities/serve-public-geojson]
relation_notes: { capabilities/serve-public-geojson: "Centrality layers are fetched as prepared GeoJSON from public/data at runtime, not computed in the browser from raw GIS." }
---

# Analyse network centrality

Maps and ranks street-network centrality in the primary study area, including the live what-if sketch of new links.

## Includes

- Centrality map, legend, and side analytics
- What-if drawing of candidate segments on the same view

## Excludes

- Junction count surveys (Movement and Behaviour)
- Walk-access destination scoring as a separate analysis
