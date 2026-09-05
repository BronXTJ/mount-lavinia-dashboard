---
uid: 683573fb-05d1-42e1-9a9d-70215c8d5f9b
slug: capabilities/export-report-maps
kind: capability
title: Export report maps
display_en: Export report maps
display_ko: 보고서 지도 내보내기
domain: domains/export-maps
elements: []
path: src/tabs/ExportMaps.jsx
created_by: "agent:unknown"
dependencies: [capabilities/serve-public-geojson]
relation_notes: { capabilities/serve-public-geojson: Export cards download prepared map assets already staged for the web app. }
---

# Export report maps

Lets a user preview and download static map files prepared for reports.

## Includes

- Export cards, CRS badges, and preview modal

## Excludes

- Interactive analysis maps
- Regenerating QGIS sources
