---
uid: 030694a0-502d-4948-a893-6a5e71585364
slug: capabilities/prepare-web-data
kind: capability
title: Prepare web data
display_en: Prepare web data
display_ko: 웹 데이터 준비
domain: domains/evidence-pipeline
elements: []
path: scripts/prepare-data.mjs
created_by: "agent:unknown"
---

# Prepare web data

Converts studio Excel and GIS exports into JSON and GeoJSON the dashboard can load.

## Includes

- `npm run prepare-data` and writes into `src/data/` and `public/data/`

## Excludes

- Rendering React maps
- Side-research scrapers that never enter the hosted app
