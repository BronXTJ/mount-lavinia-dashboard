/** Tab 2 Focus Area — Network Form (junction typology) configuration. */

export const NETWORK_FORM_MAP_CENTER = [6.8394, 79.8635]
export const NETWORK_FORM_MAP_ZOOM = 15
export const NETWORK_FORM_SELECTED_ZOOM = 17

export const NETWORK_FORM_ICONS = {
  four_way: {
    id: 'four_way',
    label: '4-way',
    color: '#ef4444',
    symbol: 'triangle',
  },
  three_way: {
    id: 'three_way',
    label: '3-way',
    color: '#3b82f6',
    symbol: 'square',
  },
  culdesac: {
    id: 'culdesac',
    label: 'Cul-de-sac',
    color: '#f59e0b',
    symbol: 'circle',
  },
}

export const NETWORK_FORM_ROAD_COLOR = '#e2e8f0'
export const NETWORK_FORM_ROAD_COLOR_ON_STREETS = '#0f172a'
export const NETWORK_FORM_ROAD_WEIGHT = 3.25
export const NETWORK_FORM_ROAD_WEIGHT_ON_STREETS = 4
export const NETWORK_FORM_GN_COLOR = '#00b4d8'
export const NETWORK_FORM_HIGHLIGHT = '#00b4d8'

export const NETWORK_FORM_FAB_JUNCTION_LAYERS = [
  { id: 'four_way', label: '4-way junctions', dot: NETWORK_FORM_ICONS.four_way.color },
  { id: 'three_way', label: '3-way junctions', dot: NETWORK_FORM_ICONS.three_way.color },
  { id: 'culdesac', label: 'Cul-de-sacs', dot: NETWORK_FORM_ICONS.culdesac.color },
]

export const NETWORK_FORM_FAB_CONTEXT_LAYERS = [
  { id: 'roads', label: 'Street pathways', dot: NETWORK_FORM_ROAD_COLOR },
  { id: 'gnBoundary', label: 'Mount Lavinia GN', dot: NETWORK_FORM_GN_COLOR },
]

export const DEFAULT_NETWORK_FORM_VISIBLE = {
  four_way: true,
  three_way: true,
  culdesac: true,
  roads: true,
  gnBoundary: true,
}

export function networkFormGeoUrl(fileName) {
  return `${import.meta.env.BASE_URL}data/network-form/${fileName}`
}

export const NETWORK_FORM_JTYPE_LABEL = {
  four_way: '4-way junction',
  three_way: '3-way junction',
  culdesac: 'Cul-de-sac',
}
