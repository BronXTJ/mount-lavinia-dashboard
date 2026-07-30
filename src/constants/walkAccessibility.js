/** Tab 2 Focus Area — Walk Accessibility (destination-based) configuration. */

export const WALK_MAP_CENTER = [6.8344, 79.8685]
export const WALK_MAP_ZOOM = 14

/** Primary study area boundary — solid red, matches Density / Maturation. */
export const WALK_BUFFER_COLOR = '#dc2626'

/** GeoJSON property keys on access_hex_classified. */
export const WALK_PROPS = {
  accessScore: 'access_score',
  accessTier: 'access_tier',
  timeFood: 'time_food_min',
  timeEducation: 'time_education_min',
  timeHealth: 'time_health_min',
  timeTransit: 'time_transit_min',
  timeFinance: 'time_finance_min',
  timeOpenSpace: 'time_open_space_min',
  groupsWithin10: 'groups_within_10',
  mismatchFlag: 'mismatch_flag',
  meanBtA: 'mean_BtA5000',
}

export const WALK_DEST_GROUPS = [
  { id: 'food', label: 'Food', timeKey: 'timeFood', timeProp: 'time_food_min', reachKey: 'reach_food_10' },
  { id: 'education', label: 'Education', timeKey: 'timeEducation', timeProp: 'time_education_min', reachKey: 'reach_education_10' },
  { id: 'health', label: 'Health', timeKey: 'timeHealth', timeProp: 'time_health_min', reachKey: 'reach_health_10' },
  { id: 'transit', label: 'Transit', timeKey: 'timeTransit', timeProp: 'time_transit_min', reachKey: 'reach_transit_10' },
  { id: 'finance', label: 'Finance', timeKey: 'timeFinance', timeProp: 'time_finance_min', reachKey: 'reach_finance_10' },
  { id: 'open_space', label: 'Open space', timeKey: 'timeOpenSpace', timeProp: 'time_open_space_min', reachKey: 'reach_open_space_10' },
]

/** Access tier colours (categorical choropleth). */
export const WALK_ACCESS_TIERS = {
  high: { id: 'high', label: 'High access', shortLabel: 'High', color: '#0d9488' },
  medium: { id: 'medium', label: 'Medium access', shortLabel: 'Medium', color: '#fbbf24' },
  low: { id: 'low', label: 'Low / desert', shortLabel: 'Low', color: '#dc2626' },
  excluded: { id: 'excluded', label: 'Excluded', shortLabel: 'Excluded', color: '#94a3b8' },
}

/** Hex choropleth ramps — mutually exclusive metric layers. */
export const WALK_METRIC_RAMPS = {
  accessScore: {
    stops: ['#f0fdfa', '#99f6e4', '#2dd4bf', '#0d9488', '#115e59', '#042f2e'],
    property: WALK_PROPS.accessScore,
    label: 'Access score (0–1)',
  },
  accessTier: {
    stops: ['#dc2626', '#fbbf24', '#0d9488'],
    property: WALK_PROPS.accessTier,
    label: 'Access tier',
    categorical: true,
  },
  timeFood: {
    stops: ['#042f2e', '#115e59', '#0d9488', '#5eead4', '#ccfbf1', '#f0fdfa'],
    property: WALK_PROPS.timeFood,
    label: 'Walk time — Food (min)',
  },
  timeEducation: {
    stops: ['#042f2e', '#115e59', '#0d9488', '#5eead4', '#ccfbf1', '#f0fdfa'],
    property: WALK_PROPS.timeEducation,
    label: 'Walk time — Education (min)',
  },
  timeHealth: {
    stops: ['#042f2e', '#115e59', '#0d9488', '#5eead4', '#ccfbf1', '#f0fdfa'],
    property: WALK_PROPS.timeHealth,
    label: 'Walk time — Health (min)',
  },
  timeTransit: {
    stops: ['#042f2e', '#115e59', '#0d9488', '#5eead4', '#ccfbf1', '#f0fdfa'],
    property: WALK_PROPS.timeTransit,
    label: 'Walk time — Transit (min)',
  },
  timeFinance: {
    stops: ['#042f2e', '#115e59', '#0d9488', '#5eead4', '#ccfbf1', '#f0fdfa'],
    property: WALK_PROPS.timeFinance,
    label: 'Walk time — Finance (min)',
  },
  timeOpenSpace: {
    stops: ['#042f2e', '#115e59', '#0d9488', '#5eead4', '#ccfbf1', '#f0fdfa'],
    property: WALK_PROPS.timeOpenSpace,
    label: 'Walk time — Open space (min)',
  },
}

