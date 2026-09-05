---
uid: 22994c85-96da-44b4-865a-cf7b773ee7f0
slug: capabilities/serve-public-geojson
kind: capability
title: Serve public GeoJSON
display_en: Serve public GeoJSON
display_ko: 공개 GeoJSON 제공
domain: domains/evidence-pipeline
elements: []
path: public/data/
created_by: "agent:unknown"
dependencies: [capabilities/prepare-web-data]
relation_notes: { capabilities/prepare-web-data: public/data is filled by prepare-data from Excel and GIS exports; serving stale files is not a separate product ability. }
---

# Serve public GeoJSON

Hosts precomputed GeoJSON and summaries that Focus Area, environmental, land-cover, and related maps fetch at runtime.

## Includes

- Browser-served layers under `public/data/`

## Excludes

- Raw `json_files/` workbooks as a runtime API
- Condo inventory GeoJSON that is not a shipped tab
