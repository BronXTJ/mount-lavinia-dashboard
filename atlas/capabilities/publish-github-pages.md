---
uid: 264cb513-625f-4506-9a0f-c32b02853928
slug: capabilities/publish-github-pages
kind: capability
title: Publish to GitHub Pages
display_en: Publish to GitHub Pages
display_ko: GitHub Pages 게시
domain: domains/evidence-pipeline
elements: []
path: package.json
created_by: "agent:unknown"
dependencies: [capabilities/serve-public-geojson]
relation_notes: { capabilities/serve-public-geojson: "The GitHub Pages build copies public/data into dist, so a deploy without prepared layers would ship an incomplete dashboard." }
---

# Publish to GitHub Pages

Builds the Vite app and deploys `dist/` to GitHub Pages at `/mount-lavinia-dashboard/`.

## Includes

- `npm run build` and `npm run deploy` via gh-pages

## Excludes

- Hosting social-media or intervention folders as extra sites
