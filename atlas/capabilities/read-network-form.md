---
uid: e76a720a-6251-4687-979d-7d3393c83a12
slug: capabilities/read-network-form
kind: capability
title: Read network form
display_en: Read network form
display_ko: 가로망 형태 읽기
domain: domains/focus-area
elements: []
path: src/components/focusArea/NetworkFormView.jsx
created_by: "agent:unknown"
dependencies: [capabilities/serve-public-geojson]
relation_notes: { capabilities/serve-public-geojson: Network-form maps load prepared GeoJSON from public/data. }
---

# Read network form

Shows street-network form, including cul-de-sac and connectivity structure, in the Focus Area.

## Includes

- Network-form map, overview, and detail panels

## Excludes

- Centrality what-if drawing (that stays on centrality)
- LinkedIn or social-media graphic exports
