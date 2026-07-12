/**
 * Shared config for the Focus Area map — used by FocusAreaMap (rendering),
 * MapLayerFab (toggle panel) and Legend (swatches), so all three always
 * agree on order, labels and colors.
 */

export const MAP_CENTER = [6.8389, 79.8653]
export const MAP_ZOOM = 14

// Order matters — this is the exact order requested for the FAB layer panel.
export const MAP_LAYERS = [
  { id: 'boundary', label: 'Primary Study Area Boundary', defaultOn: true, swatchColor: '#dc2626' },
  { id: 'gn5', label: 'Primary Study Area (5 GN Divisions)', defaultOn: true, swatchColor: '#8b5cf6' },
  { id: 'landuse', label: 'Land Use', defaultOn: false, swatchColor: '#fa9f00', isChoropleth: true },
  { id: 'roadNetwork', label: 'Road Network', defaultOn: false, swatchColor: '#f77f00' },
  { id: 'buildings', label: 'Buildings', defaultOn: false, swatchColor: '#94a3b8' },
  { id: 'pois', label: 'POIs', defaultOn: false, swatchColor: '#db2777' },
]

export const DEFAULT_ACTIVE_LAYERS = MAP_LAYERS.filter((l) => l.defaultOn).map((l) => l.id)

// Keys are the exact category names as they appear in landuse.geojson's
// Main_C property (verified against the source data) — this is what the map
// Legend displays, so it must always match the real data 1:1. Colors are
// chosen so every category stays visually distinct from its neighbors and
// from the other map layers (roads orange, buildings slate, boundary red,
// road-highlight brown). Barren Land uses cool light grey (#cbd5e1), distinct
// from buildings (#94a3b8) and the unknown-class fallback (#64748b).
export const LAND_USE_COLORS = {
  Residential: '#fa9f00',
  Commercial: '#ec4899',
  Industrial: '#fb7185',
  Institutional: '#a78bfa',
  Cultural: '#eab308',
  'Public Space': '#22c55e',
  Transport: '#6366f1',
  Agriculture: '#65a30d',
  'Coastal area': '#0ea5e9',
  Water: '#0369a1',
  'Barren Land': '#cbd5e1',
  'Under Construction': '#c026d3',
}
export const LAND_USE_FALLBACK_COLOR = '#64748b'

// Case-insensitive lookup so matching stays robust even if the source data's
// casing varies, while LAND_USE_COLORS itself keeps the exact display casing.
const LAND_USE_COLORS_BY_LOWER_KEY = Object.fromEntries(
  Object.entries(LAND_USE_COLORS).map(([name, color]) => [name.toLowerCase(), color]),
)

export function getLandUseColor(mainClass) {
  if (!mainClass) return LAND_USE_FALLBACK_COLOR
  return LAND_USE_COLORS_BY_LOWER_KEY[mainClass.trim().toLowerCase()] ?? LAND_USE_FALLBACK_COLOR
}

// Saddle-brown — deliberately distinct from every color already used in the
// legend (red boundary, violet GN5/POIs, teal/indigo/pink/rose/sky/emerald/
// olive land-use, cool grey barren, orange roads, slate buildings).
export const HIGHLIGHT_COLOR = '#8b4513'

// Teal accent — used to highlight the currently-selected GN division polygon
// (matches the app's primary accent color, distinct from the default violet
// GN5 fill and the brown road highlight).
export const SELECTED_GN_COLOR = '#00b4d8'
