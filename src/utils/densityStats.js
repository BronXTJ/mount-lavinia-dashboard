import { DENSITY_METRIC_RAMPS, DENSITY_TYPOLOGY } from '../constants/density.js'
import { interpolateColor } from './centralityStats.js'

// Filter out invalid boundary cells
// A valid cell must have: FSI > 0, GSI > 0, OSR >= 0, Hex_area > 0
export function filterValidFeatures(geojson) {
  const features = geojson?.features ?? []
  return features.filter((f) => {
    const p = f.properties
    return (
      p.FSI > 0 &&
      p.GSI > 0 &&
      p.OSR >= 0 &&
      p.Hex_area > 0
    )
  })
}

function numericValues(features, key) {
  return features
    .map((f) => Number(f.properties?.[key]))
    .filter((v) => v != null && !Number.isNaN(v))
}

export function median(values) {
  if (!values?.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function summarizeMetric(features, key) {
  const pairs = features
    .map((f) => ({ id: f.properties?.id, value: Number(f.properties?.[key]) }))
    .filter((p) => p.value != null && !Number.isNaN(p.value))

  if (!pairs.length) {
    return { min: null, max: null, avg: null, highestId: null, lowestId: null }
  }

  let min = pairs[0].value
  let max = pairs[0].value
  let sum = 0
  let highestId = pairs[0].id
  let lowestId = pairs[0].id

  for (const p of pairs) {
    sum += p.value
    if (p.value < min) {
      min = p.value
      lowestId = p.id
    }
    if (p.value > max) {
      max = p.value
      highestId = p.id
    }
  }

  return {
    min,
    max,
    avg: sum / pairs.length,
    highestId: highestId != null ? Math.round(Number(highestId)) : null,
    lowestId: lowestId != null ? Math.round(Number(lowestId)) : null,
  }
}

export function classifyTypology(fsi, gsi, osr, medianFsi, medianGsi, medianOsr) {
  if (
    fsi == null ||
    gsi == null ||
    osr == null ||
    medianFsi == null ||
    medianGsi == null ||
    medianOsr == null
  ) {
    return DENSITY_TYPOLOGY.bareInactive
  }
  const highFSI = fsi >= medianFsi
  const highGSI = gsi >= medianGsi
  const highOSR = osr >= medianOsr

  if (highFSI && highGSI && !highOSR) return DENSITY_TYPOLOGY.denseCongested
  if (highFSI && highGSI && highOSR) return DENSITY_TYPOLOGY.denseLiveable
  if (highFSI && !highGSI && !highOSR) return DENSITY_TYPOLOGY.verticalCompact
  if (highFSI && !highGSI && highOSR) return DENSITY_TYPOLOGY.verticalOpen
  if (!highFSI && highGSI && !highOSR) return DENSITY_TYPOLOGY.sprawlingCongested
  if (!highFSI && highGSI && highOSR) return DENSITY_TYPOLOGY.sprawlingOpen
  if (!highFSI && !highGSI && highOSR) return DENSITY_TYPOLOGY.openUnderdeveloped
  return DENSITY_TYPOLOGY.bareInactive
}

export function computeTypologyDistribution(features, medianFsi, medianGsi, medianOsr) {
  const counts = Object.fromEntries(Object.keys(DENSITY_TYPOLOGY).map((id) => [id, 0]))

  for (const f of features) {
    const typology = classifyTypology(
      Number(f.properties?.FSI),
      Number(f.properties?.GSI),
      Number(f.properties?.OSR),
      medianFsi,
      medianGsi,
      medianOsr,
    )
    counts[typology.id] += 1
  }

  const total = features.length || 1
  return Object.values(DENSITY_TYPOLOGY).map((t) => ({
    id: t.id,
    name: t.label,
    color: t.color,
    count: counts[t.id],
    pct: Math.round((counts[t.id] / total) * 100),
  }))
}

export function buildScatterPoints(features, medianFsi, medianGsi, medianOsr) {
  return features
    .map((f) => {
      const fsi = Number(f.properties?.FSI)
      const gsi = Number(f.properties?.GSI)
      const osr = Number(f.properties?.OSR)
      if (Number.isNaN(fsi) || Number.isNaN(gsi) || Number.isNaN(osr)) return null
      const typology = classifyTypology(fsi, gsi, osr, medianFsi, medianGsi, medianOsr)
      return {
        id: f.properties?.id,
        fsi,
        gsi,
        osr,
        typology: typology.label,
        typologyId: typology.id,
        color: typology.color,
      }
    })
    .filter(Boolean)
}

/**
 * Equal-width value histogram for a hex metric property.
 * OSR skips zeros (legacy); other metrics skip only non-finite values.
 */
export function buildMetricHistogram(features, propertyKey, buckets = 6) {
  const skipZero = propertyKey === 'OSR'
  const values = features
    .map((f) => Number(f.properties?.[propertyKey]))
    .filter((v) => Number.isFinite(v) && (!skipZero || v !== 0))

  if (!values.length) return []

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const width = span / buckets
  const bins = Array.from({ length: buckets }, (_, i) => {
    const from = min + i * width
    const to = i === buckets - 1 ? max : min + (i + 1) * width
    return {
      index: i,
      from,
      to,
      label: `${from.toFixed(2)}–${to.toFixed(2)}`,
      count: 0,
    }
  })

  for (const v of values) {
    let idx = Math.floor((v - min) / width)
    if (idx >= buckets) idx = buckets - 1
    if (idx < 0) idx = 0
    bins[idx].count += 1
  }

  return bins
}

/** @deprecated Prefer buildMetricHistogram(features, 'OSR', buckets) */
export function buildOsrHistogram(features, buckets = 6) {
  return buildMetricHistogram(features, 'OSR', buckets)
}

function osrOpennessLabel(value) {
  if (value == null) return 'unknown'
  if (value < 0.3) return 'limited'
  if (value < 0.8) return 'moderate'
  return 'generous'
}

export function buildKeyFindings(typologyDist, medianOsr) {
  const ranked = [...(typologyDist ?? [])].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))
  const top = ranked[0]
  const second = ranked[1]
  const osrLabel = osrOpennessLabel(medianOsr)

  const lines = []
  if (top) {
    lines.push(`${top.pct}% of the study area is classified as ${top.name}`)
  }
  if (second) {
    lines.push(`${second.pct}% of the study area is classified as ${second.name}`)
  }
  lines.push(
    `Median OSR of ${medianOsr != null ? medianOsr.toFixed(2) : '—'} indicates ${osrLabel} open space`,
  )
  return lines
}

