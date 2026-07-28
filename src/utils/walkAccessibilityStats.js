import {
  WALK_ACCESS_TIERS,
  WALK_DEST_GROUPS,
  WALK_METRIC_RAMPS,
  WALK_PROPS,
  classifyWalkAccessTier,
} from '../constants/walkAccessibility.js'
import { buildMetricClasses, colorForMetricClass } from './metricClasses.js'
import { partitionHexFeatures } from './hexCellGrade.js'

/**
 * Walk accessibility KPIs use analysis-grade hexes (≥90% complete) via partitionHexFeatures.
 * Does not gate on legacy is_edge.
 */
export function filterValidWalkFeatures(geojson) {
  return partitionHexFeatures(geojson).statsFeatures
}

function numericValues(features, key) {
  return features
    .map((f) => Number(f.properties?.[key]))
    .filter((v) => Number.isFinite(v))
}

export function formatWalkScore(value) {
  if (!Number.isFinite(Number(value))) return '—'
  const v = Number(value)
  if (Math.abs(v) >= 100) return v.toFixed(0)
  if (Math.abs(v) >= 10) return v.toFixed(1)
  return v.toFixed(3)
}

export function formatWalkMinutes(value) {
  if (!Number.isFinite(Number(value))) return '—'
  return `${Number(value).toFixed(1)} min`
}

export function formatWalkPct(share) {
  if (!Number.isFinite(Number(share))) return '—'
  return `${(Number(share) * 100).toFixed(1)}%`
}

export function summarizeMetric(features, key) {
  const allPairs = features
    .map((f) => ({ id: f.properties?.id, value: Number(f.properties?.[key]) }))
    .filter((p) => Number.isFinite(p.value))

  if (!allPairs.length) {
    return { min: null, max: null, avg: null, highestId: null, lowestId: null }
  }

  const sum = allPairs.reduce((s, p) => s + p.value, 0)
  let min = allPairs[0].value
  let max = allPairs[0].value
  let lowestId = allPairs[0].id
  let highestId = allPairs[0].id

  for (const p of allPairs) {
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
    avg: sum / allPairs.length,
    highestId: highestId != null ? Math.round(Number(highestId)) : null,
    lowestId: lowestId != null ? Math.round(Number(lowestId)) : null,
  }
}

function median(values) {
  if (!values?.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function isDesertFeature(f) {
  return String(f.properties?.access_tier ?? '').toLowerCase() === 'low'
}

function isMismatchFeature(f) {
  const flag = f.properties?.[WALK_PROPS.mismatchFlag]
  return flag === true || flag === 1 || flag === '1' || flag === 'true'
}

export function colorForWalkMetric(value, classes) {
  return colorForMetricClass(value, classes)
}

export function colorForWalkTier(tier) {
  return classifyWalkAccessTier(tier).color
}

/**
 * Build panel + map stats from analysis-grade (≥90%) features.
 * @param {object[]} statsFeatures
 * @param {{ kpis?: object, desert_hex_ids?: number[], mismatch_hex_ids?: number[] } | null} [summary]
 */
export function buildWalkAccessibilityStats(statsFeatures, summary = null) {
  const features = statsFeatures ?? []
  const scoreKey = WALK_PROPS.accessScore
  const accessScore = summarizeMetric(features, scoreKey)

  const scoreValues = numericValues(features, scoreKey)
  const accessScoreClasses = buildMetricClasses(
    scoreValues,
    WALK_METRIC_RAMPS.accessScore.stops,
  )

  const timeSummaries = {}
  const timeClasses = {}
  for (const g of WALK_DEST_GROUPS) {
    timeSummaries[g.timeKey] = summarizeMetric(features, g.timeProp)
    timeClasses[g.timeKey] = buildMetricClasses(
      numericValues(features, g.timeProp),
      WALK_METRIC_RAMPS[g.timeKey].stops,
    )
  }

  const tierCounts = { high: 0, medium: 0, low: 0, excluded: 0 }
  for (const f of features) {
    const t = String(f.properties?.access_tier ?? 'excluded').toLowerCase()
    if (t in tierCounts) tierCounts[t] += 1
    else tierCounts.excluded += 1
  }

  const tiers = ['high', 'medium', 'low']
    .map((id) => {
      const meta = WALK_ACCESS_TIERS[id]
      const count = tierCounts[id]
      const pct = features.length ? Math.round((count / features.length) * 100) : 0
      return { id, name: meta.label, color: meta.color, count, pct }
    })
    .filter((z) => z.count > 0 || true)

  const coverage =
    summary?.kpis?.coverage_within_10_min ??
    Object.fromEntries(
      WALK_DEST_GROUPS.map((g) => {
        const reach = features.filter((f) => {
          const v = f.properties?.[g.reachKey]
          return v === true || v === 1 || v === '1'
        }).length
        return [g.id, features.length ? reach / features.length : null]
      }),
    )

  const coverageBars = WALK_DEST_GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    share: Number(coverage?.[g.id]),
    medianTime: median(numericValues(features, g.timeProp)),
    reachPct: Number(coverage?.[g.id]),
  }))

  const desertFeatures = features.filter(isDesertFeature)
  const mismatchFeatures = features.filter(isMismatchFeature)

  const desertIds =
    summary?.desert_hex_ids?.length > 0
      ? summary.desert_hex_ids.map((id) => Math.round(Number(id)))
      : desertFeatures
          .map((f) => Math.round(Number(f.properties?.id)))
          .filter(Number.isFinite)
          .sort((a, b) => a - b)

  const mismatchIds =
    summary?.mismatch_hex_ids?.length > 0
      ? summary.mismatch_hex_ids.map((id) => Math.round(Number(id)))
      : mismatchFeatures
          .map((f) => Math.round(Number(f.properties?.id)))
          .filter(Number.isFinite)
          .sort((a, b) => a - b)

  const groupDetail = WALK_DEST_GROUPS.map((g) => {
    const times = numericValues(features, g.timeProp)
    return {
      id: g.id,
      label: g.label,
      timeKey: g.timeKey,
      reachPct: Number(coverage?.[g.id]),
      medianTime: median(times),
      meanTime: times.length ? times.reduce((s, v) => s + v, 0) / times.length : null,
      summary: timeSummaries[g.timeKey],
    }
  })

  return {
    accessScore,
    accessScoreClasses,
    timeSummaries,
    timeClasses,
    tiers,
    tierCounts,
    coverageBars,
    groupDetail,
    desertCount: summary?.kpis?.desert_count ?? desertIds.length,
    mismatchCount: summary?.kpis?.mismatch_count ?? mismatchIds.length,
    desertIds,
    mismatchIds,
    meanAccessScore: summary?.kpis?.mean_access_score ?? accessScore.avg,
    analysisHexCount: summary?.kpis?.analysis_hex_count ?? features.length,
    umiContrastNote:
      summary?.umi_contrast_note ??
      'Destination reach ≠ UMI network accessibility (NQPDA/BtA).',
    findings: summary?.draft_findings ?? [],
  }
}

/** Outline FeatureCollection for desert / mismatch overlay layers. */
export function buildOutlineCollection(hexFc, predicate) {
  const features = (hexFc?.features ?? []).filter(predicate)
  return { type: 'FeatureCollection', features }
}

export function isWalkDesertFeature(f) {
  return isDesertFeature(f)
}

export function isWalkMismatchFeature(f) {
  return isMismatchFeature(f)
}
