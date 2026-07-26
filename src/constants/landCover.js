/** Land Cover Change section — Landsat headline story + S2 per-GN metrics. */

import { APP_BASEMAPS } from './basemaps.js'

export const LC_MAP_CENTER = [6.8344, 79.8685]
export const LC_MAP_ZOOM = 14

/** WGS84 ImageOverlay bounds [[south, west], [north, east]] from classified GeoTIFF. */
export const LC_OVERLAY_BOUNDS = [
  [6.816383476854067, 79.85811326159657],
  [6.852247180344691, 79.87882887533087],
]

/** Public asset URL under Vite base (works on GitHub Pages). */
export function landCoverUrl(path) {
  return `${import.meta.env.BASE_URL}data/land-cover-change/${String(path).replace(/^\//, '')}`
}

export const LC_EPOCHS = [
  { id: 'y2000', label: '~2000', year: 2000 },
  { id: 'y2015', label: '~2015', year: 2015 },
  { id: 'y2025', label: '~2025', year: 2025 },
]

/** Basemap choices — Land Cover defaults to satellite for present-day ground view. */
export const LC_BASEMAPS = APP_BASEMAPS

export const DEFAULT_LC_BASEMAP = 'satellite'

export const LC_LAYER_MODES = [
  { id: 'classified', label: 'Landsat classified LULC (30 m)', dot: '#1a9850' },
  { id: 'change', label: 'Landsat change 2000→2025 (30 m)', dot: '#d73027' },
]

/** FAB rows — classified/change exclusive; GN / buildings / roads independent. */
export const LC_FAB_LAYERS = [
  { id: 'classified', label: 'Landsat classified LULC (30 m)', dot: '#1a9850', group: 'overlay' },
  { id: 'change', label: 'Landsat change 2000→2025 (30 m)', dot: '#d73027', group: 'overlay' },
  { id: 'gnBoundaries', label: 'GN boundaries', dot: '#00b4d8', group: 'independent' },
  { id: 'buildings', label: 'OSM buildings', dot: '#64748b', group: 'independent' },
  { id: 'roads', label: 'OSM roads', dot: '#f77f00', group: 'independent' },
]

export const LC_OVERLAY_IDS = ['classified', 'change']

export const DEFAULT_LC_VISIBLE = {
  classified: true,
  change: false,
  gnBoundaries: true,
  buildings: true,
  roads: true,
}

/** Styles for OSM context vectors over the classified overlay. */
export const LC_CONTEXT_STYLES = {
  buildings: { color: '#64748b', fillColor: '#64748b', fillOpacity: 0.55, weight: 0.5, opacity: 0.85 },
  roads: { color: '#f77f00', weight: 2, opacity: 0.9, fill: false },
}

export function getActiveLcOverlay(visibleLayers) {
  return LC_OVERLAY_IDS.find((id) => visibleLayers?.[id]) ?? null
}

export const LC_CLASS_LEGEND = [
  { id: 'built_up', label: 'Built-up', color: '#d73027' },
  { id: 'vegetation', label: 'Vegetation', color: '#1a9850' },
  { id: 'open_bare', label: 'Open / bare (yards, cleared, sparse)', color: '#fdae61' },
  { id: 'water_wetland', label: 'Water / wetland', color: '#4575b4' },
  { id: 'beach_sand', label: 'Beach / sand', color: '#ffffbf' },
]

export const LC_CHANGE_LEGEND = [
  { id: 'veg_built', label: 'Veg → built-up', color: '#d73027' },
  { id: 'open_built', label: 'Open → built-up', color: '#fc8d59' },
  { id: 'other_built', label: 'Other → built-up', color: '#fee08b' },
  { id: 'veg_loss', label: 'Veg loss (not built)', color: '#1a9850' },
  { id: 'built_loss', label: 'Built-up loss', color: '#c026d3' },
  { id: 'stable', label: 'Stable', color: '#bdbdbd' },
]

export const LC_GN_NAMES = [
  'Mount Lavinia',
  'Kawdana West',
  'Watarappala',
  'Wathumulla',
  'Wedikanda',
]

/** Headline KPIs — Landsat full 5 GN, ~2000 → ~2025. */
export const LC_HEADLINE_KPIS = [
  {
    id: 'built_up',
    label: 'Built-up',
    value: '+25.9 ha',
    hint: '36.9 → 62.8 ha (10.9% → 18.5%)',
    color: '#d73027',
  },
  {
    id: 'vegetation',
    label: 'Vegetation',
    value: '−70.4 ha',
    hint: '179.4 → 109.0 ha (52.9% → 32.2%)',
    color: '#1a9850',
  },
  {
    id: 'open_bare',
    label: 'Open / bare',
    value: '+46.3 ha',
    hint: '116.5 → 162.7 ha (34.4% → 48.0%)',
    color: '#fdae61',
  },
]

