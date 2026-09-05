---
uid: 2bff172d-86ba-499a-baef-b297da3936af
slug: capabilities/analyse-built-density
kind: capability
title: Analyse built density
display_en: Analyse built density
display_ko: 시가지 밀도 분석
domain: domains/focus-area
elements: []
path: src/components/focusArea/DensityAnalysisView.jsx
created_by: "agent:unknown"
dependencies: [capabilities/serve-public-geojson]
relation_notes: { capabilities/serve-public-geojson: Density maps load precomputed layers from public/data rather than reading studio shapefiles in the client. }
---

# Analyse built density

Maps and summarises built-density patterns in the Focus Area.

## Includes

- Density map, legend, and density statistics

## Excludes

- Land-cover class change over time
- Plot-level condo inventory research not on GitHub Pages
