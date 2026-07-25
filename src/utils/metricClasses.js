/**
 * Shared quantile classification for Density / Maturation hex metrics.
 * Class count = number of ramp color stops; maps, legends, and charts share the same bins.
 */

/** Quantile edge values for n equal-count classes (length n+1). */
export function buildQuantileBreaks(values, n = 5) {
  if (!values?.length) return null
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return null
  const breaks = [sorted[0]]
  for (let i = 1; i < n; i += 1) {
    const idx = Math.min(sorted.length - 1, Math.floor((i / n) * sorted.length))
    breaks.push(sorted[idx])
  }
  breaks.push(sorted[sorted.length - 1])
  for (let i = 1; i < breaks.length; i += 1) {
    if (breaks[i] < breaks[i - 1]) breaks[i] = breaks[i - 1]
  }
  return breaks
}

function formatClassEdge(v) {
  if (!Number.isFinite(v)) return '—'
  if (Math.abs(v) >= 100) return v.toFixed(0)
  if (Math.abs(v) >= 10) return v.toFixed(1)
  return v.toFixed(2)
}

function classIndexForValue(value, breaks, nClasses) {
  if (!Number.isFinite(value) || !breaks?.length || nClasses < 1) return -1
  for (let i = 0; i < nClasses - 1; i += 1) {
    if (value <= breaks[i + 1]) return i
  }
  return nClasses - 1
}

/**
 * Build quantile classes with per-bin counts.
 * @returns {{ breaks: number[]|null, colors: string[], bins: Array<{color, from, to, label, count, index}> }}
 */
export function buildMetricClasses(values, colors) {
  const palette = colors?.length ? colors : []
  if (!palette.length) {
    return { breaks: null, colors: [], bins: [] }
  }

  const finite = (values ?? []).filter(Number.isFinite)
  const breaks = buildQuantileBreaks(finite, palette.length)
  if (!breaks) {
    return {
      breaks: null,
      colors: palette,
      bins: palette.map((color, i) => ({
        index: i,
        color,
        from: null,
        to: null,
        label: '—',
        count: 0,
      })),
    }
  }

  const bins = palette.map((color, i) => ({
    index: i,
    color,
    from: breaks[i],
    to: breaks[i + 1],
    label: `${formatClassEdge(breaks[i])}–${formatClassEdge(breaks[i + 1])}`,
    count: 0,
  }))

  for (const v of finite) {
    const idx = classIndexForValue(v, breaks, palette.length)
    if (idx >= 0) bins[idx].count += 1
  }

  return { breaks, colors: palette, bins }
}

export function colorForMetricClass(value, classes) {
  if (!Number.isFinite(value) || !classes?.breaks?.length || !classes?.colors?.length) {
    return '#9fadb9'
  }
  const idx = classIndexForValue(value, classes.breaks, classes.colors.length)
  if (idx < 0) return '#9fadb9'
  return classes.colors[idx]
}