export function colorForDensityMetric(value, min, max, layerId) {
  if (value == null || min == null || max == null) return '#9fadb9'
  const ramp = DENSITY_METRIC_RAMPS[layerId]
  if (!ramp) return '#9fadb9'
  const span = max - min
  const t = span === 0 ? 0.5 : (value - min) / span
  return interpolateColor(t, ramp)
}

export function formatDensityValue(value, digits = 3) {
  if (value == null || Number.isNaN(value)) return '—'
  return Number(value).toFixed(digits)
}

export function buildDensityStats(features) {
  const fsiValues = numericValues(features, 'FSI')
  const gsiValues = numericValues(features, 'GSI')
  const osrValues = numericValues(features, 'OSR')
  const medianFsi = median(fsiValues)
  const medianGsi = median(gsiValues)
  const medianOsr = median(osrValues)

  const fsi = summarizeMetric(features, 'FSI')
  const gsi = summarizeMetric(features, 'GSI')
  const osr = summarizeMetric(features, 'OSR')
  const density = summarizeMetric(features, 'Density_V')
  const typology = computeTypologyDistribution(features, medianFsi, medianGsi, medianOsr)
  const scatter = buildScatterPoints(features, medianFsi, medianGsi, medianOsr)
  const fsiHistogram = buildMetricHistogram(features, 'FSI', 6)
  const gsiHistogram = buildMetricHistogram(features, 'GSI', 6)
  const osrHistogram = buildMetricHistogram(features, 'OSR', 6)
  const densityHistogram = buildMetricHistogram(features, 'Density_V', 6)
  const findings = buildKeyFindings(typology, medianOsr)

  return {
    fsi,
    gsi,
    osr,
    density,
    medianFsi,
    medianGsi,
    medianOsr,
    typology,
    scatter,
    fsiHistogram,
    gsiHistogram,
    osrHistogram,
    densityHistogram,
    findings,
  }
}
