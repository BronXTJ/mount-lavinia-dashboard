/** Flat-top 100 m hex theoretical area (m²) — matches phase-2 build. */
export const HEX_FULL_AREA_M2 = 8660.254

export const HEX_GRADE = {
  full: 'full',
  partial: 'partial',
  scrap: 'scrap',
  invalid: 'invalid',
}

/** Analysis-grade / KPI threshold. */
export const HEX_FULL_RATIO = 0.9
/** Below this = scrap (outline only). */
export const HEX_SCRAP_RATIO = 0.5

/**
 * @param {object} feature
 * @returns {number} Hex_area / full area (0 if unknown)
 */
export function hexAreaRatio(feature) {
  const area = Number(feature?.properties?.Hex_area)
  if (!Number.isFinite(area) || area <= 0 || HEX_FULL_AREA_M2 <= 0) return 0
  return area / HEX_FULL_AREA_M2
}

/**
 * Completeness grade from clipped hex area (ignores baked is_edge flags).
 * @param {object} feature
 * @returns {'full'|'partial'|'scrap'}
 */
export function gradeHexCompleteness(feature) {
  const ratio = hexAreaRatio(feature)
  if (ratio >= HEX_FULL_RATIO) return HEX_GRADE.full
  if (ratio >= HEX_SCRAP_RATIO) return HEX_GRADE.partial
  return HEX_GRADE.scrap
}

/**
 * Copy Hex_area onto features by id from a grid FeatureCollection.
 * Maturation hex GeoJSON omits Hex_area; density / hex_grid include it.
 */
export function annotateHexAreaFromGrid(features, areaSource) {
  const areaById = new Map()
  for (const f of areaSource?.features ?? []) {
    const id = f.properties?.id
    if (id == null) continue
    const area = Number(f.properties?.Hex_area)
    if (Number.isFinite(area)) areaById.set(id, area)
  }
  return (features ?? []).map((f) => {
    const id = f.properties?.id
    const existing = Number(f.properties?.Hex_area)
    if (Number.isFinite(existing) && existing > 0) return f
    const fromGrid = areaById.get(id)
    if (fromGrid == null) return f
    return {
      ...f,
      properties: { ...f.properties, Hex_area: fromGrid },
    }
  })
}

/**
 * Density-wide invalid: negative OSR (impossible). NaN OSR (no floor area) is allowed.
 */
export function isDensityGloballyInvalid(feature) {
  const osr = Number(feature?.properties?.OSR)
  if (Number.isFinite(osr) && osr < 0) return true
  const area = Number(feature?.properties?.Hex_area)
  if (!Number.isFinite(area) || area <= 0) return true
  return false
}

/**
 * Partition hex features for map vs KPIs.
 * Map: full + partial (not globally invalid).
 * Excluded: scrap + invalid (outline only).
 * Stats: full only (not globally invalid).
 *
 * @param {GeoJSON.FeatureCollection | null} geojson
 * @param {{ isGloballyInvalid?: (f: object) => boolean }} [opts]
 */
export function partitionHexFeatures(geojson, opts = {}) {
  const isGloballyInvalid = opts.isGloballyInvalid ?? (() => false)
  const features = geojson?.features ?? []

  const mapFeatures = []
  const excludedFeatures = []
  const statsFeatures = []
  const counts = { full: 0, partial: 0, scrap: 0, invalid: 0, map: 0, stats: 0 }

  for (const f of features) {
    const annotated = {
      ...f,
      properties: {
        ...f.properties,
        _hex_grade: undefined,
        _hex_ratio: hexAreaRatio(f),
      },
    }

    if (isGloballyInvalid(f)) {
      annotated.properties._hex_grade = HEX_GRADE.invalid
      counts.invalid += 1
      excludedFeatures.push(annotated)
      continue
    }

    const grade = gradeHexCompleteness(f)
    annotated.properties._hex_grade = grade

    if (grade === HEX_GRADE.scrap) {
      counts.scrap += 1
      excludedFeatures.push(annotated)
      continue
    }

    if (grade === HEX_GRADE.full) {
      counts.full += 1
      mapFeatures.push(annotated)
      statsFeatures.push(annotated)
    } else {
      counts.partial += 1
      mapFeatures.push(annotated)
    }
  }

  counts.map = mapFeatures.length
  counts.stats = statsFeatures.length

  return {
    mapFeatures,
    excludedFeatures,
    statsFeatures,
    counts,
    mapFc:
      mapFeatures.length > 0 ? { type: 'FeatureCollection', features: mapFeatures } : null,
    excludedFc:
      excludedFeatures.length > 0
        ? { type: 'FeatureCollection', features: excludedFeatures }
        : null,
    statsFc:
      statsFeatures.length > 0 ? { type: 'FeatureCollection', features: statsFeatures } : null,
  }
}

export function isPartialHex(feature) {
  return feature?.properties?._hex_grade === HEX_GRADE.partial
}

export function formatHexCompletenessNote(feature) {
  const grade = feature?.properties?._hex_grade ?? gradeHexCompleteness(feature)
  const ratio = feature?.properties?._hex_ratio ?? hexAreaRatio(feature)
  const pct = Number.isFinite(ratio) ? `${Math.round(ratio * 100)}%` : '—'
  if (grade === HEX_GRADE.full) return `Completeness ${pct} (analysis-grade)`
  if (grade === HEX_GRADE.partial) return `Completeness ${pct} (partial — shown dimmed; omitted from KPIs)`
  if (grade === HEX_GRADE.scrap) return `Completeness ${pct} (scrap — excluded)`
  return `Invalid / impractical metric`
}
