/** Tab 2 Focus Area — centrality analysis configuration. */

export const CENTRALITY_MAP_CENTER = [6.8394, 79.8653]
export const CENTRALITY_MAP_ZOOM = 15

export const CENTRALITY_SCALES = [
  { meters: 500, label: '500m — Walking Scale', shortLabel: 'Walking Scale — 500m' },
  { meters: 2000, label: '2000m — Neighbourhood Scale', shortLabel: 'Neighbourhood Scale — 2000m' },
  { meters: 3000, label: '3000m — District Scale', shortLabel: 'District Scale — 3000m' },
  { meters: 5000, label: '5000m — Regional Scale', shortLabel: 'Regional Scale — 5000m' },
]

// Closeness: Blue → Cyan → Green → Yellow → Soft Red (low → very high)
export const CLOSENESS_RAMP = {
  stops: ['#2563EB', '#06B6D4', '#22C55E', '#FACC15', '#EF4444'],
}

// Betweenness: Viridis-inspired — Light Lavender → Blue → Teal → Green → Yellow (low → very high)
// First stop lightened from #440154 (near-black) to #A78BFA so it reads against the dark basemap
export const BETWEENNESS_RAMP = {
  stops: ['#A78BFA', '#3B528B', '#21908C', '#5DC863', '#FDE725'],
}

// Bar chart accent colors — the "Very High" end of each palette
export const CLOSENESS_BAR_COLOR = '#EF4444'
export const BETWEENNESS_BAR_COLOR = '#FDE725'

export const PLACEHOLDER_TOP5 = [
  { label: 'Segment A', value: 0.08 },
  { label: 'Segment B', value: 0.07 },
  { label: 'Segment C', value: 0.06 },
  { label: 'Segment D', value: 0.05 },
  { label: 'Segment E', value: 0.04 },
]

export function centralityGeoUrl(fileName) {
  return `${import.meta.env.BASE_URL}data/urban-morpho/centrality/${fileName}`
}

export const CENTRALITY_BOUNDARIES = [
  { meters: 500, label: '500m Boundary', color: '#93c5fd' },
  { meters: 2000, label: '2000m Boundary', color: '#f9a8d4' },
  { meters: 3000, label: '3000m Boundary', color: '#fcd34d' },
  { meters: 5000, label: '5000m Boundary', color: '#c4b5fd' },
]

export function boundaryLayerId(meters) {
  return `boundary${meters}`
}

export const CENTRALITY_FAB_METRIC_LAYERS = [
  { id: 'closeness', label: 'Closeness Centrality', dot: CLOSENESS_BAR_COLOR },
  { id: 'betweenness', label: 'Betweenness Centrality', dot: BETWEENNESS_BAR_COLOR },
  { id: 'roadLabels', label: 'Road Labels', dot: '#e0e0e0' },
]

export const CENTRALITY_FAB_BOUNDARY_LAYERS = CENTRALITY_BOUNDARIES.map(({ meters, label, color }) => ({
  id: boundaryLayerId(meters),
  meters,
  label,
  dot: color,
}))

export const DEFAULT_CENTRALITY_VISIBLE = {
  closeness: true,
  betweenness: false,
  roadLabels: false,
  ...Object.fromEntries(CENTRALITY_FAB_BOUNDARY_LAYERS.map(({ id }) => [id, true])),
}

export function boundaryGeoUrl(meters) {
  return `${import.meta.env.BASE_URL}data/urban-morpho/boundary_${meters}m.geojson`
}

export function scaleLabel(meters) {
  return CENTRALITY_SCALES.find((s) => s.meters === meters)?.shortLabel ?? `${meters}m`
}
