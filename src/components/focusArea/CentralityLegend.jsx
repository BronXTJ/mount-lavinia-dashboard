import { CLOSENESS_RAMP, BETWEENNESS_RAMP } from '../../constants/centrality.js'

const CLASS_LABELS = ['Very Low', 'Low', 'Moderate', 'High', 'Very High']

function GradientBar({ ramp, label, min, max }) {
  const stops = ramp.stops

  const fmt = (v) => {
    if (v == null) return '—'
    if (max != null && max > 100) return v.toFixed(1)
    return v.toFixed(4)
  }

  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-surface-200">{label}</p>

      {/* Gradient bar built directly from the palette stops */}
      <div
        className="h-5 w-full rounded"
        style={{ background: `linear-gradient(to right, ${stops.join(', ')})` }}
      />

      {/* Five class labels aligned under each stop */}
      <div className="mt-1.5 flex justify-between text-[10px] text-surface-300">
        {CLASS_LABELS.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>

      {/* Numeric min / max values */}
      <div className="mt-1 flex justify-between text-[10px] font-mono text-surface-400">
        <span>{fmt(min)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  )
}

/** Bottom-left map legend — updates live when layer toggles or scale changes. */
export default function CentralityLegend({
  showCloseness,
  showBetweenness,
  closenessStats,
  betweennessStats,
  whatIfMode = false,
}) {
  if (!showCloseness && !showBetweenness) return null

  return (
    <div
      className={[
        'pointer-events-none absolute left-3 z-[1000] rounded-lg border border-surface-700 bg-surface-900/95 p-4 shadow-card backdrop-blur',
        /* ~5% wider than prior w-56 / w-72 so class labels stay readable */
        whatIfMode ? 'bottom-32 w-[14.7rem]' : 'bottom-6 w-[18.9rem]',
      ].join(' ')}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-surface-200">Legend</p>

      {showCloseness && (
        <GradientBar
          ramp={CLOSENESS_RAMP}
          label="Closeness (NQPDA)"
          min={closenessStats?.min}
          max={closenessStats?.max}
        />
      )}

      {showBetweenness && (
        <GradientBar
          ramp={BETWEENNESS_RAMP}
          label="Betweenness (BtA)"
          min={betweennessStats?.min}
          max={betweennessStats?.max}
        />
      )}
    </div>
  )
}