export const WALK_HEX_HIGHLIGHT = {
  color: '#67e8f9',
  weight: 3,
  fillColor: '#ecfeff',
  fillOpacity: 0.35,
}

export const WALK_CONTEXT_STYLES = {
  hexGrid: { color: '#2563eb', weight: 1, opacity: 0.9, fill: false },
  buildings: { color: '#64748b', fillColor: '#64748b', fillOpacity: 0.6, weight: 0.5, opacity: 0.8 },
  roads: { color: '#f77f00', weight: 2, opacity: 0.9, fill: false },
  pois: { color: '#db2777', fillColor: '#db2777', fillOpacity: 0.9, radius: 5, weight: 1 },
  deserts: { color: '#dc2626', weight: 2.5, fill: false, opacity: 0.95, dashArray: null },
  mismatch: { color: '#7c3aed', weight: 2.5, fill: false, opacity: 0.95, dashArray: '6 4' },
}

export const WALK_FAB_LAYERS = [
  { id: 'analysisArea', label: 'Primary Study Area Boundary', dot: '#dc2626', group: 'independent' },
  { id: 'hexGrid', label: '100 m Hex Grid — Primary', dot: '#2563eb', group: 'independent' },
  { id: 'accessScore', label: 'Access Score', dot: '#0d9488', group: 'metric' },
  { id: 'accessTier', label: 'Access Tier', dot: '#fbbf24', group: 'metric' },
  { id: 'timeFood', label: 'Walk Time — Food', dot: '#14b8a6', group: 'metric' },
  { id: 'timeEducation', label: 'Walk Time — Education', dot: '#2dd4bf', group: 'metric' },
  { id: 'timeHealth', label: 'Walk Time — Health', dot: '#5eead4', group: 'metric' },
  { id: 'timeTransit', label: 'Walk Time — Transit', dot: '#99f6e4', group: 'metric' },
  { id: 'timeFinance', label: 'Walk Time — Finance', dot: '#ccfbf1', group: 'metric' },
  { id: 'timeOpenSpace', label: 'Walk Time — Open Space', dot: '#f0fdfa', group: 'metric' },
  { id: 'deserts', label: 'Deserts outline (low tier)', dot: '#dc2626', group: 'independent' },
  { id: 'mismatch', label: 'Centrality–access mismatch', dot: '#7c3aed', group: 'independent' },
  { id: 'buildings', label: 'Buildings (Zenodo)', dot: '#64748b', group: 'independent' },
  { id: 'roads', label: 'Roads — Primary', dot: '#f77f00', group: 'independent' },
  { id: 'pois', label: 'POIs — Access destinations', dot: '#db2777', group: 'independent' },
]

export const DEFAULT_WALK_VISIBLE = {
  analysisArea: true,
  hexGrid: false,
  accessScore: true,
  accessTier: false,
  timeFood: false,
  timeEducation: false,
  timeHealth: false,
  timeTransit: false,
  timeFinance: false,
  timeOpenSpace: false,
  deserts: false,
  mismatch: false,
  buildings: false,
  roads: false,
  pois: false,
}

export const WALK_METRIC_IDS = [
  'accessScore',
  'accessTier',
  'timeFood',
  'timeEducation',
  'timeHealth',
  'timeTransit',
  'timeFinance',
  'timeOpenSpace',
]

export const WALK_HEX_SELECTABLE_IDS = ['hexGrid', ...WALK_METRIC_IDS]

export function walkGeoUrl(fileName) {
  return `${import.meta.env.BASE_URL}data/walk-accessibility/${fileName}`
}

/** Shared context layers from density-analysis (same primary extent). */
export function walkContextGeoUrl(fileName) {
  return `${import.meta.env.BASE_URL}data/density-analysis/${fileName}`
}

export function getActiveWalkMetric(visibleLayers) {
  return WALK_METRIC_IDS.find((id) => visibleLayers?.[id]) ?? null
}

export function hasWalkHexSelectableLayer(visibleLayers) {
  return WALK_HEX_SELECTABLE_IDS.some((id) => visibleLayers?.[id])
}

export function classifyWalkAccessTier(tier) {
  const key = String(tier ?? '').toLowerCase()
  return WALK_ACCESS_TIERS[key] ?? WALK_ACCESS_TIERS.excluded
}

export function getWalkTierColor(tier) {
  return classifyWalkAccessTier(tier).color
}
