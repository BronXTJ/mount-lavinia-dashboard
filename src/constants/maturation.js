/** Tab 2 Focus Area — Urban Maturation Analysis configuration. */

import { getLandUseColor, LAND_USE_FALLBACK_COLOR } from './mapLayers.js'

export const MATURATION_MAP_CENTER = [6.8394, 79.8653]
export const MATURATION_MAP_ZOOM = 15

/** Analysis area boundary — solid red, matches Density Analysis. */
export const MATURATION_BUFFER_COLOR = '#dc2626'

/** GeoJSON property keys (QGIS names — spaces preserved). */
export const MATURATION_PROPS = {
  umi: '1urban mat',
  entropyRaw: '1entropy_i',
  accessibilityRaw: '1average_c',
  landUseRaw: '1landuse_d',
  entropyNorm: '1normalize',
  accessibilityNorm: '1normali_1',
  landUseNorm: '1normali_2',
  shannonEntropy: ' final_ent',
  mixedUse: ' final_mui',
}

/** UMI classification thresholds. */
export const MATURATION_TIERS = {
  high: {
    id: 'high',
    label: 'Highly Matured',
    shortLabel: 'High',
    color: '#b45309',
    min: 0.35,
    exclusiveMax: Infinity,
  },
  medium: {
    id: 'medium',
    label: 'Moderately Matured',
    shortLabel: 'Medium',
    color: '#fbbf24',
    min: 0.15,
    exclusiveMax: 0.35,
  },
  low: {
    id: 'low',
    label: 'Early Stage / Emerging',
    shortLabel: 'Low',
    color: '#94a3b8',
    min: -Infinity,
    exclusiveMax: 0.15,
  },
}

/** Hex choropleth ramps for mutually exclusive metric layers. */
export const MATURATION_METRIC_RAMPS = {
  umi: {
    stops: ['#f0fdf4', '#bbf7d0', '#86efac', '#fbbf24', '#f59e0b', '#b45309'],
    property: MATURATION_PROPS.umi,
    label: 'Urban Maturation Index',
  },
  entropy: {
    stops: ['#ecfdf5', '#a7f3d0', '#10b981', '#059669', '#064e3b'],
    property: MATURATION_PROPS.entropyNorm,
    label: 'Shannon Entropy',
  },
  accessibility: {
    stops: ['#f0f9ff', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0369a1'],
    property: MATURATION_PROPS.accessibilityNorm,
    label: 'Accessibility Score',
  },
  landUseDiversity: {
    stops: ['#fcfdbf', '#fecc5c', '#f1605d', '#b63679', '#3b0f70'],
    property: MATURATION_PROPS.landUseNorm,
    label: 'Land Use Diversity',
  },
}

export const MATURATION_HEX_HIGHLIGHT = {
  color: '#67e8f9',
  weight: 3,
  fillColor: '#ecfeff',
  fillOpacity: 0.35,
}

/** Context layer styles — buildings/roads/pois match Density Analysis. */
export const MATURATION_CONTEXT_STYLES = {
  hexGrid: { color: '#2563eb', weight: 1, opacity: 0.9, fill: false },
  buildings: { color: '#64748b', fillColor: '#64748b', fillOpacity: 0.6, weight: 0.5, opacity: 0.8 },
  roads: { color: '#f77f00', weight: 2, opacity: 0.9, fill: false },
  pois: { color: '#db2777', fillColor: '#db2777', fillOpacity: 0.9, radius: 5, weight: 1 },
}

/** Maturation-only land-use categories not in Overview palette. */
const MATURATION_LANDUSE_EXTRAS = {}

/** Resolve land-use color — Overview first, then extras, then fallback. */
export function getMaturationLandUseColor(mainClass) {
  if (!mainClass) return LAND_USE_FALLBACK_COLOR
  const overview = getLandUseColor(mainClass)
  if (overview !== LAND_USE_FALLBACK_COLOR) return overview
  return MATURATION_LANDUSE_EXTRAS[mainClass] ?? LAND_USE_FALLBACK_COLOR
}

export const MATURATION_FAB_LAYERS = [
  { id: 'analysisArea', label: 'Analysis Area Boundary', dot: '#dc2626', group: 'independent' },
  { id: 'hexGrid', label: '100m Hex Grid', dot: '#2563eb', group: 'independent' },
  { id: 'umi', label: 'Urban Maturation Index', dot: '#b45309', group: 'metric' },
  { id: 'entropy', label: 'Shannon Entropy', dot: '#10b981', group: 'metric' },
  { id: 'accessibility', label: 'Accessibility Score', dot: '#0ea5e9', group: 'metric' },
  { id: 'landUseDiversity', label: 'Land Use Diversity', dot: '#b63679', group: 'metric' },
  { id: 'landUseMap', label: 'Land Use Map', dot: '#fa9f00', group: 'independent' },
  { id: 'buildings', label: 'Buildings', dot: '#64748b', group: 'independent' },
  { id: 'roads', label: 'Roads', dot: '#f77f00', group: 'independent' },
  { id: 'pois', label: 'POIs', dot: '#db2777', group: 'independent' },
]

export const DEFAULT_MATURATION_VISIBLE = {
  analysisArea: true,
  hexGrid: false,
  umi: true,
  entropy: false,
  accessibility: false,
  landUseDiversity: false,
  landUseMap: false,
  buildings: false,
  roads: false,
  pois: false,
}

export const MATURATION_METRIC_IDS = ['umi', 'entropy', 'accessibility', 'landUseDiversity']

export const MATURATION_HEX_SELECTABLE_IDS = ['hexGrid', ...MATURATION_METRIC_IDS]

export function maturationGeoUrl(fileName) {
  return `${import.meta.env.BASE_URL}data/urban-morpho/urban-maturation/${fileName}`
}

export function getActiveMaturationMetric(visibleLayers) {
  return MATURATION_METRIC_IDS.find((id) => visibleLayers?.[id]) ?? null
}

export function hasMaturationHexSelectableLayer(visibleLayers) {
  return MATURATION_HEX_SELECTABLE_IDS.some((id) => visibleLayers?.[id])
}

export function classifyMaturationTier(umi) {
  const v = Number(umi)
  if (!Number.isFinite(v)) return MATURATION_TIERS.low
  if (v > 0.35) return MATURATION_TIERS.high
  if (v >= 0.15) return MATURATION_TIERS.medium
  return MATURATION_TIERS.low
}
