import { colorForValue, getMetricValue, interpolateColor } from './centralityStats.js'

const ACCENT = '#34d399'
const BOUNDARY_STROKE = '#dc2626'

const EMERALD_RAMP = { stops: ['#064e3b', '#34d399', '#a7f3d0'] }

/** Item id → primary numeric property for choropleth preview. */
const ITEM_VALUE_KEYS = {
  'mat-urban': '1urban mat',
  'mat-mui': '1urban mat',
  'mat-shannon': '1entropy_i',
  'mat-density': 'Density_V',
  'env-uhi': 'UHI_intens',
  'env-tmrt': 'Tmrt',
  'env-svf': 'SVF_value1',
}

function parseCentralityItemId(itemId) {
  const clMatch = itemId?.match(/^cl-(\d+)$/)
  if (clMatch) return { metric: 'closeness', scaleMeters: Number(clMatch[1]) }
  const btMatch = itemId?.match(/^bt-(\d+)$/)
  if (btMatch) return { metric: 'betweenness', scaleMeters: Number(btMatch[1]) }
  return null
}

function readFeatureValue(feature, centrality, valueKey) {
  if (centrality) {
    return getMetricValue(feature.properties, centrality.metric, centrality.scaleMeters)
  }
  if (valueKey) {
    const value = Number(feature.properties?.[valueKey])
    return Number.isFinite(value) ? value : null
  }
  return null
}

function choroplethColor(value, min, max, centrality) {
  if (value == null || !Number.isFinite(value)) return '#9fadb9'
  if (centrality) return colorForValue(value, min, max, centrality.metric)
  const span = max - min
  const t = span === 0 ? 0.5 : (value - min) / span
  return interpolateColor(t, EMERALD_RAMP)
}

/**
 * Builds Leaflet style helpers for export GeoJSON preview layers.
 * @param {import('geojson').FeatureCollection} geojson
 * @param {string} itemId
 */
export function buildExportGeoJsonStyler(geojson, itemId) {
  const centrality = parseCentralityItemId(itemId)
  const valueKey = ITEM_VALUE_KEYS[itemId] ?? null

  let min = Infinity
  let max = -Infinity
  let hasChoropleth = false

  if (centrality || valueKey) {
    for (const feature of geojson.features ?? []) {
      const value = readFeatureValue(feature, centrality, valueKey)
      if (!Number.isFinite(value)) continue
      hasChoropleth = true
      if (value < min) min = value
      if (value > max) max = value
    }
  }

  function style(feature) {
    const geomType = feature.geometry?.type ?? ''

    if (itemId === 'env-boundary-800' && geomType.includes('Polygon')) {
      return { color: BOUNDARY_STROKE, weight: 2, fill: false, opacity: 0.9 }
    }

    if (hasChoropleth) {
      const value = readFeatureValue(feature, centrality, valueKey)
      const color = choroplethColor(value, min, max, centrality)

      if (geomType.includes('Line')) {
        return { color, weight: 2, opacity: 0.9 }
      }
      if (geomType.includes('Polygon')) {
        return { color, weight: 1, fillColor: color, fillOpacity: 0.55 }
      }
    }

    if (geomType.includes('Line')) {
      return { color: ACCENT, weight: 2, opacity: 0.85 }
    }
    if (geomType.includes('Polygon')) {
      return { color: ACCENT, weight: 1, fillColor: ACCENT, fillOpacity: 0.35 }
    }
    return { color: ACCENT, weight: 2, fillColor: ACCENT, fillOpacity: 0.8 }
  }

  function pointStyle(feature) {
    if (hasChoropleth) {
      const value = readFeatureValue(feature, centrality, valueKey)
      const color = choroplethColor(value, min, max, centrality)
      return { radius: 5, color: '#ffffff', weight: 1, fillColor: color, fillOpacity: 0.85 }
    }
    return { radius: 4, color: '#ffffff', weight: 1, fillColor: ACCENT, fillOpacity: 0.85 }
  }

  return { style, pointStyle }
}
