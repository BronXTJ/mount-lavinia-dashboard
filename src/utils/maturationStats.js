import {
  MATURATION_METRIC_RAMPS,
  MATURATION_PROPS,
  MATURATION_TIERS,
  classifyMaturationTier,
  getMaturationLandUseColor,
} from '../constants/maturation.js'
import {
  buildMetricClasses,
  buildQuantileBreaks,
  colorForMetricClass,
} from './metricClasses.js'

// Re-export for any callers that imported quantile helpers from maturationStats.
export { buildQuantileBreaks }

/** Skip edge / incomplete cells. Prefer is_valid_maturation when present. */
export function filterValidMaturationFeatures(geojson) {
  const features = geojson?.features ?? []
  return features.filter((f) => {
    const p = f.properties ?? {}
    if (p.is_valid_maturation === true || p.is_valid_maturation === 'true') return true
    if (p.is_valid_maturation === false || p.is_valid_maturation === 'false') return false
    if (p.is_edge === true || p.is_edge === 'true') return false
    const umi = Number(p[MATURATION_PROPS.umi])
    const avgC = Number(p[MATURATION_PROPS.accessibilityRaw])
    if (umi === 0 && avgC === 0) return false
    return true
  })
}

/** Complete enough for min/max / Cell ID cards (not edge scraps). Map still keeps incomplete cells. */
export function isCompleteMaturationCell(feature) {
  const p = feature?.properties ?? {}
  const entropy = Number(p[MATURATION_PROPS.entropyRaw])
  const avgC = Number(p[MATURATION_PROPS.accessibilityRaw])
  const hasEntropy = Number.isFinite(entropy)
  const hasAcc = Number.isFinite(avgC)
  // Shannon-only layers lack these fields — do not exclude them from extrema
  if (!hasEntropy && !hasAcc) return true
  if (hasEntropy && hasAcc) return entropy > 0 && avgC > 0
  if (hasEntropy) return entropy > 0
  return avgC > 0
}

function numericValues(features, key) {
  return features
    .map((f) => Number(f.properties?.[key]))
    .filter((v) => Number.isFinite(v))
}

