---
uid: 97fc48ae-fa5d-42a8-882c-9d88ed4c9f01
slug: capabilities/show-corridor-kpis-and-live-conditions
kind: capability
title: Show corridor KPIs and live conditions
display_en: Show corridor KPIs and live conditions
display_ko: 회랑 KPI와 실시간 여건 표시
domain: domains/overview
elements: []
path: src/tabs/Tab1_Overview.jsx
created_by: "agent:unknown"
dependencies: [capabilities/prepare-web-data]
relation_notes: { capabilities/prepare-web-data: "Overview KPI and population JSON are produced by prepare-data, so the Overview tab cannot show current figures without that pipeline." }
---

# Show corridor KPIs and live conditions

Shows division counts, population structure, land-use mix, the corridor map, and live Open-Meteo weather and air quality on Overview.

## Includes

- KPI cards, GN selector, population charts, and land-use donut
- Interactive Overview map and live weather panel

## Excludes

- 10 m UTCI/UHI/SVF grids
- Junction volume surveys
- The unused Land Use tab stub
