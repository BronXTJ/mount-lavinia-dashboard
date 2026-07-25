import { MATURATION_METRIC_RAMPS } from '../../constants/maturation.js'

/**
 * Bottom-right maturation metric legend — same size as DensityLegend.
 * Discrete quantile class ranges for every metric (shared with map + charts).
 */
export default function MaturationLegend({ activeMetric, stats }) {
  const ramp = activeMetric ? MATURATION_METRIC_RAMPS[activeMetric] : null
  if (!ramp) return null

  const classes =
    activeMetric === 'umi'
      ? stats?.umiClasses
      : activeMetric === 'entropy'
        ? stats?.entropyClasses
        : activeMetric === 'accessibility'
          ? stats?.accessibilityClasses
          : activeMetric === 'landUseDiversity'
            ? stats?.landUseDiversityClasses
            : null

  const bins = classes?.bins?.filter((b) => Number.isFinite(b.from) && Number.isFinite(b.to)) ?? []
  if (!bins.length) return null

  const format = (v) => {
    if (!Number.isFinite(v)) return '—'
    if (Math.abs(v) >= 100) return v.toFixed(0)
    if (Math.abs(v) >= 10) return v.toFixed(1)
    return v.toFixed(2)
  }

  return (
    <div className="pointer-events-none absolute bottom-14 left-3 z-[1000] w-72 rounded-lg border border-surface-700 bg-surface-900/95 p-4 shadow-card backdrop-blur">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-surface-400">
        Legend
      </p>
      <p className="mb-3 text-xs font-semibold text-surface-200">{ramp.label}</p>
      <div className="flex flex-col gap-1.5">
        {bins.map((bin) => (
          <div
            key={`${bin.index}-${bin.label}`}
            className="flex items-center gap-2 text-[10px] text-surface-300"
          >
            <span
              className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-surface-600"
              style={{ backgroundColor: bin.color }}
            />
            <span>
              {format(bin.from)} – {format(bin.to)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
