/** Tab 2 Focus Area — Density Analysis configuration. */

export const DENSITY_MAP_CENTER = [6.8394, 79.8653]
export const DENSITY_MAP_ZOOM = 15

/** 500m analysis boundary — solid red, matches Overview study area. */
export const DENSITY_BUFFER_COLOR = '#dc2626'

/** Multi-stop QGIS-style ramps — Magma / Mako / Cividis / Viridis (no single-hue). */
export const DENSITY_METRIC_RAMPS = {
  fsi: {
    stops: ['#000004', '#3b0f70', '#8c2981', '#de4968', '#fe9f6d', '#fcfdbf'],
    property: 'FSI',
    label: 'FSI',
  },
  gsi: {
    stops: ['#0b0405', '#357ba2', '#3bbcc0', '#9ce5bf', '#def5e5'],
    property: 'GSI',
    label: 'GSI',
  },
  osr: {
    stops: ['#00224e', '#1a4673', '#4a6c6f', '#8a8659', '#c4a647', '#fee838'],
    property: 'OSR',
    label: 'OSR',
  },
  density: {
    stops: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
    property: 'Density_V',
    label: 'Density Value',
  },
}

/** Selected hex outline — light cyan, avoids Magma/Mako/Cividis/Viridis fills. */
export const DENSITY_HEX_HIGHLIGHT = {
  color: '#67e8f9',
  weight: 3,
  fillColor: '#ecfeff',
  fillOpacity: 0.35,
}

export const DENSITY_CONTEXT_STYLES = {
  buildings: { color: '#64748b', fillColor: '#64748b', fillOpacity: 0.6, weight: 0.5, opacity: 0.8 },
  roads: { color: '#f77f00', weight: 2, opacity: 0.9, fill: false },
  pois: { color: '#db2777', fillColor: '#db2777', fillOpacity: 0.9, radius: 5, weight: 1 },
  hexGrid: { color: '#2563eb', weight: 1, opacity: 0.9, fill: false },
}

/** 8-type urban form classification from FSI + GSI + OSR median splits. */
export const DENSITY_TYPOLOGY = {
  denseCongested: { id: 'denseCongested', label: 'Dense Congested Urban', color: '#dc2626' },
  denseLiveable: { id: 'denseLiveable', label: 'Dense Liveable Urban', color: '#16a34a' },
  verticalCompact: { id: 'verticalCompact', label: 'Vertical Compact', color: '#9333ea' },
  verticalOpen: { id: 'verticalOpen', label: 'Vertical Open', color: '#06b6d4' },
  sprawlingCongested: { id: 'sprawlingCongested', label: 'Sprawling Congested', color: '#d97706' },
  sprawlingOpen: { id: 'sprawlingOpen', label: 'Sprawling Open', color: '#65a30d' },
  openUnderdeveloped: { id: 'openUnderdeveloped', label: 'Open Underdeveloped', color: '#0369a1' },
  bareInactive: { id: 'bareInactive', label: 'Bare / Inactive Land', color: '#57534e' },
}

/** FAB layer panel — order and indicator dots. */
export const DENSITY_FAB_LAYERS = [
  { id: 'analysisArea', label: 'Analysis Area Boundary', dot: '#dc2626', group: 'independent' },
  { id: 'hexGrid', label: '100m Hex Grid', dot: '#2563eb', group: 'independent' },
  { id: 'fsi', label: 'FSI — Floor Space Index', dot: '#de4968', group: 'metric' },
  { id: 'gsi', label: 'GSI — Ground Space Index', dot: '#3bbcc0', group: 'metric' },
  { id: 'osr', label: 'OSR — Open Space Ratio', dot: '#4a6c6f', group: 'metric' },
  { id: 'density', label: 'Density Value', dot: '#5ec962', group: 'metric' },
  { id: 'buildings', label: 'Buildings', dot: '#64748b', group: 'independent' },
  { id: 'roads', label: 'Roads', dot: '#f77f00', group: 'independent' },
  { id: 'pois', label: 'POIs', dot: '#db2777', group: 'independent' },
]

export const DEFAULT_DENSITY_VISIBLE = {
  analysisArea: true,
  hexGrid: false,
  fsi: false,
  gsi: false,
  osr: false,
  density: true,
  buildings: false,
  roads: false,
  pois: false,
}

export const DENSITY_METRIC_IDS = ['fsi', 'gsi', 'osr', 'density']

/** Layers that can show or keep a hex cell selection (outline or choropleth). */
export const DENSITY_HEX_SELECTABLE_IDS = ['hexGrid', ...DENSITY_METRIC_IDS]

export function densityGeoUrl(fileName) {
  return `${import.meta.env.BASE_URL}data/density-analysis/${fileName}`
}

/** First active metric layer id, or null if none. */
export function getActiveDensityMetric(visibleLayers) {
  return DENSITY_METRIC_IDS.find((id) => visibleLayers?.[id]) ?? null
}

/** True if any hex-capable layer (grid outline or metric choropleth) is on. */
export function hasHexSelectableLayer(visibleLayers) {
  return DENSITY_HEX_SELECTABLE_IDS.some((id) => visibleLayers?.[id])
}
