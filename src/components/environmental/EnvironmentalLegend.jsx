import { ENV_METRIC_RAMPS } from '../../constants/environmental.js'
import { formatShadowPercent } from '../../utils/environmentalStats.js'

/** Bottom-left environmental metric legend. */
export default function EnvironmentalLegend({ activeMetric, stats }) {
  const ramp = activeMetric ? ENV_METRIC_RAMPS[activeMetric] : null
  if (!ramp) return null

  const metricSummary =
    activeMetric === 'utci'
      ? stats?.utci
      : activeMetric === 'uhi'
        ? stats?.uhi
        : activeMetric === 'airTemp'
          ? stats?.airTemp
          : activeMetric === 'tmrt'
            ? stats?.tmrt
            : activeMetric === 'shadow'
              ? stats?.shadow
              : null

  const min = metricSummary?.min
  const max = metricSummary?.max

  const format = (v) => {
    if (!Number.isFinite(v)) return '—'
    if (activeMetric === 'shadow') return formatShadowPercent(v, 0)
    if (Math.abs(v) >= 100) return v.toFixed(0)
    if (Math.abs(v) >= 10) return v.toFixed(1)
    return v.toFixed(2)
  }

  const unitSuffix = activeMetric === 'shadow' ? '' : ramp.unit ? ` ${ramp.unit}` : ''

  return (
    <div className="pointer-events-none absolute bottom-6 left-3 z-[1000] w-72 rounded-lg border border-surface-700 bg-surface-900/95 p-4 shadow-card backdrop-blur">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-surface-400">Legend</p>
      <p className="mb-3 text-xs font-semibold text-surface-200">{ramp.label}</p>
      <div
        className="mb-2 h-5 w-full rounded-sm"
        style={{
          background: `linear-gradient(to right, ${ramp.stops.join(', ')})`,
        }}
      />
      <div className="flex justify-between text-[10px] text-surface-400">
        <span>
          {format(min)}
          {unitSuffix}
        </span>
        <span>
          {format(max)}
          {unitSuffix}
        </span>
      </div>
    </div>
  )
}
