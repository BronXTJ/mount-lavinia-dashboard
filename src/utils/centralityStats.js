import { CLOSENESS_RAMP, BETWEENNESS_RAMP } from '../constants/centrality.js'

function parseHex(hex) {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function toHex({ r, g, b }) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${[clamp(r), clamp(g), clamp(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Interpolates across an n-stop colour ramp (ramp.stops).
 * t=0 → first stop, t=1 → last stop. Stops are evenly distributed.
 */
export function interpolateColor(t, ramp) {
  const stops = ramp.stops
  const n = stops.length - 1
  const scaled = Math.max(0, Math.min(1, t)) * n
  const idx = Math.min(Math.floor(scaled), n - 1)
  const localT = scaled - idx
  const a = parseHex(stops[idx])
  const b = parseHex(stops[idx + 1])
  return toHex({
    r: a.r + (b.r - a.r) * localT,
    g: a.g + (b.g - a.g) * localT,
    b: a.b + (b.b - a.b) * localT,
  })
}

export function getMetricValue(properties, metric, scaleMeters) {
  if (!properties) return null
  if (properties.value != null && !Number.isNaN(Number(properties.value))) {
    return Number(properties.value)
  }
  const key =
    metric === 'closeness' ? `NQPDA${scaleMeters}` : metric === 'betweenness' ? `BtA${scaleMeters}` : null
  if (key && properties[key] != null) return Number(properties[key])
  return null
}

export function getRampForMetric(metric) {
  return metric === 'betweenness' ? BETWEENNESS_RAMP : CLOSENESS_RAMP
}

export function colorForValue(value, min, max, metric) {
  if (value == null || min == null || max == null) return '#9fadb9'
  const span = max - min
  const t = span === 0 ? 0.5 : (value - min) / span
  return interpolateColor(t, getRampForMetric(metric))
}

const DELTA_GAIN = '#22c55e'
const DELTA_ZERO = '#94a3b8'
const DELTA_LOSS = '#ef4444'

/**
 * Symmetric green / grey / red for scenario − baseline Δ.
 * `maxAbs` is the layer’s max |Δ|; ~0 stays muted grey.
 */
export function colorForSignedDelta(delta, maxAbs) {
  if (delta == null || !Number.isFinite(delta) || maxAbs == null || !Number.isFinite(maxAbs) || maxAbs <= 0) {
    return DELTA_ZERO
  }
  const t = Math.max(-1, Math.min(1, delta / maxAbs))
  if (Math.abs(t) < 0.02) return DELTA_ZERO
  if (t > 0) return interpolateColor(t, { stops: [DELTA_ZERO, DELTA_GAIN] })
  return interpolateColor(-t, { stops: [DELTA_ZERO, DELTA_LOSS] })
}

export function formatMetricValue(value) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(4)
}

export function interpretCentrality(value, min, max) {
  if (value == null || min == null || max == null) {
    return { tier: 'Unknown', text: 'No interpretation available.' }
  }
  const span = max - min
  const t = span === 0 ? 0.5 : (value - min) / span
  if (t >= 2 / 3) {
    return {
      tier: 'High',
      text: 'High — Major movement corridor / Core accessible zone',
    }
  }
  if (t >= 1 / 3) {
    return {
      tier: 'Moderate',
      text: 'Moderate — Secondary route / Moderately accessible',
    }
  }
  return {
    tier: 'Low',
    text: 'Low — Quiet backstreet / Peripheral zone',
  }
}

export function segmentLabel(properties) {
  if (!properties) return 'Road segment'
  if (properties.name) return String(properties.name)
  if (properties.ID != null) return `Seg ${Math.round(properties.ID)}`
  return 'Road segment'
}

/** Shorter label used in bar-chart Y-axis — just the numeric ID (fallback). */
export function segmentShortLabel(properties) {
  if (!properties) return '—'
  if (properties.ID != null) return `#${Math.round(properties.ID)}`
  return segmentLabel(properties)
}

// ---------------------------------------------------------------------------
// Road-name spatial lookup
// ---------------------------------------------------------------------------

/** Returns a [lng, lat] midpoint pair for LineString or MultiLineString features. */
function getMidpoint(feature) {
  const geom = feature?.geometry
  if (!geom?.coordinates?.length) return null
  if (geom.type === 'LineString') {
    const c = geom.coordinates
    return c[Math.floor(c.length / 2)]
  }
  if (geom.type === 'MultiLineString') {
    // Pick the middle ring, then the middle point within that ring
    const rings = geom.coordinates
    const ring = rings[Math.floor(rings.length / 2)]
    if (!ring?.length) return null
    return ring[Math.floor(ring.length / 2)]
  }
  return null
}

/** Simple Euclidean distance in degree-space — adequate for the small study area. */
function distanceDeg(a, b) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Finds the name of the nearest named road to `feature` within ~90 m (0.0008°).
 * Returns the road name string, or null if no match is close enough.
 * `namedRoads` is an array of GeoJSON features pre-filtered to those with a name.
 */
export function lookupRoadName(feature, namedRoads) {
  const mid = getMidpoint(feature)
  if (!mid || !namedRoads?.length) return null
  let best = null
  let bestDist = 0.0008
  for (const road of namedRoads) {
    const roadMid = getMidpoint(road)
    if (!roadMid) continue
    const d = distanceDeg(mid, roadMid)
    if (d < bestDist) {
      bestDist = d
      best = road.properties.name
    }
  }
  return best
}

// ---------------------------------------------------------------------------

/**
 * Aggregate min/max/avg and top-5 segments from a FeatureCollection.
 * Pass `namedRoads` (array of GeoJSON features with names) to resolve
 * real road names for the top-5 bar chart labels.
 */
export function summarizeGeoJson(geojson, metric, scaleMeters, namedRoads = null) {
  if (!geojson?.features?.length) {
    return { min: null, max: null, avg: null, top5: [] }
  }

  const rows = []
  for (const feature of geojson.features) {
    const value = getMetricValue(feature.properties, metric, scaleMeters)
    if (value == null || Number.isNaN(value)) continue
    rows.push({
      id: feature.properties?.ID,
      // Store the feature reference so we can look up names after sorting
      _feature: feature,
      value,
    })
  }

  if (!rows.length) {
    return { min: null, max: null, avg: null, top5: [] }
  }

  const values = rows.map((r) => r.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((a, b) => a + b, 0) / values.length

  const top5 = [...rows]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map(({ id, _feature, value }) => ({
      id,
      // Prefer a real road name; fall back to segment ID label
      label: lookupRoadName(_feature, namedRoads) ?? segmentShortLabel(_feature?.properties),
      value,
    }))

  return { min, max, avg, top5 }
}

/**
 * Splits all road segments in a GeoJSON into three equal-range zones
 * (High / Medium / Low) based on their normalised position in [min, max].
 * Returns an array of { name, count, pct } objects, or null if no data.
 */
export function computeZoneDistribution(geojson, metric, scaleMeters) {
  if (!geojson?.features?.length) return null
  const values = geojson.features
    .map((f) => getMetricValue(f.properties, metric, scaleMeters))
    .filter((v) => v != null && !Number.isNaN(v))
  if (!values.length) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  let high = 0, medium = 0, low = 0
  for (const v of values) {
    const t = span === 0 ? 0.5 : (v - min) / span
    if (t >= 2 / 3) high++
    else if (t >= 1 / 3) medium++
    else low++
  }
  const total = values.length
  return [
    { name: 'High',   count: high,   pct: Math.round((high   / total) * 100) },
    { name: 'Medium', count: medium, pct: Math.round((medium / total) * 100) },
    { name: 'Low',    count: low,    pct: Math.round((low    / total) * 100) },
  ]
}
