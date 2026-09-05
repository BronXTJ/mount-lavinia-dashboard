---
uid: 080f9816-6d15-4168-8f44-bf57abfb8c4a
slug: capabilities/map-thermal-comfort-grids
kind: capability
title: Map thermal comfort grids
display_en: Map thermal comfort grids
display_ko: 열쾌적 격자 지도화
domain: domains/environmental-analysis
elements: []
path: src/tabs/Tab5_Environmental.jsx
created_by: "agent:unknown"
dependencies: [capabilities/serve-public-geojson]
relation_notes: { capabilities/serve-public-geojson: "UTCI, UHI, and SVF grids are precomputed files under public/data, not live model runs." }
---

# Map thermal comfort grids

Maps modelled UTCI, urban heat, and sky view factor on a 10 m grid with linked side panels.

## Includes

- Environmental map layers and thermal / microclimate panels

## Excludes

- Live Open-Meteo station-style fields on Overview
- GlobalBuildingAtlas extracts used only in offline building work
