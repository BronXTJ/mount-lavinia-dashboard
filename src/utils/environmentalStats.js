import { ENV_METRIC_RAMPS, SHADOW_MODEL_HOURS, SVF_CLASS_COLORS, UTCI_CLASS_LABELS } from '../constants/environmental.js'
import { interpolateColor } from './centralityStats.js'

export function formatEnvValue(value, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  if (Math.abs(n) >= 100) return n.toFixed(0)
  if (Math.abs(n) >= 10) return n.toFixed(1)
  return n.toFixed(digits)
}

/** Format 0–1 shadow fraction as a percentage label. */
export function formatShadowPercent(value, digits = 0) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${(Number(value) * 100).toFixed(digits)}%`
}

export function summarizeMetric(features, key) {
  const pairs = features
    .map((f) => ({ id: f.properties?.id, value: Number(f.properties?.[key]) }))
    .filter((p) => Number.isFinite(p.value))

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

export function buildMetricHistogram(features, propertyKey, buckets = 6) {
  const values = features
    .map((f) => Number(f.properties?.[propertyKey]))
    .filter((v) => Number.isFinite(v))

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
      label: `${from.toFixed(1)}–${to.toFixed(1)}`,
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

export function colorForEnvMetric(value, min, max, metricId) {
  const ramp = ENV_METRIC_RAMPS[metricId]
  if (!ramp || !Number.isFinite(value) || min == null || max == null) return '#64748b'
  const span = max - min
  const t = span === 0 ? 0.5 : (value - min) / span
  return interpolateColor(t, ramp)
}

export function buildUtciClassBreakdown(features) {
  const total = features.length || 1
  const counts = {}
  for (const f of features) {
    const c = f.properties?.utci_class
    if (c == null) continue
    counts[c] = (counts[c] ?? 0) + 1
  }
  return Object.keys(counts)
    .map(Number)
    .sort((a, b) => a - b)
    .map((cls) => {
      const meta = UTCI_CLASS_LABELS[cls] ?? { label: `Class ${cls}`, color: '#94a3b8' }
      return {
        class: cls,
        label: meta.label,
        color: meta.color,
        count: counts[cls],
        pct: Math.round((counts[cls] / total) * 100),
      }
    })
}

export function buildSvfClassBreakdown(points) {
  const features = points?.features ?? []
  const total = features.length || 1
  const counts = {}
  for (const f of features) {
    const label = f.properties?.SVF_Class || 'Unknown'
    counts[label] = (counts[label] ?? 0) + 1
  }
  const order = Object.keys(SVF_CLASS_COLORS)
  const keys = [
    ...order.filter((k) => counts[k]),
    ...Object.keys(counts).filter((k) => !order.includes(k)),
  ]
  return keys.map((label) => ({
    label,
    color: SVF_CLASS_COLORS[label] ?? '#94a3b8',
    count: counts[label],
    pct: Math.round((counts[label] / total) * 100),
  }))
}

/**
 * Share of thermal-grid cells by shadow exposure tier.
 * Highly sunlit: shadow_frac < 0.25; highly shaded: > 0.75; else moderate.
 */
export function buildShadowExposureBreakdown(features) {
  let sunlitCount = 0
  let moderateCount = 0
  let shadedCount = 0

  for (const f of features ?? []) {
    const v = Number(f.properties?.shadow_frac)
    if (!Number.isFinite(v)) continue
    if (v < 0.25) sunlitCount += 1
    else if (v > 0.75) shadedCount += 1
    else moderateCount += 1
  }

  const total = sunlitCount + moderateCount + shadedCount
  if (!total) {
    return {
      sunlitPct: 0,
      moderatePct: 0,
      shadedPct: 0,
      sunlitCount: 0,
      moderateCount: 0,
      shadedCount: 0,
      total: 0,
      segments: [],
    }
  }

  const sunlitPct = Math.round((sunlitCount / total) * 100)
  const shadedPct = Math.round((shadedCount / total) * 100)
  const moderatePct = Math.max(0, 100 - sunlitPct - shadedPct)

  const segments = [
    {
      id: 'sunlit',
      label: 'Highly Sunlit (<25%)',
      color: '#f5ebe8',
      count: sunlitCount,
      pct: sunlitPct,
    },
    {
      id: 'moderate',
      label: 'Moderate (25–75%)',
      color: '#8b6f66',
      count: moderateCount,
      pct: moderatePct,
    },
    {
      id: 'shaded',
      label: 'Highly Shaded (>75%)',
      color: '#2c211e',
      count: shadedCount,
      pct: shadedPct,
    },
  ]

  return {
    sunlitPct,
    moderatePct,
    shadedPct,
    sunlitCount,
    moderateCount,
    shadedCount,
    total,
    segments,
  }
}

export function buildShadowHourlySeries(summary, features) {
  if (summary?.shadow_hourly_means) {
    return SHADOW_MODEL_HOURS.map((hour) => ({
      hour,
      label: `${hour}:00`,
      value: summary.shadow_hourly_means[hour] ?? null,
    })).filter((row) => row.value != null)
  }

  const sums = Object.fromEntries(SHADOW_MODEL_HOURS.map((h) => [h, 0]))
  const counts = Object.fromEntries(SHADOW_MODEL_HOURS.map((h) => [h, 0]))
  for (const f of features ?? []) {
    for (const hour of SHADOW_MODEL_HOURS) {
      const v = Number(f.properties?.[`shadow_h${hour}`])
      if (!Number.isFinite(v)) continue
      sums[hour] += v
      counts[hour] += 1
    }
  }

  return SHADOW_MODEL_HOURS.map((hour) => ({
    hour,
    label: `${hour}:00`,
    value: counts[hour] > 0 ? sums[hour] / counts[hour] : null,
  })).filter((row) => row.value != null)
}

/** Stride-sample cells for scatter (max ~800) — keeps Recharts responsive. */
export function buildScatterSample(features, maxPoints = 800) {
  const pairs = []
  for (const f of features) {
    const utci = Number(f.properties?.utci_c)
    const uhi = Number(f.properties?.UHI_intens)
    if (!Number.isFinite(utci) || !Number.isFinite(uhi)) continue
    pairs.push({
      id: f.properties?.id != null ? Math.round(Number(f.properties.id)) : null,
      utci,
      uhi,
    })
  }
  if (pairs.length <= maxPoints) return pairs
  const stride = Math.ceil(pairs.length / maxPoints)
  const sample = []
  for (let i = 0; i < pairs.length && sample.length < maxPoints; i += stride) {
    sample.push(pairs[i])
  }
  return sample
}

function meanSvfValue(svfPoints) {
  const values = (svfPoints?.features ?? [])
    .map((f) => Number(f.properties?.SVF_value1))
    .filter((v) => Number.isFinite(v))
  if (!values.length) return null
  return values.reduce((s, v) => s + v, 0) / values.length
}

function clamp01(t) {
  return Math.max(0, Math.min(1, t))
}

/**
 * Radar axes: normalized 0–1 for shape comparison; raw kept for tooltips.
 * Ranges chosen from study domain (UTCI heat band, UHI span, air/tmrt, wind, SVF 0–1).
 */
export function buildRadarMeans(utci, uhi, airTemp, tmrt, wind, svfPoints, shadow) {
  const svfAvg = meanSvfValue(svfPoints)
  const axes = [
    {
      key: 'utci',
      axis: 'UTCI',
      fullLabel: 'UTCI (°C)',
      raw: utci?.avg ?? null,
      unit: '°C',
      value: utci?.avg != null ? clamp01((utci.avg - 26) / (48 - 26)) : 0,
    },
    {
      key: 'uhi',
      axis: 'UHI',
      fullLabel: 'UHI Intensity (°C)',
      raw: uhi?.avg ?? null,
      unit: '°C',
      value: uhi?.avg != null ? clamp01((uhi.avg + 8) / 16) : 0,
    },
    {
      key: 'air',
      axis: 'Air',
      fullLabel: 'Air Temperature (°C)',
      raw: airTemp?.avg ?? null,
      unit: '°C',
      value: airTemp?.avg != null ? clamp01((airTemp.avg - 18) / (34 - 18)) : 0,
    },
    {
      key: 'tmrt',
      axis: 'Tmrt',
      fullLabel: 'Mean Radiant Temp (°C)',
      raw: tmrt?.avg ?? null,
      unit: '°C',
      value: tmrt?.avg != null ? clamp01((tmrt.avg - 18) / (34 - 18)) : 0,
    },
    {
      key: 'wind',
      axis: 'Wind',
      fullLabel: 'Wind (model)',
      raw: wind?.avg ?? null,
      unit: '',
      value: wind?.avg != null ? clamp01((wind.avg - 15) / (30 - 15)) : 0,
    },
    {
      key: 'svf',
      axis: 'SVF',
      fullLabel: 'Sky View (0–1)',
      raw: svfAvg,
      unit: '',
      value: svfAvg != null ? clamp01(svfAvg) : 0,
    },
    {
      key: 'shadow',
      axis: 'Shadow',
      fullLabel: 'Shadow Exposure',
      raw: shadow?.avg != null ? shadow.avg * 100 : null,
      unit: '%',
      value: shadow?.avg != null ? clamp01(shadow.avg) : 0,
    },
  ]
  return axes
}

export function buildEnvironmentalFindings(stats) {
  const findings = []
  const utci = stats?.utci
  const uhi = stats?.uhi
  const classes = stats?.utciClassBreakdown ?? []

  if (utci?.avg != null) {
    findings.push(
      `Mean modelled UTCI is ${formatEnvValue(utci.avg, 1)} °C across the 10 m grid, indicating heat stress conditions for outdoor exposure.`,
    )
  }
  if (utci?.max != null && utci?.min != null) {
    findings.push(
      `UTCI ranges from ${formatEnvValue(utci.min, 1)} °C to ${formatEnvValue(utci.max, 1)} °C. Hotspots and cooler pockets differ by street geometry and surface cover.`,
    )
  }
  if (classes.length) {
    const dominant = [...classes].sort((a, b) => b.count - a.count)[0]
    findings.push(
      `${dominant.pct}% of cells fall in “${dominant.label}” (model class ${dominant.class}).`,
    )
  }
  if (uhi?.avg != null && stats?.rural_bg_T != null) {
    findings.push(
      `UHI intensity averages ${formatEnvValue(uhi.avg, 2)} °C relative to a rural background of ${formatEnvValue(stats.rural_bg_T, 1)} °C.`,
    )
  }
  if (stats?.svfBreakdown?.length) {
    const openish = stats.svfBreakdown.filter((s) => /open/i.test(s.label))
    const openPct = openish.reduce((s, x) => s + x.pct, 0)
    if (openPct > 0) {
      findings.push(
        `SVF samples show ~${openPct}% open / very open sky views. Canyon enclosure and shading still vary block to block.`,
      )
    }
  }
  const shadow = stats?.shadow
  const shadowHourly = stats?.shadowHourlySeries ?? []
  if (shadow?.avg != null) {
    findings.push(
      `Mean shadow exposure is ${formatShadowPercent(shadow.avg)} of modelled daylight hours (5 Jul 2026, 07:00–18:00 LST).`,
    )
  }
  if (shadowHourly.length) {
    const peak = [...shadowHourly].sort((a, b) => b.value - a.value)[0]
    if (peak?.value != null) {
      findings.push(
        `Shadow peaks around ${peak.label} LST at ${formatShadowPercent(peak.value)} area-wide. Midday streets stay heavily shaded.`,
      )
    }
  }
  return findings
}

/** Precompute panel stats from thermal grid + SVF points + optional summary JSON. */
export function buildEnvironmentalStats(gridFeatures, svfPoints, summary) {
  const features = gridFeatures ?? []
  const utci = summarizeMetric(features, 'utci_c')
  const uhi = summarizeMetric(features, 'UHI_intens')
  const airTemp = summarizeMetric(features, 'Air_Temp')
  const tmrt = summarizeMetric(features, 'Tmrt')
  const wind = summarizeMetric(features, 'Wind_speed')
  const shadow = summarizeMetric(features, 'shadow_frac')
  const shadowExposureBreakdown = buildShadowExposureBreakdown(features)
  const utciClassBreakdown = buildUtciClassBreakdown(features)
  const svfBreakdown = buildSvfClassBreakdown(svfPoints)
  const rural_bg_T = summary?.rural_bg_T ?? null
  const shadowMeta = summary?.shadow_meta ?? null
  const shadowHourlySeries = buildShadowHourlySeries(summary, features)
  const scatterSample = buildScatterSample(features, 800)
  const radarMeans = buildRadarMeans(utci, uhi, airTemp, tmrt, wind, svfPoints, shadow)

  const stats = {
    cellCount: features.length,
    rural_bg_T,
    utci,
    uhi,
    airTemp,
    tmrt,
    wind,
    shadow,
    shadowExposureBreakdown,
    shadowMeta,
    shadowHourlySeries,
    scatterSample,
    radarMeans,
    utciClassBreakdown,
    svfBreakdown,
    svfPointCount: svfPoints?.features?.length ?? 0,
    findings: [],
  }
  stats.findings = buildEnvironmentalFindings(stats)
  return stats
}
