import ChartHint from './ChartHint.jsx'
import MetricInfoButton from './MetricInfoButton.jsx'

const HIGH_COLOR = '#22c55e'
const MED_COLOR = '#facc15'
const LOW_COLOR = '#94a3b8'

const PLACEHOLDER_ZONES = [
  { name: 'High',   pct: 33, count: 0 },
  { name: 'Medium', pct: 34, count: 0 },
  { name: 'Low',    pct: 33, count: 0 },
]

const COLORS = [HIGH_COLOR, MED_COLOR, LOW_COLOR]

/**
 * Replaces the donut chart with a single full-width stacked horizontal bar
 * (40px tall) showing High / Medium / Low zone percentages side by side.
 * A three-dot legend below shows the exact percentages.
 * Updates automatically when the active scale changes (key prop on parent).
 */
export default function ZoneStackedBar({ title, zones, infoTitle, infoPoints, infoAria }) {
  const isPlaceholder = !zones
  const data = isPlaceholder ? PLACEHOLDER_ZONES : zones

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <h3 className="font-display text-sm font-semibold text-surface-50">{title}</h3>
        {infoTitle && infoPoints?.length > 0 && (
          <MetricInfoButton title={infoTitle} points={infoPoints} ariaLabel={infoAria} />
        )}
      </div>
      <ChartHint muted={isPlaceholder}>
        {isPlaceholder
          ? 'Placeholder — awaiting GeoJSON'
          : 'Overall segment distribution for the active scale'}
      </ChartHint>

      {/* Stacked bar — 40px tall, full width */}
      <div className="flex h-10 w-full overflow-hidden rounded">
        {data.map((zone, i) => {
          const pct = zone.pct ?? 0
          const showLabel = pct > 5
          return (
            <div
              key={zone.name}
              style={{
                width: `${pct}%`,
                backgroundColor: COLORS[i],
                opacity: isPlaceholder ? 0.35 : 1,
              }}
              className="flex items-center justify-center transition-all"
            >
              {showLabel && (
                <span className="select-none text-[13px] font-bold text-black/70">
                  {pct}%
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend row */}
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {data.map((zone, i) => (
          <div key={zone.name} className="flex items-center gap-1.5 text-[11px] text-surface-300">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: COLORS[i], opacity: isPlaceholder ? 0.4 : 1 }}
            />
            <span>{zone.name}</span>
            <span className="font-medium text-surface-200">{zone.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
