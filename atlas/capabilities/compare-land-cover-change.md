---
uid: 31cff40f-3cd0-454d-b51a-03ab9865d693
slug: capabilities/compare-land-cover-change
kind: capability
title: Compare land cover change
display_en: Compare land cover change
display_ko: 토지피복 변화 비교
domain: domains/land-cover-change
elements: []
path: src/tabs/TabLandCover.jsx
created_by: "agent:unknown"
dependencies: [capabilities/serve-public-geojson]
relation_notes: { capabilities/serve-public-geojson: The land-cover tab draws hosted change layers from public/data. }
---

# Compare land cover change

Shows land-cover change maps and class-area trends for the study area on the live tab.

## Includes

- Full-bleed land-cover map and GN detail
- Class-area trend charts on the hosted view

## Excludes

- Standalone satellite notebooks not wired to this tab
- Park planting or site-intervention drawings