export function median(values) {
  if (!values?.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function summarizeMetric(features, key) {
  const allPairs = features
    .map((f) => ({ id: f.properties?.id, value: Number(f.properties?.[key]), feature: f }))
    .filter((p) => Number.isFinite(p.value))

  if (!allPairs.length) {
    return { min: null, max: null, avg: null, highestId: null, lowestId: null }
  }

  const sum = allPairs.reduce((s, p) => s + p.value, 0)
  const avg = sum / allPairs.length

  // Min/max + Cell IDs: complete cells only (entropy>0 & accessibility>0)
  const extremaPairs = allPairs.filter((p) => isCompleteMaturationCell(p.feature))
  const positive = extremaPairs.filter((p) => p.value > 0)

  let min = null
  let max = null
  let lowestId = null
  let highestId = null

  if (positive.length) {
    min = positive[0].value
    max = positive[0].value
    lowestId = positive[0].id
    highestId = positive[0].id
    for (const p of positive) {
      if (p.value < min) {
        min = p.value
        lowestId = p.id
      }
      if (p.value > max) {
        max = p.value
        highestId = p.id
      }
    }
  }

  return {
    min,
    max,
    avg,
    highestId: highestId != null ? Math.round(Number(highestId)) : null,
    lowestId: lowestId != null ? Math.round(Number(lowestId)) : null,
  }
}

export function buildMetricHistogram(features, propertyKey, buckets = 6, fixedRange = null) {
  const values = numericValues(features, propertyKey)
  if (!values.length) {
    return Array.from({ length: buckets }, () => ({
      label: '—',
      count: 0,
      from: 0,
      to: 0,
    }))
  }

  const min = fixedRange?.min ?? Math.min(...values)
  const max = fixedRange?.max ?? Math.max(...values)
  const span = max - min || 1
  const width = span / buckets

  const bins = Array.from({ length: buckets }, (_, i) => {
    const from = min + i * width
    const to = i === buckets - 1 ? max : min + (i + 1) * width
    return {
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

export function computeTierDistribution(features) {
  const counts = { high: 0, medium: 0, low: 0 }
  for (const f of features) {
    const tier = classifyMaturationTier(f.properties?.[MATURATION_PROPS.umi])
    counts[tier.id] += 1
  }
  const total = features.length || 1
  return [MATURATION_TIERS.high, MATURATION_TIERS.medium, MATURATION_TIERS.low].map((t) => ({
    id: t.id,
    name: t.label,
    color: t.color,
    count: counts[t.id],
    pct: Math.round((counts[t.id] / total) * 100),
  }))
}

export function buildLandUseComposition(landuseGeojson) {
  const features = landuseGeojson?.features ?? []
  const byCategory = new Map()

  for (const f of features) {
    const cat = f.properties?.Main_C || 'Unknown'
    const areaM2 = Number(f.properties?.Area_m2)
    const landExten = Number(f.properties?.Land_Exten)
    // Prefer geometric area (m²) — Land_Exten is skewed (e.g. Transport) and hides small classes.
    const area = Number.isFinite(areaM2) && areaM2 > 0
      ? areaM2
      : Number.isFinite(landExten) && landExten > 0
        ? landExten
        : 0
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + area)
  }

  const total = [...byCategory.values()].reduce((s, v) => s + v, 0) || 1
  return [...byCategory.entries()]
    .map(([name, area]) => ({
      name,
      area,
      pct: Math.round((area / total) * 10000) / 100,
      color: getMaturationLandUseColor(name),
    }))
    .filter((row) => row.area > 0)
    .sort((a, b) => b.area - a.area)
}

export function buildEntropyScatter(features) {
  return features
    .map((f) => {
      const p = f.properties ?? {}
      const entropy = Number(p[MATURATION_PROPS.entropyNorm])
      const umi = Number(p[MATURATION_PROPS.umi])
      if (!Number.isFinite(entropy) || !Number.isFinite(umi)) return null
      return {
        id: p.id != null ? Math.round(Number(p.id)) : null,
        entropy,
        umi,
      }
    })
    .filter(Boolean)
}

function pointInRing(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi) {
      inside = !inside
    }
  }
  return inside
}

function pointInPolygon(lon, lat, geometry) {
  if (!geometry) return false
  if (geometry.type === 'Polygon') {
    const [outer, ...holes] = geometry.coordinates
    if (!outer?.length || !pointInRing(lon, lat, outer)) return false
    for (const hole of holes) {
      if (hole?.length && pointInRing(lon, lat, hole)) return false
    }
    return true
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((coords) =>
      pointInPolygon(lon, lat, { type: 'Polygon', coordinates: coords }),
    )
  }
  return false
}

/** Shoelace centroid of the outer ring (lon/lat). */
function geometryCentroid(geometry) {
  if (!geometry) return null
  let ring = null
  if (geometry.type === 'Polygon') ring = geometry.coordinates?.[0]
  else if (geometry.type === 'MultiPolygon') ring = geometry.coordinates?.[0]?.[0]
  else if (geometry.type === 'Point') {
    const c = geometry.coordinates
    return c?.length >= 2 ? [c[0], c[1]] : null
  }
  if (!ring?.length) return null

  let area = 0
  let cx = 0
  let cy = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x0, y0] = ring[j]
    const [x1, y1] = ring[i]
    const a = x0 * y1 - x1 * y0
    area += a
    cx += (x0 + x1) * a
    cy += (y0 + y1) * a
  }
  area *= 0.5
  if (Math.abs(area) < 1e-18) {
    let sx = 0
    let sy = 0
    for (const [x, y] of ring) {
      sx += x
      sy += y
    }
    return [sx / ring.length, sy / ring.length]
  }
  return [cx / (6 * area), cy / (6 * area)]
}

export function getFunctionalGroup(mainC) {
  if (mainC === 'Residential') return 'Living'
  if (['Commercial', 'Industrial', 'Institutional'].includes(mainC)) return 'Working'
  if (['Cultural', 'Public Space', 'Agriculture'].includes(mainC)) return 'Culture & Recreation'
  if (mainC === 'Transport') return 'Movement'
  return 'Other'
}

const FUNCTIONAL_COMPOSITION_TYPES = [
  { id: 'liveWorkCulture', name: 'Live + Work + Culture', color: '#fde68a' },
  { id: 'liveWork', name: 'Live + Work', color: '#86efac' },
  { id: 'liveOnly', name: 'Live only', color: '#fa9f00' },
  { id: 'workOnly', name: 'Work only', color: '#a5b4fc' },
  { id: 'movement', name: 'Movement dominated', color: '#94a3b8' },
  { id: 'other', name: 'Other combinations', color: '#334155' },
]

/** Classify a hex by which core urban functions are present (Other ignored). */
export function classifyFunctionalComposition(groups) {
  const has = (g) => groups.has(g)
  const living = has('Living')
  const working = has('Working')
  const culture = has('Culture & Recreation')
  const movement = has('Movement')

  if (living && working && culture) return 'liveWorkCulture'
  if (living && working) return 'liveWork'
  if (living && !working && !culture && !movement) return 'liveOnly'
  if (working && !living && !culture && !movement) return 'workOnly'
  if (movement && !living && !working) return 'movement'
  return 'other'
}

/**
 * Assign each land-use polygon centroid to a containing hex;
 * Single/Mixed Use by Main_C count; functional composition by 4 urban functions.
 */
export function buildHexFunctionalMix(hexFeatures, landuseGeojson) {
  const hexUses = new Map()
  for (const hex of hexFeatures) {
    const id = hex.properties?.id
    if (id == null) continue
    hexUses.set(String(Math.round(Number(id))), {
      uses: new Set(),
      groups: new Set(),
      feature: hex,
    })
  }

  const landFeatures = landuseGeojson?.features ?? []
  for (const lf of landFeatures) {
    const cat = lf.properties?.Main_C
    if (!cat) continue
    const centroid = geometryCentroid(lf.geometry)
    if (!centroid) continue
    const [lon, lat] = centroid

    for (const hex of hexFeatures) {
      if (!pointInPolygon(lon, lat, hex.geometry)) continue
      const id = hex.properties?.id
      if (id == null) break
      const entry = hexUses.get(String(Math.round(Number(id))))
      if (!entry) break
      entry.uses.add(cat)
      const group = getFunctionalGroup(cat)
      if (group !== 'Other') entry.groups.add(group)
      break
    }
  }

  let mono = 0
  let multi = 0
  const compositionCounts = Object.fromEntries(FUNCTIONAL_COMPOSITION_TYPES.map((t) => [t.id, 0]))

  for (const [, { uses, groups }] of hexUses) {
    const count = uses.size
    if (count === 0) continue
    if (count === 1) mono += 1
    else multi += 1

    // Hexes with only "Other" Main_C still count as other combinations
    const typeId =
      groups.size === 0 && count > 0 ? 'other' : classifyFunctionalComposition(groups)
    compositionCounts[typeId] += 1
  }

  const classified = mono + multi
  const monoPct = classified ? Math.round((mono / classified) * 1000) / 10 : 0
  const multiPct = classified ? Math.round((multi / classified) * 1000) / 10 : 0

  const functionalComposition = FUNCTIONAL_COMPOSITION_TYPES.map((t) => {
    const count = compositionCounts[t.id] ?? 0
    return {
      id: t.id,
      name: t.name,
      color: t.color,
      count,
      pct: classified ? Math.round((count / classified) * 100) : 0,
    }
  })

  const liveWorkCount = compositionCounts.liveWork ?? 0
  const liveWorkPct = classified ? Math.round((liveWorkCount / classified) * 1000) / 10 : 0

  return {
    monoCount: mono,
    multiCount: multi,
    monoPct,
    multiPct,
    classifiedCount: classified,
    monoMulti: [
      { name: 'Single Use Hex', value: mono, pct: monoPct, color: '#FFFAF0' },
      { name: 'Mixed Use Hex', value: multi, pct: multiPct, color: '#F38E7E' },
    ],
    functionalComposition,
    liveWorkPct,
    liveWorkCount,
  }
}

/** Color a hex by equal-interval classes for continuous maturation metrics. */
export function colorForMaturationMetric(value, classes) {
  return colorForMetricClass(Number(value), classes)
}

export function buildLandUseDiversityClasses(features) {
  const values = numericValues(features, MATURATION_PROPS.landUseNorm)
  return buildMetricClasses(values, MATURATION_METRIC_RAMPS.landUseDiversity.stops)
}

export function colorForLandUseDiversity(value, classes) {
  return colorForMetricClass(Number(value), classes)
}

export function formatMaturationValue(value, digits = 3) {
  if (value == null || Number.isNaN(value)) return '—'
  return Number(value).toFixed(digits)
}

export function buildMaturationStats(features, shannonFeatures, landuseGeojson) {
  const umi = summarizeMetric(features, MATURATION_PROPS.umi)
  const entropyRaw = summarizeMetric(features, MATURATION_PROPS.entropyRaw)
  const entropyNorm = summarizeMetric(features, MATURATION_PROPS.entropyNorm)
  const accessibilityNorm = summarizeMetric(features, MATURATION_PROPS.accessibilityNorm)
  const accessibilityRaw = summarizeMetric(features, MATURATION_PROPS.accessibilityRaw)
  const landUseNorm = summarizeMetric(features, MATURATION_PROPS.landUseNorm)

  const entropyValues = numericValues(features, MATURATION_PROPS.entropyRaw)
  const entropyMedian = median(entropyValues)
  const cellsAboveMedian =
    entropyMedian == null
      ? 0
      : entropyValues.filter((v) => v > entropyMedian).length

  const shannonList = shannonFeatures ?? []
  const mixedUse = summarizeMetric(shannonList, MATURATION_PROPS.mixedUse)
  const shannonEntropy = summarizeMetric(shannonList, MATURATION_PROPS.shannonEntropy)

  const tiers = computeTierDistribution(features)
  const landUseComposition = buildLandUseComposition(landuseGeojson)
  const scatter = buildEntropyScatter(features)
  const hexFunctionalMix = buildHexFunctionalMix(features, landuseGeojson)

  const umiValues = numericValues(features, MATURATION_PROPS.umi)
  const entropyNormValues = numericValues(features, MATURATION_PROPS.entropyNorm)
  const accessibilityNormValues = numericValues(features, MATURATION_PROPS.accessibilityNorm)

  const umiClasses = buildMetricClasses(umiValues, MATURATION_METRIC_RAMPS.umi.stops)
  const entropyClasses = buildMetricClasses(
    entropyNormValues,
    MATURATION_METRIC_RAMPS.entropy.stops,
  )
  const accessibilityClasses = buildMetricClasses(
    accessibilityNormValues,
    MATURATION_METRIC_RAMPS.accessibility.stops,
  )
  const landUseDiversityClasses = buildLandUseDiversityClasses(features)

  const umiHistogram = umiClasses.bins
  const accessibilityHistogram = accessibilityClasses.bins

  return {
    umi,
    entropyRaw,
    entropyNorm,
    accessibilityNorm,
    accessibilityRaw,
    landUseNorm,
    entropyMedian,
    cellsAboveMedian,
    mixedUse,
    shannonEntropy,
    tiers,
    landUseComposition,
    scatter,
    hexFunctionalMix,
    umiClasses,
    entropyClasses,
    accessibilityClasses,
    landUseDiversityClasses,
    umiHistogram,
    accessibilityHistogram,
    componentContribution: [
      { name: 'Accessibility', value: accessibilityNorm.avg ?? 0, color: '#0ea5e9' },
      { name: 'Land Use Diversity', value: landUseNorm.avg ?? 0, color: '#b63679' },
      { name: 'Shannon Entropy', value: entropyNorm.avg ?? 0, color: '#10b981' },
    ],
  }
}
