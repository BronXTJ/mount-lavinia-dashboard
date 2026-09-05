---
uid: a2fbf31d-c808-4910-afb2-222ba82d9bd4
slug: domains/evidence-pipeline
kind: domain
title: Evidence Pipeline
display_en: Evidence Pipeline
display_ko: 증거 파이프라인
capabilities: [capabilities/prepare-web-data, capabilities/publish-github-pages, capabilities/serve-public-geojson]
created_by: "agent:unknown"
---

# Evidence Pipeline

Turns studio GIS and Excel into browser-ready JSON and GeoJSON, then publishes the React app to GitHub Pages.

## Includes

- `npm run prepare-data` from Excel and QGIS exports
- Runtime layers under `public/data/`
- `npm run deploy` to GitHub Pages

## Excludes

- Side assignments that never ship on GitHub Pages
- Interpreting planning meaning (that belongs in analytic and synthesis tabs)
