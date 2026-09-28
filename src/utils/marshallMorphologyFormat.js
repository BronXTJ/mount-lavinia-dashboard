/** Display helpers. Ratios are read from stored metrics; they are not recomputed. */

export const MARSHALL_MATRIX_DOMAIN_COMPACT = 0.5
export const MARSHALL_MATRIX_DOMAIN_FULL = 1

const MARSHALL_MATRIX_TICKS_FULL = [0, 0.25, 0.5, 0.75, 1]
const MARSHALL_MATRIX_TICKS_COMPACT = [0, 0.1, 0.2, 0.3, 0.4, 0.5]

export function marshallMatrixDomainMax(size = 'compact') {
  return size === 'expanded' ? MARSHALL_MATRIX_DOMAIN_FULL : MARSHALL_MATRIX_DOMAIN_COMPACT
}

export function marshallMatrixTicks(domainMax) {
  return domainMax >= MARSHALL_MATRIX_DOMAIN_FULL
    ? MARSHALL_MATRIX_TICKS_FULL
    : MARSHALL_MATRIX_TICKS_COMPACT
}

/** Map stored ratio to plot fraction [0, 1] for a given axis domain max (display only). */
export function marshallPlotCoord(value, domainMax) {
  const max = Number(domainMax)
  if (!Number.isFinite(max) || max <= 0) return 0
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return n / max
}

export function formatStoredPercent(ratio) {
  if (ratio == null || ratio === '') return '—'
  const n = Number(ratio)
  if (!Number.isFinite(n)) return '—'
  return `${Math.round(n * 100)}%`
}

export function formatStoredCount(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return String(value)
}

/** Plot position from stored X-ratio and Cell-ratio. */
export function matrixPoint(metrics) {
  const x = Number(metrics?.matrix?.x_ratio)
  const y = Number(metrics?.matrix?.y_cell_ratio)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

/** One stored point per GN. Scopes with null ratios are omitted. */
export function marshallChartPoints(scopes) {
  const points = []
  for (const metrics of scopes ?? []) {
    const point = matrixPoint(metrics)
    if (!point || !metrics?.gn_name) continue
    points.push({ name: metrics.gn_name, x: point.x, y: point.y })
  }
  return points
}

export function marshallTableRows(metrics) {
  const counts = metrics?.counts
  const ratios = metrics?.ratios
  if (!counts || !ratios) return null
  return [
    { id: 'n_T', label: 'No. of T-junctions', value: formatStoredCount(counts.n_T) },
    { id: 'n_X', label: 'No. of X-junctions', value: formatStoredCount(counts.n_X) },
    {
      id: 'n_cul',
      label: 'No. of cul-de-sacs',
      value: formatStoredCount(counts.n_cul_marshall),
    },
    { id: 'n_cell', label: 'No. of cells', value: formatStoredCount(counts.n_cell_marshall) },
    { id: 'T_ratio', label: 'T-ratio', value: formatStoredPercent(ratios.T_ratio) },
    { id: 'X_ratio', label: 'X-ratio', value: formatStoredPercent(ratios.X_ratio) },
    { id: 'Cul_ratio', label: 'Cul-ratio', value: formatStoredPercent(ratios.Cul_ratio) },
    { id: 'Cell_ratio', label: 'Cell-ratio', value: formatStoredPercent(ratios.Cell_ratio) },
  ]
}
