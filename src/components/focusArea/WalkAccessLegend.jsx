import { WALK_ACCESS_TIERS, WALK_METRIC_RAMPS } from '../../constants/walkAccessibility.js'

/**
 * Bottom-left walk-access metric legend — same size as MaturationLegend (w-48).
 */
export default function WalkAccessLegend({ activeMetric, stats }) {
  if (!activeMetric) return null

  const ramp = WALK_METRIC_RAMPS[activeMetric]
  if (!ramp) return null

  if (activeMetric === 'accessTier') {
    const tiers = ['high', 'medium', 'low'].map((id) => WALK_ACCESS_TIERS[id])
    return (
      <div className="pointer-events-none absolute bottom-14 left-3 z-[1000] w-48 rounded-lg border border-surface-700 bg-surface-900/95 p-4 shadow-card backdrop-blur">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-surface-400">
          Legend
        </p>
        <p className="mb-3 text-xs font-semibold text-surface-200">{ramp.label}</p>
        <div className="flex flex-col gap-1.5">
          {tiers.map((tier) => (
            <div key={tier.id} className="flex items-center gap-2 text-[10px] text-surface-300">
              <span
                className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-surface-600"
                style={{ backgroundColor: tier.color }}
              />
              <span>{tier.label}</span>
            </div>
          ))}
          <p className="mt-1 text-[10px] text-surface-400">Excluded / scrap cells stay unfilled.</p>
        </div>
      </div>
    )
  }

  const classes =
    activeMetric === 'accessScore'
      ? stats?.accessScoreClasses
      : stats?.timeClasses?.[activeMetric] ?? null

  const bins = classes?.bins?.filter((b) => Number.isFinite(b.from) && Number.isFinite(b.to)) ?? []
  if (!bins.length) return null

  const format = (v) => {
    if (!Number.isFinite(v)) return '—'
    if (Math.abs(v) >= 100) return v.toFixed(0)
    if (Math.abs(v) >= 10) return v.toFixed(1)
    return v.toFixed(2)
  }

  return (
    <div className="pointer-events-none absolute bottom-14 left-3 z-[1000] w-48 rounded-lg border border-surface-700 bg-surface-900/95 p-4 shadow-card backdrop-blur">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-surface-400">
        Legend
      </p>
      <p className="mb-3 text-xs font-semibold text-surface-200">{ramp.label}</p>
      <div className="flex flex-col gap-1.5">
        {bins.map((bin) => (
          <div key={`${bin.index}-${bin.label}`} className="flex items-center gap-2 text-[10px] text-surface-300">
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