/** Landsat class areas by epoch (ha) — from area_by_class.csv. */
export const LC_CLASS_AREA_BY_EPOCH = [
  {
    epoch: 'y2000',
    label: '~2000',
    built_up: 36.9,
    built_up_pct: 10.89,
    vegetation: 179.37,
    vegetation_pct: 52.93,
    open_bare: 116.46,
    open_bare_pct: 34.37,
    water_wetland: 2.52,
    water_wetland_pct: 0.74,
    beach_sand: 3.6,
    beach_sand_pct: 1.06,
    total_ha: 338.85,
  },
  {
    epoch: 'y2015',
    label: '~2015',
    built_up: 48.87,
    built_up_pct: 14.42,
    vegetation: 117.63,
    vegetation_pct: 34.71,
    open_bare: 165.51,
    open_bare_pct: 48.84,
    water_wetland: 4.14,
    water_wetland_pct: 1.22,
    beach_sand: 2.7,
    beach_sand_pct: 0.8,
    total_ha: 338.85,
  },
  {
    epoch: 'y2025',
    label: '~2025',
    built_up: 62.82,
    built_up_pct: 18.54,
    vegetation: 108.99,
    vegetation_pct: 32.16,
    open_bare: 162.72,
    open_bare_pct: 48.02,
    water_wetland: 2.43,
    water_wetland_pct: 0.72,
    beach_sand: 1.89,
    beach_sand_pct: 0.56,
    total_ha: 338.85,
  },
]

/** Landsat zone deep dive — Mount Lavinia GN, ~2000 → ~2025. */
export const LC_MOUNT_LAVINIA_LANDSAT = {
  built_up: { y2000: 24.12, y2025: 29.88, change: 5.76 },
  vegetation: { y2000: 43.74, y2025: 36.36, change: -7.38 },
  open_bare: { y2000: 49.32, y2025: 53.37, change: 4.05 },
  beach_sand: { y2000: 2.52, y2025: 0.9, change: -1.62 },
  total_ha: 122.04,
}

/**
 * Sentinel-2 10 m per-GN metrics (built / green / soft %).
 * Soft = vegetation + open/bare + water + beach.
 */
export const LC_PER_GN_S2 = {
  'Mount Lavinia': {
    area_ha: 115.88,
    epochs: {
      y2018: { built_up_pct: 44.75, green_pct: 18.17, soft_surface_pct: 55.25 },
      y2020: { built_up_pct: 49.73, green_pct: 16.37, soft_surface_pct: 50.27 },
      y2025: { built_up_pct: 45.57, green_pct: 18.48, soft_surface_pct: 54.43 },
    },
  },
  'Kawdana West': {
    area_ha: 53.53,
    epochs: {
      y2018: { built_up_pct: 56.75, green_pct: 13.32, soft_surface_pct: 43.25 },
      y2020: { built_up_pct: 62.88, green_pct: 11.04, soft_surface_pct: 37.12 },
      y2025: { built_up_pct: 56.94, green_pct: 13.13, soft_surface_pct: 43.06 },
    },
  },
  Watarappala: {
    area_ha: 40.26,
    epochs: {
      y2018: { built_up_pct: 56.51, green_pct: 11.28, soft_surface_pct: 43.49 },
      y2020: { built_up_pct: 62.07, green_pct: 9.89, soft_surface_pct: 37.93 },
      y2025: { built_up_pct: 59.29, green_pct: 10.83, soft_surface_pct: 40.71 },
    },
  },
  Wathumulla: {
    area_ha: 55.6,
    epochs: {
      y2018: { built_up_pct: 40.92, green_pct: 20.41, soft_surface_pct: 59.08 },
      y2020: { built_up_pct: 49.5, green_pct: 16.49, soft_surface_pct: 50.5 },
      y2025: { built_up_pct: 45.07, green_pct: 19.39, soft_surface_pct: 54.93 },
    },
  },
  Wedikanda: {
    area_ha: 67.91,
    epochs: {
      y2018: { built_up_pct: 35.61, green_pct: 23.53, soft_surface_pct: 64.39 },
      y2020: { built_up_pct: 42.82, green_pct: 19.29, soft_surface_pct: 57.18 },
      y2025: { built_up_pct: 39.35, green_pct: 22.13, soft_surface_pct: 60.65 },
    },
  },
}

export const LC_S2_EPOCHS = [
  { id: 'y2018', label: '~2018' },
  { id: 'y2020', label: '~2020' },
  { id: 'y2025', label: '~2025' },
]

export function getClassifiedMapUrl(epochId) {
  return landCoverUrl(`maps/classified_${epochId}.png`)
}

export function getOverlayUrl(layerMode, epochId) {
  if (layerMode === 'change') {
    // Cache-bust so browsers reload after palette updates (built-up loss → magenta).
    return `${landCoverUrl('maps/change_builtup_gain_veg_loss_y2000_y2025.png')}?v=magenta1`
  }
  return getClassifiedMapUrl(epochId)
}

/** Georeferenced overlay URL for classified/change; null when none active. */
export function getOverlayUrlFromVisible(visibleLayers, epochId) {
  const active = getActiveLcOverlay(visibleLayers)
  if (active === 'classified' || active === 'change') {
    return getOverlayUrl(active, epochId)
  }
  return null
}

/** Sentinel-2 KPI snapshot for a GN (~2025 levels + built-up pp change 2018→2025). */
export function getGnS2Kpis(gnName) {
  const row = LC_PER_GN_S2[gnName]
  if (!row) return null
  const y2018 = row.epochs.y2018
  const y2025 = row.epochs.y2025
  return {
    area_ha: row.area_ha,
    built_up_pct: y2025.built_up_pct,
    green_pct: y2025.green_pct,
    soft_surface_pct: y2025.soft_surface_pct,
    built_up_change_pp: y2025.built_up_pct - y2018.built_up_pct,
  }
}

export function getEpochRow(epochId) {
  return LC_CLASS_AREA_BY_EPOCH.find((r) => r.epoch === epochId) ?? LC_CLASS_AREA_BY_EPOCH[2]
}
