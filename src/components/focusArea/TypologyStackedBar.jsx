import { DENSITY_TYPOLOGY } from '../../constants/density.js'
import TypologyInfoButton from './TypologyInfoButton.jsx'

/**
 * Eight-segment typology stacked bar (FSI / GSI / OSR median classification).
 * Same visual pattern as centrality ZoneStackedBar.
 */
export default function TypologyStackedBar({ zones }) {
  const isPlaceholder = !zones?.length
  const data = isPlaceholder
    ? Object.values(DENSITY_TYPOLOGY).map((t) => ({
        name: t.label,
        pct: 12.5,
        count: 0,
        color: t.color,
      }))
    : zones

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <h3 className="font-display text-sm font-semibold text-surface-50">
          Urban Typology Distribution
        </h3>
        <TypologyInfoButton />
      </div>
      <p className="mt-1.5 text-xs font-medium text-surface-200">
        {isPlaceholder
          ? 'Placeholder — awaiting GeoJSON'
          : 'Classified by FSI / GSI / OSR median split across valid hex cells'}
      </p>

      <div className="mt-3 flex h-10 w-full overflow-hidden rounded">
        {data.map((zone) => {
          const pct = zone.pct ?? 0
          const showLabel = pct > 5
          return (
            <div
              key={zone.name}
              style={{
                width: `${pct}%`,
                backgroundColor: zone.color,
                opacity: isPlaceholder ? 0.35 : 1,
              }}
              className="flex items-center justify-center transition-all"
            >
              {showLabel && (
                <span className="select-none text-[12px] font-bold text-black/70">{pct}%</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-2.5 flex flex-col gap-2">
        {data.map((zone) => (
          <div key={zone.name} className="flex items-center gap-2 text-sm text-surface-200">
            <span
              className="inline-block h-3.5 w-3.5 rounded-sm"
              style={{ backgroundColor: zone.color, opacity: isPlaceholder ? 0.4 : 1 }}
            />
            <span className="flex-1">{zone.name}</span>
            <span className="text-xs font-semibold text-surface-100">
              {zone.pct}% ({zone.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
