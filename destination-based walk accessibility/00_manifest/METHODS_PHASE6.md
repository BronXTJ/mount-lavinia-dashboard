# Phase 6 — Walk Accessibility dashboard

## Purpose

Publish Phase 3–5 destination walk accessibility layers into the Mount Lavinia dashboard as a Focus Area sub-tab that clones Density / Urban Maturation hex UX (partition grades, popups, Cell ID fly-to, POI pulse, FAB, `HexEdgeEffectNote`).

## Placement

| Item | Value |
|------|-------|
| Route | `/focus-area?sub=walk-access` |
| Sidebar | Focus Area → **Walk Accessibility** (after Urban Maturation) |
| View | `WalkAccessibilityView` |

Not a new top-level sidebar route.

## Published data (`public/data/walk-accessibility/`)

| File | Role |
|------|------|
| `access_hex_classified.geojson` | Hex metrics + tiers; each feature has `id` = `hex_id` for shared hex utilities |
| `access_primary_summary.json` | Coverage / desert / mismatch KPIs |
| `pois_snapped.geojson` | Access destinations (FAB: “POIs — Access destinations”) |
| `findings_summary.json` | Runtime KPIs + WA draft cards |

Context layers (boundary, 100 m hex grid, buildings, roads) reuse `public/data/density-analysis/` (same primary extent).

## Hex UX rules (non-negotiable)

- Completeness via `partitionHexFeatures` / `Hex_area` (≥90% KPI fill; 50–90% dim + dash; &lt;50% outline).
- Do **not** gate UI KPIs on legacy `is_edge`.
- Popups: `buildCellInfoPopupHtml` + `CELL_POPUP_OPTS` + north-edge `getFeaturePopupAnchor`.
- Selection: cyan pulse (`density-hex-highlight-pulse`).
- POIs: pink `#db2777`, `poi-pulse-ring` + white-stroke fill dot, SVG renderer.
- Metric exclusivity: one choropleth metric at a time.

## Map metrics

**Exclusive choropleths:** `accessScore` (default), `accessTier`, `timeFood` / `timeEducation` / `timeHealth` / `timeTransit` / `timeFinance` / `timeOpenSpace`.

**Independent overlays:** primary boundary, hex grid, buildings, roads, POIs, deserts outline, mismatch outline, Streets / Satellite basemap.

## Synthesis + guide

- Findings **WA1–WA3** in `src/components/synthesis/findingsData.js` with evidence `focusSub: 'walk-access'`.
- **F8** and **F15** evidence also deep-link to walk-access.
- User Guide section `walk-access` in `userGuideContent.js`.

## UI source files

```
src/constants/walkAccessibility.js
src/hooks/useWalkAccessibilityLayers.js
src/utils/walkAccessibilityStats.js
src/components/focusArea/WalkAccessibilityView.jsx
src/components/focusArea/WalkAccessMap.jsx
src/components/focusArea/WalkAccessMapLayerFab.jsx
src/components/focusArea/WalkAccessLegend.jsx
src/components/focusArea/WalkAccessScorePanel.jsx
src/components/focusArea/WalkAccessGroupsPanel.jsx
```

## Validation

`python 00_manifest/validate_phase6.py` → **PASS**

## Phase 6 complete when

- Branch `feature/walk-accessibility-dashboard` exists
- `/focus-area?sub=walk-access` loads the clone UX
- WA1–WA3 deep-link into the tab
- Validator prints **PASS**
